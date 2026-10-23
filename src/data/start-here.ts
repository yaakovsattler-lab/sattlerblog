/*
 * "אתם יכולים להתחיל כאן" - Figma 230:265, read with get_design_context.
 *
 * The section is SEVEN SLOTS, and each slot names a real post rather than
 * carrying its own copy: the frame's card text is the posts' own titles and
 * openings, so duplicating it here would create a second place for the same
 * sentence to go stale. The title, opening, reading time, life stage and
 * illustration all come from `posts.ts`.
 *
 * The mapping was read off the frame's card titles one by one - every card in
 * 230:265 matches a post in files/01-Content/posts-new/ exactly.
 *
 * Sanity shape: `homepageStartHere` - an ordered array of references to
 * `post`, with the first flagged featured. Nothing else.
 */

export type StartHereSlot = { slug: string; featured?: boolean; node: string };

export const START_HERE_TITLE = "אתם יכולים להתחיל כאן"; /* 230:266 */

/* 230:270 - the featured card's own badge, the only copy this file holds */
export const FEATURED_BADGE = "הכי חם בקבוצה";

/*
 * ORDER. The frame lists each row's two cards left to right, and dir=rtl puts
 * the first DOM child at the RIGHT - so within every row the pair is written
 * here in the REVERSE of the frame's order, which lands them where the frame
 * draws them. The rows themselves keep their top-to-bottom order.
 * Same rule as the toolbox row; asserted in scripts/check-rtl.mjs.
 */
export const START_HERE: StartHereSlot[] = [
  /* 230:268 - the amber featured card, to the right of the six */
  { slug: "halvaa-lelo-ribit-miluim", featured: true, node: "230:268" },
  /* 279:221 row 1 - frame: בעבודה then גרים יחד, left to right */
  { slug: "maslul-hekerut-shenigmar", node: "230:283" },
  { slug: "dmey-nihul-pensia", node: "230:277" },
  /* 279:224 row 2 - frame: הורים טריים then קונים דירה */
  { slug: "halvaa-al-heshbon-hishtalmut", node: "230:293" },
  { slug: "hisachon-lechol-yeled", node: "230:288" },
  /* 279:227 row 3 - frame: משקיעים then עסק בצד */
  { slug: "keren-kaspit-mas", node: "230:304" },
  { slug: "pkudat-stop-loss", node: "230:299" },
];

/*
 * NOT IN THIS SECTION, and that is the frame's choice rather than an omission
 * of mine: gemel-lehashkaa-mul-heshbon-mishar and broker-zar-tofes-867. Seven
 * of the nine posts appear here; those two appear on /posts only.
 */
