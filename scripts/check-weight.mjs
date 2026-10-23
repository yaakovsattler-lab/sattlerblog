/*
 * What the browser ACTUALLY downloads per page, measured over the network -
 * which format it chose, how many bytes, and whether anything still shifts
 * while images load. Run against the production build, not dev, because dev
 * serves unminified bundles and would flatter or slander the number.
 */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const rows = [];
for (const [name, w, h, route] of [
  ["home desktop", 1440, 900, "/"],
  ["home phone", 375, 812, "/"],
  ["post desktop", 1440, 900, "/posts/keren-kaspit-mas"],
  ["post phone", 375, 812, "/posts/keren-kaspit-mas"],
  ["blog phone", 375, 812, "/posts"],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: false });
  const page = await ctx.newPage();
  const seen = [];
  page.on("response", async (r) => {
    const t = r.request().resourceType();
    if (t !== "image") return;
    try { seen.push({ url: r.url().split("/").pop(), bytes: (await r.body()).length, type: r.headers()["content-type"] }); } catch {}
  });
  let shift = 0;
  await page.goto("http://localhost:3100" + route, { waitUntil: "load" });
  await page.evaluate(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; })
      .observe({ type: "layout-shift", buffered: true });
  });
  await page.waitForTimeout(2500);
  shift = await page.evaluate(() => window.__cls ?? 0);
  const total = seen.reduce((a, x) => a + x.bytes, 0);
  const byType = {};
  for (const s of seen) byType[s.type] = (byType[s.type] || 0) + s.bytes;
  rows.push({ name, route, files: seen.length, kB: Math.round(total / 1024), byType, cls: +shift.toFixed(4) });
  console.log(`  ${name.padEnd(14)} ${String(seen.length).padStart(2)} images  ${String(Math.round(total / 1024)).padStart(4)} kB  CLS ${shift.toFixed(4)}  ${Object.entries(byType).map(([t, v]) => `${t.replace("image/", "")} ${Math.round(v / 1024)}kB`).join(" · ")}`);
  await ctx.close();
}
await b.close();
const heaviest = rows.reduce((a, r) => (r.kB > a.kB ? r : a));
console.log(`\n  heaviest page: ${heaviest.name} at ${heaviest.kB} kB of imagery`);
console.log(`  on a 1.6 Mbps phone connection that is about ${(heaviest.kB * 8 / 1600).toFixed(1)}s of image download`);
const bad = rows.filter((r) => r.cls > 0.1);
if (bad.length) { console.error("\nLAYOUT SHIFT:\n" + bad.map((r) => `  - ${r.name}: CLS ${r.cls}`).join("\n")); process.exit(1); }
console.log("\nno page shifts while its images load (CLS under 0.1 everywhere)");
