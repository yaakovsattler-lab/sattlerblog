/*
 * THE TEMPLATE IS A SPEC, NOT AN AVERAGE (Elyakim, 18.09).
 *
 * Figma 535:232 fixes where each element sits. Content length may change what
 * is inside a box; it may never change where the box is. So every element is
 * measured on ALL NINE posts, relative to its own container, and anything that
 * differs from post to post is a defect - the content pushed the layout.
 *
 * Positions are taken relative to the element's offsetParent, not the
 * viewport, so a taller body above cannot make a lower element look "moved"
 * when it is only further down a longer page.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const slugs = JSON.parse(fs.readFileSync("scripts/_slugs.json", "utf8"));

/* element, node id, the container its position is measured against */
const ELEMENTS = [
  ["meta row", "535:248", ".post__meta", ".post__hero-text"],
  ["stage chip", "535:252", ".post__tag", ".post__meta"],
  ["reading time", "535:249", ".post__reading", ".post__meta"],
  ["title", "535:254", ".post__title", ".post__hero-text"],
  ["deck", "535:255", ".post__deck", ".post__hero-text"],
  ["hero card", "535:245", ".post__hero-art", ".post__hero"],
  ["hero drawing", "535:246", ".post__hero-art picture img, .post__hero-art img", ".post__hero-art"],
  ["body column", "535:258", ".post__column", ".post__body"],
  ["first tile", "535:503", ".post__tile", ".post__tiles"],
  ["tile arrow slot", "535:509", ".post__tile-img", ".post__tile"],
  ["newsletter", "530:462", ".newsletter", ".post__body--closing .post__column"],
  ["newsletter button", "530:466", ".newsletter__submit", ".newsletter__form"],
  ["closing CTA", "530:472", ".post__cta-button", ".post__cta"],
];

const b = await chromium.launch({ channel: "chrome" });
const fails = [];

for (const [label, w, h] of [["desktop", 1440, 900], ["phone", 375, 812]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  const perSlug = {};
  for (const slug of slugs) {
    await page.goto("http://localhost:3100/posts/" + slug, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    /* Wait for images to settle, but never on a LAZY one: an image that has
       not entered the viewport never loads, and decode() on it never
       resolves - the first version of this script hung there for minutes.
       Only already-loading images are awaited, and even then with a deadline. */
    await page.evaluate(() =>
      Promise.race([
        Promise.all(
          [...document.images]
            .filter((i) => i.loading !== "lazy" && !i.complete)
            .map((i) => i.decode().catch(() => null))
        ),
        new Promise((r) => setTimeout(r, 1500)),
      ])
    );
    await page.waitForTimeout(400);
    perSlug[slug] = await page.evaluate((ELEMENTS) => {
      const out = {};
      for (const [name, node, sel, containerSel] of ELEMENTS) {
        const el = document.querySelector(sel);
        const box = document.querySelector(containerSel);
        if (!el || !box) { out[name] = null; continue; }
        const e = el.getBoundingClientRect(), c = box.getBoundingClientRect();
        out[name] = {
          /* offsets from the container's own edges, so page length is irrelevant */
          start: Math.round(c.right - e.right),
          top: Math.round(e.top - c.top),
          w: Math.round(e.width),
          h: Math.round(e.height),
        };
      }
      return out;
    }, ELEMENTS);
  }

  console.log(`\n${label.toUpperCase()}  (offset from container start / top, and the box size)`);
  for (const [name, node] of ELEMENTS.map((e) => [e[0], e[1]])) {
    const vals = slugs.map((s) => perSlug[s][name]).filter(Boolean);
    if (!vals.length) { console.log(`  ${name.padEnd(18)} ${node.padEnd(9)} not present`); continue; }
    /* POSITION is what must be identical - where the box is. SIZE is allowed
       to follow the content: a pill that wraps a longer stage name is content
       changing what is inside a box, which is exactly what the rule permits.
       So width is reported and never failed on.
       Position is compared with a 2px tolerance, because a 1px difference is
       the sub-pixel rounding of a Hebrew line box; anything content-driven in
       this layout moved by tens of pixels before it was pinned. */
    const near = (a, c) => Math.abs(a.start - c.start) <= 2 && Math.abs(a.top - c.top) <= 2;
    const groups = [];
    for (const v of vals) {
      const g = groups.find((x) => near(x[0], v));
      if (g) g.push(v); else groups.push([v]);
    }
    const agreed = groups.length === 1 && vals.length === slugs.length;
    const widths = [...new Set(vals.map((v) => v.w))].sort((a, c) => a - c);
    const widthNote = widths.length === 1 ? `w ${widths[0]}` : `w ${widths[0]}-${widths[widths.length - 1]} (content-sized)`;
    console.log(`  ${name.padEnd(18)} ${node.padEnd(9)} ${agreed ? "all 9 agree" : `${groups.length} POSITIONS`}  at ${groups[0][0].start}/${groups[0][0].top}  ${widthNote}`);
    if (!agreed) {
      const byPos = {};
      for (const sl of slugs) {
        const v = perSlug[sl][name];
        if (!v) continue;
        const g = groups.findIndex((x) => near(x[0], v));
        (byPos[`${groups[g][0].start}/${groups[g][0].top}`] ||= []).push(sl);
      }
      fails.push(`${label} ${name} (${node}): ${groups.length} distinct positions -> ` +
        Object.entries(byPos).map(([k, v]) => `${k} on ${v.length} post(s) [${v.slice(0, 3).join(", ")}]`).join(" ; "));
    }
  }
  await page.close();
}
await b.close();
if (fails.length) { console.error("\nPOSITIONS DIFFER BETWEEN POSTS:\n" + fails.map((f) => "  - " + f).join("\n")); process.exit(1); }
console.log("\nevery audited element lands identically on all nine posts, desktop and phone");
