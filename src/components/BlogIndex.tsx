"use client";

/*
 * Blog index - Figma 536:591 "בלוג", read with get_design_context.
 *
 * Structure in the frame's order: the 72px page title (536:617); a toolbar row
 * (530:381) with two ordering tabs on one side and the seven life-stage
 * filters on the other; a wide featured card (539:379); then rows of two post
 * cards (536:688, 530:1472); then "עוד פוסטים" (530:1500).
 *
 * The frame draws TWO card variants and alternates them: 536:689 puts the tag
 * pill at the top and the reading time at the bottom; 536:700 puts the arrow
 * and the meta in one row at the top. Only the latter is built - see PostCard;
 * the two older cards in the frame are a frame that was not updated, and they
 * alternate, because that is what the frame does - it is not a mistake in it.
 *
 * MEASURED CONTENT GAPS, reported rather than papered over:
 *  - The filter vocabulary and the posts' own vocabulary do not match. Of the
 *    seven filters the frame draws, "עסק מהצד" and "קונים דירה" match ZERO of
 *    the nine posts, and the posts carry stages the filter row does not have
 *    at all ("רוצה לעשות סדר בכסף", "צריך סכום כסף"). Counted, not guessed.
 *  - So a filter can legitimately return nothing. Per the no-dead-ends rule it
 *    stays clickable and shows an empty state with a way out, rather than
 *    being hidden or disabled.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ArrowCircle from "@/components/ArrowCircle";
import Reveal from "@/components/Reveal";
import Img from "@/components/Img";
import {
  STAGE_FILTERS,
  postsForStage,
  type Post,
  type StageFilter,
} from "@/data/post-types";

/* 601:524. "חדש כאן" is newest first. "מה שהייתי מתחיל ממנו" is the author's
   own numbering of the files (01..09), which is a real editorial order that
   already exists - not an order I invented. */
const TABS = [
  { id: "new", label: "חדש כאן" },
  { id: "start", label: "מה שהייתי מתחיל ממנו" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/*
 * ONE card. 536:591 draws four post-cards and two of them still carry an older
 * treatment (tag alone at the top, reading pill at the bottom, no arrow) while
 * the other two carry the current one (arrow top-left, meta top-right, empty
 * bottom). The build used to reproduce both and alternate them by index, which
 * is how the same page ended up showing the arrow in two different places.
 *
 * Elyakim's ruling: every post card except the featured one carries the
 * arrow-circle top-left, exactly as 530:1467 draws it. So the newer frame
 * (536:700 / 530:1484) is the component and the older two are treated as a
 * frame that was not updated, not as a second variant.
 */
function PostCard({ post }: { post: Post }) {
  return (
    <Link className="blog__card" href={`/posts/${post.slug}`}>
      {/* 530:1462 - the frame reads arrow, gap, reading pill, tag from the
          LEFT, so under dir=rtl the tag is written first and the arrow last */}
      <span className="blog__card-top" data-node-id="530:1462">
        <span className="blog__card-meta" data-node-id="530:1466">
          {post.lifeStage ? <span className="blog__tag">{post.lifeStage}</span> : null}
          <span className="blog__reading-pill">{post.readingTime} קריאה</span>
        </span>
        <ArrowCircle className="blog__arrow" />
      </span>
      <span className="blog__card-title">{post.title}</span>
      <span className="blog__card-excerpt">{post.lead}</span>
      <span className="blog__card-spacer" />
    </Link>
  );
}

export default function BlogIndex({ posts }: { posts: Post[] }) {
  /* ?stage=<slug> arrives from the WhatsApp-questions section (170:155), whose
     approved copy sends most bubbles to a life-stage station rather than to a
     single post. An unknown slug is ignored rather than shown as an empty
     list, so a stale link degrades to the full index. */
  const params = useSearchParams();
  const requested = params.get("stage");
  const initialStage =
    STAGE_FILTERS.find((f) => f.slug === requested)?.slug ?? null;

  const [tab, setTab] = useState<TabId>("new");
  const [stage, setStage] = useState<StageFilter | null>(initialStage);

  const ordered = useMemo(() => {
    const filtered = postsForStage(posts, stage);
    return tab === "new"
      ? [...filtered].sort((a, b) => b.order - a.order)
      : [...filtered].sort((a, b) => a.order - b.order);
  }, [posts, stage, tab]);

  const [featured, ...rest] = ordered;

  return (
    <main className="blog" data-node-id="536:591">
      <h1 className="blog__title" data-node-id="536:617">
        כל הפוסטים
      </h1>

      <div className="blog__toolbar" data-node-id="530:381">
        {/* 530:381 puts the ordering tabs on the LEFT and the life-stage
            filters on the right. dir=rtl puts the first child at the right. */}
        <div className="blog__filters" data-node-id="601:353">
          {STAGE_FILTERS.map((f) => (
            <button
              key={f.slug}
              type="button"
              aria-pressed={stage === f.slug}
              className={`blog__filter${stage === f.slug ? " is-active" : ""}`}
              onClick={() => setStage(stage === f.slug ? null : f.slug)}
            >
              {/* 601:369 puts the label on the LEFT and the icon on the right,
                  so the icon is the first child under dir=rtl.
                  The icon is a background in its normal state and a MASK when
                  active, so the whole glyph takes the accent colour the way
                  601:515 draws it. One asset, two treatments - there is no
                  separate orange export. */}
              <span
                className="blog__filter-icon"
                style={{ "--icon": `url(/brand/filters/${f.slug}.svg)` } as React.CSSProperties}
                aria-hidden="true"
              />
              <span className="blog__filter-label">{f.label}</span>
            </button>
          ))}
        </div>
        <div className="blog__tabs" role="tablist" aria-label="סדר הצגה" data-node-id="601:524">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`blog__tab${tab === t.id ? " is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

      </div>

      {featured ? (
        <>
          <Reveal className="blog__featured-wrap">
            <Link className="blog__featured" href={`/posts/${featured.slug}`} data-node-id="539:379">
              {/* 539:379 puts the picture on the LEFT and the copy on the
                  right - so the copy is the first child under dir=rtl. */}
              <span className="blog__featured-content">
                {featured.lifeStage ? <span className="blog__tag">{featured.lifeStage}</span> : null}
                <span className="blog__featured-title">{featured.title}</span>
                <span className="blog__featured-excerpt">{featured.lead}</span>
                <span className="blog__featured-footer">
                  {/* 539:386: reading time on the LEFT, button on the right */}
                  <span className="blog__featured-cta">קריאת הפוסט</span>
                  <span className="blog__featured-reading">{featured.readingTime} קריאה</span>
                </span>
              </span>
              <Img
                name={featured.slug}
                fallback={`/posts/${featured.slug}.png`}
                alt=""
                className="blog__featured-img"
                width={560}
                height={330}
                sizes="(max-width: 1023px) 100vw, 560px"
                priority
              />
            </Link>
          </Reveal>

          <ul className="blog__grid">
            {rest.map((post, i) => (
              <Reveal as="li" key={post.slug} delay={(i % 2) * 60}>
                <PostCard post={post} />
              </Reveal>
            ))}
          </ul>
        </>
      ) : (
        <div className="blog__empty" role="status">
          <p>
            עוד לא כתבתי על זה מספיק בשביל שיהיה כאן משהו. 👀
            <br />
            תסתכלו מה יש בשלבים האחרים, יש שם לא מעט.
          </p>
          <button type="button" className="blog__empty-reset" onClick={() => setStage(null)}>
            כל הפוסטים
          </button>
        </div>
      )}
    </main>
  );
}
