/*
 * "ארגז הכלים" - Figma 407:364, read with get_design_context.
 * Every string is the frame's own text layer, verbatim.
 *
 * SANITY SHAPE that this page implies - this is what fills the `tool` stub in
 * CMS-INTEGRATION.md:
 *
 *   tool {
 *     slug          slug        required
 *     title         string      required   440:262
 *     description   text        required   440:263
 *     illustration  image       required   440:261
 *     file          file        MISSING    440:264 downloads it; no file exists
 *     facts         array<{ label: string; value: string }>   440:266
 *     order         number      required   the row order is the frame's
 *   }
 *
 * TWO REAL GAPS, neither of them invented around:
 *
 * 1. `facts` - the frame prints the literal string "{TBD}" as the VALUE of both
 *    facts on all three cards (440:269, 440:272 and their siblings). The labels
 *    exist, the values do not. They are per-tool facts only Yaakov can supply,
 *    so they render as a visible gap marker rather than as text a reader could
 *    mistake for an answer.
 * 2. `file` - no tool file exists anywhere in the client folder. Searched:
 *    files/ has the three illustrations and nothing downloadable. So the
 *    button is real and honest about having nothing behind it yet, the same
 *    way the newsletter is - it never pretends to download.
 *
 * "בוא נעמיק ←" (440:273) has no destination in the frame and no page behind
 * it, so it is a label, not a link. Flagged rather than pointed somewhere
 * invented.
 */

export type ToolFact = { label: string; value: string | null };

export type Tool = {
  slug: string;
  title: string;
  description: string;
  illustration: string;
  /** null until a real file exists - see the gap above */
  file: string | null;
  facts: ToolFact[];
  /* --- the homepage section (Figma 200:142) uses the same three tools with a
     different card, so its extras live here rather than in a second data file.
     The /toolbox page ignores them. --- */
  /** I200:210;149:166 - a different exported crop with its own plate colour */
  homeIllustration: string;
  /** the plate behind that illustration, per card */
  homeTint: string;
  /**
   * I200:210;149:248. The frame prints "5 דקות קריאה" on ALL THREE cards,
   * identically, for three tools that do different things and are not
   * articles. Read as written because it is the frame's copy, but it looks
   * like placeholder text and it is reported as such - the /toolbox page's
   * equivalent fact ("כמה זמן זה לוקח") is an explicit {TBD} in the same file.
   */
  homeLabel: string;
};

/* 440:254 / 440:255 */
export const TOOLBOX_HEADER = {
  title: "ארגז הכלים",
  subtitle:
    "כל מה שבניתי לעצמי ואין לי סיבה לא לתת לכם. בחינם, בלי טלפון, בלי שיחת מכירה.",
};

/* 440:257 / 440:258 */
export const TOOLBOX_INTRO = [
  "רוב מה שכתוב באינטרנט על כסף הוא הסבר. הסבר זה נחמד, אבל שום דבר לא מזיז אנשים כמו לראות את המספרים של עצמם מול העיניים. 👀",
  "הקבצים כאן עושים בדיוק את זה. תמלאו, תראו מה יוצא, ותחליטו אתם.",
];

/* 440:264 / 440:265 - the same label on all three cards */
export const TOOL_CTA = "קח את הקובץ";
/* 440:273 */
export const TOOL_DEEPER = "בוא נעמיק ←";

const FACTS: ToolFact[] = [
  { label: "כמה זמן זה לוקח", value: null },
  { label: "מה תגלו", value: null },
];

export const TOOLS: Tool[] = [
  {
    slug: "household",
    title: "ניהול משק בית",
    description:
      "איפה הכסף שלכם באמת נעלם כל חודש. תמלאו חודש אחד וכבר תראו שני דברים שלא ידעתם שאתם משלמים עליהם.",
    illustration: "tool-household",
    file: null,
    facts: FACTS,
    homeIllustration: "tool-home-household",
    homeTint: "#ebe8c6",
    homeLabel: "5 דקות קריאה",
  },
  {
    slug: "credit",
    title: "כלי לניתוח הוצאות אשראי",
    description:
      "אפליקציה קטנה שעוזרת לקחת את תדפיסי האשראי ולסווג את ההוצאות בהתאם",
    illustration: "tool-credit",
    file: null,
    facts: FACTS,
    homeIllustration: "tool-home-credit",
    homeTint: "#c4cdf4",
    homeLabel: "5 דקות קריאה",
  },
  {
    slug: "gemel",
    title: "השוואת קופות גמל",
    description:
      "דמי ניהול הם ההבדל בין הפנסיה שלכם לבין הפנסיה של השכן, על אותה משכורת בדיוק. הקובץ הזה מראה לכם את הפער במספרים.",
    illustration: "tool-gemel",
    file: null,
    facts: FACTS,
    homeIllustration: "tool-home-gemel",
    homeTint: "#cde6a1",
    homeLabel: "5 דקות קריאה",
  },
];

/* 440:303 / 440:304 */
export const TOOLBOX_MISSING = {
  title: "חסר לכם כלי?",
  body: "אם יש חישוב שאתם עושים שוב ושוב על דף, תגידו לי בקבוצה. יש סיכוי טוב שאבנה אותו, ושעוד מאה אנשים היו צריכים אותו בדיוק כמוכם.",
};

/* 200:148 / 200:149 - the homepage section's own header */
export const TOOLBOX_HOME = {
  title: "כלים שתוכלו להוריד ולהשתמש בהם עוד היום",
  subtitle: "לפעמים הכי קל להתחיל ממה שכבר עניין מישהו אחר.",
  /* 200:150 */
  cta: { label: "קראו כל מה שיש", href: "/posts" },
  /*
   * 200:279 reads "[ 4,202 פוסטים מעודכנים ]". There are NINE posts. Shipping
   * 4,202 would be a false factual claim on a client's site, so the count is
   * derived from the real data and the frame's number is reported as a gap
   * rather than reproduced.
   */
  countTemplate: (n: number) => `[ ${n} פוסטים מעודכנים ]`,
};
