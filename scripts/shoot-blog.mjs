import { chromium } from "playwright";
import fs from "node:fs";
const OUT = "screenshots/round-b";
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: "chrome" });
const out = [];
for (const [name, w, h] of [["desktop", 1440, 900], ["mobile", 375, 812]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 768, hasTouch: w < 768 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("http://localhost:3100/posts", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}-10-blog-top.png` });
  const counts = async () => page.evaluate(() => ({
    cards: document.querySelectorAll(".blog__card").length,
    featured: document.querySelectorAll(".blog__featured").length,
    empty: document.querySelectorAll(".blog__empty").length,
    firstTitle: (document.querySelector(".blog__featured-title")?.textContent ?? "").slice(0, 30),
  }));
  const all = await counts();
  /* the filter has to actually filter */
  await page.click('.blog__filter:has-text("במילואים")');
  await page.waitForTimeout(400);
  const reserve = await counts();
  await page.screenshot({ path: `${OUT}/${name}-11-blog-filtered.png` });
  /* a filter with no posts must land somewhere honest */
  await page.click('.blog__filter:has-text("במילואים")');
  await page.click('.blog__filter:has-text("קונים דירה")');
  await page.waitForTimeout(400);
  const none = await counts();
  await page.screenshot({ path: `${OUT}/${name}-12-blog-empty-state.png` });
  await page.click(".blog__empty-reset");
  await page.waitForTimeout(400);
  const reset = await counts();
  /* the ordering tab has to actually reorder */
  await page.click('.blog__tab:has-text("מה שהייתי")');
  await page.waitForTimeout(400);
  const startTab = await counts();
  out.push({ view: name, all, reserve, none, reset, startTab, overflowX: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), errors });
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
