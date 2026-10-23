/* Read the ON-PAGE canvas, not the files: the four corners and four edge
 * midpoints of the drawn frame, at several scroll positions. */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto("http://localhost:3100", { waitUntil: "load" });
await page.waitForTimeout(2500);
for (const p of [0.03, 0.2, 0.44, 0.7, 0.93, 1.0]) {
  await page.evaluate(async (p) => {
    const sec = document.querySelector(".ls");
    window.scrollTo(0, Math.round(sec.offsetTop + p * (sec.offsetHeight - window.innerHeight)));
    await new Promise((r) => setTimeout(r, 1600));
  }, p);
  const out = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    const g = c.getContext("2d");
    const n = c.width - 1, h = n >> 1;
    const pts = [[0,0],[n,0],[0,n],[n,n],[h,0],[0,h],[n,h],[h,n]];
    return pts.map(([x,y]) => [...g.getImageData(x,y,1,1).data].slice(0,3).join(","));
  });
  console.log(p.toFixed(2), JSON.stringify(out));
}
await b.close();
