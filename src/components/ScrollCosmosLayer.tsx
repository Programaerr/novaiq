import React, { Suspense, lazy, useEffect, useState } from 'react';

// Same chunk as the credential card's scene, so on the home page — where both live — this costs
// no additional download at all. vite.config.ts keeps three.js in `vendor-three` and excludes
// that chunk from modulePreload; both halves are needed or the browser fetches it eagerly.
const ScrollCosmos = lazy(() => import('./ScrollCosmos'));

/**
 * Mounts the scroll-driven black hole behind the page, and decides when it has no business being
 * there at all.
 *
 * Three gates, in order of how much they matter:
 *
 *  · **Reduced motion.** Someone who has asked their system for less movement should not be given
 *    a supernova. The layer is not rendered — not hidden, not paused, not mounted.
 *  · **No WebGL.** Older devices and locked-down browsers return no context; the page is complete
 *    without this and simply carries on.
 *  · **Deferred to idle.** The effect is decoration behind the fold's content, so it waits for the
 *    browser to be free rather than competing with first paint for the main thread. On a slow
 *    phone that is the difference between the page appearing promptly and appearing after a 3D
 *    library has been parsed.
 *
 * Positioned `fixed` and `pointer-events-none`, beneath everything the visitor reads. The
 * `data-demo` / `data-flat` pages — the template sandbox and the admin dashboard — hide it the
 * same way they hide the cosmic background, in index.css, because a black hole behind a contract
 * table is not what either page is for.
 */
export const ScrollCosmosLayer: React.FC = () => {
  const [go, setGo] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // A cheap probe, discarded immediately — asking for the real thing is the only reliable way
    // to know a context can be had, and this one is thrown away before it costs anything.
    try {
      const probe = document.createElement('canvas');
      if (!probe.getContext('webgl2') && !probe.getContext('webgl')) return;
    } catch {
      return;
    }

    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    }).requestIdleCallback;

    if (idle) {
      const h = idle(() => setGo(true), { timeout: 2500 });
      return () => (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(h);
    }
    const t = window.setTimeout(() => setGo(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!go) return null;

  return (
    <div className="cosmos-layer" aria-hidden="true">
      <Suspense fallback={null}>
        <ScrollCosmos />
      </Suspense>
    </div>
  );
};

export default ScrollCosmosLayer;
