/*
 * The honest placeholder. Elyakim, 18.09: every page gets built, including the
 * ones with no design yet, and there are no dead links and no disabled
 * buttons. So a page with no Figma frame gets this: its real title, a plain
 * sentence saying the page is not designed yet, and real working links out of
 * it. Nothing pretends to be finished, and nothing is a dead end.
 *
 * The one rule it must not break is the non-technical-user rule: a visitor who
 * lands here has to be able to leave without using the back button.
 */

import Link from "next/link";
import { ROUTES } from "@/data/site";

export default function PlainPage({
  title,
  lead,
}: {
  title: string;
  lead?: string;
}) {
  const elsewhere = ROUTES.filter((r) => r.designed && r.href !== "/");
  return (
    <main className="plain">
      <div className="plain__inner">
        <h1 className="plain__title">{title}</h1>
        <p className="plain__lead">
          {lead ?? "העמוד הזה עדיין לא עוצב. התוכן שלו ייכנס לכאן."}
        </p>
        <nav className="plain__links" aria-label="עמודים אחרים">
          <Link className="plain__link" href="/">
            חזרה לעמוד הבית
          </Link>
          {elsewhere.map((r) => (
            <Link className="plain__link" href={r.href} key={r.href}>
              {r.title}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
