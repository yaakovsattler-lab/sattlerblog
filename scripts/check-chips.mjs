/*
 * The two-stage chips must show BOTH stages at every mobile width.
 *
 * Not an overflow check - the truncating version passed overflow perfectly
 * while silently deleting half the chip's meaning. This compares the text the
 * browser actually RENDERS against the text in the data: if the element is
 * clipped or ellipsised, scrollWidth exceeds clientWidth and the tail is not
 * on screen. A chip that wraps is fine; a chip that hides text is not.
 */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const fails = [];
for (const w of [360, 375, 390, 768, 1024, 1440]) {
  const page = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage();
  const rows = [];
  for (const [route, sel] of [["/posts", ".blog__tag"], ["/posts/gemel-lehashkaa-mul-heshbon-mishar", ".post__tag"], ["/posts/maslul-hekerut-shenigmar", ".post__tag"]]) {
    await page.goto("http://localhost:3100" + route, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    const out = await page.evaluate((sel) => {
      return [...document.querySelectorAll(sel)].map((el) => {
        const cs = getComputedStyle(el);
        return {
          text: el.textContent.trim(),
          twoStage: el.textContent.includes("·"),
          clippedX: el.scrollWidth > el.clientWidth + 1,
          clippedY: el.scrollHeight > el.clientHeight + 1,
          /* line-height computes to "normal" here, which parseFloat cannot
             read - derive the line box from the font size instead */
          lines: Math.max(1, Math.round((el.getBoundingClientRect().height - 12) / (parseFloat(cs.fontSize) * 1.3))),
          h: Math.round(el.getBoundingClientRect().height),
          w: Math.round(el.getBoundingClientRect().width),
          nowrap: cs.whiteSpace.includes("nowrap"),
          ellipsis: cs.textOverflow === "ellipsis" && cs.overflow !== "visible",
        };
      });
    }, sel);
    for (const c of out) {
      if (c.clippedX || c.clippedY) fails.push(`${w} ${route} "${c.text}": text is clipped (x:${c.clippedX} y:${c.clippedY})`);
      if (c.twoStage && c.nowrap && w < 768) fails.push(`${w} ${route} "${c.text}": two-stage chip is nowrap at a mobile width`);
    }
    const two = out.filter((c) => c.twoStage);
    if (two.length) rows.push(`${route.split("/").pop() || "index"}: ${two.map((c) => `"${c.text}" ${c.w}x${c.h} ${c.lines}ln${c.clippedX || c.clippedY ? " CLIPPED" : ""}`).join(", ")}`);
  }
  console.log(`  ${String(w).padStart(4)}  ${rows.join("  |  ") || "no two-stage chip on these routes"}`);
  await page.close();
}
await b.close();
if (fails.length) { console.error("\nCHIP TEXT LOST:\n" + fails.map((f) => "  - " + f).join("\n")); process.exit(1); }
console.log("\nevery two-stage chip renders both stages in full at every width");
