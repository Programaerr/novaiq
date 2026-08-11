import { useEffect, useState } from 'react';

/**
 * True while any scrollable ancestor in this document is actively moving, false again a
 * short idle window after the last scroll event.
 *
 * `document`-level with `capture: true` rather than one listener per scroller: `scroll`
 * doesn't bubble, but it does traverse the capture phase, so a single listener here catches
 * both a plain window/document scroll and a nested `overflow-auto` pane scrolling internally
 * — exactly the two shapes the same demo-preview navbar renders under (a full page inside an
 * iframe vs. a scrollable pane inside the parent app), without the caller needing to know
 * which one it is in.
 */
export function useIsScrolling(idleMs = 150): boolean {
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const onScroll = () => {
      setIsScrolling(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIsScrolling(false), idleMs);
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, true);
      window.clearTimeout(timer);
    };
  }, [idleMs]);

  return isScrolling;
}
