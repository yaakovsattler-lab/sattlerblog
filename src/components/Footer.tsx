/*
 * Footer - Figma 578:1512 / 578:1511, read with get_design_context.
 *
 * From the frame: the character (572:615) sits at the far end above the strip
 * and overlaps it; an accent ticker (572:616) 56px tall in #d9531e with 16px
 * bold #fbfaf5 text; then the dark block (572:618) at #1a1a1a, 340px, with a
 * #404040 hairline across the top inset 64px, three link columns, the brand
 * name at 22px, the two-paragraph disclaimer, and the credit line.
 *
 * DECISIONS, flagged for Tal:
 *  - The frame draws the ticker as one 2,600px line of repeated text, which is
 *    a still of a marquee. It is built as an actual marquee: two identical
 *    halves translated by -50%, which is the only way to loop without a seam.
 *    It stops completely under prefers-reduced-motion, and it is aria-hidden
 *    because a screen reader should not read the same six words forever - the
 *    same claim is in the disclaimer as real text.
 *  - Column headings are 13px and links 14px in the frame, both under the 15px
 *    floor, so they render at 15px and the columns are wider than drawn.
 */

import Img from "@/components/Img";
import {
  BRAND_NAME,
  FOOTER_COLUMNS,
  FOOTER_CREDIT,
  FOOTER_DISCLAIMER,
  FOOTER_TICKER,
} from "@/data/site";

function Ticker() {
  /* One run is the whole list once; the track is two identical runs and moves
     by exactly 50%, which is the only arrangement that loops without a seam.
     The DURATION is derived from the item count so the SPEED stays constant:
     when Goldi's copy took the list from 3 items to 19 with the duration
     fixed, the strip silently got six times faster and unreadable. */
  const run = `${FOOTER_TICKER.join("   ·   ")}   ·   `;
  return (
    <div className="ticker" data-node-id="572:616" aria-hidden="true">
      <div
        className="ticker__track"
        style={{ "--ticker-count": FOOTER_TICKER.length } as React.CSSProperties}
      >
        <span className="ticker__run">{run}</span>
        <span className="ticker__run">{run}</span>
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="footer" data-node-id="578:1512">
      <Img
        name="footer-character"
        fallback="/brand/footer-character.png"
        alt=""
        className="footer__character"
        width={544}
        height={294}
        sizes="(max-width: 1023px) 260px, 462px"
        maxWidth={544}
      />
      <Ticker />
      <div className="footer__block" data-node-id="572:618">
        <div className="footer__inner">
          {/* dir=rtl puts the first child at the RIGHT. The frame has the
              brand block on the right (572:635 at the frame's right edge) and
              the three link columns on the left (572:620 at left 64), so the
              brand comes first. */}
          <div className="footer__brand">
            <p className="footer__brand-name">{BRAND_NAME}</p>
            {FOOTER_DISCLAIMER.map((line) => (
              <p className="footer__disclaimer" key={line.slice(0, 24)}>
                {line}
              </p>
            ))}
          </div>
          <div className="footer__columns">
            {FOOTER_COLUMNS.map((col) => (
              <nav className="footer__col" key={col.title} aria-label={col.title}>
                <h2 className="footer__col-title">{col.title}</h2>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <a className="footer__link" href={link.href}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        {/*
          The studio credit. The Latin name sits inside a Hebrew sentence, so it
          is wrapped in <bdi>: without it the bidirectional algorithm reorders
          the run against the RTL paragraph and "Elyagol studio" can land on the
          wrong side of the line or lose its trailing word. Checked by looking
          at the rendered line, not by trusting the markup.
        */}
        <p className="footer__credit">
          {FOOTER_CREDIT.text}{" "}
          <a
            className="footer__credit-link"
            href={FOOTER_CREDIT.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <bdi>{FOOTER_CREDIT.studio}</bdi>
          </a>
        </p>
      </div>
    </footer>
  );
}
