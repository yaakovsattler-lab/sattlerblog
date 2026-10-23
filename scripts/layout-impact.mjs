/* What the 15px floor cost the layout, measured: the progress strip's needed
 * width vs the space it has, the card heights, and whether the sticky frame
 * still contains everything. */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
for (const [name, w, h] of [["desktop",1440,900],["tablet",768,1024],["mobile",375,812]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await page.goto("http://localhost:3100", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    const s = document.querySelector(".ls");
    window.scrollTo(0, Math.round(s.offsetTop + 0.44 * (s.offsetHeight - window.innerHeight)));
    await new Promise(r => setTimeout(r, 1200));
  });
  const m = await page.evaluate(() => {
    const strip = document.querySelector(".ls__stations");
    const cards = [...document.querySelectorAll(".ls__card")].map(c => Math.round(c.getBoundingClientRect().height));
    const sticky = document.querySelector(".ls__sticky");
    const bar = document.querySelector(".ls__bar").getBoundingClientRect();
    return {
      stripScrollWidth: strip.scrollWidth,
      stripClientWidth: strip.clientWidth,
      stripScrolls: strip.scrollWidth > strip.clientWidth,
      longestLabel: Math.max(...[...document.querySelectorAll(".ls__station-label")].map(n => Math.round(n.getBoundingClientRect().width))),
      cardHeights: cards,
      stickyHeight: Math.round(sticky.getBoundingClientRect().height),
      barBottom: Math.round(bar.bottom),
      viewport: window.innerHeight,
      barInsideViewport: bar.bottom <= window.innerHeight + 1,
      docOverflowX: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  console.log(name, JSON.stringify(m));
  await page.close();
}
await b.close();
