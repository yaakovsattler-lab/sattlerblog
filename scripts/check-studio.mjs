/*
 * The Studio's editor-facing promises, checked without signing in.
 *
 *   node scripts/check-studio.mjs
 *
 * 1. The menu is exactly four Hebrew entries, in order (plan stage 4.5).
 * 2. Every schema type from CMS-INTEGRATION.md section 2 exists.
 * 3. A post's life stage is a reference to a lifeStage document, not text.
 * 4. Every field an editor sees has a Hebrew title.
 * 5. The body offers only the block styles the site renders.
 * 6. Singletons cannot be created from the "+" menu.
 * 7. Addresses made from Hebrew titles are clean.
 */
import { registerHooks } from "node:module";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

/* The Studio sources use extensionless relative imports (the bundler resolves
   them; plain node does not). */
registerHooks({
  resolve(specifier, context, next) {
    if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (fs.existsSync(fileURLToPath(url))) return next(url.href, context);
    }
    return next(specifier, context);
  },
});

const { structure } = await import("../src/sanity/structure.ts");
const { schemaTypes, CREATABLE_TYPES, SINGLETON_TYPES } = await import("../src/sanity/schemaTypes/index.ts");
const { slugify } = await import("../src/sanity/slugify.ts");

const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };
const HEB = /[֐-׿]/;

/* 1. a builder that records titles instead of building a UI */
function builder() {
  const node = (kind) => {
    const rec = { kind, title: undefined, items: [] };
    const proxy = new Proxy({}, {
      get(_, prop) {
        if (prop === "rec") return rec;
        return (...args) => {
          if (prop === "title") rec.title = args[0];
          if (prop === "items") rec.items = args[0].map((i) => i.rec);
          return proxy;
        };
      },
    });
    return proxy;
  };
  return new Proxy({}, { get: (_, prop) => () => node(prop) });
}
const root = structure(builder(), {}).rec;
const top = root.items.filter((i) => i.kind !== "divider").map((i) => i.title);
check(JSON.stringify(top) === JSON.stringify(["פוסטים", "שאלות מהוואטסאפ", "ארגז כלים", "הגדרות אתר"]), `menu is ${JSON.stringify(top)}`);

/* 2. */
const byName = Object.fromEntries(schemaTypes.map((t) => [t.name, t]));
for (const t of ["post", "lifeStage", "tool", "page", "siteSettings", "whatsappQuestion", "community"]) check(byName[t], `missing schema type ${t}`);

/* 3. */
const ls = byName.post.fields.find((f) => f.name === "lifeStages");
check(ls?.type === "array" && ls.of?.[0]?.type === "reference" && ls.of[0].to?.[0]?.type === "lifeStage", "post.lifeStages is not an array of references to lifeStage");
const wq = byName.whatsappQuestion.fields.map((f) => f.name);
check(!wq.includes("href") && wq.includes("target"), "whatsappQuestion still has a free-text href");

/* 4. */
function walk(fields, path) {
  for (const f of fields || []) {
    if (f.hidden === true) continue;
    if (!f.title || !HEB.test(f.title)) fails.push(`no Hebrew title: ${path}.${f.name}`);
    if (f.fields) walk(f.fields, `${path}.${f.name}`);
  }
}
for (const t of schemaTypes) { if (t.title && !HEB.test(t.title)) fails.push(`type ${t.name} title not Hebrew`); walk(t.fields, t.name); }

/* 5. */
const block = byName.postBody.of.find((m) => m.type === "block");
check(JSON.stringify(block.styles.map((s) => s.value)) === JSON.stringify(["normal", "lead", "h2"]), "post body styles changed");
check(block.marks.decorators.length === 0 && block.marks.annotations.length === 0 && block.lists.length === 0, "post body offers bold/links/lists the site cannot render");
check(JSON.stringify(byName.postBody.of.map((m) => m.type)) === JSON.stringify(["block", "checklist", "tip", "divider"]), "post body block set changed");

/* 6. */
for (const s of SINGLETON_TYPES) check(!CREATABLE_TYPES.has(s), `singleton ${s} is creatable`);

/* 7. */
const cases = [
  ['הפקודה שכולנו קוראים לה "סטופ לוס", ובבורסה שלנו היא בכלל לא קיימת', "הפקודה-שכולנו-קוראים-לה-סטופ-לוס-ובבורסה-שלנו-היא-בכלל-לא"],
  ["חיסכון לכל ילד: 2026?", "חיסכון-לכל-ילד-2026"],
  ["  ", ""],
];
for (const [i, want] of cases) { const got = slugify(i); check(got === want, `slugify(${JSON.stringify(i)}) = ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
check(slugify("א".repeat(10) + " " + "ב".repeat(80)).length <= 60, "slug longer than 60");

for (const f of fails) console.log("FAIL " + f);
console.log(fails.length ? `${fails.length} studio checks failed` : "studio: menu, schema, labels, body styles, singletons, slugs - all as specified");
process.exitCode = fails.length ? 1 : 0;
