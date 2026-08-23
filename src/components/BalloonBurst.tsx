import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { INK, PAPER, PERIWINKLE, SAND, SAND_DEEP, SAND_LIGHT } from '../lib/homePalette';

/**
 * The easter egg: shake the mouse left and right and three balloons rise off the cursor, drift
 * together, and burst into the site's own cubes — leaving WELCOME TO NOVAIQ behind.
 *
 * The cubes are the whole reason this works. A generic confetti burst would be a party effect
 * pasted onto a page; these are the same tilted, three-face-lit blocks the hero, the section
 * bands and now every button are made of, in the same six colours, so the balloons read as
 * bursting into the material the site is already built from.
 *
 * Mounted only for the ~5 seconds it runs, and never at all under prefers-reduced-motion — see
 * the host at the bottom.
 */

/* ── Constants ──────────────────────────────────────────────────────────────────────────── */

/** Pixels per world unit, matching TileField and ButtonTiles so everything on this site measures
    distance the same way. */
const ZOOM = 100;

/** The key direction, shared with the cube fields — the balloons and their debris are lit from
    the same place as the ground they are floating over. */
const LIGHT = new THREE.Vector3(-0.42, 0.5, 0.76).normalize();

/** Balloon skins, in the site's palette. Three balloons, three colours, so the burst shows the
    palette rather than describing it. INK is deliberately not here: a near-black balloon on a
    sand page reads as a hole, and it earns its place in the confetti instead. */
const SKINS = [PERIWINKLE, SAND_DEEP, PAPER];

/** What the balloons burst into. The full palette this time, INK included — at cube size it is
    the shadow in the scatter rather than a hole in the page. */
const CONFETTI = [PERIWINKLE, SAND, SAND_DEEP, SAND_LIGHT, PAPER, INK];

const PER_BALLOON = 46;
const CONFETTI_COUNT = SKINS.length * PER_BALLOON;

/** When each balloon bursts, seconds from launch. Staggered rather than simultaneous: three
    pops in a row is an event, three at once is a glitch. */
const POP_AT = [1.85, 2.2, 2.55];
/** The last pop is the reveal, and the text is timed off it. */
const REVEAL_AT = POP_AT[POP_AT.length - 1];
/** Total life of the effect, after which the host unmounts and the WebGL context goes. */
export const BURST_MS = 5400;

/* ── The balloon ────────────────────────────────────────────────────────────────────────── */

/**
 * A lathed teardrop: the profile is half a balloon in cross-section, revolved.
 *
 * A scaled sphere was the first attempt and it reads as a ball, not a balloon — what says
 * "balloon" is the pinch at the neck and the nub under it, which is exactly the part a sphere
 * cannot have. Eleven points is enough for the silhouette at the size these are drawn.
 */
function balloonGeometry(): THREE.LatheGeometry {
  const profile = [
    [0.0, 0.0], [0.045, 0.015], [0.035, 0.055],   // knot, then the pinch above it
    [0.15, 0.13], [0.29, 0.27], [0.39, 0.45],
    [0.425, 0.63], [0.385, 0.79], [0.27, 0.91],
    [0.13, 0.98], [0.0, 1.0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(profile, 28);
}

/**
 * Latex, in about twenty lines of GLSL.
 *
 * Three things make a balloon look like a balloon and none of them is the base colour: a rim
 * that lights up where the surface turns away (thin stretched latex passes light at grazing
 * angles), one hard specular dot where the room reflects in it, and a body that stays fairly
 * flat between the two. A meshStandardMaterial gives the third and neither of the others, which
 * is why this is a shader rather than a material with the roughness turned down.
 */
function balloonMaterial(color: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uLight: { value: LIGHT.clone() },
      uAlpha: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform vec3  uColor;
      uniform vec3  uLight;
      uniform float uAlpha;
      varying vec3 vN;
      varying vec3 vView;

      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(vView);

        float lam = max(dot(N, normalize(uLight)), 0.0);
        vec3 c = uColor * (0.52 + 0.48 * lam);

        // The rim. Squared rather than cubed so it is a band of light around the edge instead of
        // a hairline — latex is thick enough to glow across a few degrees, not one.
        float fres = pow(1.0 - max(dot(V, N), 0.0), 2.2);
        c += uColor * fres * 0.55 + vec3(1.0) * fres * 0.18;

        // One highlight, tight and bright. Without it the balloon is matte and reads as clay.
        vec3 H = normalize(normalize(uLight) + V);
        c += vec3(1.0) * pow(max(dot(N, H), 0.0), 48.0) * 0.6;

        gl_FragColor = vec4(c, uAlpha);
      }
    `,
  });
}

interface BalloonState {
  skin: string;
  /** Launch point, world units. */
  x0: number;
  y0: number;
  /** Where it drifts to horizontally as it climbs — see the note in Scene. */
  xEnd: number;
  rise: number;
  swayAmp: number;
  swayPhase: number;
  scale: number;
  popAt: number;
}

const Balloon: React.FC<{ state: BalloonState; clock: React.RefObject<number> }> = ({
  state,
  clock,
}) => {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(balloonGeometry, []);
  const material = useMemo(() => balloonMaterial(state.skin), [state.skin]);

  /** The string: a two-point line under the knot, built as an object and dropped in with
      `primitive`. Not the `<line>` intrinsic — that name collides with SVG's `line` in the JSX
      typings and resolves to the wrong element. Kept 1px: a tube would be a millimetre of rubber
      modelled in 3D for something the eye reads as a line anyway. */
  const string = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.02, -0.34, 0], 3));
    const m = new THREE.LineBasicMaterial({
      color: new THREE.Color(INK), transparent: true, opacity: 0.35,
    });
    return new THREE.Line(g, m);
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      string.geometry.dispose();
      (string.material as THREE.Material).dispose();
    },
    [geometry, material, string],
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = clock.current;

    if (t >= state.popAt) { g.visible = false; return; }
    g.visible = true;

    /* Arrival. An overshoot rather than a straight ramp: a balloon being inflated goes slightly
       past its size and settles, and 260ms of that is the difference between "appeared" and
       "was blown up". */
    const a = Math.min(1, t / 0.26);
    const grow = a < 1 ? 1 - Math.pow(1 - a, 3) : 1;
    const overshoot = a < 1 ? 1 + Math.sin(a * Math.PI) * 0.16 : 1;

    /* The last 140ms before the pop, it swells — the tell that something is about to give. */
    const toPop = state.popAt - t;
    const strain = toPop < 0.14 ? 1 + (0.14 - toPop) * 1.9 : 1;

    const climb = Math.max(0, t - 0.1);
    const sway = Math.sin(climb * 2.1 + state.swayPhase) * state.swayAmp;

    /* Horizontal: eased from where the cursor was toward the middle of the screen. Rising
       straight up from the pointer means the burst happens wherever the pointer happened to be,
       including hard against an edge; converging means the three balloons gather before they go,
       and the message lands somewhere it can actually be read. */
    const k = Math.min(1, climb / 1.9);
    const ease = 1 - Math.pow(1 - k, 2);
    g.position.x = state.x0 + (state.xEnd - state.x0) * ease + sway;
    g.position.y = state.y0 + climb * state.rise;

    // Balloons hang from their string and lean into the sway rather than staying upright.
    g.rotation.z = -sway * 0.5;
    g.scale.setScalar(state.scale * grow * overshoot * strain);
  });

  return (
    <group ref={group} scale={0}>
      <mesh geometry={geometry} material={material} />
      <primitive object={string} />
    </group>
  );
};

/* ── The burst ──────────────────────────────────────────────────────────────────────────── */

interface Bit {
  bx: number; by: number;      // birth position
  vx: number; vy: number; vz: number;
  spin: THREE.Vector3;
  size: number;
  born: number;                // the pop it belongs to
}

const GRAVITY = 3.4;
const BIT_LIFE = 2.4;

const Confetti: React.FC<{ bits: Bit[]; clock: React.RefObject<number> }> = ({ bits, clock }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);

  /* Geometry, colours and fades in one place. Both extras are InstancedBufferAttributes declared
     by hand in the shader: `instanceColor` would work, but only via three's own
     USE_INSTANCING_COLOR define, and a ShaderMaterial that silently loses its colours when that
     machinery changes is not worth the two lines it saves. */
  const { geometry, fade } = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const colors = new Float32Array(CONFETTI_COUNT * 3);
    const c = new THREE.Color();
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      c.set(CONFETTI[i % CONFETTI.length]);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const fadeArr = new Float32Array(CONFETTI_COUNT);
    const fadeAttr = new THREE.InstancedBufferAttribute(fadeArr, 1);
    fadeAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
    g.setAttribute('aFade', fadeAttr);
    return { geometry: g, fade: fadeAttr };
  }, []);

  /** Lit exactly like the cube fields: three flat values, one per visible face, off the same key
      direction. One draw call for every piece in the air. */
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        uniforms: { uLight: { value: LIGHT.clone() } },
        vertexShader: /* glsl */ `
          attribute vec3  aColor;
          attribute float aFade;
          varying vec3  vC;
          varying vec3  vN;
          varying float vFade;
          void main() {
            vC = aColor;
            vN = normal;
            vFade = aFade;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          precision mediump float;
          uniform vec3 uLight;
          varying vec3  vC;
          varying vec3  vN;
          varying float vFade;
          void main() {
            if (vFade <= 0.004) discard;
            float lam = max(dot(normalize(vN), uLight), 0.0);
            gl_FragColor = vec4(vC * (0.74 + 0.38 * lam), vFade);
          }
        `,
      }),
    [],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.current;
    const f = fade.array as Float32Array;

    for (let i = 0; i < bits.length; i++) {
      const b = bits[i];
      const age = t - b.born;
      if (age < 0 || age > BIT_LIFE) {
        f[i] = 0;
        // Collapsed to nothing rather than left where it died: `discard` removes the pixels, and
        // a zero scale keeps the instance out of the depth pass as well.
        dummy.position.set(0, 0, 0);
        dummy.scale.setScalar(0);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        continue;
      }

      dummy.position.set(
        b.bx + b.vx * age,
        b.by + b.vy * age - 0.5 * GRAVITY * age * age,
        b.vz * age,
      );
      dummy.rotation.set(b.spin.x * age, b.spin.y * age, b.spin.z * age);
      // Held at full for most of the life and given up late — a piece that shrinks the whole way
      // reads as receding rather than as going out.
      const k = age / BIT_LIFE;
      f[i] = k < 0.72 ? 1 : 1 - (k - 0.72) / 0.28;
      dummy.scale.setScalar(b.size * (0.35 + 0.65 * Math.min(1, age * 9)));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }

    m.instanceMatrix.needsUpdate = true;
    fade.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, CONFETTI_COUNT]}
      frustumCulled={false}
    />
  );
};

/* ── The scene ──────────────────────────────────────────────────────────────────────────── */

const Scene: React.FC<{ origin: { x: number; y: number } }> = ({ origin }) => {
  const size = useThree((s) => s.size);
  const clock = useRef(0);

  const { balloons, bits } = useMemo(() => {
    const w = size.width / ZOOM;
    const h = size.height / ZOOM;
    // Screen pixels to world units, with the origin at the centre of the canvas.
    const wx = (px: number) => px / ZOOM - w / 2;
    const wy = (py: number) => h / 2 - py / ZOOM;

    const cx = wx(origin.x);
    const cy = wy(origin.y);
    // Converge on the middle of the screen, a little above centre — the burst has to have room
    // above it for the debris and room below it for the message.
    const targetX = 0;
    const popY = h * 0.16;

    const balloons: BalloonState[] = SKINS.map((skin, i) => {
      const spread = (i - 1) * 0.42;
      const y0 = cy - 0.25;
      const popAt = POP_AT[i];
      return {
        skin,
        x0: cx + spread,
        y0,
        xEnd: targetX + spread * 0.75,
        // Solved rather than chosen: each balloon has a different pop time and they all have to
        // arrive at the same height, so the speed follows from the distance and the time.
        rise: (popY - y0) / Math.max(0.35, popAt - 0.1),
        swayAmp: 0.1 + i * 0.035,
        swayPhase: i * 2.1,
        scale: 1.0 - i * 0.08,
        popAt,
      };
    });

    const bits: Bit[] = [];
    for (let i = 0; i < SKINS.length; i++) {
      const b = balloons[i];
      const k = Math.min(1, (b.popAt - 0.1) / 1.9);
      const ease = 1 - Math.pow(1 - k, 2);
      const bx = b.x0 + (b.xEnd - b.x0) * ease;
      const by = b.y0 + (b.popAt - 0.1) * b.rise;
      for (let j = 0; j < PER_BALLOON; j++) {
        // Spherical directions, biased upward — the balloon was rising when it went, and the
        // debris keeps that momentum before gravity takes it.
        const a = Math.random() * Math.PI * 2;
        const e = Math.acos(2 * Math.random() - 1);
        const sp = 0.9 + Math.random() * 1.9;
        bits.push({
          bx, by,
          vx: Math.sin(e) * Math.cos(a) * sp,
          vy: Math.cos(e) * sp * 0.85 + 0.9,
          vz: Math.sin(e) * Math.sin(a) * sp * 0.4,
          spin: new THREE.Vector3(
            (Math.random() - 0.5) * 9,
            (Math.random() - 0.5) * 9,
            (Math.random() - 0.5) * 9,
          ),
          size: 0.05 + Math.random() * 0.055,
          born: b.popAt,
        });
      }
    }
    return { balloons, bits };
  }, [origin.x, origin.y, size.width, size.height]);

  useFrame((_, delta) => {
    clock.current += Math.min(delta, 0.05);
  });

  return (
    <>
      {balloons.map((b, i) => (
        <Balloon key={i} state={b} clock={clock} />
      ))}
      <Confetti bits={bits} clock={clock} />
    </>
  );
};

/* ── The host ───────────────────────────────────────────────────────────────────────────── */

export interface BalloonBurstProps {
  /** Where the pointer was when the shake was detected, in client pixels. */
  origin: { x: number; y: number };
  onDone: () => void;
}

/**
 * One run of the effect. The parent mounts this on a shake and drops it when `onDone` fires, so
 * there is no canvas and no WebGL context on the page at any other time — the same discipline the
 * buttons' cube fields use, and for the same reason.
 */
export const BalloonBurst: React.FC<BalloonBurstProps> = ({ origin, onDone }) => {
  const [revealed, setRevealed] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const a = window.setTimeout(() => setRevealed(true), REVEAL_AT * 1000);
    const b = window.setTimeout(() => setLeaving(true), BURST_MS - 700);
    const c = window.setTimeout(onDone, BURST_MS);
    return () => { window.clearTimeout(a); window.clearTimeout(b); window.clearTimeout(c); };
  }, [onDone]);

  return (
    <div
      // `aria-hidden` and no pointer events: it is a decorative reward for a mouse gesture, it
      // sits over live controls for five seconds, and it must not take a click or a screen
      // reader's place in the document while it does.
      aria-hidden="true"
      className="fixed inset-0 z-[90] pointer-events-none"
    >
      <Canvas
        orthographic
        dpr={[1, 1.75]}
        camera={{ zoom: ZOOM, position: [0, 0, 60], near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ pointerEvents: 'none' }}
      >
        <Scene origin={origin} />
      </Canvas>

      <div
        dir="ltr"
        className="absolute inset-x-0 top-[38%] flex justify-center px-6"
        style={{
          opacity: revealed && !leaving ? 1 : 0,
          transform: `scale(${revealed && !leaving ? 1 : 0.94})`,
          // Fast in, slower out: the reveal has to land with the pop, and a slow arrival would
          // trail behind the thing that caused it.
          transition: leaving
            ? 'opacity 600ms ease-in, transform 600ms ease-in'
            : 'opacity 260ms cubic-bezier(0.16,1,0.3,1), transform 420ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <span
          className="font-['Cairo'] font-black tracking-[0.18em] text-center leading-none text-[clamp(1.35rem,5vw,3.25rem)]"
          style={{
            color: INK,
            // A paper halo, not a box. The message can land over sand, paper, periwinkle or a
            // drift of dark cubes, and INK alone loses the last of those — a soft light spread
            // behind the strokes keeps it legible on all four without putting a panel on screen.
            textShadow:
              '0 0 18px rgba(246,241,233,0.95), 0 0 42px rgba(246,241,233,0.8), 0 2px 3px rgba(246,241,233,0.9)',
          }}
        >
          WELCOME TO NOVAIQ
        </span>
      </div>
    </div>
  );
};

export default BalloonBurst;
