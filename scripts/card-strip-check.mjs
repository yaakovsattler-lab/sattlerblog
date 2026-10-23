/* Is any card bisected by the viewport edge at a rest position? Snap the strip
 * to each snap point and compare every card's box against the viewport. */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
for (const [name, w, h] of [["mobile-375", 375, 812], ["mobile-390", 390, 844], ["tablet-768", 768, 1024]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 })).newPage();
  await page.goto("http://localhost:3100", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    const s = document.querySelector(".ls");
    window.scrollTo(0, Math.round(s.offsetTop + 0.3 * (s.offsetHeight - window.innerHeight)));
    await new Promise(r => setTimeout(r, 1200));
  });
  const out = await page.evaluate(async () => {
    const strip = document.querySelector(".ls__cards");
    const cards = () => [...document.querySelectorAll(".ls__card")];
    const rest = [];
    const snaps = cards().map(c => c.parentElement.offsetLeft);
    // in RTL the scroller's scrollLeft runs negative; drive it by scrollIntoView
    for (let i = 0; i < cards().length; i++) {
      cards()[i].parentElement.scrollIntoView({ block: "nearest", inline: "start", behavior: "instant" });
      await new Promise(r => setTimeout(r, 400));
      const vw = window.innerWidth;
      rest.push({
        snappedTo: i,
        cards: cards().map((c, j) => {
          const r = c.getBoundingClientRect();
          const left = Math.round(r.left), right = Math.round(r.right);
          const crossesLeft = left < 0 && right > 0;
          const crossesRight = left < vw && right > vw;
          return { j, left, right, bisected: crossesLeft || crossesRight };
        }),
      });
    }
    return {
      viewport: window.innerWidth,
      cardWidth: Math.round(cards()[0].getBoundingClientRect().width),
      cardHeight: Math.round(cards()[0].getBoundingClientRect().height),
      titleLines: [...document.querySelectorAll(".ls__card-title")].map(t => Math.round(t.getBoundingClientRect().height)),
      rest,
      docOverflowX: document.documentElement.scrollWidth > window.innerWidth,
      snaps,
    };
  });
  const bisectedAtRest = out.rest.flatMap(r => r.cards.filter(c => c.bisected).map(c => `snap${r.snappedTo}:card${c.j}[${c.left},${c.right}]`));
  console.log(`${name}: card ${out.cardWidth}x${out.cardHeight}, title heights ${out.titleLines.join("/")}, docOverflowX=${out.docOverflowX}`);
  console.log(`   cards crossing a viewport edge at a snap rest position: ${bisectedAtRest.length ? bisectedAtRest.join(" ") : "none"}`);
  await page.close();
}
await b.close();
