import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_DPR } from '../lib/renderBudget';

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
 * ## The braces hold still. Only the ring moves.
 *
 * The mark is drawn once, at its artwork pose, and never touched again — and the ring tumbles
 * around it through every orientation there is. One moving element against something perfectly
 * still reads harder than everything drifting together, because the motion finally has a fixed
 * thing to be measured against. It also means the brand is legible in every single frame, which a
 * turning mark is not: rotate the braces past 90° and they are two vertical lines.
 *
 * ## Why the ring cannot simply spin
 *
 * The obvious way to animate a ring is to spin it, and spinning a torus about its own axis
 * produces LITERALLY NO CHANGE — a torus is rotationally symmetric about that axis, so every frame
 * is identical to the last and the GPU draws a still image at 60fps. It is the same trap the globe
 * fell into, where a sphere lit from a fixed direction gave identical frames however fast it
 * turned.
 *
 * A ring has exactly ONE visible degree of freedom: where its normal points. So the ring is carried
 * around the mark's VERTICAL axis while holding the artwork's tilt fixed — which is a different
 * axis from its own, so the normal sweeps a 33° cone and the ellipse on screen opens from a bare
 * line out to about half-width and back, its long axis rocking with it.
 *
 * Holding the tilt is the whole difference between this and a tumble. Rolling the ring freely
 * through every orientation also moves, and it stops being the LOGO's ring while it does: the
 * diagonal is a fixed part of the artwork, and a free tumble is only in the artwork's pose for an
 * instant per cycle. Carried around the vertical it is in that pose at every instant, and what
 * changes is where along the orbit you are watching it from.
 *
 * The clearance is stated as a bounding-sphere test in RING_RADIUS rather than a case analysis of
 * which angles the ring meets the braces at. That is deliberately stronger than this motion needs
 * — it holds for ANY orientation — so the next change to how the ring moves cannot quietly put it
 * through the mark.
 *
 * ## Its own clock, not the scene's
 *
 * The ring's angles are integrated from `delta` into a ref rather than read off
 * `state.clock.elapsedTime`, and that is not a style preference. This canvas is kept MOUNTED when
 * the hero scrolls away and parked at frameloop="never" — the render loop stops, wall-clock time
 * does not, and what the scene clock does across that gap is R3F's business. Read it and a long
 * scroll away can return as several whole rotations in a single frame. An accumulator that only
 * advances on drawn frames cannot, and the clamp bounds the worst single step regardless.
 *
 * ## The mark does not mirror in RTL
 *
 * NovaiqLogo.tsx sets `dir="ltr"` on itself and says why: a brand lockup keeps its physical order
 * in Arabic. The same applies to the ring's diagonal, which runs low-left to high-right in the
 * artwork and stays there — everything else in this hero mirrors with the writing direction, this
 * one thing deliberately does not.
 */

/* Charcoal to white. This was gold, and dropping the hue leaves the panel's water level as the one
   place on the whole site that carries a colour — which is a cleaner statement than the two-object
   version it replaces, not a weaker one: an accent that appears twice is starting to be a theme.

   The ramp is still FIVE stops rather than a fade from dark grey to white, and that is what keeps
   it reading as metal. Two stops give a flat plastic gradient; the extra steps put a shoulder
   where the light rolls off and a knee where it catches, which is what an eye reads as a hard
   reflective surface.

   The darkest stop is #2A2A2E and not something nearer black on purpose. The hero's ground runs
   about #161619 behind the mark, so a true black shadow would let the turned-away side dissolve
   straight into the page and the mark would lose half its form. This sits clearly above it. */
const C0_CHARCOAL = '#2A2A2E';
const C1_SLATE = '#52525B';
const C2_STEEL = '#8E8E97';
const C3_SILVER = '#DCDCE1';
const C4_WHITE = '#FFFFFF';
/* Neutral white now, where a warm one was correct against gold — on a warm body a cool rim reads
   as separate chrome stuck onto it, and on this neutral one the warm version would be the thing
   that looks bolted on. The rim moves with the body it belongs to. */
const RIM_COLOR = '#FFFFFF';

/* Same light as the globe used, and for the same reason: up and toward the page's outer edge, so
   the lit shoulder faces away from the copy instead of into it. */
const LIGHT = new THREE.Vector3(-0.42, 0.8, 0.43).normalize();

/** Stroke radius. The artwork's braces are about a tenth of their own height across — 0.105 here
    against a half-height of 1. At 0.062 they came out as wire and the mark read as a diagram. */
const STROKE = 0.105;
/** How far each brace sits from the centre line. Set from the INNER edge rather than by eye: the
    arms reach x = 0.48 in the curve below, so 0.70 leaves 0.44 of clear air down the middle. */
const BRACE_X = 0.7;

/* ── Motion ─────────────────────────────────────────────────────────────────────────────────
   The braces do not move at all. The ring does everything. */

/** The ring's starting pose — the artwork's own tip and diagonal. The tumble runs on from here, so
    the first frame anyone sees is the logo exactly as it is drawn. */
const RING_TILT_X = Math.PI / 2 - 0.38;
const RING_TILT_Z = 0.44;

/** The orbit: one revolution about the mark's VERTICAL axis every 10.1s.

    The tilt above is not animated any more — it is carried, unchanged, around Y. That distinction
    is the whole point. Tumbling the ring on two axes did take it through every orientation, and
    the cost was that it stopped being the logo's ring: the artwork's diagonal is a fixed part of
    the mark, and a ring that rolls through every angle is only in the artwork's pose for an
    instant per cycle. Carried around Y it is in that pose ALWAYS — the tilt relative to its own
    orbital plane never changes — and what moves is where along the orbit you are seeing it from.

    It is still fully visible motion, which is the thing that is easy to get wrong here: a torus
    spun about its OWN axis produces literally no change at all, because it is rotationally
    symmetric about it. This axis is a different one. The ring's normal sweeps a 33° cone about the
    vertical, so the ellipse on screen opens from a bare line out to about half-width and back, and
    its long axis rocks with it. */
const RING_ORBIT_RATE = 0.62;

/** Radius, and this is now a HARD constraint rather than a matter of taste.
    Every point of the ring's tube lies between R − tube and R + tube from the centre, whatever
    orientation it is in. So if R − tube clears the sphere that contains the braces, the ring
    cannot touch them at ANY angle — which is the only kind of guarantee worth having once it
    tumbles freely.
    The braces' furthest point is the top arm at (−0.38, 1.00), 1.070 out, plus STROKE = 1.175.
    1.30 − 0.058 = 1.242 clears that by 0.067.
    This was 1.12 while the ring only precessed inside a narrow cone, where the two angles at which
    it crossed the braces' plane were pinned near the nub and it got away with it. Anything freer
    puts the ring near the braces' own plane, and at 1.12 it would saw through both arms. */
const RING_RADIUS = 1.3;

/** The ring eases up from rest instead of starting at speed: 1 − e^(−0.7t) is at 94% by 4s.
    Multiplying the ANGLE by it (rather than adding an eased offset) keeps this absolute-time —
    t·rate·wake starts at zero position AND zero speed, then converges on a constant rate with no
    lasting phase error. It is the cheapest line here and the one that does most to make the motion
    read as authored: a loop already running when you arrive has no beginning, and a thing with no
    beginning is a screensaver. It plays again on every remount, which is every time the hero
    scrolls back into view. */
const WAKE_RATE = 0.7;

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
      uC0: { value: new THREE.Color(C0_CHARCOAL) },
      uC1: { value: new THREE.Color(C1_SLATE) },
      uC2: { value: new THREE.Color(C2_STEEL) },
      uC3: { value: new THREE.Color(C3_SILVER) },
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
  const orbit = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const material = useMemo(makeMarkMaterial, []);

  const leftBrace = useMemo(() => makeBraceCurve(false), []);
  const rightBrace = useMemo(() => makeBraceCurve(true), []);

  // A GPU resource React does not own, so it is released explicitly when the hero unmounts. R3F
  // disposes what it created from JSX; this was built here.
  useEffect(() => () => material.dispose(), [material]);

  // The ONLY thing that moves. The braces below carry no ref and are never touched — they sit at
  // the artwork's pose from the first frame to the last, and the shared lean they used to drift on
  // is gone with them. That stillness is not laziness: one element in motion against a mark that
  // is perfectly still reads far harder than everything drifting at once, because the ring now has
  // something fixed to be measured against.
  useFrame((_, delta) => {
    if (!spin || !orbit.current) return;

    // Our OWN clock, advanced only by frames that were actually drawn, and clamped.
    //
    // `state.clock.elapsedTime` is the obvious thing to use here and it is not safe in this
    // component. The canvas stays MOUNTED while the hero is off screen and is parked at
    // frameloop="never" instead — so the render loop stops while wall-clock time keeps running,
    // and what the clock does across that gap is R3F's business, not ours. If it carries the gap
    // through, a 30s scroll away comes back as 17 radians of instant rotation: nearly three whole
    // turns in one frame. This accumulator cannot do that whatever the clock decides, and the
    // clamp caps the worst single step at one frame's worth.
    clock.current += Math.min(delta, 0.05);
    const t = clock.current;
    const wake = 1 - Math.exp(-t * WAKE_RATE);

    // ONE axis, and it is the axis the ring is not symmetric about. The tilt itself lives on the
    // child group below and is never written to — so the ring holds the artwork's exact diagonal
    // at every instant, and this only carries it round.
    orbit.current.rotation.y = t * RING_ORBIT_RATE * wake;
  });

  // Both braces and both of their end caps share ONE material instance, so retuning the mark's
  // colour is a single edit and the parts cannot fall out of step with each other.
  const braces: { curve: THREE.CatmullRomCurve3; x: number }[] = [
    { curve: leftBrace, x: -BRACE_X },
    { curve: rightBrace, x: BRACE_X },
  ];

  return (
    <group>
      {/* The braces. No ref, no group of their own to be animated by — static geometry, drawn once
          at the artwork's pose and left there. */}
      <group>
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
      </group>

      {/* The ring, a SIBLING of the braces rather than a child of them. That one move is what the
          whole thing rests on: nested inside the braces it could only ever inherit their transform,
          and here the braces have none to give.

          TWO nested groups, not one, and this is the part that is easy to get wrong. The outer one
          is the only thing animated — it carries the ring around the vertical. The inner one holds
          the artwork's own tilt and is never written to.

          Folding them into a single animated group is the obvious simplification and it does not
          work: Euler angles do not add. Writing rotation.y onto a group that already carries an X
          and a Z term composes into an orientation that is not "the logo's ring, turned" — it is a
          different tilt every frame, and the ring wanders off the diagonal that makes it the
          logo's at all. Kept apart, the tilt is applied first and the spin second, every time. */}
      <group ref={orbit}>
        {/* Rotations apply in XYZ order, so the Z term lands last and tips the finished ellipse in
            the screen plane, which is where the artwork's diagonal actually lives. */}
        <group rotation={[RING_TILT_X, 0, RING_TILT_Z]}>
          <mesh material={material}>
            {/* Thinner tube than the strokes it orbits (0.55×), because in the artwork the ring is
                a hairline drawn AROUND the mark — at equal weight the two stop being figure and
                ground. 180 segments around the path, which is what keeps it a smooth curve at the
                point in the orbit where it comes near edge-on and the whole ring collapses into a
                few pixels of height. See RING_RADIUS for why it grew when the motion changed. */}
            <torusGeometry args={[RING_RADIUS, STROKE * 0.55, 10, 180]} />
          </mesh>
        </group>
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
    // The site's only WebGL scene, and therefore its only context.
    //
    // It briefly shared a single canvas with the credential card through drei's `<View>`, which is
    // the right answer when several scenes have to coexist — three contexts on this page had the
    // browser dropping them mid-scroll. The card left the site entirely (it is a 3D-printed object
    // now, see tools/export-card-model.mjs), so there is nothing left to share with, and one scene
    // in its own canvas is simpler than one scene in a shared one.
    //
    // If a second scene is ever added, `@react-three/drei`'s View is what to reach for again —
    // not a second `<Canvas>`.
    <div ref={hostRef} className="hero-mark" aria-hidden="true">
      {/* Paused, NOT unmounted. `{active && <Canvas/>}` destroyed the context on every scroll past
          and rebuilt it on the way back, which is a fresh context, a shader recompile and a scene
          rebuild on the main thread each time. Kept mounted, `frameloop="never"` costs the same
          zero while off screen and churns nothing. */}
      <Canvas
        frameloop={motion && active ? 'always' : 'never'}
        dpr={[1, MAX_DPR]}
        // At fov 45 the visible height at the origin is 2·dist·tan(22.5°); 3.9 gives 3.23 world
        // units. Only one figure matters now that the braces hold still and the ring tumbles: the
        // ring's bounding sphere, 1.30 + 0.058 = 1.358, which is orientation-independent — so
        // 2.72 across whatever it is doing, inside 3.23 with 8% clear on each side. The braces sit
        // entirely within that sphere, so nothing else can reach the canvas edge.
        camera={{ position: [0, 0, 3.9], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <Mark spin={motion && active} />
      </Canvas>
    </div>
  );
};
