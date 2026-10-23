/* Screenshot one route at desktop and phone, and report the basics. */
import { chromium } from "playwright";
import fs from "node:fs";
const [route, name] = process.argv.slice(2);
const OUT = "screenshots/pages";
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: "chrome" });
/* 360 and 1024 are here because that is where Mika found breaks my old
   two-width sweep could not see. Do not narrow this back. */
for (const [label, w, h] of [
  ["360", 360, 900],
  ["mobile", 375, 812],
  ["768", 768, 1024],
  ["1024", 1024, 900],
  ["desktop", 1440, 900],
  ["2560", 2560, 900],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("http://localhost:3100" + route, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  /* Scroll the whole page first. The scroll entrances only fire when a section
     enters the viewport, so a fullPage screenshot taken without scrolling
     photographs every below-the-fold section at opacity 0 - which looks exactly
     like missing content. Anyone reviewing with screenshots needs this. */
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 160));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 500));
  });
  await page.screenshot({ path: `${OUT}/${name}-${label}.png`, fullPage: true });
  const m = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
    height: document.documentElement.scrollHeight,
    links: [...document.querySelectorAll("main a[href]")].map((a) => a.getAttribute("href")),
  }));
  console.log(`  ${label}: height ${m.height}px, overflowX ${m.overflowX}, main links ${JSON.stringify([...new Set(m.links)])}, errors ${errors.length}`);
  await ctx.close();
}
await b.close();
