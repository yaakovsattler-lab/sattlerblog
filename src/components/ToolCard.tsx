"use client";

/*
 * A tool card - Figma 440:260 and its two siblings.
 *
 * The download button is real and honest: no tool file exists in the client
 * folder, so pressing it reveals a marked line saying so instead of pretending
 * to download. The button is NOT disabled, per the standing rule, and the
 * moment `tool.file` is a real path it becomes a plain download link with no
 * other change.
 */

import { useState } from "react";
import Img from "@/components/Img";
import { TOOL_CTA, TOOL_DEEPER, type Tool } from "@/data/toolbox";

export default function ToolCard({ tool }: { tool: Tool }) {
  const [asked, setAsked] = useState(false);

  /* An <article>, not an <li>: the list item is the Reveal wrapper in the page,
     and nesting <li> inside <li> is invalid HTML - React said so as a
     hydration error rather than a layout one, which is why it showed up in the
     console and not on screen. */
  return (
    <article className="tool" data-node-id="440:260">
      <span className="tool__art">
        <Img
          name={tool.illustration}
          fallback={`/brand/${tool.illustration}.png`}
          alt=""
          width={242}
          height={252}
          sizes="(max-width: 1023px) 220px, 242px"
        />
      </span>

      <h2 className="tool__title">{tool.title}</h2>
      <p className="tool__desc">{tool.description}</p>

      {tool.file ? (
        <a className="tool__cta" href={tool.file} download>
          {TOOL_CTA}
        </a>
      ) : (
        <button className="tool__cta" type="button" onClick={() => setAsked(true)}>
          {TOOL_CTA}
        </button>
      )}

      {asked ? (
        <p className="tool__pending" role="status">
          הקובץ עדיין לא הועלה לאתר.
        </p>
      ) : null}

      <ul className="tool__facts" data-node-id="440:266">
        {tool.facts.map((f) => (
          <li key={f.label}>
            <span className="tool__fact-label">{f.label}</span>
            {f.value ? (
              <span className="tool__fact-value">{f.value}</span>
            ) : (
              /* the frame itself prints "{TBD}" here - the value does not
                 exist, so it is shown as a gap and never as an answer */
              <span className="tool__fact-value is-missing" title="חסר תוכן">
                —
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* 440:273 - a label in the frame, with no destination and no page
          behind it. Not made into a link. */}
      <p className="tool__deeper">{TOOL_DEEPER}</p>
    </article>
  );
}
