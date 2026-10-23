/* Did the 15px floor newly push the progress strip into scrolling, or was it
 * already scrolling? Answered by putting the old size back in the live page
 * and measuring the same element, not by remembering. */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
for (const [name, w, h] of [["desktop",1440,900],["tablet",768,1024],["mobile",375,812]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await page.goto("http://localhost:3100", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.fonts.ready);
  const read = () => page.evaluate(() => {
    const s = document.querySelector(".ls__stations");
    return { need: s.scrollWidth, have: s.clientWidth, scrolls: s.scrollWidth > s.clientWidth };
  });
  const after = await read();
  await page.evaluate(() => {
    document.querySelectorAll(".ls__station-label").forEach(n => (n.style.fontSize = "12px"));
  });
  await page.waitForTimeout(300);
  const before = await read();
  console.log(`${name.padEnd(8)} old 12px: ${JSON.stringify(before)}   new 15px: ${JSON.stringify(after)}`);
  await page.close();
}
await b.close();
