"use client";

/*
 * The three behaviours every dismissable overlay on this site owes the reader:
 * Escape closes it and gives focus back, a click outside closes it, and the
 * page behind it does not scroll while it is open.
 *
 * This file exists because there were two overlays and only one of them had
 * them. The contact modal was built with all three; the navbar's mobile menu -
 * a native <details>/<summary> - had none, which Mika found at 360-768 on the
 * second full review. Rather than write a second version for the menu, the
 * modal's logic moved here and both use it, so the next overlay cannot ship
 * with two of the three.
 *
 * Deliberately NOT a component: the menu is a native <details> and that is
 * worth keeping - it opens, closes and takes the keyboard before any of this
 * JavaScript runs, and with JavaScript off it still works. A custom disclosure
 * would have cost that.
 */

import { useEffect } from "react";

/*
 * Freeze the page behind an overlay.
 *
 * `overflow: hidden` on the body is NOT enough: it stops a wheel but a
 * programmatic scroll still moves the document, which the assertion in
 * check-mechanics.mjs catches. So the document is pinned with position: fixed
 * at its current offset and restored exactly on close. The scrollbar's width
 * is compensated so the page does not jump sideways as it disappears.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { body, documentElement } = document;
    const gap = window.innerWidth - documentElement.clientWidth;
    const y = window.scrollY;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
      pad: body.style.paddingInlineEnd,
      htmlOverflow: documentElement.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `${-y}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    if (gap > 0) body.style.paddingInlineEnd = `${gap}px`;
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      body.style.paddingInlineEnd = prev.pad;
      documentElement.style.overflow = prev.htmlOverflow;
      /* restore exactly, with no smooth behaviour, or the page glides back */
      window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
    };
  }, [active]);
}

/*
 * Escape closes and hands focus back to whatever opened it; a pointer press
 * that starts outside `within` closes it too.
 *
 * mousedown rather than click: a click fires after the press, so a drag that
 * starts inside the panel and releases outside would close it, which feels
 * like the overlay dismissing itself out from under the reader.
 *
 * The key listener is capturing so it runs before anything inside the overlay
 * can swallow the key.
 */
export function useDismissable({
  active,
  onDismiss,
  within,
  returnFocusTo,
}: {
  active: boolean;
  onDismiss: () => void;
  /** the element a press must land inside to be considered "in" the overlay */
  within?: React.RefObject<HTMLElement | null>;
  /** focus goes back here on Escape */
  returnFocusTo?: React.RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onDismiss();
      /* on the next tick, so the overlay is gone before focus moves */
      window.setTimeout(() => returnFocusTo?.current?.focus(), 0);
    };

    const onPointerDown = (e: MouseEvent) => {
      const box = within?.current;
      if (!box) return;
      if (!box.contains(e.target as Node)) onDismiss();
    };

    document.addEventListener("keydown", onKeyDown, true);
    /* capture, so a stopPropagation inside the page cannot hide the press */
    document.addEventListener("mousedown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousedown", onPointerDown, true);
    };
  }, [active, onDismiss, within, returnFocusTo]);
}
