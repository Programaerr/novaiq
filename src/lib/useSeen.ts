import { useEffect, useRef, useState } from 'react';

/**
 * True once the element has been on screen, and true forever after.
 *
 * Entrance animations are gated on this rather than run on mount, because the sections that use it
 * start below the fold: run on mount and the whole thing has already played by the time anyone
 * scrolls to it. `IntersectionObserver` delivers an initial callback as soon as it observes, so a
 * section that IS in view on load — a short viewport, a deep link — animates immediately and
 * correctly.
 *
 * The one-way latch matters: without it, scrolling back up replays the entrance every time, which
 * is how a page starts feeling like a demo reel.
 *
 * Pair it with the `.nq-rise` rules in index.css: write the returned flag onto the element as
 * `data-seen`, and every `.nq-rise` inside it holds its from-state until that flips.
 */
export function useSeen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    /* No observer means no way to know — show the content rather than leave it stuck at the
       from-state it is waiting on. */
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      /* A little above the fold, so the entrance has finished by the time the section is properly
         in front of someone rather than starting under their thumb. */
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, seen };
}
