/*
 * The sticky composition: the gap between the row and the strip, and whether
 * the group is centred, at every width including the tallest and widest cases.
 * Plus the step exchange: no two states visible at once, no ghost of a skipped
 * step after a fast double crossing, and no layout shift while the text swaps.
 */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

console.log("GAP AND CENTRING");
for (const [w, h] of [[1440, 900], [1680, 1050], [1920, 1080], [2560, 1440], [3440, 1440], [1440, 700], [1440, 1600], [375, 812]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await page.goto("http://localhost:3100/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    const s = document.getElementById("life-stages");
    window.scrollTo(0, s.offsetTop + s.offsetHeight * 0.3);
    await new Promise((r) => setTimeout(r, 1200));
  });
  const m = await page.evaluate(() => {
    const sticky = document.querySelector(".ls__sticky").getBoundingClientRect();
    const row = document.querySelector(".ls__row").getBoundingClientRect();
    const bar = document.querySelector(".ls__bar").getBoundingClientRect();
    return {
      vh: window.innerHeight,
      gap: Math.round(bar.top - row.bottom),
      above: Math.round(row.top - sticky.top),
      below: Math.round(sticky.bottom - bar.bottom),
      square: Math.round(document.querySelector("canvas").getBoundingClientRect().width),
      barVisible: bar.bottom <= window.innerHeight + 1,
    };
  });
  const balanced = Math.abs(m.above - m.below) <= 6;
  console.log(`  ${String(w).padStart(4)}x${String(h).padEnd(4)} gap=${String(m.gap).padStart(4)}  above=${String(m.above).padStart(4)} below=${String(m.below).padStart(4)}  centred=${balanced}  square=${m.square}  barVisible=${m.barVisible}`);
  ok(m.gap <= 80, `${w}x${h}: gap between row and strip is ${m.gap}px`);
  /* centring is the DESKTOP composition; under 1024 the invented mobile
     arrangement stacks from the top with the strip pinned below, on purpose */
  if (w >= 1024) ok(balanced, `${w}x${h}: composition not centred (above ${m.above}, below ${m.below})`);
  ok(m.barVisible, `${w}x${h}: the progress bar is past the fold`);
  await page.close();
}

console.log("\nTHE STEP EXCHANGE");
{
  const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto("http://localhost:3100/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const at = async (p) => page.evaluate(async (p) => {
    const s = document.getElementById("life-stages");
    window.scrollTo(0, s.offsetTop + p * (s.offsetHeight - window.innerHeight));
    await new Promise((r) => setTimeout(r, 900));
  }, p);

  await at(0.03);
  const before = await page.evaluate(() => document.querySelector(".ls__title").textContent);

  /* cross TWO steps quickly, then read what settled */
  await page.evaluate(async () => {
    const s = document.getElementById("life-stages");
    const range = s.offsetHeight - window.innerHeight;
    window.scrollTo(0, s.offsetTop + 0.15 * range);
    await new Promise((r) => setTimeout(r, 60));
    window.scrollTo(0, s.offsetTop + 0.30 * range);
    await new Promise((r) => setTimeout(r, 1200));
  });
  const after = await page.evaluate(() => ({
    title: document.querySelector(".ls__title").textContent,
    station: document.querySelector(".ls__station.is-active").textContent.trim(),
    /* the column must be showing the CURRENT station, not a skipped one */
    phaseClasses: [...document.querySelectorAll(".ls__swap")].map((n) => n.className.includes("is-in")),
    opacity: getComputedStyle(document.querySelector(".ls__title")).opacity,
  }));
  console.log(`  after a fast double crossing: title="${after.title.slice(0, 22)}" station="${after.station}" settled-in=${after.phaseClasses.every(Boolean)} opacity=${after.opacity}`);
  ok(before !== after.title, "the exchange did not change the content at all");
  ok(after.phaseClasses.every(Boolean), "a swapped element was left mid-exchange");
  ok(after.opacity === "1", `the heading settled at opacity ${after.opacity}`);

  /* layout must not shift while the text changes */
  /* The probe is the progress bar, which sits BELOW the swapping block and is
     not itself animated. Probing the CTA measures the animation's own 10px
     transform and says nothing about reflow - the first version of this check
     did exactly that and read as a defect. */
  const shift = await page.evaluate(async () => {
    const cta = document.querySelector(".ls__bar");
    const s = document.getElementById("life-stages");
    const range = s.offsetHeight - window.innerHeight;
    const y = () => Math.round(cta.getBoundingClientRect().top);
    const samples = [y()];
    window.scrollTo(0, s.offsetTop + 0.45 * range);
    for (let i = 0; i < 12; i++) { await new Promise((r) => setTimeout(r, 40)); samples.push(y()); }
    await new Promise((r) => setTimeout(r, 700));
    samples.push(y());
    return { min: Math.min(...samples), max: Math.max(...samples) };
  });
  console.log(`  progress bar position during a swap: ${shift.min}..${shift.max} (drift ${shift.max - shift.min}px)`);
  ok(shift.max - shift.min <= 2, `the layout shifted ${shift.max - shift.min}px during the exchange`);

  /* reduced motion: instant, no transition */
  await page.close();
  const rm = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  await rm.goto("http://localhost:3100/", { waitUntil: "load" });
  await rm.waitForTimeout(1200);
  const rmState = await rm.evaluate(() => {
    const el = document.querySelector(".ls__title");
    const cs = getComputedStyle(el);
    return { transition: cs.transitionDuration, opacity: cs.opacity, transform: cs.transform };
  });
  console.log(`  reduced motion: transition=${rmState.transition} opacity=${rmState.opacity} transform=${rmState.transform}`);
  ok(rmState.transition === "0s" || rmState.transition === "0s, 0s", `reduced motion still animates (${rmState.transition})`);
  await rm.close();
}
/* ---------------------------------------------------------------------------
   THE STAGED ENTRANCE (Elyakim, 19.09)

   Entering a step plays heading, paragraph, CTA, then the cards, each on its
   own beat, in that order, finishing about a second after it starts. Asserted
   as an ORDER plus a total, not as six exact numbers, so the sequence can be
   retimed without a test edit - but it cannot silently become simultaneous
   again, and it cannot creep past ~1.2s.
--------------------------------------------------------------------------- */
{
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3100/", { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const top = await page.$eval("#life-stages", (e) => e.offsetTop);
  await page.evaluate((y) => window.scrollTo(0, y), top + 1080);
  await page.waitForTimeout(1400);

  const seq = await page.$$eval(".ls__swap", (els) =>
    els.map((e) => {
      const cs = getComputedStyle(e);
      const ms = (v) => parseFloat(v) * (v.includes("ms") ? 1 : 1000);
      return {
        name: e.className.split(" ")[0],
        delay: ms(cs.transitionDelay.split(",")[0]),
        dur: ms(cs.transitionDuration.split(",")[0]),
      };
    })
  );

  ok(seq.length >= 4, `staged entrance: expected at least 4 staged elements, found ${seq.length}`);
  const delays = seq.map((x) => x.delay);
  ok(new Set(delays).size === delays.length, `staged entrance: delays repeat (${delays.join(", ")}), so items arrive together`);
  for (let i = 1; i < delays.length; i++) {
    ok(delays[i] > delays[i - 1], `staged entrance: item ${i} (${delays[i]}ms) does not follow item ${i - 1} (${delays[i - 1]}ms) - the order is heading, paragraph, CTA, then the cards`);
  }
  const total = delays[delays.length - 1] + seq[seq.length - 1].dur;
  ok(total >= 600 && total <= 1200, `staged entrance: first to last is ${total}ms, which is not the "about a second" asked for`);
  console.log(`  staged entrance: ${delays.join(" -> ")}ms, last settles at ${total}ms`);

  /* crossing two steps quickly must cancel and leave nothing behind */
  for (const mult of [1.2, 2.4, 3.6]) {
    await page.evaluate((y) => window.scrollTo(0, y), top + Math.round(900 * mult));
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(1500);
  const settled = await page.$$eval(".ls__swap", (els) => els.map((e) => +getComputedStyle(e).opacity));
  ok(settled.every((o) => o > 0.99), `staged entrance: after crossing two steps quickly, opacities settled at ${settled.join(", ")} - a ghost survived`);
  console.log(`  fast crossing settles clean: ${settled.length} elements all at full opacity`);
  await page.close();
}

await b.close();
if (fails.length) { console.error("\nCOMPOSITION FAILED:\n" + fails.map((f) => "  - " + f).join("\n")); process.exit(1); }
console.log("\ncomposition centred, the exchange holds, and the staged entrance plays in order");
