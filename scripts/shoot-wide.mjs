import { chromium } from "playwright";
import fs from "node:fs";
const OUT = "screenshots/wide";
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: "chrome" });
const page = await (await b.newContext({ viewport: { width: 2560, height: 1300 }, deviceScaleFactor: 1 })).newPage();
for (const [label, url, scrollTo] of [
  ["01-home-hero", "/", 0],
  ["02-life-stages", "/", "ls"],
  ["03-blog-index", "/posts", 0],
  ["04-post-body", "/posts/halvaa-lelo-ribit-miluim", 900],
  ["05-footer", "/", "bottom"],
]) {
  await page.goto("http://localhost:3100" + url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  await page.evaluate(async (t) => {
    if (t === "ls") { const s = document.getElementById("life-stages"); window.scrollTo(0, s.offsetTop + s.offsetHeight * 0.3); }
    else if (t === "bottom") window.scrollTo(0, document.body.scrollHeight);
    else window.scrollTo(0, t);
    await new Promise((r) => setTimeout(r, 1200));
  }, scrollTo);
  await page.screenshot({ path: `${OUT}/2560-${label}.png` });
}
await b.close();
console.log("wide screenshots written to " + OUT);
