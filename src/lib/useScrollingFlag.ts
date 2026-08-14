import { useEffect, useState } from 'react';

/**
 * Declares `<html data-scrolling>` while the page is being scrolled, and removes it ~140ms
 * after the last scroll event.
 *
 * ## Why a global flag rather than a fix per component
 *
 * Scrolling and animating at the same time is the worst case this site has, and it is worse
 * than either alone for a specific reason: while the page scrolls, the browser keeps firing
 * pointer events even though nobody moved the pointer — the content slides underneath a
 * stationary cursor, so elements enter and leave :hover, and every pointer-driven effect on the
 * page wakes up. Decorative work that is perfectly affordable when a visitor deliberately
 * hovers one button becomes per-frame work competing with the scroll itself.
 *
 * The individual offenders are worth fixing on their own terms and have been (cached layout
 * boxes in useRevealGroup, CredentialCard and useSignaturePad, none of which now measure inside
 * a pointer handler). This flag covers the rest as a class: any purely decorative animation can
 * key off it and stand down for the fraction of a second a scroll lasts, without each one
 * needing its own scroll listener.
 *
 * Nothing functional is gated on it — no interaction is blocked and no element becomes
 * unclickable. A common version of this trick puts `pointer-events: none` on the body while
 * scrolling, which does suppress hover work but also swallows real clicks; with smooth
 * scrolling on this site the "scrolling" state outlasts the gesture by design, so that would
 * read as a site that ignores taps. Only animations pause here.
 *
 * One passive listener for the whole app, with the timer reset per event so a continuous
 * scroll never flickers the flag on and off mid-gesture.
 */
export function useScrollingFlag(): void {
  useEffect(() => {
    const root = document.documentElement;
    let timer = 0;

    const onScroll = () => {
      if (!root.dataset.scrolling) root.dataset.scrolling = 'true';
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        delete root.dataset.scrolling;
      }, 140);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
      delete root.dataset.scrolling;
    };
  }, []);
}

/**
 * The same flag, readable from JavaScript.
 *
 * CSS can key off `html[data-scrolling]` directly, which is how every decorative animation on this
 * site stands down for the length of a scroll. A WebGL canvas cannot: its render loop is driven by
 * `requestAnimationFrame` inside R3F, and no stylesheet reaches that. So the flag is mirrored into
 * React state here and the canvases switch `frameloop` on it.
 *
 * This is the last real source of stutter on the home page. Three WebGL contexts and a scroll are
 * competing for one main thread and one GPU, and the scroll is the only one of the four the
 * visitor is actually doing — so the other three give way for the fraction of a second it lasts,
 * and resume 140ms after it ends.
 *
 * A MutationObserver on one attribute of one element, not a second scroll listener: the timing
 * (including the trailing delay that keeps a continuous scroll from flickering the flag) is
 * already solved above, and duplicating it would be two sources of truth that drift.
 */
export function useIsScrolling(): boolean {
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setScrolling(root.dataset.scrolling === 'true');
    sync();

    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ['data-scrolling'] });
    return () => mo.disconnect();
  }, []);

  return scrolling;
}
