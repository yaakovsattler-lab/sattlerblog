/*
 * A life stage - the filter chips on /posts and the stations on the home page.
 * It replaces a free-text field that silently matched zero posts when two
 * words differed (CMS-INTEGRATION.md section 8.1). A post now points at one of
 * these, so a mismatch cannot happen.
 */
import { defineField, defineType } from "sanity";
import { TagIcon } from "@sanity/icons/Tag";

export const lifeStage = defineType({
  name: "lifeStage",
  title: "שלב חיים",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({ name: "label", title: "שם השלב", description: "כפי שמופיע בכפתור הסינון, למשל: משקיעים", type: "string", validation: (r) => r.required().error("חסר שם לשלב") }),
    defineField({ name: "emoji", title: "אימוג'י", type: "string", validation: (r) => r.max(4).error("אימוג'י אחד בלבד") }),
    defineField({
      name: "slug",
      title: "כתובת",
      description: "באנגלית, משמשת בקישור לסינון (/posts?stage=...). לא לשנות אחרי שיש קישורים.",
      type: "slug",
      validation: (r) => r.required().error("חסרה כתובת"),
    }),
    defineField({ name: "icon", title: "אייקון הסינון", type: "image", options: { accept: "image/svg+xml,image/png" }, validation: (r) => r.required().error("חסר אייקון") }),
    defineField({
      name: "order",
      title: "מיקום בשורת הסינון",
      type: "number",
      validation: (r) => r.required().integer().min(1).error("מיקום חייב להיות מספר שלם"),
    }),
    defineField({
      name: "station",
      title: "התחנה בעמוד הבית",
      description: "רק לשלבים שמופיעים בגלילה של עמוד הבית",
      type: "object",
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({ name: "order", title: "מיקום בגלילה", type: "number" }),
        defineField({ name: "tabLabel", title: "שם בלשונית", type: "string" }),
        defineField({ name: "title", title: "כותרת", type: "string" }),
        defineField({ name: "blurb", title: "תיאור", type: "text", rows: 3 }),
        defineField({ name: "icon", title: "אייקון", type: "image" }),
        defineField({ name: "cta", title: "כפתור", type: "link" }),
      ],
    }),
  ],
  orderings: [{ title: "לפי הסדר", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
  preview: {
    select: { label: "label", emoji: "emoji", media: "icon" },
    prepare: ({ label, emoji, media }) => ({ title: [emoji, label].filter(Boolean).join(" "), media }),
  },
});
