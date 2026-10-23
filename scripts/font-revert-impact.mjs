/* What the revert to Almoni moved. For each card title: the height of the
 * clamped box, and the height the same text would take UNCLAMPED - if they
 * are equal, nothing is being cut. */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
for (const [n, w, h] of [["desktop-1440", 1440, 900], ["tablet-768", 768, 1024], ["mobile-375", 375, 812]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 })).newPage();
  await page.goto("http://localhost:3100", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    const s = document.querySelector(".ls");
    window.scrollTo(0, Math.round(s.offsetTop + 0.3 * (s.offsetHeight - window.innerHeight)));
    await new Promise(r => setTimeout(r, 1400));
  });
  console.log(n, JSON.stringify(await page.evaluate(() => {
    const strip = document.querySelector(".ls__stations");
    const titles = [...document.querySelectorAll(".ls__card-title")].map(t => {
      const clamped = Math.round(t.getBoundingClientRect().height);
      const prev = t.style.cssText;
      t.style.webkitLineClamp = "unset";
      t.style.display = "block";
      const full = Math.round(t.getBoundingClientRect().height);
      t.style.cssText = prev;
      const lh = parseFloat(getComputedStyle(t).lineHeight);
      return { clampedPx: clamped, fullPx: full, lines: Math.round(full / lh), truncated: full > clamped + 1 };
    });
    return {
      family: getComputedStyle(document.body).fontFamily.split(",")[0],
      cardHeight: Math.round(document.querySelector(".ls__card").getBoundingClientRect().height),
      titles,
      stationsNeed: strip.scrollWidth, stationsHave: strip.clientWidth,
      stationsScroll: strip.scrollWidth > strip.clientWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
    };
  })));
  await page.close();
}
await b.close();
