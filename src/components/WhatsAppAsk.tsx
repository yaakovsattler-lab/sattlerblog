"use client";

/*
 * The "כתבו לי..." field inside the WhatsApp mock - Figma 44:33 / 167:110.
 *
 * Elyakim asked for a real form that behaves like the input it imitates: type,
 * press send or Enter, the field clears, the message joins the thread.
 *
 * WHAT IT HONESTLY IS. Nothing sends. It calls sendCommunityQuestion(), which
 * is the SAME integration point as the contact form - one path, so wiring a
 * service later turns both on at once - and that call always rejects with
 * NOT_CONNECTED today.
 *
 * So the echoed message is NOT dressed as a sent message. A real message in
 * this thread carries the green double ticks; the echo deliberately carries
 * none, sits behind a dashed outline, and is labelled "לא נשלח" with Goldi's
 * not-connected copy underneath it. The bubble exists so the typed words are
 * not simply swallowed when the field clears - it is a record of what the
 * reader wrote, not a receipt.
 *
 * The success branch below is written and is unreachable by construction until
 * sendCommunityQuestion() can resolve.
 */

import { useId, useRef, useState } from "react";
import {
  WHATSAPP_FOOTER_SUB,
  WHATSAPP_FOOTER_TITLE,
  WHATSAPP_INPUT_PLACEHOLDER,
} from "@/data/whatsapp-questions";
import { NOT_CONNECTED, sendCommunityQuestion } from "@/lib/contact";

type Outcome = "notConnected" | "sent";
type Echo = { id: number; text: string; outcome: Outcome };

export default function WhatsAppAsk() {
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [sending, setSending] = useState(false);
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const fieldRef = useRef<HTMLInputElement | null>(null);
  const fieldId = useId();
  const errorId = `${fieldId}-error`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = value.trim();

    /* validation: an empty or whitespace-only question never leaves, and the
       field keeps focus so the keyboard does not close on a phone */
    if (!question) {
      setInvalid(true);
      fieldRef.current?.focus();
      return;
    }

    setInvalid(false);
    setSending(true);
    let outcome: Outcome = "notConnected";
    try {
      await sendCommunityQuestion({ question });
      outcome = "sent";
    } catch (err) {
      outcome = err instanceof Error && err.message === NOT_CONNECTED ? "notConnected" : "notConnected";
    }
    setSending(false);
    setEchoes((prev) => [...prev, { id: Date.now(), text: question, outcome }]);
    setValue("");
    fieldRef.current?.focus();
  }

  return (
    <>
      {/* the echo lives in the thread, above the input bar */}
      {echoes.length > 0 && (
        <ul className="waq__echoes">
          {echoes.map((echo) => (
            <li className="waq__row" key={echo.id}>
              <span
                className={`waq__bubble waq__bubble--${
                  echo.outcome === "sent" ? "sent" : "pending"
                }`}
              >
                <span className="waq__text">{echo.text}</span>
                <span className="waq__meta">
                  {echo.outcome === "sent" ? (
                    <span className="waq__time">נשלח</span>
                  ) : (
                    <span className="waq__unsent">לא נשלח</span>
                  )}
                </span>
              </span>
            </li>
          ))}
          {echoes.some((e) => e.outcome === "notConnected") && (
            <li className="waq__notice" role="status">
              משהו נתקע. 🤦‍♂️
              <br />
              תרעננו את העמוד ותנסו שוב, זה עוזר יותר ממה שנדמה.
              <br />
              ואם זה ממשיך, פשוט תכתבו לי בקבוצה ואשלח לכם ידנית.
            </li>
          )}
        </ul>
      )}

      <div className="waq__input-bar" data-node-id="44:33">
        <p className="waq__ask" data-node-id="167:108">
          <strong>{WHATSAPP_FOOTER_TITLE}</strong>
          <span>{WHATSAPP_FOOTER_SUB}</span>
        </p>

        <form className="waq__form" onSubmit={onSubmit} noValidate data-node-id="167:110">
          <label className="waq__label" htmlFor={fieldId}>
            השאלה שלכם לקבוצה
          </label>

          {/* the frame draws the send button to the LEFT of the field, so under
              dir=rtl the field is written first */}
          <input
            className={`waq__field${invalid ? " is-invalid" : ""}`}
            id={fieldId}
            ref={fieldRef}
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (invalid) setInvalid(false);
            }}
            placeholder={WHATSAPP_INPUT_PLACEHOLDER}
            autoComplete="off"
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
            data-node-id="44:34"
          />

          <button
            className="waq__send"
            type="submit"
            disabled={sending}
            data-node-id="167:30"
          >
            <span className="waq__label">{sending ? "שולח" : "שליחה"}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 12 3 3.5l3.2 8.5L3 20.5 21 12Z" fill="#fff" />
            </svg>
          </button>
        </form>

        <p className="waq__error" id={errorId} role="alert">
          {invalid ? "אפשר לכתוב שאלה קודם" : ""}
        </p>
      </div>
    </>
  );
}
