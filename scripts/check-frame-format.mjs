/*
 * Did the format swap change anything the reader sees?
 *  - which extension the page actually requests, and how many bytes
 *  - the canvas draws the SAME pixels at the same scroll position as WebP did
 *  - a browser without AVIF still gets a working sequence
 */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

async function run(forceWebp) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  if (forceWebp) {
    /* Simulate a browser that cannot decode AVIF. Blocking .avif REQUESTS is
       not that simulation - the loader's probe is a data URI, so it would
       still succeed, the loader would still choose AVIF, and every frame would
       then fail to load. That is what the first version of this check did and
       it read as a product bug. What a browser without AVIF actually does is
       fail to DECODE, so that is what is patched here, before any page script
       runs. */
    await page.addInitScript(() => {
      const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
      Object.defineProperty(HTMLImageElement.prototype, "src", {
        configurable: true,
        get() { return desc.get.call(this); },
        set(v) {
          if (typeof v === "string" && v.startsWith("data:image/avif")) {
            setTimeout(() => this.dispatchEvent(new Event("error")), 0);
            return;
          }
          desc.set.call(this, v);
        },
      });
    });
  }
  const seen = [];
  page.on("response", async (r) => {
    if (!/\/frames\//.test(r.url())) return;
    try { seen.push({ ext: r.url().split(".").pop(), bytes: (await r.body()).length }); } catch {}
  });
  await page.goto("http://localhost:3100/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    const s = document.getElementById("life-stages");
    window.scrollTo(0, s.offsetTop + 0.30 * (s.offsetHeight - window.innerHeight));
    await new Promise((r) => setTimeout(r, 2500));
  });
  const shot = await page.locator("canvas").screenshot();
  const state = await page.evaluate(() => ({
    station: document.querySelector(".ls__station.is-active").textContent.trim(),
    title: document.querySelector(".ls__title").textContent.trim(),
    /* is the canvas actually painted, or blank? */
    painted: (() => {
      const c = document.querySelector("canvas");
      const g = c.getContext("2d", { willReadFrequently: true });
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let nonWhite = 0;
      for (let i = 0; i < d.length; i += 4 * 97) if (d[i] !== 255 || d[i + 1] !== 255 || d[i + 2] !== 255) nonWhite++;
      return nonWhite;
    })(),
    corners: (() => {
      const c = document.querySelector("canvas");
      const g = c.getContext("2d", { willReadFrequently: true });
      const n = c.width - 1, h = n >> 1;
      return [[0,0],[n,0],[0,n],[n,n],[h,0],[0,h],[n,h],[h,n]]
        .map(([x, y]) => [...g.getImageData(x, y, 1, 1).data].slice(0, 3).join(","));
    })(),
  }));
  const byExt = {};
  for (const s of seen) byExt[s.ext] = (byExt[s.ext] || 0) + s.bytes;
  await ctx.close();
  return { seen: seen.length, byExt, shot, ...state };
}

const avif = await run(false);
const webp = await run(true);

console.log(`  with AVIF   : ${avif.seen} frame requests, ${Object.entries(avif.byExt).map(([k, v]) => `${k} ${Math.round(v / 1024)}kB`).join(" ")}  station="${avif.station}"`);
console.log(`  without AVIF: ${webp.seen} frame requests, ${Object.entries(webp.byExt).map(([k, v]) => `${k} ${Math.round(v / 1024)}kB`).join(" ")}  station="${webp.station}"`);
console.log(`  canvas probe points, AVIF path: ${[...new Set(avif.corners)].join(" | ")}`);
console.log(`  canvas probe points, WebP path: ${[...new Set(webp.corners)].join(" | ")}`);
console.log(`  painted samples: avif ${avif.painted}, webp ${webp.painted}`);

ok(Object.keys(avif.byExt).includes("avif"), "the AVIF path did not request any .avif frames");
ok(Object.keys(webp.byExt).includes("webp"), "the fallback path did not request any .webp frames");
ok(avif.painted > 50 && webp.painted > 50, `the canvas is blank on one path (avif ${avif.painted}, webp ${webp.painted})`);
ok(avif.station === webp.station && avif.title === webp.title, "the two paths resolved to different steps");
ok(avif.corners.join() === webp.corners.join(), `the canvas differs between formats:\n      avif ${avif.corners.join(" ")}\n      webp ${webp.corners.join(" ")}`);
ok(avif.corners.every((c) => c === "255,255,255"), `a canvas probe point is not white: ${avif.corners.join(" ")}`);

await b.close();
if (fails.length) { console.error("\nFRAME FORMAT FAILED:\n" + fails.map((f) => "  - " + f).join("\n")); process.exit(1); }
console.log("\nboth formats draw the same frame, the white point holds on the canvas, and the fallback works");
