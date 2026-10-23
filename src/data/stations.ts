/*
 * One object per station, plus the posts they reference. Shaped the way the
 * Sanity documents will be shaped, so wiring Sanity later is a data-source swap
 * and not a refactor:
 *
 *   lifeStage  { order, slug, tabLabel, icon, title, blurb, cta }
 *   post       { slug, title, description, lifeStage[], isStarterPick }
 *
 * The two are joined at read time by `relatedFor()`, never embedded in each
 * other - a post belongs to one or more stations, and that edge lives on the
 * post, which is where Sanity will put it too.
 *
 * `outgoingClip` is the one field with no Sanity equivalent yet. It is the media
 * edge between this station and the next, so it belongs on the station that
 * starts it. Station 8 has none - it is the end of the section.
 *
 * COPY PROVENANCE - nothing here was written by me:
 *   station titles / blurbs   files/00-Brief/approved-site-copy.md section 3
 *   station 8 + its CTA       same file, "התחנה השמינית" block
 *   tab labels                site/src/content/homepage.ts STATIONS[].tabLabel
 *                             (station 8 from site/src/content/posts.ts
 *                              LIFE_STAGES order 8, slug "not-sure")
 *   per-station CTA label     Figma 148:120 node 191:485
 *   post titles + summaries   site/src/content/posts.ts, which took them from
 *                             files/01-Content/posts-new/ frontmatter
 *   post -> station tagging   the posts' own "שלב חיים" field, unchanged
 */

export type Post = {
  slug: string;
  title: string;
  description: string;
  /** station slugs, primary first */
  lifeStage: string[];
  isStarterPick: boolean;
};

export type Station = {
  order: number;
  slug: string;
  tabLabel: string;
  /** file under public/icons - null for station 8, which has no icon asset yet */
  icon: string | null;
  title: string;
  blurb: string;
  cta: { label: string; href: string };
  /** folder under public/frames - null on the last station */
  outgoingClip: string | null;
};

export const POSTS: Post[] = [
  {
    slug: "pkudat-stop-loss",
    title: 'הפקודה שכולנו קוראים לה "סטופ לוס", ובבורסה שלנו היא בכלל לא קיימת',
    description:
      "מישהי בקבוצה שאלה לא מזמן איך עובדות הפקודות בחשבון המסחר, ואחד החבר'ה כאן נתן לה תשובה מסודרת ויפה: לימיט, מרקט, וסטופ לוס.",
    lifeStage: ["investing"],
    isStarterPick: false,
  },
  {
    slug: "keren-kaspit-mas",
    title: "25% מס נשמע יותר מ-15%. אז למה דווקא הקרן הכספית מנצחת את הפיקדון?",
    description:
      'אחד החבר\'ה כאן כתב על קרן כספית משפט שנתקע לי בראש: "אומנם מקבלים פירורים, אבל יותר טוב מכלום". 🍞',
    lifeStage: ["not-sure"],
    isStarterPick: true,
  },
  {
    slug: "dmey-nihul-pensia",
    title: "חבר כאן בקבוצה הוסיף לעצמו 150 אלף שקל לפנסיה בשיחת טלפון אחת",
    description: "לפני כמה חודשים אחד החבר'ה כאן כתב הודעה שפתחה במשפט הזה",
    lifeStage: ["started-working"],
    isStarterPick: true,
  },
  {
    slug: "halvaa-al-heshbon-hishtalmut",
    title: "לקחתי הלוואה על חשבון קרן ההשתלמות. הכסף שם ממשיך לעבוד?",
    description:
      'מישהו כאן שאל שאלה מצוינת, וסיים אותה במשפט הכי כנה שיש: "שואל כי הצ\'אט קצת מבלבל אותי בנושא". 😅',
    lifeStage: ["not-sure"],
    isStarterPick: false,
  },
  {
    slug: "halvaa-lelo-ribit-miluim",
    title:
      '"הלוואה ללא ריבית למילואימניקים" - בדקתי מה באמת קיים, וגם מה עושים איתה',
    description: "לפני כמה שבועות היה כאן שרשור שגרם לי לעצור.",
    lifeStage: ["reserve-duty"],
    isStarterPick: false,
  },
  {
    slug: "hisachon-lechol-yeled",
    title:
      "חיסכון לכל ילד - 58 שקל בחודש, וכמעט כל מה שחשבתם שאפשר לעשות שם, אי אפשר",
    description:
      'היה כאן שרשור יפה על "חיסכון לכל ילד". אחד החבר\'ה שאל אם משנה באיזה בית השקעות פותחים.',
    lifeStage: ["baby"],
    isStarterPick: true,
  },
  {
    slug: "gemel-lehashkaa-mul-heshbon-mishar",
    title: "קופת גמל להשקעה לילד או חשבון מסחר? ההבדל האמיתי הוא לא מה שחשבתם",
    description:
      "זה אולי השרשור שחזר כאן הכי הרבה פעמים בשנה האחרונה, בגרסאות שונות: קופת גמל להשקעה לילד, או חשבון מסחר עצמאי?",
    lifeStage: ["baby", "investing"],
    isStarterPick: false,
  },
  {
    slug: "broker-zar-tofes-867",
    title: "הברוקר הזול בעולם יכול לעלות לכם ביוקר, ולא בגלל העמלות",
    description:
      "אחד החבר'ה כאן כתב לפני כמה חודשים סקירה מפורטת ויסודית על בית השקעות אחד.",
    lifeStage: ["investing"],
    isStarterPick: false,
  },
  {
    slug: "maslul-hekerut-shenigmar",
    title:
      "המחיר שלכם עלה ואף אחד לא הודיע לכם. תזכורת ביומן שווה כמה מאות שקלים בשנה",
    description: "אחד החבר'ה כאן שיתף טיפ קטן, והוא כל כך פשוט שכמעט פספסתי אותו.",
    lifeStage: ["moved-in-together", "not-sure"],
    isStarterPick: true,
  },
];

const CTA_POSTS = "עברו לכל הפוסטים בנושא"; // Figma 191:485

export const STATIONS: Station[] = [
  {
    order: 1,
    slug: "started-working",
    tabLabel: "בעבודה",
    icon: "stage-icon-work.webp",
    title: "התחלתי לעבוד",
    blurb:
      "תלוש שכר שאף אחד לא לימד אותך לקרוא, פנסיה שנפתחה בלי ששאלו אותך, וקרן השתלמות ששווה יותר ממה שנדמה לך.",
    cta: { label: CTA_POSTS, href: "/posts?stage=started-working" },
    outgoingClip: "1-to-2",
  },
  {
    order: 2,
    slug: "reserve-duty",
    tabLabel: "במילואים",
    icon: "stage-icon-reserve.webp",
    title: "חזרתי ממילואים",
    blurb:
      "מה מגיע לכם בפועל, איך לא לפספס את זה, ומה עושים עם הכסף שנכנס אחרי חודשים בחוץ.",
    cta: { label: CTA_POSTS, href: "/posts?stage=reserve-duty" },
    outgoingClip: "2-to-3",
  },
  {
    order: 3,
    slug: "moved-in-together",
    tabLabel: "גרים יחד",
    icon: "stage-icon-together.webp",
    title: "עברנו לגור יחד",
    blurb:
      "חשבון משותף או נפרד, מי משלם על מה, ואיך מדברים על כסף בלי שזה יהפוך לריב.",
    cta: { label: CTA_POSTS, href: "/posts?stage=moved-in-together" },
    outgoingClip: "3-to-4",
  },
  {
    order: 4,
    slug: "baby",
    tabLabel: "הורים טריים",
    icon: "stage-icon-parents.webp",
    title: "נולד לנו ילד",
    blurb:
      "חיסכון לכל ילד ומה באמת אפשר לעשות שם, קצבאות, וכמה עולה באמת הדבר הכי משמח שקרה לכם.",
    cta: { label: CTA_POSTS, href: "/posts?stage=baby" },
    outgoingClip: "4-to-5",
  },
  {
    order: 5,
    slug: "buying-apartment",
    tabLabel: "קונים דירה",
    icon: "stage-icon-apartment.webp",
    title: "קונים דירה",
    blurb:
      "הון עצמי, משכנתא בלי לקבל התקף, ומה שכדאי לדעת לפני שחותמים על העסקה הכי גדולה בחיים.",
    cta: { label: CTA_POSTS, href: "/posts?stage=buying-apartment" },
    outgoingClip: "5-to-6",
  },
  {
    order: 6,
    slug: "investing",
    tabLabel: "משקיעים",
    icon: "stage-icon-investing.webp",
    title: "מתחילים להשקיע",
    blurb: "איפה פותחים, כמה זה עולה, ולמה זה הרבה פחות מפחיד ממה שנדמה לכם.",
    cta: { label: CTA_POSTS, href: "/posts?stage=investing" },
    outgoingClip: "6-to-7",
  },
  {
    order: 7,
    slug: "side-business",
    tabLabel: "עסק מהצד",
    icon: "stage-icon-side-business.webp",
    title: "פתחתי עסק בצד",
    blurb:
      "עוסק זעיר, מה מדווחים ומתי, ולמה הבירוקרטיה כבר לא הסיפור שהיא הייתה.",
    cta: { label: CTA_POSTS, href: "/posts?stage=side-business" },
    outgoingClip: "7-to-8",
  },
  {
    order: 8,
    slug: "not-sure",
    tabLabel: "לא בטוח",
    icon: null,
    title: "לא בטוח איפה אתם? זה בסדר גמור",
    blurb:
      "רוב האנשים לא נמצאים בדיוק בשלב אחד. אם אתם פשוט רוצים לעשות סדר בכסף - תתחילו כאן, זה המסלול שבניתי בשביל זה.",
    cta: { label: "קח אותי להתחלה", href: "/start" },
    outgoingClip: null,
  },
];

/** Static, never swaps - the grey badge above the per-station heading. */
export const SECTION_BADGE = "מה קורה אצלכם עכשיו?"; // Figma 148:123

/** Figma 191:483 shows exactly three cards. */
export const RELATED_COUNT = 3;

/*
 * Same rule the built site already uses (site/src/components/LifeStages.tsx):
 * the station's own posts first, then starter picks, so the row always shows
 * the three cards the frame shows. Five of the eight stations have fewer than
 * three posts actually tagged to them - that is a content gap in the real
 * corpus, listed in the delivery note, not papered over here.
 */
export function relatedFor(slug: string): Post[] {
  const own = POSTS.filter((p) => p.lifeStage.includes(slug));
  const fill = POSTS.filter(
    (p) => !p.lifeStage.includes(slug) && p.isStarterPick
  );
  return [...own, ...fill].slice(0, RELATED_COUNT);
}
