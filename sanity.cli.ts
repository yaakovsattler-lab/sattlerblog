import { defineCliConfig } from "sanity/cli";
import { dataset, projectId } from "./src/sanity/env";

/* Lets `npx sanity schema deploy` / `npx sanity cors list` run from here. */
export default defineCliConfig({ api: { projectId, dataset } });
