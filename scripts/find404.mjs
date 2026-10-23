import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const bad = [];
page.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
for (const u of ["/toolbox"]) {
  await page.goto("http://localhost:3100" + u, { waitUntil: "load" });
  await page.waitForTimeout(900);
  console.log("visited", u);
}
await page.goto("http://localhost:3100", { waitUntil: "load" });
await page.waitForTimeout(2000);
console.log(bad.length ? bad.join("\n") : "no failing requests");
await b.close();
