/**
 * The band: one shape, two sections, one definition.
 *
 * The process track and the clients strip both draw the same chevron-ended band — a notch where
 * the path starts and an arrow head where it ends. Writing it twice would mean two chevron angles
 * that agree today and drift the first time one of them is nudged, and the whole point of the two
 * sections sharing a shape is that they are recognisably the same object.
 *
 * ## Why there are two functions and not one
 *
 * The outline is an SVG `<path>`, because a stroke is the only way to get a hairline that follows
 * a diagonal cleanly. The content inside it is DOM — logos, buttons, text — and DOM is clipped
 * with a CSS `clip-path`. So the shape has to exist in both languages, and the pair below is the
 * one place where their agreement is guaranteed: same constant, same corner order, same maths.
 *
 * ## Why the mirror is written out rather than transformed
 *
 * `flowsRight` is the reading direction, not the viewport's. Arabic starts on the right, so the
 * arrow head goes there and the notch on the left; English is the mirror. That mirror is spelled
 * out as its own set of coordinates instead of a `scaleX(-1)` on the whole thing, because a
 * mirroring transform would also flip everything drawn inside the band — logos and text included —
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

/**
 * The same outline as a CSS `clip-path`, for clipping DOM content to the band.
 *
 * Percentages on the vertical axis and pixels on the horizontal, which is exactly what keeps this
 * in step with the SVG above: the chevron's run is a fixed 38px in both, and its height is half
 * the band in both. A percentage horizontal inset would have made the angle a function of the
 * screen width and put the two shapes quietly out of agreement on every viewport but one.
 */
export function bandClipPath(flowsRight: boolean): string {
  const c = `${CHEVRON}px`;
  return flowsRight
    ? `polygon(0 0, calc(100% - ${c}) 0, 100% 50%, calc(100% - ${c}) 100%, 0 100%, ${c} 50%)`
    : `polygon(${c} 0, 100% 0, calc(100% - ${c}) 50%, 100% 100%, ${c} 100%, 0 50%)`;
}
