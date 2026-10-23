/*
 * The Studio menu. Four entries, in Hebrew, and nothing else (plan stage 4.5):
 * פוסטים, שאלות מהוואטסאפ, ארגז כלים, הגדרות אתר. The fixed pages and the
 * life stages live inside הגדרות אתר, so the first screen stays four choices.
 */
import type { StructureResolver } from "sanity/structure";
import { CogIcon } from "@sanity/icons/Cog";
import { CommentIcon } from "@sanity/icons/Comment";
import { DocumentIcon } from "@sanity/icons/Document";
import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { HomeIcon } from "@sanity/icons/Home";
import { TagIcon } from "@sanity/icons/Tag";
import { WrenchIcon } from "@sanity/icons/Wrench";
import { PAGE_IDS } from "./schemaTypes/page";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("תוכן האתר")
    .items([
      S.listItem()
        .title("פוסטים")
        .icon(DocumentTextIcon)
        .child(S.documentTypeList("post").title("פוסטים").defaultOrdering([{ field: "order", direction: "asc" }])),
      S.listItem()
        .title("שאלות מהוואטסאפ")
        .icon(CommentIcon)
        .child(S.documentTypeList("whatsappQuestion").title("שאלות מהוואטסאפ").defaultOrdering([{ field: "time", direction: "asc" }])),
      S.listItem()
        .title("ארגז כלים")
        .icon(WrenchIcon)
        .child(S.documentTypeList("tool").title("ארגז כלים").defaultOrdering([{ field: "order", direction: "asc" }])),
      S.divider(),
      S.listItem()
        .title("הגדרות אתר")
        .icon(CogIcon)
        .child(
          S.list()
            .title("הגדרות אתר")
            .items([
              S.listItem()
                .title("הגדרות כלליות")
                .id("siteSettings")
                .icon(CogIcon)
                .child(S.document().schemaType("siteSettings").documentId("siteSettings").title("הגדרות כלליות")),
              S.listItem()
                .title("עמוד הבית")
                .id(PAGE_IDS.home)
                .icon(HomeIcon)
                .child(S.document().schemaType("page").documentId(PAGE_IDS.home).title("עמוד הבית")),
              S.listItem()
                .title("הסיפור שלי")
                .id(PAGE_IDS.myStory)
                .icon(DocumentIcon)
                .child(S.document().schemaType("page").documentId(PAGE_IDS.myStory).title("הסיפור שלי")),
              S.listItem()
                .title("ליווי אישי")
                .id(PAGE_IDS.guidance)
                .icon(DocumentIcon)
                .child(S.document().schemaType("page").documentId(PAGE_IDS.guidance).title("ליווי אישי")),
              S.listItem()
                .title("שלבי חיים")
                .icon(TagIcon)
                .child(S.documentTypeList("lifeStage").title("שלבי חיים").defaultOrdering([{ field: "order", direction: "asc" }])),
            ])
        ),
    ]);
