/* Does the sticky frame hold everything at every step, untouched? .ls__sticky
 * is overflow:hidden, so anything past the viewport is CLIPPED, not scrolled. */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
for (const [n, w, h] of [["375x812", 375, 812], ["390x844", 390, 844], ["375x667", 375, 667], ["768x1024", 768, 1024]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 })).newPage();
  await page.goto("http://localhost:3100", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.fonts.ready);
  const bad = [];
  for (let i = 0; i < 8; i++) {
    const p = i / 8 + 0.06;
    const m = await page.evaluate(async (p) => {
      const s = document.querySelector(".ls");
      window.scrollTo(0, Math.round(s.offsetTop + p * (s.offsetHeight - window.innerHeight)));
      await new Promise(r => setTimeout(r, 1300));
      const bar = document.querySelector(".ls__bar").getBoundingClientRect();
      return {
        station: document.querySelector(".ls__station.is-active").textContent.trim(),
        barBottom: Math.round(bar.bottom),
        vh: window.innerHeight,
        cardH: Math.round(document.querySelector(".ls__card").getBoundingClientRect().height),
        clippedBy: Math.round(bar.bottom - window.innerHeight),
      };
    }, p);
    if (m.clippedBy > 0) bad.push(`${m.station}: bar ${m.clippedBy}px past the fold (card ${m.cardH}px)`);
  }
  console.log(`${n}: ${bad.length ? "CLIPPED at " + bad.length + " of 8 steps -> " + bad.join(" | ") : "all 8 steps fit"}`);
  await page.close();
}
await b.close();
