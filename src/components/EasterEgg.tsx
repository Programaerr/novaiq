import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { INK } from '../lib/homePalette';
import { useShakeGesture } from '../lib/useShakeGesture';

/* Split out of the main bundle. Nobody has to pay for a balloon they may never find: the chunk
   is fetched the first time somebody actually shakes the mouse. */
const BalloonBurst = lazy(() =>
  import('./BalloonBurst').then((m) => ({ default: m.BalloonBurst })),
);

/** Matched to BURST_MS in BalloonBurst — the reduced-motion path has no scene to time itself
    against, so it carries its own. */
const QUIET_MS = 2600;

/**
 * Owns the shake gesture and decides which of the two rewards it gets.
 *
 * Two, because the effect is a rising, swaying, bursting thing on top of a page somebody is
 * reading, and that is exactly what `prefers-reduced-motion` exists to say no to. Ignoring the
 * setting for an easter egg would be the worst place to ignore it: the visitor did not ask for
 * this, cannot see it coming, and has already told the browser they do not want it. So the
 * motion path gets the balloons and the quiet path gets the words, which is the part that was
 * actually worth finding.
 */
export const EasterEgg: React.FC = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  // Where the pointer was when it fired. Tracked passively rather than read at trigger time —
  // the gesture hook reports that a shake happened, not where it ended.
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => { pointer.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const hits = useShakeGesture();
  const [run, setRun] = useState<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (hits === 0) return;
    setRun({ id: hits, x: pointer.current.x, y: pointer.current.y });
  }, [hits]);

  const done = useCallback(() => setRun(null), []);

  // The quiet path: the message, and nothing that moves except its own fade.
  useEffect(() => {
    if (!run || !reduced) return;
    const t = window.setTimeout(done, QUIET_MS);
    return () => window.clearTimeout(t);
  }, [run, reduced, done]);

  if (!run) return null;

  if (reduced) {
    return (
      <div
        aria-hidden="true"
        dir="ltr"
        className="fixed inset-x-0 top-[38%] z-[90] flex justify-center px-6 pointer-events-none"
      >
        <span
          className="font-['Cairo'] font-black tracking-[0.18em] text-center leading-none text-[clamp(1.35rem,5vw,3.25rem)]"
          style={{
            color: INK,
            textShadow: '0 0 18px rgba(246,241,233,0.95), 0 0 42px rgba(246,241,233,0.8)',
          }}
        >
          WELCOME TO NOVAIQ
        </span>
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      {/* `key` on the run id, so a second shake restarts the whole thing rather than joining a
          run already half over. */}
      <BalloonBurst key={run.id} origin={{ x: run.x, y: run.y }} onDone={done} />
    </Suspense>
  );
};

export default EasterEgg;
