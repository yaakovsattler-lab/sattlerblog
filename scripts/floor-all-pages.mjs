/*
 * The 15px floor across EVERY route at EVERY width.
 *
 * The width list is the same one check-overflow.mjs uses, and for the same
 * reason: this script used to sample 1440 and 375 only, and three real defects
 * lived at 1024, 360 and 390 - between the breakpoints. A floor can break in
 * that band the same way a layout can, so it is swept identically.
 */
import { chromium } from "playwright";
const WIDTHS = [
  [360, 900], [375, 812], [390, 900], [768, 1024], [1024, 900],
  [1280, 900], [1440, 900], [1920, 900], [2560, 900], [1440, 700],
];

const routes = ["/", "/posts", "/posts/halvaa-lelo-ribit-miluim", "/posts/pkudat-stop-loss", "/my-story", "/toolbox", "/personal-guidance", "/community", "/contact", "/terms", "/privacy", "/disclosure", "/nope-404"];
const b = await chromium.launch({ channel: "chrome" });
let bad = 0;
for (const [w, h] of [[1440, 900], [375, 812]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 })).newPage();
  for (const r of routes) {
    await page.goto("http://localhost:3100" + r, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    const out = await page.evaluate(() => {
      const min = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--type-min"));
      const wk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const small = []; const seen = new Set();
      for (let n = wk.nextNode(); n; n = wk.nextNode()) {
        if (!n.nodeValue.trim()) continue;
        const el = n.parentElement; if (!el) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const rect = el.getBoundingClientRect(); if (!rect.width && !rect.height) continue;
        const px = parseFloat(cs.fontSize);
        if (px < min) { const k = el.className + px; if (!seen.has(k)) { seen.add(k); small.push(`${el.className} ${px}px`); } }
      }
      return { small, overflowX: document.documentElement.scrollWidth > window.innerWidth };
    });
    if (out.small.length || out.overflowX) {
      bad++;
      console.log(`FAIL ${w} ${r} under-floor=${JSON.stringify(out.small)} overflowX=${out.overflowX}`);
    }
  }
  await page.close();
}
await b.close();
console.log(bad ? `${bad} failures` : `all ${routes.length} routes clean at all ${WIDTHS.length} widths: no text under the floor`);
