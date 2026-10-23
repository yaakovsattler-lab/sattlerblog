/* A tool in ארגז כלים (Figma 407:364). */
import { defineArrayMember, defineField, defineType } from "sanity";
import { WrenchIcon } from "@sanity/icons/Wrench";
import { AutoSlugInput } from "../components/AutoSlugInput";
import { slugify } from "../slugify";

export const tool = defineType({
  name: "tool",
  title: "כלי",
  type: "document",
  icon: WrenchIcon,
  fieldsets: [{ name: "more", title: "פרטים נוספים (מתמלאים לבד)", options: { collapsible: true, collapsed: true } }],
  fields: [
    defineField({ name: "title", title: "שם הכלי", type: "string", validation: (r) => r.required().error("לכלי חסר שם") }),
    defineField({ name: "description", title: "תיאור", type: "text", rows: 3, validation: (r) => r.required().error("חסר תיאור") }),
    defineField({
      name: "illustration",
      title: "איור",
      description: "האיורים של ארגז הכלים הם ריבוע צבעוני מלא, לא שקוף",
      type: "image",
      validation: (r) => r.required().error("חסר איור"),
    }),
    defineField({ name: "homeIllustration", title: "איור לעמוד הבית", description: "חיתוך אחר של אותו איור, לכרטיס בעמוד הבית", type: "image" }),
    defineField({
      name: "file",
      title: "הקובץ להורדה",
      description: "מה שהכפתור 'קח את הקובץ' מוריד. עד שיש קובץ, הכפתור אומר שהקובץ עוד לא עלה.",
      type: "file",
    }),
    defineField({ name: "facts", title: "פרטים על הכלי", type: "array", of: [defineArrayMember({ type: "fact" })] }),
    defineField({
      name: "slug",
      title: "כתובת",
      type: "slug",
      fieldset: "more",
      options: { source: "title", slugify, maxLength: 60 },
      components: { input: AutoSlugInput },
      validation: (r) => r.required().error("חסרה כתובת - מלאו שם והיא תיווצר לבד"),
    }),
    defineField({
      name: "order",
      title: "מיקום בעמוד",
      type: "number",
      fieldset: "more",
      initialValue: async (_params, { getClient }) => {
        const max = await getClient({ apiVersion: "2026-10-01" }).fetch<number | null>(
          'math::max(*[_type == "tool" && defined(order)].order)'
        );
        return (max ?? 0) + 1;
      },
      validation: (r) => r.required().integer().min(1).error("מיקום חייב להיות מספר שלם"),
    }),
  ],
  orderings: [{ title: "לפי הסדר בעמוד", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
  preview: { select: { title: "title", subtitle: "description", media: "illustration" } },
});
