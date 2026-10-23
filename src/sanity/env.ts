/*
 * Sanity connection settings. None of these is a secret: a project id and a
 * dataset name are public by design (they appear in every request the site
 * makes). Tokens never go here - this repository is public.
 */
export const projectId = "mi7m5luj";

/* development until the migration has passed there (plan stage 3). Override
   with NEXT_PUBLIC_SANITY_DATASET=production once it has. */
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "development";

export const apiVersion = "2026-10-01";
