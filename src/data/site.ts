/*
 * Site-wide content, shaped the way Sanity will hold it.
 *
 * Every string here is read off the Figma nodes named in the comments - the
 * navbar 481:217 and the footer 578:1512 - and nothing is invented. Where a
 * link has no designed destination the route still exists and is marked
 * `designed: false`, because Elyakim's rule for this round is that every page
 * gets built and there are no dead links.
 *
 * Sanity shape, for when this moves:
 *   siteSettings   { brandName, navLinks[], navCta, footer }
 *   navLink        { label, href, current }
 *   footerColumn   { title, links[] }
 *   footer         { ticker[], columns[], brandName, disclaimer[], credit }
 * Arrays keep their order; nothing here is sorted at render time.
 */

export type NavLink = {
  label: string;
  href: string;
  /** false = the route exists and is built, but Figma has no design for it */
  designed: boolean;
};

export type FooterColumn = {
  title: string;
  links: NavLink[];
};

/** Figma 481:217, nav-links 4:4, in the frame's own order (right to left). */
export const NAV_LINKS: NavLink[] = [
  { label: "מה קורה אצלכם", href: "/#life-stages", designed: true },
  { label: "כל הפוסטים", href: "/posts", designed: true },
  { label: "ארגז כלים", href: "/toolbox", designed: true },
  /* Added 18.09 by Nir under Elyakim's authority, NOT in Figma 481:217: it is
     the only page that asks for money and there was no way to reach it.
     Flagged for Tal as a decision, not a drift. */
  { label: "ליווי אישי", href: "/personal-guidance", designed: true },
  { label: "הסיפור שלי", href: "/my-story", designed: true },
];

/** Figma 62:2. The frame draws it 96px wide; see the CSS note on why it is not. */
export const NAV_CTA: NavLink = {
  label: "צרו קשר",
  href: "/contact",
  designed: false,
};

/** Figma 572:617. One unit of the strip - the marquee repeats it. */
export const FOOTER_TICKER = [
  "בלי מערכת",
  "בלי כותבי צללים",
  "בלי תוכן ממומן",
  "בלי דמי ניהול נסתרים",
  "בלי אותות מסחר",
  "בלי עמלת הפניה",
  "בלי וובינר בחצות",
  "בלי \"מכפילים תוך חודש\"",
  "בלי קורס בשלושה תשלומים נוחים",
  "בלי גורו בחליפה",
  "בלי תזמון שוק",
  "בלי הבטחת תשואה",
  "בלי משפך מכירות",
  "בלי \"המבצע נגמר הלילה\"",
  "בלי יועץ שמקבל עמלה מהבנק",
  "בלי גרף שמראה רק את השנה הטובה",
  "בלי מכתב מכירה בן 40 עמודים",
  "בלי אותיות קטנות שאף אחד לא קורא",
  "בלי הבטחת פרישה מוקדמת",
];

/** Figma 572:620, 572:625, 572:630. */
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "תוכן",
    links: [
      { label: "כל הפוסטים", href: "/posts", designed: false },
      { label: "שלבי חיים", href: "/life-stages", designed: false },
      { label: "ארגז כלים", href: "/toolbox", designed: true },
    ],
  },
  {
    title: "אני",
    links: [
      { label: "הסיפור שלי", href: "/my-story", designed: true },
      { label: "הקבוצה", href: "/community", designed: false },
      { label: "צרו קשר", href: "/contact", designed: false },
    ],
  },
  {
    title: "הקטן באותיות",
    links: [
      { label: "תנאי שימוש", href: "/terms", designed: false },
      { label: "פרטיות", href: "/privacy", designed: false },
      { label: "גילוי נאות", href: "/disclosure", designed: false },
    ],
  },
];

/** Figma 572:635, 572:636, 572:637. */
export const BRAND_NAME = "יעקב סאטלר";

export const FOOTER_DISCLAIMER = [
  "נכתב על ידי יעקב סאטלר. בלי מערכת, בלי כותבי צללים, ובלי תוכן ממומן.",
  "כל מה שכתוב באתר הזה הוא דעה אישית וניסיון אישי, ולא ייעוץ פיננסי, ייעוץ השקעות או ייעוץ מס. אני לא יועץ מורשה. לפני החלטה משמעותית תתייעצו עם מי שכן.",
];

/* 572:637. Elyakim, 18.09: the credit names the studio and links to it. The
   Latin name stays Latin inside the Hebrew line - see the <bdi> in Footer. */
export const FOOTER_CREDIT = {
  text: "עוצב ונבנה ע״י",
  studio: "Elyagol studio",
  /* exact, no trailing character - asserted byte for byte in
     scripts/check-mechanics.mjs because a stray diacritic is invisible here */
  href: "https://www.elyagol.com/home-he",
};

/*
 * THE WHATSAPP GROUP. Given by Elyakim on 19.09 and cross-checked against his
 * own chat export (files/01-Content/posts-source/), where the identical URL
 * appears once, in his words, as "הקישור לקבוצה שלנו".
 *
 * ONE definition. Both the community block (25:24) and the WhatsApp questions
 * block (170:155) link here, and a client changes this kind of value without a
 * developer - so it maps to siteSettings.whatsappGroupUrl in Sanity, not to a
 * constant per component. See CMS-INTEGRATION.md.
 *
 * Exact, including the ?mode=gi_t query and with no trailing character:
 * asserted byte for byte with a non-ASCII guard in scripts/check-mechanics.mjs,
 * the same way the footer credit is, because an invisible RTL mark pasted onto
 * the end of a URL would 404 silently on a link people are asked to trust.
 */
export const WHATSAPP_GROUP_URL: string | null =
  "https://chat.whatsapp.com/CzdYNqGwM0M9foD2kKB7g5?mode=gi_t";

/** Figma 5:4. */
export const HERO = {
  /* 5:9 and 5:10 - two lines, and they are two lines in the frame, not a wrap */
  headline: ["כלכלה אישית.", "בלי בולשיט"],
  /* 5:11 */
  blurb: "זה נראה מסובך רק כי אף אחד לא טרח להסביר.",
  /* 146:100 / 5:13 */
  cta: { label: "הצטרפו לקבוצת הווצאפ", href: "/community", designed: false },
  /* 5:14 */
  ctaNote: "זה לגמרי בחינם",
  /* 193:501 - the text inside this image is baked into the asset, not live */
  characterAlt: "יד מנופפת עם בועת דיבור: בוא תשמע סיפור",
};

/**
 * Every route the site has. `designed` false means Figma has no frame for it
 * and what is built is a plain honest page, to be redesigned later.
 * This list is what the report's "built without a design" section is made of,
 * so it is data and not prose.
 */
export const ROUTES: { href: string; title: string; designed: boolean; figma?: string }[] = [
  { href: "/", title: "עמוד הבית", designed: true, figma: "4:2" },
  { href: "/my-story", title: "הסיפור שלי", designed: true, figma: "407:315" },
  { href: "/toolbox", title: "ארגז כלים", designed: true, figma: "407:364" },
  { href: "/personal-guidance", title: "ליווי אישי", designed: true, figma: "407:413" },
  { href: "/posts", title: "כל הפוסטים", designed: true, figma: "536:591" },
  { href: "/life-stages", title: "שלבי חיים", designed: false },
  { href: "/community", title: "הקבוצה", designed: false },
  { href: "/contact", title: "צרו קשר", designed: false },
  { href: "/terms", title: "תנאי שימוש", designed: false },
  { href: "/privacy", title: "פרטיות", designed: false },
  { href: "/disclosure", title: "גילוי נאות", designed: false },
];
