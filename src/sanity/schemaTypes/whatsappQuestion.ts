/*
 * A bubble in "שאלות מהוואטסאפ" (Figma 170:155). Shown in time order.
 * The destination is a choice, never a typed path (the old `href` field), and
 * it is optional: a bubble with no destination renders as a plain bubble.
 */
import { defineField, defineType } from "sanity";
import { CommentIcon } from "@sanity/icons/Comment";

export const whatsappQuestion = defineType({
  name: "whatsappQuestion",
  title: "שאלה מהוואטסאפ",
  type: "document",
  icon: CommentIcon,
  fields: [
    defineField({ name: "text", title: "השאלה", type: "text", rows: 2, validation: (r) => r.required().error("הבועה ריקה") }),
    defineField({
      name: "time",
      title: "שעה בבועה",
      description: "בפורמט 13:05. הבועות מסודרות לפי השעה.",
      type: "string",
      validation: (r) =>
        r.required().error("חסרה שעה").regex(/^([01]\d|2[0-3]):[0-5]\d$/, { name: "שעה" }).error("שעה בפורמט 13:05"),
    }),
    defineField({ name: "target", title: "לאן הבועה מובילה (לא חובה)", type: "linkTarget" }),
    defineField({
      name: "highlighted",
      title: "מודגשת",
      description: "הבועה שמצוירת כאילו לחצו עליה",
      type: "boolean",
      initialValue: false,
    }),
  ],
  orderings: [{ title: "לפי שעה", name: "timeAsc", by: [{ field: "time", direction: "asc" }] }],
  preview: { select: { title: "text", subtitle: "time" } },
});
