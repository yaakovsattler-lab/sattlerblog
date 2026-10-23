/*
 * RTL FIDELITY - asserted, not eyeballed.
 *
 * The rule this encodes, established on 18.09 by comparing two nodes' own
 * renders against the build: in this Figma file the generated code's child
 * order IS the visual LEFT-TO-RIGHT order. A dir="rtl" document places the
 * first DOM child at the RIGHT, so reproducing a frame row means writing the
 * DOM in the REVERSE of the generated order. Getting that backwards is
 * invisible in a screenshot unless you already know which side is right, which
 * is exactly why this is a measurement.
 *
 * EXPECTED[] is the frame's own left-to-right order per node, taken from that
 * node's generated child order. Each row asserts the built order matches.
 */
import { chromium } from "playwright";

/* Images live inside <picture>, which is `display: contents` - it has no box,
   so its child is a layout child of the row while being a DOM grandchild.
   Rows containing an image therefore reach through it explicitly. */
const EXPECTED = [
  /* the links row collapses behind the disclosure under 1024 - an invented
     mobile arrangement, so the expectation differs per width rather than the
     assertion being loosened */
  /* the CTA and the menu button now share .nav__actions at the left end, so
     the pill has three groups at every width; the menu lives inside the group
     rather than beside it */
  ["/", "navbar", "481:217", ".nav__pill", ":scope > *",
    { 1440: ["nav__actions", "nav__links", "nav__logo"], 375: ["nav__actions", "nav__logo"] }],
  /* 19.09 - inside that group the menu button sits outboard of the CTA */
  ["/", "navbar actions", "481:217", ".nav__actions", ":scope > *",
    { 1440: ["nav__cta"], 375: ["nav__menu", "nav__cta"] }],
  ["/", "life-stages station", "601:431", ".ls__station.is-active", ":scope > *", ["ls__station-label", "ls__station-icon"]],
  ["/", "hero", "5:4", ".hero", ":scope > *", ["reveal", "hero__copy"]],
  ["/", "footer inner", "572:618", ".footer__inner", ":scope > *", ["footer__columns", "footer__brand"]],

  ["/posts/halvaa-lelo-ribit-miluim", "post meta row", "535:248", ".post__meta", ":scope > *", ["post__reading", "post__tag"]],
  ["/posts/halvaa-lelo-ribit-miluim", "post hero", "535:244", ".post__hero", ":scope > *", ["post__hero-art", "post__hero-text"]],
  ["/posts/halvaa-lelo-ribit-miluim", "recommended tile", "535:503", ".post__tile", ":scope > *, :scope > picture > img", ["post__tile-text", "post__tile-img"]],
  ["/posts/halvaa-lelo-ribit-miluim", "newsletter form", "530:465", ".newsletter__form", ":scope > *", ["newsletter__submit", "newsletter__field"]],
  ["/posts/halvaa-lelo-ribit-miluim", "checklist item", "535:269", ".post__checklist li", ":scope > *", ["SPAN", "post__check"]],

  ["/posts", "catalog toolbar", "530:381", ".blog__toolbar", ":scope > *", ["blog__tabs", "blog__filters"]],
  ["/posts", "filter item", "601:369", ".blog__filter", ":scope > *", ["blog__filter-label", "blog__filter-icon"]],
  ["/posts", "featured card", "539:379", ".blog__featured", ":scope > *, :scope > picture > img", ["blog__featured-img", "blog__featured-content"]],
  ["/posts", "featured footer", "539:386", ".blog__featured-footer", ":scope > *", ["blog__featured-reading", "blog__featured-cta"]],
  /* 530:1462 - one card now, not two alternating variants. The frame reads
     arrow, reading pill, tag from the LEFT. */
  ["/posts", "card top row", "530:1462", ".blog__card-top", ":scope > *", ["arrow-circle", "blog__card-meta"]],
  ["/posts", "card meta", "530:1466", ".blog__card-meta", ":scope > *", ["blog__reading-pill", "blog__tag"]],

  /* 448:223 - the bold label on the right, its value to the left */
  ["/personal-guidance", "guidance fact row", "448:223", ".guidance__fact", ":scope > *", ["DD", "DT"]],

  /* 279:219 - the frame puts the six-card column on the LEFT and the amber
     featured card on the right */
  ["/", "start-here grid", "279:219", ".sh__grid", ":scope > *", /* the Reveal wrapper's own class comes first, as in the hero row */
    ["sh__cards", "reveal"]],
  /* 279:221 - row 1 reads בעבודה then גרים יחד from the left */
  ["/", "start-here row 1", "279:221", ".sh__cards", ":scope > li:nth-child(-n+2) .sh__card-title",
    ["חבר כאן בקבוצה", "המחיר שלכם עלה"]],

  /* 149:221 - the frame draws the illustration on the LEFT and the copy on
     the right, so the copy must be the first DOM child */
  ["/", "community card", "149:221", ".cmty__card", ":scope > div", ["cmty__art", "cmty__copy"]],
  /* 149:224 - every bullet reads text then mark from the left */
  ["/", "community bullet", "149:224", ".cmty__point", ":scope > *", ["SPAN", "cmty__sparkle"]],

  /* 149:333 - the frame's meta row reads 12:29 then the read ticks, left to
     right; settled by get_screenshot on the node, not by reasoning */
  ["/", "whatsapp bubble meta", "149:333", ".waq__meta", ":scope > *", ["waq__time", "waq__ticks"]],
  /* 149:273 - nav reads video, phone, spacer, name, avatar, back from the left */
  /* the flex spacer has zero width once the row is narrow enough not to need
     it, and a zero-width box is not measurable, so the expectation differs per
     width rather than the assertion being loosened */
  ["/", "whatsapp nav", "149:273", ".waq__nav", ":scope > *",
    {
      1440: ["waq__nav-icon", "waq__nav-icon", "waq__nav-spacer", "waq__chat-name", "waq__avatar", "waq__back"],
      375: ["waq__nav-icon", "waq__nav-icon", "waq__chat-name", "waq__avatar", "waq__back"],
    }],

  /* the toolbox row: the frame draws household, credit, gemel left to right */
  ["/toolbox", "tool cards", "440:259", ".toolbox__cards", ":scope > li .tool__title",
    ["ניהול משק בית", "כלי לניתוח הוצאות אשראי", "השוואת קופות גמל"]],
];

const b = await chromium.launch({ channel: "chrome" });
const fails = [];
for (const width of [1440, 375]) {
  const page = await (await b.newContext({ viewport: { width, height: 900 } })).newPage();
  let current = null;
  for (const [route, name, node, sel, kids, expect] of EXPECTED) {
    if (route !== current) {
      await page.goto("http://localhost:3100" + route, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      current = route;
    }
    const got = await page.evaluate(({ sel, kids }) => {
      const root = document.querySelector(sel);
      if (!root) return null;
      return [...root.querySelectorAll(kids)]
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => ({
          k: el.classList.contains("tool__title")
            ? el.textContent.trim()
            : el.classList.contains("sh__card-title")
            ? el.textContent.trim().slice(0, 14)
            /* an SVG's className is an SVGAnimatedString, not a string, so it
               stringifies to [object SVGAnimatedString] - classList.item(0)
               works for both HTML and SVG elements */
            : (el.classList.item(0) || el.tagName).toString().split(" ")[0],
          x: el.getBoundingClientRect().left,
        }))
        .sort((a, c) => a.x - c.x)
        .map((o) => o.k);
    }, { sel, kids });

    if (!got) { console.log(`  ${width} ${name.padEnd(22)} (not present)`); continue; }
    /* below 1024 several rows legitimately stack - order only means something
       while they are still a row, so a single-column stack is skipped */
    const stacked = await page.evaluate((sel) => {
      const root = document.querySelector(sel);
      const kids = [...root.children].filter((el) => el.getBoundingClientRect().width > 0);
      if (kids.length < 2) return true;
      const a = kids[0].getBoundingClientRect(), c = kids[1].getBoundingClientRect();
      return a.bottom <= c.top + 1 || c.bottom <= a.top + 1;
    }, sel);
    if (stacked && width < 1024) { console.log(`  ${width} ${name.padEnd(22)} stacked, order n/a`); continue; }

    const want = Array.isArray(expect) ? expect : expect[width];
    const match = got.length === want.length && got.every((v, i) => v === want[i]);
    console.log(`  ${width} ${name.padEnd(22)} ${node.padEnd(9)} ${match ? "ok" : "MISMATCH"}  ${got.join(" | ")}`);
    if (!match) fails.push(`${width} ${name} (${node}): expected [${want.join(", ")}], got [${got.join(", ")}]`);
  }
  await page.close();
}
await b.close();
if (fails.length) { console.error("\nRTL ORDER FAILED:\n" + fails.map((f) => "  - " + f).join("\n")); process.exit(1); }
console.log("\nRTL order holds for every audited row at 1440 and 375");
