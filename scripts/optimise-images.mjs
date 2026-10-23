/*
 * Image pipeline. Source files are never modified; everything is written to
 * public/opt/.
 *
 * Every source here has a live alpha channel (Tal's post illustrations are
 * PNG colour type 6 with 41-79% fully transparent pixels and real soft edges),
 * and the whole point of this step is that the alpha survives it. So both
 * output formats are alpha-capable, nothing is ever flattened onto a matte,
 * and each generated file is decoded again and checked - a pipeline that
 * quietly composites onto white would still produce a plausible-looking file.
 *
 * AVIF first, WebP second, the original PNG as the final fallback in the
 * <picture>. Widths cover the real rendered sizes at 1x and 2x.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const OUT = "public/opt";
const WIDTHS = [240, 400, 560, 760];

/* Every PNG in both folders, discovered rather than listed. A hardcoded list
   is a thing you forget to add to: the toolbox illustrations were added to the
   site and silently skipped here, which showed up as nine 404s for files that
   were never generated. Discovery makes that impossible. */
const SOURCES = [
  ...["public/posts", "public/brand"].flatMap((dir) =>
    fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(".png"))
          .map((f) => ({
            src: path.join(dir, f),
            name: f.replace(/\.png$/, ""),
            group: dir.endsWith("posts") ? "post illustration" : "brand",
          }))
      : []
  ),
];

fs.mkdirSync(OUT, { recursive: true });

/** Measure a file's real alpha use, from its decoded pixels. */
async function alphaOf(input) {
  const meta = await sharp(input).metadata();
  if (!meta.hasAlpha) return { hasAlpha: false, zeroPct: 0, softPct: 0 };
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let zero = 0, soft = 0;
  for (let i = info.channels - 1; i < data.length; i += info.channels) {
    if (data[i] === 0) zero++;
    else if (data[i] < 255) soft++;
  }
  const total = data.length / info.channels;
  return { hasAlpha: true, zeroPct: +(100 * zero / total).toFixed(1), softPct: +(100 * soft / total).toFixed(1) };
}

/*
 * The rule is "the output must not LOSE what the source had", not "every asset
 * must be transparent". Some assets legitimately have no alpha - the toolbox
 * illustrations (440:261 and siblings) are colour blocks with a solid
 * background, by design. Demanding alpha absolutely flagged all three as
 * failures, which is the same mistake as demanding pure white on a frame with
 * a black line through it: compare against the source.
 */
function alphaSurvived(src, out) {
  if (!src.hasAlpha) return { ok: true, note: "source is opaque, nothing to keep" };
  if (!out.hasAlpha) return { ok: false, note: "alpha channel dropped" };
  if (src.zeroPct > 0 && out.zeroPct === 0) return { ok: false, note: "transparency flattened" };
  return { ok: true, note: "" };
}

const rows = [];
const failures = [];

for (const s of SOURCES) {
  const srcBytes = fs.statSync(s.src).size;
  const meta = await sharp(s.src).metadata();
  const row = { ...s, srcBytes, srcW: meta.width, srcAlpha: await alphaOf(s.src), out: {} };

  for (const w of WIDTHS) {
    if (w > meta.width) continue;
    for (const [fmt, make] of [
      ["avif", (p) => p.avif({ quality: 55, effort: 4 })],
      ["webp", (p) => p.webp({ quality: 78, alphaQuality: 90, effort: 5 })],
    ]) {
      const buf = await make(sharp(s.src).resize({ width: w })).toBuffer();
      const outAlpha = await alphaOf(buf);
      const check = alphaSurvived(row.srcAlpha, outAlpha);
      const file = path.join(OUT, `${s.name}-${w}.${fmt}`);
      fs.writeFileSync(file, buf);
      row.out[`${fmt}${w}`] = { bytes: buf.length, ...outAlpha, ...check };
      if (!check.ok) failures.push(`${file}: ${check.note}`);
    }
  }
  rows.push(row);
}

/* ---- the table ---- */
const kb = (n) => `${Math.round(n / 1024)}`.padStart(5);
console.log("\nPER ASSET  (source PNG -> the file a 2x phone actually downloads at 400w)\n");
console.log("  asset                                    source   avif400  webp400  avif760  saving  alpha(avif400)");
let srcTotal = 0, avif400Total = 0, avif760Total = 0;
for (const r of rows) {
  const a4 = r.out.avif400, w4 = r.out.webp400, a7 = r.out.avif760;
  srcTotal += r.srcBytes;
  if (a4) avif400Total += a4.bytes;
  if (a7) avif760Total += a7.bytes;
  const saving = a4 ? `${(100 - (100 * a4.bytes) / r.srcBytes).toFixed(1)}%` : "-";
  console.log(
    `  ${r.name.padEnd(40)} ${kb(r.srcBytes)}kB ${a4 ? kb(a4.bytes) + "kB" : "   -  "} ${w4 ? kb(w4.bytes) + "kB" : "   -  "} ${a7 ? kb(a7.bytes) + "kB" : "   -  "} ${saving.padStart(6)}  ${a4 ? (r.srcAlpha.hasAlpha ? `transparent ${a4.zeroPct}% soft ${a4.softPct}% ${a4.ok ? "KEPT" : "LOST"}` : "opaque by design") : ""}`
  );
}
console.log(`\n  TOTALS  source ${(srcTotal / 1024 / 1024).toFixed(2)} MB  ->  avif@400 ${(avif400Total / 1024).toFixed(0)} kB  ·  avif@760 ${(avif760Total / 1024).toFixed(0)} kB`);

fs.writeFileSync(path.join(OUT, "_manifest.json"), JSON.stringify(
  Object.fromEntries(rows.map((r) => [r.name, { srcBytes: r.srcBytes, widths: WIDTHS.filter((w) => w <= r.srcW) }])), null, 2));

if (failures.length) {
  console.error("\nALPHA LOST IN:\n" + failures.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log("\nevery generated file keeps whatever alpha its source had (checked by decoding each one, not by trusting the encoder)");
