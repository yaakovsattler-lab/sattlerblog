/*
 * Reusable pieces. Every label, description and validation message is Hebrew,
 * because the person editing is Yaakov, not a developer.
 *
 * The rule behind `linkTarget`: an editor never types a path. A typed path is
 * a broken link waiting to happen ("/post/..." instead of "/posts/..."), so a
 * link is a choice - a post, a life stage, a page from a fixed list, or an
 * outside address - and the site builds the path itself.
 */
import { defineArrayMember, defineField, defineType } from "sanity";
import { RemoveIcon } from "@sanity/icons/Remove";

/** The site's fixed pages, as an editor would name them. */
export const SITE_PAGES = [
  { title: "עמוד הבית", value: "/" },
  { title: "עמוד הבית - שלבי חיים", value: "/#life-stages" },
  { title: "עמוד הבית - אתם יכולים להתחיל כאן", value: "/#start-here" },
  { title: "כל הפוסטים", value: "/posts" },
  { title: "שלבי חיים", value: "/life-stages" },
  { title: "הסיפור שלי", value: "/my-story" },
  { title: "ארגז כלים", value: "/toolbox" },
  { title: "ליווי אישי", value: "/personal-guidance" },
  { title: "הקבוצה", value: "/community" },
  { title: "צרו קשר", value: "/contact" },
  { title: "תנאי שימוש", value: "/terms" },
  { title: "פרטיות", value: "/privacy" },
  { title: "גילוי נאות", value: "/disclosure" },
];

type TargetParent = { type?: string } | undefined;
const needs = (kind: string, message: string) => (value: unknown, ctx: { parent?: unknown }) =>
  (ctx.parent as TargetParent)?.type === kind && !value ? message : true;

export const linkTarget = defineType({
  name: "linkTarget",
  title: "לאן זה מוביל",
  type: "object",
  options: { collapsible: false },
  fields: [
    defineField({
      name: "type",
      title: "סוג היעד",
      type: "string",
      options: {
        list: [
          { title: "פוסט", value: "post" },
          { title: "שלב חיים (רשימת הפוסטים שלו)", value: "stage" },
          { title: "עמוד באתר", value: "page" },
          { title: "קישור לאתר אחר", value: "external" },
        ],
        layout: "radio",
      },
      validation: (r) => r.required().error("צריך לבחור לאן הקישור מוביל"),
    }),
    defineField({
      name: "post",
      title: "איזה פוסט",
      type: "reference",
      to: [{ type: "post" }],
      options: { disableNew: true },
      hidden: ({ parent }) => (parent as TargetParent)?.type !== "post",
      validation: (r) => r.custom(needs("post", "צריך לבחור פוסט")),
    }),
    defineField({
      name: "stage",
      title: "איזה שלב חיים",
      type: "reference",
      to: [{ type: "lifeStage" }],
      options: { disableNew: true },
      hidden: ({ parent }) => (parent as TargetParent)?.type !== "stage",
      validation: (r) => r.custom(needs("stage", "צריך לבחור שלב חיים")),
    }),
    defineField({
      name: "page",
      title: "איזה עמוד",
      type: "string",
      options: { list: SITE_PAGES },
      hidden: ({ parent }) => (parent as TargetParent)?.type !== "page",
      validation: (r) => r.custom(needs("page", "צריך לבחור עמוד")),
    }),
    defineField({
      name: "url",
      title: "כתובת האתר",
      description: "מתחילה ב-https://",
      type: "url",
      hidden: ({ parent }) => (parent as TargetParent)?.type !== "external",
      validation: (r) =>
        r
          .uri({ scheme: ["https"] })
          .error("הכתובת צריכה להתחיל ב-https://")
          .custom(needs("external", "צריך להדביק כתובת")),
    }),
  ],
});

export const link = defineType({
  name: "link",
  title: "קישור",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "הטקסט על הכפתור",
      type: "string",
      validation: (r) => r.required().error("חסר הטקסט שיופיע על הקישור"),
    }),
    defineField({ name: "target", title: "לאן זה מוביל", type: "linkTarget", validation: (r) => r.required().error("צריך לבחור לאן הקישור מוביל") }),
  ],
  preview: { select: { title: "label" } },
});

export const fact = defineType({
  name: "fact",
  title: "פרט",
  type: "object",
  fields: [
    defineField({ name: "label", title: "כותרת", type: "string", validation: (r) => r.required().error("חסרה כותרת") }),
    defineField({
      name: "value",
      title: "תוכן",
      description: "אפשר להשאיר ריק עד שיש תשובה - באתר יופיע סימון שחסר",
      type: "text",
      rows: 2,
    }),
  ],
  preview: { select: { title: "label", subtitle: "value" } },
});

/* ---------- post body blocks ---------- */

export const checklist = defineType({
  name: "checklist",
  title: "רשימת צ'קליסט",
  type: "object",
  fields: [
    defineField({ name: "title", title: "כותרת הרשימה (לא חובה)", type: "string" }),
    defineField({
      name: "items",
      title: "שורות",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      validation: (r) => r.required().min(1).error("רשימה צריכה לפחות שורה אחת"),
    }),
  ],
  preview: {
    select: { title: "title", items: "items" },
    prepare: ({ title, items }) => ({
      title: title || "רשימת צ'קליסט",
      subtitle: `${(items as string[] | undefined)?.length ?? 0} שורות`,
    }),
  },
});

export const tip = defineType({
  name: "tip",
  title: "טיפ",
  type: "object",
  fields: [
    defineField({
      name: "text",
      title: "הטיפ",
      type: "text",
      rows: 3,
      validation: (r) => r.required().error("הטיפ ריק"),
    }),
  ],
  preview: { select: { subtitle: "text" }, prepare: ({ subtitle }) => ({ title: "טיפ", subtitle }) },
});

/* Sanity needs at least one field on an object; this one is invisible. */
export const divider = defineType({
  name: "divider",
  title: "קו מפריד",
  type: "object",
  icon: RemoveIcon,
  fields: [defineField({ name: "line", type: "boolean", hidden: true, initialValue: true })],
  preview: { prepare: () => ({ title: "קו מפריד" }) },
});

/*
 * Only what the site can render. Styles: paragraph, the author's bold
 * sub-heading (`lead`, Figma 535:260) and the rarer large heading (`h2`, used
 * by one post today). No bold/italic/links: the design defines no style for
 * them, so offering them would let an editor make something the site drops.
 */
export const postBody = defineType({
  name: "postBody",
  title: "גוף הפוסט",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "פסקה", value: "normal" },
        { title: "כותרת משנה", value: "lead" },
        { title: "כותרת גדולה", value: "h2" },
      ],
      lists: [],
      marks: { decorators: [], annotations: [] },
    }),
    defineArrayMember({ type: "checklist" }),
    defineArrayMember({ type: "tip" }),
    defineArrayMember({ type: "divider" }),
  ],
});

/* ---------- page and settings pieces ---------- */

/* A page's running text: paragraphs, and a break between groups of them
   (my-story is four groups). */
export const pageBody = defineType({
  name: "pageBody",
  title: "טקסט העמוד",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [{ title: "פסקה", value: "normal" }],
      lists: [],
      marks: { decorators: [], annotations: [] },
    }),
    defineArrayMember({ type: "divider", title: "מעבר לקבוצת פסקאות חדשה" }),
  ],
});

export const community = defineType({
  name: "community",
  title: "בלוק הקבוצה",
  type: "object",
  fields: [
    defineField({ name: "title", title: "כותרת", type: "string", validation: (r) => r.required().error("חסרה כותרת") }),
    defineField({ name: "lead", title: "פסקאות פתיחה", type: "array", of: [defineArrayMember({ type: "text", rows: 2 })] }),
    defineField({ name: "points", title: "נקודות", type: "array", of: [defineArrayMember({ type: "string" })] }),
    defineField({ name: "countPrefix", title: "לפני המספר", description: "למשל: הצטרפו ל", type: "string" }),
    defineField({ name: "countStrong", title: "המספר (מודגש)", description: "למשל: 500+ חברי קבוצה", type: "string" }),
    defineField({ name: "ctaLabel", title: "הטקסט על הכפתור", description: "הכפתור מוביל לקבוצה - את הקישור עצמו מגדירים בהגדרות הכלליות", type: "string" }),
    defineField({ name: "note", title: "הערה מתחת לכפתור", type: "array", of: [defineArrayMember({ type: "string" })] }),
  ],
});

export const footerColumn = defineType({
  name: "footerColumn",
  title: "עמודה בפוטר",
  type: "object",
  fields: [
    defineField({ name: "title", title: "כותרת העמודה", type: "string", validation: (r) => r.required().error("חסרה כותרת") }),
    defineField({ name: "links", title: "קישורים", type: "array", of: [defineArrayMember({ type: "link" })] }),
  ],
  preview: { select: { title: "title" } },
});

export const hero = defineType({
  name: "hero",
  title: "הפתיחה של עמוד הבית",
  type: "object",
  fields: [
    defineField({
      name: "headline",
      title: "כותרת (שתי שורות)",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      validation: (r) => r.required().length(2).error("הכותרת היא בדיוק שתי שורות"),
    }),
    defineField({ name: "blurb", title: "משפט מתחת לכותרת", type: "text", rows: 2 }),
    defineField({ name: "cta", title: "כפתור", type: "link" }),
    defineField({ name: "ctaNote", title: "הערה ליד הכפתור", type: "string" }),
    defineField({ name: "characterAlt", title: "תיאור הדמות (לקוראי מסך)", type: "string" }),
  ],
});

export const footerCredit = defineType({
  name: "footerCredit",
  title: "קרדיט",
  type: "object",
  fields: [
    defineField({ name: "text", title: "טקסט", type: "string" }),
    defineField({ name: "studio", title: "שם הסטודיו", type: "string" }),
    defineField({ name: "href", title: "קישור", type: "url", validation: (r) => r.uri({ scheme: ["https"] }).error("הכתובת צריכה להתחיל ב-https://") }),
  ],
});

export const objectTypes = [
  linkTarget, link, fact, checklist, tip, divider, postBody, pageBody,
  community, footerColumn, hero, footerCredit,
];
