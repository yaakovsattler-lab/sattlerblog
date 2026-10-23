/*
 * "שאלות מהוואטסאפ" - Figma 170:155, read with get_design_context.
 *
 * NOT a flattened image. The frame is real layered content: every bubble is
 * its own text layer with its own node id, so the strings below are
 * transcribed from the file, not retyped from a screenshot.
 *
 * WHERE EACH BUBBLE GOES. The destinations are NOT inferred. They are the
 * "מוביל אל" column of the approved copy document,
 * files/00-Brief/approved-site-copy.md section 4, which names a target for
 * every one of the six messages. Five of them point at a life-stage station
 * (the /posts index filtered by stage) and one points at a named post - which
 * is why `href` is a route and not a post slug.
 *
 * TIMES. The approved document and the frame disagree (10:42/11:15/13:00/
 * 14:30/16:20/17:05 against 12:29/13:02/13:05/13:09/13:12/13:17). The frame is
 * the later artefact and the brief names it the source of truth, so the frame's
 * times are used. Flagged for Nir rather than silently reconciled.
 *
 * Sanity shape:
 *   whatsappQuestion { text, time, href, node, highlighted }
 *   siteSettings.whatsappGroupUrl  <- lives in site.ts, wired 19.09
 */

export type WhatsAppQuestion = {
  /** the message itself, verbatim from the frame's text layer */
  text: string;
  /** the frame's own timestamp */
  time: string;
  /** where the bubble goes; null renders a bubble that is not a link */
  href: string | null;
  /** Figma node, so a later change can be traced back */
  node: string;
  /** 167:94 carries a green top border - the frame's "just tapped" state */
  highlighted?: boolean;
};

/* 12:4 and 12:5 */
export const WHATSAPP_TITLE = "השאלות שחוזרות אליי הכי הרבה";
export const WHATSAPP_SUBTITLE =
  "אלה הדברים שאנשים באמת שואלים אותי, שוב ושוב. בלי מילים מסובכות. תלחצו על אחת ותראו מה יש לי להגיד.";

/* 149:278 - the chat title inside the phone */
export const WHATSAPP_CHAT_NAME = "שאלות בריפיט";

/* 167:108 - the two lines above the input bar */
export const WHATSAPP_FOOTER_TITLE = "יש לכם שאלה?";
export const WHATSAPP_FOOTER_SUB = "יש מצב שהיא מעניינת עוד הרבה אנשים";

/* 44:35 - the disabled field's placeholder. The field is decorative: this
   section sends nothing, exactly like the contact and newsletter blocks. */
export const WHATSAPP_INPUT_PLACEHOLDER = "כתבו לי...";

/* I167:115;5:13 */
export const WHATSAPP_CTA_LABEL = "הצטרפו לקבוצה";

export const WHATSAPP_QUESTIONS: WhatsAppQuestion[] = [
  {
    /* 149:331 - approved doc: תחנת "עברנו לגור יחד" */
    text: "אחי, עברנו לגור יחד 📦 איך מנהלים עכשיו את כל ההוצאות בלי לריב?",
    time: "12:29",
    href: "/posts?stage=moved-in-together",
    node: "149:331",
  },
  {
    /*
     * 167:94 - approved doc: תחנת "קונים דירה".
     * The station exists in the filter row, but no post carries that stage
     * yet, so the link would resolve to an empty list every time. Left null
     * and flagged rather than shipped as a link that goes nowhere.
     */
    text: "שומע? קנינו דירה! 🔑 מה הלוז עם המשכנתא הזאת, זה מטורף",
    time: "13:02",
    href: null,
    node: "167:94",
    highlighted: true,
  },
  {
    /* 171:248 - approved doc names the post outright: פוסט חיסכון לכל ילד */
    text: "נולד לנו ילד ראשון 🍼 איפה הכי כדאי לפתוח לו חיסכון לדעתך?",
    time: "13:05",
    href: "/posts/hisachon-lechol-yeled",
    node: "171:248",
  },
  {
    /* 171:257 - approved doc: תחנת "מתחילים להשקיע" */
    text: "קיבלתי העלאה רצינית בעבודה 💰 לשים הכל בצד או להתחיל להשקיע?",
    time: "13:09",
    href: "/posts?stage=investing",
    node: "171:257",
  },
  {
    /* 171:266 - approved doc: מסלול "התחילו כאן", which is the homepage
       section 230:265, so this one is an in-page anchor. */
    text: "אני חושב להתחיל להשקיע אבל ממש מפחד, מאיפה מתחילים? 📊",
    time: "13:12",
    href: "/#start-here",
    node: "171:266",
  },
  {
    /* 171:275 - approved doc: תחנת "חזרתי ממילואים" */
    text: "חזרתי ממילואים אחרי חודשיים 🎖️ מה מגיע לי בכלל?",
    time: "13:17",
    href: "/posts?stage=reserve-duty",
    node: "171:275",
  },
];
