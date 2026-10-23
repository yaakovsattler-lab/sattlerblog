import { objectTypes } from "./objects";
import { post } from "./post";
import { lifeStage } from "./lifeStage";
import { tool } from "./tool";
import { page } from "./page";
import { siteSettings } from "./siteSettings";
import { whatsappQuestion } from "./whatsappQuestion";

export const schemaTypes = [post, lifeStage, tool, page, siteSettings, whatsappQuestion, ...objectTypes];

/* One document each, at a fixed id. The Studio never offers to create, copy
   or delete them. */
export const SINGLETON_TYPES = new Set(["page", "siteSettings"]);
/* What the "create" button may offer anywhere in the Studio. */
export const CREATABLE_TYPES = new Set(["post", "whatsappQuestion", "tool"]);
