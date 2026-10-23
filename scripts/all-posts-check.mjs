/* Render every post and look for parser damage, not just "it loaded":
 * a deck that is metadata, a block whose text still carries markdown, an empty
 * block, a checklist with one item, a stray "---", overflow, console errors. */
import { chromium } from "playwright";
import fs from "node:fs";
const slugs = JSON.parse(fs.readFileSync("scripts/_slugs.json", "utf8"));
const b = await chromium.launch({ channel: "chrome" });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const rows = [];
for (const slug of slugs) {
  await page.goto("http://localhost:3100/posts/" + slug, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  rows.push(await page.evaluate((slug) => {
    const t = (s) => [...document.querySelectorAll(s)].map((n) => n.textContent.trim());
    const paras = t(".post__p"), leads = t(".post__lead-in"), heads = t(".post__h2");
    const checks = [...document.querySelectorAll(".post__checklist")].map((c) => c.querySelectorAll("li").length);
    const all = [...paras, ...leads, ...heads, ...t(".post__checklist-title"), ...t(".post__tip p")];
    return {
      slug,
      deck: (document.querySelector(".post__deck")?.textContent ?? "").slice(0, 46),
      p: paras.length, lead: leads.length, h2: heads.length,
      checklists: checks, tips: t(".post__tip p").length,
      markdownLeft: all.filter((s) => /\*\*|\[.+\]\(|^#{1,3}\s|^-{3,}$/.test(s)).slice(0, 2),
      empty: all.filter((s) => !s).length,
      oneItemChecklist: checks.filter((n) => n < 2).length,
      deckIsMeta: /זמן קריאה/.test(document.querySelector(".post__deck")?.textContent ?? ""),
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
      titleLen: (document.querySelector(".post__title")?.textContent ?? "").length,
    };
  }, slug));
}
await b.close();
const bad = rows.filter((r) => r.markdownLeft.length || r.empty || r.oneItemChecklist || r.deckIsMeta || r.overflowX || !r.titleLen);
for (const r of rows) console.log(`${r.slug.padEnd(34)} p=${String(r.p).padStart(2)} lead=${String(r.lead).padStart(2)} h2=${r.h2} lists=[${r.checklists}] tips=${r.tips} deck="${r.deck}"`);
console.log("\nconsole/page errors:", errors.length ? errors : "none");
console.log(bad.length ? "\nPROBLEMS:\n" + bad.map((r) => `  ${r.slug}: ${JSON.stringify({ md: r.markdownLeft, empty: r.empty, oneItem: r.oneItemChecklist, deckIsMeta: r.deckIsMeta, overflowX: r.overflowX })}`).join("\n") : "\nno parser damage found across all posts");
