import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * The NOVAIQ mark, built as real geometry and turning in 3D. It replaces HeroGlobe's planet.
 *
 * ## Tubes, not an extruded outline
 *
 * The mark is two braces and an orbit ring — all of them STROKES of roughly constant width. The
 * obvious way to get a glyph into a scene is `ExtrudeGeometry` on a `THREE.Shape`, and it is the
 * wrong tool here: an extruded outline is a flat slab, so the moment it turns past about 70° it
 * collapses to its own edge and the mark reads as a sheet of card rather than an object. Half of a
 * full rotation would be spent looking at a line.
 *
 * A stroke of constant width swept along a path is a TUBE, and a tube has a round cross-section, so
 * it presents the same thickness from every angle. The mark stays solid all the way round. That is
 * also why the ring is a torus — a torus is the same thing closed into a loop, so the ring and the
 * braces are made of the same stuff and agree with each other under rotation.
 *
 * The source art is a PNG (`assets/images/novaiq-icon.png`), not a vector, so there was nothing to
 * trace automatically — no SVG exists anywhere in the repo. The curve below is the mark rebuilt
 * from its construction rather than converted from its pixels.
 *
 * ## Why it can spin without the trick the globe needed
 *
 * The globe spent two rounds of work on making its rotation visible, because a sphere lit from a
 * fixed direction is rotationally symmetric: every frame looks like the last one. This has no such
 * problem. The mark is not symmetric about any axis, so its silhouette changes continuously and the
 * rotation is legible for free. No cloud layer, no banded brightness — the shader here is only a
 * lit ramp and a rim, and it is simpler than the planet's for that reason.
 *
 * ## The mark does not mirror in RTL
 *
 * NovaiqLogo.tsx sets `dir="ltr"` on itself and says why: a brand lockup keeps its physical order
 * in Arabic. The same applies to the ring's diagonal, which runs low-left to high-right in the
 * artwork and stays there — everything else in this hero mirrors with the writing direction, this
 * one thing deliberately does not.
 */

/* Gold, and it is the ONLY hue left anywhere on the site — the page around it is strictly black
   and white (see the --nq-accent note in index.css). That is the entire colour strategy: one
   chromatic object on a monochrome ground. It cost nothing to spend the site's only colour here,
   because this is the brand's own mark.
   The ramp runs bronze → gold → cream → white rather than dark-gold → light-gold. A single hue
   lightened toward its own tint reads as a flat sticker; letting the shadow end go browner and the
   highlight end go white is what makes it read as metal catching a light. */
const C0_SHADOW = '#2A1C05';
const C1_BRONZE = '#9A6B12';
const C2_GOLD = '#E8B448';
const C3_CREAM = '#FFF2D0';
const C4_WHITE = '#FFFFFF';
/* Warm white, not the page's neutral white: a cool rim on a gold body reads as a separate chrome
   edge stuck onto it rather than as the same metal turning away from the eye. */
const RIM_COLOR = '#FFE3A0';

/* Same light as the globe used, and for the same reason: up and toward the page's outer edge, so
   the lit shoulder faces away from the copy instead of into it. */
const LIGHT = new THREE.Vector3(-0.42, 0.8, 0.43).normalize();

/** Stroke radius. The artwork's braces are about a tenth of their own height across — 0.105 here
    against a half-height of 1. At 0.062 they came out as wire and the mark read as a diagram. */
const STROKE = 0.105;
/** How far each brace sits from the centre line. Set from the INNER edge rather than by eye: the
    arms reach x = 0.48 in the curve below, so 0.70 leaves 0.44 of clear air down the middle. */
const BRACE_X = 0.7;

/**
 * One curly brace, as a path from its top terminal to its bottom one.
 *
 * Written for the LEFT brace: arms reaching right, nub pointing left. The right brace is this same
 * curve with x negated — a mirror rather than a second hand-built path, so the two halves of the
 * mark cannot drift out of agreement when one is adjusted.
 *
 * Catmull-Rom rather than explicit beziers: the shape is defined by where the stroke GOES, and a
 * spline through those positions is a direct statement of that. Beziers would put the control
 * points off the curve, where every adjustment is indirect.
 */
const BRACE_POINTS: [number, number][] = [
  // The top arm. It runs FLAT for a stretch before it turns down, which is the detail that makes
  // this read as a typographic brace rather than as a bent wire — the artwork's terminals are
  // horizontal, and a spline given only the corner and the tip rounds that flat off entirely.
  [0.48, 1.0],
  [0.32, 1.0],
  [0.19, 0.94],
  [0.13, 0.8],
  // The upper stem, sampled twice down its length so the spline holds it straight instead of
  // bowing it between the two corners at either end.
  [0.13, 0.5],
  [0.13, 0.26],
  // The nub: the brace's waist, and the only part that crosses to the far side of the stem.
  [0.01, 0.13],
  [-0.14, 0.0],
  [0.01, -0.13],
  // Mirrored back down. The curve is symmetric about y = 0 by construction rather than by hand,
  // so the two halves cannot drift apart.
  [0.13, -0.26],
  [0.13, -0.5],
  [0.13, -0.8],
  [0.19, -0.94],
  [0.32, -1.0],
  [0.48, -1.0],
];

function makeBraceCurve(mirrored: boolean): THREE.CatmullRomCurve3 {
  const sign = mirrored ? -1 : 1;
  return new THREE.CatmullRomCurve3(
    BRACE_POINTS.map(([x, y]) => new THREE.Vector3(x * sign, y, 0)),
    false,
    // Centripetal, not the default centripetal-vs-chordal guess: uniform parameterisation
    // overshoots at the tight corners of the nub and puts a visible kink in the stroke.
    'centripetal',
    0.5,
  );
}

/**
 * The mark's surface. Raw `THREE.ShaderMaterial` rather than drei's helper, because drei is not a
 * dependency of this project and the helper's real benefit is its HMR key.
 *
 * NO BACKTICKS anywhere inside the shader strings below, including in prose: they are JS template
 * literals, and one backtick closes the string mid-shader. That mistake compiles to a syntax error
 * inside GLSL and shows up as the whole object silently failing to draw.
 */
function makeMarkMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uC0: { value: new THREE.Color(C0_SHADOW) },
      uC1: { value: new THREE.Color(C1_BRONZE) },
      uC2: { value: new THREE.Color(C2_GOLD) },
      uC3: { value: new THREE.Color(C3_CREAM) },
      uC4: { value: new THREE.Color(C4_WHITE) },
      uRim: { value: new THREE.Color(RIM_COLOR) },
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

      uniform vec3 uC0;
      uniform vec3 uC1;
      uniform vec3 uC2;
      uniform vec3 uC3;
      uniform vec3 uC4;
      uniform vec3 uRim;
      uniform vec3 uLight;

      varying vec3 vNormal;
      varying vec3 vWorld;

      void main() {
        vec3 n = normalize(vNormal);
        vec3 view = normalize(cameraPosition - vWorld);

        // Half-Lambert (the *0.5+0.5 remap) rather than a raw clamped dot. A raw one drops to zero
        // across the whole terminator, and on a tube that reads as a hard black line running the
        // length of every stroke. The remap keeps a gradient going round the back so the strokes
        // stay round.
        float lit = dot(n, uLight) * 0.5 + 0.5;

        // Barely any bias, and pointed the OTHER WAY from the planet's cube. A planet is meant to
        // be mostly in shadow; a logo is meant to be read, and NOVAIQ's mark is white. So the ramp
        // sits high: most of the lit side lands in the pale end and only the surfaces genuinely
        // turned away fall through the blues. At 1.55 the strokes came out flat indigo — the shape
        // was right and the brand was not in it.
        float k = pow(lit, 1.1);

        vec3 c = uC0;
        c = mix(c, uC1, smoothstep(0.05, 0.30, k));
        c = mix(c, uC2, smoothstep(0.28, 0.52, k));
        c = mix(c, uC3, smoothstep(0.50, 0.78, k));
        c = mix(c, uC4, smoothstep(0.76, 0.96, k));

        // The rim, ungated by the light term — the opposite of the planet's, deliberately. On a
        // sphere an ungated rim outlines the whole disc and destroys the sense of a light
        // direction. On a thin tube it is what keeps the stroke's edges defined against a dark
        // page from every angle, which is the difference between a logo and a smudge.
        float fres = pow(1.0 - abs(dot(view, n)), 2.6);
        c += uRim * fres * 0.5;

        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
}

function Mark({ spin }: { spin: boolean }) {
  const tilt = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  const material = useMemo(makeMarkMaterial, []);

  const leftBrace = useMemo(() => makeBraceCurve(false), []);
  const rightBrace = useMemo(() => makeBraceCurve(true), []);

  // A GPU resource React does not own, so it is released explicitly when the hero unmounts. R3F
  // disposes what it created from JSX; this was built here.
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    if (!spin) return;

    // Delta-based so it turns at one speed on a 60Hz and a 120Hz screen. Clamped because delta is
    // the length of the pause after the loop has been stopped off-screen, and an unclamped one
    // would snap the mark forward by that whole gap the moment it comes back.
    const step = Math.min(delta, 0.05);

    // 0.34 rad/s — one full turn every ~18 seconds. Faster than the globe's, and it can afford to
    // be: a sphere turning at this rate would be a blur of texture, whereas the mark's silhouette
    // is the thing changing and it needs to travel far enough to be seen doing it.
    if (spinner.current) spinner.current.rotation.y += step * 0.34;

    // The lean, on top of the spin. Rotation about a single fixed axis is a lathe — everything
    // travels on parallel circles and the object never shows you its top or bottom. Tipping the
    // axis itself is what turns that into a tumble.
    //
    // 0.11 and 0.083 rad/s: deliberately not a ratio of small integers, so the two never come back
    // into phase and the motion has no loop point to notice.
    if (tilt.current) {
      const t = state.clock.elapsedTime;
      tilt.current.rotation.x = Math.sin(t * 0.11) * 0.2;
      tilt.current.rotation.z = 0.06 + Math.sin(t * 0.083) * 0.1;
    }
  });

  // Both braces and both of their end caps share ONE material instance, so retuning the mark's
  // colour is a single edit and the parts cannot fall out of step with each other.
  const braces: { curve: THREE.CatmullRomCurve3; x: number }[] = [
    { curve: leftBrace, x: -BRACE_X },
    { curve: rightBrace, x: BRACE_X },
  ];

  return (
    <group ref={tilt}>
      <group ref={spinner}>
        {braces.map(({ curve, x }, i) => (
          <group key={i} position={[x, 0, 0]}>
            <mesh material={material}>
              {/* 128 segments along the path: the nub is a tight reversal and a coarser sweep
                  visibly facets it into a corner. 10 around is plenty for a stroke this thin. */}
              <tubeGeometry args={[curve, 128, STROKE, 10, false]} />
            </mesh>

            {/* Caps. `TubeGeometry` builds an open pipe — it does not close its ends — so without
                these you can see straight down the hollow inside of every stroke as the mark
                turns, which is far more obvious than the four extra spheres cost. */}
            {[0, 1].map((end) => {
              const p = curve.getPoint(end);
              return (
                <mesh key={end} position={[p.x, p.y, p.z]} material={material}>
                  <sphereGeometry args={[STROKE, 12, 8]} />
                </mesh>
              );
            })}
          </group>
        ))}

        {/* The orbit ring, at the artwork's own diagonal: low-left to high-right. Rotations apply
            in XYZ order, so the Z term lands last and tips the finished ellipse in the screen
            plane, which is where that diagonal actually lives. */}
        <mesh rotation={[Math.PI / 2 - 0.38, 0, 0.44]} material={material}>
          {/* 1.12 clears the braces, whose nubs reach 0.70 + 0.14 + STROKE = 0.945. Thinner tube
              than the strokes it orbits (0.55×), because in the artwork the ring is a hairline
              drawn AROUND the mark — at equal weight the two stop being figure and ground. */}
          <torusGeometry args={[1.12, STROKE * 0.55, 10, 180]} />
        </mesh>
      </group>
    </group>
  );
}

export const HeroLogo3D: React.FC = () => {
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

  // Mount and run only while the hero is near the viewport. The margin means the mark is already
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
    <div ref={hostRef} className="hero-mark" aria-hidden="true">
      {/* Paused, NOT unmounted.
          This was `{active && <Canvas .../>}`, which destroyed the WebGL context every time the
          mark scrolled off screen and built a new one every time it came back. That is what filled
          the console with `THREE.WebGLRenderer: Context Lost` and what the browser was reporting as
          84–203ms rAF handlers: a remount is a fresh context, a shader recompile and a scene
          rebuild, all on the main thread, every single scroll past.

          Kept mounted with `frameloop="never"` there is no context churn at all and the cost while
          off screen is the same zero — 'never' draws nothing, it does not draw fewer frames. */}
      <Canvas
          // The one scene here that genuinely animates at rest, so it is switched off rather than
          // throttled when it has no audience.
          frameloop={motion && active ? 'always' : 'never'}
          dpr={[1, 1.5]}
          // At fov 45 the visible height at the origin is 2·dist·tan(22.5°); 3.9 gives 3.23 world
          // units. The mark is 2.24 across at the ring and 2 tall at the braces, and it TUMBLES —
          // so the figure that matters is the diagonal it sweeps through, not its resting width.
          // The margin is what keeps a corner of the ring from clipping against the canvas edge at
          // the extremes of the lean.
          camera={{ position: [0, 0, 3.9], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        >
          <Mark spin={motion} />
        </Canvas>
      )}
    </div>
  );
};
