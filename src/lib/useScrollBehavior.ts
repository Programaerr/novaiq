import { useEffect } from 'react';

// Scroll behaviour for the whole app, kept out of App.tsx: neither hook touches App's own
// state beyond the arguments below, and together they were the longest stretch of App's body
// that had nothing to do with what the page actually renders.

/**
 * Kept as a no-op so the call site does not have to change, and so this note stays next to the
 * thing it explains.
 *
 * The site ran Lenis here: wheel input was intercepted and the scroll position eased towards it.
 * It has been removed, and the reason is the complaint it caused rather than any cost it had.
 * Smoothing is latency by construction — the page cannot move the full distance on the frame the
 * wheel arrives, because moving gradually is the entire feature. At the 1.1s easing this was
 * configured with, one wheel tick was measured still settling 952ms later, which is felt exactly
 * as "it waits, then it goes".
 *
 * Native scrolling has none of that: the compositor moves the page on the same frame as the
 * input, off the main thread, with nothing to schedule and nothing to catch up on. What is lost
 * is a stylistic glide; what is gained is that the page moves when the hand moves.
 *
 * Also gone with it: a per-frame main-thread callback (the loop that drove the easing), a
 * ~20 idle-frame tail after every scroll, and the `lenis` module from the bundle.
 */
export function useSmoothScroll() {
  // Intentionally empty — see above.
}

/**
 * Reports which home-page section the visitor is currently looking at, so the cosmic
 * background's glow placement can follow along. On any page other than home, the page itself
 * is the "section".
 *
 * Uses IntersectionObserver rather than a scroll listener: reading offsetTop on every scroll
 * frame forced the browser into a synchronous layout recalculation before it could paint,
 * which is one of the most common causes of visible scroll stutter. IntersectionObserver
 * reports crossings off the main scroll path and fires only when a section boundary is
 * actually crossed — a handful of times per page, not per frame.
 */
export function useSectionScrollSpy(
  activePage: string,
  setActiveSection: React.Dispatch<React.SetStateAction<string>>,
) {
  useEffect(() => {
    if (activePage !== 'home') {
      setActiveSection(activePage);
      return;
    }

    const SECTIONS: Array<{ id: string; name: string }> = [
      { id: 'templates-section', name: 'templates' },
      { id: 'contract-section', name: 'contract' },
      { id: 'timeline-section', name: 'timeline' },
      { id: 'about-section', name: 'about' },
    ];

    const elements = SECTIONS
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) {
      setActiveSection('hero');
      return;
    }

    const visibleIds = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visibleIds.add(entry.target.id);
          else visibleIds.delete(entry.target.id);
        }

        // Deepest section currently crossing the focus band wins; none means we're still at the hero.
        let nextSection = 'hero';
        for (const { id, name } of SECTIONS) {
          if (visibleIds.has(id)) nextSection = name;
        }

        setActiveSection((prev) => (prev !== nextSection ? nextSection : prev));
      },
      { rootMargin: '-33% 0px -60% 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activePage, setActiveSection]);
}
