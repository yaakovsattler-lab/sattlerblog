import Link from "next/link";
import Reveal from "@/components/Reveal";
import { WHATSAPP_GROUP_URL } from "@/data/site";
import WhatsAppAsk from "@/components/WhatsAppAsk";
import {
  WHATSAPP_CHAT_NAME,
  WHATSAPP_CTA_LABEL,
  WHATSAPP_QUESTIONS,
  WHATSAPP_SUBTITLE,
  WHATSAPP_TITLE,
} from "@/data/whatsapp-questions";

/*
 * "שאלות מהוואטסאפ" - Figma 170:155.
 *
 * Built as markup and data, not as the 1,445px flattened export. Each bubble
 * is a real link with real text, so the section is searchable, reflows on a
 * phone, and does what the subtitle promises ("תלחצו על אחת").
 *
 * RTL. In this file the generated child order is the visual left-to-right
 * order, so every row below is written in the REVERSE of the frame's order:
 * the status icons before the clock, the back chevron before the chat name,
 * the read-receipt ticks before the timestamp. Asserted in check-rtl.mjs.
 */

function Ticks() {
  /* 149:335, inline rather than a downloaded SVG - it is 14x7 of flat colour */
  return (
    <svg className="waq__ticks" viewBox="0 0 16 9" aria-hidden="true">
      <path
        d="M1 5.2 3.4 7.6 9 1.4M6.6 5.6 8.2 7.6 14.8 1.4"
        fill="none"
        stroke="#4f6f52"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Bubble({ q }: { q: (typeof WHATSAPP_QUESTIONS)[number] }) {
  const inner = (
    <>
      <span className="waq__text">{q.text}</span>
      <span className="waq__meta">
        {/* frame order is time then ticks, so RTL writes ticks first */}
        <Ticks />
        <span className="waq__time">{q.time}</span>
      </span>
    </>
  );

  const cls = `waq__bubble${q.highlighted ? " is-highlighted" : ""}`;

  return (
    <li className="waq__row" data-node-id={q.node}>
      {q.href ? (
        <Link className={`${cls} waq__bubble--link`} href={q.href}>
          {inner}
        </Link>
      ) : (
        /* no approved destination yet - a bubble, not a link that goes nowhere */
        <span className={cls}>{inner}</span>
      )}
    </li>
  );
}

export default function WhatsAppQuestions() {
  return (
    <section className="waq" data-node-id="170:155" aria-labelledby="waq-title">
      <div className="waq__plate" data-node-id="12:2">
        <Reveal className="waq__header" as="div">
          <h2 className="waq__title" id="waq-title" data-node-id="12:4">
            {WHATSAPP_TITLE}
          </h2>
          <p className="waq__subtitle" data-node-id="12:5">
            {WHATSAPP_SUBTITLE}
          </p>
        </Reveal>

        <Reveal className="waq__stack" as="div" delay={80}>
          <div className="waq__phone" data-node-id="149:258">
            <div className="waq__chrome" data-node-id="149:259">
              <div className="waq__status" data-node-id="149:260" aria-hidden="true">
                {/* frame: clock left, icons right -> RTL writes icons first */}
                <span className="waq__status-icons">
                  <span className="waq__signal">
                    <i /><i /><i /><i />
                  </span>
                  <svg className="waq__wifi" viewBox="0 0 16 11">
                    <path
                      d="M8 9.4 1.2 3.6a10 10 0 0 1 13.6 0L8 9.4Z"
                      fill="none"
                      stroke="#0b0b0b"
                      strokeWidth="1.3"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="waq__battery">
                    <span />
                  </span>
                </span>
                <span className="waq__clock">9:41</span>
              </div>

              <div className="waq__nav" data-node-id="149:273">
                {/* frame: video, phone, spacer, name, avatar, back (L->R) */}
                <span className="waq__back" aria-hidden="true">
                  ›
                </span>
                <img
                  className="waq__avatar"
                  src="/brand/community/chat-avatar.svg"
                  alt=""
                  width={47}
                  height={47}
                  data-node-id="149:467"
                />
                <span className="waq__chat-name" data-node-id="149:278">
                  {WHATSAPP_CHAT_NAME}
                </span>
                <span className="waq__nav-spacer" />
                <svg className="waq__nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.5.55 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11 11 0 0 0 .55 3.5 1 1 0 0 1-.25 1l-2.2 2.3Z"
                    fill="#0b0b0b"
                  />
                </svg>
                <svg className="waq__nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm15 3.5 3-2v9l-3-2v-5Z"
                    fill="#0b0b0b"
                  />
                </svg>
              </div>
            </div>

            <ul className="waq__messages" data-node-id="149:305">
              {WHATSAPP_QUESTIONS.map((q) => (
                <Bubble key={q.node} q={q} />
              ))}
            </ul>

            <WhatsAppAsk />
          </div>

          {WHATSAPP_GROUP_URL ? (
            <a
              className="cta-primary waq__cta"
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {WHATSAPP_CTA_LABEL}
            </a>
          ) : (
            /* the group URL is TBD in approved-site-copy.md - a disabled button
               rather than a link to a guessed invite */
            <button className="cta-primary waq__cta" type="button" disabled>
              {WHATSAPP_CTA_LABEL}
            </button>
          )}
        </Reveal>
      </div>
    </section>
  );
}
