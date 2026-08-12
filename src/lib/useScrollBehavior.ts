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

    // Not on touch devices — and this is a performance fix, not a preference.
    //
    // Lenis smooths *wheel* input. A phone has no wheel: it scrolls by touch, which Lenis
    // deliberately leaves to the OS because native touch scrolling already has momentum and
    // runs on the compositor. So on a phone this instance was smoothing nothing at all — while
    // still running its requestAnimationFrame callback on the main thread on every single
    // frame, for the entire life of the session, forever. Sixty to a hundred and twenty
    // wake-ups a second that cannot change a pixel is exactly the kind of permanent background
    // cost that shows up as a warm device rather than as visible stutter.
    //
    // Detected by pointer capability rather than by width: a small window on a laptop still has
    // a wheel and should still get smoothing, and a large tablet still has none.
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    let rafId: number | null = null;
    let idleFrames = 0;

    // On-demand, not continuous — and a performance trace is what forced this.
    //
    // The loop used to re-request a frame unconditionally, which meant it ran at the display's
    // full refresh rate from the moment the page opened until the tab closed. A DevTools trace
    // of five seconds of an ordinary, untouched page measured 312 of these callbacks costing
    // 253ms of main thread — a fifth of all main-thread time in the recording — spent smoothing
    // a scroll position that had not moved. It also kept the page permanently "animating", so
    // the compositor committed a new frame every frame forever, which is what a device answers
    // with heat rather than with stutter.
    //
    // Lenis only has work to do while it is easing towards a target. `isScrolling` reports
    // exactly that, so the loop now stops itself once it has been false for a short tail and
    // restarts on the input that could have started a scroll.
    const raf = (time: number) => {
      lenis.raf(time);

      if (lenis.isScrolling) idleFrames = 0;
      else idleFrames++;

      // ~20 frames of tail rather than stopping the instant isScrolling drops: the flag can
      // clear a frame or two before the easing has fully settled, and cutting the loop there
      // would freeze the last pixels of every scroll.
      if (idleFrames > 20) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(raf);
    };

    const start = () => {
      idleFrames = 0;
      if (rafId === null) rafId = requestAnimationFrame(raf);
    };
    const stop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    // Everything that can begin a scroll. Lenis's own handlers update its target during the
    // same event dispatch, so by the time the frame we request here actually runs, there is
    // already something for it to ease towards.
    const WAKE = ['wheel', 'keydown', 'pointerdown', 'touchstart'] as const;
    for (const type of WAKE) window.addEventListener(type, start, { passive: true });

    // Also gated on visibility: a scroll left mid-ease when the tab is hidden would otherwise
    // keep its tail running with no viewer.
    const onVisibility = () => (document.hidden ? stop() : undefined);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      for (const type of WAKE) window.removeEventListener(type, start);
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
