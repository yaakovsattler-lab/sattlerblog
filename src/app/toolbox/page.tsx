import Reveal from "@/components/Reveal";
import ToolCard from "@/components/ToolCard";
import {
  TOOLBOX_HEADER,
  TOOLBOX_INTRO,
  TOOLBOX_MISSING,
  TOOLS,
} from "@/data/toolbox";

export const metadata = { title: "ארגז כלים" };

/*
 * "ארגז הכלים" - Figma 407:364, read with get_design_context.
 * White page, 90px top / 110px bottom, 56px between blocks. Header, intro,
 * a 1312px row of three 392px cards with a 5px black border, then the
 * "חסר לכם כלי?" panel.
 */
export default function Page() {
  return (
    <main className="toolbox">
      <Reveal className="toolbox__header" as="div">
        <h1 className="toolbox__title" data-node-id="440:254">
          {TOOLBOX_HEADER.title}
        </h1>
        <p className="toolbox__subtitle" data-node-id="440:255">
          {TOOLBOX_HEADER.subtitle}
        </p>
      </Reveal>

      <Reveal className="toolbox__intro" as="div" delay={60}>
        {TOOLBOX_INTRO.map((line) => (
          <p key={line.slice(0, 20)}>{line}</p>
        ))}
      </Reveal>

      {/* 440:259 draws the cards left to right as household, credit, gemel.
          dir=rtl puts the FIRST child at the right, so the list is reversed
          here to land them where the frame has them. The DOM order is then the
          RTL reading order too - rightmost first - so tab order agrees.

          CONSEQUENCE FOR TAL: under 1024 the cards stack, and the stack
          therefore reads gemel, credit, household. That follows from the
          frame - in an RTL design the rightmost card is the first one read -
          but if the intended first tool is ניהול משק בית, the FRAME has it on
          the wrong side and the fix belongs there, not here. Not changed
          unilaterally; the build matches the frame. */}
      <ul className="toolbox__cards" data-node-id="440:259">
        {[...TOOLS].reverse().map((tool, i) => (
          <Reveal as="li" key={tool.slug} delay={i * 60} className="toolbox__card-wrap">
            <ToolCard tool={tool} />
          </Reveal>
        ))}
      </ul>

      <Reveal delay={80} className="toolbox__missing-wrap" as="div">
        <section className="toolbox__missing" data-node-id="440:302">
          <h2 className="toolbox__missing-title">{TOOLBOX_MISSING.title}</h2>
          <p className="toolbox__missing-body">{TOOLBOX_MISSING.body}</p>
        </section>
      </Reveal>
    </main>
  );
}
