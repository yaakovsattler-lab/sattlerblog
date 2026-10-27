/*
 * Proves the migration, against the dataset itself:
 *   1. GROQ count per type equals the count built from the files
 *   2. every post: block counts by kind before (parser) vs after (dataset),
 *      AND the whole body read back from Portable Text equals the parser's
 *      output, AND the lead equals the parser's lead
 *   3. every link read back as a route equals the source route
 *   4. every stage filter returns the same posts as the site's filter today
 *   5. every document equals what build.ts makes from the files
 *   6. every image: original bytes identical (sha1), dimensions, alpha kept in
 *      the original and in a WebP rendition
 *
 *   node_modules/.bin/sanity exec scripts/migrate/verify.ts --with-user-token -- --dataset development
 *
 * Exits 1 on any failure.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import { isDeepStrictEqual } from "node:util";
import sharp from "sharp";
import { getCliClient } from "sanity/cli";
import { allPosts, postsForStage } from "../../src/data/posts";
import { STAGE_FILTERS } from "../../src/data/post-types";
import { STATIONS } from "../../src/data/stations";
import { WHATSAPP_QUESTIONS } from "../../src/data/whatsapp-questions";
import { MY_STORY } from "../../src/data/my-story";
import { GUIDANCE } from "../../src/data/personal-guidance";
import { FOOTER_COLUMNS, HERO, NAV_CTA, NAV_LINKS } from "../../src/data/site";
import { KINDS, buildAll, countKinds, fromPortableText, hrefFor, id, resolveAssets } from "./build";
import { API_VERSION, targetDataset } from "./args";

const dataset = targetDataset();
const client = getCliClient({ apiVersion: API_VERSION }).withConfig({ dataset, useCdn: false });
let failures = 0;
const fail = (m: string) => { failures++; console.log("FAIL " + m); };

const { docs: built, assets } = buildAll();
const live: any[] = await client.fetch(`*[!(_type match "system.*") && !(_id in path("drafts.**")) && !(_type match "sanity.*")]`);
const drafts: number = await client.fetch(`count(*[_id in path("drafts.**")])`);
const byId = new Map(live.map((d) => [d._id, d]));

/* 1. counts */
console.log(`\n== 1. document counts in "${dataset}" (GROQ count(*[_type == T]))`);
const types = [...new Set(built.map((d) => d._type))];
for (const t of types) {
  const n: number = await client.fetch(`count(*[_type == $t && !(_id in path("drafts.**"))])`, { t });
  const want = built.filter((d) => d._type === t).length;
  console.log(`  ${t.padEnd(17)} ${n}  (files: ${want})`);
  if (n !== want) fail(`count ${t}: ${n} != ${want}`);
}
const assetCount: number = await client.fetch(`count(*[_type == "sanity.imageAsset"])`);
console.log(`  ${"sanity.imageAsset".padEnd(17)} ${assetCount}  (files: ${assets.length})`);
if (assetCount !== assets.length) fail(`image assets ${assetCount} != ${assets.length}`);
console.log(`  drafts            ${drafts}`);
const extra = live.filter((d) => !built.some((b) => b._id === d._id));
if (extra.length) fail(`documents in dataset not made by the migration: ${extra.map((d) => d._id).join(", ")}`);

/* 2. posts */
console.log(`\n== 2. post bodies: blocks by kind, files (parser) -> dataset`);
console.log(`  ${"post".padEnd(36)} ${KINDS.map((k) => k.padEnd(10)).join("")} gap  body  lead`);
for (const p of allPosts()) {
  const d = byId.get(id.post(p.slug));
  if (!d) { fail(`post ${p.slug} missing`); continue; }
  const after = fromPortableText(d.body ?? []);
  const a = countKinds(p.body), b = countKinds(after);
  const gap = KINDS.reduce((s, k) => s + Math.abs(a[k] - b[k]), 0);
  /* JSON round trip on both sides: the parser writes `title: undefined` on a
     checklist with no title, which is the same thing as no title key */
  const plain = (x: unknown) => JSON.parse(JSON.stringify(x));
  const same = isDeepStrictEqual(plain(after), plain(p.body));
  const leadOk = d.lead === p.lead;
  console.log(`  ${p.slug.padEnd(36)} ${KINDS.map((k) => `${a[k]}/${b[k]}`.padEnd(10)).join("")} ${String(gap).padEnd(4)} ${same ? "same" : "DIFF"}  ${leadOk ? "same" : "DIFF"}`);
  if (gap) fail(`post ${p.slug}: block count gap ${gap}`);
  if (!same) fail(`post ${p.slug}: body differs`);
  if (!leadOk) fail(`post ${p.slug}: lead differs`);
  for (const [k, v] of [["title", p.title], ["readingTime", p.readingTime], ["order", p.order]] as const)
    if (d[k] !== v) fail(`post ${p.slug}: ${k} differs`);
  if (!isDeepStrictEqual(d.topics, p.topics)) fail(`post ${p.slug}: topics differ`);
}

/* 3. links: dataset target -> route, against the source route */
console.log(`\n== 3. links read back as routes`);
let links = 0;
const checkHref = (where: string, target: any, want: string | null) => {
  links++;
  const got = hrefFor(target, byId);
  if (got !== want) fail(`${where}: ${got} != ${want}`);
};
const ss = byId.get("siteSettings");
NAV_LINKS.forEach((l, i) => checkHref(`nav[${i}]`, ss.navLinks[i].target, l.href));
checkHref("navCta", ss.navCta.target, NAV_CTA.href);
checkHref("hero.cta", ss.hero.cta.target, HERO.cta.href);
FOOTER_COLUMNS.forEach((c, ci) => c.links.forEach((l, li) => checkHref(`footer[${ci}][${li}]`, ss.footerColumns[ci].links[li].target, l.href)));
checkHref("my-story.cta", byId.get("page-my-story").cta.target, MY_STORY.cta.href);
checkHref("guidance.cta", byId.get("page-personal-guidance").cta.target, GUIDANCE.cta.href);
for (const q of WHATSAPP_QUESTIONS) checkHref(`bubble ${q.node}`, byId.get(id.bubble(q.node)).target, q.href);
for (const s of STATIONS) {
  const want = s.slug === "not-sure" ? null : s.cta.href; /* /start: no such route, reported gap */
  checkHref(`station ${s.slug}`, byId.get(id.stage(s.slug)).station?.cta?.target, want);
}
console.log(`  ${links} links checked`);

/* 4. stage filters: the site's free-text filter vs the dataset's references */
console.log(`\n== 4. blog filters: posts per stage, site today vs dataset`);
const posts = allPosts();
for (const f of STAGE_FILTERS) {
  const today = postsForStage(posts, f.slug).map((p) => p.slug).sort();
  const ds: string[] = (await client.fetch(`*[_type == "post" && references($id)].slug.current`, { id: id.stage(f.slug) })).sort();
  const ok = isDeepStrictEqual(today, ds);
  console.log(`  ${f.slug.padEnd(18)} ${String(today.length).padEnd(2)} / ${ds.length}  ${ok ? "same" : "DIFF"}`);
  if (!ok) fail(`filter ${f.slug}: ${today} vs ${ds}`);
}

/* 5. every document equals the build */
console.log(`\n== 5. documents equal the files`);
const assetIds = new Map<string, string>();
const assetDocs: any[] = await client.fetch(`*[_type == "sanity.imageAsset"]{_id, originalFilename, sha1hash, url, metadata{dimensions, hasAlpha}}`);
for (const a of assets) {
  const sha = crypto.createHash("sha1").update(fs.readFileSync(a.file)).digest("hex");
  const hit = assetDocs.find((x) => x.sha1hash === sha);
  if (hit) assetIds.set(a.key, hit._id);
}
const strip = (d: any) => Object.fromEntries(Object.entries(d).filter(([k]) => !["_rev", "_createdAt", "_updatedAt", "_system"].includes(k)));
let same = 0;
for (const b of resolveAssets(built, assetIds)) {
  const d = byId.get(b._id);
  if (d && isDeepStrictEqual(strip(d), b)) same++;
  else fail(`document ${b._id} differs from the files`);
}
console.log(`  ${same}/${built.length} identical`);

/* 6. images
 * "stored": the sha1 Sanity computed on upload equals the local file's, so the
 * original is kept byte for byte. "served": the CDN re-encodes some files
 * (opaque PNGs, WebP, SVG) even with no parameters, so what a browser gets is
 * compared by decoded pixels instead of bytes. Alpha is the share of pixels
 * with alpha < 255, measured locally, on the CDN original and on a WebP 400px
 * rendition (what auto=format sends a modern browser). */
console.log(`\n== 6. images: stored bytes, served pixels, dimensions, alpha`);
async function pixels(buf: Buffer) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let t = 0;
  for (let i = 3; i < data.length; i += info.channels) if (data[i] < 255) t++;
  return { data, share: t / (info.width * info.height) };
}
console.log(`  ${"file".padEnd(46)} ${"stored".padEnd(7)} ${"served".padEnd(7)} ${"dims local/sanity".padEnd(22)} transparent px: local / served / webp400 / meta.hasAlpha`);
for (const a of assets) {
  const local = fs.readFileSync(a.file);
  const sha = crypto.createHash("sha1").update(local).digest("hex");
  const doc = assetDocs.find((x) => x.sha1hash === sha);
  const name = a.file.split("/public/")[1];
  if (!doc) { fail(`image ${name}: stored sha1 matches no asset in the dataset`); continue; }
  const remote = Buffer.from(await (await fetch(doc.url)).arrayBuffer());
  const webp = Buffer.from(await (await fetch(`${doc.url}?fm=webp&w=400`)).arrayBuffer());
  const isSvg = a.file.endsWith(".svg");
  const lm = await sharp(local).metadata();
  const dimsLocal = `${lm.width}x${lm.height}`;
  const dimsRemote = `${doc.metadata?.dimensions?.width}x${doc.metadata?.dimensions?.height}`;
  const L = await pixels(local), R = await pixels(remote), W = await pixels(webp);
  const servedOk = L.data.equals(R.data);
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  console.log(`  ${name.padEnd(46)} ${"same".padEnd(7)} ${(servedOk ? "same" : "DIFF").padEnd(7)} ${`${dimsLocal} / ${dimsRemote}`.padEnd(22)} ${pct(L.share)} / ${pct(R.share)} / ${pct(W.share)} / ${doc.metadata?.hasAlpha}`);
  if (!servedOk) fail(`image ${name}: served pixels differ from the file${isSvg ? " (svg rasterised)" : ""}`);
  if (dimsLocal !== dimsRemote) fail(`image ${name}: dimensions differ`);
  if (a.mustHaveAlpha && (L.share === 0 || R.share === 0 || W.share === 0 || !doc.metadata?.hasAlpha)) fail(`image ${name}: alpha lost`);
  if (L.share > 0 && W.share === 0) fail(`image ${name}: webp rendition flattened`);
}

console.log(failures ? `\n${failures} FAILURE(S)` : `\nALL CHECKS PASS (${dataset})`);
process.exit(failures ? 1 : 0);
