/* Try each clamp value at mobile and report what it costs: how many titles are
 * still cut, the card height, and whether the sticky frame still holds the
 * progress bar inside the viewport. */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const page = await (await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })).newPage();
await page.goto("http://localhost:3100", { waitUntil: "load" });
await page.waitForTimeout(2000);
await page.evaluate(() => document.fonts.ready);
for (const clamp of [2, 3, 4]) {
  const rows = [];
  for (const p of [0.05, 0.3, 0.55, 0.8, 0.99]) {
    await page.evaluate(async ([p, clamp]) => {
      const s = document.querySelector(".ls");
      window.scrollTo(0, Math.round(s.offsetTop + p * (s.offsetHeight - window.innerHeight)));
      await new Promise(r => setTimeout(r, 1300));
      document.querySelectorAll(".ls__card-title").forEach(t => (t.style.webkitLineClamp = String(clamp)));
      await new Promise(r => setTimeout(r, 200));
    }, [p, clamp]);
    rows.push(await page.evaluate(() => {
      const cut = [...document.querySelectorAll(".ls__card-title")].filter(t => t.scrollHeight > t.clientHeight + 1).length;
      const bar = document.querySelector(".ls__bar").getBoundingClientRect();
      return {
        cut,
        cardH: Math.round(document.querySelector(".ls__card").getBoundingClientRect().height),
        barInside: bar.bottom <= window.innerHeight + 1,
        barBottom: Math.round(bar.bottom),
      };
    }));
  }
  const worst = Math.max(...rows.map(r => r.cardH));
  console.log(`clamp ${clamp}: titles still cut across 5 steps = ${rows.map(r => r.cut).join("/")} of 3, tallest card ${worst}px, bar inside viewport at every step = ${rows.every(r => r.barInside)} (lowest bar bottom ${Math.max(...rows.map(r => r.barBottom))} of 812)`);
}
await b.close();
