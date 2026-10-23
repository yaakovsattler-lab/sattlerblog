/* Which family is actually painting, measured. Reads the computed stack, asks
 * document.fonts for every loaded face, and compares the advance width of a
 * Hebrew string in the rendered stack against each candidate on its own. */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto("http://localhost:3100", { waitUntil: "load" });
await page.waitForTimeout(2000);
await page.evaluate(() => document.fonts.ready);
console.log(JSON.stringify(await page.evaluate(() => {
  const stack = getComputedStyle(document.body).fontFamily;
  const faces = [...document.fonts].map(f => `${f.family} ${f.weight}`);
  const probe = document.createElement("span");
  probe.textContent = "אבגדהוזחטיכלמנסעפצקרשת";
  probe.style.cssText = "position:absolute;left:-9999px;font-size:100px;white-space:pre";
  document.body.appendChild(probe);
  const w = (ff) => { probe.style.fontFamily = ff; return +probe.getBoundingClientRect().width.toFixed(2); };
  const names = stack.split(",").map(s => s.trim());
  const out = { stack, faces: [...new Set(faces)], rendered: w(stack), candidates: {} };
  for (const n of names) out.candidates[n] = w(`${n}, monospace`);
  out.systemOnly = w('"Arial Hebrew", Arial, sans-serif');
  probe.remove();
  return out;
}), null, 1));
await b.close();
