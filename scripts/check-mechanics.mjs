/* The three mechanics from 18.09, each asserted rather than eyeballed:
 * 1 the navbar underline follows the real route, on a DIRECT load of each
 * 2 the footer credit is an external link and its Latin run is not reordered
 * 3 the contact modal traps focus, restores it, closes three ways, locks the
 *   page behind it, validates, and never claims success
 */
import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome" });
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); return cond; };

/* ---- 1. active state, direct loads ---- */
const expect = [
  ["/", "מה קורה אצלכם"],
  ["/posts", "כל הפוסטים"],
  ["/posts/halvaa-lelo-ribit-miluim", "כל הפוסטים"],
  ["/toolbox", "ארגז כלים"],
  ["/my-story", "הסיפור שלי"],
  ["/terms", null],
];
{
  const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  for (const [route, want] of expect) {
    await page.goto("http://localhost:3100" + route, { waitUntil: "load" });
    await page.waitForTimeout(300);
    const got = await page.evaluate(() => {
      const el = document.querySelector(".nav__link.is-current");
      return el ? { text: el.textContent.trim(), ariaCurrent: el.getAttribute("aria-current") } : null;
    });
    const label = got?.text ?? null;
    ok(label === want, `active state on ${route}: expected ${want ?? "none"}, got ${label ?? "none"}`);
    if (want) ok(got?.ariaCurrent === "page", `aria-current missing on ${route}`);
    console.log(`  ${route.padEnd(34)} underline=${label ?? "-"}`);
  }
  /* back button must land right too */
  await page.goto("http://localhost:3100/posts", { waitUntil: "load" });
  await page.goto("http://localhost:3100/toolbox", { waitUntil: "load" });
  await page.goBack({ waitUntil: "load" });
  await page.waitForTimeout(400);
  const afterBack = await page.evaluate(() => document.querySelector(".nav__link.is-current")?.textContent.trim() ?? null);
  ok(afterBack === "כל הפוסטים", `after back button: expected כל הפוסטים, got ${afterBack}`);
  console.log(`  after back button                  underline=${afterBack}`);
  await page.close();
}

/* ---- 2. footer credit ---- */
{
  const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto("http://localhost:3100/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const credit = await page.evaluate(() => {
    const a = document.querySelector(".footer__credit-link");
    const p = document.querySelector(".footer__credit");
    const bdi = a?.querySelector("bdi");
    const pr = p.getBoundingClientRect(), ar = a.getBoundingClientRect();
    return {
      href: a?.getAttribute("href"), target: a?.getAttribute("target"), rel: a?.getAttribute("rel"),
      hasBdi: !!bdi, latin: bdi?.textContent,
      fullLine: p.textContent.replace(/\s+/g, " ").trim(),
      /* in an RTL line the Latin run must sit at the LEFT end of the sentence */
      linkIsLeftOfText: ar.left - pr.left < pr.width / 2,
      /* and it must be one unbroken box, not split across two */
      clientRects: a.getClientRects().length,
    };
  });
  console.log("  credit:", JSON.stringify(credit));
  /* Byte for byte. A stray Hebrew diacritic or an RTL mark pasted onto the end
     of a URL is invisible in every editor and in the rendered link, and it
     would 404 silently, so the check is on code points and not on appearance. */
  const EXPECTED_HREF = "https://www.elyagol.com/home-he";
  const codes = (x) => [...x].map((c) => c.codePointAt(0).toString(16)).join(" ");
  ok(credit.href === EXPECTED_HREF,
    `credit href is not byte-exact.\n      expected ${EXPECTED_HREF}\n      got      ${credit.href}\n      expected codepoints ${codes(EXPECTED_HREF)}\n      got      codepoints ${codes(credit.href || "")}`);
  ok(!/[^\x21-\x7e]/.test(credit.href || ""),
    `credit href contains a non-ASCII character: ${codes(credit.href || "")}`);
  ok(credit.target === "_blank", "credit target wrong");
  ok(credit.rel === "noopener noreferrer", "credit rel wrong");
  ok(credit.hasBdi && credit.latin === "Elyagol studio", "credit not bidi-isolated");
  ok(credit.clientRects === 1, "the Latin run is split across lines/boxes");
  ok(/עוצב ונבנה ע״י Elyagol studio/.test(credit.fullLine), `credit line reads: ${credit.fullLine}`);
  await page.close();
}

/* ---- 3. the modal ---- */
/*
 * The phone case runs at phone WIDTH but without Playwright's `isMobile`
 * emulation, and that is deliberate. Measured on this machine at 375x812:
 *
 *   isMobile=true  -> innerHeight 1020, clientHeight 812, visualViewport 812,
 *                     100vh 812, 100dvh 812
 *   isMobile=false -> all five agree at 812
 *
 * So under `isMobile` the window reports a height nothing else agrees with,
 * fixed-position boxes are laid out against it, and Playwright then clicks
 * against the real 812 - which makes a perfectly reachable button look
 * unreachable. That is an instrument fault, not the product, and testing
 * through it would have had me "fixing" a bug that does not exist.
 * The cost: touch behaviour and the real address-bar vh case stay UNVERIFIED
 * and are reported as such rather than silently assumed.
 */
for (const [name, w, h] of [["desktop", 1440, 900], ["phone-width", 375, 812]]) {
  const page = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await page.goto("http://localhost:3100/posts", { waitUntil: "load" });
  await page.waitForTimeout(500);

  /* Park the page part-way down so the scroll-lock assertion is meaningful,
     then scroll UP a little so the navbar comes back - it hides on scroll
     down by design, and a hidden bar is genuinely unclickable. That is the
     product working, not a defect: the CTA returns the moment you scroll up. */
  await page.evaluate(async () => {
    window.scrollTo(0, 700);
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo(0, 420);
    await new Promise((r) => setTimeout(r, 600));
  });
  const scrollBeforeOpen = await page.evaluate(() => window.scrollY);
  await page.click(".nav__cta");
  await page.waitForTimeout(300);
  ok(await page.locator('[role="dialog"]').isVisible(), `${name}: dialog did not open`);
  const labelled = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    const id = d.getAttribute("aria-labelledby");
    return { modal: d.getAttribute("aria-modal"), labelText: document.getElementById(id)?.textContent };
  });
  ok(labelled.modal === "true" && labelled.labelText === "צרו קשר", `${name}: dialog not labelled`);

  /* the page behind must not scroll */
  const locked = await page.evaluate(async () => {
    const before = window.scrollY;
    window.scrollBy(0, 300);
    await new Promise((r) => setTimeout(r, 200));
    return {
      before, after: window.scrollY,
      overflow: getComputedStyle(document.body).overflow,
      position: getComputedStyle(document.body).position,
    };
  });
  ok(locked.after === locked.before, `${name}: page scrolled behind the modal (${locked.before} -> ${locked.after})`);
  ok(locked.position === "fixed", `${name}: the document is not pinned behind the modal`);

  /* focus starts inside and Tab stays inside */
  const trapped = await page.evaluate(async () => {
    const d = document.querySelector('[role="dialog"]');
    const inside = () => d.contains(document.activeElement);
    const start = inside();
    return { start, inside };
  });
  ok(trapped.start, `${name}: focus did not start inside the dialog`);
  let stayedInside = true;
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    if (!(await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)))) stayedInside = false;
  }
  ok(stayedInside, `${name}: Tab escaped the dialog`);
  for (let i = 0; i < 6; i++) await page.keyboard.press("Shift+Tab");
  ok(await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)), `${name}: Shift+Tab escaped the dialog`);

  /* validation: submitting empty must not claim success */
  await page.click(".contact__submit");
  await page.waitForTimeout(300);
  const errs = await page.evaluate(() => [...document.querySelectorAll(".contact__error")].map((n) => n.textContent));
  ok(errs.length >= 3, `${name}: empty submit produced ${errs.length} errors`);
  ok(!(await page.locator(".contact__summary.is-shown").count()), `${name}: a summary showed on an invalid submit`);

  /* a VALID submit must land on "not connected", never on success */
  await page.fill('input[name="name"]', "בדיקה");
  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('textarea[name="message"]', "הודעת בדיקה ארוכה מספיק");
  await page.click(".contact__submit");
  await page.waitForTimeout(400);
  const summary = await page.evaluate(() => document.querySelector(".contact__summary")?.textContent?.trim() ?? "");
  /* the send path throws, so a VALID submission must land on Goldi's error
     copy - and must never show her success copy, which is unreachable by
     construction until sendContactMessage() can resolve */
  ok(/משהו נתקע/.test(summary), `${name}: valid submit summary = "${summary}"`);
  ok(!/ההודעה הגיעה/.test(summary), `${name}: the form claimed success on a message that went nowhere`);
  console.log(`  ${name} valid-submit state: ${summary.slice(0, 70)}`);

  /* Escape closes and focus returns to the trigger */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  ok(!(await page.locator('[role="dialog"]').count()), `${name}: Escape did not close`);
  ok(await page.evaluate(() => document.activeElement?.classList.contains("nav__cta")), `${name}: focus did not return to the trigger`);
  ok(await page.evaluate(() => getComputedStyle(document.body).position !== "fixed"), `${name}: scroll lock survived close`);
  const restored = await page.evaluate(() => window.scrollY);
  /* compare against the position BEFORE opening - once the document is pinned,
     window.scrollY reads 0, so locked.before is not the reader's position */
  ok(Math.abs(restored - scrollBeforeOpen) < 3, `${name}: scroll position not restored on close (${scrollBeforeOpen} -> ${restored})`);

  /* the backdrop closes too. Back to the top first: the bar hides on scroll
     down, so after the previous steps it is legitimately off screen. */
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 600));
  });
  await page.click(".nav__cta");
  await page.waitForTimeout(250);
  await page.mouse.click(6, 6);
  await page.waitForTimeout(250);
  ok(!(await page.locator('[role="dialog"]').count()), `${name}: backdrop click did not close`);
  await page.close();
}

/* ---------------------------------------------------------------------------
   4. THE LIFE-STAGE FILTER ICON, BOTH STATES (601:489 inactive, 601:419 active)

   The frame ships TWO assets for the helmet: a black line-art glyph with one
   orange accent (inactive) and an all-orange glyph (active). The build once
   shipped the active artwork as the inactive one, so both states looked the
   same and the row had no readable selection. Asserted by decoding the SVG's
   own fills, not by eyeballing the chip.
--------------------------------------------------------------------------- */
{
  const page = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("http://localhost:3100/posts", { waitUntil: "load" });
  await page.waitForTimeout(600);

  const chip = page.locator(".blog__filter", { hasText: "במילואים" }).first();

  /* inactive: the artwork paints itself, so the icon has a background IMAGE
     and no mask, and the label is the muted grey */
  const off = await chip.locator(".blog__filter-icon").evaluate((el) => {
    const s = getComputedStyle(el);
    return { img: s.backgroundImage, mask: s.webkitMaskImage || s.maskImage || "none" };
  });
  ok(off.img.includes("reserve-duty.svg"), "filter icon inactive: artwork is not painted as a background image");
  ok(off.mask === "none", "filter icon inactive: a mask is applied, so the glyph is flattened to one colour");

  /* and the artwork itself must be the black-dominant variant */
  const svg = await page.evaluate(async () => {
    const r = await fetch("/brand/filters/reserve-duty.svg");
    return r.text();
  });
  const fills = [...svg.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase());
  const dark = fills.filter((f) => parseInt(f.slice(1, 3), 16) < 0x60).length;
  const warm = fills.filter((f) => parseInt(f.slice(1, 3), 16) >= 0x60).length;
  ok(dark >= warm, `filter icon inactive: artwork is not the black-dominant variant (dark ${dark}, warm ${warm}) - the ACTIVE asset was probably exported by mistake`);

  /* active: the whole glyph becomes the accent, via a mask */
  await chip.click();
  await page.waitForTimeout(300);
  const on = await chip.locator(".blog__filter-icon").evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, mask: s.webkitMaskImage || s.maskImage || "none" };
  });
  ok(on.mask.includes("reserve-duty.svg"), "filter icon active: the glyph is not masked to a single colour");
  ok(on.bg === "rgb(217, 83, 30)", `filter icon active: expected the terracotta accent, got ${on.bg}`);
  console.log(`  filter icon: inactive paints ${dark} dark / ${warm} warm fills, active masks to ${on.bg}`);
  await page.close();
}

/* ---------------------------------------------------------------------------
   6. THE WHATSAPP GROUP LINK (Elyakim, 19.09)

   Both community CTAs point at the group. The URL is defined once in site.ts
   and carries a query string, so it is asserted byte for byte with the same
   non-ASCII guard as the footer credit: an RTL mark or a Hebrew diacritic
   pasted onto the end of a URL is invisible in every editor and in the
   rendered link, and it would 404 silently on the one link this whole block
   exists to get people to click. Also asserts both are REAL links now, not the
   disabled buttons they shipped as while the URL was TBD.
--------------------------------------------------------------------------- */
{
  const EXPECTED_GROUP = "https://chat.whatsapp.com/CzdYNqGwM0M9foD2kKB7g5?mode=gi_t";
  const codes2 = (x) => [...x].map((c) => c.codePointAt(0).toString(16)).join(" ");
  const page = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("http://localhost:3100/", { waitUntil: "load" });
  await page.waitForTimeout(600);

  for (const sel of [".cmty__cta", ".waq__cta"]) {
    const link = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      return {
        tag: el.tagName,
        href: el.getAttribute("href"),
        target: el.getAttribute("target"),
        rel: el.getAttribute("rel"),
        disabled: el.hasAttribute("disabled"),
        label: el.textContent.trim().slice(0, 30),
      };
    }, sel);

    ok(link, `${sel}: not found`);
    if (!link) continue;
    ok(link.tag === "A", `${sel} is a <${link.tag}>, not a link - the disabled state should be gone now the URL is in`);
    ok(!link.disabled, `${sel} is still disabled`);
    ok(link.href === EXPECTED_GROUP,
      `${sel} href is not byte-exact.\n      expected ${EXPECTED_GROUP}\n      got      ${link.href}\n      expected codepoints ${codes2(EXPECTED_GROUP)}\n      got      codepoints ${codes2(link.href || "")}`);
    ok(!/[^\x21-\x7e]/.test(link.href || ""),
      `${sel} href contains a non-ASCII character: ${codes2(link.href || "")}`);
    ok(link.href.endsWith("?mode=gi_t"), `${sel} lost the ?mode=gi_t query: ${link.href}`);
    ok(link.target === "_blank", `${sel} target is ${link.target}, expected _blank`);
    ok(link.rel === "noopener noreferrer", `${sel} rel is ${link.rel}`);
    console.log(`  group link ${sel.padEnd(12)} <a> byte-exact, _blank, noopener noreferrer  "${link.label}"`);
  }
  await page.close();
}

/* ---------------------------------------------------------------------------
   5. THE NAVBAR GROUP (Elyakim, 19.09)

   "צרו קשר" and the menu button are ONE group at the left end, and the
   wordmark holds the right end. Before this they were separated by the pill's
   space-between, which parked the CTA in the middle of the bar. Asserted
   geometrically, at the widths where both controls show and at the widths
   where the links are still visible, so the arrangement cannot drift back.
--------------------------------------------------------------------------- */
{
  const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
  for (const width of [1440, 1200, 1023, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://localhost:3100/", { waitUntil: "load" });
    await page.waitForTimeout(400);

    const box = await page.evaluate(() => {
      const g = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.width > 0 ? { left: r.left, right: r.right } : null;
      };
      return { logo: g(".nav__logo"), cta: g(".nav__cta"), menu: g(".nav__menu-button") };
    });

    ok(box.logo && box.cta, `navbar ${width}: wordmark or CTA missing`);
    ok(box.cta.right < box.logo.left, `navbar ${width}: the CTA is not left of the wordmark`);

    if (box.menu) {
      /* both visible: they must be adjacent, not separated by the bar */
      const gap = box.cta.left - box.menu.right;
      ok(gap >= 0 && gap <= 16, `navbar ${width}: CTA and menu are ${Math.round(gap)}px apart, so they do not read as one group`);
      ok(box.menu.right < box.logo.left, `navbar ${width}: the menu button is not left of the wordmark`);
      console.log(`  navbar ${width}: menu and CTA together at the left, ${Math.round(gap)}px apart, wordmark right`);
    } else {
      console.log(`  navbar ${width}: CTA at the left end, wordmark right (no menu at this width)`);
    }
  }
  await page.close();
}

/* ---------------------------------------------------------------------------
   7. THE MOBILE MENU SHEET (Mika, second full review)

   The sheet is a native <details>/<summary>, which is why it works with the
   keyboard and with JavaScript off - but it shipped without the three things
   an open overlay owes the reader. All three are asserted here at the widths
   Mika tested, plus the one combination worth distrusting: the navbar hides
   itself on scroll down, so an open sheet and a hiding bar must not leave the
   page pinned or the sheet stranded.
--------------------------------------------------------------------------- */
for (const width of [360, 390, 768]) {
  const page = await b.newPage({ viewport: { width, height: 800 } });
  await page.goto("http://localhost:3100/", { waitUntil: "load" });
  await page.waitForTimeout(500);

  const isOpen = () => page.evaluate(() => !!document.querySelector(".nav__menu")?.hasAttribute("open"));
  const bodyPinned = () => page.evaluate(() => getComputedStyle(document.body).position === "fixed");
  const openMenu = async () => {
    await page.click(".nav__menu-button");
    await page.waitForTimeout(250);
  };

  /* --- Escape closes and focus goes back to the button --- */
  await openMenu();
  ok(await isOpen(), `menu ${width}: did not open`);
  ok(await bodyPinned(), `menu ${width}: the page behind is not locked while the sheet is open`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  ok(!(await isOpen()), `menu ${width}: Escape did not close the sheet`);
  ok(await page.evaluate(() => document.activeElement?.classList.contains("nav__menu-button")),
    `menu ${width}: focus did not return to the menu button after Escape`);
  ok(!(await bodyPinned()), `menu ${width}: the scroll lock survived Escape`);

  /* --- an outside click closes --- */
  await openMenu();
  ok(await isOpen(), `menu ${width}: did not reopen`);
  await page.mouse.click(Math.round(width / 2), 700);
  await page.waitForTimeout(250);
  ok(!(await isOpen()), `menu ${width}: an outside click did not close the sheet`);
  ok(!(await bodyPinned()), `menu ${width}: the scroll lock survived an outside click`);

  /* --- a click INSIDE the sheet must not close it --- */
  await openMenu();
  const sheet = await page.$(".nav__sheet");
  if (sheet) {
    const box = await sheet.boundingBox();
    await page.mouse.click(Math.round(box.x + box.width / 2), Math.round(box.y + 4));
    await page.waitForTimeout(200);
    ok(await isOpen(), `menu ${width}: a click inside the sheet closed it`);
  }

  /* --- the page really cannot scroll while it is open --- */
  const moved = await page.evaluate(async () => {
    const before = window.scrollY;
    window.scrollTo(0, 900);
    await new Promise((r) => setTimeout(r, 120));
    return window.scrollY !== before;
  });
  ok(!moved, `menu ${width}: the page scrolled behind the open sheet`);

  /* --- the combination: hide-on-scroll with the sheet open --- */
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  /* scroll down (the bar hides, correctly), then nudge back up so it returns -
     which is the only way a reader can reach the menu button down the page */
  await page.evaluate(async () => {
    window.scrollTo(0, 400);
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo(0, 360);
    await new Promise((r) => setTimeout(r, 500));
  });
  ok(!(await page.evaluate(() => document.querySelector(".nav")?.classList.contains("is-hidden"))),
    `menu ${width}: the navbar did not come back when the reader scrolled up`);
  const yBefore = await page.evaluate(() => window.scrollY);
  await openMenu();
  /* once the document is pinned window.scrollY legitimately reads 0 - the
     offset lives in body.style.top - so the question is whether it MOVES, not
     what it reads. Same note as the contact modal's lock. */
  const yLocked = await page.evaluate(() => window.scrollY);
  await page.evaluate(async () => { window.scrollTo(0, 1200); await new Promise((r) => setTimeout(r, 400)); });
  ok(await page.evaluate((y) => window.scrollY === y, yLocked),
    `menu ${width}: the page moved behind the open sheet during a hide-on-scroll attempt`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  ok(!(await bodyPinned()), `menu ${width}: the page stayed pinned after closing`);
  ok(await page.evaluate((y) => Math.abs(window.scrollY - y) < 3, yBefore),
    `menu ${width}: the scroll position was not restored on close`);
  /* and the bar must not hide itself just because the restore looked like a scroll */
  await page.waitForTimeout(400);
  ok(!(await page.evaluate(() => document.querySelector(".nav")?.classList.contains("is-hidden"))),
    `menu ${width}: the navbar hid itself when the sheet closed - the restore was read as a scroll down`);
  console.log(`  menu ${width}: Escape + focus back, outside click, scroll lock, and the hide-on-scroll combination all hold`);
  await page.close();
}

await b.close();
if (fails.length) { console.error("\nMECHANICS FAILED:\n" + fails.map((f) => "  - " + f).join("\n")); process.exit(1); }
console.log("\nall seven mechanics hold: active state, footer credit, contact modal, filter icon states, navbar group, whatsapp group link, mobile menu sheet");
