import { useEffect } from 'react';
import Lenis from 'lenis';

// Scroll behaviour for the whole app, kept out of App.tsx: neither hook touches App's own
// state beyond the arguments below, and together they were the longest stretch of App's body
// that had nothing to do with what the page actually renders.

/**
 * iPhone-style scrolling for wheel and trackpad input: the page follows the input immediately
 * and keeps gliding for a moment after it stops.
 *
 * ## The distinction this hook exists to get right
 *
 * "Smooth" and "laggy" are the same mechanism at different settings, which is why this was got
 * wrong once already. What an iPhone actually does is track the finger 1:1 with no delay at all,
 * and add momentum only AFTER the finger lifts. What this hook used to do was the opposite: every
 * wheel tick started a fixed 1.1-second ease, so the page trailed the input for the whole gesture
 * — one tick was measured still settling 952ms later. That is felt as "it waits, then it goes",
 * and no amount of easing curve fixes it, because the delay is the setting.
 *
 * So: `lerp`, never `duration`. Lerp moves a fixed FRACTION of the remaining distance each frame,
 * which means it has no fixed length and no start-up ramp — the first frame covers the largest
 * share and the rest tapers into the glide. A second tick mid-glide moves the target instead of
 * restarting a clock, so fast repeated scrolling stays under the hand rather than turning rubbery.
 *
 * 0.28 is high enough that roughly 90% of any tick is covered inside ~7 frames (about a tenth of
 * a second at 60Hz) while the remaining tail is still visible as motion. Lower values look more
 * dramatic and immediately start feeling like lag; that is the whole trade, and it is worth
 * remembering before anyone tunes this down again.
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
    // frame, for the entire life of the session.
    //
    // Detected by pointer capability rather than by width: a small window on a laptop still has
    // a wheel and should still get smoothing, and a large tablet still has none.
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

    const lenis = new Lenis({ lerp: 0.28 });

    let rafId: number | null = null;
    let idleFrames = 0;

    // On-demand, not continuous — and a performance trace is what forced this.
    //
    // The loop used to re-request a frame unconditionally, which meant it ran at the display's
    // full refresh rate from the moment the page opened until the tab closed, smoothing a scroll
    // position that had not moved. Lenis only has work to do while it is easing towards a target;
    // `isScrolling` reports exactly that, so the loop stops itself once that has been false for a
    // short tail and restarts on the input that could have started a scroll.
    const raf = (time: number) => {
      lenis.raf(time);

      if (lenis.isScrolling) idleFrames = 0;
      else idleFrames++;

      // A short tail rather than stopping the instant isScrolling drops: the flag can clear a
      // frame or two before the easing has fully settled, and cutting the loop there would
      // freeze the last pixels of every scroll.
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
