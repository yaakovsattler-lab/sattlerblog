import Link from "next/link";
import Img from "@/components/Img";
import ArrowCircle from "@/components/ArrowCircle";
import Reveal from "@/components/Reveal";
import { TOOLBOX_HOME, TOOLS } from "@/data/toolbox";

/*
 * ארגז כלים on the homepage - Figma 213:408 / 200:142.
 *
 * The three tools are the SAME data the /toolbox page uses - `TOOLS` in
 * src/data/toolbox.ts - with three extra fields for this card (a different
 * illustration crop, its plate colour, and the label). Nothing is duplicated:
 * change a tool's title once and both pages follow.
 *
 * Card order follows the frame left to right (household, credit, gemel), so
 * under dir=rtl the list is reversed, exactly as on /toolbox.
 */
export default function ToolboxHome({ postCount }: { postCount: number }) {
  return (
    <section className="tbh" data-node-id="200:142" aria-labelledby="tbh-title">
      <Reveal className="tbh__header" as="div">
        <h2 className="tbh__title" id="tbh-title" data-node-id="200:148">
          {TOOLBOX_HOME.title}
        </h2>
        <p className="tbh__subtitle" data-node-id="200:149">
          {TOOLBOX_HOME.subtitle}
        </p>
      </Reveal>

      <ul className="tbh__cards" data-node-id="200:209">
        {[...TOOLS].reverse().map((tool, i) => (
          <Reveal as="li" key={tool.slug} delay={i * 60}>
            <Link className="tbh__card" href="/toolbox" data-node-id="200:210">
              <span className="tbh__card-body">
                <span className="tbh__card-head" data-node-id="I200:210;149:160">
                  {/* the frame's arrow sits at the LEFT of the title row */}
                  <span className="tbh__card-title">{tool.title}</span>
                  <ArrowCircle size={34} className="tbh__arrow" />
                </span>
                <span className="tbh__card-desc">{tool.description}</span>
                <span className="tbh__card-label">{tool.homeLabel}</span>
              </span>
              <span className="tbh__art" style={{ background: tool.homeTint }}>
                <Img
                  name={tool.homeIllustration}
                  fallback={`/brand/${tool.homeIllustration}.png`}
                  alt=""
                  width={360}
                  height={302}
                  sizes="(max-width: 1023px) 100vw, 360px"
                />
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>

      <Reveal className="tbh__foot" as="div" delay={80}>
        <Link className="cta-primary" href={TOOLBOX_HOME.cta.href}>
          {TOOLBOX_HOME.cta.label}
        </Link>
        <p className="tbh__count" data-node-id="200:279">
          {TOOLBOX_HOME.countTemplate(postCount)}
        </p>
      </Reveal>
    </section>
  );
}
