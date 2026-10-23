/*
 * The site's fixed pages - one document each, created once, never created or
 * deleted by an editor. Which fields show depends on which page it is:
 *   page-home               community block
 *   page-my-story           text + button
 *   page-personal-guidance  text + facts + guarantee + button (carries the price)
 */
import { defineArrayMember, defineField, defineType } from "sanity";
import { DocumentIcon } from "@sanity/icons/Document";

export const PAGE_IDS = { home: "page-home", myStory: "page-my-story", guidance: "page-personal-guidance" } as const;

const is = (id: string) => ({ document }: { document?: { _id?: string } }) =>
  (document?._id ?? "").replace(/^drafts\./, "") === id;
const isNot = (...ids: string[]) => ({ document }: { document?: { _id?: string } }) =>
  !ids.some((id) => is(id)({ document }));

export const page = defineType({
  name: "page",
  title: "עמוד",
  type: "document",
  icon: DocumentIcon,
  fields: [
    defineField({ name: "title", title: "כותרת העמוד", type: "string", validation: (r) => r.required().error("חסרה כותרת") }),
    defineField({ name: "body", title: "טקסט", type: "pageBody", hidden: is(PAGE_IDS.home) }),
    defineField({
      name: "facts",
      title: "פרטים (מה כולל, כמה זמן, כמה עולה)",
      type: "array",
      of: [defineArrayMember({ type: "fact" })],
      hidden: isNot(PAGE_IDS.guidance),
    }),
    defineField({ name: "guarantee", title: "התחייבות", type: "text", rows: 3, hidden: isNot(PAGE_IDS.guidance) }),
    defineField({ name: "cta", title: "כפתור", type: "link", hidden: is(PAGE_IDS.home) }),
    defineField({ name: "community", title: "בלוק הקבוצה", type: "community", hidden: isNot(PAGE_IDS.home) }),
  ],
});
