import { notFound } from "next/navigation";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import Img from "@/components/Img";
import { allPosts, postBySlug, recommendedFor } from "@/data/posts";
import type { Block } from "@/data/post-types";

/*
 * The single post page - Figma 535:232 "עמוד פוסט - בלוג פנימי", read with
 * get_design_context.
 *
 * Structure, in the frame's order: editorial hero (535:244) with the bordered
 * illustration card on the left and the meta row, title and deck on the right;
 * a hairline; the 760px centred body column (535:258); the recommended stack
 * (535:500); a second body container holding the newsletter block (530:462)
 * and the closing CTA (530:470); then the footer, which the layout already
 * provides.
 *
 * Content note, and it matters: the frame's body text is an ABRIDGED version
 * of post 05. The real file is several times longer. The frame is the layout
 * decision and the content file is the words, so the built page renders the
 * whole post and is therefore much taller than the frame. Nothing was cut to
 * match a mock.
 *
 * Gaps flagged to Tal rather than invented:
 *  - The hero illustration (535:246) and the three tile images (535:509 and
 *    siblings) are per-post artwork. No post has one. The frame's own assets
 *    ship as the stand-in and every post currently shows the same picture.
 *  - The newsletter form is presentational in the frame: no action, no
 *    success or error state, no privacy line. It is built as a real form that
 *    cannot be submitted anywhere yet - see the note on it below.
 */

export function generateStaticParams() {
  return allPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = postBySlug(slug);
  return { title: post?.title ?? "פוסט" };
}

function BodyBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading":
      return <h2 className="post__h2">{block.text}</h2>;
    case "lead":
      /* 535:260 - the bold lead-in line */
      return <p className="post__lead-in">{block.text}</p>;
    case "divider":
      return <hr className="post__rule" />;
    case "checklist":
      /* 535:267 */
      return (
        <div className="post__checklist">
          {block.title ? <p className="post__checklist-title">{block.title}</p> : null}
          <ul>
            {block.items.map((item) => (
              <li key={item}>
                <span className="post__check" aria-hidden="true">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "tip":
      /* 535:278 */
      return (
        <aside className="post__tip">
          <span className="post__tip-mark" aria-hidden="true">
            ✦
          </span>
          <p>{block.text}</p>
        </aside>
      );
    default:
      return <p className="post__p">{block.text}</p>;
  }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();
  const recommended = recommendedFor(slug);

  return (
    <main className="post">
      <header className="post__hero" data-node-id="535:244">
        {/* dir=rtl: the first child sits at the RIGHT, and the frame has the
            text column on the right and the illustration card on the left. */}
        <div className="post__hero-text" data-node-id="535:247">
          <div className="post__meta" data-node-id="535:248">
            {post.lifeStage ? (
              <span className="post__tag">{post.lifeStage}</span>
            ) : null}
            {post.readingTime ? (
              <span className="post__reading">⏱️ {post.readingTime} קריאה</span>
            ) : null}
          </div>
          <h1 className="post__title">{post.title}</h1>
          {post.lead ? <p className="post__deck">{post.lead}</p> : null}
        </div>
        <div className="post__hero-art" data-node-id="535:245">
          {/* Tal's per-post illustration, transparent PNG over the card's own
              ivory - no plate behind the slot. Above the fold, so it is the one
              eager image on this page. */}
          <Img
            name={post.slug}
            fallback={`/posts/${post.slug}.png`}
            alt=""
            width={380}
            height={380}
            sizes="(max-width: 1023px) 200px, 380px"
            priority
          />
        </div>
      </header>

      <hr className="post__hairline" data-node-id="535:256" />

      <div className="post__body" data-node-id="535:257">
        <article className="post__column">
          {post.body.map((block, i) => (
            <BodyBlock block={block} key={`${block.kind}-${i}`} />
          ))}
        </article>
      </div>

      <section className="post__recommended" data-node-id="535:500" aria-labelledby="rec-title">
        <h2 className="post__recommended-title" id="rec-title">
          מה כדאי לקרוא עכשיו?
        </h2>
        <ul className="post__tiles">
          {recommended.map((other, i) => (
            <Reveal as="li" key={other.slug} delay={i * 60}>
              <Link className="post__tile" href={`/posts/${other.slug}`}>
                {/* 535:503 puts the picture on the RIGHT and the text on the
                    left. dir=rtl places the FIRST child at the right, so the
                    image comes first here. */}
                <Img
                  name={other.slug}
                  fallback={`/posts/${other.slug}.png`}
                  alt=""
                  className="post__tile-img"
                  width={140}
                  height={100}
                  sizes="(max-width: 1023px) 100vw, 140px"
                />
                <span className="post__tile-text">
                  {other.lifeStage ? (
                    <span className="post__chip">{other.lifeStage}</span>
                  ) : null}
                  <span className="post__tile-title">{other.title}</span>
                  <span className="post__tile-reading">{other.readingTime} קריאה</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </section>

      <div className="post__body post__body--closing" data-node-id="530:437">
        <div className="post__column">
          {/*
            530:462. The frame draws a field and a button and nothing behind
            them. A form that looks real and silently does nothing is the worst
            of the three options, so this one is honest: it posts nowhere yet,
            says so, and the button is NOT disabled - per the standing rule
            against disabled controls. Wiring it to a list needs a paid service
            and Elyakim's approval.
          */}
          <form
            className="newsletter"
            data-node-id="530:462"
            action="/contact"
            method="get"
          >
            <p className="newsletter__title">רוצים לקבל את הפוסט הבא?</p>
            <p className="newsletter__sub">
              פוסט אחד בשבוע, ישר למייל. בלי ספאם ובלי למכור לכם כלום.
            </p>
            <div className="newsletter__form">
              {/* 530:465 puts the orange button on the LEFT and the field on
                  the right. dir=rtl places the first child at the right, so
                  the field comes first. Confirmed against the node's own
                  render, not inferred from the child order. */}
              <label className="newsletter__field">
                <span className="sr-only">האימייל שלכם</span>
                <input
                  type="email"
                  name="email"
                  placeholder="האימייל שלכם"
                  autoComplete="email"
                />
              </label>
              <button className="newsletter__submit" type="submit">
                יאללה, תשלחו לי
              </button>
            </div>
            <p className="newsletter__pending">
              הרשמה לרשימת התפוצה עדיין לא מחוברת. הכפתור מעביר לעמוד צרו קשר.
            </p>
          </form>

          <div className="post__cta" data-node-id="530:470">
            <p className="post__cta-line">
              רוצים לעבור על התוכניות הפיננסיות שלכם עם מישהו?
            </p>
            <Link className="post__cta-button" href="/personal-guidance">
              דברו איתי
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
