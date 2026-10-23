/* Round A evidence: Navbar, Hero and Footer at desktop and mobile, plus the
 * navbar's hide/return behaviour and one plain page. Writes into screenshots/. */
import { chromium } from "playwright";
import fs from "node:fs";
const OUT = "screenshots/round-a";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const notes = [];

for (const [name, w, h] of [["desktop", 1440, 900], ["mobile", 375, 812]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 768, hasTouch: w < 768 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("http://localhost:3100", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);

  await page.screenshot({ path: `${OUT}/${name}-01-hero-and-navbar.png` });

  /* navbar: visible at the top, hidden after scrolling down, back on scroll up */
  const visible = () => page.evaluate(() => !document.querySelector(".nav").classList.contains("is-hidden"));
  const atTop = await visible();
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(700);
  const afterDown = await visible();
  await page.screenshot({ path: `${OUT}/${name}-02-navbar-hidden-on-scroll-down.png` });
  await page.evaluate(() => window.scrollTo(0, 380));
  await page.waitForTimeout(700);
  const afterUp = await visible();
  await page.screenshot({ path: `${OUT}/${name}-03-navbar-back-on-scroll-up.png` });

  /* inside life-stages it must stay hidden even scrolling up */
  await page.evaluate(async () => {
    const ls = document.getElementById("life-stages");
    window.scrollTo(0, ls.offsetTop + 2000);
    await new Promise((r) => setTimeout(r, 600));
    window.scrollTo(0, ls.offsetTop + 1600);
    await new Promise((r) => setTimeout(r, 600));
  });
  await page.waitForTimeout(500);
  const inLifeStagesScrollingUp = await visible();

  /* footer */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}-04-footer.png` });

  /* a plain page */
  await page.goto("http://localhost:3100/terms", { waitUntil: "load" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}-05-plain-page.png` });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  notes.push({ view: name, navbar: { visibleAtTop: atTop, hiddenAfterScrollDown: !afterDown, backAfterScrollUp: afterUp, stayedHiddenInLifeStagesScrollingUp: !inLifeStagesScrollingUp }, plainPageOverflowX: overflow, errors });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/_notes.json`, JSON.stringify(notes, null, 2));
console.log(JSON.stringify(notes, null, 1));
