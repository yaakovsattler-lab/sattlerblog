import Img from "@/components/Img";
import Reveal from "@/components/Reveal";
import { COMMUNITY } from "@/data/community";
import { WHATSAPP_GROUP_URL } from "@/data/site";

/*
 * הקהילה - Figma 25:24 / 149:221.
 *
 * RTL: the frame draws the green plate and the illustration on the left and
 * the copy on the right, so the copy is the FIRST child here. The doodles
 * (275:662/666/664/670) are absolutely positioned decoration and keep the
 * frame's physical left/top offsets.
 *
 * The CTA is a real link since 19.09: the group URL arrived from Elyakim and
 * lives once in site.ts. The disabled branch below is kept on purpose - if the
 * URL is ever cleared the button goes inert again rather than linking nowhere.
 *
 * The illustration node is still named "image pending upload", but it does
 * carry a rendered 2048x1536 asset, so it is used rather than boxed out - see
 * the note in the report. Swapping it later is one file in public/brand.
 */
export default function Community() {
  return (
    <section className="cmty" data-node-id="25:24" aria-labelledby="cmty-title">
      <Reveal className="cmty__card" as="div">
        <div className="cmty__copy" data-node-id="25:25">
          <div className="cmty__intro" data-node-id="149:225">
            <h2 className="cmty__title" id="cmty-title" data-node-id="25:26">
              {COMMUNITY.title}
            </h2>
            <div className="cmty__lead" data-node-id="25:27">
              {COMMUNITY.lead.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <ul className="cmty__points" data-node-id="25:28">
            {COMMUNITY.points.map((point) => (
              <li className="cmty__point" key={point}>
                {/* frame order is text then mark (L to R), so RTL writes the
                    mark first and it lands at the right, as drawn */}
                <img
                  className="cmty__sparkle"
                  src="/brand/community/sparkle.svg"
                  alt=""
                  width={14}
                  height={14}
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div className="cmty__action" data-node-id="200:278">
            <p className="cmty__count" data-node-id="200:277">
              {COMMUNITY.countPrefix}
              <strong>{COMMUNITY.countStrong}</strong>
            </p>
            {/* 275:670 - the hand-drawn arrow points AT the CTA, so it is
                anchored to the action block rather than to the card. Card-
                relative coordinates only line up while the card is exactly the
                frame's height, and ours is not: Almoni is wider than the
                frame's Rubik and wraps one extra line. */}
            <img
              className="cmty__doodle cmty__doodle--arrow"
              src="/brand/community/arrow.svg"
              alt=""
              aria-hidden="true"
              data-node-id="275:670"
            />
            <div className="cmty__cta-wrap" data-node-id="149:232">
              {WHATSAPP_GROUP_URL ? (
                <a
                  className="cta-primary cmty__cta"
                  href={WHATSAPP_GROUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src="/brand/community/whatsapp.svg"
                    alt=""
                    width={25}
                    height={25}
                  />
                  {COMMUNITY.ctaLabel}
                </a>
              ) : (
                /* group URL is TBD in approved-site-copy.md - inert, not fake */
                <button className="cta-primary cmty__cta" type="button" disabled>
                  <img
                    src="/brand/community/whatsapp.svg"
                    alt=""
                    width={25}
                    height={25}
                  />
                  {COMMUNITY.ctaLabel}
                </button>
              )}
              <p className="cmty__note" data-node-id="149:234">
                {COMMUNITY.note.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </p>
            </div>
          </div>
        </div>

        {/* 275:666 and 275:664 are vector copies of shapes that are already
            inside the illustration - they exist to draw those edges crisply on
            top of the raster. They therefore live INSIDE the art box and are
            positioned against it, offset by the frame's own coordinates minus
            the art's origin (45, 57.75). Anchored to the card instead, they
            drift off the artwork the moment the card is not 503.5 tall. */}
        <div className="cmty__art" data-node-id="72:8">
          {/* 275:662 - the slim colour block behind the figure. It belongs to
              the same composition as the masks and the illustration, so it is
              placed against the ART, not the card: the frame puts it 25px left
              of and 40.75px above the art's top-left corner. */}
          <span className="cmty__plate" data-node-id="275:662" aria-hidden="true" />
          <Img
            name="community-scene"
            fallback="/brand/community-scene.png"
            alt=""
            width={517}
            height={388}
            sizes="(max-width: 1023px) 100vw, 517px"
          />
          <img
            className="cmty__doodle cmty__doodle--bubble"
            src="/brand/community/rect5.svg"
            alt=""
            aria-hidden="true"
            data-node-id="275:666"
          />
          <img
            className="cmty__doodle cmty__doodle--squiggle"
            src="/brand/community/vector5.svg"
            alt=""
            aria-hidden="true"
            data-node-id="275:664"
          />
        </div>

      </Reveal>
    </section>
  );
}
