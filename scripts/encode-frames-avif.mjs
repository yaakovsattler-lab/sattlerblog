/*
 * AVIF alongside the verified WebP frames. NOTHING is overwritten: the .webp
 * files stay exactly where they are and remain the fallback, so reverting this
 * is deleting the .avif files.
 *
 * The white background is Elyakim's own fix and is not traded for kilobytes,
 * so every frame written here is compared - at the same eight probe points the
 * white point was verified with - against THE WEBP IT CAME FROM, not against
 * absolute white. That distinction matters: two frames of clip 2-to-3 have a
 * black line genuinely crossing the top edge, and demanding pure white there
 * would reject correct output. The rule is that AVIF must not MOVE a point the
 * WebP already had.
 *
 * A frame that does move goes up a quality ladder rather than being discarded,
 * and only if it still moves at the top of the ladder is the whole run rolled
 * back.
 */

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const ROOT = "public/frames";
/* Quality ladder. Nearly every frame lands on the first rung; the last rung is
   lossless and exists for one frame in 319 - 2-to-3/011 has a hard black line
   crossing the mid-top probe point, and no lossy AVIF reproduces a hard ink
   edge byte for byte at any quality. Rather than loosen the rule to let that
   through, the one frame that needs it gets an exact encode. */
const LADDER = [
  { quality: 50, effort: 4 },
  { quality: 72, effort: 4 },
  { quality: 90, effort: 4 },
  { lossless: true, effort: 4 },
];
const rungName = (o) => (o.lossless ? "lossless" : `q${o.quality}`);

/** the eight points the white point was verified at, in this morning's order */
function probePoints(w) {
  const n = w - 1, h = n >> 1;
  return [[0, 0], [n, 0], [0, n], [n, n], [h, 0], [0, h], [n, h], [h, n]];
}

async function probe(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return probePoints(info.width).map(([x, y]) => {
    const i = (y * info.width + x) * info.channels;
    return [x, y, [data[i], data[i + 1], data[i + 2]]];
  });
}

const same = (a, b) => a.every(([, , c], i) => c.every((v, k) => v === b[i][2][k]));

const clips = fs.readdirSync(ROOT).filter((d) => d.includes("-to-"));
let webpTotal = 0, avifTotal = 0, frames = 0;
const impure = [];

const escalated = [];
for (const clip of clips) {
  const dir = path.join(ROOT, clip);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).sort();
  let cw = 0, ca = 0;
  for (const f of files) {
    const src = path.join(dir, f);
    const out = src.replace(/\.webp$/, ".avif");
    const want = await probe(src);

    let buf = null, usedRung = -1;
    for (const [rung, opts] of LADDER.entries()) {
      const candidate = await sharp(src).avif(opts).toBuffer();
      if (same(want, await probe(candidate))) { buf = candidate; usedRung = rung; break; }
    }
    if (!buf) { impure.push({ file: `${clip}/${f}`, want }); continue; }
    if (usedRung > 0) escalated.push(`${clip}/${f} at ${rungName(LADDER[usedRung])}`);

    fs.writeFileSync(out, buf);
    cw += fs.statSync(src).size;
    ca += buf.length;
    frames++;
  }
  webpTotal += cw; avifTotal += ca;
  console.log(`  ${clip}  ${files.length} frames  webp ${(cw / 1024 / 1024).toFixed(2)} MB -> avif ${(ca / 1024 / 1024).toFixed(2)} MB  (${(100 - 100 * ca / cw).toFixed(0)}% less)`);
}

console.log(`\n  TOTAL ${frames} frames: ${(webpTotal / 1024 / 1024).toFixed(2)} MB -> ${(avifTotal / 1024 / 1024).toFixed(2)} MB  (${(100 - 100 * avifTotal / webpTotal).toFixed(0)}% less)`);

if (escalated.length) {
  console.log(`\n  ${escalated.length} frame(s) needed a higher rung: ${escalated.slice(0, 6).join(", ")}`);
}

if (impure.length) {
  console.error(`\nPROBE POINTS MOVED on ${impure.length} frame(s) even at ${rungName(LADDER[LADDER.length - 1])} - rolling back, the WebP originals stand:`);
  for (const i of impure.slice(0, 8)) console.error(`  ${i.file}`);
  for (const clip of clips) for (const f of fs.readdirSync(path.join(ROOT, clip))) if (f.endsWith(".avif")) fs.unlinkSync(path.join(ROOT, clip, f));
  process.exit(1);
}
console.log(`  every probe point on all ${frames} frames is byte-identical to the WebP it came from`);
