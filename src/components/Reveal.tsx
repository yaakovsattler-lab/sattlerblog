"use client";

/*
 * Subtle entrance on scroll - Elyakim, 18.09, item 8: everywhere EXCEPT the
 * life-stages section, motion is entrances on scroll only, and nothing may
 * compete with that section.
 *
 * So this is deliberately the smallest thing that does the job: 16px up and a
 * fade, once, then the observer lets the element go. No parallax, no stagger
 * beyond an optional delay, nothing that reacts to the cursor.
 *
 * It renders visible and un-transformed by default and only hides itself once
 * JavaScript has taken over, so with JavaScript off or if this never runs, the
 * content is simply there - a reveal must never be able to eat the page.
 */

import { useEffect, useRef, useState } from "react";

export default function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  as?: "div" | "section" | "li";
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    setArmed(true);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Component = Tag as "div";
  return (
    <Component
      ref={ref as React.Ref<HTMLDivElement>}
      className={`reveal${armed ? " is-armed" : ""}${shown ? " is-shown" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Component>
  );
}
