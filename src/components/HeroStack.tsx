import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_DPR } from '../lib/renderBudget';

/**
 * The hero's artwork: NOVAIQ's mark drops onto a platform, and the blocks around it feel it land.
 *
 * ## The motion is a cause and its effects, not a loop
 *
 * The obvious way to animate a cluster of floating objects is to turn them around the centre, and
 * that was explicitly not wanted here. An orbit is ambient — it says nothing, it just runs. What
 * happens instead is a single event with consequences: the mark falls in from above the frame under
 * gravity, hits the platform, and the impact travels outward through the blocks as a wave. Each
 * block starts moving only when the wave reaches IT — delay is distance over wave speed — so the
 * near ones kick first and the far ones follow, which is what makes the group read as reacting to
 * something rather than as being animated on a shared timer.
 *
 * Every block's response is one damped oscillation, `exp(-decay·t)·sin(freq·t)`: pushed out and up,
 * overshoots back, and settles. Closed form rather than integrated, because it is exactly solvable
 * and a solved spring cannot drift, blow up on a long frame, or end anywhere other than where it
 * started. After it settles there is only a slow bob left, so the scene is quiet until the drop is
 * replayed — which a click anywhere on it does.
 *
 * ## The mark itself
 *
 * Braces as tube geometry, ring as a torus, and the metal ramp on both — carried over from
 * HeroLogo3D, which worked out why it has to be built this way. In short: an extruded outline is a
 * flat slab that collapses to a line when it turns, a swept tube presents the same thickness from
 * every angle, and a torus spun about its OWN axis produces literally no visible change because it
 * is symmetric about it. The ring is therefore carried around the mark's vertical axis while its
 * artwork tilt is held fixed, on a separate group — Euler angles do not add, so the tilt and the
 * spin cannot share one group without the ring wandering off the logo's diagonal.
 *
 * NO BACKTICKS anywhere inside the shader strings below, including in prose: they are template
 * literals, and one backtick closes the string mid-shader. That compiles to a GLSL syntax error and
 * shows up as the mark silently failing to draw.
 */

/* ── Palette ──────────────────────────────────────────────────────────────────────────────── */

/** The mark's metal: five stops, not two. Two give a flat plastic gradient; the extra steps put a
    shoulder where the light rolls off and a knee where it catches, which is what an eye reads as a
    hard reflective surface. The darkest stop stays well above the page's black so the turned-away
    side does not dissolve into the background and lose the mark's form. */
const C0_CHARCOAL = '#2A2A2E';
const C1_SLATE = '#52525B';
const C2_STEEL = '#8E8E97';
const C3_SILVER = '#DCDCE1';
const C4_WHITE = '#FFFFFF';
const RIM_COLOR = '#FFFFFF';

/** Up and toward the frame's outer edge, so the lit shoulder faces away from the copy column. */
const LIGHT = new THREE.Vector3(-0.42, 0.8, 0.43).normalize();

/** The violet the reference composition runs on, and the one accent in this scene. */
const VIOLET = '#7C5CFF';
const VIOLET_DIM = '#4C3A9E';
const PLATFORM = '#37325A';
const BLOCK_LIGHT = '#EDEDF2';
const BLOCK_DARK = '#26262F';

/* ── The mark ─────────────────────────────────────────────────────────────────────────────── */

/** Stroke radius, against the braces' own half-height of 1. Thinner than this and the mark reads as
    a wire diagram rather than as the logo. */
const STROKE = 0.105;
/** How far each brace sits from the centre line, set from the INNER edge: the arms reach x = 0.48,
    so 0.70 leaves 0.44 of clear air down the middle. */
const BRACE_X = 0.7;
/** The ring's artwork pose — its own tip and diagonal, held fixed while it is carried around Y. */
const RING_TILT_X = Math.PI / 2 - 0.38;
const RING_TILT_Z = 0.44;
const RING_ORBIT_RATE = 0.62;
/** Every point of the ring lies between R − tube and R + tube from the centre in ANY orientation.
    The braces' furthest point is the top arm at 1.070 out, plus STROKE = 1.175; 1.30 − 0.058 =
    1.242 clears it. Stated as a bounding-sphere test rather than a case analysis of angles, so a
    later change to how the ring moves cannot quietly put it through the mark. */
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

/** The mark's surface. Raw ShaderMaterial rather than drei's helper — drei is not a dependency of
    this project, and the helper's real benefit is its HMR key. */
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

        // Half-Lambert rather than a raw clamped dot: a raw one drops to zero across the whole
        // terminator, which on a tube reads as a hard black line running the length of every
        // stroke. The remap keeps a gradient going round the back so the strokes stay round.
        float lit = dot(n, uLight) * 0.5 + 0.5;
        float k = pow(lit, 1.1);

        vec3 c = uC0;
        c = mix(c, uC1, smoothstep(0.05, 0.30, k));
        c = mix(c, uC2, smoothstep(0.28, 0.52, k));
        c = mix(c, uC3, smoothstep(0.50, 0.78, k));
        c = mix(c, uC4, smoothstep(0.76, 0.96, k));

        // Ungated by the light term, unlike a sphere's rim would be: on a thin tube this is what
        // keeps the stroke's edges defined against a dark page from every angle, which is the
        // difference between a logo and a smudge.
        float fres = pow(1.0 - abs(dot(view, n)), 2.6);
        c += uRim * fres * 0.5;

        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
}

const Mark: React.FC<{ spin: boolean }> = ({ spin }) => {
  const orbit = useRef<THREE.Group>(null);
  const spun = useRef(0);
  const material = useMemo(makeMarkMaterial, []);
  const leftBrace = useMemo(() => makeBraceCurve(false), []);
  const rightBrace = useMemo(() => makeBraceCurve(true), []);

  // A GPU resource React does not own, so it is released explicitly. R3F disposes what it created
  // from JSX; this was built here.
  useEffect(() => () => material.dispose(), [material]);

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
          <mesh material={material}>
            {/* 128 along the path: the nub is a tight reversal and a coarser sweep visibly facets
                it into a corner. 10 around is plenty for a stroke this thin. */}
            <tubeGeometry args={[curve, 128, STROKE, 10, false]} />
          </mesh>
          {/* TubeGeometry builds an OPEN pipe, so without caps you see straight down the hollow
              inside of every stroke as the mark turns. */}
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

      {/* TWO nested groups, not one. The outer is animated and carries the ring around the
          vertical; the inner holds the artwork's tilt and is never written to. Folding them into
          one is the obvious simplification and it does not work — Euler angles do not add, so
          writing rotation.y onto a group that already carries X and Z composes into a different
          tilt every frame and the ring wanders off the diagonal that makes it the logo's. */}
      <group ref={orbit}>
        <group rotation={[RING_TILT_X, 0, RING_TILT_Z]}>
          <mesh material={material}>
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
 * the front and back faces meet the sides at a hard 90°, and the blocks read as cardboard.
 *
 * The shape is inset by the bevel on every axis so the finished solid measures exactly w × h × d
 * rather than w + 2·bevel.
 */
function roundedBox(w: number, h: number, d: number, r: number, bevel = 0.03): THREE.BufferGeometry {
  const iw = w - bevel * 2;
  const ih = h - bevel * 2;
  const x = -iw / 2;
  const y = -ih / 2;
  const rr = Math.min(r, iw / 2, ih / 2);

  const s = new THREE.Shape();
  s.moveTo(x + rr, y);
  s.lineTo(x + iw - rr, y);
  s.quadraticCurveTo(x + iw, y, x + iw, y + rr);
  s.lineTo(x + iw, y + ih - rr);
  s.quadraticCurveTo(x + iw, y + ih, x + iw - rr, y + ih);
  s.lineTo(x + rr, y + ih);
  s.quadraticCurveTo(x, y + ih, x, y + ih - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: d - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  // Extrude builds from z = 0 forward; centring makes position props mean the block's middle.
  geo.center();
  return geo;
}

/* ── The choreography ─────────────────────────────────────────────────────────────────────── */

/** The mark is the subject of this composition, so it is sized against the platform rather than
    fitted around the blocks: at 0.85 the braces stand 2.0 tall over a 3.4-wide slab, which is the
    reference's proportion between its coin and the platform under it. */
const MARK_SCALE = 0.85;

/** How far above its resting height the mark starts. Above the frame, so it enters rather than
    appears. */
const DROP_HEIGHT = 5.2;
/** Units per second squared. Tuned by the only figure that matters: the fall reads as a real drop
    rather than a slow descent, which puts it just under a second. */
const GRAVITY = 13;
/** When the mark reaches the platform: solved, not guessed, so the wave below cannot go out of step
    with the thing that is supposed to have caused it. */
const IMPACT_T = Math.sqrt((2 * DROP_HEIGHT) / GRAVITY);
/** How fast the impact travels outward through the blocks. Slow enough that the stagger is legible
    — at 20 units/s the whole cluster moves at once and the wave stops reading as a wave. */
const WAVE_SPEED = 5.5;
/** The blocks' spring: how far the first throw carries, how fast it dies away, and how quickly it
    oscillates while it does.
    KICK_AMP is the figure worth stating: at 0.5 the whole reaction measured about a fifth of a unit
    once distance falloff had taken its cut, which is smaller than the blocks' own idle bob — the
    wave was running correctly and simply could not be seen. It has to be a visible shove or the
    causal link between the landing and the movement is lost, which is the entire point of it. */
const KICK_AMP = 1.15;
const KICK_DECAY = 2.6;
const KICK_FREQ = 9.5;

interface BlockSpec {
  pos: [number, number, number];
  size: [number, number, number];
  radius: number;
  tone: 'light' | 'dark' | 'violet';
  /** How far this one is thrown by the wave, before distance falloff. */
  kick: number;
  /** Idle bob phase, so they do not breathe in unison once everything has settled. */
  phase: number;
}

/** Hand-placed rather than generated: the reference's composition is a deliberate arrangement —
    bigger slabs low and near, small ones high and far — and a random scatter does not land on it. */
const BLOCKS: BlockSpec[] = [
  { pos: [-2.75, 0.95, -0.5], size: [0.85, 0.85, 0.85], radius: 0.2, tone: 'dark', kick: 1.0, phase: 0.0 },
  { pos: [-2.2, -0.35, 0.9], size: [0.7, 0.7, 0.7], radius: 0.17, tone: 'light', kick: 1.15, phase: 1.1 },
  { pos: [-1.75, 1.95, -1.1], size: [0.6, 0.6, 0.6], radius: 0.15, tone: 'violet', kick: 0.85, phase: 2.3 },
  { pos: [2.65, 1.15, -0.35], size: [0.9, 0.62, 0.9], radius: 0.18, tone: 'light', kick: 1.0, phase: 0.7 },
  { pos: [2.3, -0.5, 0.75], size: [0.75, 0.75, 0.75], radius: 0.18, tone: 'dark', kick: 1.1, phase: 3.0 },
  { pos: [1.85, 2.15, -1.2], size: [0.55, 0.55, 0.55], radius: 0.14, tone: 'violet', kick: 0.8, phase: 1.8 },
  { pos: [0.35, 2.55, -1.6], size: [0.62, 0.62, 0.62], radius: 0.16, tone: 'light', kick: 0.75, phase: 4.2 },
  { pos: [-0.8, -0.95, 1.5], size: [0.68, 0.68, 0.68], radius: 0.17, tone: 'dark', kick: 1.2, phase: 5.0 },
];

const TONE = {
  light: { color: BLOCK_LIGHT, emissive: '#000000', rough: 0.32, metal: 0.08, emissiveI: 0 },
  dark: { color: BLOCK_DARK, emissive: '#000000', rough: 0.48, metal: 0.15, emissiveI: 0 },
  violet: { color: VIOLET_DIM, emissive: VIOLET, rough: 0.35, metal: 0.1, emissiveI: 0.55 },
} as const;

const Block: React.FC<{ spec: BlockSpec; clock: React.RefObject<number>; still: boolean }> = ({
  spec,
  clock,
  still,
}) => {
  const ref = useRef<THREE.Group>(null);
  const geo = useMemo(
    () => roundedBox(spec.size[0], spec.size[1], spec.size[2], spec.radius),
    [spec.size, spec.radius],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  const rest = useMemo(() => new THREE.Vector3(...spec.pos), [spec.pos]);
  /** Outward from the platform's centre, in the plane the platform sits in — the direction the
      impact would actually shove something. Blocks directly above the centre get a mostly upward
      push instead of an arbitrary sideways one. */
  const dir = useMemo(() => {
    const d = new THREE.Vector3(rest.x, rest.y * 0.35, rest.z);
    return d.lengthSq() < 1e-4 ? new THREE.Vector3(0, 1, 0) : d.normalize();
  }, [rest]);
  const dist = useMemo(() => rest.length(), [rest]);
  /** Farther blocks are moved less by the same impact, which is most of what sells the wave as
      energy spreading out rather than as everything being told to move. */
  const falloff = useMemo(() => spec.kick / (1 + dist * 0.45), [spec.kick, dist]);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    if (still) {
      g.position.copy(rest);
      return;
    }
    const t = clock.current ?? 0;
    const tau = t - IMPACT_T - dist / WAVE_SPEED;
    // One damped oscillation, in closed form. A solved spring cannot drift, cannot blow up on a
    // long frame, and ends exactly where it started.
    const kick =
      tau > 0 ? Math.exp(-KICK_DECAY * tau) * Math.sin(KICK_FREQ * tau) * falloff * KICK_AMP : 0;
    // The bob fades IN as the kick fades out, so the two never fight over the same block.
    const settled = tau > 0 ? 1 - Math.exp(-1.2 * tau) : 0;
    const bob = Math.sin(t * 0.85 + spec.phase) * 0.07 * settled;

    g.position.set(
      rest.x + dir.x * kick,
      rest.y + dir.y * kick + bob,
      rest.z + dir.z * kick,
    );
    g.rotation.x = kick * 0.35 + Math.sin(t * 0.6 + spec.phase) * 0.05 * settled;
    g.rotation.z = -kick * 0.28;
  });

  const tone = TONE[spec.tone];
  return (
    <group ref={ref} position={spec.pos}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial
          color={tone.color}
          roughness={tone.rough}
          metalness={tone.metal}
          emissive={tone.emissive}
          emissiveIntensity={tone.emissiveI}
        />
      </mesh>
    </group>
  );
};

const Platform: React.FC<{ clock: React.RefObject<number>; still: boolean }> = ({ clock, still }) => {
  const ref = useRef<THREE.Group>(null);
  const slab = useMemo(() => roundedBox(3.4, 0.62, 2.4, 0.26), []);
  const seam = useMemo(() => roundedBox(3.5, 0.07, 2.5, 0.26), []);
  useEffect(() => () => {
    slab.dispose();
    seam.dispose();
  }, [slab, seam]);

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
    const squash = tau > 0 ? Math.exp(-7 * tau) * Math.sin(16 * tau) * 0.12 : 0;
    g.scale.set(1 + squash * 0.35, 1 - squash, 1 + squash * 0.35);
  });

  return (
    <group ref={ref}>
      <mesh geometry={slab} receiveShadow castShadow>
        <meshStandardMaterial color={PLATFORM} roughness={0.38} metalness={0.3} />
      </mesh>
      {/* The lit seam round the platform's waist — the reference's one piece of self-illumination,
          and what keeps the slab from reading as a grey box on a dark page. */}
      <mesh geometry={seam} position={[0, -0.04, 0]}>
        <meshStandardMaterial
          color={VIOLET}
          emissive={VIOLET}
          emissiveIntensity={1.5}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
};

/** The mark's fall, and the small bounce that follows it. Both are analytic for the same reason the
    blocks' kick is: this has to end at exactly its rest height, every time, however the frames
    landed. */
const MarkRig: React.FC<{ clock: React.RefObject<number>; still: boolean; spin: boolean }> = ({
  clock,
  still,
  spin,
}) => {
  const ref = useRef<THREE.Group>(null);
  /** Where the mark comes to rest, and it is a clearance figure rather than a look.
      The ring's bounding sphere is 1.358 at unit scale — orientation-independent, so it holds
      wherever the ring is in its orbit — which is 1.155 at MARK_SCALE. The platform's top face is
      at 0.31, so anything under 1.47 puts the ring through the slab at some point in every
      revolution. The mark therefore hovers a little above the platform rather than resting on it,
      which is also the only arrangement where the ring can sweep a full circle unobstructed. */
  const REST_Y = 1.52;

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    if (still) {
      g.position.y = REST_Y;
      return;
    }
    const t = clock.current ?? 0;
    if (t < IMPACT_T) {
      g.position.y = REST_Y + DROP_HEIGHT - 0.5 * GRAVITY * t * t;
    } else {
      const tau = t - IMPACT_T;
      // Bounce: the absolute value of a decaying sine, which is what a ball actually does — it
      // leaves the surface, comes back, and each arc is shorter than the last.
      g.position.y = REST_Y + Math.abs(Math.sin(tau * 7.5)) * Math.exp(-tau * 4.2) * 0.45;
    }
  });

  return (
    <group ref={ref} position={[0, REST_Y, 0]} scale={MARK_SCALE}>
      <Mark spin={spin} />
    </group>
  );
};

const Scene: React.FC<{ still: boolean; replayRef: React.MutableRefObject<(() => void) | null> }> = ({
  still,
  replayRef,
}) => {
  const clock = useRef(0);

  useEffect(() => {
    replayRef.current = () => {
      clock.current = 0;
    };
    return () => {
      replayRef.current = null;
    };
  }, [replayRef]);

  // One clock for the whole composition, advanced only by drawn frames and clamped, so the drop and
  // every reaction to it stay on the same timeline across a scroll away and back.
  useFrame((_, delta) => {
    clock.current += Math.min(delta, 0.05);
  });

  return (
    <>
      {/* Standard materials need lights; the mark carries its own ramp and ignores these. Three is
          the whole rig: a fill so nothing is pure black, a key from the same direction the mark's
          shader lights from, and a violet bounce on the far side to tie the blocks to the seam. */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[-3.5, 6, 4]} intensity={1.5} />
      <pointLight position={[3.5, 1.5, 3]} intensity={14} distance={16} color={VIOLET} />

      <Platform clock={clock} still={still} />
      <MarkRig clock={clock} still={still} spin={!still} />
      {BLOCKS.map((spec, i) => (
        <Block key={i} spec={spec} clock={clock} still={still} />
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

  // Replays the drop when the section comes back into view, rather than only on first mount: the
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
          while off screen and churns nothing. */}
      <Canvas
        frameloop={motion && active ? 'always' : 'never'}
        dpr={[1, MAX_DPR]}
        camera={{ position: [0, 1.8, 8.6], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <Scene still={!motion} replayRef={replayRef} />
      </Canvas>
    </div>
  );
};
