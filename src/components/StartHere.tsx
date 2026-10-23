import Link from "next/link";
import Img from "@/components/Img";
import ArrowCircle from "@/components/ArrowCircle";
import Reveal from "@/components/Reveal";
import { stageChipFor, type Post } from "@/data/post-types";
import { FEATURED_BADGE, START_HERE, START_HERE_TITLE } from "@/data/start-here";

/*
 * "אתם יכולים להתחיל כאן" - Figma 230:265.
 *
 * A 660px left column of six cards in three rows of two, and a flexible amber
 * featured card beside it. dir=rtl puts the first child at the RIGHT, and the
 * frame has the six-card column on the LEFT and the featured card on the
 * right - so the featured card comes first in the DOM.
 *
 * Every card's words come from the post it points at. The frame's own card
 * copy is those same posts' titles and openings, so it is read from
 * `posts.ts` rather than duplicated here.
 */

function Card({ post }: { post: Post }) {
  return (
    <Link className="sh__card" href={`/posts/${post.slug}`} data-node-id="230:277">
      <span className="sh__chip">{stageChipFor(post)}</span>
      <span className="sh__card-title">{post.title}</span>
      <span className="sh__card-excerpt">{post.lead}</span>
      {/* 279:222 - the arrow on the LEFT, the reading pill on the right */}
      <span className="sh__row">
        <ArrowCircle className="sh__arrow" />
        <span className="sh__pill">{post.readingTime} קריאה</span>
      </span>
    </Link>
  );
}

export default function StartHere({ posts }: { posts: Post[] }) {
  const by = (slug: string) => posts.find((p) => p.slug === slug);
  const featured = by(START_HERE.find((s) => s.featured)!.slug);
  const rest = START_HERE.filter((s) => !s.featured)
    .map((s) => by(s.slug))
    .filter((p): p is Post => Boolean(p));

  if (!featured) return null;

  return (
    <section
      className="sh"
      id="start-here"
      data-node-id="230:265"
      aria-labelledby="sh-title"
    >
      <Reveal>
        <h2 className="sh__title" id="sh-title" data-node-id="230:266">
          {START_HERE_TITLE}
        </h2>
      </Reveal>

      <div className="sh__grid" data-node-id="279:219">
        {/* first child = right, which is where the frame has the featured card */}
        <Reveal className="sh__featured-wrap" as="div">
          <Link className="sh__featured" href={`/posts/${featured.slug}`} data-node-id="230:268">
            <span className="sh__badges" data-node-id="230:269">
              <span className="sh__badge sh__badge--hot">{FEATURED_BADGE}</span>
              <span className="sh__badge">{stageChipFor(featured)}</span>
            </span>
            <span className="sh__featured-title">{featured.title}</span>
            <span className="sh__featured-excerpt">{featured.lead}</span>
            <span className="sh__row">
              <ArrowCircle className="sh__arrow" />
              <span className="sh__pill">{featured.readingTime} קריאה</span>
            </span>
            {/* 275:468 - the frame uses a reserve-duty vignette here; the post
                now has its own illustration, so the card shows that. */}
            <span className="sh__featured-art">
              <Img
                name={featured.slug}
                fallback={`/posts/${featured.slug}.png`}
                alt=""
                width={560}
                height={420}
                sizes="(max-width: 1023px) 100vw, 560px"
              />
            </span>
          </Link>
        </Reveal>

        <ul className="sh__cards" data-node-id="279:220">
          {rest.map((post, i) => (
            <Reveal as="li" key={post.slug} delay={(i % 2) * 60}>
              <Card post={post} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
