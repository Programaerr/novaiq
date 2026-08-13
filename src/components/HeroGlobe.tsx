import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Mesh } from 'three';

/**
 * The globe behind the hero: a lit body, an orbit ring, and an atmosphere around the silhouette.
 *
 * ## It used to be a shell of points, and the reference is not that
 *
 * The previous version drew the planet as 5,200 sprites on a black occluder sphere. That reads as
 * a dark speckled ball with a glowing edge — which was a fair likeness of the reference it was
 * built from. The current reference is a different object: a SOLID body carrying a broad colour
 * ramp that runs navy → blue → violet → magenta across the lit face, with the dark side falling
 * away into the page. Points cannot produce that. Their whole appeal is having no shading to get
 * wrong, and shading is now the entire subject.
 *
 * So the surface is a fragment shader on one sphere, and the points are gone. That is also cheaper
 * than what it replaces: one draw call and no 5,200-vertex buffer, no sprite texture upload, and
 * no per-point colour attribute.
 *
 * ## The ramp is keyed on light, but the TEXTURE is keyed on the body
 *
 * This split is what makes the rotation visible, and it is the same problem the point version hit:
 * a smooth sphere lit from a fixed direction is rotationally symmetric, so spinning it produces
 * identical frames.
 *
 * The lighting term uses the VIEW-space normal. On a sphere centred at the origin that is
 * rotation-invariant — turn the sphere and the surface geometry is unchanged, so the normal at any
 * given screen pixel is the same as before. The ramp therefore stays welded to the light, exactly
 * as it should: the star does not orbit the planet.
 *
 * The cloud term uses OBJECT-space position, which is not invariant — it turns with the mesh. So
 * the bands of texture sweep across the fixed terminator, which is the thing the eye actually
 * follows. Same lesson as the banded vertex colours before it, one level down.
 *
 * ## Why the rim needs a shader and not a texture
 *
 * The bright edge is a VIEW-DEPENDENT effect: a surface is bright where you look along it and dark
 * where you look straight at it. That relationship is between the normal and the camera, so it can
 * only be evaluated per fragment, per frame — which is what Fresnel is. A painted ring would be a
 * picture of the effect from one angle and would sit still while the globe moved under it.
 *
 * `BackSide` + additive blending make the outer shell an ATMOSPHERE rather than a coating: what you
 * see is the far wall of a shell larger than the planet, past the planet's edge — light around the
 * body rather than paint on it. Additive because light adds; normal blending would let the halo
 * darken the sky behind it.
 *
 * ## What it costs
 *
 * Everything else on this page settles to zero frames at rest. A turning globe cannot, so the cost
 * is bounded rather than removed: `frameloop` is `'never'` unless the hero is on screen, DPR caps
 * at 1.5, antialiasing is off, and reduced-motion stops the loop entirely. The noise is two octaves
 * of value noise on a hash with no transcendentals in it — see `hash3` below for why that matters
 * more than the octave count.
 */

const RADIUS = 1;

/* The reference's ramp, darkest to hottest, read straight off the image. Kept adjacent so the
   planet's palette is one thing to look at rather than five scattered constants.

   C0 is barely above the page's own ground (#070B22), and that margin is the whole specification
   for it: the shadow side has to disappear into the page so the silhouette is drawn by the lit
   limb rather than by a step in brightness. Any darker and the planet reads as a hole punched
   through the page, which is exactly what happened at #0A0620 in an earlier pass. */
const C0_SHADOW = '#080C22';
const C1_DEEP = '#152C6E';
const C2_BLUE = '#2563EB';
const C3_VIOLET = '#7C3AED';
const C4_MAGENTA = '#D946EF';

/** The pale blue-white edge where the body catches the light along its own curve. */
const RIM_COLOR = '#A9C9FF';
const RING_COLOR = '#C7D8FF';

/* The atmosphere is two-tone for the same reason the body is: a single-colour halo around a
   multi-coloured planet reads as a sticker outline. Cool where the light is glancing, warm where
   it is strongest, matching the ramp underneath. */
const ATMO_COOL = '#3B60F0';
const ATMO_WARM = '#A855F7';

/* Where the star is, in view space — which is also world space here, because the camera never
   moves. The reference does not light its globe evenly: the limb is hot on one shoulder and nearly
   gone on the other, and that asymmetry is most of what stops it looking like a ring drawn around
   a circle.

   Up and slightly toward the page's outer edge. The reference is a left-to-right layout with the
   planet on the right lit from its right — light falling AWAY from the copy. This site is RTL with
   the planet on the left, so the whole arrangement mirrors and the light comes from the left. */
const LIGHT = new THREE.Vector3(-0.42, 0.8, 0.43).normalize();

/**
 * Shared GLSL. Both materials need the light constant and the same view-space setup, and a shader
 * is a string — so the pieces are strings too rather than being pasted twice.
 */
const NOISE_GLSL = /* glsl */ `
  // A hash with no sin() in it, and that is deliberate rather than clever. The usual
  // fract(sin(dot(p,k))*43758.5) is fine on a desktop and BANDS visibly at mediump on mobile GPUs,
  // because it depends on the low bits of a huge sine — precisely the bits half-precision does not
  // have. This one is all multiplies and fract, so it behaves identically everywhere, and it is
  // also several times cheaper at the ~500k fragments a second this shader covers.
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    // Smoothstep the interpolant, not the value: linear interpolation between lattice points
    // leaves visible creases along the cell boundaries.
    vec3 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(mix(hash3(i + vec3(0.0, 0.0, 0.0)), hash3(i + vec3(1.0, 0.0, 0.0)), u.x),
          mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
      mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), u.x),
          mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), u.x), u.y),
      u.z
    );
  }

  // Two octaves, not five. This is a texture that lives BEHIND a headline at about 500px across —
  // the third octave and beyond land at sub-pixel scale and cost a full fetch each to contribute
  // nothing but shimmer.
  float fbm(vec3 p) {
    return vnoise(p) * 0.62 + vnoise(p * 2.17) * 0.31;
  }
`;

/**
 * The body. Raw `THREE.ShaderMaterial` rather than drei's `shaderMaterial` helper, because drei is
 * not a dependency of this project — the helper's real benefit is its HMR `key`, and that is not
 * worth a package for two materials.
 */
function makeSurfaceMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uC0: { value: new THREE.Color(C0_SHADOW) },
      uC1: { value: new THREE.Color(C1_DEEP) },
      uC2: { value: new THREE.Color(C2_BLUE) },
      uC3: { value: new THREE.Color(C3_VIOLET) },
      uC4: { value: new THREE.Color(C4_MAGENTA) },
      uRim: { value: new THREE.Color(RIM_COLOR) },
      uLight: { value: LIGHT.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorld;
      varying vec3 vObj;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        // Object space, BEFORE any rotation — this is the one varying that turns with the mesh,
        // and therefore the only reason the spin is visible at all. See the note at the top.
        vObj = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform vec3 uC0;
      uniform vec3 uC1;
      uniform vec3 uC2;
      uniform vec3 uC3;
      uniform vec3 uC4;
      uniform vec3 uRim;
      uniform vec3 uLight;

      varying vec3 vNormal;
      varying vec3 vWorld;
      varying vec3 vObj;

      ${NOISE_GLSL}

      void main() {
        vec3 n = normalize(vNormal);
        vec3 view = normalize(cameraPosition - vWorld);

        // Half-Lambert (the *0.5+0.5 remap) rather than a raw clamped dot. A raw one drops to zero
        // across the whole terminator and gives a hard edge halfway round the sphere; the remap
        // keeps a gradient running all the way to the dark side, which is what makes a ball look
        // round instead of like two painted halves.
        float lit = dot(n, uLight) * 0.5 + 0.5;

        // The clouds. Sampled in object space so they travel with the body while the ramp above
        // stays welded to the light. Centred on zero so they push the ramp key both ways rather
        // than only brightening it.
        float clouds = fbm(vObj * 3.1) - 0.46;

        // The key into the colour ramp. The noise perturbs it INSTEAD of being drawn on top: a
        // separate overlay would sit at one brightness across the whole face, whereas warping the
        // key means the texture is strong through the mid-tones and fades out on both the hottest
        // highlight and the shadow — which is how cloud on a real body behaves.
        float k = clamp(lit + clouds * 0.22, 0.0, 1.0);

        // Cubed, and this exponent is doing most of the work in the whole shader.
        //
        // Half-Lambert puts the TERMINATOR at 0.5, so a gentle curve leaves the entire dark
        // hemisphere sitting in the middle of the ramp — which at 1.7 came out as a bright blue
        // ball with a pink cap, roughly the inverse of the reference. The reference's planet is
        // mostly black: the colour is a SHOULDER around the sub-solar point, not a coat of paint.
        //
        // At 3.0 the terminator lands at 0.125 and 60° from the light lands at 0.42, so the
        // saturated part of the ramp is confined to the cap that actually faces the star and
        // everything past it falls away into the page.
        k = pow(k, 3.0);

        vec3 c = uC0;
        c = mix(c, uC1, smoothstep(0.03, 0.14, k));
        c = mix(c, uC2, smoothstep(0.14, 0.40, k));
        c = mix(c, uC3, smoothstep(0.46, 0.72, k));
        c = mix(c, uC4, smoothstep(0.82, 0.99, k));

        // The lit limb: bright where the surface turns away from the camera AND faces the light.
        // Gated on the light term because an ungated Fresnel outlines the entire disc, including
        // the side in shadow, and a body with a complete halo has no light direction any more.
        float fres = pow(1.0 - abs(dot(view, n)), 3.4);
        c += uRim * fres * smoothstep(0.52, 0.96, lit) * 1.1;

        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
}

/** How far out the atmosphere shell sits, as a multiple of the planet's radius. */
const ATMO_SHELL = 1.3;

/** The atmosphere: a shell larger than the planet, seen from the inside. */
function makeAtmosphereMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCool: { value: new THREE.Color(ATMO_COOL) },
      uWarm: { value: new THREE.Color(ATMO_WARM) },
      // How fast the glow falls off outward from the planet's edge. Higher = a tighter band
      // hugging the limb; lower = a wash that spreads to the shell's own rim and flattens.
      uPower: { value: 2.2 },
      uIntensity: { value: 1.45 },
      uInner: { value: RADIUS },
      uOuter: { value: RADIUS * ATMO_SHELL },
      uLight: { value: LIGHT.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorld;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform vec3 uCool;
      uniform vec3 uWarm;
      uniform float uPower;
      uniform float uIntensity;
      uniform float uInner;
      uniform float uOuter;
      uniform vec3 uLight;

      varying vec3 vNormal;
      varying vec3 vWorld;

      void main() {
        vec3 n = normalize(vNormal);

        // ── Where the glow is brightest, and why it is NOT a Fresnel term ────────────────────
        // The obvious pow(1 - dot(view, normal), p) peaks at the SHELL's own silhouette. Since
        // the planet occludes everything inside its own outline, all you ever see of this shell is
        // the annulus between the two rims — and across that annulus a Fresnel term ramps UP
        // outward, so the glow is faintest against the planet and brightest at the shell's edge,
        // where it then stops dead. That draws a hard bright circle floating clear of the planet,
        // which is exactly what it looked like: an outline, not an atmosphere.
        //
        // Real limb glow is brightest AT the surface and fades outward, so the falloff has to be
        // keyed to the distance from the planet's edge instead. The camera sits on the +Z axis
        // looking at a sphere centred on the origin, which makes that distance simply the
        // fragment's radius perpendicular to the view axis. Valid only for that arrangement —
        // see the Canvas below, which pins it.
        //
        // Rotation-safe despite the group tumbling: the body is a sphere at the origin, so
        // rotating it leaves the set of world positions unchanged.
        float d = length(vWorld.xy);
        float t = clamp((d - uInner) / (uOuter - uInner), 0.0, 1.0);
        float glow = pow(1.0 - t, uPower);

        float lit = dot(n, uLight) * 0.5 + 0.5;
        // Remapped to 0.18..1 rather than 0..1 so the dark side keeps a trace of atmosphere
        // instead of the halo vanishing halfway round and leaving a crescent.
        float shoulder = 0.18 + 0.82 * lit * lit;

        // Warm only where the light is strongest, matching the magenta end of the body's ramp.
        vec3 tint = mix(uCool, uWarm, smoothstep(0.55, 1.0, lit));

        gl_FragColor = vec4(tint, glow * shoulder * uIntensity);
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    // The halo must not occlude the planet in front of it, and additive layers should never write
    // depth — two of them would otherwise cut each other out depending on draw order.
    depthWrite: false,
  });
}

function Globe({ spin }: { spin: boolean }) {
  const body = useRef<THREE.Group>(null);
  const surface = useRef<Mesh>(null);
  const surfaceMat = useMemo(makeSurfaceMaterial, []);
  const atmosphere = useMemo(makeAtmosphereMaterial, []);

  // GPU resources React does not own, so they are released explicitly when the hero unmounts.
  // R3F disposes what it created from JSX; these two were built here.
  useEffect(() => {
    return () => {
      surfaceMat.dispose();
      atmosphere.dispose();
    };
  }, [surfaceMat, atmosphere]);

  useFrame((state, delta) => {
    if (!spin) return;

    // Delta-based so the globe turns at one speed on a 60Hz and a 120Hz screen. Clamped because
    // delta is the length of the pause after the loop has been stopped off-screen, and an
    // unclamped one would snap the globe forward by that entire gap the moment it returns.
    const step = Math.min(delta, 0.05);

    // 0.055 rad/s — one turn every ~114 seconds. Far slower than the point version needed, because
    // the clouds are broad shapes rather than two-pixel dots: a feature this large crossing the
    // face is legible at a speed that would have made individual points invisible.
    if (surface.current) surface.current.rotation.y += step * 0.055;

    // The tumble: the same 3D turn the credential card makes when it is dragged, except nobody has
    // to drag this. The BODY's axis leans slowly on two axes while the surface spins on a third,
    // so the planet is never presented from the same angle twice.
    //
    // This is what a spin alone could not do. Rotation about a fixed axis on a sphere is ambiguous
    // — the silhouette never changes, so there is no parallax and the eye is given no evidence of
    // depth. Leaning the axis swings the RING through perspective, and that is unmistakably three
    // dimensional.
    //
    // 0.11 and 0.083 rad/s: deliberately not a ratio of small integers, so the two never come back
    // into phase and the motion has no loop point to notice. Amplitudes stay small (±0.16 and
    // ±0.12 rad, roughly ±9° and ±7°) because this is meant to be felt rather than watched — the
    // headline is the thing being read, and this is behind it.
    if (body.current) {
      const t = state.clock.elapsedTime;
      body.current.rotation.x = 0.28 + Math.sin(t * 0.11) * 0.16;
      body.current.rotation.z = 0.16 + Math.sin(t * 0.083) * 0.12;
    }
  });

  return (
    <group ref={body} rotation={[0.28, 0, 0.16]}>
      {/* The body. 64 segments rather than 48: the silhouette is now a hard edge between a lit
          surface and the page instead of a soft cloud of points, so facet corners along the limb
          are visible where they previously were not. */}
      <mesh ref={surface} material={surfaceMat}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
      </mesh>

      {/* The ring. A torus rather than a flat `ringGeometry`, and that is the whole reason it works:
          a flat ring has no thickness, so the half running across the front of the globe and the
          half running behind are the same zero-depth plane, and at this shallow a tilt it collapses
          to a line. A torus is a solid tube — its front arc passes IN FRONT of the planet and its
          back arc is hidden behind, which is the read that makes the scene three dimensional rather
          than a circle with a stripe on it.

          The Z term is new and it is what matches the reference: rotations apply in XYZ order, so a
          Z rotation lands last and tips the finished ellipse in the SCREEN plane. The reference's
          ring runs low-left to high-right; mirrored for RTL that is low-right to high-left, which
          is +0.30 rad here.

          The tube is very thin (0.008 against a radius of 1.36) because it is a line in the
          composition, not a body — thicker and it competes with the planet it is orbiting. */}
      <mesh rotation={[Math.PI / 2 - 0.42, 0, 0.3]}>
        <torusGeometry args={[RADIUS * 1.36, 0.008, 8, 180]} />
        <meshBasicMaterial
          color={RING_COLOR}
          transparent
          opacity={0.62}
          // Writes depth, unlike the atmosphere — the ring has to be correctly occluded BY the
          // planet, which only works if the depth buffer knows where both of them are.
          toneMapped={false}
        />
      </mesh>

      {/* The atmosphere, outside everything else. The shell's radius is now how far the glow
          REACHES rather than where it is brightest, so it can be generous — see the fragment
          shader, which fades from the planet's edge outward to exactly here. */}
      <mesh material={atmosphere}>
        <sphereGeometry args={[RADIUS * ATMO_SHELL, 48, 48]} />
      </mesh>
    </group>
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
          // The one scene here that genuinely animates at rest, so it is switched off rather than
          // throttled: 'never' draws nothing at all, not fewer frames.
          frameloop={motion ? 'always' : 'never'}
          dpr={[1, 1.5]}
          // 3.9, and the exact value matters. At fov 45 the visible height at the origin is
          // 2·dist·tan(22.5°); at the 2.75 this started on that came to 2.278 world units, while
          // the ATMOSPHERE shell is 2.28 across. The halo was therefore very slightly wider than
          // the frame and got sliced off flat against all four canvas edges — which showed up as
          // bright wedges in the corners of an obviously rectangular box.
          //
          // A glow has to fade out before it reaches the edge of its own canvas or the canvas
          // becomes visible, so the frame is sized to the widest thing in the scene plus margin,
          // not to the planet. 3.9 gives 3.23 units of height for a 2.72-unit ring; the CSS box is
          // sized so the SPHERE, which is only 2 of those units, still lands where the reference
          // puts it — see `.hero-globe`, which carries that arithmetic.
          camera={{ position: [0, 0, 3.9], fov: 45 }}
          gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        >
          <Globe spin={motion} />
        </Canvas>
      )}
    </div>
  );
};
