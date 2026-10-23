import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const page = await (await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })).newPage();
await page.goto("http://localhost:3100/posts", { waitUntil: "load" });
await page.waitForTimeout(700);
await page.click(".nav__cta");
await page.waitForTimeout(400);
console.log(JSON.stringify(await page.evaluate(() => {
  const panel = document.querySelector(".modal__panel");
  const form = document.querySelector(".contact");
  const btn = document.querySelector(".contact__submit");
  const r = (e) => { const x = e.getBoundingClientRect(); return { top: Math.round(x.top), bottom: Math.round(x.bottom), h: Math.round(x.height) }; };
  const br = btn.getBoundingClientRect();
  const cx = Math.round(br.left + br.width / 2), cy = Math.round(br.top + br.height / 2);
  const atPoint = document.elementFromPoint(cx, cy);
  return {
    viewport: window.innerHeight,
    panel: r(panel), panelScrollH: panel.scrollHeight, panelClientH: panel.clientHeight,
    form: r(form), button: r(btn),
    buttonCentre: { cx, cy },
    elementAtButtonCentre: atPoint ? atPoint.className || atPoint.tagName : null,
    panelOverflowY: getComputedStyle(panel).overflowY,
  };
}, null), null, 1));
await page.screenshot({ path: "screenshots/round-b/mobile-13-modal.png" });
await b.close();
