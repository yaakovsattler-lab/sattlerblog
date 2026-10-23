/* Boundary check: for each of the 8 steps, land just inside its start and just
 * inside its end and read which station the section reports. Also reports the
 * section's total height in px and in viewport heights. */
import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto("http://localhost:3100", { waitUntil: "load" });
await page.waitForTimeout(2500);

const geo = await page.evaluate(() => {
  const sec = document.querySelector(".ls");
  return {
    sectionHeightPx: sec.offsetHeight,
    viewportPx: window.innerHeight,
    scrubRangePx: sec.offsetHeight - window.innerHeight,
    stepScroll: getComputedStyle(document.documentElement).getPropertyValue("--step-scroll").trim(),
    documentHeightPx: document.documentElement.scrollHeight,
  };
});
console.log(JSON.stringify(geo, null, 1));

/* Step boundaries are no longer 1/8 apart: station 8 is --last-step-scale of a
   full step. Derive them from the page's own variable rather than hardcoding. */
const scale = await page.evaluate(() =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--last-step-scale"))
);
const weights = [1, 1, 1, 1, 1, 1, 1, scale];
const total = weights.reduce((a, b) => a + b, 0);
const starts = [];
let run = 0;
for (const w of weights) { starts.push(run / total); run += w; }
const ends = starts.slice(1).concat(1);
console.log("last-step-scale", scale, "boundaries", starts.map((v) => +v.toFixed(4)));

const rows = [];
for (let i = 0; i < 8; i++) {
  const span = ends[i] - starts[i];
  for (const [where, p] of [["start", starts[i] + span * 0.03], ["end", ends[i] - span * 0.03]]) {
    await page.evaluate(async (p) => {
      const sec = document.querySelector(".ls");
      const range = sec.offsetHeight - window.innerHeight;
      window.scrollTo(0, Math.round(sec.offsetTop + p * range));
      await new Promise((r) => setTimeout(r, 1500));
    }, p);
    const s = await page.evaluate(() => ({
      active: document.querySelector(".ls__station.is-active").textContent.trim(),
      index: [...document.querySelectorAll(".ls__station")].findIndex((n) => n.classList.contains("is-active")),
      title: document.querySelector(".ls__title").textContent.trim(),
      fill: document.querySelector(".ls__fill").style.transform,
    }));
    rows.push({ step: i + 1, where, p: +p.toFixed(4), span: +span.toFixed(4), ...s });
  }
}
console.table(rows);
await browser.close();
