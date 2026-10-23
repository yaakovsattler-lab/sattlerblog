import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const page = await (await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })).newPage();
await page.goto("http://localhost:3100", { waitUntil: "load" });
await page.waitForTimeout(2000);
await page.evaluate(() => document.fonts.ready);
await page.evaluate(async () => {
  const s = document.querySelector(".ls");
  window.scrollTo(0, Math.round(s.offsetTop + 0.3 * (s.offsetHeight - window.innerHeight)));
  await new Promise(r => setTimeout(r, 1200));
});
console.log(JSON.stringify(await page.evaluate(() => {
  const strip = document.querySelector(".ls__cards");
  const r = strip.getBoundingClientRect();
  return {
    stripRect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) },
    scrollLeft: strip.scrollLeft, scrollWidth: strip.scrollWidth, clientWidth: strip.clientWidth,
    dir: getComputedStyle(strip).direction,
    cards: [...document.querySelectorAll(".ls__card")].map(c => {
      const b = c.getBoundingClientRect();
      return { left: Math.round(b.left), right: Math.round(b.right) };
    }),
    rowRect: (() => { const q = document.querySelector(".ls__row").getBoundingClientRect(); return { left: Math.round(q.left), right: Math.round(q.right) }; })(),
    colRect: (() => { const q = document.querySelector(".ls__col").getBoundingClientRect(); return { left: Math.round(q.left), right: Math.round(q.right) }; })(),
  };
}), null, 1));
await b.close();
