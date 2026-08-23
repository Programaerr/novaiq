import { useEffect, useRef, useState } from 'react';

/**
 * Fires when the mouse is shaken left and right a few times in quick succession.
 *
 * The hard part of a shake detector is not noticing the shake, it is NOT noticing everything
 * else. A pointer crossing the page, a hand resting on the trackpad, someone dragging the 3D
 * building round — all of those change horizontal direction, and a naive "count the reversals"
 * fires on all of them. Three rules keep it honest:
 *
 *  - a reversal only counts if the swing BEFORE it travelled `MIN_SWING` px, so jitter and the
 *    small corrections at the end of a normal movement are not swings;
 *  - the reversals have to arrive inside `WINDOW` ms of each other, so a page browsed slowly for
 *    ten minutes never accumulates enough of them;
 *  - nothing counts while a button is held, which is what tells a shake apart from a drag.
 */

/** How far the pointer has to travel one way before turning back for the turn to count. */
const MIN_SWING = 45;
/** How long a swing may take before the run is considered abandoned. */
const WINDOW = 520;
/** Turns needed. Four is two full left-right-left-right passes — deliberate, not accidental. */
const NEEDED = 4;
/** Quiet period after a hit, so holding the shake does not fire it over and over. */
const COOLDOWN = 6000;

/**
 * Returns a counter that increments on every detected shake. A counter rather than a boolean:
 * the consumer wants to REPLAY on a second shake, and a boolean that is already true has no
 * edge left to react to.
 */
export function useShakeGesture(enabled = true): number {
  const [hits, setHits] = useState(0);

  const lastX = useRef<number | null>(null);
  /** -1 left, 1 right, 0 unknown. */
  const dir = useRef(0);
  /** Distance travelled in the current direction. */
  const run = useRef(0);
  const turns = useRef(0);
  const lastTurnAt = useRef(0);
  const firedAt = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      turns.current = 0;
      run.current = 0;
      dir.current = 0;
    };

    const onMove = (e: PointerEvent) => {
      // Mouse only. A finger drags rather than shakes, and a stylus that wobbles is a drawing.
      if (e.pointerType !== 'mouse') return;
      // A held button means a drag — the templates page's 3D building is rotated exactly this
      // way, and swinging it left and right is the normal way to use it.
      if (e.buttons !== 0) { reset(); return; }
      // Pages that fill the viewport with their own surface: the template sandbox and the
      // account/admin panels. An easter egg bursting over a contract is not a delight.
      const root = document.documentElement;
      if (root.hasAttribute('data-demo') || root.hasAttribute('data-flat')) { reset(); return; }

      const x = e.clientX;
      if (lastX.current === null) { lastX.current = x; return; }

      const dx = x - lastX.current;
      lastX.current = x;
      if (dx === 0) return;

      const d = dx > 0 ? 1 : -1;
      const now = e.timeStamp;

      if (dir.current === 0) {
        dir.current = d;
        run.current = Math.abs(dx);
        return;
      }

      if (d === dir.current) {
        run.current += Math.abs(dx);
        return;
      }

      // Direction changed. Whether it counts depends on how far the previous swing got.
      if (run.current < MIN_SWING) {
        // Too small to be a swing — treat it as noise on the way and keep the old direction so a
        // single jittery pixel does not reset a real run.
        return;
      }

      if (now - lastTurnAt.current > WINDOW) turns.current = 0;
      turns.current += 1;
      lastTurnAt.current = now;
      dir.current = d;
      run.current = Math.abs(dx);

      if (turns.current >= NEEDED && now - firedAt.current > COOLDOWN) {
        firedAt.current = now;
        reset();
        setHits((n) => n + 1);
      }
    };

    // A run that is simply abandoned mid-way must not sit there waiting to be completed an hour
    // later by an unrelated movement.
    const onLeave = () => { lastX.current = null; reset(); };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', reset, { passive: true });
    document.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', reset);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled]);

  return hits;
}
