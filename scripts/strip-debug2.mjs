import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const page = await (await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })).newPage();
await page.goto("http://localhost:3100", { waitUntil: "load" });
await page.waitForTimeout(2000);
await page.evaluate(() => document.fonts.ready);
const read = (label) => page.evaluate((label) => {
  const s = document.querySelector(".ls__cards");
  return { label, scrollLeft: s.scrollLeft, first: Math.round(document.querySelector(".ls__card").getBoundingClientRect().right) };
}, label);
console.log(JSON.stringify(await read("at load, before scrolling the page")));
await page.evaluate(async () => {
  const s = document.querySelector(".ls");
  window.scrollTo(0, Math.round(s.offsetTop + 0.3 * (s.offsetHeight - window.innerHeight)));
  await new Promise(r => setTimeout(r, 1200));
});
console.log(JSON.stringify(await read("after the page scroll into step 1")));
await page.evaluate(() => { document.querySelector(".ls__cards").scrollLeft = 0; });
await page.waitForTimeout(600);
console.log(JSON.stringify(await read("after forcing scrollLeft = 0")));
await page.evaluate(() => { document.querySelector(".ls__cards").style.scrollSnapType = "none"; document.querySelector(".ls__cards").scrollLeft = 0; });
await page.waitForTimeout(600);
console.log(JSON.stringify(await read("with scroll-snap-type: none")));
await b.close();
