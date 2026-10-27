/*
 * Stage 3 migration: upload images, then write every document with
 * createOrReplace in one transaction. Re-runnable: asset ids are content
 * hashes and document ids are fixed, so a second run replaces, never adds.
 *
 *   node_modules/.bin/sanity exec scripts/migrate/run.ts --with-user-token -- --dataset development
 *   node_modules/.bin/sanity exec scripts/migrate/run.ts --with-user-token -- --dataset production --confirm-production
 *
 * `--dry-run` builds and prints without touching the network.
 * The token is the signed-in CLI user's, held by the CLI - never in this repo.
 */
import fs from "node:fs";
import path from "node:path";
import { getCliClient } from "sanity/cli";
import { buildAll, resolveAssets } from "./build";
import { API_VERSION, targetDataset } from "./args";

const dry = process.argv.includes("--dry-run");
const dataset = dry ? "(dry run)" : targetDataset();
const { docs, assets, gaps } = buildAll();

console.log(`dataset: ${dataset}`);
console.log(`documents built: ${docs.length}`);
const byType: Record<string, number> = {};
for (const d of docs) byType[d._type] = (byType[d._type] ?? 0) + 1;
console.log("by type:", byType);
console.log(`images to upload: ${assets.length}`);
console.log(`gaps: ${gaps.length}`);
for (const g of gaps) console.log("  - " + g);

if (dry) {
  fs.writeFileSync(path.join(process.cwd(), "scripts/migrate/.dry-run.json"), JSON.stringify(docs, null, 2));
  console.log("wrote scripts/migrate/.dry-run.json");
  process.exit(0);
}

const client = getCliClient({ apiVersion: API_VERSION }).withConfig({ dataset, useCdn: false });

const ids = new Map<string, string>();
for (const a of assets) {
  const buf = fs.readFileSync(a.file);
  const res = await client.assets.upload("image", buf, { filename: path.basename(a.file) });
  ids.set(a.key, res._id);
  console.log(`  image ${a.key} -> ${res._id}`);
}

const resolved = resolveAssets(docs, ids);
const tx = client.transaction();
for (const d of resolved) tx.createOrReplace(d);
const out = await tx.commit({ visibility: "sync" });
console.log(`committed transaction ${out.transactionId}: ${out.results.length} documents`);
