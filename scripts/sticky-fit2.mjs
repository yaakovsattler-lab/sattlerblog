import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
for (const [n, w, h] of [["375x667 (SE)", 375, 667], ["360x640 (small Android)", 360, 640], ["375x812", 375, 812], ["390x844", 390, 844], ["430x932", 430, 932], ["768x1024", 768, 1024], ["1440x900", 1440, 900], ["1440x700 (short desktop)", 1440, 700]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 })).newPage();
  await page.goto("http://localhost:3100", { waitUntil: "load" });
  await page.waitForTimeout(1800);
  await page.evaluate(() => document.fonts.ready);
  const bad = [];
  let media = 0;
  for (let i = 0; i < 8; i++) {
    const m = await page.evaluate(async (p) => {
      const s = document.querySelector(".ls");
      window.scrollTo(0, Math.round(s.offsetTop + p * (s.offsetHeight - window.innerHeight)));
      await new Promise(r => setTimeout(r, 1200));
      const bar = document.querySelector(".ls__bar").getBoundingClientRect();
      return {
        station: document.querySelector(".ls__station.is-active").textContent.trim(),
        clippedBy: Math.round(bar.bottom - window.innerHeight),
        media: Math.round(document.querySelector("canvas").getBoundingClientRect().width),
      };
    }, i / 8 + 0.06);
    media = m.media;
    if (m.clippedBy > 0) bad.push(`${m.station} +${m.clippedBy}px`);
  }
  console.log(`${n.padEnd(24)} square ${String(media).padStart(3)}px  ${bad.length ? "CLIPPED: " + bad.join(", ") : "all 8 steps fit"}`);
  await page.close();
}
await b.close();
