/*
 * Visual baseline: capture every route, then prove a later build did not move
 * a pixel.
 *
 *   node scripts/baseline.mjs capture <dir>            screenshots + HTML into <dir>
 *   node scripts/baseline.mjs diff <baseline> <dir>    compare two captures
 *   node scripts/baseline.mjs check <baseline>         capture to <baseline>-check, then diff
 *
 * The server must already be running (default http://localhost:3100, or
 * BASE=...). Use a production build (`npm run build && npm start`) on both
 * sides - dev mode injects its own markup.
 *
 * What is captured, per route and per width (390 / 768 / 1440):
 *   <route>@<w>.png       full-page screenshot
 *   <route>.ssr.html      the HTML the server sent (once per route)
 *   <route>@<w>.dom.html  the body after hydration, scripts removed
 *
 * Deterministic on purpose: reducedMotion is "reduce", which the site honours
 * everywhere (Reveal shows at once, GSAP sections render their static state).
 * A pixel diff of an animated page flips between runs; this one should not.
 * The page is scrolled to the bottom and back first, so lazy images load.
 *
 * Post routes are discovered from /posts, not from the content source, so the
 * same script works whether posts come from Markdown or from Sanity.
 *
 * The output is large (screenshots), so it lives OUTSIDE the repo.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE || "http://localhost:3100";
const WIDTHS = [390, 768, 1440];
const STATIC_ROUTES = [
  "/", "/posts", "/life-stages", "/my-story", "/toolbox", "/personal-guidance",
  "/community", "/contact", "/terms", "/privacy", "/disclosure",
];
const NOT_FOUND = "/this-page-does-not-exist";
/* GPU rasterisation resamples images slightly differently run to run (measured:
   122 px, max channel delta 28, inside one post illustration). Software raster
   and a fixed colour profile make two captures of one build byte-identical. */
const LAUNCH = { channel: "chrome", args: ["--disable-gpu", "--disable-gpu-rasterization", "--force-color-profile=srgb", "--font-render-hinting=none"] };

const fileKey = (r) => (r === "/" ? "home" : r.slice(1).replace(/\//g, "__"));

/* Strip what legitimately changes between two builds of the same source:
   hashed asset paths, the build id, and the RSC payload scripts. */
function normaliseHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
    /* stylesheets are compared by CONTENT (<route>.css), not by how many files
       the bundler split them into */
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*\/?>/g, "")
    /* React useId values encode the component tree's shape, so a new wrapper
       layout renumbers every form field id without changing anything visible */
    .replace(/_R_[A-Za-z0-9]+_/g, "_R_*_")
    /* an empty Suspense boundary renders nothing; where its marker sits is not
       observable */
    .replace(/<!--\$--><!--\/\$-->/g, "")
    .replace(/<link\b[^>]*(?:rel="preload"|rel="modulepreload"|as="script")[^>]*\/?>/g, "")
    .replace(/\/_next\/static\/[^"' )]+/g, "/_next/static/*")
    .replace(/"buildId":"[^"]*"/g, '"buildId":"*"')
    .replace(/__variable_[0-9a-f]+/g, "__variable_*")
    .replace(/__className_[0-9a-f]+/g, "__className_*")
    .replace(/<([a-zA-Z][\w-]*)(\s[^<>]*?)?(\/?)>/g, (_, tag, attrs = "", close) => `<${tag}${canonAttrs(attrs)}${close}>`);
}

/* A component that re-renders after hydration can re-emit the same style as
   `--x: 1px;` instead of `--x:1px`, in a different attribute order. Measured:
   that was the only difference between two captures of an unchanged build. */
function canonAttrs(attrs) {
  const out = [];
  for (const m of attrs.matchAll(/([^\s=]+)(?:="([^"]*)")?/g)) {
    let [, name, value] = m;
    if (name === "style" && value !== undefined) value = value.replace(/\s*([:;])\s*/g, "$1").replace(/;$/, "");
    out.push(value === undefined ? name : `${name}="${value}"`);
  }
  return out.length ? " " + out.sort().join(" ") : "";
}

/* The blog index renders its list on the client (it reads ?stage=), so the
   server HTML has no post links. Read them from the hydrated page. */
async function discoverRoutes(browser) {
  const page = await browser.newPage();
  const res = await page.goto(BASE + "/posts", { waitUntil: "load" });
  if (!res || !res.ok()) throw new Error(`GET /posts -> ${res && res.status()}`);
  await page.waitForSelector('a[href^="/posts/"]', { timeout: 10000 }).catch(() => {});
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href^="/posts/"]')].map((a) => a.getAttribute("href")));
  await page.close();
  const slugs = [...new Set(hrefs.map((h) => decodeURIComponent(h.slice("/posts/".length))).filter((s) => s && !s.includes("/")))];
  if (!slugs.length) throw new Error("no post links found on /posts - refusing to capture a site with zero posts");
  return [...STATIC_ROUTES, ...slugs.sort().map((s) => "/posts/" + s), NOT_FOUND];
}

async function capture(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch(LAUNCH);
  const routes = await discoverRoutes(b);
  for (const r of routes) {
    const key = fileKey(r);
    const res = await fetch(BASE + r);
    const raw = await res.text();
    fs.writeFileSync(path.join(dir, `${key}.ssr.html`), normaliseHtml(raw));
    /* every stylesheet the page links, in document order, concatenated */
    let css = "";
    for (const m of raw.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)) {
      const href = (m[0].match(/href="([^"]+)"/) || [])[1];
      if (href) css += await (await fetch(new URL(href, BASE))).text();
    }
    fs.writeFileSync(path.join(dir, `${key}.css`), css.replace(/\/_next\/static\/media\/[^)"' ]+/g, "/_next/static/media/*"));
    for (const w of WIDTHS) {
      const ctx = await b.newContext({
        viewport: { width: w, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        isMobile: w < 768,
        hasTouch: w < 768,
      });
      const page = await ctx.newPage();
      await page.goto(BASE + r, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(async () => {
        const step = Math.max(200, window.innerHeight * 0.8);
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
        await Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
      });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(dir, `${key}@${w}.png`), fullPage: true, animations: "disabled", caret: "hide" });
      const dom = await page.evaluate(() => {
        const c = document.body.cloneNode(true);
        c.querySelectorAll("script, next-route-announcer, nextjs-portal").forEach((n) => n.remove());
        return c.outerHTML;
      });
      fs.writeFileSync(path.join(dir, `${key}@${w}.dom.html`), normaliseHtml(dom));
      await ctx.close();
    }
    process.stdout.write(`captured ${r}\n`);
  }
  await b.close();
  fs.writeFileSync(path.join(dir, "_routes.json"), JSON.stringify({ base: BASE, widths: WIDTHS, routes, at: new Date().toISOString() }, null, 2));
  console.log(`${routes.length} routes x ${WIDTHS.length} widths -> ${dir}`);
}

/* Pixel diff in the browser itself, so the script needs nothing beyond
   Playwright. Returns the number of differing pixels and the size match. */
async function pixelDiff(page, a, b) {
  const da = "data:image/png;base64," + fs.readFileSync(a).toString("base64");
  const db = "data:image/png;base64," + fs.readFileSync(b).toString("base64");
  return page.evaluate(async ([da, db]) => {
    const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(da), load(db)]);
    if (ia.width !== ib.width || ia.height !== ib.height) {
      return { sizeA: [ia.width, ia.height], sizeB: [ib.width, ib.height], diff: -1 };
    }
    const px = (i) => { const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext("2d"); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
    const pa = px(ia), pb = px(ib);
    let diff = 0;
    for (let k = 0; k < pa.length; k += 4) {
      if (pa[k] !== pb[k] || pa[k + 1] !== pb[k + 1] || pa[k + 2] !== pb[k + 2] || pa[k + 3] !== pb[k + 3]) diff++;
    }
    return { sizeA: [ia.width, ia.height], sizeB: [ib.width, ib.height], diff };
  }, [da, db]);
}

async function diff(baseDir, newDir) {
  const { routes, widths } = JSON.parse(fs.readFileSync(path.join(baseDir, "_routes.json"), "utf8"));
  const newRoutes = JSON.parse(fs.readFileSync(path.join(newDir, "_routes.json"), "utf8")).routes;
  const fails = [];
  const missing = routes.filter((r) => !newRoutes.includes(r));
  const extra = newRoutes.filter((r) => !routes.includes(r));
  if (missing.length || extra.length) fails.push(`route set changed: missing ${JSON.stringify(missing)} extra ${JSON.stringify(extra)}`);

  const b = await chromium.launch(LAUNCH);
  const page = await b.newPage();
  let checks = 0;
  for (const r of routes.filter((x) => newRoutes.includes(x))) {
    const key = fileKey(r);
    const ssrA = fs.readFileSync(path.join(baseDir, `${key}.ssr.html`), "utf8");
    const ssrB = fs.readFileSync(path.join(newDir, `${key}.ssr.html`), "utf8");
    checks++;
    if (ssrA !== ssrB) fails.push(`${r} server HTML differs`);
    checks++;
    if (fs.readFileSync(path.join(baseDir, `${key}.css`), "utf8") !== fs.readFileSync(path.join(newDir, `${key}.css`), "utf8")) fails.push(`${r} CSS differs`);
    for (const w of widths) {
      const domA = fs.readFileSync(path.join(baseDir, `${key}@${w}.dom.html`), "utf8");
      const domB = fs.readFileSync(path.join(newDir, `${key}@${w}.dom.html`), "utf8");
      checks++;
      if (domA !== domB) fails.push(`${r} @${w} hydrated DOM differs`);
      const d = await pixelDiff(page, path.join(baseDir, `${key}@${w}.png`), path.join(newDir, `${key}@${w}.png`));
      checks++;
      if (d.diff !== 0) fails.push(`${r} @${w} pixels: ${d.diff === -1 ? `size ${d.sizeA} vs ${d.sizeB}` : `${d.diff} px differ`}`);
    }
  }
  await b.close();
  for (const f of fails) console.log("FAIL " + f);
  console.log(fails.length ? `${fails.length} of ${checks} checks differ` : `zero change: ${checks} checks (${routes.length} routes x ${widths.length} widths, pixels + DOM + server HTML + CSS)`);
  process.exitCode = fails.length ? 1 : 0;
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === "capture" && a) await capture(path.resolve(a));
else if (cmd === "diff" && a && b) await diff(path.resolve(a), path.resolve(b));
else if (cmd === "check" && a) { const out = path.resolve(a) + "-check"; fs.rmSync(out, { recursive: true, force: true }); await capture(out); await diff(path.resolve(a), out); }
else { console.log("usage: node scripts/baseline.mjs capture <dir> | diff <baseline> <dir> | check <baseline>"); process.exitCode = 2; }
