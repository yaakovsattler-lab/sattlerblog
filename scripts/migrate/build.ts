/*
 * Stage 3 of BUILD-PLAN-sanity.md: the site's file-based content, as Sanity
 * documents. Pure - reads the repo, touches no network. run.ts uploads what
 * this returns; verify.ts rebuilds it and compares with what the dataset holds.
 *
 * Sources, and nothing else:
 *   posts          src/data/posts.ts allPosts() - the existing parser is the
 *                  source of truth for Markdown -> blocks
 *   post images    public/posts/<slug>.png
 *   life stages    STAGE_FILTERS (post-types.ts) + STATIONS (stations.ts)
 *   post stages    stations.ts POSTS[].lifeStage (see stagesFor below)
 *   tools          src/data/toolbox.ts
 *   bubbles        src/data/whatsapp-questions.ts
 *   pages          my-story.ts, personal-guidance.ts, community.ts
 *   siteSettings   src/data/site.ts
 *
 * Every _id is fixed, so a second run replaces instead of duplicating.
 * Nothing is invented: a value with no source is left out and reported as a
 * gap, never filled.
 */
import path from "node:path";
import { allPosts, type Block } from "../../src/data/posts";
import { STAGE_FILTERS } from "../../src/data/post-types";
import { POSTS as STATION_POSTS, STATIONS } from "../../src/data/stations";
import { TOOLS } from "../../src/data/toolbox";
import { WHATSAPP_QUESTIONS } from "../../src/data/whatsapp-questions";
import { MY_STORY } from "../../src/data/my-story";
import { GUIDANCE } from "../../src/data/personal-guidance";
import { COMMUNITY } from "../../src/data/community";
import {
  BRAND_NAME, FOOTER_COLUMNS, FOOTER_CREDIT, FOOTER_DISCLAIMER, FOOTER_TICKER,
  HERO, NAV_CTA, NAV_LINKS, WHATSAPP_GROUP_URL,
} from "../../src/data/site";
import { SITE_PAGES } from "../../src/sanity/schemaTypes/objects";
import { PAGE_IDS } from "../../src/sanity/schemaTypes/page";

const ROOT = process.cwd();

/* ---------- ids ---------- */
export const id = {
  post: (slug: string) => `post-${slug}`,
  stage: (slug: string) => `lifeStage-${slug}`,
  tool: (slug: string) => `tool-${slug}`,
  bubble: (node: string) => `whatsappQuestion-${node.replace(/[^0-9a-z]+/gi, "-")}`,
};

/* ---------- assets ---------- */
/** An image to upload; `slot` names the field it ends up in, for the report. */
export type AssetRef = { key: string; file: string; slot: string; mustHaveAlpha: boolean };
const assets: AssetRef[] = [];
function image(rel: string, slot: string, mustHaveAlpha: boolean) {
  const key = rel;
  if (!assets.some((a) => a.key === key)) assets.push({ key, file: path.join(ROOT, rel), slot, mustHaveAlpha });
  /* placeholder resolved by run.ts / verify.ts once the asset id is known */
  return { _type: "image", asset: { _type: "reference", _ref: `@asset:${key}` } };
}

/* ---------- links: a route becomes a choice, never a typed path ---------- */
const PAGE_VALUES = new Set(SITE_PAGES.map((p) => p.value));
export const gaps: string[] = [];

export function targetFor(href: string) {
  let m = href.match(/^\/posts\?stage=([a-z-]+)$/);
  if (m) return { _type: "linkTarget", type: "stage", stage: { _type: "reference", _ref: id.stage(m[1]) } };
  m = href.match(/^\/posts\/([a-z0-9-]+)$/);
  if (m) return { _type: "linkTarget", type: "post", post: { _type: "reference", _ref: id.post(m[1]) } };
  if (PAGE_VALUES.has(href)) return { _type: "linkTarget", type: "page", page: href };
  if (/^https:\/\//.test(href)) return { _type: "linkTarget", type: "external", url: href };
  return null;
}

/** The inverse, written separately so verify.ts can prove the round trip. */
export function hrefFor(t: any, docsById: Map<string, any>): string | null {
  if (!t) return null;
  if (t.type === "stage") return `/posts?stage=${docsById.get(t.stage?._ref)?.slug?.current}`;
  if (t.type === "post") return `/posts/${docsById.get(t.post?._ref)?.slug?.current}`;
  if (t.type === "page") return t.page;
  if (t.type === "external") return t.url;
  return null;
}

function link(label: string, href: string, key: string | undefined, where: string) {
  const target = targetFor(href);
  if (!target) gaps.push(`${where}: "${label}" -> ${href} has no valid link target (not a site page, post or stage); migrated with its label and no target`);
  return { ...(key ? { _key: key } : {}), _type: "link", label, ...(target ? { target } : {}) };
}

/* ---------- post body: Block[] -> Portable Text ---------- */
const pad = (n: number) => String(n).padStart(3, "0");
export function toPortableText(blocks: Block[]) {
  return blocks.map((b, i) => {
    const _key = `b${pad(i)}`;
    const text = (style: string, t: string) => ({
      _type: "block", _key, style, markDefs: [],
      children: [{ _type: "span", _key: `${_key}s`, text: t, marks: [] }],
    });
    switch (b.kind) {
      case "paragraph": return text("normal", b.text);
      case "heading": return text("h2", b.text);
      case "lead": return text("lead", b.text);
      case "checklist": return { _type: "checklist", _key, ...(b.title !== undefined ? { title: b.title } : {}), items: b.items };
      case "tip": return { _type: "tip", _key, text: b.text };
      case "divider": return { _type: "divider", _key, line: true };
      default: throw new Error(`unknown block kind ${(b as { kind: string }).kind}`);
    }
  });
}

/** The inverse, independent of the above: what stage 4's reader will do. */
export function fromPortableText(pt: any[]): Block[] {
  return pt.map((n) => {
    if (n._type === "block") {
      const t = (n.children ?? []).map((c: any) => c.text).join("");
      if (n.style === "normal") return { kind: "paragraph", text: t };
      if (n.style === "h2") return { kind: "heading", text: t };
      if (n.style === "lead") return { kind: "lead", text: t };
      throw new Error(`unknown block style ${n.style}`);
    }
    if (n._type === "checklist") return n.title !== undefined ? { kind: "checklist", title: n.title, items: n.items } : { kind: "checklist", items: n.items };
    if (n._type === "tip") return { kind: "tip", text: n.text };
    if (n._type === "divider") return { kind: "divider" };
    throw new Error(`unknown block type ${n._type}`);
  });
}

export const KINDS = ["paragraph", "heading", "lead", "checklist", "tip", "divider"] as const;
export function countKinds(blocks: Block[]) {
  const c: Record<string, number> = Object.fromEntries(KINDS.map((k) => [k, 0]));
  for (const b of blocks) c[b.kind] = (c[b.kind] ?? 0) + 1;
  return c;
}

/* ---------- page body: groups of paragraphs, a divider between groups ---------- */
function pageBody(groups: readonly (readonly string[])[]) {
  const out: any[] = [];
  groups.forEach((g, gi) => {
    if (gi > 0) out.push({ _type: "divider", _key: `g${gi}d`, line: true });
    g.forEach((t, pi) =>
      out.push({
        _type: "block", _key: `g${gi}p${pi}`, style: "normal", markDefs: [],
        children: [{ _type: "span", _key: `g${gi}p${pi}s`, text: t, marks: [] }],
      })
    );
  });
  return out;
}

/* ---------- which stages a post belongs to ----------
 * Two vocabularies exist today (CMS-INTEGRATION 8.1). The blog filter matches
 * a substring of the post's free text against STAGE_FILTERS; the home-page
 * stations use stations.ts POSTS[].lifeStage, which is that same free text
 * already resolved to slugs (including "not-sure" for "רוצה לעשות סדר בכסף").
 * The station mapping is used as is. verify.ts proves it reproduces the blog
 * filter's result for every one of the seven filters, so neither the filter
 * row nor the stations changes. */
function stagesFor(slug: string): string[] {
  const p = STATION_POSTS.find((x) => x.slug === slug);
  if (!p) throw new Error(`no stations.ts entry for post ${slug}`);
  return p.lifeStage;
}

export function buildAll() {
  gaps.length = 0;
  assets.length = 0;
  const docs: any[] = [];

  /* life stages: the seven filters (filter row order), plus station 8 */
  const stageSlugs = new Set<string>([...STAGE_FILTERS.map((f) => f.slug), ...STATIONS.map((s) => s.slug)]);
  for (const slug of stageSlugs) {
    const fi = STAGE_FILTERS.findIndex((f) => f.slug === slug);
    const f = fi >= 0 ? STAGE_FILTERS[fi] : null;
    const s = STATIONS.find((x) => x.slug === slug) ?? null;
    const doc: any = { _id: id.stage(slug), _type: "lifeStage", slug: { _type: "slug", current: slug } };
    if (f) {
      doc.label = f.label;
      doc.emoji = f.emoji;
      doc.order = fi + 1;
      doc.icon = image(`public/brand/filters/${slug}.svg`, `lifeStage-${slug}.icon`, false);
    } else {
      /* station 8 is not a filter: it has no filter label, emoji, icon or row position */
      doc.label = s!.tabLabel;
      gaps.push(`lifeStage "${slug}" is a home-page station with no filter chip: label taken from its tab label ("${s!.tabLabel}"); no emoji, no filter icon and no filter order exist, so Studio will flag icon and order as missing`);
    }
    if (s) {
      doc.station = {
        order: s.order,
        tabLabel: s.tabLabel,
        title: s.title,
        blurb: s.blurb,
        ...(s.icon ? { icon: image(`public/icons/${s.icon}`, `lifeStage-${slug}.station.icon`, false) } : {}),
        cta: link(s.cta.label, s.cta.href, undefined, `lifeStage-${slug}.station.cta`),
      };
      if (!s.icon) gaps.push(`lifeStage "${slug}" station has no icon file (stations.ts says null) - left empty`);
    }
    docs.push(doc);
  }

  /* posts */
  for (const p of allPosts()) {
    const sp = STATION_POSTS.find((x) => x.slug === p.slug);
    if (sp && sp.title !== p.title) gaps.push(`post ${p.slug}: stations.ts title differs from the Markdown title (Markdown used)`);
    docs.push({
      _id: id.post(p.slug),
      _type: "post",
      title: p.title,
      lifeStages: stagesFor(p.slug).map((s, i) => ({ _key: `s${i}`, _type: "reference", _ref: id.stage(s) })),
      readingTime: p.readingTime,
      lead: p.lead,
      image: image(`public/posts/${p.slug}.png`, `post-${p.slug}.image`, true),
      body: toPortableText(p.body),
      slug: { _type: "slug", current: p.slug },
      topics: p.topics,
      order: p.order,
    });
  }

  /* tools */
  TOOLS.forEach((t, i) => {
    docs.push({
      _id: id.tool(t.slug),
      _type: "tool",
      title: t.title,
      description: t.description,
      illustration: image(`public/brand/${t.illustration}.png`, `tool-${t.slug}.illustration`, false),
      homeIllustration: image(`public/brand/${t.homeIllustration}.png`, `tool-${t.slug}.homeIllustration`, false),
      facts: t.facts.map((f, fi) => ({ _key: `f${fi}`, _type: "fact", label: f.label, ...(f.value != null ? { value: f.value } : {}) })),
      slug: { _type: "slug", current: t.slug },
      order: i + 1,
    });
  });

  /* WhatsApp bubbles */
  for (const q of WHATSAPP_QUESTIONS) {
    const doc: any = { _id: id.bubble(q.node), _type: "whatsappQuestion", text: q.text, time: q.time, highlighted: !!q.highlighted };
    if (q.href) {
      const t = targetFor(q.href);
      if (t) doc.target = t;
      else gaps.push(`whatsappQuestion ${q.node}: href ${q.href} has no valid target`);
    }
    docs.push(doc);
  }

  /* fixed pages */
  docs.push({
    _id: PAGE_IDS.home, _type: "page", title: "עמוד הבית",
    community: {
      _type: "community",
      title: COMMUNITY.title, lead: [...COMMUNITY.lead], points: [...COMMUNITY.points],
      countPrefix: COMMUNITY.countPrefix, countStrong: COMMUNITY.countStrong,
      ctaLabel: COMMUNITY.ctaLabel, note: [...COMMUNITY.note],
    },
  });
  docs.push({
    _id: PAGE_IDS.myStory, _type: "page", title: MY_STORY.title,
    body: pageBody(MY_STORY.blocks),
    cta: link(MY_STORY.cta.label, MY_STORY.cta.href, undefined, "page-my-story.cta"),
  });
  docs.push({
    _id: PAGE_IDS.guidance, _type: "page", title: GUIDANCE.title,
    body: pageBody([GUIDANCE.intro]),
    facts: GUIDANCE.facts.map((f, i) => ({ _key: `f${i}`, _type: "fact", label: f.label, value: f.value })),
    guarantee: GUIDANCE.guarantee,
    cta: link(GUIDANCE.cta.label, GUIDANCE.cta.href, undefined, "page-personal-guidance.cta"),
  });

  /* site settings */
  docs.push({
    _id: "siteSettings", _type: "siteSettings",
    brandName: BRAND_NAME,
    ...(WHATSAPP_GROUP_URL ? { whatsappGroupUrl: WHATSAPP_GROUP_URL } : {}),
    navLinks: NAV_LINKS.map((l, i) => link(l.label, l.href, `n${i}`, `siteSettings.navLinks[${i}]`)),
    navCta: link(NAV_CTA.label, NAV_CTA.href, undefined, "siteSettings.navCta"),
    hero: {
      _type: "hero",
      headline: [...HERO.headline], blurb: HERO.blurb,
      cta: link(HERO.cta.label, HERO.cta.href, undefined, "siteSettings.hero.cta"),
      ctaNote: HERO.ctaNote, characterAlt: HERO.characterAlt,
    },
    footerTicker: [...FOOTER_TICKER],
    footerColumns: FOOTER_COLUMNS.map((c, ci) => ({
      _key: `c${ci}`, _type: "footerColumn", title: c.title,
      links: c.links.map((l, li) => link(l.label, l.href, `c${ci}l${li}`, `siteSettings.footerColumns[${ci}].links[${li}]`)),
    })),
    footerDisclaimer: [...FOOTER_DISCLAIMER],
    footerCredit: { _type: "footerCredit", ...FOOTER_CREDIT },
  });

  return { docs, assets: [...assets], gaps: [...gaps] };
}

/** Swap `@asset:<key>` placeholders for real asset ids. */
export function resolveAssets(docs: any[], assetIds: Map<string, string>) {
  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      if (typeof v._ref === "string" && v._ref.startsWith("@asset:")) {
        const real = assetIds.get(v._ref.slice(7));
        if (!real) throw new Error(`asset not uploaded: ${v._ref}`);
        return { ...v, _ref: real };
      }
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  return docs.map(walk);
}
