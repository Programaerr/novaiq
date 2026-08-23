import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { INK, PAPER, PERIWINKLE, SAND, SAND_DEEP, SAND_LIGHT } from '../lib/homePalette';
import { mixColor } from '../lib/tone';

/**
 * A night sky — stars and a handful of planets — built from the site's own palette.
 *
 * The one thing this is NOT is a space picture. There is no black in it and no white: the ground
 * is INK, which is the near-navy the whole site already writes its text in, the stars are PAPER
 * and SAND_LIGHT, and the planets are PERIWINKLE and the two sands. Reach for #000 and #FFF and
 * the login screen stops being this company's login screen and becomes a screensaver.
 *
 * It exists to sit BEHIND something, out of focus. Every choice below follows from that: the
 * shapes are large, the palette is narrow, the motion is minutes-long, and the detail budget goes
 * into silhouette rather than surface. Nothing here is meant to be looked at directly — if it
 * survives being blurred and ignored, it is doing its job.
 */

/* ── Scene constants ────────────────────────────────────────────────────────────────────── */

/**
 * The pixel-ratio ceiling, on the same rule TileField uses and for the same reason: a phone
 * reports 2 or 3, which is four to nine times the fragments on the device with the least GPU to
 * spend. There is even less to resolve here than in the tile field — this layer is blurred before
 * anybody sees it — so the cap is if anything generous.
 */
const MAX_DPR: number =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? 1 : 1.25;

/** Pixels per world unit, so the scene can be laid out in screen terms. Same as TileField. */
const ZOOM = 100;

/** Key direction, in view space. Up and to the left, so every planet is lit from the same place
    and the terminators all run the same way — the tell that they are one sky rather than five
    stickers. */
const LIGHT = new THREE.Vector3(-0.5, 0.42, 0.76).normalize();

/**
 * How many stars.
 *
 * Far below the 1000–3000 a particle system normally starts at, and deliberately. Those counts
 * are for dust and smoke, where the individual particle is meant to disappear into a mass. These
 * are STARS: each one is a distinct object several pixels across with its own colour and its own
 * twinkle, and a few hundred of those already reads as a full sky. Ten times as many would read
 * as noise, cost ten times the overdraw and look worse.
 */
const STAR_COUNT = 520;

/**
 * The planets, as fractions rather than positions.
 *
 * `x` and `y` are fractions of the half-width and half-height, so the composition holds its shape
 * from a phone to an ultrawide instead of drifting off one edge. `r` is a fraction of the
 * half-HEIGHT only — tied to the width, a planet that looked right on a laptop became a wall on a
 * 34" screen, because screens get wider far faster than they get taller.
 *
 * They are pushed out toward the corners on purpose. A card sits in the middle of this page and
 * covers most of it; the sky is only ever seen in the margin around that card, so the middle is
 * the one place a planet is guaranteed to be wasted.
 */
interface Planet {
  x: number;
  y: number;
  r: number;
  color: string;
  /** Seconds per bob cycle is `2π / bob` — all of these are slow enough to be felt, not watched. */
  bob: number;
  phase: number;
  ring?: boolean;
}

/** Ring radii, as multiples of the planet's own. Saturn's start at about 1.2R; 1.35 leaves a
    visible gap between the ball and the ring, which is what makes the two read as separate. */
const RING_INNER = 1.35;
const RING_OUTER = 2.1;

const PLANETS: Planet[] = [
  { x: -0.66, y: 0.47, r: 0.3, color: PERIWINKLE, bob: 0.09, phase: 0 },
  { x: 0.72, y: -0.5, r: 0.23, color: SAND, bob: 0.07, phase: 2.1, ring: true },
  { x: 0.63, y: 0.66, r: 0.1, color: SAND_DEEP, bob: 0.14, phase: 4.2 },
  // Derived rather than typed: a planet far enough back to be half swallowed by the ground it
  // sits on. Writing #4A5580 here would be a sixth colour nobody could trace back to the palette.
  { x: -0.78, y: -0.45, r: 0.16, color: mixColor(INK, PERIWINKLE, 0.45), bob: 0.11, phase: 1.3 },
  { x: 0.1, y: -0.88, r: 0.07, color: PAPER, bob: 0.17, phase: 3.4 },
];

/* ── Stars ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Positions are stored NORMALISED, in −1..1, and scaled to the viewport by a uniform.
 *
 * The obvious version rebuilds the buffer from `size` on every resize, and it has a bug you only
 * see by dragging a window edge: the stars are randomised inside that buffer, so every rebuild
 * deals a whole new sky. Dragging a corner makes the constellations flicker through hundreds of
 * arrangements. Normalised, a resize is a two-float uniform write and the sky stays the sky.
 */
function makeStars(): THREE.BufferGeometry {
  const pos = new Float32Array(STAR_COUNT * 3);
  const seed = new Float32Array(STAR_COUNT);
  const size = new Float32Array(STAR_COUNT);
  const tint = new Float32Array(STAR_COUNT * 3);

  // Three tints, weighted. Mostly paper, some warm sand, a few in the site's accent — enough
  // variation that the sky is not one colour, not so much that it turns into confetti.
  const tints = [new THREE.Color(PAPER), new THREE.Color(SAND_LIGHT), new THREE.Color(PERIWINKLE)];

  for (let i = 0; i < STAR_COUNT; i++) {
    // Past ±1 on purpose: the layer this renders into is oversized and clipped, so stars have to
    // exist outside the viewport or the sky ends in a visible rectangle.
    pos[i * 3] = (Math.random() * 2 - 1) * 1.15;
    pos[i * 3 + 1] = (Math.random() * 2 - 1) * 1.15;
    // Depth, used for parallax and to keep the whole field behind every planet.
    pos[i * 3 + 2] = -2 - Math.random() * 6;

    seed[i] = Math.random();

    // Weighted small. A sky of evenly sized dots reads as a texture; what makes it read as depth
    // is that most stars are near the floor and a handful are much bigger.
    //
    // The floor is 4.5px, and it is set against the BLUR rather than against taste. A star's
    // visibility after a blur is its total brightness divided by the area the blur spreads it
    // over, so a 3px dot behind 4px of defocus loses most of its peak and the sky comes out
    // empty — which is exactly what the first version did. These sizes are what survives.
    const t = Math.random();
    size[i] = t > 0.94 ? 12 + Math.random() * 6 : t > 0.72 ? 7 + Math.random() * 3 : 4.5 + Math.random() * 2;

    const c = tints[t > 0.9 ? 2 : t > 0.62 ? 1 : 0];
    tint[i * 3] = c.r;
    tint[i * 3 + 1] = c.g;
    tint[i * 3 + 2] = c.b;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
  return g;
}

function makeStarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    // Written to the colour buffer but not the depth buffer: stars must not occlude each other,
    // and they still have to be occluded BY the planets, which are opaque and drawn first.
    depthWrite: false,
    // Additive, because a star is a light source. Over the ink ground the same dot mixed normally
    // reads as a grey speck — paint on the sky rather than a hole through it.
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uHalf: { value: new THREE.Vector2(1, 1) },
      uDpr: { value: 1 },
    },
    vertexShader: `
      attribute float aSeed;
      attribute float aSize;
      attribute vec3 aTint;

      uniform float uTime;
      uniform vec2 uHalf;
      uniform float uDpr;

      varying float vAlpha;
      varying vec3 vTint;

      void main() {
        vec3 p = vec3(position.x * uHalf.x, position.y * uHalf.y, position.z);

        // Parallax. The near stars travel further than the far ones, which is the only reason a
        // flat plane of dots reads as having depth at all — nothing else here can say so, because
        // an orthographic camera gives no perspective to work with.
        float depth = clamp((p.z + 8.0) / 6.0, 0.0, 1.0);
        p.x += sin(uTime * 0.035 + aSeed * 6.283) * (0.10 + depth * 0.24);
        p.y += cos(uTime * 0.028 + aSeed * 4.712) * (0.08 + depth * 0.18);

        // Twinkle, floored well above zero. Taken to 0 a star blinks OUT, and a dot that vanishes
        // and returns reads as a rendering fault rather than as atmosphere.
        vAlpha = 0.5 + 0.5 * sin(uTime * (0.55 + aSeed * 1.3) + aSeed * 12.0);
        vAlpha = 0.62 + 0.38 * vAlpha;

        vTint = aTint;
        gl_PointSize = aSize * uDpr;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying vec3 vTint;

      void main() {
        // gl_PointCoord is a square. Left square, a star is a TILE, and 520 of them read as
        // grain rather than as a sky.
        float d = length(gl_PointCoord - 0.5) * 2.0;

        // A held core out to 18% and a long soft edge, rather than a falloff that starts at the
        // centre. Squaring the falloff — the obvious way to get a "point" of light — puts almost
        // all of the star's brightness in one pixel, and one pixel is precisely what a blur has
        // no trouble erasing. The core is what makes it through; the soft edge is the glow an out
        // of focus star has anyway, so the blur is finishing a shape rather than fighting one.
        float a = 1.0 - smoothstep(0.18, 1.0, d);
        a = pow(a, 1.4);
        if (a < 0.01) discard;
        gl_FragColor = vec4(vTint, a * vAlpha);
      }
    `,
  });
}

const Stars: React.FC<{ reduced: boolean; clock: React.MutableRefObject<number> }> = ({
  reduced,
  clock,
}) => {
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const invalidate = useThree((s) => s.invalidate);

  const geometry = useMemo(makeStars, []);
  const material = useMemo(makeStarMaterial, []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  // A resize is two floats, and that is the whole point of storing the sky normalised. In an
  // effect rather than in the render body, and with an `invalidate`: under a reduced-motion
  // preference the loop is on `demand`, so without one the sky keeps the size it was born at.
  useLayoutEffect(() => {
    material.uniforms.uHalf.value.set(size.width / 2 / ZOOM, size.height / 2 / ZOOM);
    material.uniforms.uDpr.value = dpr;
    invalidate();
  }, [size.width, size.height, dpr, material, invalidate]);

  useFrame(() => {
    if (reduced) return;
    material.uniforms.uTime.value = clock.current;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
};

/* ── Planets ────────────────────────────────────────────────────────────────────────────── */

function makePlanetMaterial(color: string, rim: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uRim: { value: new THREE.Color(rim) },
      uLight: { value: LIGHT.clone() },
    },
    vertexShader: `
      varying vec3 vN;
      void main() {
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uRim;
      uniform vec3 uLight;
      varying vec3 vN;

      void main() {
        vec3 n = normalize(vN);
        float lam = max(dot(n, uLight), 0.0);

        // The terminator is SOFT and the dark side is not dark. A textbook lambert takes the
        // unlit half to black, and black is the one colour this palette does not contain — a
        // planet with a black limb stops belonging to the page it is on. 0.26 is the floor, which
        // reads as a body lit by the sky around it rather than by nothing.
        float shade = 0.26 + 0.74 * smoothstep(-0.15, 0.85, lam);
        vec3 c = uColor * shade;

        // A thin bright edge where the sphere turns away, and only on the lit side. It is what
        // separates a planet from the ground behind it once the whole layer is out of focus and
        // the silhouette is all that is left.
        float rim = pow(1.0 - abs(n.z), 4.0) * lam;
        c = mix(c, uRim, rim * 0.42);

        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
}

function makeRingMaterial(color: string, inner: number, outer: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uInner: { value: inner },
      uOuter: { value: outer },
    },
    vertexShader: `
      varying vec2 vP;
      void main() {
        vP = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uInner;
      uniform float uOuter;
      varying vec2 vP;

      void main() {
        // The radius, off the object-space position rather than off the uv. RingGeometry's uv is a
        // SQUARE mapping across the bounding box — it looks like it should run inner-to-outer and
        // does not, and reading uv.y here draws a diagonal gradient across the disc instead of a
        // radial one.
        float r = (length(vP) - uInner) / (uOuter - uInner);

        // Fade both edges, or the ring is a hard washer. The notch two thirds of the way out is
        // the Cassini gap, and it is the one detail that makes a flat disc read as RINGS rather
        // than as a halo around the planet.
        float a = smoothstep(0.0, 0.22, r) * (1.0 - smoothstep(0.72, 1.0, r));
        a *= 1.0 - 0.55 * exp(-pow((r - 0.52) / 0.07, 2.0));
        gl_FragColor = vec4(uColor, a * 0.5);
      }
    `,
  });
}

const Planets: React.FC<{ reduced: boolean; clock: React.MutableRefObject<number> }> = ({
  reduced,
  clock,
}) => {
  const size = useThree((s) => s.size);
  const halfW = size.width / 2 / ZOOM;
  const halfH = size.height / 2 / ZOOM;

  /* One sphere for all five. 20 segments is chosen against the blur rather than against the
     silhouette: at 4px of defocus a 12-segment ball is already smooth, and 64 would be paying for
     roundness the viewer is never shown. */
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 20, 20), []);
  const ringGeometry = useMemo(() => new THREE.RingGeometry(RING_INNER, RING_OUTER, 56), []);

  const materials = useMemo(
    () => PLANETS.map((p) => makePlanetMaterial(p.color, mixColor(p.color, PAPER, 0.55))),
    [],
  );
  const ringMaterial = useMemo(() => makeRingMaterial(SAND_LIGHT, RING_INNER, RING_OUTER), []);

  useEffect(() => () => {
    geometry.dispose();
    ringGeometry.dispose();
    materials.forEach((m) => m.dispose());
    ringMaterial.dispose();
  }, [geometry, ringGeometry, materials, ringMaterial]);

  const groups = useRef<(THREE.Group | null)[]>([]);

  // The bob runs on the object rather than in a shader, because there are five of them. A vertex
  // shader would move 5 × 400 vertices to say what five matrix writes say.
  useFrame(() => {
    if (reduced) return;
    const t = clock.current;
    PLANETS.forEach((p, i) => {
      const g = groups.current[i];
      if (!g) return;
      g.position.y = p.y * halfH + Math.sin(t * p.bob + p.phase) * halfH * 0.035;
      g.position.x = p.x * halfW + Math.cos(t * p.bob * 0.7 + p.phase) * halfW * 0.018;
    });
  });

  return (
    <>
      {PLANETS.map((p, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el;
          }}
          position={[p.x * halfW, p.y * halfH, -1 + i * 0.2]}
          scale={p.r * halfH}
        >
          <mesh geometry={geometry} material={materials[i]} />
          {p.ring && (
            /* Tilted, not flat. The ring passes THROUGH the sphere in depth, so its far half is
               occluded by an opaque planet and its near half is not — which is the whole illusion,
               and it comes free from the depth buffer rather than from two half-ring meshes. */
            <mesh
              geometry={ringGeometry}
              material={ringMaterial}
              rotation={[Math.PI / 2 - 0.34, 0, 0.24]}
            />
          )}
        </group>
      ))}
    </>
  );
};

/* ── The host ───────────────────────────────────────────────────────────────────────────── */

/**
 * Mounts the sky and keeps it from running when nobody is watching.
 *
 * The three gates are the same three TileField uses, and they are not optional for a decorative
 * loop: off screen, backgrounded tab, and a reduced-motion preference. The canvas stays MOUNTED
 * and parked at `frameloop="never"` rather than being torn down — destroying a GL context and
 * rebuilding it costs a shader recompile and a scene rebuild on the main thread every time.
 */
export const StarField: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [idle, setIdle] = useState(false);
  const [reduced, setReduced] = useState(false);
  const clock = useRef(0);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: '150px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* `data-idle` is set on <html> by usePauseOffscreenWork() when the tab is backgrounded, the
     window minimised or another window takes focus. Every CSS animation on the site stops on it;
     a WebGL loop reads the same flag rather than keeping its own idea of who is watching. */
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIdle(root.hasAttribute('data-idle'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['data-idle'] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0" aria-hidden="true">
      <Canvas
        orthographic
        frameloop={reduced ? 'demand' : active && !idle ? 'always' : 'never'}
        dpr={[1, MAX_DPR]}
        camera={{ zoom: ZOOM, position: [0, 0, 60], near: 0.1, far: 200 }}
        /* `alpha` so the INK ground is painted by the DOM underneath. The one frame before WebGL
           has anything on screen is then already the right colour instead of a white flash.
           `antialias` off: there is not a hard edge in this scene. The stars antialias themselves
           in the fragment shader and the planets are about to be blurred. */
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      >
        <Ticker reduced={reduced} clock={clock} />
        <Planets reduced={reduced} clock={clock} />
        <Stars reduced={reduced} clock={clock} />
      </Canvas>
    </div>
  );
};

/**
 * One clock for the whole scene, advanced once per frame at priority −1 so it is already current
 * when the stars and the planets read it.
 *
 * Two `useFrame`s each integrating their own delta drift apart the moment one of them is skipped,
 * and the failure is invisible until a planet is bobbing to a beat the sky is not.
 */
const Ticker: React.FC<{ reduced: boolean; clock: React.MutableRefObject<number> }> = ({
  reduced,
  clock,
}) => {
  const invalidate = useThree((s) => s.invalidate);
  useFrame((_, delta) => {
    if (reduced) return;
    // Clamped: this is the length of the pause after the loop stopped off screen, and an
    // unclamped step would integrate the whole gap in one frame and jump the sky.
    clock.current += Math.min(delta, 0.05);
    invalidate();
  }, -1);
  return null;
};
