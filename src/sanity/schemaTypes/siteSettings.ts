/* Everything on the site that is not a post, a tool, a bubble or a page: the
   navbar, the footer, the home hero, and the WhatsApp group link. One document. */
import { defineArrayMember, defineField, defineType } from "sanity";
import { CogIcon } from "@sanity/icons/Cog";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "הגדרות כלליות",
  type: "document",
  icon: CogIcon,
  groups: [
    { name: "main", title: "כללי", default: true },
    { name: "nav", title: "תפריט" },
    { name: "hero", title: "פתיחת עמוד הבית" },
    { name: "footer", title: "פוטר" },
  ],
  fields: [
    defineField({ name: "brandName", title: "שם האתר", type: "string", group: "main", validation: (r) => r.required().error("חסר שם") }),
    defineField({
      name: "whatsappGroupUrl",
      title: "קישור לקבוצת הוואטסאפ",
      description: "כל כפתורי 'הצטרפו לקבוצה' באתר מובילים לכאן. כל עוד ריק, הכפתורים מושבתים.",
      type: "url",
      group: "main",
      validation: (r) =>
        r.uri({ scheme: ["https"] }).error("הכתובת צריכה להתחיל ב-https://").custom((v) =>
          !v || /^https:\/\/chat\.whatsapp\.com\//.test(v as string) ? true : "זה לא נראה כמו קישור הזמנה לקבוצה (chat.whatsapp.com)"
        ),
    }),
    defineField({ name: "navLinks", title: "קישורים בתפריט", type: "array", group: "nav", of: [defineArrayMember({ type: "link" })] }),
    defineField({ name: "navCta", title: "כפתור בתפריט", type: "link", group: "nav" }),
    defineField({ name: "hero", title: "פתיחת עמוד הבית", type: "hero", group: "hero" }),
    defineField({ name: "footerTicker", title: "הפס הרץ בפוטר", type: "array", group: "footer", of: [defineArrayMember({ type: "string" })] }),
    defineField({ name: "footerColumns", title: "עמודות הקישורים", type: "array", group: "footer", of: [defineArrayMember({ type: "footerColumn" })] }),
    defineField({ name: "footerDisclaimer", title: "הבהרה משפטית", type: "array", group: "footer", of: [defineArrayMember({ type: "text", rows: 3 })] }),
    defineField({ name: "footerCredit", title: "קרדיט", type: "footerCredit", group: "footer" }),
  ],
  preview: { prepare: () => ({ title: "הגדרות כלליות" }) },
});
