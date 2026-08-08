import { useEffect } from 'react';

/** The tile sizes of `--stars-far` / `--stars-near`, and of the keyframes that travel them. */
const TILE_FAR = 300;
const TILE_NEAR = 380;

/** Whether the browser can run the scroll-driven animation `.milestone-stars` declares. */
const hasScrollTimeline = () =>
  typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline', 'scroll()');

/**
 * Holds the roadmap cards' starfields still while the page scrolls past them, so a card
 * reads as a window onto the same sky the page background has rather than as a sticker of
 * one. See `.milestone-stars`.
 *
 * Two jobs, and which one runs depends on the browser:
 *
 *   - Where scroll-driven animations exist, the CSS does the cancelling on the compositor
 *     and all this does is tell it how long a scroll is: one animation iteration has to span
 *     exactly one tile of scrolling, so the iteration count is the scroll range over the
 *     tile. Measured on mount and on resize — twice a page, not sixty times a second.
 *   - Where they don't, it falls back to writing the shift itself, rAF-coalesced, and only
 *     while the roadmap is actually near the viewport. That path is a frame behind a
 *     compositor-driven scroll by construction, which is why it is the fallback and not the
 *     implementation.
 *
 * The shift is taken modulo the tile in both paths: the pattern repeats on exactly that
 * distance, so the wrap is invisible and the layer never has to travel more than one tile.
 */
export function useStarParallax(sectionRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;

    if (hasScrollTimeline()) {
      const measure = () => {
        const range = Math.max(1, root.scrollHeight - window.innerHeight);
        root.style.setProperty('--star-iters-far', `${range / TILE_FAR}`);
        root.style.setProperty('--star-iters-near', `${range / TILE_NEAR}`);
      };
      measure();
      // The page grows as sections mount and images settle, and the range is what the
      // iteration count is derived from, so it has to be re-read when the document resizes.
      const observer = new ResizeObserver(measure);
      observer.observe(document.body);
      window.addEventListener('resize', measure);
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', measure);
      };
    }

    let frame = 0;
    let layers: HTMLElement[] = [];

    const write = () => {
      frame = 0;
      const y = window.scrollY;
      for (const el of layers) {
        const tile = el.classList.contains('milestone-stars--near') ? TILE_NEAR : TILE_FAR;
        // Written straight onto the eight layers rather than into a custom property on
        // :root. A variable there is inherited, so changing it every frame asks the whole
        // document to be re-resolved; eight inline transforms touch eight elements.
        el.style.transform = `translate3d(0, ${y % tile}px, 0)`;
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };

    // Off-screen the cancelling is invisible, so none of it needs to happen — and the
    // roadmap is off-screen for most of the page's scroll.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          layers = [...section.querySelectorAll<HTMLElement>('.milestone-stars')];
          write();
          window.addEventListener('scroll', onScroll, { passive: true });
        } else {
          window.removeEventListener('scroll', onScroll);
        }
      },
      { rootMargin: '300px 0px' },
    );
    observer.observe(section);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [sectionRef]);
}
