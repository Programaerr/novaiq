import { useEffect } from 'react';

/**
 * Lets the page fall completely still when the visitor stops interacting with it, and brings it
 * back to life on the first sign that they have not.
 *
 * ## Why this exists (it is the heat fix, and a trace named it)
 *
 * A DevTools performance recording of this site sitting on screen, untouched, measured 312
 * rendered frames in 5.5 seconds — a sustained 56fps — with only 7 frames dropped. That is the
 * important result and it is not the one you would guess from the symptom: the page was not
 * stuttering at all. It was running perfectly smoothly, and it was never stopping. Every one of
 * those frames cost a style recalculation over 23 elements, a full compositor Layerize pass and
 * a commit, on the main thread, forever.
 *
 * Nothing here was expensive. A blinking cursor, three pulsing dots, two drifting star layers, a
 * couple of rotating button beams: none of them costs more than a fraction of a millisecond. But
 * an `infinite` animation is a standing instruction to the browser to produce a new frame for as
 * long as the page is open, and a phone answers a device that never stops rendering the way it
 * answers a game — by running warm until the person notices. Heat is not the price of one
 * expensive frame; it is the price of never reaching zero.
 *
 * ## Why resting rather than deleting
 *
 * The alternative was to remove the decorative loops, which would have traded the site's
 * character for its temperature. This keeps every one of them: the page is fully alive during
 * every moment the visitor is doing anything at all — moving the pointer, scrolling, typing,
 * touching the screen — and goes quiet only once they have genuinely stopped, which is exactly
 * when nobody is looking at the motion anyway. First input wakes it in the same frame.
 *
 * `animation-play-state: paused` holds each animation at its exact current position, so waking
 * up continues from where it left off instead of restarting or jumping. See the
 * `html:is([data-idle], [data-resting])` rule in index.css for the list of loops this covers —
 * named, never `*`, for the reason documented there.
 *
 * Complements usePauseOffscreenWork, which answers a different question: that one stops motion
 * when the page *cannot* be seen, this one when it is being seen but not used.
 */
export function useIdleRest(delayMs = 5000): void {
  useEffect(() => {
    const root = document.documentElement;
    let timer: number | undefined;
    let lastWake = 0;

    const rest = () => {
      root.dataset.resting = 'true';
    };

    const wake = () => {
      // pointermove alone fires at the refresh rate during a drag, and re-arming a timer on
      // every one of those would put this hook in the same category of permanent per-frame work
      // it exists to remove. Once the page is already awake, one re-arm every 400ms is enough:
      // the worst case is resting up to 400ms later than the delay asks for.
      const now = performance.now();
      if (root.dataset.resting === undefined && now - lastWake < 400) return;
      lastWake = now;

      delete root.dataset.resting;
      if (timer !== undefined) clearTimeout(timer);
      timer = window.setTimeout(rest, delayMs);
    };

    // `scroll` is included even though a scroll is normally preceded by a wheel or a touch:
    // scrolling can also be driven by a link jump, a focus change or momentum that outlives the
    // finger that started it, and motion freezing mid-scroll is the one case that would read as
    // a bug rather than as stillness.
    const WAKE = ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart', 'scroll', 'focusin'] as const;
    for (const type of WAKE) window.addEventListener(type, wake, { passive: true });

    wake();

    return () => {
      for (const type of WAKE) window.removeEventListener(type, wake);
      if (timer !== undefined) clearTimeout(timer);
      delete root.dataset.resting;
    };
  }, [delayMs]);
}
