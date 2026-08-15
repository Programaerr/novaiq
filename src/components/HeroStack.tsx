import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_DPR } from '../lib/renderBudget';

/**
 * The hero's artwork: NOVAIQ's mark over a lit platform, wired to the modules around it.
 *
 * ## The composition
 *
 * An isometric studio shot — a long lens from 45° round and about 30° up, which is what keeps the
 * platform's edges nearly parallel instead of raking away to a vanishing point. The platform is
 * built in layers rather than as one box (base plate, lit seam, body, inset top panel), because
 * that is what the reference's depth actually comes from: light escaping from BETWEEN slabs, not
 * a glow drawn onto the side of a single one.
 *
 * The mark stands over the middle of it. The modules around it are wired back to the platform with
 * white cables that meet it at lit connectors.
 *
 * ## The motion is a cause and its effects, not a loop
 *
 * An orbit is ambient — it just runs. This is one event with consequences: the mark falls in from
 * above the frame under gravity, hits the platform, and the impact travels outward as a wave. Each
 * module starts moving only when the wave reaches IT (delay is distance over wave speed), so the
 * near ones kick first and the far ones follow. Every response is one damped oscillation in closed
 * form — a solved spring cannot drift, cannot blow up on a long frame, and ends exactly where it
 * started. The cables are recomputed from live positions each frame, so they stay attached through
 * all of it. Clicking replays the whole thing, and so does scrolling back to it.
 *
 * ## The mark
 *
 * Braces as swept tubes and the ring as a torus, carried over from HeroLogo3D, which had already
 * worked out why: an extruded outline is a flat slab that collapses to a line the moment it turns,
 * a swept tube presents the same thickness from every angle, and a torus spun about its OWN axis
 * produces literally no visible change because it is symmetric about it. So the ring is carried
 * around the mark's vertical axis with its artwork tilt held on a SEPARATE group — Euler angles do
 * not add, and one group carrying both composes into a different tilt every frame.
 *
 * Its metal is a physical material here rather than the hand-written ramp that version used. The
 * mark has to sit in the same studio light as everything around it; a surface carrying its own
 * private light direction reads as a sticker on a photograph.
 */

/* ── Palette ──────────────────────────────────────────────────────────────────────────────── */

const PURPLE = '#7C3AED';
const PURPLE_LIT = '#A78BFA';
const CHARCOAL = '#17171F';
const CHARCOAL_DEEP = '#0E0E14';
const OFF_WHITE = '#F1F1F5';
const SILVER = '#D6D6DE';
const BRASS = '#C9A227';

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
/** Every point of the ring lies between R − tube and R + tube from the centre in ANY orientation.
    The braces' furthest point is 1.070 out plus STROKE = 1.175; 1.30 − 0.058 = 1.242 clears it.
    Stated as a bounding-sphere test rather than a case analysis of angles, so a later change to how
    the ring moves cannot quietly put it through the mark. */
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
    // Our OWN accumulator, advanced only by frames that were actually drawn, and clamped. The
    // canvas stays mounted and parked at frameloop="never" off screen, so wall-clock time keeps
    // running while the render loop does not — reading the scene clock would turn a long scroll
    // away into several whole rotations landing in a single frame.
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
            {/* 128 along the path: the nub is a tight reversal and a coarser sweep visibly facets
                it into a corner. 10 around is plenty for a stroke this thin. */}
            <tubeGeometry args={[curve, 128, STROKE, 10, false]} />
          </mesh>
          {/* TubeGeometry builds an OPEN pipe, so without caps you see straight down the hollow
              inside of every stroke as the mark turns. */}
          {[0, 1].map((end) => {
            const p = curve.getPoint(end);
            return (
              <mesh key={end} position={[p.x, p.y, p.z]} material={material} castShadow>
                <sphereGeometry args={[STROKE, 12, 8]} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* TWO nested groups, not one. The outer is animated and carries the ring around the
          vertical; the inner holds the artwork's tilt and is never written to. */}
      <group ref={orbit}>
        <group rotation={[RING_TILT_X, 0, RING_TILT_Z]}>
          <mesh material={material} castShadow>
            {/* Thinner than the strokes it orbits (0.55×): in the artwork the ring is a hairline
                drawn AROUND the mark, and at equal weight the two stop being figure and ground. */}
            <torusGeometry args={[RING_RADIUS, STROKE * 0.55, 10, 180]} />
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
 * the front and back faces meet the sides at a hard 90° and the parts read as cardboard, which is
 * the single biggest giveaway in a composition made entirely of boxes.
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
 * One set of materials for the whole scene, built once and shared by every part that wears them.
 *
 * Physical rather than standard for the bodies: `clearcoat` is the entire difference between "a
 * grey box" and "a moulded object photographed in a studio". It is a second specular lobe over the
 * base one, which is exactly what a lacquered surface has, and it is the look the reference is
 * made of.
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
      white: new THREE.MeshPhysicalMaterial({
        color: OFF_WHITE,
        roughness: 0.28,
        metalness: 0.02,
        clearcoat: 0.7,
        clearcoatRoughness: 0.18,
      }),
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
      // The mark. Metal, but not a mirror — at roughness 0.22 with a clearcoat over it, it holds a
      // soft highlight along each tube instead of reflecting an environment it does not have.
      silver: new THREE.MeshPhysicalMaterial({
        color: SILVER,
        roughness: 0.22,
        metalness: 0.62,
        clearcoat: 0.85,
        clearcoatRoughness: 0.12,
      }),
      cable: new THREE.MeshPhysicalMaterial({
        color: OFF_WHITE,
        roughness: 0.35,
        metalness: 0.02,
        clearcoat: 0.5,
      }),
      brass: new THREE.MeshStandardMaterial({ color: BRASS, roughness: 0.3, metalness: 0.85 }),
      purple: new THREE.MeshStandardMaterial({
        color: PURPLE,
        roughness: 0.35,
        metalness: 0.15,
        emissive: new THREE.Color(PURPLE),
        emissiveIntensity: 0.35,
      }),
      // The seams and connectors. Emissive well past 1 so they read as the light SOURCE in the
      // composition rather than as purple paint catching the key light.
      die: glow(PURPLE, 1.1),
      seam: glow(PURPLE_LIT, 2.6),
      connector: glow(PURPLE_LIT, 3.2),
      // Hotter and paler than the connectors it runs between. A charge the same colour as the thing
      // it leaves is invisible the moment it sets off.
      charge: glow('#E6E0FF', 4.2),
    };
  }, []);

  // Materials React does not own, so they are released explicitly on unmount.
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}

type Materials = ReturnType<typeof useMaterials>;

/**
 * The halo every light in this scene is wearing.
 *
 * An emissive sphere is not a light — it is a ball painted a bright colour, and it reads as exactly
 * that: a hard-edged white bead sliding along a cable. What makes a real one read is what happens
 * AROUND it: the falloff into the dark, which is glare in the camera rather than anything on the
 * object.
 *
 * The honest way to get it is a bloom pass, and that means an EffectComposer, a second render
 * target and a multi-pass blur every frame — the most expensive thing that could be added to a
 * scene that is meant to run on a phone. An additive sprite carrying a radial falloff is the same
 * effect drawn directly: one textured quad, no extra passes, and because a sprite always faces the
 * camera it costs nothing per frame to keep it turned the right way.
 *
 * The curve matters. A linear ramp gives a flat disc with a visible rim; the eased stops below put
 * a hot core in the middle and a long tail into nothing, which is what glare actually looks like.
 */
function useGlowTexture(): THREE.Texture | null {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.12, 'rgba(245,240,255,0.92)');
    g.addColorStop(0.3, 'rgba(190,170,255,0.42)');
    g.addColorStop(0.6, 'rgba(140,110,255,0.12)');
    g.addColorStop(1, 'rgba(120,90,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

/* ── The platform ─────────────────────────────────────────────────────────────────────────── */

const PLATFORM_W = 3.9;
const PLATFORM_D = 3.9;
const PLATFORM_R = 0.42;

/**
 * The stack, written as the layers it is actually made of.
 *
 * Every slab is stated as a height, and every Y below is DERIVED by adding them up, because the
 * hand-typed version of this was wrong in a way that was invisible until something had to stand on
 * it: PLATFORM_TOP said 0.62 while the body's top face was really at 0.93, so the processor was
 * buried inside the slab and the mark's braces sank a third of a unit into it. Heights add; typed
 * constants drift.
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

const Platform: React.FC<{ mats: Materials; clock: React.RefObject<number>; still: boolean }> = ({
  mats,
  clock,
  still,
}) => {
  const ref = useRef<THREE.Group>(null);

  const geo = useMemo(
    () => ({
      body: roundedBox(PLATFORM_W, L.body, PLATFORM_D, PLATFORM_R),
      seamTop: roundedBox(PLATFORM_W + 0.04, L.seamTop, PLATFORM_D + 0.04, PLATFORM_R),
      skirt: roundedBox(PLATFORM_W - 0.18, L.skirt, PLATFORM_D - 0.18, PLATFORM_R * 0.9),
      seamLow: roundedBox(PLATFORM_W - 0.02, L.seamLow, PLATFORM_D - 0.02, PLATFORM_R * 0.9),
      base: roundedBox(PLATFORM_W - 0.42, L.base, PLATFORM_D - 0.42, PLATFORM_R * 0.8),
      inset: roundedBox(PLATFORM_W - 0.5, 0.04, PLATFORM_D - 0.5, PLATFORM_R * 0.8),
      bar: roundedBox(0.16, 0.05, PLATFORM_D - 1.5, 0.08),
      chip: roundedBox(1.75, CHIP_H, 1.75, 0.14),
      die: roundedBox(1.05, 0.05, 1.05, 0.1),
      pin: roundedBox(0.09, 0.035, 0.3, 0.02),
    }),
    [],
  );

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
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

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
          decal, whatever the stripe is doing. */}
      <mesh geometry={geo.base} position={[0, Y_BASE, 0]} material={mats.darker} castShadow receiveShadow />
      <mesh geometry={geo.seamLow} position={[0, Y_SEAM_LOW, 0]} material={mats.seam} />
      <mesh geometry={geo.skirt} position={[0, Y_SKIRT, 0]} material={mats.darker} castShadow />
      <mesh geometry={geo.seamTop} position={[0, Y_SEAM_TOP, 0]} material={mats.seam} />
      <mesh geometry={geo.body} position={[0, Y_BODY, 0]} material={mats.dark} castShadow receiveShadow />
      {/* The recessed panel on the top face, and the lit bar let into it. */}
      <mesh geometry={geo.inset} position={[0, PLATFORM_TOP - 0.01, 0]} material={mats.darker} receiveShadow />
      <mesh geometry={geo.bar} position={[PLATFORM_W / 2 - 0.62, PLATFORM_TOP + 0.01, 0]} material={mats.seam} />

      {/* The processor the mark comes down onto. It is the reason the platform's top face is a
          face rather than a lid: the logo now lands ON something specific, and a bare black square
          gave it nothing to land on. Pins first, so the die and body sit over them. */}
      <group position={[0, PLATFORM_TOP + CHIP_H / 2, 0]}>
        {pins.map((p, i) => (
          <mesh
            key={i}
            geometry={geo.pin}
            position={p.pos}
            rotation={[0, p.rot, 0]}
            material={mats.silver}
          />
        ))}
        <mesh geometry={geo.chip} material={mats.dark} castShadow receiveShadow />
        {/* Bright enough to read as a lit die, dim enough not to wash out the braces standing on
            it — this sits directly under the mark, and at full seam brightness it lights the logo
            from below and flattens all of its shading. */}
        <mesh geometry={geo.die} position={[0, 0.05, 0]} material={mats.die} />
      </group>
    </group>
  );
};

/* ── The modules ──────────────────────────────────────────────────────────────────────────── */

type ModuleKind = 'whiteCube' | 'darkCube' | 'wallet' | 'stack';

interface ModuleSpec {
  kind: ModuleKind;
  /** Where it rests, in the platform's own space. */
  pos: [number, number, number];
  /** Turned to face the platform, mostly — a grid of identically-angled boxes reads as a diagram. */
  rot?: number;
  scale?: number;
  /** Idle bob phase, so they do not breathe in unison once everything has settled. */
  phase: number;
}

/** Hand-placed rather than generated. The reference's arrangement is deliberate — bigger and lower
    at the front, smaller and higher toward the back — and a random scatter does not land on it. */
const MODULES: ModuleSpec[] = [
  { kind: 'whiteCube', pos: [-4.15, 0.55, -1.5], rot: 0.5, phase: 0.0 },
  { kind: 'darkCube', pos: [-4.5, 0.15, 0.9], rot: -0.3, phase: 1.1, scale: 0.95 },
  { kind: 'wallet', pos: [-2.9, -0.15, 3.0], rot: 0.75, phase: 2.3 },
  { kind: 'wallet', pos: [2.1, 0.5, -3.2], rot: -0.6, phase: 0.7 },
  { kind: 'whiteCube', pos: [4.35, 0.4, -1.35], rot: -0.45, phase: 3.0, scale: 0.9 },
  { kind: 'whiteCube', pos: [4.0, -0.05, 1.6], rot: -0.2, phase: 1.8, scale: 1.05 },
  { kind: 'stack', pos: [1.15, -0.35, 3.35], rot: 0.25, phase: 4.2 },
  { kind: 'darkCube', pos: [-1.1, 0.85, -3.6], rot: 0.35, phase: 5.0, scale: 0.85 },
];

/**
 * The parts every module is built from, made ONCE and shared by all eight.
 *
 * This used to live inside Module, which meant each instance built its own set: eight copies of
 * seven extruded, bevelled solids where seven would do. Fifty-six geometries is fifty-six vertex
 * buffers uploaded to the GPU and fifty-six lots of ExtrudeGeometry running on the main thread
 * during mount, for shapes that are identical. The modules differ by position, rotation, scale and
 * material — never by geometry.
 */
function useModuleGeometry() {
  const geo = useMemo(
    () => ({
      cube: roundedBox(0.9, 0.9, 0.9, 0.22),
      plate: roundedBox(1.05, 0.16, 1.05, 0.16),
      chip: roundedBox(0.42, 0.06, 0.42, 0.1),
      chipSide: roundedBox(0.3, 0.3, 0.06, 0.07),
      wallet: roundedBox(1.25, 0.34, 0.95, 0.14),
      band: roundedBox(0.26, 0.38, 1.0, 0.06),
      tray: roundedBox(1.15, 0.14, 1.0, 0.12),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  return geo;
}

type ModuleGeometry = ReturnType<typeof useModuleGeometry>;

const Module: React.FC<{ spec: ModuleSpec; mats: Materials; geo: ModuleGeometry }> = ({
  spec,
  mats,
  geo,
}) => {
  const s = spec.scale ?? 1;

  return (
    <group rotation={[0, spec.rot ?? 0, 0]} scale={s}>
      {spec.kind === 'whiteCube' && (
        <>
          {/* Every module stands on a plate. That is what stops them looking like boxes hanging in
              the air: a base gives each one its own ground, which the reference uses on all of
              them and which also catches the shadow the body above it throws. */}
          <mesh geometry={geo.plate} position={[0, -0.53, 0]} material={mats.darker} receiveShadow />
          <mesh geometry={geo.cube} material={mats.white} castShadow receiveShadow />
          <mesh geometry={geo.chip} position={[0, 0.46, 0]} material={mats.purple} />
        </>
      )}

      {spec.kind === 'darkCube' && (
        <>
          <mesh geometry={geo.plate} position={[0, -0.53, 0]} material={mats.white} receiveShadow />
          <mesh geometry={geo.cube} material={mats.dark} castShadow receiveShadow />
          <mesh geometry={geo.chip} position={[0, 0.46, 0]} material={mats.purple} />
          <mesh geometry={geo.chipSide} position={[0, 0, 0.46]} material={mats.purple} />
          <mesh
            geometry={geo.chipSide}
            position={[0.46, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            material={mats.purple}
          />
        </>
      )}

      {spec.kind === 'wallet' && (
        <>
          <mesh geometry={geo.wallet} position={[0, 0.02, 0]} material={mats.dark} castShadow receiveShadow />
          <mesh geometry={geo.wallet} position={[0, -0.18, 0.04]} material={mats.darker} castShadow />
          {/* The strap, and the stud that closes it. The one warm note in the whole composition. */}
          <mesh geometry={geo.band} position={[0.44, 0.0, 0]} material={mats.purple} />
          <mesh position={[0.44, 0.0, 0.5]} material={mats.brass}>
            <sphereGeometry args={[0.06, 12, 10]} />
          </mesh>
        </>
      )}

      {spec.kind === 'stack' && (
        <>
          {/* A short tower of trays with lit gaps between them — the same trick the platform uses,
              at a smaller scale, so the two read as parts of one system. */}
          {[0, 1, 2].map((i) => (
            <group key={i}>
              <mesh
                geometry={geo.tray}
                position={[0, -0.55 + i * 0.34, 0]}
                material={mats.darker}
                castShadow
                receiveShadow
              />
              <mesh geometry={geo.chip} position={[0, -0.45 + i * 0.34, 0.32]} material={mats.purple} />
            </group>
          ))}
          <mesh geometry={geo.cube} position={[0, 0.42, 0]} scale={0.82} material={mats.white} castShadow />
          <mesh geometry={geo.chip} position={[0, 0.79, 0]} scale={0.82} material={mats.purple} />
        </>
      )}
    </group>
  );
};

/* ── The cables ───────────────────────────────────────────────────────────────────────────── */

/**
 * One cable, recomputed from live positions every frame.
 *
 * A tube built through a curve would have to be rebuilt whenever either end moves, which is a new
 * geometry per frame per cable. A unit cylinder does the same job for free: it is placed at the
 * midpoint, turned to face along the line between the ends, and stretched to their distance. Its
 * geometry is never touched.
 */
const Cable: React.FC<{
  /** The live array of module groups, plus which one this cable is tied to.
      Passing `{ current: groups.current[i] }` instead looks equivalent and is not: that object is
      built during render, when the ref callbacks have not run yet and every entry is still null, and
      nothing re-renders afterwards to rebuild it. The cable then reads null forever and never draws.
      Handing over the array itself means the lookup happens inside the frame loop, after the refs
      are attached. */
  groups: React.MutableRefObject<(THREE.Group | null)[]>;
  index: number;
  anchor: THREE.Vector3;
  mats: Materials;
  glow: THREE.Texture | null;
  clock: React.RefObject<number>;
  still: boolean;
}> = ({ groups, index, anchor, mats, glow, clock, still }) => {
  const tube = useRef<THREE.Mesh>(null);
  const collar = useRef<THREE.Mesh>(null);
  const charge = useRef<THREE.Group>(null);

  const a = useMemo(() => new THREE.Vector3(), []);
  const mid = useMemo(() => new THREE.Vector3(), []);
  const dirV = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const q = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    const src = groups.current[index];
    const t = tube.current;
    if (!src || !t) return;

    a.copy(src.position);
    dirV.copy(a).sub(anchor);
    const len = dirV.length();
    if (len < 1e-4) return;
    dirV.divideScalar(len);
    mid.copy(anchor).addScaledVector(dirV, len / 2);

    // The cylinder is built along +Y, so this is the rotation that takes Y onto the cable's line.
    q.setFromUnitVectors(up, dirV);
    t.position.copy(mid);
    t.quaternion.copy(q);
    t.scale.set(1, len, 1);

    if (collar.current) {
      collar.current.position.copy(anchor).addScaledVector(dirV, len * 0.34);
      collar.current.quaternion.copy(q);
    }

    // The charge. Nothing runs down the cables until the mark actually lands — the power comes FROM
    // the impact, so a pulse already travelling when it hits would say the opposite. After that each
    // cable carries one, leaving the platform and running out to its module, restarting when it
    // arrives. The per-cable offset is what stops all eight leaving in the same instant, which reads
    // as a lighting cue rather than as something moving.
    const c = charge.current;
    if (!c) return;
    const since = (clock.current ?? 0) - IMPACT_T;
    if (still || since <= 0) {
      c.visible = false;
      return;
    }
    c.visible = true;
    const phase = (since * 0.85 + index * 0.37) % 1;
    c.position.copy(anchor).addScaledVector(dirV, len * phase);
    // Swells in the middle of the run and fades at both ends, so it appears out of the platform and
    // is absorbed by the module instead of popping in and out at the two connectors.
    const s = Math.sin(phase * Math.PI);
    c.scale.setScalar(0.55 + s * 0.9);
  });

  return (
    <>
      <mesh ref={tube} material={mats.cable} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 1, 10, 1, true]} />
      </mesh>
      {/* The collar: a short thicker sleeve part way along, which every cable in the reference has
          and which is most of what stops them reading as plain sticks. */}
      <mesh ref={collar} material={mats.white}>
        <cylinderGeometry args={[0.1, 0.1, 0.18, 10]} />
      </mesh>
      {/* The lit plug where the cable meets the platform. Fixed, because the platform end does not
          move — only the module end does. Core plus halo, the same two-part build as the charge. */}
      <group position={anchor}>
        <mesh material={mats.connector}>
          <sphereGeometry args={[0.1, 12, 10]} />
        </mesh>
        {glow && (
          <sprite scale={[0.62, 0.62, 1]}>
            <spriteMaterial
              map={glow}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              transparent
              opacity={0.75}
            />
          </sprite>
        )}
      </group>

      {/* The charge riding the cable: a small hot core inside a much larger halo. The core alone is
          a white bead; the halo alone is a smudge with nothing in it. Starts hidden — the frame loop
          above owns it from the moment the mark lands. */}
      <group ref={charge} visible={false}>
        <mesh material={mats.charge}>
          <sphereGeometry args={[0.065, 10, 8]} />
        </mesh>
        {glow && (
          <sprite scale={[0.9, 0.9, 1]}>
            <spriteMaterial
              map={glow}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              transparent
            />
          </sprite>
        )}
      </group>
    </>
  );
};

/* ── The choreography ─────────────────────────────────────────────────────────────────────── */

/** The mark is the subject, so it is sized against the platform rather than fitted around the
    modules: at 1.15 the braces stand 2.7 tall and the ring spans 3.0 over a 3.9-wide slab, which is
    the reference's proportion between its centrepiece and the platform under it. */
const MARK_SCALE = 1.15;
/** How far above its resting height the mark starts. Above the frame, so it enters rather than
    appears. */
const DROP_HEIGHT = 5.2;
/** Units per second squared. Tuned by the only figure that matters: the fall has to read as a drop
    rather than a descent, which puts it just under a second. */
const GRAVITY = 13;
/** When the mark reaches the platform: solved, not guessed, so the wave cannot go out of step with
    the thing that is supposed to have caused it. */
const IMPACT_T = Math.sqrt((2 * DROP_HEIGHT) / GRAVITY);
/** How fast the impact travels outward. Slow enough that the stagger is legible — at 20 units/s the
    whole cluster moves at once and the wave stops reading as a wave. */
const WAVE_SPEED = 5.5;
/** The modules' spring: how far the first throw carries, how fast it dies away, and how quickly it
    oscillates while it does. */
const KICK_AMP = 0.85;
const KICK_DECAY = 2.6;
const KICK_FREQ = 9.5;

/**
 * Where the mark comes to rest: standing ON the platform, its brace tips touching the top face.
 *
 * This was held 0.5 higher, off the ring's BOUNDING SPHERE (1.358), on the argument that the ring
 * would otherwise sweep through the slab. That figure is orientation-independent and this ring's
 * orientation is not free: its tilt is fixed on a group that is never written to, and the only
 * animated axis is Y, which a body of revolution about Y cannot change the height of. So the
 * relevant number is the ring's VERTICAL half-extent at its fixed tilt, which is
 *
 *   R·√( sin²(Zt) + (cos(Xt)·cos(Zt))² ) + tube  =  1.3·0.542 + 0.058  =  0.763
 *
 * — well inside the braces' own 1.175. The braces are the lowest part of the mark, so resting them
 * on the face puts the whole logo above it and nothing can reach the slab. The sphere test was
 * simply the wrong test, and it cost half a unit of daylight under a logo that is supposed to be
 * standing on something.
 *
 * It stands on the PROCESSOR, not the bare face — the chip is what it lands on now, so its height
 * is part of this sum.
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
    // Turned a quarter round to square up with the camera. The mark is drawn in the XZ plane's
    // front face, and the camera sits at 45° of azimuth — left alone, the logo is seen at 45° and
    // both braces foreshorten into each other. This is the one rotation in the scene that exists
    // purely so the artwork reads as itself: the brand has to be legible in every frame, which is
    // exactly what an object turned away from the viewer is not.
    <group ref={ref} position={[0, MARK_REST_Y, 0]} rotation={[0, Math.PI / 4, 0]} scale={MARK_SCALE}>
      <Mark spin={!still} material={mats.silver} />
    </group>
  );
};

/**
 * The shadow catcher — the shadows without the floor.
 *
 * There has to be a surface here or the shadows have nothing to fall on and the objects float in a
 * void. There must NOT be a visible one: a lit ground plane is a grey rectangle sitting in the
 * middle of a dark page, and no amount of fading its edges stops it reading as a slab of a slightly
 * different black.
 *
 * `ShadowMaterial` is exactly that surface. It is transparent everywhere except where something
 * shadows it, so the plane itself never draws — only the shade the composition casts onto it. The
 * ground appears to be the page.
 */
const ShadowCatcher: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]} receiveShadow>
    <planeGeometry args={[22, 22]} />
    {/* Well under 1: at full opacity the shade goes to solid black and the modules look stuck to
        cut-out holes rather than standing over a surface. */}
    <shadowMaterial opacity={0.42} color="#000000" />
  </mesh>
);

const Scene: React.FC<{ still: boolean; replayRef: React.MutableRefObject<(() => void) | null> }> = ({
  still,
  replayRef,
}) => {
  const mats = useMaterials();
  const moduleGeo = useModuleGeometry();
  const glow = useGlowTexture();
  const clock = useRef(0);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  /**
   * The composition tightens on a small canvas, and it has to do BOTH halves of that or it does
   * nothing.
   *
   * On a phone this canvas is about 290px square, against 540 on a desktop. Left alone the platform
   * comes out around 90px across — the mark on top of it is unreadable and the whole thing reads as
   * a smudge. Moving the camera in alone crops the outer modules off mid-cable; pulling the modules
   * in alone just leaves a smaller cluster in the same empty frame. Done together, the ring of
   * modules shrinks by more than the camera closes in, so everything stays inside the frame and all
   * of it is bigger.
   */
  const compact = width > 0 && width < 460;
  const spread = compact ? 0.72 : 1;

  /**
   * The camera frames the composition, at whatever shape the canvas happens to be.
   *
   * The distance is solved rather than tuned. The canvas is square on a desktop, 1.5:1 on a tablet
   * and something else again on a phone, and a fixed distance can only be right for one of them —
   * every other shape gets dead bands on two sides. So: take the composition's own half-width and
   * half-height in world units, work out the visible height that contains BOTH at this aspect, and
   * put the camera at the distance that produces it. Nothing here is a magic number except the
   * margin, which is the 10% of breathing room around the edges.
   *
   * The ANGLE never changes, and that is deliberate. Raising it was tried — from 29° up the ring
   * projects about half as tall as it is wide, and at 41° it filled a square frame properly — but
   * the mark foreshortened into an unreadable smudge, because a taller angle looks further down
   * onto an object whose shape lives in its height. The logo is the point of the scene; the frame
   * bends around it, not the other way round.
   */
  useEffect(() => {
    if (!width || !height) return;
    /** The composition's half-extents in world units: the module ring plus a module, and from the
        mark's crown down to the shadows under the platform. */
    const halfW = 5.2 * spread;
    const halfH = 2.9;
    const aspect = width / height;
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 26;
    // Whichever of the two runs out of room first sets the frame.
    const visibleH = (Math.max(halfH, halfW / aspect) * 2) / 0.9;
    const dist = visibleH / (2 * Math.tan((fov * Math.PI) / 360));
    // The viewing direction, normalised — 45° round and about 29° up.
    camera.position.set(dist * 0.6197, dist * 0.4819, dist * 0.6197);
    // Aimed at the composition's own middle rather than the origin: the mark rises to about 2.4 and
    // the modules sit near 0, so the origin is not the centre of what is on screen.
    camera.lookAt(0, 0.9, 0);
    camera.updateProjectionMatrix();
  }, [camera, width, height, spread]);

  /** Rest positions, the outward direction of the shove, and how far along the wave each module is
      — all fixed at build time, since none of them depend on the animation. */
  const layout = useMemo(
    () =>
      MODULES.map((m) => {
        const rest = new THREE.Vector3(...m.pos).multiplyScalar(spread);
        const dir = new THREE.Vector3(rest.x, rest.y * 0.3, rest.z).normalize();
        const dist = rest.length();
        return {
          rest,
          dir,
          dist,
          // Farther modules are moved less by the same impact, which is most of what sells the wave
          // as energy spreading out rather than as everything being told to move.
          falloff: 1 / (1 + dist * 0.42),
          // The cable meets the platform on the side facing that module, just under the top face.
          anchor: new THREE.Vector3(rest.x, 0, rest.z)
            .normalize()
            .multiplyScalar(PLATFORM_W / 2 - 0.15)
            .setY(Y_SKIRT),
        };
      }),
    [spread],
  );

  useEffect(() => {
    replayRef.current = () => {
      clock.current = 0;
    };
    return () => {
      replayRef.current = null;
    };
  }, [replayRef]);

  // One clock and one loop for every module, advanced only by drawn frames and clamped, so the drop
  // and every reaction to it stay on the same timeline across a scroll away and back.
  useFrame((_, delta) => {
    clock.current += Math.min(delta, 0.05);
    const t = clock.current;

    for (let i = 0; i < layout.length; i++) {
      const g = groups.current[i];
      if (!g) continue;
      const { rest, dir, dist, falloff } = layout[i];
      if (still) {
        g.position.copy(rest);
        continue;
      }
      const tau = t - IMPACT_T - dist / WAVE_SPEED;
      // One damped oscillation, in closed form. A solved spring cannot drift, cannot blow up on a
      // long frame, and ends exactly where it started.
      const kick =
        tau > 0 ? Math.exp(-KICK_DECAY * tau) * Math.sin(KICK_FREQ * tau) * falloff * KICK_AMP : 0;
      // The bob fades IN as the kick fades out, so the two never fight over the same module.
      const settled = tau > 0 ? 1 - Math.exp(-1.2 * tau) : 0;
      const bob = Math.sin(t * 0.85 + MODULES[i].phase) * 0.06 * settled;

      g.position.set(
        rest.x + dir.x * kick,
        rest.y + dir.y * kick + bob,
        rest.z + dir.z * kick,
      );
      g.rotation.z = -kick * 0.18;
    }
  });

  return (
    <>
      {/* Ambient for fill, one directional for shading — the minimum any PBR material needs, and
          without both every object here renders solid black. The violet point light is the scene's
          own accent bouncing back off the modules, so the seams look like they are lighting the
          composition rather than sitting in it. */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[-7, 11, 6]}
        intensity={2.1}
        castShadow
        // Only the key light casts. A second shadow-casting light means a second full render of the
        // scene from its point of view, every frame, for a difference nobody looks at.
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-bias={-0.0012}
      />
      <directionalLight position={[6, 4, -6]} intensity={0.5} />
      {/* Low, and deliberately so. At full strength it stopped being a bounce and became a flare
          burning a white hotspot into the middle of the platform's top face. */}
      <pointLight position={[0, 2.4, 0]} intensity={3.2} distance={9} color={PURPLE_LIT} />

      <ShadowCatcher />
      <Platform mats={mats} clock={clock} still={still} />
      <MarkRig clock={clock} still={still} mats={mats} />

      {MODULES.map((spec, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el;
          }}
          position={layout[i].rest}
        >
          <Module spec={spec} mats={mats} geo={moduleGeo} />
        </group>
      ))}

      {layout.map((l, i) => (
        <Cable
          key={i}
          groups={groups}
          index={i}
          anchor={l.anchor}
          mats={mats}
          clock={clock}
          still={still}
        />
      ))}
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
      {/* Paused, NOT unmounted. `{active && <Canvas/>}` destroys the GL context on every scroll
          past and rebuilds it on the way back — a fresh context, a shader recompile and a scene
          rebuild on the main thread each time. Kept mounted, frameloop="never" costs the same zero
          while off screen and churns nothing.

          `shadows` has to be set HERE: it is what enables the renderer's shadow map, and every
          castShadow and receiveShadow flag in the scene below is silently ignored without it. */}
      <Canvas
        shadows
        frameloop={motion && active ? 'always' : 'never'}
        dpr={[1, MAX_DPR]}
        // A long lens from 45° round and ~30° up. The narrow fov is what makes this isometric
        // rather than merely angled: at 26° the platform's opposite edges stay near enough to
        // parallel that the composition reads as a technical drawing, which is the reference's
        // whole look. A wide fov from the same spot rakes them into perspective.
        camera={{ position: [18, 14, 18], fov: 26 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <Scene still={!motion} replayRef={replayRef} />
      </Canvas>
    </div>
  );
};
