import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * The colour actually painted immediately above an element, measured from the rendered page.
 *
 * ## Why this is measured rather than declared
 *
 * The footer draws a belt of cubes that ramps out of whatever section ends the page and into the
 * footer's own ground, so every page closes on one continuous surface. That belt needs to know one
 * thing: the colour directly above it.
 *
 * That used to be a hand-written map in App.tsx — page id to colour, four entries, with a fallback
 * for everything else. It is the kind of table that is correct on the day it is written and wrong
 * forever after, in a way nobody sees until they look at the right page: a new page that nobody
 * remembered to add silently took the fallback, and the belt ramped out of a colour that was not on
 * the screen. A seam, on a page the map had never heard of.
 *
 * So nothing declares it any more. The page is asked what it is painting, which is the one answer
 * that cannot drift from what is on the screen — because it IS what is on the screen. Add a page
 * tomorrow, in any colour, and its footer joins onto it correctly with no entry written anywhere.
 *
 * ## What "above" means
 *
 * Not `previousElementSibling`: the footer is wrapped (LazyOnView renders a div around it), so its
 * own previous sibling is usually nothing at all. The search climbs to the first ancestor that HAS
 * a preceding sibling — `<main>`, in this app — and that is the block whose bottom edge the footer
 * meets. Any future wrapper around either one changes nothing.
 *
 * Then it descends: at each level it takes the last child that still reaches that bottom edge, and
 * remembers the deepest opaque background colour it passed through. The result is the colour a
 * pixel at the bottom of the content would be.
 *
 * Elements that paint no solid colour of their own — a transparent section, or one whose surface is
 * a gradient rather than a `background-color` — are skipped, and the answer falls through to
 * whatever solid is behind them. A page whose last section is transparent therefore reports the
 * page ground, which is exactly right: that is what the visitor sees there.
 */

/** One canvas, reused, for normalising any CSS colour to a form the band's maths can read.
 *  `fillStyle` accepts every colour syntax the browser does — `oklch()`, `color(srgb ...)`, a bare
 *  keyword — and serialises back to `#rrggbb` when opaque, which is what `shadeColor` in
 *  TileField.tsx parses. Doing this by hand would mean reimplementing CSS colour parsing. */
let probe: CanvasRenderingContext2D | null | undefined;

function toHex(color: string): string | null {
  if (!color) return null;
  if (probe === undefined) probe = document.createElement('canvas').getContext('2d');
  if (!probe) return null;

  // A value the canvas cannot parse leaves fillStyle untouched, so seed it with a known sentinel
  // and treat "unchanged" as "not a colour".
  probe.fillStyle = '#000000';
  probe.fillStyle = color;
  const first = probe.fillStyle;
  probe.fillStyle = '#ffffff';
  probe.fillStyle = color;
  if (probe.fillStyle !== first) return null;

  // Opaque colours serialise as `#rrggbb`. Anything else is translucent (or `rgba(0,0,0,0)`),
  // which is not a ground — the thing behind it is.
  return typeof first === 'string' && first.startsWith('#') ? first : null;
}

/** The solid background this element paints, or null if it paints none. */
function solidBackground(el: HTMLElement): string | null {
  const cs = getComputedStyle(el);
  // Fixed and sticky boxes float over the page rather than sitting at the end of it; whatever they
  // cover, they are not the surface the footer is joining onto.
  if (cs.position === 'fixed' || cs.position === 'sticky') return null;
  if (cs.visibility === 'hidden' || cs.opacity === '0') return null;
  return toHex(cs.backgroundColor);
}

/** The first preceding block, climbing out of however many wrappers the footer sits in. */
function precedingBlock(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el;
  while (node) {
    const prev = node.previousElementSibling as HTMLElement | null;
    if (prev) return prev;
    node = node.parentElement;
  }
  return null;
}

function measure(el: HTMLElement): string | null {
  const above = precedingBlock(el);
  if (!above) return null;

  const bottom = above.getBoundingClientRect().bottom;
  let found: string | null = null;
  let node: HTMLElement | null = above;

  while (node) {
    const solid = solidBackground(node);
    if (solid) found = solid;

    // Descend into the last child that still reaches the bottom edge. Taking the LAST such child
    // matters: siblings overlap in paint order, and the one written last is the one on top.
    let next: HTMLElement | null = null;
    for (const child of Array.from(node.children)) {
      if (!(child instanceof HTMLElement)) continue;
      const r = child.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom >= bottom - 1) next = child;
    }
    node = next;
  }

  return found;
}

/** The page's own ground, for when nothing above paints a colour of its own. */
function pageGround(): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--nq-ground').trim();
  return toHex(raw) ?? '#F7F9FC';
}

/**
 * @param ref     The element whose upstairs neighbour is being measured (the footer).
 * @param pageKey Re-measures whenever this changes. The footer outlives navigation — it is mounted
 *                once, above the router's page switch — so without this it would keep reporting the
 *                colour of the page the visitor arrived on.
 */
export function useGroundAbove(ref: RefObject<HTMLElement | null>, pageKey: string): string {
  const [color, setColor] = useState<string>(() =>
    typeof document === 'undefined' ? '#F7F9FC' : pageGround(),
  );

  // Layout effect, not effect: this runs before the browser paints, so the belt's first painted
  // frame is already the right colour rather than the fallback corrected a frame later.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const read = () => setColor(measure(el) ?? pageGround());
    read();

    // The content above changes height when a lazily-mounted section arrives or the window
    // resizes, and either can change which element reaches its bottom edge. Observing the block
    // itself catches both without a second listener, and costs nothing while it is still.
    const above = precedingBlock(el);
    const ro = new ResizeObserver(read);
    if (above) ro.observe(above);
    window.addEventListener('resize', read);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', read);
    };
  }, [ref, pageKey]);

  return color;
}
