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

/** How far the pointer has to travel FROM ITS LAST TURNING POINT before turning back for the
    turn to count. */
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
  /**
   * Where the pointer last turned around. Swings are measured from HERE, not accumulated.
   *
   * Summing distance per direction was the first version and it fired on a hand resting on a
   * trackpad. The bug is subtle: a rejected reversal left the old direction in place, so the
   * next nudge — which is physically the other half of the same jitter — was added to the run
   * rather than starting a new one. Nine pixels of wobble, repeated, reached the 45px threshold
   * and counted as a swing. Measured from the turning point instead, a pointer that never gets
   * more than nine pixels from where it turned can never produce one, however long it wobbles.
   */
  const anchorX = useRef(0);
  /** -1 left, 1 right, 0 unknown. */
  const dir = useRef(0);
  const turns = useRef(0);
  const lastTurnAt = useRef(0);
  const firedAt = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      turns.current = 0;
      dir.current = 0;
      anchorX.current = lastX.current ?? 0;
    };

    const onMove = (e: PointerEvent) => {
      // Mouse only. A finger drags rather than shakes, and a stylus that wobbles is a drawing.
      if (e.pointerType !== 'mouse') return;
      // A held button means a drag — the templates page's 3D building is rotated exactly this
      // way, and swinging it left and right is the normal way to use it.
      if (e.buttons !== 0) { lastX.current = e.clientX; reset(); return; }
      // Pages that fill the viewport with their own surface: the template sandbox and the
      // account/admin panels. An easter egg bursting over a contract is not a delight.
      const root = document.documentElement;
      if (root.hasAttribute('data-demo') || root.hasAttribute('data-flat')) {
        lastX.current = e.clientX;
        reset();
        return;
      }

      const x = e.clientX;
      const prev = lastX.current;
      lastX.current = x;
      if (prev === null) { anchorX.current = x; return; }

      const dx = x - prev;
      if (dx === 0) return;
      const d = dx > 0 ? 1 : -1;

      if (dir.current === 0) {
        dir.current = d;
        anchorX.current = prev;
        return;
      }
      if (d === dir.current) return;

      // Direction changed. The swing that just ended is the distance from the last turning
      // point to here — not a sum, so wobble cannot add up to one.
      const swing = Math.abs(prev - anchorX.current);
      if (swing < MIN_SWING) {
        // Not a swing. Adopt the new direction and re-anchor, so the NEXT swing is measured from
        // this wobble rather than from wherever the pointer happened to be a second ago.
        dir.current = d;
        anchorX.current = prev;
        return;
      }

      const now = e.timeStamp;
      if (now - lastTurnAt.current > WINDOW) turns.current = 0;
      turns.current += 1;
      lastTurnAt.current = now;
      dir.current = d;
      anchorX.current = prev;

      if (turns.current >= NEEDED && now - firedAt.current > COOLDOWN) {
        firedAt.current = now;
        turns.current = 0;
        setHits((n) => n + 1);
      }
    };

    // A run that is simply abandoned mid-way must not sit there waiting to be completed an hour
    // later by an unrelated movement.
    const onLeave = () => { lastX.current = null; turns.current = 0; dir.current = 0; };

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
