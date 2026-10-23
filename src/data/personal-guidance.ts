/*
 * "ליווי אישי" - Figma 407:413, read with get_design_context.
 * Every string is the frame's own text layer, verbatim.
 *
 * This is the only page on the site that asks for money, and it is in the
 * navbar by Nir's decision of 18.09 under Elyakim's authority (it is not in
 * Figma 481:217). The price below is the frame's own - 448:231 - and is NOT
 * something I set or checked commercially; if 999₪ is stale, it is stale in
 * the design too.
 *
 * Sanity shape: a single `page` document - title, intro[], facts[{label,
 * value}], guarantee, cta.
 */

export const GUIDANCE = {
  /* 448:218 */
  title: "רוצים שנעבור על זה ביחד?",
  /* 448:220 / 448:221 */
  intro: [
    "רוב האנשים לא צריכים אותי. באמת. אם קראתם כמה פוסטים כאן, הורדתם קובץ ועשיתם סדר - זה כל מה שצריך, ואני שמח שזה עבד. 🙏",
    "אבל יש מצבים שבהם שווה לשבת עם מישהו: כשיש הרבה חלקים שלא מתחברים, כשעומדת החלטה גדולה, או כשפשוט נמאס לדחות את זה עוד שנה.",
  ],
  /* 448:223 / 448:226 / 448:229 - label then value, in the frame's order */
  facts: [
    {
      label: "מה זה כולל",
      value:
        "בניית תוכנית כלכלית משותפת לעתיד, עושים סדר פיננסי במצב הקיים, מייצרים הרגלים פיננסים בריאים ומעל הכל מעלים את הביטחון העצמי לעשות את הדברים לבד.",
    },
    { label: "כמה זמן", value: "2-3 מפגשים בזום." },
    /* 448:231 - the price, verbatim from the frame */
    { label: "כמה זה עולה", value: "999₪" },
  ],
  /* 448:232 */
  guarantee:
    "אם בסיום התהליך תרגישו שזה לא נתן לכם כלום - לא תשלמו. בלי ויכוח ובלי הסברים. אפס סיכון מצידכם.",
  /* 448:233 / 448:234. The frame gives the button no destination; /contact is
     the only place on the site that can start a conversation, and it is the
     same form the navbar CTA opens. */
  cta: { label: "דברו איתי", href: "/contact" },
};
