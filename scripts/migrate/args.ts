/*
 * The target dataset is never a default. `--dataset development` is required,
 * and production also needs `--confirm-production`, so a stray run of the
 * wrong command cannot write the live site's content.
 */
export function targetDataset(): string {
  const argv = process.argv;
  const i = argv.indexOf("--dataset");
  const dataset = i >= 0 ? argv[i + 1] : undefined;
  if (!dataset || dataset.startsWith("--")) {
    console.error("refusing: pass --dataset <name> (development or production)");
    process.exit(2);
  }
  if (dataset === "production" && !argv.includes("--confirm-production")) {
    console.error("refusing: production also needs --confirm-production");
    process.exit(2);
  }
  return dataset;
}

export const API_VERSION = "2026-10-01";
