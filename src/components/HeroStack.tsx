import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_DPR } from '../lib/renderBudget';

/**
 * The hero's artwork: NOVAIQ's mark landing on a lit platform.
 *
 * ## Two objects, and that is the whole scene
 *
 * There was a ring of eight modules around this, wired back to the platform with cables carrying
 * charges. All of it is gone on purpose. What is left is the platform, the processor let into its
 * top face, and the mark that lands on it — and the composition is stronger for it: the modules
 * were the busiest thing in the frame and the logo was competing with them for attention it should
 * never have had to compete for.
 *
 * ## The motion is a cause and its effect, not a loop
 *
 * An orbit is ambient — it just runs. This is one event: the mark falls in from above the frame
 * under gravity, hits the processor, bounces once and settles, and the platform takes the hit and
 * squashes under it. Both are analytic rather than integrated, which is what guarantees they end at
 * exactly their rest state however the frames happened to land. Clicking replays it, and so does
 * scrolling back to the section.
 *
 * ## The mark
 *
 * Braces as swept tubes and the ring as a torus. An extruded outline is a flat slab that collapses
 * to a line the moment it turns; a swept tube presents the same thickness from every angle. And a
 * torus spun about its OWN axis produces literally no visible change, because it is symmetric about
 * it — so the ring is carried around the mark's vertical axis with its artwork tilt held on a
 * SEPARATE group, since Euler angles do not add and one group carrying both composes into a
 * different tilt every frame.
 *
 * NO BACKTICKS anywhere inside shader strings, including in prose: they are template literals, and
 * one backtick closes the string mid-shader.
 */

/* ── Palette ──────────────────────────────────────────────────────────────────────────────── */

/**
 * Everything that emits is white now — the seams, the bar and the processor's die alike.
 *
 * A faint blue-white rather than #FFFFFF. A pure-white emitter on a near-black page has nowhere
 * left to go at its centre, so it flattens into a solid shape with no falloff; carrying a trace of
 * blue keeps the core reading as hotter than its edge, which is what makes a light look lit.
 */
const LIGHT_WHITE = '#EEF2FF';
const CHARCOAL = '#17171F';
const CHARCOAL_DEEP = '#0E0E14';
const SILVER = '#D6D6DE';

/* ── The mark ─────────────────────────────────────────────────────────────────────────────── */

/** Stroke radius, against the braces' own half-height of 1. Thinner and the mark reads as a wire
    diagram rather than as the logo. */
const STROKE = 0.105;
/** How far each brace sits from the centre line, set from the INNER edge: the arms reach x = 0.48,
    so 0.70 leaves 0.44 of clear air down the middle. */
const BRACE_X = 0.7;
/** The ring's artwork pose — its own tip and diagonal, held fixed while it is carried around Y. */
const RING_TILT_X = Math.PI / 2 - 0.38;
const RING_TILT_Z = 0.44;
const RING_ORBIT_RATE = 0.62;
const RING_RADIUS = 1.3;

/**
 * One curly brace, as a path from its top terminal to its bottom one.
 *
 * Written for the LEFT brace; the right one is this curve with x negated, so the two halves cannot
 * drift out of agreement when one is adjusted. Catmull-Rom because the shape is defined by where
 * the stroke GOES — beziers would put the control points off the curve, where every adjustment is
 * indirect.
 */
const BRACE_POINTS: [number, number][] = [
  // The top arm runs FLAT before it turns down. That is the detail that makes this read as a
  // typographic brace rather than a bent wire — a spline given only the corner and the tip rounds
  // the flat off entirely.
  [0.48, 1.0],
  [0.32, 1.0],
  [0.19, 0.94],
  [0.13, 0.8],
  // The stem, sampled twice down its length so the spline holds it straight instead of bowing it
  // between the corners at either end.
  [0.13, 0.5],
  [0.13, 0.26],
  // The nub: the brace's waist, and the only part that crosses to the far side of the stem.
  [0.01, 0.13],
  [-0.14, 0.0],
  [0.01, -0.13],
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
    // Centripetal rather than the default: uniform parameterisation overshoots at the tight corners
    // of the nub and puts a visible kink in the stroke.
    'centripetal',
    0.5,
  );
}

const Mark: React.FC<{ spin: boolean; material: THREE.Material }> = ({ spin, material }) => {
  const orbit = useRef<THREE.Group>(null);
  const spun = useRef(0);
  const leftBrace = useMemo(() => makeBraceCurve(false), []);
  const rightBrace = useMemo(() => makeBraceCurve(true), []);

  useFrame((_, delta) => {
    if (!spin || !orbit.current) return;
    // Our OWN accumulator, advanced only by frames that were actually drawn, and clamped. The canvas
    // stays mounted and parked at frameloop="never" off screen, so wall-clock time keeps running
    // while the render loop does not — reading the scene clock would turn a long scroll away into
    // several whole rotations landing in a single frame.
    spun.current += Math.min(delta, 0.05) * RING_ORBIT_RATE;
    orbit.current.rotation.y = spun.current;
  });

  const braces = [
    { curve: leftBrace, x: -BRACE_X },
    { curve: rightBrace, x: BRACE_X },
  ];

  return (
    <group>
      {braces.map(({ curve, x }, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh material={material} castShadow>
            {/* 96 along the path: the nub is a tight reversal and a coarser sweep visibly facets it
                into a corner, so this end stays generous. 8 around is plenty for a stroke this
                thin. */}
            <tubeGeometry args={[curve, 96, STROKE, 8, false]} />
          </mesh>
          {/* TubeGeometry builds an OPEN pipe, so without caps you see straight down the hollow
              inside of every stroke as the mark turns. */}
          {[0, 1].map((end) => {
            const p = curve.getPoint(end);
            return (
              <mesh key={end} position={[p.x, p.y, p.z]} material={material}>
                <sphereGeometry args={[STROKE, 10, 6]} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* TWO nested groups, not one. The outer is animated and carries the ring around the vertical;
          the inner holds the artwork's tilt and is never written to. */}
      <group ref={orbit}>
        <group rotation={[RING_TILT_X, 0, RING_TILT_Z]}>
          <mesh material={material} castShadow>
            {/* Thinner than the strokes it orbits (0.55×): in the artwork the ring is a hairline
                drawn AROUND the mark, and at equal weight the two stop being figure and ground. */}
            <torusGeometry args={[RING_RADIUS, STROKE * 0.55, 8, 128]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

/* ── Rounded geometry ─────────────────────────────────────────────────────────────────────── */

/**
 * A box with rounded corners and bevelled edges.
 *
 * drei's RoundedBox is the usual answer and drei is not a dependency here. This is the same idea
 * from parts three already has: a rounded rectangle as a Shape, extruded to depth, with a bevel on
 * the extrusion ends. The bevel is what rounds the edges running along the depth axis — without it
 * the front and back faces meet the sides at a hard 90° and the parts read as cardboard.
 *
 * Extruded along Z and then laid down, so the arguments read as width/height/depth in the scene's
 * own axes rather than in the extruder's.
 */
function roundedBox(w: number, h: number, d: number, r: number, bevel = 0.02): THREE.BufferGeometry {
  const iw = w - bevel * 2;
  const id = d - bevel * 2;
  const x = -iw / 2;
  const z = -id / 2;
  const rr = Math.max(0.001, Math.min(r, iw / 2 - 0.001, id / 2 - 0.001));

  const s = new THREE.Shape();
  s.moveTo(x + rr, z);
  s.lineTo(x + iw - rr, z);
  s.quadraticCurveTo(x + iw, z, x + iw, z + rr);
  s.lineTo(x + iw, z + id - rr);
  s.quadraticCurveTo(x + iw, z + id, x + iw - rr, z + id);
  s.lineTo(x + rr, z + id);
  s.quadraticCurveTo(x, z + id, x, z + id - rr);
  s.lineTo(x, z + rr);
  s.quadraticCurveTo(x, z, x + rr, z);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: h - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
  // Extrude builds in the XY plane and pushes along +Z; this stands it up so the extrusion axis is
  // the scene's Y and `h` means height.
  geo.rotateX(-Math.PI / 2);
  geo.center();
  return geo;
}

/* ── Materials ────────────────────────────────────────────────────────────────────────────── */

/**
 * One set of materials, built once and shared by every part that wears them.
 *
 * Physical rather than standard for the bodies: `clearcoat` is the entire difference between "a grey
 * box" and "a moulded object photographed in a studio". It is a second specular lobe over the base
 * one, which is exactly what a lacquered surface has.
 */
function useMaterials() {
  const mats = useMemo(() => {
    const glow = (color: string, intensity: number) =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: new THREE.Color(color),
        emissiveIntensity: intensity,
        roughness: 0.4,
        metalness: 0,
      });

    return {
      dark: new THREE.MeshPhysicalMaterial({
        color: CHARCOAL,
        roughness: 0.34,
        metalness: 0.12,
        clearcoat: 0.65,
        clearcoatRoughness: 0.22,
      }),
      darker: new THREE.MeshPhysicalMaterial({
        color: CHARCOAL_DEEP,
        roughness: 0.4,
        metalness: 0.1,
        clearcoat: 0.5,
        clearcoatRoughness: 0.3,
      }),
      // The mark. Metal, but not a mirror — at roughness 0.22 under a clearcoat it holds a soft
      // highlight along each tube instead of reflecting an environment it does not have.
      silver: new THREE.MeshPhysicalMaterial({
        color: SILVER,
        roughness: 0.22,
        metalness: 0.62,
        clearcoat: 0.85,
        clearcoatRoughness: 0.12,
      }),
      // Bright enough to read as a lit die, dim enough not to wash out the braces standing on it —
      // and this one sits DIRECTLY under the mark, so at seam brightness it lights the logo from
      // below and flattens all of its shading.
      die: glow(LIGHT_WHITE, 1.3),
      // The seams. Emissive well past 1 so they read as the light SOURCE in the composition rather
      // than as paint catching the key light.
      seam: glow(LIGHT_WHITE, 2.6),
    };
  }, []);

  // Materials React does not own, so they are released explicitly on unmount.
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}

type Materials = ReturnType<typeof useMaterials>;

/* ── The platform ─────────────────────────────────────────────────────────────────────────── */

const PLATFORM_W = 3.9;
const PLATFORM_D = 3.9;
const PLATFORM_R = 0.42;

/**
 * The stack, written as the layers it is actually made of.
 *
 * Every slab is stated as a height and every Y is DERIVED by adding them up, because the hand-typed
 * version of this was wrong in a way that stayed invisible until something had to stand on it: it
 * claimed a top face at 0.62 when the real one was at 0.93, which buried the processor inside the
 * slab and sank the mark's braces a third of a unit into it. Heights add; typed constants drift.
 */
const L = { base: 0.16, seamLow: 0.06, skirt: 0.22, seamTop: 0.06, body: 0.52 };
const Y_BASE = L.base / 2;
const Y_SEAM_LOW = L.base + L.seamLow / 2;
const Y_SKIRT = L.base + L.seamLow + L.skirt / 2;
const Y_SEAM_TOP = L.base + L.seamLow + L.skirt + L.seamTop / 2;
const Y_BODY = L.base + L.seamLow + L.skirt + L.seamTop + L.body / 2;
/** The top face — what everything standing on the platform measures from. */
const PLATFORM_TOP = L.base + L.seamLow + L.skirt + L.seamTop + L.body;
/** How proud of that face the processor stands. */
const CHIP_H = 0.07;

/**
 * How far every stacked part sinks into the one below it.
 *
 * Not a style value — a correctness one. Layers whose faces meet EXACTLY give the depth buffer two
 * surfaces at the same distance and no way to choose between them. Which one wins is then decided
 * by floating-point noise, and it changes as the camera moves: the seams flicker on and off and the
 * colours appear to come and go. Sinking each part a hair into its neighbour means no two faces are
 * ever coplanar and there is nothing left to arbitrate.
 */
const BITE = 0.015;

const Platform: React.FC<{ mats: Materials; clock: React.RefObject<number>; still: boolean }> = ({
  mats,
  clock,
  still,
}) => {
  const ref = useRef<THREE.Group>(null);

  const geo = useMemo(
    () => ({
      body: roundedBox(PLATFORM_W, L.body, PLATFORM_D, PLATFORM_R),
      // The two seams are built TALLER than the gaps they fill, so each one reaches up into the slab
      // above and down into the one below instead of stopping flush against either.
      seamTop: roundedBox(PLATFORM_W + 0.04, L.seamTop + BITE * 2, PLATFORM_D + 0.04, PLATFORM_R),
      skirt: roundedBox(PLATFORM_W - 0.18, L.skirt, PLATFORM_D - 0.18, PLATFORM_R * 0.9),
      seamLow: roundedBox(PLATFORM_W - 0.02, L.seamLow + BITE * 2, PLATFORM_D - 0.02, PLATFORM_R * 0.9),
      base: roundedBox(PLATFORM_W - 0.42, L.base, PLATFORM_D - 0.42, PLATFORM_R * 0.8),
      inset: roundedBox(PLATFORM_W - 0.5, 0.04, PLATFORM_D - 0.5, PLATFORM_R * 0.8),
      bar: roundedBox(0.16, 0.05, PLATFORM_D - 1.5, 0.08),
      chip: roundedBox(1.75, CHIP_H, 1.75, 0.14),
      die: roundedBox(1.05, 0.05, 1.05, 0.1),
      pin: roundedBox(0.09, 0.035, 0.3, 0.02),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  /** The processor's pins: four per side, laid out from the die's edge rather than by eye, so the
      four banks stay square to each other if the chip is ever resized. */
  const pins = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number }[] = [];
    const offsets = [-0.36, -0.12, 0.12, 0.36];
    const reach = 0.7;
    for (const o of offsets) {
      out.push({ pos: [o, 0, reach], rot: 0 });
      out.push({ pos: [o, 0, -reach], rot: 0 });
      out.push({ pos: [reach, 0, o], rot: Math.PI / 2 });
      out.push({ pos: [-reach, 0, o], rot: Math.PI / 2 });
    }
    return out;
  }, []);

  // Takes the hit rather than ignoring it: a platform that stays perfectly rigid while something
  // lands on it hard is the detail that gives away that nothing really landed.
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    if (still) {
      g.scale.set(1, 1, 1);
      return;
    }
    const tau = (clock.current ?? 0) - IMPACT_T;
    const squash = tau > 0 ? Math.exp(-7 * tau) * Math.sin(16 * tau) * 0.1 : 0;
    g.scale.set(1 + squash * 0.3, 1 - squash, 1 + squash * 0.3);
  });

  return (
    <group ref={ref}>
      {/* Layered, and the order matters: the lit seams are separate slabs sandwiched BETWEEN the
          dark ones rather than a glow painted on the sides. Light escaping from between two solids
          is what gives the stack its thickness — a single box with a bright stripe on it reads as a
          decal, whatever the stripe is doing.

          Only the body casts. The slabs beneath it sit inside its own shadow, and every caster is
          another object drawn into the shadow map on every frame. */}
      <mesh geometry={geo.base} position={[0, Y_BASE, 0]} material={mats.darker} />
      <mesh geometry={geo.seamLow} position={[0, Y_SEAM_LOW, 0]} material={mats.seam} />
      <mesh geometry={geo.skirt} position={[0, Y_SKIRT, 0]} material={mats.darker} />
      <mesh geometry={geo.seamTop} position={[0, Y_SEAM_TOP, 0]} material={mats.seam} />
      <mesh geometry={geo.body} position={[0, Y_BODY, 0]} material={mats.dark} castShadow receiveShadow />

      {/* The recessed panel on the top face, and the lit bar let into it. */}
      <mesh geometry={geo.inset} position={[0, PLATFORM_TOP - 0.01, 0]} material={mats.darker} receiveShadow />
      <mesh geometry={geo.bar} position={[PLATFORM_W / 2 - 0.62, PLATFORM_TOP + 0.01, 0]} material={mats.seam} />

      {/* The processor the mark comes down onto. It is the reason the top face is a face rather
          than a lid: the logo lands ON something specific, and a bare black square gave it nothing
          to land on. Pins first, so the die and body sit over them. */}
      <group position={[0, PLATFORM_TOP + CHIP_H / 2 - BITE, 0]}>
        {pins.map((p, i) => (
          <mesh key={i} geometry={geo.pin} position={p.pos} rotation={[0, p.rot, 0]} material={mats.silver} />
        ))}
        <mesh geometry={geo.chip} material={mats.dark} receiveShadow />
        <mesh geometry={geo.die} position={[0, 0.05, 0]} material={mats.die} />
      </group>
    </group>
  );
};

/* ── The choreography ─────────────────────────────────────────────────────────────────────── */

/** The mark is the subject, so it is sized against the platform: at 1.15 the braces stand 2.7 tall
    and the ring spans 3.0 over a 3.9-wide slab. */
const MARK_SCALE = 1.15;
/** How far above its resting height the mark starts. Above the frame, so it enters rather than
    appears. */
const DROP_HEIGHT = 5.2;
/** Units per second squared. Tuned by the only figure that matters: the fall has to read as a drop
    rather than a descent, which puts it just under a second. */
const GRAVITY = 13;
/** When the mark reaches the platform: solved, not guessed, so the squash cannot go out of step
    with the thing that is supposed to have caused it. */
const IMPACT_T = Math.sqrt((2 * DROP_HEIGHT) / GRAVITY);

/**
 * Where the mark comes to rest: standing ON the processor, its brace tips touching it.
 *
 * This was held half a unit higher, off the ring's BOUNDING SPHERE (1.358), on the argument that the
 * ring would otherwise sweep through the slab. That figure is orientation-independent and this
 * ring's orientation is not free: its tilt is fixed on a group that is never written to, and the
 * only animated axis is Y, which a body of revolution about Y cannot change the height of. The
 * relevant number is its vertical half-extent at that fixed tilt —
 *
 *   R·√( sin²(Zt) + (cos(Xt)·cos(Zt))² ) + tube  =  1.3·0.542 + 0.058  =  0.763
 *
 * — well inside the braces' own 1.175, so the braces are the lowest part of the mark and resting
 * them on the chip puts the whole logo clear of it.
 */
const MARK_REST_Y = PLATFORM_TOP + CHIP_H + 1.175 * MARK_SCALE;

const MarkRig: React.FC<{
  clock: React.RefObject<number>;
  still: boolean;
  mats: Materials;
}> = ({ clock, still, mats }) => {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    if (still) {
      g.position.y = MARK_REST_Y;
      return;
    }
    const t = clock.current ?? 0;
    if (t < IMPACT_T) {
      g.position.y = MARK_REST_Y + DROP_HEIGHT - 0.5 * GRAVITY * t * t;
    } else {
      // Bounce: the absolute value of a decaying sine, which is what a ball actually does — it
      // leaves the surface, comes back, and each arc is shorter than the last.
      const tau = t - IMPACT_T;
      g.position.y = MARK_REST_Y + Math.abs(Math.sin(tau * 7.5)) * Math.exp(-tau * 4.2) * 0.4;
    }
  });

  return (
    // Turned a quarter round to square up with the camera. The mark is drawn facing +Z and the
    // camera sits at 45° of azimuth — left alone, both braces foreshorten into each other. This is
    // the one rotation in the scene that exists purely so the artwork reads as itself.
    <group ref={ref} position={[0, MARK_REST_Y, 0]} rotation={[0, Math.PI / 4, 0]} scale={MARK_SCALE}>
      <Mark spin={!still} material={mats.silver} />
    </group>
  );
};

/**
 * The shadows without the floor.
 *
 * There has to be a surface here or the shadows have nothing to fall on and the objects float in a
 * void. There must NOT be a visible one: a lit ground plane is a grey rectangle sitting in the
 * middle of a dark page, and no amount of fading its edges stops it reading as a slab of a slightly
 * different black. `ShadowMaterial` is transparent everywhere except where something shadows it, so
 * the plane never draws — only the shade the composition casts onto it.
 */
const ShadowCatcher: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]} receiveShadow>
    <planeGeometry args={[16, 16]} />
    {/* Well under 1: at full opacity the shade goes to solid black and the platform looks stuck to
        a cut-out hole rather than standing over a surface. */}
    <shadowMaterial opacity={0.42} color="#000000" />
  </mesh>
);

const Scene: React.FC<{ still: boolean; replayRef: React.MutableRefObject<(() => void) | null> }> = ({
  still,
  replayRef,
}) => {
  const mats = useMaterials();
  const clock = useRef(0);
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  useEffect(() => {
    replayRef.current = () => {
      clock.current = 0;
    };
    return () => {
      replayRef.current = null;
    };
  }, [replayRef]);

  /**
   * The camera frames the composition, at whatever shape the canvas happens to be.
   *
   * The distance is solved rather than tuned. The canvas is square on a desktop and some other
   * shape on a phone, and a fixed distance can only be right for one of them — every other shape
   * gets dead bands on two sides. So: take the composition's own half-extents in world units, work
   * out the visible height that contains both at this aspect, and put the camera at the distance
   * that produces it. Nothing here is a magic number except the margin, which is the 10% of
   * breathing room around the edges.
   *
   * The ANGLE never changes. Raising it was tried — the platform is wide and shallow, so a taller
   * angle fills a square frame better — and the mark foreshortened into an unreadable smudge,
   * because looking further down onto an object whose shape lives in its height is exactly what
   * destroys it. The logo is the point of the scene; the frame bends around it.
   */
  useEffect(() => {
    if (!width || !height) return;
    // The platform's corners reach 1.95·√2 across the diagonal the camera looks down, and the mark
    // stands from the shadow plane up to about 3.8.
    const halfW = 3.05;
    const halfH = 2.2;
    const aspect = width / height;
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 26;
    // Whichever of the two runs out of room first sets the frame.
    const visibleH = (Math.max(halfH, halfW / aspect) * 2) / 0.9;
    const dist = visibleH / (2 * Math.tan((fov * Math.PI) / 360));
    // The viewing direction, normalised — 45° round and about 29° up.
    camera.position.set(dist * 0.6197, dist * 0.4819, dist * 0.6197);
    // Aimed at the composition's own middle rather than the origin. The content runs from the
    // shadow plane at -0.35 up to the mark's crown at about 3.8, so its centre is 1.7 — aiming at
    // the origin instead leaves a band of empty frame under the platform and crops nothing off the
    // top only by luck.
    camera.lookAt(0, 1.7, 0);
    camera.updateProjectionMatrix();
  }, [camera, width, height]);

  // One clock, advanced only by drawn frames and clamped, so the drop and the squash it causes stay
  // on the same timeline across a scroll away and back.
  useFrame((_, delta) => {
    clock.current += Math.min(delta, 0.05);
  });

  return (
    <>
      {/* Ambient for fill, one directional for shading — the minimum any PBR material needs, and
          without both every object here renders solid black. */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[-7, 11, 6]}
        intensity={2.1}
        castShadow
        // Only the key light casts. A second shadow-casting light means a second full render of the
        // scene from its point of view, every frame, for a difference nobody looks at.
        shadow-mapSize={[1024, 1024]}
        // Tight to the composition. The shadow camera's box is spread over the map's fixed 1024
        // pixels whatever size it is, so every unit of slack costs resolution everywhere.
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={1}
        shadow-camera-far={26}
        shadow-bias={-0.0012}
      />
      <directionalLight position={[6, 4, -6]} intensity={0.5} />
      {/* The seams' own glow bouncing back off the platform, so they look like they are lighting the
          composition rather than sitting in it — white now, along with what it is bouncing from.
          Low, and deliberately so: at full strength it stops being a bounce and becomes a flare
          burning a hotspot into the middle of the top face. */}
      <pointLight position={[0, 2.4, 0]} intensity={3.2} distance={9} color={LIGHT_WHITE} />

      <ShadowCatcher />
      <Platform mats={mats} clock={clock} still={still} />
      <MarkRig clock={clock} still={still} mats={mats} />
    </>
  );
};

/* ── Mount ────────────────────────────────────────────────────────────────────────────────── */

export const HeroStack: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const replayRef = useRef<(() => void) | null>(null);
  const [active, setActive] = useState(false);
  const [motion, setMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setMotion(!mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Replays the drop when the section comes back into view rather than only on first mount: the
  // whole point of this scene is the event, and arriving at the aftermath of one is arriving at
  // nothing. The margin means it is already falling by the time its first pixel shows.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting);
        if (entry.isIntersecting) replayRef.current?.();
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 cursor-pointer"
      onPointerDown={() => replayRef.current?.()}
      aria-hidden="true"
    >
      {/* Paused, NOT unmounted. `{active && <Canvas/>}` destroys the GL context on every scroll past
          and rebuilds it on the way back — a fresh context, a shader recompile and a scene rebuild
          on the main thread each time. Kept mounted, frameloop="never" costs the same zero while off
          screen and churns nothing.

          `shadows` has to be set HERE: it is what enables the renderer's shadow map, and every
          castShadow and receiveShadow flag in the scene below is silently ignored without it. */}
      <Canvas
        shadows
        frameloop={motion && active ? 'always' : 'never'}
        dpr={[1, MAX_DPR]}
        // A long lens from 45° round and ~29° up. The narrow fov is what makes this isometric rather
        // than merely angled: at 26° the platform's opposite edges stay near enough to parallel that
        // the composition reads as a technical drawing. A wide fov from the same spot rakes them
        // into perspective. The position here is a placeholder — Scene solves it from the canvas.
        camera={{ position: [16, 12.5, 16], fov: 26 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <Scene still={!motion} replayRef={replayRef} />
      </Canvas>
    </div>
  );
};
