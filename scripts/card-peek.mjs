/* The gutters and the peek, measured at rest on the first snap point. */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
for (const [n, w, h] of [["375", 375, 812], ["390", 390, 844], ["430", 430, 932]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })).newPage();
  await page.goto("http://localhost:3100", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    const s = document.querySelector(".ls");
    window.scrollTo(0, Math.round(s.offsetTop + 0.3 * (s.offsetHeight - window.innerHeight)));
    await new Promise(r => setTimeout(r, 1200));
  });
  console.log(n, JSON.stringify(await page.evaluate(() => {
    const vw = window.innerWidth;
    const [c0, c1] = [...document.querySelectorAll(".ls__card")];
    const r0 = c0.getBoundingClientRect(), r1 = c1.getBoundingClientRect();
    const head = document.querySelector(".ls__title").getBoundingClientRect();
    return {
      cardWidth: Math.round(r0.width),
      gutterRight: Math.round(vw - r0.right),
      alignsWithHeading: Math.abs(r0.right - head.right) < 1.5,
      peekOfNext: Math.round(r1.right - 0),
      titleLineHeightPx: Math.round(document.querySelector(".ls__card-title").getBoundingClientRect().height),
      cardHeight: Math.round(r0.height),
      overflowX: document.documentElement.scrollWidth > vw,
    };
  })));
  await page.close();
}
await b.close();
