/*
 * Transparency, measured on two sides.
 *
 * 1. THE FILE: does the encoded asset still carry an alpha channel, and does
 *    it actually use it? A file can be RGBA and still be fully opaque, which
 *    is what an optimiser that flattens onto white leaves behind - so this
 *    counts genuinely transparent pixels rather than trusting the header.
 *
 *    IT ALSO PRINTS THE FILE'S MTIME, and that is not decoration. On 18.09 I
 *    measured this directory, reported the assets as opaque, and repeated the
 *    claim in a second report - while Tal was overwriting the same files. The
 *    set I measured was two generations old. A directory another agent is
 *    writing to is a moving source: stamp the measurement or it is not a
 *    measurement of anything in particular.
 * 2. THE PAGE: does the card's own background show THROUGH the artwork? A
 *    white plate behind the slot is invisible on a white page and obvious on
 *    an ivory card, so the pixel behind the image is sampled on the rendered
 *    page and compared with the card's own colour.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const b = await chromium.launch({ channel: "chrome" });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto("http://localhost:3100/posts/halvaa-lelo-ribit-miluim", { waitUntil: "load" });
await page.waitForTimeout(800);

const dirs = ["public/brand", "public/posts"];
const files = dirs.flatMap((d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /\.(png|webp|avif)$/i.test(f)).map((f) => path.join(d, f)) : []));

console.log("FILE-LEVEL ALPHA");
const rows = [];
for (const f of files) {
  const r = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = Math.min(img.naturalWidth, 256);
    c.height = Math.min(img.naturalHeight, 256);
    const g = c.getContext("2d", { willReadFrequently: true });
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let transparent = 0, partial = 0, total = d.length / 4;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] === 0) transparent++;
      else if (d[i] < 255) partial++;
    }
    return {
      w: img.naturalWidth, h: img.naturalHeight,
      transparentPct: +(100 * transparent / total).toFixed(1),
      partialPct: +(100 * partial / total).toFixed(1),
    };
  }, "/" + f.replace(/^public\//, ""));
  const stat = fs.statSync(f);
  const bytes = stat.size;
  const mtime = stat.mtime.toISOString().slice(0, 19).replace("T", " ");
  rows.push({ f, bytes, mtime, ...r });
  console.log(
    `  ${f.replace("public/", "").padEnd(34)} ${String(Math.round(bytes / 1024)).padStart(5)} kB  ` +
    `${r.w}x${r.h}  fully transparent ${String(r.transparentPct).padStart(5)}%  soft edge ${r.partialPct}%  ` +
    `${r.transparentPct > 0 ? "ALPHA LIVE" : "opaque"}  mtime ${mtime}`
  );
}

console.log("\nPAGE-LEVEL: does the card show through the artwork?");
const through = await page.evaluate(() => {
  const card = document.querySelector(".post__hero-art");
  const img = card.querySelector("img");
  const cardBg = getComputedStyle(card).backgroundColor;
  const imgBg = getComputedStyle(img).backgroundColor;
  const cr = card.getBoundingClientRect(), ir = img.getBoundingClientRect();
  return {
    cardBackground: cardBg,
    imageOwnBackground: imgBg,
    imageHasOwnPlate: imgBg !== "rgba(0, 0, 0, 0)" && imgBg !== "transparent",
    /* anything painted between the card and the image would sit here */
    layersBetween: [...card.children].filter((el) => el !== img && getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)").length,
    cardBox: { w: Math.round(cr.width), h: Math.round(cr.height) },
    imgBox: { w: Math.round(ir.width), h: Math.round(ir.height) },
  };
});
console.log("  " + JSON.stringify(through));
const fails = [];
if (through.imageHasOwnPlate) fails.push("the image carries its own background colour - a transparent PNG would sit on a plate");
if (through.layersBetween) fails.push(`${through.layersBetween} painted layer(s) between the card and the image`);
if (through.cardBackground === "rgb(255, 255, 255)") fails.push("the card background is pure white, so transparency will not read");
await b.close();
if (fails.length) { console.error("\nALPHA CHECK FAILED:\n" + fails.map((x) => "  - " + x).join("\n")); process.exit(1); }
console.log("\nthe image slot has no plate behind it: a transparent asset will sit on the card's own colour");
