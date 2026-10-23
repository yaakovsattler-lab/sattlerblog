/*
 * CHARACTERS PER RENDERED LINE, counted from the real text.
 *
 * Not an em conversion and not a synthetic probe string: this walks the actual
 * paragraphs with a Range, groups characters by the top of their client rect -
 * which is exactly where the browser broke the line - and counts them. Hebrew
 * has no ascenders or descenders and its average glyph width differs from
 * Latin, so anything derived from a ch unit or a 65ch rule of thumb is a guess.
 *
 * Full lines only: the last line of a paragraph is short by definition and
 * would drag the median down.
 */
import { chromium } from "playwright";

const WIDTHS = process.argv.slice(2).map(Number);
const b = await chromium.launch({ channel: "chrome" });

for (const w of (WIDTHS.length ? WIDTHS : [1440, 1280, 390, 375])) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 } });
  await p.goto("http://localhost:3100/posts/halvaa-lelo-ribit-miluim", { waitUntil: "load" });
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const lines = [];
    for (const el of document.querySelectorAll(".post__p")) {
      const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim().length > 40);
      if (!node) continue;
      const text = node.textContent;
      const range = document.createRange();
      const byTop = new Map();
      for (let i = 0; i < text.length; i++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const rect = range.getBoundingClientRect();
        if (!rect.height) continue;
        const key = Math.round(rect.top);
        byTop.set(key, (byTop.get(key) || 0) + 1);
      }
      const counts = [...byTop.values()];
      counts.pop();                      // the last line is short by definition
      lines.push(...counts);
    }
    lines.sort((a, b) => a - b);
    const col = document.querySelector(".post__column");
    const cs = getComputedStyle(document.querySelector(".post__p"));
    return {
      lines: lines.length,
      median: lines.length ? lines[Math.floor(lines.length / 2)] : null,
      min: lines[0] ?? null,
      max: lines[lines.length - 1] ?? null,
      colWidth: col ? Math.round(col.getBoundingClientRect().width) : null,
      fontSize: cs.fontSize,
    };
  });
  console.log(
    `${String(w).padStart(5)}  col=${String(r.colWidth).padStart(4)}px  body=${r.fontSize}  ` +
    `chars/line median=${r.median}  (range ${r.min}-${r.max}, ${r.lines} full lines)`
  );
  await p.close();
}
await b.close();
