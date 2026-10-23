/*
 * הקהילה - Figma 25:24, read with get_design_context.
 *
 * Every string is the frame's own text layer. The same copy also appears in
 * files/00-Brief/approved-site-copy.md section 7, with two small differences
 * (the bullet order, and "רוב האנשים עושים בדיוק את זה" against the frame's
 * "זה מה שרוב האנשים עושים"); the frame is the later artefact and the brief
 * names it the source of truth, so the frame wins. Flagged, not reconciled.
 *
 * The group URL is deliberately NOT here - it lives in whatsapp-questions.ts
 * as a single TBD, because both sections' buttons point at the same group and
 * one unknown should not be recorded in two places.
 *
 * Sanity shape: page "home" -> community { title, lead[], points[], ... }
 */

export const COMMUNITY = {
  /* 25:26 */
  title: "הדיון האמיתי קורה בוואטסאפ",
  /* 25:27 */
  lead: [
    "פה אני כותב. שם אנחנו מדברים.",
    "אנשים שואלים שאלות בלי להתבייש, אחרים עונים, וכל אחד לוקח משם מה שרלוונטי לו.",
  ],
  /* 25:30, 25:29, 25:31 - in the frame's own top-to-bottom order */
  points: [
    "אין שאלה טיפשית. באמת",
    "שאלות אמיתיות, תשובות של אנשים שכבר עברו את זה",
    "בלי ספאם, בלי פרסומות, ובלי הודעות ב-04:00 בבוקר",
  ],
  /* 200:277 - the second half is the bold run in the frame */
  countPrefix: "הצטרפו ל",
  countStrong: "500+ חברי קבוצה",
  /* I149:233;5:13 */
  ctaLabel: "הצטרפו לקבוצת הווצאפ",
  /* 149:234 */
  note: ["אפשר גם רק לקרוא בשקט...", "זה מה שרוב האנשים עושים."],
} as const;
