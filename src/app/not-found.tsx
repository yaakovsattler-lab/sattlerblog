import Link from "next/link";
import Img from "@/components/Img";

export const metadata = { title: "העמוד לא נמצא" };

/*
 * 404 - Figma 522:217, read with get_design_context (601:716 for the layout).
 *
 * The frame's whole idea is that it looks like a scrap of paper: a dashed
 * amber border rotated -2deg, the button rotated +3deg, and the character
 * rotated 7deg overlapping it from the left. Those rotations ARE the design,
 * so they are reproduced rather than tidied away.
 *
 * Every rotation is a transform, so none of them can move anything around
 * them, and all three are dropped under prefers-reduced-motion... no: they are
 * static, not motion, so they stay. What is dropped is nothing.
 */
export default function NotFound() {
  return (
    <main className="e404">
      <div className="e404__inner" data-node-id="601:716">
        <div className="e404__scrap" data-node-id="530:259">
          <span className="e404__frame" data-node-id="522:241" aria-hidden="true" />
          <h1 className="e404__text" data-node-id="522:242">
            העמוד הזה לא קיים. קורה.
            <br />
            גם אני לפעמים מחפש כסף במקומות שהוא לא נמצא בהם...
          </h1>
          <Link className="e404__cta" href="/" data-node-id="522:243">
            קחו אותי הביתה
          </Link>
        </div>

        <div className="e404__art" data-node-id="601:715">
          <Img
            name="error-404-scene"
            fallback="/brand/error-404-scene.png"
            alt=""
            width={920}
            height={956}
            sizes="(max-width: 1023px) 320px, 920px"
            priority
          />
        </div>
      </div>
    </main>
  );
}
