import { useEffect } from 'react';

/**
 * The tile sizes of `--stars-far` / `--stars-near` in index.css. Duplicated here on purpose
 * and only safe because of what the numbers are used for: the shift is taken modulo the
 * tile, so the layer never has to travel further than one repeat no matter how far the page
 * scrolls. If the CSS tile sizes ever change, these follow — a mismatch shows up as the
 * starfield visibly jumping every time the shift wraps.
 */
const TILE_FAR = 300;
const TILE_NEAR = 380;

/**
 * Locks the roadmap cards' starfields to the viewport rather than to the cards carrying
 * them (see `.milestone-stars`).
 *
 * The page's own sky lives in a `position: fixed` layer, so it holds still while everything
 * scrolls past it. A card's stars are painted *on the card*, so without this they travel
 * with it — and the moment the page moves, the card stops reading as a window onto that sky
 * and starts reading as a sticker of one.
 *
 * Cancelling that out is a single number: shift the stars down by exactly as far as the
 * card has moved up. It goes onto the document element as two custom properties rather than
 * onto each card, so a scroll frame is one style write feeding any number of cards, and the
 * only thing consuming it is a transform — no layout, no paint, and none of the
 * main-thread scrolling that `background-attachment: fixed` would have cost to get here.
 */
export function useStarParallax() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    let frame = 0;

    const write = () => {
      frame = 0;
      const y = window.scrollY;
      root.style.setProperty('--star-y-far', `${y % TILE_FAR}px`);
      root.style.setProperty('--star-y-near', `${y % TILE_NEAR}px`);
    };

    // scroll fires far more often than the page paints; coalesce to one write per frame.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };

    write();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
}
