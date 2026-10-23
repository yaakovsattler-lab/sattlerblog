/*
 * A post's address is made from its title. Hebrew letters are kept (a Hebrew
 * address reads as Hebrew in the browser bar); punctuation is dropped, spaces
 * become hyphens, and it is cut at a word boundary so a long title does not
 * make a 200-character URL. The nine migrated posts keep their existing
 * English addresses - this only applies to new posts.
 */
export function slugify(input: string): string {
  const words = input
    .normalize("NFC")
    .replace(/[֑-ׇ]/g, "") /* niqqud and cantillation */
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim()
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean);
  let out = "";
  for (const w of words) {
    const next = out ? `${out}-${w}` : w;
    if (next.length > 60) break;
    out = next;
  }
  return out || words.join("-").slice(0, 60);
}
