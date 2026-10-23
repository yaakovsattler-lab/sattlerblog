/*
 * The page container, measured at the design width and above it.
 *
 * What is checked at each width:
 *  - the content box of every capped section is --content-max and centred
 *  - no element is wider than its own container (a stretch defect)
 *  - full-bleed things (bands, the ticker, the dark footer) still span
 *  - no horizontal overflow
 *  - the post body's LINE LENGTH IN CHARACTERS, which is the number that says
 *    whether it reads well; pixels do not
 */
import { chromium } from "playwright";

const WIDTHS = [1440, 1680, 1920, 2560, 3440];
const b = await chromium.launch({ channel: "chrome" });
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

for (const w of WIDTHS) {
  const page = await (await b.newContext({ viewport: { width: w, height: 1000 } })).newPage();
  const rows = [];

  for (const [route, capped, bleed] of [
    /* The hero is NOT a capped section: 5:4 draws the character at x=0, hard
       against the viewport edge, so the section is deliberately asymmetric and
       its own padding box is not the thing to centre-check. What must hold is
       that the COPY stays inside the container and the character sits on the
       page-max edge - asserted explicitly below, which is stricter than the
       generic rule it replaces. */
    ["/", [".ls__row", ".ls__bar"], [".hero", ".ticker", ".footer__block"]],
    ["/posts", [".blog__toolbar", ".blog__grid"], [".ticker", ".footer__block"]],
    ["/posts/halvaa-lelo-ribit-miluim", [".post__hero", ".post__column", ".post__recommended"], [".post__recommended", ".ticker", ".footer__block"]],
  ]) {
    await page.goto("http://localhost:3100" + route, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);

    const m = await page.evaluate(({ capped, bleed }) => {
      const contentMax = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--content-max")) || 1312;
      const vw = document.documentElement.clientWidth;
      const box = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const inner = r.width - parseFloat(cs.paddingInlineStart || cs.paddingLeft) - parseFloat(cs.paddingInlineEnd || cs.paddingRight);
        return {
          sel,
          inner: Math.round(inner),
          left: Math.round(r.left),
          right: Math.round(vw - r.right),
          padStart: Math.round(parseFloat(cs.paddingInlineStart || cs.paddingLeft)),
          padEnd: Math.round(parseFloat(cs.paddingInlineEnd || cs.paddingRight)),
        };
      };
      /* any element wider than its offsetParent's content box is a stretch */
      const tooWide = [];
      /* `display: contents` elements (every <picture> here) have no box at
         all, so comparing a child against them is meaningless - walk up to the
         nearest ancestor that really generates one. The first version of this
         check flagged every optimised image for exactly that reason. */
      const boxParent = (el) => {
        let p = el.parentElement;
        while (p && getComputedStyle(p).display === "contents") p = p.parentElement;
        return p;
      };
      for (const el of document.querySelectorAll("main *, footer *")) {
        if (getComputedStyle(el).display === "contents") continue;
        const p = boxParent(el);
        if (!p) continue;
        /* a child wider than a clipping parent is a deliberate device - the
           marquee track is two copies of itself and has to be - so only an
           unclipped parent counts as a stretch defect */
        if (getComputedStyle(p).overflowX !== "visible") continue;
        const er = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
        if (er.width > pr.width + 1 && getComputedStyle(el).position === "static") {
          tooWide.push(el.className || el.tagName);
        }
      }
      return {
        vw, contentMax,
        capped: capped.map(box).filter(Boolean),
        bleed: bleed.map(box).filter(Boolean),
        tooWide: [...new Set(tooWide)].slice(0, 5),
        overflowX: document.documentElement.scrollWidth > vw,
        /* characters per line in the reading column */
        cpl: (() => {
          const p = document.querySelector(".post__p");
          if (!p) return null;
          const cs = getComputedStyle(p);
          const probe = document.createElement("span");
          probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font}`;
          probe.textContent = "אבגדהוזחטיכלמנסעפצקרשתםןץףך אבגדהוזחטי";
          document.body.appendChild(probe);
          const per = probe.getBoundingClientRect().width / probe.textContent.length;
          probe.remove();
          return Math.round(p.getBoundingClientRect().width / per);
        })(),
      };
    }, { capped, bleed });

    for (const c of m.capped) {
      ok(c.inner <= m.contentMax + 2, `${w} ${route} ${c.sel}: content ${c.inner} > ${m.contentMax}`);
      ok(Math.abs(c.left + c.padStart - (c.right + c.padEnd)) <= 2,
        `${w} ${route} ${c.sel}: not centred (start ${c.left + c.padStart}, end ${c.right + c.padEnd})`);
    }
    for (const bl of m.bleed) {
      ok(bl.left <= 1 && bl.right <= 1, `${w} ${route} ${bl.sel}: not full-bleed (left ${bl.left}, right ${bl.right})`);
    }
    ok(!m.overflowX, `${w} ${route}: horizontal overflow`);
    ok(!m.tooWide.length, `${w} ${route}: elements wider than their parent: ${m.tooWide.join(", ")}`);
    rows.push({ route, ...m });
  }

  /* the hero's own invariant, in place of the capped rule */
  {
    await page.goto("http://localhost:3100/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const hero = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const cs = getComputedStyle(document.documentElement);
      const pageMax = parseFloat(cs.getPropertyValue("--page-max")) || 1440;
      const contentMax = parseFloat(cs.getPropertyValue("--content-max")) || 1312;
      const copy = document.querySelector(".hero__copy").getBoundingClientRect();
      const ch = document.querySelector(".hero__character").getBoundingClientRect();
      return {
        vw, pageMax, contentMax,
        copyW: Math.round(copy.width),
        copyRightGap: Math.round(vw - copy.right),
        charLeft: Math.round(ch.left),
        expectedGutter: Math.round(Math.max(64, (vw - contentMax) / 2)),
        expectedCharLeft: Math.round(Math.max(0, (vw - pageMax) / 2)),
      };
    });
    ok(hero.copyW <= hero.contentMax,
      `${w} hero: the copy column is ${hero.copyW}, wider than the container's ${hero.contentMax}`);
    ok(Math.abs(hero.copyRightGap - hero.expectedGutter) <= 2,
      `${w} hero: the copy does not sit on the container edge (gap ${hero.copyRightGap}, expected ${hero.expectedGutter})`);
    /* 5:4 puts the character at x=0. At and below the design width that is the
       viewport edge; above it the character follows the page-max box, which is
       the wide-screen decision flagged for Tal on 18.09 - the hand gestures at
       the copy, so it must not be marooned half a metre away from it. */
    ok(Math.abs(hero.charLeft - hero.expectedCharLeft) <= 2,
      `${w} hero: the character is at x=${hero.charLeft}, expected ${hero.expectedCharLeft}`);
    console.log(`${String(w).padStart(4)}  hero: copy ${hero.copyW} on the container edge, character x=${hero.charLeft}`);
  }

  const post = rows.find((r) => r.route.startsWith("/posts/"));
  const home = rows[0];
  console.log(
    `${String(w).padStart(4)}  content=${home.capped[0]?.inner}  ls-row=${home.capped[1]?.inner}  ` +
    `post-hero=${post.capped[0]?.inner}  reading-col=${post.capped[1]?.inner}px / ${post.cpl} chars  ` +
    `bleed ok=${home.bleed.every((x) => x.left <= 1 && x.right <= 1)}  overflowX=${home.overflowX}`
  );
  await page.close();
}
await b.close();
if (fails.length) { console.error("\nWIDE LAYOUT FAILED:\n" + fails.map((f) => "  - " + f).join("\n")); process.exit(1); }
console.log("\nwide layout holds at 1440 / 1680 / 1920 / 2560 / 3440");
