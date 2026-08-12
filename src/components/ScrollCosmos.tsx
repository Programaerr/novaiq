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

    // The hole opens as the page descends.
    float R = 0.085 + uProgress * 0.055;

    // Lensed starfield. Light passing a mass is deflected towards it, so the field is sampled at
    // a coordinate pulled inward by 1/r^2 — the further in, the more the sky bends around the
    // shadow. Cheap because the "stars" are a hash of a grid cell rather than any real geometry.
    // Parallax: the field slides at its own rate and only a third of the hole's swing, so the
    // two separate as you scroll instead of moving as one flat picture. That difference is the
    // entire sensation of depth here — there is no third dimension in this shader at all.
    vec2 warp = (uv - centre * 0.34 + vec2(uProgress * 0.62, uProgress * -0.2));
    warp *= (1.0 + 0.055 / (r * r + 0.02));
    vec2 cell = floor(warp * 62.0);
    float star = step(0.986, hash(cell)) * smoothstep(0.0, 0.3, r - R);
    float stars = star * (0.3 + 0.7 * hash(cell + 3.7));

    // Accretion disc. The winding tightens towards the hole — inner orbits are faster — and the
    // whole pattern turns with the scroll, so the disc reads as being driven by the page.
    float swirl = a + 0.55 / r + uProgress * 9.0;
    float band = 0.5 + 0.5 * sin(swirl * 3.0);
    float shell = smoothstep(R * 0.98, R * 1.55, r) * smoothstep(R * 5.4, R * 1.9, r);
    float disc = shell * (0.22 + 0.78 * band) * (0.5 + uProgress * 0.9);

    // The photon ring: the hard bright rim of the shadow.
    float ring = exp(-pow((r - R * 1.16) / (R * 0.1), 2.0)) * (0.85 + uProgress * 0.6);

    // The horizon itself. Not drawn — subtracted, so the page shows through as true black.
    float hole = smoothstep(R * 1.02, R * 0.9, r);

    // Supernova: an expanding shell with rays behind it, and a flash at the centre.
    float sr = uBurst.y * 0.95;
    float wave = exp(-pow((r - sr) / 0.05, 2.0));
    float rays = 0.55 + 0.45 * cos(a * 14.0 + uProgress * 4.0);
    float nova = uBurst.x * (wave * (0.55 + 0.45 * rays) + 0.3 * exp(-r * 7.0));

    float glow = disc + ring + stars * 0.55 + nova;
    glow *= (1.0 - hole);
    // Faded well before the frame edge, so the layer never resolves into a rectangle.
    glow *= smoothstep(0.9, 0.22, r);

    gl_FragColor = vec4(vec3(1.0), clamp(glow, 0.0, 1.0) * 0.92);
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
