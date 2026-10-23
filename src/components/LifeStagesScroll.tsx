"use client";

/*
 * Life stages - scroll-driven, eight steps, seven transition clips.
 *
 * Layout comes from Figma 148:120 (desktop 1440). Every number below that is
 * not marked otherwise was measured there, and most of them are already in the
 * built site's home.css - reused rather than re-decided.
 *
 * Mechanism, per the section brief:
 *   - one tall container, --step-scroll per step (globals.css, 180vh since
 *     18.09), with a sticky viewport at the top. The pace lives in that one
 *     CSS variable; nothing here reads it, because the mapping below is a pure
 *     function of PROGRESS and does not care how long the section is.
 *   - left column: the media box, scrubbed by scroll progress
 *   - right column: a static grey badge that never moves, then the per-step
 *     heading, paragraph, CTA and three post cards, all swapping per step
 *   - bottom: a sticky progress bar - the eight station names in a row, the
 *     active one in accent, and an accent line filling 0% to 100% across the
 *     whole section
 *
 * Motion, per the measured motion note:
 *   - each step's progress is normalised to ITS OWN clip's in..out window, never
 *     to the raw 121 frames, so dead head/tail frames never show
 *   - progress -> frame is linear with no easing; the only smoothing is the
 *     ScrollTrigger scrub below
 *   - scrolling up plays the same window backwards, because the mapping is a
 *     pure function of progress and has no direction or state of its own
 *   - at rest, the top of a step shows frame `in` and the bottom frame `out`
 *   - station 8 has no outgoing clip and holds frame `out` of 7-to-8
 *
 * There is deliberately no per-step tween to kill on a step change: a single
 * global scrub drives everything, and the frame drawn is recomputed from the
 * current step on every tick. A stale in-flight interpolation has nowhere to
 * live.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ArrowCircle from "@/components/ArrowCircle";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  RELATED_COUNT,
  SECTION_BADGE,
  STATIONS,
  relatedFor,
} from "@/data/stations";
import {
  FIRST_FRAME,
  LAST_FRAME,
  ensureClip,
  fileIndexFor,
  frameFor,
  loadManifest,
  releaseClip,
} from "@/lib/frames";

gsap.registerPlugin(ScrollTrigger);

/** Source clips are square. The media box is square too - see the CSS note. */
const CANVAS = 640;

/* The step exchange, in two halves: the old content leaves, then the new
   arrives. Tuned by watching it at 100vh per step rather than by picking a
   round number - 110 out / 150 in reads as a deliberate hand-off at normal
   scroll speed and still resolves inside a fast flick. Total 260ms, inside the
   200-320ms Elyakim asked for. */
const EXCHANGE_OUT_MS = 110;

/*
 * THE STAGED ENTRANCE (Elyakim, 19.09). Entering a step plays heading,
 * paragraph, CTA, then the three cards, each on its own beat. The numbers live
 * here and in one CSS block so the whole sequence can be retimed in one place.
 *
 * Triggered by ENTERING the step, never by scroll progress inside it: once the
 * step changes the sequence plays itself out even if the reader stops moving.
 * The last card starts at 650ms and takes 260ms, so first-to-last is ~910ms -
 * the "about a second" asked for.
 *
 * Delays apply to the IN phase only. Leaving is simultaneous and fast, which
 * is what makes crossing two steps quickly cancel cleanly instead of leaving a
 * ghost mid-sequence.
 */
const STAGGER = { cards: 390, step: 130 };
const STEPS = STATIONS.length;


/**
 * How much scroll each step gets, relative to the others. The first seven are
 * equal; the last is shorter because it has no clip to play - see
 * --last-step-scale in globals.css, which is where the number lives. Read from
 * the stylesheet rather than duplicated here, so the scroll distance and this
 * mapping cannot drift apart.
 */
function stepWeights(scale: number) {
  const weights = STATIONS.map((s, i) =>
    i === STEPS - 1 && !s.outgoingClip ? scale : 1
  );
  const total = weights.reduce((a, b) => a + b, 0);
  /* cumulative start of each step, normalised to 0..1 */
  const starts: number[] = [];
  let run = 0;
  for (const w of weights) {
    starts.push(run / total);
    run += w;
  }
  return { weights, total, starts };
}

function readLastStepScale() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--last-step-scale"
  );
  const n = Number.parseFloat(raw);
  /* A missing or unparseable variable must not silently make the last step
     full length again - fall back to the documented value, not to 1. */
  return Number.isFinite(n) && n > 0 ? n : 0.34;
}

/**
 * Which clip, and how far through it, for a given global progress.
 * Step i (0-based) runs on clip STATIONS[i].outgoingClip. The last step has no
 * clip of its own and holds the final frame of the one before it.
 */
function resolve(progress: number, starts: number[]) {
  const p = Math.min(Math.max(progress, 0), 1);
  let step = STEPS - 1;
  for (let i = 0; i < STEPS; i++) {
    const end = i + 1 < STEPS ? starts[i + 1] : 1;
    if (p < end) {
      step = i;
      break;
    }
  }
  const from = starts[step];
  const to = step + 1 < STEPS ? starts[step + 1] : 1;
  const local = to > from ? Math.min(Math.max((p - from) / (to - from), 0), 1) : 0;
  const own = STATIONS[step].outgoingClip;
  if (own) return { step, clip: own, local, rest: FIRST_FRAME };
  const previous = STATIONS[step - 1]?.outgoingClip ?? null;
  return { step, clip: previous, local: LAST_FRAME, rest: LAST_FRAME };
}

/** The clip and the frame a step comes to rest on, with no scrubbing at all. */
function restingFrame(step: number) {
  const own = STATIONS[step].outgoingClip;
  if (own) return { clip: own, progress: FIRST_FRAME };
  return { clip: STATIONS[step - 1]?.outgoingClip ?? null, progress: LAST_FRAME };
}

export default function LifeStagesScroll() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const stripRef = useRef<HTMLOListElement | null>(null);
  const cardsRef = useRef<HTMLUListElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stepRef = useRef(0);
  /* the last progress drawn, and the draw function itself - so a frame that
     finishes decoding can repaint at the position the viewer is actually at */
  const lastProgressRef = useRef(0);
  const drawRef = useRef<((p: number) => void) | null>(null);

  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);

  /* The step exchange. `shown` is the step the COLUMN is currently displaying,
     which lags `step` by one out-phase; `phase` drives the CSS.

     Crossing two steps quickly must not queue two exchanges or leave a ghost
     of a skipped step, so the timer is cancelled and restarted on every change
     and the content that arrives is always the CURRENT step - never the one
     that was pending when the scroll moved on. */
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const exchangeRef = useRef<number | null>(null);

  /* ---- manifest, then the first clip, before anything can be drawn ---- */
  useEffect(() => {
    let alive = true;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMq = () => alive && setReduced(mq.matches);
    applyMq();
    mq.addEventListener("change", applyMq);

    /* Only the manifest here. Fetching the first clip is the per-step effect's
       job, which runs the moment `ready` flips - starting it here too would put
       two loaders on the same clip and one of them would have no repaint
       callback. */
    loadManifest()
      .then(() => alive && setReady(true))
      .catch((err) => console.error("[life-stages]", err));

    return () => {
      alive = false;
      mq.removeEventListener("change", applyMq);
      STATIONS.forEach((s) => s.outgoingClip && releaseClip(s.outgoingClip));
    };
  }, []);

  /* ---- the scrubber ---- */
  useLayoutEffect(() => {
    if (!ready) return;
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const { starts } = stepWeights(readLastStepScale());

    function draw(progress: number) {
      lastProgressRef.current = progress;
      const { step: s, clip, local, rest } = resolve(progress, starts);
      if (s !== stepRef.current) {
        stepRef.current = s;
        setStep(s);
      }
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${Math.min(Math.max(progress, 0), 1)})`;
      }
      if (!clip) return;
      const img = frameFor(clip, reduced ? rest : local);
      if (!img) return;
      ctx!.clearRect(0, 0, CANVAS, CANVAS);
      /* the whole square, never cropped - 3-to-4 has content at the edges */
      ctx!.drawImage(img, 0, 0, CANVAS, CANVAS);
    }

    drawRef.current = draw;

    if (reduced) {
      /* No scrub. The step still has to follow the scroll or the section would
         be unreadable, but nothing interpolates: one frame per step, swapped
         at the boundary. */
      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => draw(self.progress),
      });
      draw(0);
      return () => trigger.kill();
    }

    const state = { p: 0 };
    const tween = gsap.to(state, {
      p: 1,
      ease: "none",
      /* onUpdate on the TWEEN, not on the trigger: the tween carries the
         scrub-smoothed value, the trigger carries the raw one */
      onUpdate: () => draw(state.p),
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
      },
    });
    draw(0);

    /* ScrollTrigger caches where the section starts and ends the moment the
       trigger is created. Two things move afterwards: the webfont swaps in and
       changes the height of everything above the section, and the media box is
       sized from vh so it resettles on any viewport change. A stale measurement
       is not subtle - measured at 375x812, progress sat at 0 even at the true
       section bottom, and a single resize event fixed it. So: re-measure once
       the layout has settled, once the page has finished loading, and once the
       fonts have landed. */
    const refresh = () => ScrollTrigger.refresh();
    const settle = window.setTimeout(refresh, 300);
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh).catch(() => {});

    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("load", refresh);
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [ready, reduced]);

  /* ---- per-step loading: this clip now, the next one behind it ---- */
  useEffect(() => {
    if (!ready) return;

    /* Under reduced motion a step never scrubs, so exactly one file per step is
       ever drawn - and for the last station that file is the END of 7-to-8, not
       its start. Nothing else is fetched. */
    const onFrame = () => drawRef.current?.(lastProgressRef.current);
    const load = (target: number) => {
      const { clip, progress } = restingFrame(target);
      if (!clip) return;
      if (!reduced) return void ensureClip(clip, { onFrame });
      const only = fileIndexFor(clip, progress);
      if (only !== null) void ensureClip(clip, { only, onFrame });
    };

    const keep = new Set(
      [step - 1, step, step + 1]
        .filter((i) => i >= 0 && i < STEPS)
        .flatMap((i) => [STATIONS[i].outgoingClip, restingFrame(i).clip])
        .filter(Boolean)
    );
    STATIONS.forEach((s) => {
      if (s.outgoingClip && !keep.has(s.outgoingClip)) releaseClip(s.outgoingClip);
    });

    load(step);
    if (step + 1 < STEPS) load(step + 1);
  }, [step, ready, reduced]);

  /* The three post cards are a swipe row under 1024, and every step replaces
     all three of them. Two reasons this resets to the first card:
     it is the right behaviour (a new station's cards should present from the
     start, not from wherever the last swipe ended), and it is also the fix for
     a real defect - with `scroll-snap-type: x mandatory` in RTL, Chrome
     re-snaps when the children are replaced and lands at the FAR END, so from
     step 2 onwards the row opened on the last card with the first two off
     screen. Measured: scrollLeft 0 at load, -581 after the first step change.
     Reset is instant, never animated - this is not a gesture the reader made. */
  useEffect(() => {
    const cards = cardsRef.current;
    if (cards) cards.scrollLeft = 0;
  }, [step]);

  /* Under 1024 the eight names do not fit across the screen, so the strip
     scrolls - and nothing scrolls it on its own. Measured at 375x812: by
     station 8 the active name had left the screen entirely. Keep it in view. */
  useEffect(() => {
    const strip = stripRef.current;
    const item = strip?.children[step] as HTMLElement | undefined;
    if (!strip || !item) return;
    if (strip.scrollWidth <= strip.clientWidth) return;
    const target =
      item.offsetLeft - (strip.clientWidth - item.offsetWidth) / 2;
    /* Clamp to the scroller's real range, or centring the first or last name
       overshoots the end and clips it against the screen edge - measured at
       375: the last station's right edge landed 3px past the viewport, which
       is the same "chopped at the edge" defect the gutters exist to prevent.
       RTL counts scrollLeft downwards from 0, so the range is [-max, 0]. */
    const max = strip.scrollWidth - strip.clientWidth;
    const rtl = getComputedStyle(strip).direction === "rtl";
    const left = rtl
      ? Math.min(0, Math.max(-max, target))
      : Math.max(0, Math.min(max, target));
    strip.scrollTo({ left, behavior: "auto" });
  }, [step]);

  useEffect(() => {
    if (step === shown) return;
    if (reduced) {
      /* no movement at all, just the swap */
      setShown(step);
      setPhase("in");
      return;
    }
    setPhase("out");
    if (exchangeRef.current) window.clearTimeout(exchangeRef.current);
    exchangeRef.current = window.setTimeout(() => {
      exchangeRef.current = null;
      /* read `step` through the setter so a step change during the out-phase
         lands on the newest one rather than the one we started for */
      setShown(() => stepRef.current);
      setPhase("in");
    }, EXCHANGE_OUT_MS);
    return () => {
      if (exchangeRef.current) {
        window.clearTimeout(exchangeRef.current);
        exchangeRef.current = null;
      }
    };
  }, [step, shown, reduced]);

  const station = STATIONS[shown];
  const related = relatedFor(station.slug);

  return (
    <section
      ref={sectionRef}
      className="ls"
      id="life-stages"
      aria-labelledby="ls-badge"
    >
      <div className="ls__sticky">
        <div className="ls__row">
          {/* dir=rtl puts the first child at the RIGHT. The text column is the
              first child because the frame has it on the right. No row-reverse
              anywhere - under dir=rtl it would flip the row back to LTR. */}
          <div className="ls__col">
            <div className="ls__top">
              {/* the badge never changes, so it never animates */}
              <p className="ls__badge" id="ls-badge">
                {SECTION_BADGE}
              </p>
              <h2 className={`ls__title ls__swap is-${phase}`}>{station.title}</h2>
              <p className={`ls__blurb ls__swap is-${phase}`}>{station.blurb}</p>
              <a className={`ls__cta ls__swap is-${phase}`} href={station.cta.href}>
                {station.cta.label}
              </a>
            </div>
            <ul ref={cardsRef} className="ls__cards" aria-label="פוסטים בנושא">
              {/* each card arrives on its own beat, so the step reads as a
                  sequence rather than as one block appearing */}
              {related.slice(0, RELATED_COUNT).map((post, i) => (
                <li
                  key={post.slug}
                  className={`ls__swap is-${phase}`}
                  style={{ ["--ls-delay" as string]: `${STAGGER.cards + i * STAGGER.step}ms` }}
                >
                  <a className="ls__card" href={`/posts/${post.slug}`}>
                    <ArrowCircle size={24} className="ls__card-arrow" />
                    <span className="ls__card-title">{post.title}</span>
                    <span className="ls__card-text">{post.description}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <figure className="ls__media">
            <canvas
              ref={canvasRef}
              width={CANVAS}
              height={CANVAS}
              role="img"
              aria-label={`איור שלב החיים: ${station.title}`}
            />
          </figure>
        </div>

        <div className="ls__bar">
          <div className="ls__rule">
            <span ref={fillRef} className="ls__fill" aria-hidden="true" />
          </div>
          <ol ref={stripRef} className="ls__stations">
            {STATIONS.map((s, i) => (
              <li
                key={s.slug}
                className={`ls__station${i === step ? " is-active" : ""}`}
                aria-current={i === step ? "step" : undefined}
              >
                {/* icon first: under dir=rtl the first child sits at the
                    RIGHT, which is where the frame puts it */}
                {/* Same treatment as the catalog row (601:515): normal is the
                    two-tone artwork, active is the whole glyph in accent, done
                    with a mask rather than a second export. */}
                <span
                  className="ls__station-icon"
                  style={
                    s.icon
                      ? ({ "--icon": `url(/icons/${s.icon})` } as React.CSSProperties)
                      : undefined
                  }
                  aria-hidden="true"
                />
                <span className="ls__station-label">{s.tabLabel}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
