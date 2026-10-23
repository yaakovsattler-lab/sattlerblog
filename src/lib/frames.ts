/*
 * Frame store for the scroll-scrubbed media box.
 *
 * Why frames and not a <video>: the seven source clips carry a single keyframe
 * plus B-frames, so every `currentTime =` write costs a full GOP decode. At
 * scroll speed that is visibly late. Stills drawn to a canvas are instant.
 *
 * What scripts/extract-frames.py produced, and what this module assumes:
 *   - one folder per clip under /frames/<clip>/, files 000.<ext> .. NNN.<ext>,
 *     written in BOTH .avif and .webp. AVIF is about half the bytes (10.08 MB
 *     -> 5.19 MB across the 319 frames) and every frame was checked to be
 *     byte-identical to its WebP at the eight probe points the white point was
 *     verified with, so the choice of format cannot change what is drawn.
 *     WebP remains the fallback for a browser without AVIF, and deleting the
 *     .avif files is a complete revert.
 *   - manifest.json giving, per clip, the in/out frame numbers, how many
 *     ORIGINAL frames that window holds (`frameCount`), and a `map` array of
 *     that length sending each original frame to the file that shows it.
 *
 * The map exists because the clips are 12fps content in a 24fps container:
 * about half the frames repeat the one before. Only the distinct ones are
 * written to disk, but the scrubber still addresses the ORIGINAL frame range,
 * so de-duplication is a transfer-size saving that cannot shift the timing.
 */

export type ClipMeta = {
  in: number;
  out: number;
  /** number of original frames in the in..out window */
  frameCount: number;
  /** number of distinct files on disk */
  distinctCount: number;
  /** length frameCount; original index -> file index */
  map: number[];
};

export type Manifest = Record<string, ClipMeta>;

type Clip = {
  meta: ClipMeta;
  /** length distinctCount; a slot is filled once that file has decoded */
  images: (HTMLImageElement | undefined)[];
  /** highest file index decoded so far, -1 while nothing has arrived */
  ready: number;
  aborted: boolean;
};

const clips = new Map<string, Clip>();
let manifest: Manifest | null = null;

/* Which format this browser can actually decode. Detected once by decoding a
   1x1 AVIF rather than by sniffing the user agent, and awaited before the
   first frame request so no clip is ever fetched twice. */
let frameExt: Promise<"avif" | "webp"> | null = null;

/* A real 1x1 AVIF, produced by the same encoder that wrote the frames
   (scripts/encode-frames-avif.mjs), so the probe cannot disagree with them.
   The first hand-copied constant here decoded as nothing and silently sent
   every browser down the WebP path - which looked like working software. */
const AVIF_1X1 =
  "data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAAXBtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAADRpbG9jAAAAAERAAAIAAQAAAAABlAABAAAAAAAAAB8AAgAAAAABswABAAAAAAAAABQAAAA4aWluZgAAAAAAAgAAABVpbmZlAgAAAAABAABhdjAxAAAAABVpbmZlAgAAAAACAABhdjAxAAAAAA5waXRtAAAAAAABAAAAr2lwcnAAAACKaXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAcAAAAAA5waXhpAAAAAAEIAAAAOGF1eEMAAAAAdXJuOm1wZWc6bXBlZ0I6Y2ljcDpzeXN0ZW1zOmF1eGlsaWFyeTphbHBoYQAAAAAdaXBtYQAAAAAAAAACAAEDgQIDAAIEhAIFhgAAABppcmVmAAAAAAAAAA5hdXhsAAIAAQABAAAAO21kYXQSAAoHOAAGkBDQaTISGsJi5OYYYYFCIACQNY48fRtQEgAKBBgABhUyChmAQQEAAiEbtYA=";

function detectFrameFormat(): Promise<"avif" | "webp"> {
  if (frameExt) return frameExt;
  frameExt = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width === 1 ? "avif" : "webp");
    img.onerror = () => resolve("webp");
    img.src = AVIF_1X1;
  });
  return frameExt;
}

export async function loadManifest(): Promise<Manifest> {
  if (manifest) return manifest;
  const res = await fetch("/frames/manifest.json");
  if (!res.ok) throw new Error(`frames manifest: HTTP ${res.status}`);
  manifest = (await res.json()) as Manifest;
  return manifest;
}

function decode(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  img.decoding = "async";
  return img.decode().then(() => img);
}

/**
 * Start (or resume) loading a clip. Frames arrive in order, so the first frame
 * is drawable almost immediately and the rest fill in behind it. Calling this
 * again for a clip already loading is a no-op.
 *
 * `only` loads a single file index and nothing else - used under
 * prefers-reduced-motion, where one frame per step is all that is ever drawn.
 */
export async function ensureClip(
  name: string,
  opts: { only?: number; onFrame?: () => void } = {}
): Promise<void> {
  const m = manifest;
  if (!m || !m[name]) return;
  let clip = clips.get(name);
  if (!clip) {
    clip = {
      meta: m[name],
      images: new Array(m[name].distinctCount).fill(undefined),
      ready: -1,
      aborted: false,
    };
    clips.set(name, clip);
  }
  clip.aborted = false;

  const order =
    opts.only !== undefined
      ? [opts.only]
      : Array.from({ length: clip.meta.distinctCount }, (_, i) => i);

  for (const i of order) {
    if (clip.aborted) return;
    if (clip.images[i]) continue;
    try {
      const ext = await detectFrameFormat();
      const stem = `/frames/${name}/${String(i).padStart(3, "0")}`;
      /* Per-image fallback, not just per-browser. `npm run frames` rebuilds the
         WebP set and removes the AVIF one, so a run of the extractor without
         `npm run frames:avif` after it would otherwise leave a browser that
         CAN decode AVIF asking for files that are not there. One retry on the
         other extension makes that a slower load instead of a dead section. */
      clip.images[i] = await decode(`${stem}.${ext}`).catch(() =>
        decode(`${stem}.${ext === "avif" ? "webp" : "avif"}`)
      );
    } catch {
      /* a single missing frame must not stall the sequence - the nearest
         earlier frame keeps being drawn and the section stays usable */
      continue;
    }
    if (i > clip.ready) clip.ready = i;
    /* Tell the caller a frame landed. Without this, a viewer sitting still at
       the top of the section sees an empty box: draw() ran once before any
       frame had decoded, and nothing redraws until they scroll. */
    opts.onFrame?.();
  }
}

/** Stop loading a clip and let the browser reclaim its decoded frames. */
export function releaseClip(name: string): void {
  const clip = clips.get(name);
  if (!clip) return;
  clip.aborted = true;
  clips.delete(name);
}

/**
 * The image to draw for `progress` (0..1) through a clip.
 *
 * Linear, clamped at both ends, and addressed against the ORIGINAL frame
 * window - no easing here on purpose. All smoothing lives in the ScrollTrigger
 * scrub, which is the one place it can be tuned without changing the mapping.
 *
 * Returns the nearest already-decoded frame at or before the target, so a
 * partly-loaded clip degrades into a lower frame rate rather than a blank box.
 */
export function frameFor(
  name: string,
  progress: number
): HTMLImageElement | null {
  const clip = clips.get(name);
  if (!clip || clip.ready < 0) return null;
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  const original = Math.round(p * (clip.meta.frameCount - 1));
  let file = clip.meta.map[original] ?? 0;
  if (file > clip.ready) file = clip.ready;
  for (let i = file; i >= 0; i--) {
    const img = clip.images[i];
    if (img) return img;
  }
  return null;
}

/** Original-frame progress that lands exactly on a clip's last frame. */
export const LAST_FRAME = 1;
/** ...and on its first. */
export const FIRST_FRAME = 0;

/**
 * Which FILE a given progress resolves to, without needing the clip loaded.
 * Used to fetch exactly one frame per step under prefers-reduced-motion.
 */
export function fileIndexFor(name: string, progress: number): number | null {
  const meta = manifest?.[name];
  if (!meta) return null;
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  const original = Math.round(p * (meta.frameCount - 1));
  return meta.map[original] ?? 0;
}
