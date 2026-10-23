"use client";

/*
 * The contact form. One component, two homes: inside the modal that the navbar
 * CTA opens, and on /contact, which exists so the link still works with
 * JavaScript off.
 *
 * Validation messages are Hebrew and specific per field. The success and
 * failure sentences are Goldi's, delivered 18.09 and used verbatim - none of
 * the user-facing copy on this form was written by me.
 *
 * On submit: the fields are validated in the browser, and then
 * sendContactMessage() is called - which throws, because nothing is wired.
 * The form therefore lands in its ERROR state, which is Goldi's error copy.
 * The success string exists in the code and is unreachable today by
 * construction: it needs sendContactMessage() to resolve, and it cannot.
 * It never shows success for a message that went nowhere.
 */

import { useId, useRef, useState } from "react";
import { NOT_CONNECTED, sendContactMessage } from "@/lib/contact";

type Fields = { name: string; email: string; phone: string; message: string };
type Errors = Partial<Record<keyof Fields, string>>;

const EMPTY: Fields = { name: "", email: "", phone: "", message: "" };

function validate(values: Fields): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "צריך שם כדי לדעת למי לענות";
  if (!values.email.trim()) {
    errors.email = "צריך כתובת מייל כדי לחזור אליכם";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
    errors.email = "הכתובת לא נראית תקינה. אפשר לבדוק שוב?";
  }
  /* the phone is optional - it is not asked for as required anywhere, so it is
     only checked when something was actually typed */
  if (values.phone.trim() && !/^[\d+\-() ]{7,}$/.test(values.phone.trim())) {
    errors.phone = "מספר הטלפון לא נראה תקין";
  }
  if (!values.message.trim()) {
    errors.message = "כתבו לי משהו, אפילו שורה";
  } else if (values.message.trim().length < 10) {
    errors.message = "קצת יותר מזה, כדי שאוכל לעזור";
  }
  return errors;
}

export default function ContactForm({ onDone }: { onDone?: () => void }) {
  const id = useId();
  const [values, setValues] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "notConnected" | "sent">("idle");
  const summaryRef = useRef<HTMLParagraphElement | null>(null);

  const field = (key: keyof Fields) => ({
    id: `${id}-${key}`,
    name: key,
    value: values[key],
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${id}-${key}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((v) => ({ ...v, [key]: e.target.value }));
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    },
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) {
      /* move the reader to the first thing that is wrong, rather than leaving
         them to hunt for it */
      const first = document.getElementById(`${id}-${Object.keys(found)[0]}`);
      first?.focus();
      return;
    }
    setState("sending");
    try {
      await sendContactMessage(values);
      setState("sent");
      onDone?.();
    } catch (err) {
      setState(
        err instanceof Error && err.message === NOT_CONNECTED ? "notConnected" : "notConnected"
      );
      window.setTimeout(() => summaryRef.current?.focus(), 0);
    }
  }

  return (
    <form className="contact" onSubmit={onSubmit} noValidate>
      <div className="contact__row">
        <label className="contact__field">
          <span className="contact__label">שם</span>
          <input type="text" autoComplete="name" {...field("name")} />
          {errors.name ? (
            <span className="contact__error" id={`${id}-name-error`}>
              {errors.name}
            </span>
          ) : null}
        </label>
        <label className="contact__field">
          <span className="contact__label">אימייל</span>
          <input type="email" inputMode="email" autoComplete="email" {...field("email")} />
          {errors.email ? (
            <span className="contact__error" id={`${id}-email-error`}>
              {errors.email}
            </span>
          ) : null}
        </label>
      </div>

      <label className="contact__field">
        <span className="contact__label">טלפון (לא חובה)</span>
        <input type="tel" inputMode="tel" autoComplete="tel" {...field("phone")} />
        {errors.phone ? (
          <span className="contact__error" id={`${id}-phone-error`}>
            {errors.phone}
          </span>
        ) : null}
      </label>

      <label className="contact__field">
        <span className="contact__label">ההודעה</span>
        <textarea rows={5} {...field("message")} />
        {errors.message ? (
          <span className="contact__error" id={`${id}-message-error`}>
            {errors.message}
          </span>
        ) : null}
      </label>

      <button className="contact__submit" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "שולח..." : "שליחה"}
      </button>

      {/* The send path is not wired, so a valid submission lands in the ERROR
          state below. The success branch exists and is unreachable by
          construction until sendContactMessage() can resolve. */}
      <p
        className={`contact__summary${state === "notConnected" ? " is-shown" : ""}`}
        role="status"
        tabIndex={-1}
        ref={summaryRef}
      >
        {state === "notConnected" ? (
          <>
            משהו נתקע. 🤦‍♂️
            <br />
            תרעננו את העמוד ותנסו שוב, זה עוזר יותר ממה שנדמה.
            <br />
            ואם זה ממשיך, פשוט תכתבו לי בקבוצה ואשלח לכם ידנית.
          </>
        ) : state === "sent" ? (
          <>
            ההודעה הגיעה, תודה. 🙏
            <br />
            בלי מוקד, בלי מערכת - היא לא הולכת לאיבוד.
          </>
        ) : (
          ""
        )}
      </p>
    </form>
  );
}
