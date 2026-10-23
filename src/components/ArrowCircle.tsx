/*
 * The arrow-circle - Figma 530:1467 / 530:1463.
 *
 * ONE implementation. This mark appears on the blog cards, the start-here
 * cards, the homepage toolbox cards and the life-stages cards, and it used to
 * be four separate pieces of markup that had drifted apart: 28px against 34px
 * against 24px, a 1px border against 1.5px, three rotated and one not, and one
 * of them a different glyph altogether. Elyakim saw the result on one page and
 * was right that it is a component.
 *
 * 530:1467 is the canonical treatment: a circle with a white fill and a 1.5px
 * ink border, holding "←", the whole thing rotated 45 degrees so the arrow
 * points up and out. `size` is the only thing a caller may vary, because the
 * frames genuinely draw it at 28px on cards and 34px on the toolbox card.
 *
 * The glyph keeps --type-min rather than the frame's 13px: it is a text node
 * and the site's floor applies to it like any other.
 */
export default function ArrowCircle({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`arrow-circle ${className}`.trim()}
      style={size === 28 ? undefined : { ["--arrow-size" as string]: `${size}px` }}
      aria-hidden="true"
      data-node-id="530:1463"
    >
      ←
    </span>
  );
}
