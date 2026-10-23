import Link from "next/link";
import Img from "@/components/Img";
import Reveal from "@/components/Reveal";
import { MY_STORY } from "@/data/my-story";

export const metadata = { title: "הסיפור שלי" };

/*
 * "הסיפור שלי" - Figma 407:315, read with get_design_context.
 *
 * From the frame: white page, 70px top / 100px bottom, 40px between blocks.
 * A 56px Black centred title (440:218), then a 1178px row (599:571) with the
 * illustration on the LEFT and the 680px text column on the RIGHT, then a
 * black pill CTA (440:250).
 *
 * dir=rtl puts the first child at the RIGHT, so the text column comes first
 * and the illustration falls to the left, which is where the frame has it.
 *
 * The illustration (599:574) deliberately overflows its 380x425 panel
 * (599:573) - the figure is 772px tall inside a 425px box and breaks out of
 * the bottom. That is the frame's own composition, not a mistake, so the panel
 * does not clip.
 *
 * GAP for Tal, already item 22 on the client status: this illustration is a
 * REALISTIC character with a face and a beard, not the scribble head the rest
 * of the site uses. It ships as the frame's asset; the style question is his.
 */
export default function Page() {
  return (
    <main className="story">
      <Reveal>
        <h1 className="story__title" data-node-id="440:218">
          {MY_STORY.title}
        </h1>
      </Reveal>

      <div className="story__row" data-node-id="599:571">
        <Reveal className="story__content" as="div">
          {MY_STORY.blocks.map((block, i) => (
            <div className="story__block" key={i}>
              {block.map((line) => (
                <p key={line.slice(0, 24)}>{line}</p>
              ))}
            </div>
          ))}
        </Reveal>

        <Reveal className="story__figure" as="div" delay={80}>
          <span className="story__panel" data-node-id="599:573" aria-hidden="true" />
          <Img
            name="my-story-hero"
            fallback="/brand/my-story-hero.png"
            alt={MY_STORY.illustrationAlt}
            className="story__illustration"
            width={380}
            height={772}
            sizes="(max-width: 1023px) 260px, 380px"
          />
        </Reveal>
      </div>

      <Reveal delay={120}>
        <Link className="story__cta" href={MY_STORY.cta.href} data-node-id="440:250">
          {MY_STORY.cta.label}
        </Link>
      </Reveal>
    </main>
  );
}
