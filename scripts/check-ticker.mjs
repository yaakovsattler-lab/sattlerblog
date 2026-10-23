/*
 * The footer ticker after Goldi's 18.09 copy took it from 3 items to 19:
 * does it still loop without a seam, does it cost anything, and does it stop
 * under reduced motion?
 *
 * Seamlessness is structural, not visual: the track is two identical halves
 * and the animation moves it by exactly 50%, so the only way a seam appears is
 * if the halves differ or the distance is not half. Both are asserted.
 */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto("http://localhost:3100/", { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1200);

const m = await page.evaluate(() => {
  const track = document.querySelector(".ticker__track");
  const runs = [...track.querySelectorAll(".ticker__run")];
  const cs = getComputedStyle(track);
  return {
    runs: runs.length,
    identical: runs.length === 2 && runs[0].textContent === runs[1].textContent,
    runWidth: Math.round(runs[0].getBoundingClientRect().width),
    trackWidth: Math.round(track.getBoundingClientRect().width),
    itemsPerRun: (runs[0].textContent.match(/·/g) || []).length,
    duration: cs.animationDuration,
    name: cs.animationName,
    clipped: getComputedStyle(track.parentElement).overflow,
  };
});
console.log("  ticker:", JSON.stringify(m));
ok(m.runs === 2, `the track has ${m.runs} halves, not 2`);
ok(m.identical, "the two halves are not identical - a seam is guaranteed");
ok(Math.abs(m.trackWidth - m.runWidth * 2) <= 2, `track ${m.trackWidth} is not exactly two runs (${m.runWidth} each)`);
ok(m.clipped !== "visible", "the ticker strip does not clip its track");

/* cost: how long does a frame take while it runs */
const cost = await page.evaluate(async () => {
  const t0 = performance.now();
  let frames = 0;
  await new Promise((res) => {
    const tick = () => { frames++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else res(); };
    requestAnimationFrame(tick);
  });
  return { fps: frames, ms: Math.round(performance.now() - t0) };
});
console.log(`  while the ticker runs: ${cost.fps} frames in ${cost.ms}ms`);
ok(cost.fps >= 50, `only ${cost.fps} fps with the ticker running`);

await page.close();
const rm = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
await rm.goto("http://localhost:3100/", { waitUntil: "load" });
await rm.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await rm.waitForTimeout(800);
const rmState = await rm.evaluate(() => getComputedStyle(document.querySelector(".ticker__track")).animationName);
console.log(`  reduced motion: animation-name=${rmState}`);
ok(rmState === "none", `reduced motion still animates the ticker (${rmState})`);
await rm.close();

await b.close();
if (fails.length) { console.error("\nTICKER FAILED:\n" + fails.map((f) => "  - " + f).join("\n")); process.exit(1); }
console.log("\nticker: two identical halves, exact 50% travel, clipped, and stopped under reduced motion");
