"use client";

/*
 * The Studio, embedded in the site at /studio (src/app/studio/[[...tool]]).
 * Editors sign in with their own Sanity account; no token is involved.
 */
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { apiVersion, dataset, projectId } from "./src/sanity/env";
import { CREATABLE_TYPES, SINGLETON_TYPES, schemaTypes } from "./src/sanity/schemaTypes";
import { structure } from "./src/sanity/structure";

const SINGLETON_ACTIONS = new Set(["publish", "discardChanges", "restore"]);

export default defineConfig({
  name: "default",
  title: "יעקב סאטלר",
  basePath: "/studio",
  projectId,
  dataset,
  apiVersion,
  plugins: [structureTool({ structure, title: "תוכן" })],
  schema: {
    types: schemaTypes,
    /* No "create" template for singletons anywhere (they exist at fixed ids). */
    templates: (prev) => prev.filter((t) => !SINGLETON_TYPES.has(t.schemaType)),
  },
  document: {
    /* The global "+" offers only what an editor actually creates. A life stage
       can still be added from its own list under הגדרות אתר. */
    newDocumentOptions: (prev, { creationContext }) =>
      creationContext.type === "global"
        ? prev.filter((t) => CREATABLE_TYPES.has(t.templateId))
        : prev.filter((t) => !SINGLETON_TYPES.has(t.templateId)),
    /* Singletons can be edited and published, never duplicated or deleted. */
    actions: (prev, { schemaType }) =>
      SINGLETON_TYPES.has(schemaType) ? prev.filter((a) => a.action && SINGLETON_ACTIONS.has(a.action)) : prev,
  },
});
