/**
 * The band: a chevron-ended track — a notch where the path starts, an arrow head where it ends.
 *
 * ## One consumer, said plainly
 *
 * This was extracted when the process track and the clients strip both drew the shape. The strip
 * does not any more, so ProcessTrack is the only caller today and this is a single-consumer module.
 * That is worth stating rather than dressing up: it stands alone because the shape is a piece of
 * geometry with its own reasoning, not because two files need it. Folding it back into ProcessTrack
 * is a small change if that reads better.
 *
 * The CSS `clip-path` half of the shape used to live here too, for clipping a DOM lane into the
 * band. It went with the strip — an exported function with no callers is dead code however good it
 * is — and it is in the history if the band is ever wanted around DOM content again.
 *
 * ## Real pixels, not a stretched viewBox
 *
 * A viewBox stretched with `preserveAspectRatio="none"` scales X and Y by different factors, which
 * flattens the chevron on a wide screen and sharpens it on a narrow one. The chevron is the one
 * shape here that has to hold its angle, because it is what says "direction".
 *
 * ## Why the mirror is written out rather than transformed
 *
 * `flowsRight` is the reading direction, not the viewport's. Arabic starts on the right, so the
 * arrow head goes there and the notch on the left; English is the mirror. That mirror is spelled
 * out as its own set of coordinates instead of a `scaleX(-1)` on the whole thing, because a
 * mirroring transform would also flip everything drawn inside the band — text and marks included —
 * and un-mirroring those costs far more than these six coordinates do.
 */

/** How far into the band the notch cuts, and how far out the arrow head reaches. */
export const CHEVRON = 38;

/**
 * The outline, as one closed SVG path in real pixels.
 *
 * Real pixels rather than a normalised viewBox: a viewBox stretched with
 * `preserveAspectRatio="none"` scales X and Y by different factors, which flattens the chevron on
 * a wide screen and sharpens it on a narrow one. The chevron is the one shape here that has to
 * hold its angle, because it is what says "direction".
 */
export function bandSvgPath(w: number, h: number, flowsRight: boolean): string {
  const c = CHEVRON;
  const mid = h / 2;
  return flowsRight
    ? `M 0 0 L ${w - c} 0 L ${w} ${mid} L ${w - c} ${h} L 0 ${h} L ${c} ${mid} Z`
    : `M ${c} 0 L ${w} 0 L ${w - c} ${mid} L ${w} ${h} L ${c} ${h} L 0 ${mid} Z`;
}
