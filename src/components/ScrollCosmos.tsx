import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** How many bands the page is cut into. Crossing a boundary sets off a supernova. */
const SECTIONS = 7;
/** Burst lifetime in milliseconds. */
const BURST_MS = 950;

/**
 * A black hole that answers the scroll, and a supernova at every section boundary.
 *
 * ## The one rule this is built around
 *
 * There is no clock in it. Not in the shader, not in the component — the swirl of the accretion
 * disc, the growth of the hole and the drift of the lensed stars are all functions of how far
 * down the page you are, and nothing else. Stop scrolling and every one of them stops at the
 * value it had, because there is no term left that could change.
 *
 * That is a deliberate constraint rather than a simplification, and it is the difference between
 * this and the WebGL hero this project had to delete. That scene drifted on a timer, so it drew a
 * frame forever and a phone answered it the way it answers a game — by running its GPU flat out
 * until the device was hot. Here `frameloop="demand"` is paired with a scene that has nothing to
 * animate on its own: frames are drawn while the page is moving and while a burst is alive, and
 * at no other time. A visitor reading a section costs exactly zero.
 *
 * ## What it costs when it does draw
 *
 * One full-screen quad and one fragment shader — no geometry, no lights, no textures, no
 * post-processing pass. The expense of a full-screen effect is fill rate, so the pixel count is
 * what gets cut on weak hardware: a phone renders it at a device pixel ratio of 1 against a
 * screen that reports 3, which is a ninth of the fragments, and the effect is soft glow and
 * gradients where that is nearly invisible.
 *
 * White only, throughout. The event horizon is not painted black — it is painted as nothing, and
 * the page's own darkness shows through it, which is both cheaper and truer than drawing a
 * black disc over a black background.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // The quad is 2x2 and its clip position is written directly, so it covers the viewport
    // exactly whatever the camera happens to be doing. Nothing here depends on the camera.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;

  uniform float uProgress;   // 0 at the top of the page, 1 at the bottom
  uniform vec2  uBurst;      // x = brightness of the current supernova, y = its shell radius
  uniform float uAspect;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 uv = vUv - 0.5;
    uv.x *= uAspect;

    // The hole travels. It swings across the frame and rises and falls as the page descends —
    // two different periods on the two axes, so the path never doubles back on itself into an
    // obvious loop, and the whole thing reads as a camera moving through a scene rather than a
    // graphic pinned to the middle of the screen.
    //
    // Still a function of scroll and nothing else: stop and the drift stops with you.
    vec2 centre = vec2(sin(uProgress * 6.1) * 0.19, cos(uProgress * 4.3) * 0.075);
    vec2 p = uv - centre;

    float r = max(length(p), 1e-4);
    float a = atan(p.y, p.x);

    // == THE ARC ========================================================================
    // One story told across the whole page, not a loop repeated per section.
    //
    //   0.00 - 0.55  a star is caught and spirals inward, drawn out into a tidal stream
    //   0.45 - 0.72  it reaches the horizon and the whole system brightens
    //   0.68 - 0.85  star and hole detonate together
    //   0.76 - 1.00  the ash spreads out and becomes the dust the rest of the page sits in
    //
    // Each stage is a weight between 0 and 1 derived from scroll position alone, and every term
    // below is multiplied by the one it belongs to. Nothing overlaps by accident: the hole is
    // switched off by the same figure that switches the blast on, so it is genuinely destroyed
    // rather than hidden behind a brighter thing.
    float P = uProgress;
    float infall = smoothstep(0.0, 0.06, P) * (1.0 - smoothstep(0.60, 0.72, P));
    float charge = smoothstep(0.44, 0.70, P) * (1.0 - smoothstep(0.70, 0.78, P));
    float blast  = smoothstep(0.66, 0.775, P) * (1.0 - smoothstep(0.80, 0.97, P));
    float ash    = smoothstep(0.74, 0.96, P);
    float alive  = 1.0 - smoothstep(0.70, 0.80, P);   // the hole, until it is gone

    // The hole tightens as it feeds, then is torn open by the blast.
    float R = (0.075 + P * 0.05) * (1.0 - charge * 0.3) * alive;

    // -- The doomed star -----------------------------------------------------------------
    // An inward spiral: the angle winds on with the scroll while the radius closes on the
    // horizon, so scrolling IS the orbit decaying. Flattened on Y into an ellipse, because a
    // perfect circle reads as a diagram and an ellipse reads as an orbit seen at an angle.
    float sa = P * 15.0;
    float srad = mix(0.46, max(R, 0.02) * 1.05, smoothstep(0.0, 0.70, P));
    vec2 spos = vec2(cos(sa), sin(sa) * 0.58) * srad;
    float sd = length(p - spos);
    float star = infall * (exp(-sd * 42.0) * (1.1 + charge * 2.6) + exp(-sd * 9.0) * 0.3);

    // Its tidal stream. Matter pulled off the star lags behind it along the same orbit, so the
    // tail is drawn as "close to the orbit radius, and behind in angle" — which costs two
    // exponentials rather than any kind of particle system.
    float lag = mod(sa - a + 3.14159265, 6.28318531) - 3.14159265;
    float tail = infall * exp(-abs(r - srad) * 34.0) * exp(-max(lag, 0.0) * 1.5) * (0.35 + charge * 0.9);

    // -- The hole, and its ring ----------------------------------------------------------
    // A ring seen at an angle, not a spiral. The swirl that was here was a function of the polar
    // angle, which is a flat pattern painted on the screen however convincing it looks; this is a
    // real circular annulus lying in a plane tilted away from the viewer, and the three cues that
    // sell it are all geometric rather than decorative:
    //
    //   1. it is measured in the ring's own plane, so it projects to a true ellipse;
    //   2. it is thinner and brighter where it is edge-on to the eye, as a flat sheet must be;
    //   3. its far half passes BEHIND the hole and is cut off by it, its near half in front.
    //
    // That third one is the whole difference between a ring and a drawing of a ring.
    float tilt = 0.30;                       // how far the plane is turned away from face-on
    vec2 dp = vec2(p.x, p.y / tilt);         // into the ring's own plane
    float dr = length(dp);

    float inner = R * 2.45;
    float outer = R * 4.6;
    float ringBody = smoothstep(inner, inner + R * 0.35, dr) * (1.0 - smoothstep(outer - R * 0.5, outer, dr));
    // A division in the ring, the way a real one has gaps swept clear by its moons.
    ringBody *= 1.0 - 0.7 * exp(-pow((dr - R * 3.5) / (R * 0.2), 2.0));
    // Grazing incidence: where the ring is closest to edge-on it stacks up and brightens.
    float graze = 1.0 - abs(p.y) / max(dr * tilt, 1e-4);
    ringBody *= 0.55 + 0.75 * clamp(graze, 0.0, 1.0);

    // The far half is the upper one; it disappears where the hole stands in front of it.
    float behind = step(0.0, p.y) * smoothstep(R * 0.92, R * 1.06, r);
    float front = 1.0 - step(0.0, p.y);
    float ringVis = max(front, behind);

    float ringLight = alive * ringBody * ringVis * (0.5 + P * 0.5 + charge * 0.7);

    // The photon ring: the thin bright rim of the shadow itself.
    float rim = alive * exp(-pow((r - R * 1.12) / max(R * 0.085, 1e-4), 2.0)) * (0.55 + charge * 1.0);
    float hole = alive * smoothstep(R * 1.02, R * 0.9, r);

    // -- One noise, used twice ------------------------------------------------------------
    // The nebula before the blast and the ash after it are the same two octaves read at
    // different weights. Sampling noise twice over would double the most expensive thing in this
    // shader to produce two clouds nobody ever sees at the same time.
    vec2 nb = uv * 2.1 + vec2(P * 1.5, P * -0.6);
    float cloud = vnoise(nb) * 0.62 + vnoise(nb * 2.4 + 5.1) * 0.34;
    float nebula = smoothstep(0.46, 0.98, cloud) * 0.07 * (1.0 - ash) * smoothstep(0.06, 0.5, r);
    float dust = smoothstep(0.34, 0.95, cloud) * ash * 0.2;

    // Grains of ash, thrown outward and thinning as they go.
    vec2 gcell = floor((uv + vec2(P * 0.55, -P * 0.28)) * 130.0);
    float grain = step(0.977, hash(gcell)) * (0.35 + 0.65 * hash(gcell + 1.3));
    float embers = ash * grain * 0.75;

    // -- The detonation -------------------------------------------------------------------
    float rays = 0.55 + 0.45 * cos(a * 16.0 + P * 5.0);
    float shockR = smoothstep(0.68, 1.0, P) * 1.5;
    float shock = blast * exp(-pow((r - shockR) / 0.11, 2.0)) * (0.55 + 0.45 * rays);
    float core = blast * (0.85 * exp(-r * 7.0) + 0.45 * exp(-r * 2.2) * rays);

    // The per-section tremor: a small shell on every boundary crossed, silenced once the star is
    // gone, so the page still answers each section without competing with the finale.
    float tremor = uBurst.x * alive * exp(-pow((r - uBurst.y * 0.9) / 0.05, 2.0)) * 0.7;

    float glow = ringLight + rim + star + tail + nebula + dust + embers + shock + core + tremor;
    glow *= (1.0 - hole);
    glow *= smoothstep(1.05, 0.18, r);

    // Dither. Eight-bit alpha over a wide, soft falloff quantises into visible rings, and those
    // concentric steps are exactly what makes an effect look like a cheap gradient rather than
    // light. A sub-step of noise breaks the boundaries up below the threshold the eye resolves.
    glow += (hash(vUv * 1024.0) - 0.5) * 0.006;

    // Held well below full strength: this sits behind everything anyone is trying to read, and
    // the hole in particular was overlit — bright enough to pull the eye off the copy.
    gl_FragColor = vec4(vec3(1.0), clamp(glow, 0.0, 1.0) * 0.52);
  }
`;

function Cosmos() {
  const invalidate = useThree((s) => s.invalidate);
  const size = useThree((s) => s.size);

  const progress = useRef(0);
  const targetProgress = useRef(0);
  const burstStart = useRef(-1);
  const band = useRef(-1);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uProgress: { value: 0 },
          uBurst: { value: new THREE.Vector2(0, 0) },
          uAspect: { value: 1 },
        },
        transparent: true,
        // Nothing else is in this scene, so neither test is meaningful — and skipping the depth
        // buffer entirely is one less thing for the GPU to touch per fragment.
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    material.uniforms.uAspect.value = size.width / Math.max(1, size.height);
    invalidate();
  }, [size, material, invalidate]);

  // The only input. Passive, coalesced to one read per frame, and it measures the document rather
  // than any element — so it never forces a layout the way reading an element's box would.
  useEffect(() => {
    let queued = 0;

    const read = () => {
      queued = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      targetProgress.current = p;

      const b = Math.min(SECTIONS - 1, Math.floor(p * SECTIONS));
      // No burst on the first reading: arriving at the page is not crossing into a section.
      if (band.current !== -1 && b !== band.current) burstStart.current = performance.now();
      band.current = b;

      invalidate();
    };

    const onScroll = () => {
      if (!queued) queued = requestAnimationFrame(read);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    read();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (queued) cancelAnimationFrame(queued);
    };
  }, [invalidate]);

  useFrame((state, delta) => {
    // Clamped for the same reason the card's return is: under frameloop="demand" the first frame
    // after a pause carries the whole length of that pause as its delta, and an unclamped
    // easing factor would jump straight to its target in one frame.
    const dt = Math.min(delta, 1 / 30);
    let alive = false;

    // The scroll position is followed rather than tracked exactly, which is what turns a jerky
    // wheel into a glide — and it costs nothing, because it is the same uniform either way.
    const d = targetProgress.current - progress.current;
    if (Math.abs(d) > 0.00015) {
      progress.current += d * Math.min(1, dt * 6);
      alive = true;
    } else {
      progress.current = targetProgress.current;
    }
    material.uniforms.uProgress.value = progress.current;

    const b = material.uniforms.uBurst.value as THREE.Vector2;
    if (burstStart.current >= 0) {
      const t = (performance.now() - burstStart.current) / BURST_MS;
      if (t >= 1) {
        burstStart.current = -1;
        b.set(0, 0);
      } else {
        // Struck, then fading: full brightness within the first tenth, then a squared decay, so
        // it reads as a detonation rather than a pulse.
        const rise = Math.min(1, t / 0.1);
        const fall = 1 - Math.max(0, (t - 0.1) / 0.9);
        b.set(rise * fall * fall, t);
        alive = true;
      }
    }

    if (alive) state.invalidate();
  });

  return (
    <mesh material={material} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

export const ScrollCosmos: React.FC = () => {
  // A full-screen effect is paid for in fragments, so the pixel count is what gives way on a
  // phone: rendering at a ratio of 1 against a screen reporting 3 is a ninth of the work, and on
  // an image made entirely of soft gradients the difference is close to invisible.
  const coarse =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  return (
    <Canvas
      frameloop="demand"
      dpr={coarse ? [0.65, 1] : [1, 1.5]}
      // No antialiasing: there is not a single hard edge in this scene to alias.
      gl={{ antialias: false, alpha: true, depth: false, stencil: false, powerPreference: 'low-power' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Cosmos />
    </Canvas>
  );
};

export default ScrollCosmos;
