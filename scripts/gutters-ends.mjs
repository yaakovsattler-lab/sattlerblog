/* The two facts that matter, stated directly: at the first step the FIRST
 * station sits --edge-gutter in from the right screen edge (RTL start), and at
 * the last step the LAST station sits --edge-gutter in from the left edge
 * (RTL end). Same for the first and last card. */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
for (const [n, w, h] of [["375", 375, 812], ["390", 390, 844], ["768", 768, 1024]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 })).newPage();
  await page.goto("http://localhost:3100", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.fonts.ready);
  const at = async (p) => {
    await page.evaluate(async (p) => {
      const s = document.querySelector(".ls");
      window.scrollTo(0, Math.round(s.offsetTop + p * (s.offsetHeight - window.innerHeight)));
      await new Promise(r => setTimeout(r, 1500));
    }, p);
    return page.evaluate(() => {
      const vw = window.innerWidth;
      const g = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--edge-gutter"));
      const st = [...document.querySelectorAll(".ls__station")];
      const cd = [...document.querySelectorAll(".ls__card")];
      const r = (e) => e.getBoundingClientRect();
      return {
        gutter: g,
        firstStationInsetFromRight: Math.round(vw - r(st[0]).right),
        lastStationInsetFromLeft: Math.round(r(st[st.length - 1]).left),
        firstCardInsetFromRight: Math.round(vw - r(cd[0]).right),
        active: document.querySelector(".ls__station.is-active").textContent.trim(),
      };
    });
  };
  console.log(n, "first step ", JSON.stringify(await at(0.02)));
  console.log(n, "last step  ", JSON.stringify(await at(0.99)));
  await page.close();
}
await b.close();
