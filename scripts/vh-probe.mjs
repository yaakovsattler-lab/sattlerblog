import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
for (const isMobile of [true, false]) {
  const page = await (await b.newContext({ viewport: { width: 375, height: 812 }, isMobile, hasTouch: isMobile })).newPage();
  await page.goto("http://localhost:3100/posts", { waitUntil: "load" });
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => ({
    innerH: window.innerHeight, clientH: document.documentElement.clientHeight,
    visualH: Math.round(window.visualViewport?.height ?? -1),
    vh100: (() => { const d = document.createElement("div"); d.style.cssText = "position:fixed;height:100vh;width:1px"; document.body.appendChild(d); const h = d.getBoundingClientRect().height; d.remove(); return Math.round(h); })(),
    dvh100: (() => { const d = document.createElement("div"); d.style.cssText = "position:fixed;height:100dvh;width:1px"; document.body.appendChild(d); const h = d.getBoundingClientRect().height; d.remove(); return Math.round(h); })(),
  }));
  console.log(`isMobile=${isMobile}`, JSON.stringify(before));
  await page.close();
}
await b.close();
