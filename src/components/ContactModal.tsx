"use client";

/*
 * The contact modal. Opened by the navbar CTA on any page.
 *
 * What it has to do, and how each one is done rather than assumed:
 *  - focus trap: Tab and Shift+Tab cycle inside the dialog only
 *  - focus returns to the trigger on close, including Escape and backdrop
 *  - Escape closes; the backdrop closes; the panel itself does not
 *  - labelled for a screen reader: role=dialog, aria-modal, aria-labelledby
 *  - the page behind it does not scroll, and does not jump when the scrollbar
 *    disappears (the width is compensated)
 *  - works at every width: it is a centred panel on a desktop and a sheet on a
 *    phone, both scrollable inside themselves
 *
 * INVENTED - there is no modal in any Figma frame. Flagged for Tal.
 *
 * It renders through a PORTAL to document.body, and that is load-bearing
 * rather than tidy: the trigger lives in the navbar, which is
 * `position: fixed; z-index: 20` and gains a `transform` when it hides. Both
 * of those create a stacking context, so a dialog nested inside it is capped
 * at the header's level no matter what z-index it asks for - the panel drew
 * above the page but the page's own content still took the pointer events, and
 * the submit button could not be clicked. Caught by the assertion, not by
 * looking: it LOOKED fine.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ContactForm from "@/components/ContactForm";
import { useDismissable, useScrollLock } from "@/lib/dismissable";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function ContactModal({
  open,
  onClose,
  returnFocusTo,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusTo: React.RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    onClose();
    /* focus goes back to what opened it, on the next tick so the dialog is
       gone by the time the browser moves it */
    window.setTimeout(() => returnFocusTo.current?.focus(), 0);
  }, [onClose, returnFocusTo]);

  /* the page behind, frozen - shared with the navbar's menu, see
     src/lib/dismissable.ts */
  useScrollLock(open);

  /* Escape closes and hands focus back, from the same place */
  useDismissable({ active: open, onDismiss: onClose, returnFocusTo });

  /* first focus inside, and the Tab trap. Escape lives in useDismissable. */
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === firstItem || !panel.contains(active))) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && active === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, close]);

  /* the portal target only exists in the browser */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="modal"
      /* the backdrop closes; a click that started inside the panel does not,
         which is why this is on the backdrop element and the panel stops it */
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        ref={panelRef}
      >
        <div className="modal__head">
          <h2 className="modal__title" id="contact-modal-title">
            צרו קשר
          </h2>
          <button className="modal__close" type="button" onClick={close} aria-label="סגירה">
            ×
          </button>
        </div>
        <ContactForm />
      </div>
    </div>,
    document.body
  );
}
