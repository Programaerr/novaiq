import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_DPR } from '../lib/renderBudget';

/**
 * The home hero's artwork: a single dark body whose surface is alive.
 *
 * ## Why this replaces a video
 *
 * The hero it succeeds played an mp4 of a rendered sphere, streamed from a CDN belonging to
 * somebody else's website. That is three separate liabilities in one tag — a third party can
 * change or withdraw the file, the first paint waits on a network the site does not control, and
 * the frame is fixed at whatever aspect it was rendered at, which is why it had to be cropped to
 * a band on phones before the sphere fit the screen at all.
 *
 * The same object generated here costs about 40 lines of GLSL, is owned, needs no network, and is
 * resolution-independent: it is sized to the viewport rather than cropped to it.
 *
 * ## The surface
 *
 * Vertices are pushed along their own normal by fractal noise that drifts, so the ridges flow
 * across the body instead of the body simply turning. Two things make that read as a material
 * rather than as a wobbling ball:
 *
 * 1. The noise is DOMAIN-WARPED — a second sample is taken at coordinates the first one bends.
 *    Plain fbm gives soft dunes; warped fbm gives the long folded ridges that look like something
 *    was poured and set.
 * 2. Normals are recomputed from the DISPLACED surface, by sampling the field again at two small
 *    tangent offsets and crossing the differences. Without this the shading stays that of a smooth
 *    sphere and the ridges are geometry no light ever finds — the single most common way this
 *    effect ends up looking cheap.
 *
 * ## Lighting is computed in VIEW space, on purpose
 *
 * A sphere lit from a fixed world direction is rotationally symmetric: spin it and every frame
 * matches the last, so the GPU redraws a still image. Lighting from the view-space normal keeps
 * the lit crescent anchored to the screen while the surface travels through it, which is what
 * makes the motion legible. Same reasoning as HeroPlanet.tsx, which learned it the hard way.
 *
 * ## What it costs
 *
 * Three field samples per vertex (one for position, two for the normal), three octaves each, over
 * 15k vertices on a phone and 61k on a desktop. It runs only while the hero is on screen AND the
 * page has a viewer: the loop is parked at 'never' when either is false, `data-idle` being the
 * same flag the CSS animations across the site stop on.
 *
 * NO BACKTICKS anywhere inside the shader strings below, including in prose: they are JS template
 * literals, and one backtick closes the string mid-shader. That compiles to a GLSL syntax error
 * and shows up as the object silently failing to draw.
 */

/* ── Palette ────────────────────────────────────────────────────────────────────────────── */

/* The site is monochrome, so this object is too — the four tones below are one ramp from the
   page's own ground to its own accent, with no hue introduced anywhere. The rim is the single
   exception and it is barely one: a few points of blue, because a grazing highlight on any real
   surface carries the colour temperature of the sky rather than of the body. */
const C_INK = '#06070A';
const C_BODY = '#494D57';
const C_PALE = '#E4E4E7';
const C_RIM = '#EEF2F8';

/** Fixed key direction, in VIEW space — see the header. Up, and from the far side of the copy. */
const LIGHT = new THREE.Vector3(-0.44, 0.68, 0.58).normalize();

/**
 * Peak displacement as a fraction of the radius. Every size calculation below has to allow for it,
 * or the ridges clip the frame that the smooth sphere fits inside.
 *
 * Deliberately small. The relief here should read in the SHADING, not in the silhouette: past
 * about 0.12 the outline goes lumpy and the object stops being a sphere with a surface and starts
 * being an asteroid. The ridges are made visible by the crest term in the fragment shader instead,
 * which costs nothing and does not touch the edge.
 */
const AMP = 0.1;

/** Radians per second. Slow enough that the flowing surface, not the rotation, is the motion. */
const SPIN = 0.055;

/* ── The material ───────────────────────────────────────────────────────────────────────── */

function makeOrbMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    wireframe: true,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: AMP },
      uInk: { value: new THREE.Color(C_INK) },
      uBody: { value: new THREE.Color(C_BODY) },
      uPale: { value: new THREE.Color(C_PALE) },
      uRim: { value: new THREE.Color(C_RIM) },
      uLight: { value: LIGHT.clone() },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uAmp;

      varying vec3 vN;
      varying vec3 vVP;
      varying float vH;

      // Multiply-and-fract, not fract(sin(dot(...))). The sine version reads the low bits of a
      // very large number and mediump mobile GPUs cannot keep them apart — it bands into visible
      // stripes on exactly the phones this has to look right on.
      float hash31(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float vnoise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        // QUINTIC, not the usual cubic smoothstep. Cubic leaves the second derivative
        // discontinuous at every cell boundary, which a colour lookup never shows but a NORMAL
        // computed from the field shows immediately: the first build of this shader had a lattice
        // of diamond-shaped creases across the body, one per noise cell, and they were the grid
        // itself catching the specular. Quintic is flat to the second derivative at the joins and
        // they disappear.
        f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(
          mix(mix(hash31(i), hash31(i + vec3(1, 0, 0)), f.x),
              mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), f.x), f.y),
          mix(mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), f.x),
              mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), f.x), f.y),
          f.z);
      }

      // Three octaves, and 2.03 rather than a flat 2.0 — doubling exactly lines the octaves' grids
      // up and leaves a faint square lattice across the surface.
      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 3; i++) {
          v += a * vnoise(p);
          p *= 2.03;
          a *= 0.5;
        }
        return v;
      }

      // The height field, sampled on the unit sphere. The warp — feeding the first result back in
      // as a coordinate offset — is what turns dunes into folded ridges.
      //
      // The remap at the end is not cosmetic. Three octaves at halving amplitude sum to at most
      // 0.875 and sit around 0.44 on average, so a raw fbm centred by subtracting 0.5 swings about
      // 0.12 either way, NOT 0.5 — and uAmp, which is meant to read as "displacement as a
      // fraction of the radius", silently delivered a sixth of what it said. The first build of
      // this shader looked like a smooth black ball for exactly that reason. Centring on the real
      // mean and scaling by its reciprocal puts the field back in about -1..1 so the constant
      // means what it claims.
      float field(vec3 dir) {
        vec3 q = dir * 2.0;
        q.y -= uTime * 0.10;
        float n = fbm(q);
        float w = fbm(q * 2.05 + n * 1.6 + 7.3);
        return (n * 0.6 + w * 0.4 - 0.44) * 2.9;
      }

      vec3 place(vec3 dir, out float h) {
        h = field(dir);
        return dir * (1.0 + h * uAmp);
      }

      void main() {
        vec3 dir = normalize(position);

        float h;
        vec3 p = place(dir, h);

        // A tangent basis on the sphere, dodging the degenerate cross product at the poles.
        vec3 up = abs(dir.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 t = normalize(cross(up, dir));
        vec3 b = cross(dir, t);

        // Wide enough to straddle real ridges. Too small and the difference is noise-floor and the
        // shading speckles; too large and the surface flattens back toward the smooth sphere.
        float e = 0.045;
        float ht;
        float hb;
        vec3 pt = place(normalize(dir + t * e), ht);
        vec3 pb = place(normalize(dir + b * e), hb);

        vec3 n = normalize(cross(pt - p, pb - p));
        // The basis handedness flips across the pole guard above, so the cross product can come
        // out inward. Cheaper to correct than to branch the basis.
        if (dot(n, dir) < 0.0) n = -n;

        vH = h;
        vN = normalize(normalMatrix * n);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        // View space: the camera sits at the origin, so the direction to it is just -position.
        // Saves passing cameraPosition and a world-space varying for the fresnel term.
        vVP = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform vec3 uInk;
      uniform vec3 uBody;
      uniform vec3 uPale;
      uniform vec3 uRim;
      uniform vec3 uLight;

      varying vec3 vN;
      varying vec3 vVP;
      varying float vH;

      float hash21(vec2 p) {
        vec3 q = fract(vec3(p.xyx) * 0.1031);
        q += dot(q, q.yzx + 33.33);
        return fract((q.x + q.y) * q.z);
      }

      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(-vVP);

        // Half-Lambert. A raw clamped dot drops to zero across the whole terminator and puts a
        // hard black band round the body; the remap keeps a gradient going into the dark side.
        float lit = dot(n, uLight) * 0.5 + 0.5;
        float k = pow(lit, 1.5);

        vec3 c = mix(uInk, uBody, smoothstep(0.04, 0.78, k));
        c = mix(c, uPale, smoothstep(0.72, 1.0, k) * 0.62);

        // Crests catch light and troughs hold shadow, beyond what the normals alone give. This is
        // the term that keeps the ridges readable once the body turns away from the key — a
        // surface lit only by its normals loses all its relief across the terminator.
        c *= 0.66 + 0.78 * smoothstep(-0.55, 0.5, vH);

        // The limb. Ungated by the light term: on a body this dark it is also what separates the
        // silhouette from the page behind it, and the page behind it is the same black.
        float fres = pow(1.0 - max(dot(v, n), 0.0), 3.2);
        c += uRim * fres * 0.40;

        // One tight specular. Everything above is soft, and soft alone reads as clay — this is
        // what puts a wet highlight on the crests and tells you the ridges have edges.
        vec3 hv = normalize(uLight + v);
        c += vec3(1.0) * pow(max(dot(n, hv), 0.0), 38.0) * 0.42;

        /* DITHER, and it is not a finishing touch — it is what makes this object look like a
           rendered surface rather than a set of plates.

           Everything above lives between #06 and #4A. A framebuffer has 256 steps across the whole
           range, so a gradient that dark gets maybe thirty of them, and the boundary between one
           step and the next draws a hard contour line across the body. On a curved surface those
           contours follow the ridges and come out looking like flat polygonal facets — which is
           exactly what this looked like, and it was misread as a geometry problem first: rendering
           the normals showed them perfectly smooth, so nothing was faceted except the colour.

           A pixel of noise under half a step is invisible on its own and pushes each pixel to
           whichever side of the boundary it was already nearest, which turns a hard contour into a
           soft one. Standard practice for any dark render; mandatory for one this dark. */
        c += (hash21(gl_FragCoord.xy) - 0.5) * (1.6 / 255.0);

        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
}

/* ── The scene ──────────────────────────────────────────────────────────────────────────── */

/** Vertices = 20 · 4^detail · 3 (icosahedron geometry is non-indexed). 4 -> 15k, 5 -> 61k.
    An icosahedron rather than a UV sphere because its triangles are all the same size: noise
    displacement on a UV sphere is finely resolved at the poles and coarse at the equator, and the
    seam between the two is visible as a change in ridge scale. */
const DETAIL = MAX_DPR > 1 ? 5 : 4;

interface OrbProps {
  /** Normalised pointer, written by the host from the SECTION's pointermove. -1..1, y up. */
  pointer: React.RefObject<{ x: number; y: number }>;
  /** Mirror the composition for LTR, where the copy sits on the other side. */
  flip: boolean;
  reduced: boolean;
}

const Orb: React.FC<OrbProps> = ({ pointer, flip, reduced }) => {
  const material = useMemo(makeOrbMaterial, []);
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, DETAIL), []);

  const spin = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const leanX = useRef(0);
  const leanY = useRef(0);

  const invalidate = useThree((s) => s.invalidate);
  const viewport = useThree((s) => s.viewport);
  const width = useThree((s) => s.size.width);

  // GPU resources React does not own, released explicitly. R3F disposes what it made from JSX.
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
    },
    [material, geometry],
  );

  // Under a reduced-motion preference the canvas runs on demand and never asks for another frame,
  // so this is the one that gets drawn.
  useEffect(() => {
    if (reduced) invalidate();
  }, [reduced, invalidate]);

  /**
   * Size and place the body from the VIEWPORT, in world units, rather than from a fixed scale.
   *
   * Two layouts, and the breakpoint is the same 1024 the copy switches at:
   *  - Wide: the copy takes one side, so the body is sized against the HEIGHT and pushed to the
   *    other side of the frame.
   *  - Narrow: the copy is above it and a strip is below it, so it is sized against the WIDTH and
   *    centred. This is the lesson the video version paid for — on a portrait phone, fitting the
   *    frame and fitting the SUBJECT are opposite instructions, and only the second one matters.
   *
   * Divided by (1 + AMP) because the figure that has to fit is the ridged body, not the sphere
   * underneath it.
   */
  const wide = width >= 1024;
  const diameter = wide
    ? Math.min(viewport.height * 0.74, viewport.width * 0.44)
    : Math.min(viewport.width * 0.9, viewport.height * 0.5);
  const scale = diameter / 2 / (1 + AMP);
  const x = wide ? (flip ? 1 : -1) * viewport.width * 0.21 : 0;

  useFrame((_, delta) => {
    // Clamped: this is the length of the pause after the loop stopped off screen, and an unclamped
    // step would integrate the whole gap in one frame and snap the surface round.
    const dt = Math.min(delta, 0.05);

    if (!reduced) {
      clock.current += dt;
      material.uniforms.uTime.value = clock.current;
      if (spin.current) spin.current.rotation.y = clock.current * SPIN;

      // The body leans toward the pointer instead of tracking it. Exponential damping, as a
      // fraction of the remaining distance per second, so it settles at the same rate on a 60Hz
      // and a 144Hz screen.
      const p = pointer.current ?? { x: 0, y: 0 };
      const kk = 1 - Math.exp(-dt * 2.6);
      leanY.current += (p.x * 0.26 - leanY.current) * kk;
      leanX.current += (-p.y * 0.18 - leanX.current) * kk;
      if (lean.current) {
        lean.current.rotation.y = leanY.current;
        lean.current.rotation.x = leanX.current;
      }

      // The surface flows for as long as it is drawn, so this asks for the next frame every frame.
      // The gate is the canvas's own frameloop, switched off entirely when the hero leaves the
      // screen or the page loses its viewer — not a condition tested in here.
      invalidate();
    }
  });

  return (
    <group position={[x, 0, 0]} scale={scale}>
      <group ref={lean}>
        <group ref={spin}>
          <mesh geometry={geometry} material={material} />
        </group>
      </group>
    </group>
  );
};

/* ── The host ───────────────────────────────────────────────────────────────────────────── */

export const HeroOrb: React.FC<{ flip?: boolean }> = ({ flip = false }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const [idle, setIdle] = useState(false);
  const [reduced, setReduced] = useState(false);

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
     a WebGL loop is the one thing on the page that would carry on burning frames for nobody, so
     it reads the same flag rather than keeping its own idea of who is watching. */
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

  /**
   * Pointer, read from the SECTION rather than from this element.
   *
   * This canvas sits under the copy, which is full width and stacked above it, so a pointer event
   * over the headline never reaches here — `onPointerMove` on the canvas fires only in the gaps
   * between text. Listening on the section that contains both asks a geometric question instead
   * of a hit-testing one, and the answer is the same everywhere in the hero.
   *
   * Gated on `(hover: hover)`: touch fires pointermove on tap, and a body left leaning wherever
   * the last tap landed is not an interaction, it is a stuck state.
   */
  useEffect(() => {
    const el = hostRef.current;
    const section = el?.closest('section');
    if (!section) return;
    if (!window.matchMedia('(hover: hover)').matches) return;

    const onMove = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      pointer.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.current.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const onLeave = () => {
      pointer.current.x = 0;
      pointer.current.y = 0;
    };

    section.addEventListener('pointermove', onMove);
    section.addEventListener('pointerleave', onLeave);
    return () => {
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0" aria-hidden="true">
      {/* Kept MOUNTED and parked at frameloop='never' off screen, rather than unmounted. Tearing
          the canvas down destroys the GL context, and rebuilding it costs a fresh context, a
          shader recompile and a scene rebuild on the main thread every time the hero comes back. */}
      <Canvas
        frameloop={reduced ? 'demand' : active && !idle ? 'always' : 'never'}
        dpr={[1, MAX_DPR]}
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <Orb pointer={pointer} flip={flip} reduced={reduced} />
      </Canvas>
    </div>
  );
};
