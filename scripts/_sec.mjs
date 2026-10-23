import { chromium } from "playwright";
const [sel, name] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" });
for (const [w, label] of [[1440, "desktop"], [375, "mobile"]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 })).newPage();
  await page.goto("http://localhost:3100/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async (sel) => {
    document.querySelector(sel).scrollIntoView({ block: "start" });
    window.scrollBy(0, -60);
    await new Promise((r) => setTimeout(r, 1400));
  }, sel);
  const el = await page.$(sel);
  await el.screenshot({ path: `screenshots/pages/${name}-${label}.png` });
  console.log(`  ${label}: shot`);
  await page.close();
}
await b.close();
