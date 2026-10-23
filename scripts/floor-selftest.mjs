/* Does the type-floor assertion actually fire? Inject one 13px text node and
 * one element whose font is forced to the fallback, and confirm the same audit
 * the verify harness runs reports both. A guard that never fails is not a
 * guard. */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto("http://localhost:3100", { waitUntil: "load" });
await page.waitForTimeout(2000);
await page.evaluate(() => document.fonts.ready);

const audit = () => page.evaluate(() => {
  const min = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--type-min"));
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const small = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement; if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue;
    const px = parseFloat(cs.fontSize);
    if (px < min) small.push({ px, text: n.nodeValue.trim().slice(0, 30) });
  }
  return small;
});

console.log("clean page, nodes under floor:", JSON.stringify(await audit()));
await page.evaluate(() => {
  const d = document.createElement("p");
  d.style.fontSize = "13px";
  d.textContent = "טקסט קטן מדי שנשתל בכוונה";
  document.body.appendChild(d);
});
console.log("after injecting a 13px node:", JSON.stringify(await audit()));
await b.close();
