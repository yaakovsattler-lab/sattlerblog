"use client";

/*
 * Navbar - Figma 481:217, read with get_design_context.
 *
 * From the frame: a pill on the page background (#fbfaf5), 1px #bebebe border,
 * 30px radius, 17px/45px padding, 75px between its three groups, and a
 * five-layer soft shadow. Three groups in this visual order under dir="rtl":
 * the wordmark at the right (275:513, exported SVG), the four links (4:4), and
 * the "צרו קשר" pill at the left (62:2), which since 19.09 shares a group with
 * the menu button so the two sit together at that left end. The current link carries an accent
 * underline (149:145, exported SVG).
 *
 * IMPLEMENTATION DECISIONS, flagged for Tal - the frame does not cover these:
 *
 *  1. Hide on scroll down, return on scroll up (Elyakim, 18.09), and it stays
 *     hidden for the whole life-stages section rather than flickering back on
 *     every small upward scroll - that section is one long sticky scrub and a
 *     bar appearing over it would fight the thing it is covering.
 *  2. There is NO mobile navbar design. Under 1024 the four links collapse
 *     behind a disclosure that opens a full-width sheet under the pill. It is
 *     a <details>/<summary>, so it works with the keyboard and with
 *     JavaScript off before any of my code runs.
 *  3. The frame draws the CTA 96px wide at 14px type. 14px is under the
 *     studio's 15px floor, so the label is 15px and the pill sizes to its
 *     content instead of staying 96px.
 *  4. The accent underline (149:145) marks the CURRENT page and follows the
 *     real pathname, not a click - so a direct load, a back button and a link
 *     from anywhere all mark the same thing. A nested route counts as its
 *     section: /posts/<slug> keeps "כל הפוסטים" underlined.
 *  5. "צרו קשר" opens a modal instead of navigating (Elyakim, 18.09). /contact
 *     still exists and still shows the same form, so the link works with
 *     JavaScript off - which is why this is an <a href> with its default
 *     prevented, not a <button>.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ContactModal from "@/components/ContactModal";
import { useDismissable, useScrollLock } from "@/lib/dismissable";
import { NAV_CTA, NAV_LINKS } from "@/data/site";

/** Below this the bar never hides - there is nothing to gain on a short page. */
const HIDE_AFTER = 120;

/** Is this link the current page? A section owns its nested routes. */
function isCurrent(href: string, pathname: string) {
  if (href.startsWith("/#")) return pathname === "/";
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const contactTrigger = useRef<HTMLAnchorElement | null>(null);
  const menuRef = useRef<HTMLDetailsElement | null>(null);
  const menuButton = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;

        /* pinned behind the open sheet, or settling right after it closed:
           follow the position, do not act on it */
        if (document.body.style.position === "fixed" || Date.now() < settleUntil.current) {
          lastY.current = y;
          return;
        }

        const goingDown = y > lastY.current;
        lastY.current = y;

        /* Inside the life-stages section the bar stays down, whichever way the
           reader is moving. The section is a sticky scrub, so "scrolled up a
           little" happens constantly and is not a request for the navigation. */
        const ls = document.getElementById("life-stages");
        if (ls) {
          const top = ls.offsetTop;
          if (y > top - 80 && y < top + ls.offsetHeight - 80) {
            setHidden(true);
            return;
          }
        }
        if (y < HIDE_AFTER) return setHidden(false);
        setHidden(goingDown);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  /* A hidden bar must not keep an open sheet alive above the fold. */
  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  /*
   * The sheet is a native <details>, so it opened and closed and took the
   * keyboard from the start - but it had none of the three behaviours an open
   * overlay owes the reader. Mika found that at 360-768 on the second review.
   * Same implementation as the contact modal, not a second one.
   */
  const closeMenu = useCallback(() => setOpen(false), []);
  useScrollLock(open);
  useDismissable({
    active: open,
    onDismiss: closeMenu,
    within: menuRef,
    returnFocusTo: menuButton,
  });

  /*
   * While the sheet is open the document is pinned, so window.scrollY reads 0.
   * Closing it restores the real offset in ONE JUMP, and that jump arrives as
   * a scroll event which the handler below would read as "scrolled down" and
   * hide the bar the instant the menu closed.
   *
   * A setTimeout re-sync loses that race about half the time, because the
   * scroll event is dispatched on a later frame than the timeout. So the
   * handler is told to ignore scrolls for a moment instead: during the window
   * it only re-baselines, it never decides. Deterministic rather than lucky.
   */
  const settleUntil = useRef(0);
  useEffect(() => {
    if (open) return;
    settleUntil.current = Date.now() + 400;
  }, [open]);

  return (
    <header className={`nav${hidden ? " is-hidden" : ""}`} data-node-id="481:217">
      <nav className="nav__pill" aria-label="ניווט ראשי">
        <a className="nav__logo" href="/" aria-label="יעקב סאטלר, לעמוד הבית">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wordmark.svg" alt="" width={99} height={38} />
        </a>

        <ul className="nav__links">
          {NAV_LINKS.map((link) => {
            const current = isCurrent(link.href, pathname);
            return (
              <li key={link.href}>
                <a
                  className={`nav__link${current ? " is-current" : ""}`}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>

        {/* Elyakim, 19.09: the CTA and the menu button are one group at the
            LEFT end of the pill. They used to be separated by the pill's
            space-between, which put the CTA in the middle and read as two
            unrelated controls. The wordmark keeps the right end. */}
        <div className="nav__actions">
        <a
            className="nav__cta"
            href={NAV_CTA.href}
            ref={contactTrigger}
            onClick={(e) => {
              /* let a modified click go to the real page */
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              setContactOpen(true);
            }}
          >
            {NAV_CTA.label}
          </a>

          {/* INVENTED - no mobile navbar design exists. */}
          <details
            className="nav__menu"
            ref={menuRef}
            open={open}
            onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary
              className="nav__menu-button"
              aria-label="תפריט"
              ref={menuButton as React.RefObject<HTMLElement>}
            >
              <span className="nav__menu-bars" aria-hidden="true" />
            </summary>
            <ul className="nav__sheet">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a className="nav__sheet-link" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </nav>

      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        returnFocusTo={contactTrigger}
      />
    </header>
  );
}
