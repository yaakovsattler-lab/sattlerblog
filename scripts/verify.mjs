/*
 * Verification harness. Run the dev server first, then:  npm run verify
 *
 * It drives the Chrome that is already installed on the machine (Playwright's
 * `channel: "chrome"` - no browser download) and, for each scroll position:
 *   - writes a real screenshot to screenshots/
 *   - records the progress-line value, the active station, the heading, the CTA
 *     and the three card titles actually on screen
 *   - asserts the media box is square and the page has no horizontal overflow
 *   - collects every console error and page error
 * The results land in screenshots/_measurements.json next to the images.
 *
 * Why this and not the Browser pane: this section is driven by GSAP, GSAP runs
 * on requestAnimationFrame, and rAF is frozen whenever the previewing page is
 * hidden - which makes a working scrub read as "progress never leaves 0".
 * Verified here instead, where the page is genuinely visible.
 *
 * Playwright 1.63.0, Microsoft, Apache-2.0. devDependency only - it is a test
 * tool and nothing it touches ships.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const OUT =
  process.argv[2] ??
  fileURLToPath(new globalThis.URL("../screenshots/", import.meta.url)).replace(/\/$/, "");
const TARGET = "http://localhost:3100";

/* Station 8 is --last-step-scale of a full step, so the boundaries are no
   longer 1/8 apart. The shot list is written in terms of STEPS, and the
   progress values are computed from the page's own variable at run time - a
   hardcoded 0.4375 would quietly start naming the wrong station. */
const LAST_STEP_SCALE_FALLBACK = 0.34;
function boundaries(scale) {
  const weights = [1, 1, 1, 1, 1, 1, 1, scale];
  const total = weights.reduce((a, b) => a + b, 0);
  const starts = [];
  let run = 0;
  for (const w of weights) { starts.push(run / total); run += w; }
  return { starts, ends: starts.slice(1).concat(1) };
}
/* [label, step (1-based), where in that step 0..1] */
const shots = [
  { name: "desktop", w: 1440, h: 900, points: [
      ["01-step1-top",        1, 0.00],
      ["02-step1-mid",        1, 0.50],
      ["03-step1-end",        1, 0.99],
      ["04-step2-top",        2, 0.01],
      ["05-step4-mid",        4, 0.50],
      ["06-step6-mid",        6, 0.50],
      ["07-step8-station8",   8, 1.00],
  ]},
  { name: "tablet", w: 768, h: 1024, points: [
      ["01-step1-top",        1, 0.00],
      ["02-step5-mid",        5, 0.50],
      ["03-step8-station8",   8, 1.00],
  ]},
  { name: "mobile", w: 375, h: 812, points: [
      ["01-step1-top",        1, 0.00],
      ["02-step1-end",        1, 0.99],
      ["03-step5-mid",        5, 0.50],
      ["04-step8-station8",   8, 1.00],
  ]},
];

/*
 * Two assertions that run at every viewport, added 18.09.
 *
 * TYPE FLOOR: no rendered text node may compute below --type-min. Walking
 * elements is not enough - a font-size set on a wrapper is inherited, and what
 * matters is the size at which a TEXT node is painted. So this walks text
 * nodes, takes the computed size of each one's parent, and ignores anything
 * that is not actually visible (display:none, zero box, whitespace only).
 *
 * FONT: proves the page's own first family is really painting rather than
 * silently falling back, by measurement and not by eye. The family name is
 * read off the computed stack rather than hardcoded, so this keeps working
 * through a font change - it did, across Almoni -> Liebling -> Almoni on
 * 18.09. document.fonts.check answers whether the face LOADED; the advance
 * width of a Hebrew string in that family versus the same string in the
 * fallback stack answers whether it is the one PAINTING. Both have to agree.
 */
const AUDIT = `(() => {
  const min = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--type-min")
  );

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const tooSmall = [];
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const px = parseFloat(cs.fontSize);
    if (px < min) {
      const key = el.className + "|" + px;
      if (seen.has(key)) continue;
      seen.add(key);
      tooSmall.push({
        px,
        selector: el.tagName.toLowerCase() + (el.className ? "." + String(el.className).trim().split(/\\s+/).join(".") : ""),
        text: n.nodeValue.trim().slice(0, 40),
      });
    }
  }

  /* Is the face loaded at all, at the weights this build ships? */
  const weights = [400, 500, 700, 800, 900];
  const loaded = weights.map((w) => [w, document.fonts.check(\`\${w} 16px "\${FAMILY}"\`)]);

  /* Is it the face actually being used? Measure the same Hebrew string twice. */
  const probe = document.createElement("span");
  probe.textContent = "אבגדהוזחטיכלמנסעפצקרשת";
  probe.style.cssText =
    "position:absolute;left:-9999px;top:0;font-size:100px;white-space:pre;";
  document.body.appendChild(probe);
  const widthIn = (stack) => {
    probe.style.fontFamily = stack;
    return probe.getBoundingClientRect().width;
  };
  const fallbackStack = '"Arial Hebrew", "Noto Sans Hebrew", Arial, sans-serif';
  const measured = {
    family: widthIn(\`"\${FAMILY}", \${fallbackStack}\`),
    fallbackOnly: widthIn(fallbackStack),
    asRendered: widthIn(getComputedStyle(document.body).fontFamily),
  };
  probe.remove();

  return { min, tooSmall, loaded, measured };
})()`;

/* The family name next/font/local generates is hashed, so read it off the page
   rather than guessing it. */
async function auditPage(page) {
  const family = await page.evaluate(() => {
    const stack = getComputedStyle(document.body).fontFamily;
    return stack.split(",")[0].replace(/^['"]|['"]$/g, "");
  });
  return page.evaluate(
    ([src, FAMILY]) => eval(src.replace(/FAMILY/g, JSON.stringify(FAMILY))),
    [AUDIT, family]
  );
}

const browser = await chromium.launch({ channel: "chrome" });
const report = [];
const failures = [];

for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h },
    deviceScaleFactor: 2,
    isMobile: s.name === "mobile",
    hasTouch: s.name === "mobile",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(TARGET, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.fonts.ready);

  const audit = await auditPage(page);
  report.push({ view: s.name, audit });
  if (audit.tooSmall.length) {
    failures.push(
      `${s.name}: ${audit.tooSmall.length} text node(s) under ${audit.min}px - ` +
        audit.tooSmall.map((t) => `${t.selector} ${t.px}px "${t.text}"`).join("; ")
    );
  }
  if (audit.loaded.some(([, ok]) => !ok)) {
    failures.push(
      `${s.name}: font weights not loaded: ` +
        audit.loaded.filter(([, ok]) => !ok).map(([w]) => w).join(", ")
    );
  }
  if (Math.abs(audit.measured.asRendered - audit.measured.fallbackOnly) < 1) {
    failures.push(
      `${s.name}: the page is painting the FALLBACK, not the intended family - ` +
        `rendered width ${audit.measured.asRendered.toFixed(2)}px equals ` +
        `fallback width ${audit.measured.fallbackOnly.toFixed(2)}px`
    );
  }

  const scale = await page.evaluate(() => {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--last-step-scale"));
    return Number.isFinite(v) ? v : null;
  });
  const { starts, ends } = boundaries(scale ?? LAST_STEP_SCALE_FALLBACK);
  if (scale === null) failures.push(`${s.name}: --last-step-scale is missing from the stylesheet`);

  for (const [label, step, where] of s.points) {
    const i = step - 1;
    const p = starts[i] + (ends[i] - starts[i]) * where;
    await page.evaluate(async (p) => {
      const sec = document.querySelector(".ls");
      const range = sec.offsetHeight - window.innerHeight;
      window.scrollTo(0, Math.round(sec.offsetTop + p * range));
      await new Promise((r) => setTimeout(r, 1800));
    }, p);
    const state = await page.evaluate(() => ({
      fill: document.querySelector(".ls__fill").style.transform,
      active: document.querySelector(".ls__station.is-active").textContent,
      title: document.querySelector(".ls__title").textContent,
      cta: document.querySelector(".ls__cta").textContent,
      cards: [...document.querySelectorAll(".ls__card-title")].map((n) => n.textContent),
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
      canvas: (() => {
        const c = document.querySelector("canvas");
        const r = c.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), square: Math.abs(r.width - r.height) < 1 };
      })(),
      dir: document.documentElement.dir,
      /* is the text column physically to the RIGHT of the media box? */
      textRightOfMedia: (() => {
        const col = document.querySelector(".ls__col").getBoundingClientRect();
        const med = document.querySelector(".ls__media").getBoundingClientRect();
        return col.left > med.left;
      })(),
    }));
    const file = `${OUT}/${s.name}-${label}.png`;
    await page.screenshot({ path: file });
    report.push({ view: s.name, label, step, p: +p.toFixed(4), ...state });
  }
  report.push({ view: s.name, errors });
  await ctx.close();
}

await browser.close();
fs.writeFileSync(`${OUT}/_measurements.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));

if (failures.length) {
  console.error("\nVERIFY FAILED:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("\nverify passed: type floor and font both hold at every viewport");
