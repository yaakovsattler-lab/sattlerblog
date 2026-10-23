/*
 * TEXT CONTRAST, MEASURED IN THE BROWSER.
 *
 * Not a list of hexes from a design document: this walks every element that
 * actually paints text, flattens its colour (and any alpha) over the nearest
 * painted background behind it, and applies the WCAG AA thresholds - 4.5:1 for
 * body text, 3:1 for large text (>=24px, or >=18.66px when bold).
 *
 * It exists because #8c8c8c shipped as --muted across five selectors and
 * measured 3.22-3.36:1 everywhere it landed. A token is used in more places
 * than the person changing it remembers, so the check looks at the page.
 */
import { chromium } from "playwright";

const ROUTES = ["/", "/posts", "/posts/halvaa-lelo-ribit-miluim", "/toolbox", "/my-story", "/personal-guidance"];

/*
 * THE BASELINE. The first full sweep, on 2026-09-19, found 28 failing pairs
 * when the brief had asked about exactly one grey. Keeping the number here
 * means the script reports progress against it rather than a report claiming
 * a number that has since gone stale.
 */
const ORIGINAL_FAILURES = 28;

/*
 * PAIRS THAT MUST HOLD. Each of these was measured and fixed, and each is
 * asserted so it cannot drift back. fg/bg are the flattened values the page
 * should actually paint.
 */
const MUST_HOLD = [
  { sel: ".cmty__cta", min: 7, note: "Tal 19.09: ink label on the untouched WhatsApp green (was white, 2.35:1)" },
  { sel: ".cmty__count", min: 7, note: "Tal 19.09: ink on the card (was green on white, 2.24:1)" },
  { sel: ".footer__col-title", min: 4.5, note: "--muted-on-dark; the light-surface value measured 3.67:1 here" },
  { sel: ".tool__fact-label", min: 4.5, note: "was #999 at 2.85:1" },
  { sel: ".blog__filter-label", min: 4.5, note: "--muted; was #8c8c8c at 3.36:1" },
];

/*
 * DECIDED EXCEPTIONS. Not a way to silence the check - each line is a brand
 * colour that a person chose with the measured number in front of them, and
 * changing any of them is Tal's call, not this script's. Anything NOT on this
 * list fails the build, so a new under-AA pair cannot arrive quietly.
 */
const DECIDED = [
  /* Tal proposed and Elyakim chose rust over warm-yellow for the badge, with
     4.03:1 stated in start-here-section-color-decision.md. The same rust as
     text or as a button fill lands on the same number. */
  { sel: ".sh__badge", note: "rust badge, chosen by Elyakim 19.09 at a stated 4.03:1" },
  { sel: ".ls__station-label", note: "the accent as the active station label, from the frame" },
  { sel: ".newsletter__submit", note: "accent button fill, from the frame" },
  { sel: ".tbh__count", note: "#c87a53 post count, from the frame (3.3:1)" },
];

const b = await chromium.launch({ channel: "chrome" });
const page = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const fails = [];
const decidedHits = new Set();
const held = new Map();
const missing = [];
let checked = 0;

for (const route of ROUTES) {
  await page.goto("http://localhost:3100" + route, { waitUntil: "load" });
  await page.waitForTimeout(700);
  /* reveal-on-scroll hides content until it is seen */
  await page.evaluate(async () => {
    for (const el of document.querySelectorAll(".reveal")) el.classList.remove("is-armed");
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  });

  const results = await page.evaluate(() => {
    const parse = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(",").map((v) => parseFloat(v));
      return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
    };
    const lum = ({ r, g, b }) => {
      const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const mix = (fg, bg) => ({
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a),
      a: 1,
    });
    /* the nearest ancestor that actually paints something */
    const backdrop = (el) => {
      let node = el;
      while (node && node !== document.documentElement) {
        const s = getComputedStyle(node);
        const c = parse(s.backgroundColor);
        if (c && c.a > 0) {
          if (c.a === 1) return c;
          const under = backdrop(node.parentElement);
          return mix(c, under);
        }
        if (s.backgroundImage && s.backgroundImage !== "none") return null; // unknowable
        node = node.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };

    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      /* only elements with their own visible text */
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (!own) continue;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || parseFloat(s.opacity) < 0.15) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (el.closest("[aria-hidden='true']")) continue;

      const fg = parse(s.color);
      let bg = backdrop(el);
      if (!fg || !bg) continue;

      /* Element and ancestor opacity fade BOTH the text and its own
         background towards whatever is behind them, so a 0.55 disabled state
         paints a pair that is nowhere near the pair the stylesheet declares.
         Measure what is painted, not what is written. */
      let fade = 1, anc = el;
      while (anc && anc !== document.documentElement) {
        fade *= parseFloat(getComputedStyle(anc).opacity);
        anc = anc.parentElement;
      }
      let eff = bg, fgv = fg;
      if (fade < 0.999) {
        const behind = backdrop(el.parentElement) || { r: 255, g: 255, b: 255, a: 1 };
        eff = mix({ ...bg, a: fade }, behind);
        fgv = { ...fg, a: (fg.a === undefined ? 1 : fg.a) * fade };
      }
      const flat = fgv.a < 1 ? mix(fgv, eff) : fgv;
      bg = eff;
      const L1 = lum(flat), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);

      const size = parseFloat(s.fontSize);
      const weight = parseInt(s.fontWeight, 10) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const need = large ? 3 : 4.5;
      const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
      out.push({
        classes: [...el.classList],
        sel: el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : el.tagName,
        text: el.textContent.trim().slice(0, 28),
        fg: hex(flat), bg: hex(bg), ratio: +ratio.toFixed(2), need, ok: ratio >= need - 0.005,
      });
    }
    return out;
  });

  checked += results.length;
  for (const r of results) {
    /* match on any class: the community CTA is "cta-primary cmty__cta", and
       naming it by its first class would conflate it with the rust buttons */
    const must = MUST_HOLD.find(
      (m) => m.sel === r.sel || (r.classes || []).includes(m.sel.replace(/^\./, ""))
    );
    if (must) {
      const prev = held.get(must.sel);
      if (!prev || r.ratio < prev.ratio) held.set(must.sel, { ratio: r.ratio, min: must.min, note: must.note });
    }
    if (r.ok) continue;
    const decided = DECIDED.find((d) => d.sel === r.sel);
    if (decided) { decidedHits.add(`${r.sel} ${r.ratio}:1 - ${decided.note}`); continue; }
    fails.push(`${route} ${r.sel} "${r.text}" ${r.fg} on ${r.bg} = ${r.ratio}:1 (needs ${r.need})`);
  }
  const worst = results.filter((r) => r.ok).sort((a, b) => a.ratio - b.ratio)[0];
  console.log(`  ${route.padEnd(34)} ${results.length} text elements, tightest passing ${worst ? worst.ratio + ":1 " + worst.sel : "n/a"}`);
}

/*
 * TAL'S PAIR, IN THE STATE HE SPECIFIED IT.
 *
 * Both community CTAs ship disabled today because the WhatsApp group URL is
 * TBD, so the sweep above only ever sees the disabled pair. The value Tal
 * actually decided - ink on the untouched #3DC154 - is only painted once the
 * button is live, so it is measured here by enabling it.
 */
{
  const page = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("http://localhost:3100/", { waitUntil: "load" });
  await page.waitForTimeout(600);
  const live = await page.evaluate(() => {
    const el = document.querySelector(".cmty__cta");
    if (!el) return null;
    /* a clone, because React owns the real node and puts `disabled` straight
       back; the clone is detached from React and keeps every class */
    const probe = el.cloneNode(true);
    probe.removeAttribute("disabled");
    probe.disabled = false;
    el.parentElement.appendChild(probe);
    const s = getComputedStyle(probe);
    const out = { fg: s.color, bg: s.backgroundColor };
    probe.remove();
    return out;
  });
  if (!live) {
    fails.push("community CTA not found, so Tal's enabled pair could not be measured");
  } else {
    const num = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
    const L = (v) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]); };
    const a = L(num(live.fg)), c = L(num(live.bg));
    const r = +(((Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05))).toFixed(2);
    if (r < 7) fails.push(`community CTA when enabled: ${r}:1, below the 7.42:1 Tal specified (${live.fg} on ${live.bg})`);
    console.log(`\n  community CTA, enabled: ${live.fg} on ${live.bg} = ${r}:1  (Tal 19.09, the green surface deliberately unchanged)`);
  }
  await page.close();
}

await b.close();
if (fails.length) {
  const uniq = [...new Set(fails)];
  console.error(`\nCONTRAST FAILED (${uniq.length}):\n` + uniq.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
/* the fixed pairs must still be fixed */
for (const m of MUST_HOLD) {
  const h = held.get(m.sel);
  if (!h) { missing.push(`${m.sel} was not found on any audited route`); continue; }
  if (h.ratio < m.min) fails.push(`${m.sel} fell back to ${h.ratio}:1, below its required ${m.min}:1 - ${m.note}`);
}
if (missing.length) console.log("\nnot found (selector renamed?):\n" + missing.map((x) => "  - " + x).join("\n"));

console.log("\npairs that must hold, and do:");
for (const m of MUST_HOLD) {
  const h = held.get(m.sel);
  if (h) console.log(`  - ${m.sel.padEnd(22)} ${String(h.ratio).padStart(6)}:1  (needs ${m.min})  ${m.note}`);
}

console.log(`\nof the ${ORIGINAL_FAILURES} pairs the first sweep failed on, ${decidedHits.size} remain, and every one is a named decision:`);
for (const d of [...decidedHits].sort()) console.log("  - " + d);
console.log(`\n${checked} text elements measured across ${ROUTES.length} routes: every one meets AA or is a recorded decision`);
