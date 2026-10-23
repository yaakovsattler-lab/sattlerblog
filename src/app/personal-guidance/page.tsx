import Link from "next/link";
import Reveal from "@/components/Reveal";
import { GUIDANCE } from "@/data/personal-guidance";

export const metadata = { title: "ליווי אישי" };

/*
 * "ליווי אישי" - Figma 407:413, read with get_design_context.
 * White page, 100px top / 130px bottom, 36px between blocks, a 610px centred
 * 52px title, a 680px intro, three fact rows, the guarantee line and a pill.
 *
 * In each fact row (448:223) the frame has the VALUE on the left and the bold
 * LABEL on the right, so under dir=rtl the label is the first child.
 */
export default function Page() {
  return (
    <main className="guidance">
      <Reveal>
        <h1 className="guidance__title" data-node-id="448:218">
          {GUIDANCE.title}
        </h1>
      </Reveal>

      <Reveal className="guidance__intro" as="div" delay={60}>
        {GUIDANCE.intro.map((line) => (
          <p key={line.slice(0, 20)}>{line}</p>
        ))}
      </Reveal>

      <Reveal className="guidance__facts-wrap" as="div" delay={100}>
        <dl className="guidance__facts" data-node-id="448:222">
          {GUIDANCE.facts.map((fact) => (
            <div className="guidance__fact" key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal delay={140}>
        <p className="guidance__guarantee" data-node-id="448:232">
          {GUIDANCE.guarantee}
        </p>
      </Reveal>

      <Reveal delay={180}>
        <Link className="guidance__cta" href={GUIDANCE.cta.href} data-node-id="448:233">
          {GUIDANCE.cta.label}
        </Link>
      </Reveal>
    </main>
  );
}
