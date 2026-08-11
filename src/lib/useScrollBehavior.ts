import { useEffect } from 'react';
import Lenis from 'lenis';

// Scroll behaviour for the whole app, kept out of App.tsx: neither hook touches App's own
// state beyond the arguments below, and together they were the longest stretch of App's body
// that had nothing to do with what the page actually renders.

/**
 * Buttery-smooth wheel scrolling (iOS-style momentum) for mouse/trackpad input — touch
 * devices already get native momentum scrolling from the OS, so this only changes the feel
 * of wheel-driven scrolling. Skipped under reduced-motion; elements marked
 * `data-lenis-prevent` (modals, admin tables, the PDF preview) keep native scroll intact.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    let rafId: number | null = null;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    // The loop otherwise runs for the app's entire lifetime, including while the tab is
    // backgrounded. Gated on visibilitychange rather than reusing usePauseOffscreenWork's
    // data-idle attribute: that one pauses CSS animations, but Lenis needs its rAF loop
    // actually stopped, not just visually frozen.
    const start = () => {
      if (rafId === null) rafId = requestAnimationFrame(raf);
    };
    const stop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
      lenis.destroy();
    };
  }, []);
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
