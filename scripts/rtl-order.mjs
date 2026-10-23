/*
 * What order do the children of each row actually appear in, LEFT to RIGHT?
 * This is the raw reading used to compare the build against the frame. Each
 * frame node's own child x-coordinates give the same list for the design, so
 * the two can be compared as sequences instead of by eye.
 */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

const read = async (url, rows, prep) => {
  await page.goto("http://localhost:3100" + url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  if (prep) await prep(page);
  const out = await page.evaluate((rows) => {
    const res = {};
    for (const [name, sel, childSel] of rows) {
      const root = document.querySelector(sel);
      if (!root) { res[name] = "MISSING"; continue; }
      const kids = [...root.querySelectorAll(childSel)]
        .map((el) => ({ label: (el.getAttribute("data-kind") || el.className || el.tagName).toString().split(" ")[0], x: Math.round(el.getBoundingClientRect().left) }))
        .sort((a, b) => a.x - b.x);
      res[name] = kids.map((k) => `${k.label}@${k.x}`);
    }
    return res;
  }, rows);
  return out;
};

console.log("HOME");
console.log(JSON.stringify(await read("/", [
  ["navbar pill (481:217)", ".nav__pill", ":scope > *"],
  ["station item (601:515)", ".ls__station.is-active", ":scope > *"],
  ["hero row (5:4)", ".hero", ":scope > *"],
]), null, 1));

console.log("POST");
console.log(JSON.stringify(await read("/posts/halvaa-lelo-ribit-miluim", [
  ["post meta row (535:248)", ".post__meta", ":scope > *"],
  ["post hero (535:244)", ".post__hero", ":scope > *"],
  ["tile (535:503)", ".post__tile", ":scope > *"],
  ["newsletter form (530:465)", ".newsletter__form", ":scope > *"],
  ["checklist item (535:269)", ".post__checklist li", ":scope > *"],
  ["tip (535:278)", ".post__tip", ":scope > *"],
]), null, 1));

console.log("BLOG");
console.log(JSON.stringify(await read("/posts", [
  ["toolbar (530:381)", ".blog__toolbar", ":scope > *"],
  ["filter item (601:369)", ".blog__filter", ":scope > *"],
  ["featured (539:379)", ".blog__featured", ":scope > *"],
  ["featured footer (539:386)", ".blog__featured-footer", ":scope > *"],
  ["card bottom (536:695)", ".blog__card-bottom", ":scope > *"],
]), null, 1));

console.log("FOOTER");
console.log(JSON.stringify(await read("/", [
  ["footer inner (572:618)", ".footer__inner", ":scope > *"],
  ["footer columns", ".footer__columns", ":scope > *"],
]), null, 1));
await b.close();
