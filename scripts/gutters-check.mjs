/* Both scrollers, at the first and the last step: does anything sit flush
 * against the viewport edge instead of --edge-gutter in from it? */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
for (const [n, w, h] of [["375", 375, 812], ["768", 768, 1024]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 })).newPage();
  await page.goto("http://localhost:3100", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.fonts.ready);
  for (const p of [0.02, 0.99]) {
    await page.evaluate(async (p) => {
      const s = document.querySelector(".ls");
      window.scrollTo(0, Math.round(s.offsetTop + p * (s.offsetHeight - window.innerHeight)));
      await new Promise(r => setTimeout(r, 1500));
    }, p);
    const m = await page.evaluate(() => {
      const vw = window.innerWidth;
      const gut = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--edge-gutter"));
      const edgeOf = (sel) => {
        const items = [...document.querySelectorAll(sel)].map(e => e.getBoundingClientRect());
        const visible = items.filter(r => r.right > 0 && r.left < vw);
        return {
          nearestToRightEdge: Math.round(vw - Math.max(...visible.map(r => r.right))),
          nearestToLeftEdge: Math.round(Math.min(...visible.map(r => r.left))),
        };
      };
      return {
        gutter: gut,
        cards: edgeOf(".ls__card"),
        stations: edgeOf(".ls__station"),
        active: document.querySelector(".ls__station.is-active").textContent.trim(),
        stationsScrollLeft: document.querySelector(".ls__stations").scrollLeft,
        overflowX: document.documentElement.scrollWidth > vw,
      };
    });
    console.log(`${n} p=${p}`, JSON.stringify(m));
  }
  await page.close();
}
await b.close();
