/*
 * PAGE-LEVEL horizontal overflow, every route, every width that matters.
 *
 * Why this exists: Mika found three breaks at 1024, 360 and 390 - widths my
 * tooling never sampled. `floor-all-pages` checked 1440 and 375, `check-wide`
 * checked 1440 and up, so the entire band between 375 and 1440 and everything
 * below 375 was invisible. Three real defects lived there.
 *
 * Two rules this encodes:
 *  - the assertion is documentElement.scrollWidth vs the viewport, which is
 *    what a reader actually experiences. A per-component check can pass on
 *    every component while the page still scrolls sideways.
 *  - the widths are the real device band, not the design's breakpoints. A
 *    defect that lives BETWEEN two breakpoints is invisible to a sweep that
 *    only samples the breakpoints.
 *
 * When it fails it names the widest element it can find, so the report is
 * actionable rather than "something is too wide".
 */
import { chromium } from "playwright";

const WIDTHS = [360, 375, 390, 768, 1024, 1280, 1440, 1920, 2560];
/* plus one short viewport, because vh-sized things fail on height, not width */
const EXTRA = [[1440, 700]];

const ROUTES = [
  "/", "/posts", "/posts/pkudat-stop-loss", "/posts/keren-kaspit-mas",
  "/my-story", "/toolbox", "/personal-guidance",
  "/community", "/contact", "/terms", "/privacy", "/disclosure", "/life-stages",
  "/nope-this-is-the-404",
];

const b = await chromium.launch({ channel: "chrome" });
const fails = [];
let checks = 0;

for (const [w, h] of [...WIDTHS.map((w) => [w, 900]), ...EXTRA]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const row = [];
  for (const route of ROUTES) {
    await page.goto("http://localhost:3100" + route, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    /* scroll through so lazy content and scroll entrances settle - a section
       that only appears after scrolling can be the one that overflows */
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.9;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 250));
    });

    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const vw = de.clientWidth;
      const over = de.scrollWidth - vw;
      if (over <= 0) return { over: 0, vw };
      /* find what is actually sticking out */
      /* An element inside a clipping scroller cannot make the PAGE scroll -
         the marquee track and the filter rows are 5,000px wide on purpose and
         are contained. Listing them buries the real cause, so anything with a
         clipping ancestor is skipped. */
      const contained = (el) => {
        for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (cs.overflowX !== "visible") return true;
        }
        return false;
      };
      const culprits = [];
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (contained(el)) continue;
        /* in RTL the overflow is usually off the LEFT edge */
        const past = Math.max(0, Math.round(-r.left), Math.round(r.right - vw));
        if (past > 1) {
          culprits.push({
            sel: (el.className || el.tagName).toString().split(" ").filter(Boolean).slice(0, 2).join("."),
            past,
            w: Math.round(r.width),
            left: Math.round(r.left),
          });
        }
      }
      culprits.sort((a, c) => c.past - a.past);
      /* keep the outermost few - a child sticking out usually drags parents */
      const seen = new Set();
      const top = culprits.filter((c) => (seen.has(c.sel) ? false : seen.add(c.sel))).slice(0, 4);
      return { over, vw, top };
    });

    checks++;
    if (m.over > 0) {
      row.push(`${route} +${m.over}`);
      fails.push(
        `${w}x${h} ${route}: scrollWidth over by ${m.over}px (viewport ${m.vw}) -> ` +
          m.top.map((c) => `${c.sel} w${c.w} left${c.left} past${c.past}`).join(" | ")
      );
    }
  }
  console.log(`  ${String(w).padStart(4)}x${String(h).padEnd(4)} ${row.length ? "OVERFLOW: " + row.join(", ") : "clean"}`);
  await ctx.close();
}
await b.close();

console.log(`\n  ${checks} page/width combinations checked across ${ROUTES.length} routes and ${WIDTHS.length + EXTRA.length} widths`);
if (fails.length) {
  console.error(`\nHORIZONTAL OVERFLOW (${fails.length}):\n` + fails.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log("\nno page scrolls sideways at any width");
