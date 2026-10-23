"use client";

/*
 * The site's <html> is dir="rtl". Sanity Studio's own interface is built
 * left-to-right only, and its menus and dialogs mount on <body>, so a wrapper
 * div is not enough - the document itself has to be LTR while the Studio is
 * open. The Hebrew labels inside still render right-to-left as text.
 */
import { useEffect } from "react";

export default function StudioDirection() {
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.getAttribute("dir");
    html.setAttribute("dir", "ltr");
    return () => {
      if (prev) html.setAttribute("dir", prev);
    };
  }, []);
  return null;
}
