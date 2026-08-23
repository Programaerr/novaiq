import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useShakeGesture } from '../lib/useShakeGesture';

/* Split out of the main bundle. Nobody has to pay for a wave they may never find: the chunk is
   fetched the first time somebody actually shakes the mouse. */
const WaveHand = lazy(() => import('./WaveHand').then((m) => ({ default: m.WaveHand })));

/**
 * Owns the shake gesture: shake the mouse left and right and the page waves back.
 *
 * Nothing happens under `prefers-reduced-motion`, and that is the whole answer rather than a
 * quieter version of it. The reward here IS the motion — a hand that does not wave is a hand
 * sitting on the screen for two seconds — so there is no still frame worth showing, and the
 * visitor has already told the browser they do not want things moving at them unasked. An
 * easter egg is the last place to argue with that.
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

  const hits = useShakeGesture(!reduced);
  const [run, setRun] = useState<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (hits === 0) return;
    setRun({ id: hits, x: pointer.current.x, y: pointer.current.y });
  }, [hits]);

  const done = useCallback(() => setRun(null), []);

  if (!run || reduced) return null;

  return (
    <Suspense fallback={null}>
      {/* `key` on the run id, so a second shake restarts the wave rather than joining one
          already half over. */}
      <WaveHand key={run.id} origin={{ x: run.x, y: run.y }} onDone={done} />
    </Suspense>
  );
};

export default EasterEgg;
