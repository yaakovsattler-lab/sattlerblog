/*
 * A post. The form is ordered the way Yaakov writes one: title, life stage,
 * reading time, summary, illustration, body. Everything else (address, order)
 * fills itself, and sits in a closed "more details" section.
 */
import { defineArrayMember, defineField, defineType } from "sanity";
import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { AutoSlugInput } from "../components/AutoSlugInput";
import { slugify } from "../slugify";

export const READING_TIMES = ["דקה אחת", "2 דקות", "3 דקות", "4 דקות", "5 דקות", "6 דקות", "7 דקות", "8 דקות", "10 דקות", "15 דקות"];

export const post = defineType({
  name: "post",
  title: "פוסט",
  type: "document",
  icon: DocumentTextIcon,
  fieldsets: [{ name: "more", title: "פרטים נוספים (מתמלאים לבד)", options: { collapsible: true, collapsed: true } }],
  fields: [
    defineField({
      name: "title",
      title: "כותרת",
      type: "string",
      validation: (r) => r.required().error("לפוסט חסרה כותרת"),
    }),
    defineField({
      name: "lifeStages",
      title: "שלב חיים",
      description: "לאיזה שלב בחיים הפוסט שייך. אפשר לבחור יותר מאחד.",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "lifeStage" }], options: { disableNew: true } })],
      validation: (r) => r.required().min(1).unique().error("צריך לבחור לפחות שלב חיים אחד - בלי זה הפוסט לא יופיע באף סינון"),
    }),
    defineField({
      name: "readingTime",
      title: "זמן קריאה",
      type: "string",
      options: { list: READING_TIMES },
      validation: (r) => r.required().error("צריך לבחור זמן קריאה"),
    }),
    defineField({
      name: "lead",
      title: "תקציר",
      description: "משפט או שניים שמופיעים מתחת לכותרת ובכרטיס של הפוסט",
      type: "text",
      rows: 3,
      validation: (r) => r.required().error("חסר תקציר"),
    }),
    defineField({
      name: "image",
      title: "איור",
      description: "קובץ PNG עם רקע שקוף. גוררים לכאן.",
      type: "image",
      options: { accept: "image/png,image/webp" },
      validation: (r) => r.required().error("אי אפשר לפרסם פוסט בלי איור"),
    }),
    defineField({
      name: "body",
      title: "גוף הפוסט",
      type: "postBody",
      validation: (r) => r.required().min(1).error("גוף הפוסט ריק"),
    }),
    defineField({
      name: "slug",
      title: "כתובת הפוסט",
      description: "נוצרת לבד מהכותרת. אחרי פרסום עדיף לא לשנות - קישורים ששותפו יישברו.",
      type: "slug",
      fieldset: "more",
      options: { source: "title", slugify, maxLength: 60 },
      components: { input: AutoSlugInput },
      validation: (r) => r.required().error("לפוסט אין כתובת - מלאו כותרת והיא תיווצר לבד"),
    }),
    defineField({
      name: "topics",
      title: "נושאים",
      type: "array",
      fieldset: "more",
      of: [defineArrayMember({ type: "string" })],
      options: { layout: "tags" },
    }),
    defineField({
      name: "order",
      title: "מיקום ברשימה",
      description: "קובע את הסדר בלשונית 'מה שהייתי מתחיל ממנו'. פוסט חדש מקבל את המקום הבא.",
      type: "number",
      fieldset: "more",
      /* next free slot at creation; the editor never has to fill it */
      initialValue: async (_params, { getClient }) => {
        const max = await getClient({ apiVersion: "2026-10-01" }).fetch<number | null>(
          'math::max(*[_type == "post" && defined(order)].order)'
        );
        return (max ?? 0) + 1;
      },
      validation: (r) => r.required().integer().min(1).error("מיקום חייב להיות מספר שלם"),
    }),
  ],
  orderings: [
    { title: "לפי המיקום ברשימה", name: "orderAsc", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: {
    select: { title: "title", stage: "lifeStages.0.label", media: "image", time: "readingTime" },
    prepare: ({ title, stage, media, time }) => ({
      title,
      subtitle: [stage, time].filter(Boolean).join(" · "),
      media,
    }),
  },
});
