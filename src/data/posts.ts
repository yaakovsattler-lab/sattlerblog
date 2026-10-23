/*
 * Posts, shaped the way Sanity will hold them.
 *
 * The words come from files/01-Content/posts-new/*.md - the client's own
 * files, read at build time. Nothing here is written by me: the frontmatter is
 * Hebrew-keyed and parsed as it stands, and the body is converted into typed
 * blocks rather than into a blob of HTML, because that is what a Portable Text
 * field looks like and it is what the CMS will hand us later.
 *
 * Sanity shape:
 *   post { slug, title, lifeStage, topics[], readingTime, lead, body[] }
 *   block = paragraph | heading | lead | checklist | tip | divider
 *
 * Deliberately NOT done here: rendering Markdown to HTML with a library. The
 * design (Figma 535:232) gives specific block styles - a bold lead-in, a check
 * list, a bordered tip - so the body has to arrive as blocks that can be
 * matched to those styles. A Markdown-to-HTML pass would throw that away.
 */

import fs from "node:fs";
import path from "node:path";

import type { Block, Post } from "./post-types";

export type { Block, Post } from "./post-types";
export { STAGE_FILTERS, postsForStage } from "./post-types";
export type { StageFilter } from "./post-types";

/* TEMPORARY (stage 1 of the Sanity plan): a copy of files/01-Content/posts-new
   lives in the repo so a clean clone builds with its posts. Stage 4 replaces
   this reader with GROQ and deletes content/posts/. */
const CONTENT_DIR = path.resolve(process.cwd(), "content/posts");

/** The frontmatter keys are Hebrew; this is the only place that knows that. */
const KEYS: Record<string, keyof Post | "skip"> = {
  "כותרת": "title",
  "שלב חיים": "lifeStage",
  "נושאים": "topics",
  "זמן קריאה": "readingTime",
};

function parseFrontmatter(raw: string) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {} as Record<string, string>, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const at = line.indexOf(":");
    if (at === -1) continue;
    const key = line.slice(0, at).trim();
    if (!(key in KEYS)) continue;
    meta[key] = line
      .slice(at + 1)
      .trim()
      .replace(/^"|"$/g, "");
  }
  return { meta, body: m[2] };
}

/** Markdown to the block union. Only the constructs these files actually use.
 *
 * Measured across all nine posts before writing this, rather than guessed:
 * 236 plain paragraphs, 41 dividers, 38 chunks that are a single bold line
 * with a trailing emoji, 4 `##` headings, and 3 chunks that are a bold title
 * followed by a list. So the author's real sub-heading is the bold line, not
 * `##` - which is why it maps to the design's bold lead-in (535:260) instead
 * of being flattened into a paragraph. Bullets appear as -, *, ✓, ✅, ❌ or •.
 */
const BULLET = /^[-*✓✅❌•]\s+/;
/** a whole line in bold, optionally with a short emoji tail after it */
const BOLD_LINE = /^\*\*([^*]+)\*\*\s*(\S{0,4})$/;

function toBlocks(md: string): Block[] {
  const out: Block[] = [];
  const chunks = md.split(/\n{2,}/);

  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;

    if (/^-{3,}$/.test(chunk)) {
      out.push({ kind: "divider" });
      continue;
    }
    if (chunk.startsWith("## ") || chunk.startsWith("# ")) {
      out.push({ kind: "heading", text: chunk.replace(/^#+\s*/, "").trim() });
      continue;
    }

    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    const bullets = lines.filter((l) => BULLET.test(l));

    /* a bold title followed by a list is the design's checklist (535:267) */
    if (bullets.length >= 2) {
      const head = lines[0];
      const title = BULLET.test(head) ? undefined : stripInline(head);
      out.push({
        kind: "checklist",
        title,
        items: bullets.map((l) => stripInline(l.replace(BULLET, ""))),
      });
      continue;
    }

    /* The author's own sub-heading: a bold line, emoji allowed after it. It is
       usually followed in the SAME chunk by the paragraph it introduces, with
       no blank line between them - so the two are split here rather than the
       heading being swallowed into the paragraph. */
    const bold = lines[0].match(BOLD_LINE);
    if (bold) {
      out.push({
        kind: "lead",
        text: `${bold[1].trim()}${bold[2] ? " " + bold[2] : ""}`,
      });
      const rest = lines.slice(1).join(" ").trim();
      if (rest) out.push({ kind: "paragraph", text: stripInline(rest) });
      continue;
    }

    if (/^(טיפ|שימו לב)\s*[:：]/.test(chunk)) {
      out.push({ kind: "tip", text: stripInline(chunk.replace(/^\S+\s*[:：]\s*/, "")) });
      continue;
    }

    out.push({ kind: "paragraph", text: stripInline(chunk.replace(/\n/g, " ")) });
  }
  return out;
}

/* Bold and links are not styled separately anywhere in 535:232, so the markers
   are removed rather than rendered - leaving `**` on screen would be worse
   than losing the emphasis, and inventing a bold style is a design decision. */
function stripInline(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1")
    .trim();
}

let cache: Post[] | null = null;

export function allPosts(): Post[] {
  if (cache) return cache;
  if (!fs.existsSync(CONTENT_DIR)) {
    throw new Error(
      `posts: content directory not found at ${CONTENT_DIR} - the prototype reads the client's own files and will not invent posts`
    );
  }
  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  cache = files.map((file) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const slug = file.replace(/^\d+-/, "").replace(/\.md$/, "");
    /* Every file opens with its own reading-time line. That is metadata the
       design shows in the meta row (535:249), not the deck, so it is dropped
       rather than rendered twice - once as the deck and once as the pill next
       to it.

       The wording is NOT uniform, which is why this matches loosely: across
       the nine files the line appears as "⏱️ זמן קריאה: 3 דקות",
       "זמן קריאה: 4 דקות ⏱️" and "⏱️ זמן קריאה משוער: 3 דקות" - leading and
       trailing emoji both occur, and two files insert "משוער". My first
       version anchored on "זמן קריאה:" and silently left the metadata as the
       deck on those two. Checked by rendering all nine, not by reading one. */
    const READING_TIME_LINE = /^[^\p{L}]*זמן קריאה\s*\S*\s*[:：]/u;
    const blocks = toBlocks(body).filter(
      (b) => !(b.kind === "paragraph" && READING_TIME_LINE.test(b.text))
    );
    const firstPara = blocks.find((b) => b.kind === "paragraph");
    return {
      slug,
      order: Number.parseInt(file.slice(0, 2), 10),
      title: meta["כותרת"] ?? slug,
      lifeStage: meta["שלב חיים"] ?? "",
      topics: (meta["נושאים"] ?? "").split(/,\s*/).filter(Boolean),
      readingTime: meta["זמן קריאה"] ?? "",
      lead: firstPara && firstPara.kind === "paragraph" ? firstPara.text : "",
      /* the lead is shown in the hero, so it does not repeat in the body */
      body: blocks.filter((b) => b !== firstPara),
    };
  });
  return cache;
}

export function postBySlug(slug: string) {
  return allPosts().find((p) => p.slug === slug) ?? null;
}

/** Figma 535:500 shows three. Simple and predictable: the next three by order. */
export function recommendedFor(slug: string, count = 3) {
  const posts = allPosts();
  const i = posts.findIndex((p) => p.slug === slug);
  const rest = [...posts.slice(i + 1), ...posts.slice(0, Math.max(i, 0))];
  return rest.slice(0, count);
}

