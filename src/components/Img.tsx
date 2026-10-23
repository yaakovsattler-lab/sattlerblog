/*
 * One <picture> for every raster image on the site.
 *
 * AVIF, then WebP, then the original PNG. All three carry alpha - nothing in
 * this chain can flatten a transparent illustration onto white, and
 * scripts/optimise-images.mjs decodes every generated file to prove it rather
 * than trusting the encoder.
 *
 * width and height are always set, so the box exists before the bytes arrive
 * and nothing below shifts while it loads. `priority` marks the one image
 * above the fold on the page being viewed; everything else is lazy.
 */

const WIDTHS = [240, 400, 560, 760];

export default function Img({
  name,
  fallback,
  alt,
  width,
  height,
  className,
  sizes,
  priority = false,
  maxWidth,
}: {
  /** basename in public/opt, e.g. "pkudat-stop-loss" */
  name: string;
  /** the original file, used as the last resort source */
  fallback: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** what the browser should assume the rendered width is */
  sizes: string;
  priority?: boolean;
  /** skip generated widths larger than the source */
  maxWidth?: number;
}) {
  const widths = WIDTHS.filter((w) => !maxWidth || w <= maxWidth);
  const set = (ext: string) =>
    widths.map((w) => `/opt/${name}-${w}.${ext} ${w}w`).join(", ");

  return (
    <picture>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fallback}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : undefined}
      />
    </picture>
  );
}
