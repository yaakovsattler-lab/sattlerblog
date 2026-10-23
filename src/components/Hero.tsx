/*
 * Hero - Figma 5:4, read with get_design_context.
 *
 * From the frame: #fcfcfc, 140px top / 120px bottom, 64px inline end; the
 * character (5:5) hard against the far edge at 202x248, the copy column (5:7)
 * 705px wide and right aligned. Headline 116px at line-height 0.86 on two
 * real lines (5:9, 5:10) with the coin mark (202:287) sitting at 36px against
 * the second line. Blurb 20px/1.4 (5:11). CTA 18px ExtraBold on #0b0b0b,
 * 32px/18px padding, 14px radius - the frame's own "Button - כפתור" style.
 *
 * Two things the frame does that are not reproducible as text, both flagged:
 *  - 193:501 is a baked image with the words "בוא תשמע סיפור" inside it. It
 *    ships as the exported asset, so that copy is not live text and cannot be
 *    edited in the CMS or read by a screen reader - the alt carries it.
 *  - 5:14 is 14px, under the 15px floor, so it renders at 15px.
 *
 * WIDE-SCREEN DECISION, flagged for Tal (18.09). The frame anchors the
 * character to the viewport edge at 1440. Above the design width it now moves
 * with the page container instead of staying glued to the screen edge. The
 * reason is the drawing itself: the hand waves toward the copy and the speech
 * bubble points at it, and at 2560 a character stuck to the far edge is more
 * than 500px away from the sentence it is talking to, gesturing at empty
 * paper. Keeping it glued would be the other legitimate answer and is one CSS
 * line - see .hero in globals.css.
 */

import { HERO } from "@/data/site";
import Reveal from "@/components/Reveal";
import Img from "@/components/Img";

export default function Hero() {
  return (
    <section className="hero" data-node-id="5:4" aria-labelledby="hero-title">
      {/* dir=rtl puts the first child at the RIGHT. The copy column is first
          because the frame has it on the right and the character hard against
          the left edge. No row-reverse - same trap as the life-stages row. */}
      <div className="hero__copy">
        <Reveal>
          <h1 className="hero__title" id="hero-title">
            <span className="hero__line">{HERO.headline[0]}</span>
            <span className="hero__line hero__line--second">
              {HERO.headline[1]}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hero__coin" src="/brand/coin.svg" alt="" width={36} height={36} />
            </span>
          </h1>
        </Reveal>
        <Reveal delay={80}>
          <p className="hero__blurb">{HERO.blurb}</p>
        </Reveal>
        <Reveal delay={160} className="hero__action">
          <a className="cta-primary" href={HERO.cta.href}>
            {HERO.cta.label}
          </a>
          <p className="hero__note">{HERO.ctaNote}</p>
        </Reveal>
      </div>

      <Reveal className="hero__character">
        <Img
          name="hero-hand-bubble"
          fallback="/brand/hero-hand-bubble.png"
          alt={HERO.characterAlt}
          className="hero__hand"
          width={201}
          height={116}
          sizes="(max-width: 1023px) 159px, 201px"
          priority
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="hero__shirt"
          src="/brand/hero-shirt.svg"
          alt=""
          width={139}
          height={139}
        />
      </Reveal>
    </section>
  );
}
