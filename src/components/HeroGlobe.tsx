import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Points } from 'three';

/**
 * A globe made of points, turning slowly behind the hero.
 *
 * Replaces `.hero-limb`, which drew the same idea as a CSS arc: one enormous circle with a lit
 * rim, of which only the crown was ever in frame. That was the flat version and it was the right
 * call while the brief was "2D, no lag". The brief is now a real sphere, so this is one.
 *
 * ## Points rather than a mesh, and why the rim comes free
 *
 * A shaded sphere on a dark page is a grey disc — there is no light source in this design to model
 * it with, and inventing one would put a second lighting direction on a page that already
 * committed to a single one. A point cloud has no shading to get wrong: it reads as a globe purely
 * from how the points are arranged.
 *
 * It also solves the rim for nothing. Points spread evenly over a sphere do NOT project evenly
 * onto the screen — near the silhouette you are looking along the surface, so many points fall
 * into very little screen area, and the density rises sharply towards the edge. The bright rim in
 * the reference is a glow effect; here it is a consequence of the geometry, which means it stays
 * correct at every angle and costs nothing to draw.
 *
 * ## Fibonacci, not random
 *
 * Points are placed on a Fibonacci spiral rather than by picking random spherical angles. Random
 * latitude/longitude bunches heavily at the poles — the classic sphere-sampling mistake — and the
 * result looks like a globe wearing two hats. The spiral gives near-uniform spacing, which is what
 * makes the silhouette read as a clean circle instead of a fuzzy one.
 *
 * ## What it costs, and the one honest trade
 *
 * Everything else on this page settles to zero frames at rest. This cannot: a turning globe has to
 * draw while it is turning, and there is no version of that which is free. So the cost is bounded
 * instead of removed —
 *
 * - `frameloop` is `'never'` unless the hero is actually on screen, so the globe stops completely
 *   the moment it is scrolled past and the page goes back to costing nothing.
 * - DPR is capped at 1.5. The card scene in this project caps at 2.5 and says in its own comment
 *   that it can afford to because it is a card and not a full screen. This IS full-width, so it
 *   takes the cap the card was allowed to skip.
 * - No antialiasing. Points are round sprites; there are no polygon edges for MSAA to smooth, so
 *   it would be paid for and not seen.
 * - Reduced-motion stops the rotation, which also means `frameloop` never runs.
 */

const COUNT = 2600;
const RADIUS = 1;

function GlobePoints({ spin }: { spin: boolean }) {
  const ref = useRef<Points>(null);

  // Fibonacci sphere. The golden angle is what keeps successive points from ever lining up into
  // visible spokes — any rational angle here produces arms radiating from the poles.
  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < COUNT; i++) {
      // y walks the full diameter linearly, which is the part that makes the spacing uniform:
      // equal steps in HEIGHT cut equal areas out of a sphere, equal steps in latitude do not.
      const y = 1 - (i / (COUNT - 1)) * 2;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;

      arr[i * 3] = Math.cos(theta) * ring * RADIUS;
      arr[i * 3 + 1] = y * RADIUS;
      arr[i * 3 + 2] = Math.sin(theta) * ring * RADIUS;
    }

    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!spin || !ref.current) return;
    // delta-based, not frame-based: the globe turns at the same speed on a 60Hz and a 120Hz
    // screen. Clamped because delta is the length of the pause after the loop has been stopped
    // off-screen, and an unclamped one would snap the globe forward by that whole gap on return.
    ref.current.rotation.y += Math.min(delta, 0.05) * 0.045;
  });

  return (
    <points ref={ref} rotation={[0.32, 0, 0.16]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        // Small and dim. This sits behind the headline, and the moment the points are bright
        // enough to notice individually they compete with the type in front of them.
        size={0.011}
        color="#ffffff"
        transparent
        opacity={0.85}
        // Perspective size: points on the far side of the globe are smaller as well as sparser,
        // which is most of what separates a sphere from a flat ring of dots.
        sizeAttenuation
        // No depth writes — points are transparent sprites, and letting them occlude each other
        // makes the far hemisphere punch holes in the near one depending on draw order.
        depthWrite={false}
      />
    </points>
  );
}

export const HeroGlobe: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [motion, setMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setMotion(!mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Mount and run only while the hero is near the viewport. The margin means the globe is already
  // turning by the time its first pixel shows, rather than being caught starting from rest.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: '200px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="hero-globe" aria-hidden="true">
      {active && (
        <Canvas
          // The one scene on this site that genuinely animates at rest, so it is switched off
          // rather than throttled: 'never' draws nothing at all, not fewer frames.
          frameloop={motion ? 'always' : 'never'}
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 2.75], fov: 45 }}
          gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        >
          <GlobePoints spin={motion} />
        </Canvas>
      )}
    </div>
  );
};
