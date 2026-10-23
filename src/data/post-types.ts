/*
 * Post TYPES and the pure helpers over them. No node built-ins here on
 * purpose: `BlogIndex` is a client component, and a client component that
 * imports a module which touches `node:fs` - even only for types - drags fs
 * into the browser bundle and the build dies with "the chunking context does
 * not support external modules (request: node:fs)". That is exactly what
 * happened on the first pass. The reader lives in `posts.ts`; this file is
 * safe on both sides of the boundary.
 */

export type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "lead"; text: string }
  | { kind: "checklist"; title?: string; items: string[] }
  | { kind: "tip"; text: string }
  | { kind: "divider" };

export type Post = {
  slug: string;
  order: number;
  title: string;
  lifeStage: string;
  topics: string[];
  readingTime: string;
  lead: string;
  body: Block[];
};


/*
 * The life stages the blog index filters by - Figma 601:353, in the frame's
 * own order, each with the icon it exports there. `match` is what a post's
 * "שלב חיים" frontmatter has to contain; the two vocabularies are not
 * identical (the filter says "משקיעים", the posts say "מתחילים להשקיע"), which
 * is a content gap and is reported rather than papered over.
 */
export const STAGE_FILTERS = [
  /* `emoji` is the frame's own - 230:279, 230:285, 230:290, 230:295, 230:301,
     230:306 and 230:273 each prefix the stage label with one. It is design
     data read off the nodes, not decoration I chose. */
  { slug: "side-business", label: "עסק מהצד", match: "עסק", emoji: "🧾" },
  { slug: "investing", label: "משקיעים", match: "להשקיע", emoji: "📈" },
  { slug: "buying-apartment", label: "קונים דירה", match: "דירה", emoji: "🔑" },
  { slug: "baby", label: "הורים טריים", match: "ילד", emoji: "🍼" },
  { slug: "moved-in-together", label: "גרים יחד", match: "לגור יחד", emoji: "🏠" },
  { slug: "reserve-duty", label: "במילואים", match: "מילואים", emoji: "🎖️" },
  { slug: "started-working", label: "בעבודה", match: "לעבוד", emoji: "💼" },
] as const;

/** The chip a card shows for a post: the frame's stage label plus its emoji. */
export function stageChipFor(post: Post) {
  const f = STAGE_FILTERS.find((s) => post.lifeStage.includes(s.match));
  return f ? `${f.emoji} ${f.label}` : post.lifeStage;
}

export type StageFilter = (typeof STAGE_FILTERS)[number]["slug"];

export function postsForStage(posts: Post[], stage: StageFilter | null) {
  if (!stage) return posts;
  const f = STAGE_FILTERS.find((s) => s.slug === stage);
  if (!f) return posts;
  return posts.filter((p) => p.lifeStage.includes(f.match));
}
