import { useEffect } from 'react';

/**
 * Stops every running animation on the page whenever there is nobody able to see it, and
 * starts them again the moment there is.
 *
 * ## What was actually still running
 *
 * Page content itself is not the problem: each page in App.tsx renders behind an
 * `activePage === ...` guard, so navigating unmounts the previous one outright and React
 * tears down its timers, its observers and its WebGL context with it. Nothing from a page
 * you have left is still animating.
 *
 * What is left is the chrome that is mounted for the whole session and therefore belongs to
 * no page at all — the cosmic background above all, whose two star layers run an infinite
 * drift. Those keep animating while the browser tab is in the background, while the window
 * is minimised, and while the screen is locked: work with no viewer, competing for the same
 * GPU and main thread as whatever the person actually switched away to look at. On a machine
 * that is already short of headroom, that is a tax charged for a picture nobody is looking
 * at, and it is paid for as long as the tab stays open.
 *
 * ## How it stops
 *
 * `animation-play-state: paused` rather than unmounting or disabling anything: a paused
 * animation holds its exact position and resumes from it, so returning to the tab looks like
 * the page was simply waiting, not like it jumped or restarted. It also costs nothing to
 * apply — the browser stops ticking those animations, and no layout, paint or composite work
 * is scheduled for them at all.
 *
 * Driven by an attribute on <html> so one flag covers everything at once, including
 * animations declared by components that have not been written yet — see the
 * `html[data-idle]` rule in index.css. Transitions are deliberately NOT paused: they are
 * responses to interaction, and there is no interaction to respond to while hidden.
 */
export function usePauseOffscreenWork(): void {
  useEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      if (document.visibilityState === 'hidden') root.dataset.idle = 'true';
      else delete root.dataset.idle;
    };

    // `blur`/`focus` catch what visibilitychange does not: another window taking focus over
    // this one on a desktop, where the tab stays technically "visible" behind it. Named, so
    // the cleanup below can actually detach them.
    const idle = () => {
      root.dataset.idle = 'true';
    };

    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('blur', idle);
    window.addEventListener('focus', sync);

    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('blur', idle);
      window.removeEventListener('focus', sync);
      delete root.dataset.idle;
    };
  }, []);
}
