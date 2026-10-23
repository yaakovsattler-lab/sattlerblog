/* The post template, desktop and mobile. Full-page plus the three regions. */
import { chromium } from "playwright";
import fs from "node:fs";
const OUT = "screenshots/round-b";
fs.mkdirSync(OUT, { recursive: true });
const URL = "http://localhost:3100/posts/halvaa-lelo-ribit-miluim";
const b = await chromium.launch({ channel: "chrome" });
const report = [];
for (const [name, w, h] of [["desktop", 1440, 900], ["mobile", 375, 812]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 768, hasTouch: w < 768 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(URL, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}-01-hero.png` });
  for (const [label, sel] of [["02-body", ".post__body"], ["03-recommended", ".post__recommended"], ["04-newsletter", ".newsletter"]]) {
    await page.evaluate(async (sel) => {
      document.querySelector(sel).scrollIntoView({ block: "start", behavior: "instant" });
      window.scrollBy(0, -120);
      await new Promise((r) => setTimeout(r, 700));
    }, sel);
    await page.screenshot({ path: `${OUT}/${name}-${label}.png` });
  }
  const m = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
    docHeight: document.documentElement.scrollHeight,
    blocks: {
      paragraphs: document.querySelectorAll(".post__p").length,
      headings: document.querySelectorAll(".post__h2").length,
      leadIns: document.querySelectorAll(".post__lead-in").length,
      checklists: document.querySelectorAll(".post__checklist").length,
      tips: document.querySelectorAll(".post__tip").length,
      rules: document.querySelectorAll(".post__rule").length,
    },
    tiles: document.querySelectorAll(".post__tile").length,
    bodyWidth: Math.round(document.querySelector(".post__column").getBoundingClientRect().width),
    title: document.querySelector(".post__title").textContent.slice(0, 40),
  }));
  report.push({ view: name, ...m, errors });
  await ctx.close();
}
await b.close();
fs.writeFileSync(`${OUT}/_notes.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));
