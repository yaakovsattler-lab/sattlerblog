#!/usr/bin/env python3
"""
Derive a scrub-ready WebP frame sequence from each of the seven transition mp4s.

Why this exists: the source clips carry one keyframe and B-frames, so seeking a
<video> element per scroll tick is far too slow. A canvas drawing pre-extracted
stills is instant.

Three things it does that a plain `ffmpeg -i in.mp4 out%03d.webp` does not:

1. It honours the per-clip in/out range from the measured motion note, so dead
   frames at the head or tail of a clip never reach the browser.
2. It clamps the white point, because the 480p h264 encode leaves the paper
   grey and uneven - measured at 249-255 across a clip, and visibly different
   from the page behind it. See WHITE_POINT below for how the threshold was
   picked. The source mp4s are never rewritten; this happens on the way out.

3. The clips are 12fps content rendered into a 24fps container, so roughly every
   second frame is a near-duplicate. It detects duplicates by measured luminance
   delta (not by assuming a fixed cadence - the cadence is not perfectly regular)
   and writes only the distinct frames, plus a `map` array that sends every
   original frame index to the file that should be shown for it. The scrubber
   therefore still maps progress linearly over the ORIGINAL frame range; the
   de-duplication is purely a transfer-size saving and cannot shift the timing.

Source clips are read-only. Nothing here writes back to transition-frames/.

IMPORTANT: this script REPLACES public/frames entirely, which deletes the AVIF
set that scripts/encode-frames-avif.mjs writes alongside the WebP files. Always
run `npm run frames:avif` after `npm run frames`. The loader retries the other
extension per image, so forgetting costs bytes rather than breaking the
section, but it is still a silent 2x weight regression.
"""

import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageChops, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT.parent / "transition-frames"
OUT = ROOT / "public" / "frames"

# 1-based in/out frame per clip - the measured motion note, verbatim.
CLIPS = {
    "1-to-2": (1, 98),
    "2-to-3": (1, 102),
    "3-to-4": (15, 108),
    "4-to-5": (1, 101),
    "5-to-6": (8, 114),
    "6-to-7": (11, 97),
    "7-to-8": (1, 104),
}

# Mean per-pixel luminance delta below which a frame is treated as a repeat of
# the one before it. Measured on clip 1-to-2: real steps land at 5-22, repeats
# at 0.07-2.2. 3.5 sits in the empty band between the two populations.
DUPLICATE_THRESHOLD = 3.5

WEBP_QUALITY = 82

# Lossy WebP is allowed to move a flat block, and it does: before this check
# two frames came out of the encoder with the empty paper tinted by up to 8
# levels in one channel - the same defect the white point fixes, put back by
# our own encoder. So every frame is decoded again after it is written and the
# open paper is checked; a frame that did not survive is re-encoded a step up
# the ladder.
WEBP_LADDER = (
    {"quality": WEBP_QUALITY, "method": 6},
    {"quality": 95, "method": 6},
    {"lossless": True, "method": 6},
)

# How far below 255 a single pixel of open paper may land. Measured over 12
# frames from four clips at quality 82: the worst pixel anywhere in the open
# paper is 4 levels down and there are 22-725 such pixels out of ~270,000, so
# 0.01-0.3% of the paper, one pixel at a time. That is ringing at pixel scale
# and it is not visible. The defect being fixed here is the opposite shape - a
# uniform cast over the WHOLE field - which shows immediately. Demanding a
# literal 255 everywhere instead pushes every frame to lossless and the section
# from 10 MB to 43 MB, which is a bad trade for something no one can see.
FLAT_TOLERANCE = 4

# Erosion radius for "open paper": a pixel with any ink within 4px is an
# anti-aliased edge and the encoder is allowed to ring there.
FLAT_ERODE = 9

# White point. The 480p h264 encode leaves the paper grey and uneven, and the
# unevenness is both in brightness and in colour: measured on clip 1-to-2, the
# background carries chroma noise in blocks, so a paper pixel can read
# (255, 255, 248) - bright but tinted. So the decision is made on LUMINANCE,
# not per channel. A pixel whose luminance is at or above the white point is
# paper and becomes pure white; everything below is scaled by the same
# 255/250 factor rather than crushed, so the clamp stays one continuous move
# and no anti-aliased edge loses its gradient.
#
# Measured, not guessed. Over the 121 frames of clip 1-to-2, a 3px border ring
# (always paper) reads luminance >= 250 for 99.49% of its pixels, and what
# falls below falls away smoothly - 1,895 pixels at 249, 401 at 248, 248 at
# 247 - which is the anti-aliasing of the line art crossing the ring, not the
# field. On a frame with a strongly saturated figure, 96,045 paper pixels read
# luminance >= 250 with up to 10 levels of colour spread; a per-channel rule
# left every one of them tinted, which is why this one is on luminance.
# The light grey fills inside the illustrations sit far below 250 and are
# untouched - a 1.02 multiply is all that reaches them.
WHITE_POINT = 250

# Everything below the white point is stretched, not crushed.
WHITE_STRETCH_LUT = [min(255, round(v * 255.0 / WHITE_POINT)) for v in range(256)] * 3

# ...and paper that the white point alone would miss. A pixel can read 246-249
# and still be paper: the inside of a figure's limb, or a block of background
# the encoder pushed down a level. The tell is not its own value, it is what
# surrounds it - real paper has nothing dark anywhere near it, an anti-aliased
# edge has ink within a pixel or two by definition. So a pixel also counts as
# paper when every pixel in its 5x5 neighbourhood is at or above NEAR_WHITE.
#
# Measured on 13 frames: this whitens a further 612-55,667 pixels per frame,
# all of them inside the white fill of a figure or in open background, and
# their luminance is always 246-249. Nothing in the illustrations sits in that
# band as an intended grey - the greys in this artwork are the scribble, which
# is far darker.
NEAR_WHITE = 246
NEAR_WHITE_RADIUS = 5

PURE_WHITE = (255, 255, 255)


def clamp_white(img: Image.Image) -> Image.Image:
    """Paper to pure white, everything else stretched by the same factor."""
    lum = img.convert("L")
    bright = lum.point(lambda v: 255 if v >= WHITE_POINT else 0)
    interior = lum.point(lambda v: 255 if v >= NEAR_WHITE else 0).filter(
        ImageFilter.MinFilter(NEAR_WHITE_RADIUS)
    )
    paper = ImageChops.lighter(bright, interior)
    white = Image.new("RGB", img.size, PURE_WHITE)
    return Image.composite(white, img.point(WHITE_STRETCH_LUT), paper)


def mean_delta(a: Image.Image, b: Image.Image) -> float:
    hist = ImageChops.difference(a, b).histogram()
    return sum(i * c for i, c in enumerate(hist)) / sum(hist)


def flat_field(img: Image.Image) -> Image.Image:
    """Mask of the open paper: pure white with pure white all around it."""
    white = img.convert("L").point(lambda v: 255 if v == 255 else 0)
    return white.filter(ImageFilter.MinFilter(FLAT_ERODE))


def probe_points(size: int) -> list[tuple[int, int]]:
    """Four corners and four edge midpoints - the points a reviewer samples."""
    last = size - 1
    half = size // 2
    return [(0, 0), (last, 0), (0, last), (last, last),
            (half, 0), (0, half), (last, half), (half, last)]


def paper_survived(img: Image.Image, path: pathlib.Path) -> bool:
    """Did the encode keep the paper where the clamp put it?

    Two conditions, and the frame has to pass both:
      - no pixel of open paper more than FLAT_TOLERANCE below 255
      - the eight probe points come back exactly as they went in, with no
        tolerance at all, because those are the points the fix is checked at
    """
    back = Image.open(path).convert("RGB")
    mask = flat_field(img)
    worst = ImageChops.lighter(
        back.convert("L"), ImageChops.invert(mask)
    ).getextrema()[0]
    if 255 - worst > FLAT_TOLERANCE:
        return False
    return all(
        back.getpixel(xy) == img.getpixel(xy) for xy in probe_points(img.width)
    )


def save_frame(img: Image.Image, path: pathlib.Path) -> int:
    """Write the frame, then prove the paper survived the encode."""
    for step, opts in enumerate(WEBP_LADDER):
        img.save(path, "WEBP", **opts)
        if paper_survived(img, path):
            return step
    raise SystemExit(f"{path}: paper did not survive any encoder setting")


def main() -> int:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    manifest = {}
    escalated = []
    not_white = []
    for name, (first, last) in CLIPS.items():
        mp4 = SRC / name / f"transition-{name}.mp4"
        if not mp4.exists():
            print(f"missing source clip: {mp4}", file=sys.stderr)
            return 1

        with tempfile.TemporaryDirectory() as tmp:
            tmpdir = pathlib.Path(tmp)
            subprocess.run(
                ["ffmpeg", "-v", "error", "-i", str(mp4), "-vsync", "0",
                 str(tmpdir / "f%04d.png")],
                check=True,
            )
            frames = sorted(tmpdir.glob("f*.png"))
            window = frames[first - 1:last]  # inclusive, 1-based

            clip_dir = OUT / name
            clip_dir.mkdir()

            index_map = []      # original position in window -> distinct file index
            kept = 0
            prev_gray = None
            for pos, path in enumerate(window):
                img = clamp_white(Image.open(path).convert("RGB"))
                gray = img.convert("L")
                is_repeat = (
                    prev_gray is not None
                    and mean_delta(gray, prev_gray) < DUPLICATE_THRESHOLD
                )
                if is_repeat:
                    index_map.append(kept - 1)
                else:
                    step = save_frame(img, clip_dir / f"{kept:03d}.webp")
                    if step:
                        escalated.append((name, kept, step))
                    off = [
                        (xy, img.getpixel(xy))
                        for xy in probe_points(img.width)
                        if img.getpixel(xy) != PURE_WHITE
                    ]
                    if off:
                        not_white.append((name, kept, off))
                    index_map.append(kept)
                    kept += 1
                    prev_gray = gray

            manifest[name] = {
                "in": first,
                "out": last,
                "frameCount": len(window),
                "distinctCount": kept,
                "map": index_map,
            }
            bytes_ = sum(p.stat().st_size for p in clip_dir.glob("*.webp"))
            print(f"{name}: window {first}-{last} = {len(window)} frames -> "
                  f"{kept} distinct, {bytes_ / 1024:.0f} KB")

    (OUT / "manifest.json").write_text(
        json.dumps(manifest, separators=(",", ":")), encoding="utf-8"
    )
    for name, idx, off in not_white:
        print(f"probe point not pure white BEFORE encoding: {name}/{idx:03d} {off}")
    for name, idx, step in escalated:
        print(f"re-encoded {name}/{idx:03d} at ladder step {step} "
              f"({WEBP_LADDER[step]}) - flat paper did not survive step {step - 1}")
    total = sum(p.stat().st_size for p in OUT.rglob("*.webp"))
    print(f"total: {total / 1024 / 1024:.2f} MB across {len(CLIPS)} clips")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
