import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_DPR } from '../lib/renderBudget';

/**
 * The hero's artwork: a planet that splits open under the pointer and lets NOVAIQ's mark out.
 *
 * ## The mark is hidden by the planet, not by a flag
 *
 * The obvious way to do a reveal is to keep the logo at zero opacity and fade it up. This does not
 * do that — the mark sits inside the sphere at full size the whole time, and what hides it is that
 * the sphere is opaque and in front of it. So the reveal has no state to get wrong: the halves
 * move apart, and the logo is simply visible because there is now a way to see it. No sorting, no
 * fade, nothing to leave stuck half-transparent if a pointer event goes missing.
 *
 * ## The rotation problem this scene inherits
 *
 * A sphere lit from a fixed direction is rotationally symmetric: spin it and every frame is
 * identical to the last, so the GPU draws a still image at 60fps. The globe that used to be here
 * cost two rounds of work on exactly that.
 *
 * The fix is to split the two spaces. Lighting is computed from the VIEW-space normal, which does
 * not change as a centred sphere turns, so the lit crescent stays put the way a real planet's day
 * side does. The terrain is sampled from OBJECT-space position, which turns with the mesh. The
 * result is that the surface travels through the light instead of the light travelling with the
 * surface, and the rotation is finally visible.
 *
 * ## What it costs
 *
 * The planet turns continuously, so this canvas runs a real frame loop while the hero is on screen
 * — unlike the static mark it replaces, which drew one frame and stopped. That is the price of it
 * being a planet rather than a ball, and it is paid only while the hero is actually in view: the
 * loop is switched to 'never' the moment it is not.
 *
 * NO BACKTICKS anywhere inside the shader strings below, including in prose: they are JS template
 * literals, and one backtick closes the string mid-shader. That mistake compiles to a GLSL syntax
 * error and shows up as the object silently failing to draw.
 */

/* ── The planet ─────────────────────────────────────────────────────────────────────────── */

/** Radius. The mark inside spans 1.105 at its tallest, so anything under about 1.2 would leave the
    braces poking through the shell before it ever opened. */
const PLANET_RADIUS = 1.28;
/** The two body tones. Terrain is a mix between them, so they are the whole surface palette. */
const PLANET_DEEP = '#161A24';
const PLANET_LAND = '#5A6478';
/** The limb. Cool and bright — this is the atmosphere catching light at a grazing angle, which is
    the one part of a planet that is genuinely brighter than the ground under it. */
const PLANET_ATMO = '#9FC0FF';
/** The inside of the shell, seen once it opens. Almost black: a hollow object whose interior is as
    bright as its exterior reads as two curved plates, not as something that was closed. */
const PLANET_INNER = '#0A0C12';

/** Radians per second. Slow — a planet that visibly spins is a beach ball. */
const SPIN_RATE = 0.075;

/* ── The mark inside ────────────────────────────────────────────────────────────────────── */

/* Glass, and the ramp is built the way glass behaves rather than the way metal does. A metal is
   brightest facing the light and keeps its colour in the midtones; glass washes its flat faces out
   to near-white because light passes through them, and piles its colour into the EDGES, where
   light travelling inside cannot escape a shallow angle. Hence a pale body and two loud terms —
   the rim and the transmission glow — doing the real work in the shader. */
const C0_ABYSS = '#12141C';
const C1_SLATE = '#39404F';
const C2_STEEL = '#7E8899';
const C3_PALE = '#CFD8E6';
const C4_WHITE = '#FFFFFF';
const RIM_COLOR = '#EAF2FF';
const GLOW_COLOR = '#9FC0FF';

/** Same light for planet and mark. They are one object seen at one moment; two light directions
    would read as the logo being a sticker on a photograph. */
const LIGHT = new THREE.Vector3(-0.42, 0.8, 0.43).normalize();

/** Stroke radius of the braces, against their own half-height of 1. */
const STROKE = 0.105;
/** How far each brace sits from the centre line, set from the inner edge: the arms reach x = 0.48,
    so 0.70 leaves 0.44 of clear air down the middle. */
const BRACE_X = 0.7;
/**
 * The mark's resting scale inside the shell, and how much it grows on the way out.
 *
 * The binding constraint is NOT the closed shell, which is the one that looks like it should be:
 * at 1.28 radius, anything up to scale 1.16 fits inside it. It is the GAP. The two halves part by
 * OPEN_TOP + OPEN_BOTTOM = 1.55, and the mark is 2.21 tall at scale 1 — so past scale 0.70 its
 * crown and its feet are still inside the two bowls when the planet is fully open, and the reveal
 * shows the middle of a logo with both ends swallowed.
 *
 * 0.46 + 0.20 = 0.66 open, which is 1.46 tall against 1.55 of gap. The first build had it at 0.88
 * and that is exactly what it looked like: a logo peering out of a clamshell.
 */
const MARK_SCALE = 0.46;
const MARK_GROWTH = 0.2;
/** The orbit ring around the mark. */
const RING_RADIUS = 1.02;

/* ── The split ──────────────────────────────────────────────────────────────────────────── */

/** How far each half travels. The top goes further than the bottom, which is what makes it read as
    a lid being lifted rather than as an object pulled apart in a vacuum — the heavier half stays
    put and the lighter one leaves. */
const OPEN_TOP = 1.05;
const OPEN_BOTTOM = 0.5;
/** The tilt the lid takes as it rises. Small, but it is what stops the two halves reading as one
    shape cut in two and sliding on rails. */
const OPEN_TILT = 0.16;
/** Damping rate. 6 settles in a little under a second — slow enough to watch the shell open. */
const HOVER_DAMP = 6;

function makeBraceCurve(mirrored: boolean): THREE.CatmullRomCurve3 {
  const sign = mirrored ? -1 : 1;
  const points: [number, number][] = [
    // The top arm runs FLAT before it turns down, which is what makes this read as a typographic
    // brace rather than a bent wire — a spline given only the corner and the tip rounds that off.
    [0.48, 1.0],
    [0.32, 1.0],
    [0.19, 0.94],
    [0.13, 0.8],
    // The stem, sampled twice down its length so the spline holds it straight rather than bowing
    // it between the corners at either end.
    [0.13, 0.5],
    [0.13, 0.26],
    // The nub: the brace's waist, and the only part that crosses to the far side of the stem.
    [0.01, 0.13],
    [-0.14, 0.0],
    [0.01, -0.13],
    // Mirrored back down, so the curve is symmetric about y = 0 by construction, not by hand.
    [0.13, -0.26],
    [0.13, -0.5],
    [0.13, -0.8],
    [0.19, -0.94],
    [0.32, -1.0],
    [0.48, -1.0],
  ];
  return new THREE.CatmullRomCurve3(
    points.map(([x, y]) => new THREE.Vector3(x * sign, y, 0)),
    false,
    // Centripetal: uniform parameterisation overshoots at the tight corners of the nub and puts a
    // visible kink in the stroke.
    'centripetal',
    0.5,
  );
}

function makePlanetMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    // The halves are open shells, so the inside is visible the moment they part.
    side: THREE.DoubleSide,
    uniforms: {
      uDeep: { value: new THREE.Color(PLANET_DEEP) },
      uLand: { value: new THREE.Color(PLANET_LAND) },
      uAtmo: { value: new THREE.Color(PLANET_ATMO) },
      uInner: { value: new THREE.Color(PLANET_INNER) },
      uLight: { value: LIGHT.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vView;
      varying vec3 vWorldN;
      varying vec3 vWorld;
      varying vec3 vObj;

      void main() {
        // Two normals on purpose. vView is the LIGHTING normal and does not change as a centred
        // sphere turns; vWorldN is for the limb, which needs the real direction to the camera —
        // and that needs the world POSITION as well, not just a normal.
        vView = normalize(normalMatrix * normal);
        vWorldN = normalize(mat3(modelMatrix) * normal);
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        // Object space, so the terrain is fixed to the mesh and travels with the rotation.
        vObj = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform vec3 uDeep;
      uniform vec3 uLand;
      uniform vec3 uAtmo;
      uniform vec3 uInner;
      uniform vec3 uLight;

      varying vec3 vView;
      varying vec3 vWorldN;
      varying vec3 vWorld;
      varying vec3 vObj;

      // Multiply-and-fract, not fract(sin(dot(...))). The sine version reads the low bits of a very
      // large number and mediump mobile GPUs cannot keep them apart — it bands into visible stripes
      // on exactly the phones this has to look right on.
      float hash31(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float vnoise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash31(i), hash31(i + vec3(1, 0, 0)), f.x),
              mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), f.x), f.y),
          mix(mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), f.x),
              mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), f.x), f.y),
          f.z);
      }

      // Four octaves. Three leaves the coastlines visibly smooth and five costs more than it shows
      // at this size. The 2.03 rather than a flat 2.0 is deliberate — doubling exactly lines the
      // octaves' grids up and leaves a faint square lattice across the surface.
      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * vnoise(p);
          p *= 2.03;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 n = normalize(vView);

        // Half-Lambert. A raw clamped dot drops to zero across the whole terminator and puts a hard
        // black band round the planet; the remap keeps a gradient going into the night side.
        float lit = dot(n, uLight) * 0.5 + 0.5;
        // Biased toward the dark end — a planet is mostly night, and this is the number that
        // decides whether it reads as a world or as a grey ball with a light on it. 2.2 rather
        // than the 2.6 this started at: at 2.6 the terrain was there and unreadable, and a planet
        // nobody can see the surface of is a silhouette.
        float k = pow(lit, 2.2);

        float terrain = fbm(vObj * 2.4);
        vec3 c = mix(uDeep, uLand, smoothstep(0.42, 0.63, terrain));
        c *= 0.10 + 1.25 * k;

        // The limb. GATED by the light term, unlike the mark's: ungated, a fresnel outlines the
        // whole disc including the night side, and the planet turns into a glowing hoop with no
        // sense of a light direction at all. Gated, it is a crescent of atmosphere on the day
        // side, which is what a lit planet actually shows.
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - abs(dot(viewDir, normalize(vWorldN))), 3.0);
        c += uAtmo * fres * k * 0.9;

        // The inside of the shell, once it is open. Dark, and lit only faintly, so the cavity reads
        // as a cavity rather than as the outside of a second object.
        if (!gl_FrontFacing) {
          c = uInner * (0.35 + 0.8 * k) + uAtmo * 0.05;
        }

        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
}

function makeMarkMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uC0: { value: new THREE.Color(C0_ABYSS) },
      uC1: { value: new THREE.Color(C1_SLATE) },
      uC2: { value: new THREE.Color(C2_STEEL) },
      uC3: { value: new THREE.Color(C3_PALE) },
      uC4: { value: new THREE.Color(C4_WHITE) },
      uRim: { value: new THREE.Color(RIM_COLOR) },
      uGlow: { value: new THREE.Color(GLOW_COLOR) },
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
      uniform vec3 uGlow;
      uniform vec3 uLight;

      varying vec3 vNormal;
      varying vec3 vWorld;

      void main() {
        vec3 n = normalize(vNormal);
        vec3 view = normalize(cameraPosition - vWorld);

        float lit = dot(n, uLight) * 0.5 + 0.5;
        // Biased the OTHER WAY from the planet's 2.6. A planet is meant to be mostly in shadow; a
        // logo is meant to be read, so most of the lit side lands in the pale end here.
        float k = pow(lit, 1.1);

        // Wide, overlapping stops. Glass scatters, so it has no hard terminator anywhere on it;
        // tighten these and the same five colours read as painted chrome.
        vec3 c = uC0;
        c = mix(c, uC1, smoothstep(0.02, 0.34, k));
        c = mix(c, uC2, smoothstep(0.24, 0.56, k));
        c = mix(c, uC3, smoothstep(0.46, 0.82, k));
        c = mix(c, uC4, smoothstep(0.72, 1.00, k));

        // Light coming THROUGH the body — the term that separates glass from paint. A solid object
        // is darkest where it faces away from the light; a translucent one glows there, because
        // that is the face light leaves by after crossing the material.
        float through = pow(max(dot(n, -uLight), 0.0), 1.6);
        c += uGlow * through * 0.30;

        // The light piping. On glass this is the headline rather than a finish: light inside the
        // body cannot escape at a shallow angle, so it piles up wherever the surface turns away.
        // Ungated by the light term, which on a thin tube is also what keeps the stroke's edges
        // defined against a dark ground from every angle.
        float fres = pow(1.0 - abs(dot(view, n)), 3.4);
        c += uRim * fres * 0.8;

        // One hard specular. Everything above is soft, and soft alone reads as wax.
        vec3 halfway = normalize(uLight + view);
        c += vec3(1.0) * pow(max(dot(n, halfway), 0.0), 84.0) * 0.55;

        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
}

function Scene({ hovered }: { hovered: boolean }) {
  const planetMaterial = useMemo(makePlanetMaterial, []);
  const markMaterial = useMemo(makeMarkMaterial, []);
  const leftBrace = useMemo(() => makeBraceCurve(false), []);
  const rightBrace = useMemo(() => makeBraceCurve(true), []);

  const spin = useRef<THREE.Group>(null);
  const topHalf = useRef<THREE.Group>(null);
  const bottomHalf = useRef<THREE.Group>(null);
  const mark = useRef<THREE.Group>(null);

  /** 0 closed, 1 fully open. A ref, not state: it changes every frame while the shell moves, and
      routing that through React would re-render the tree to move one number. */
  const amount = useRef(0);
  const clock = useRef(0);

  const invalidate = useThree((s) => s.invalidate);

  // GPU resources React does not own, released explicitly. R3F disposes what it made from JSX.
  useEffect(
    () => () => {
      planetMaterial.dispose();
      markMaterial.dispose();
    },
    [planetMaterial, markMaterial],
  );

  useFrame((_, delta) => {
    // Clamped: this is the length of the pause after the loop stopped off-screen, and an unclamped
    // step would integrate the whole gap in one frame and snap the planet round.
    const dt = Math.min(delta, 0.05);
    clock.current += dt;

    if (spin.current) spin.current.rotation.y = clock.current * SPIN_RATE;

    const target = hovered ? 1 : 0;
    // Exponential damping as a fraction of the remaining distance per second, so the shell opens
    // at the same rate on a 60Hz and a 144Hz screen.
    const k = 1 - Math.exp(-dt * HOVER_DAMP);
    amount.current += (target - amount.current) * k;
    const a = amount.current;

    if (topHalf.current) {
      topHalf.current.position.y = a * OPEN_TOP;
      topHalf.current.rotation.z = a * OPEN_TILT;
    }
    if (bottomHalf.current) {
      bottomHalf.current.position.y = -a * OPEN_BOTTOM;
      bottomHalf.current.rotation.z = -a * OPEN_TILT * 0.5;
    }
    if (mark.current) {
      const s = MARK_SCALE + a * MARK_GROWTH;
      mark.current.scale.setScalar(s);
      mark.current.position.y = a * 0.16;
    }

    // The planet turns for as long as it is drawn, so this asks for the next frame every frame.
    // The gate is the canvas's own frameloop, which is switched off entirely when the hero leaves
    // the screen — not a condition tested in here.
    invalidate();
  });

  const braces: { curve: THREE.CatmullRomCurve3; x: number }[] = [
    { curve: leftBrace, x: -BRACE_X },
    { curve: rightBrace, x: BRACE_X },
  ];

  return (
    <group>
      {/* The mark, drawn FIRST and hidden by nothing but the shell around it. While the planet is
          closed this is entirely inside an opaque sphere, so it cannot be seen — which is why the
          reveal needs no opacity to animate and cannot get stuck half-faded. */}
      <group ref={mark} scale={MARK_SCALE}>
        {braces.map(({ curve, x }, i) => (
          <group key={i} position={[x, 0, 0]}>
            <mesh material={markMaterial}>
              {/* 128 along the path: the nub is a tight reversal and a coarser sweep facets it into
                  a corner. 10 around is plenty for a stroke this thin. */}
              <tubeGeometry args={[curve, 128, STROKE, 10, false]} />
            </mesh>
            {/* Caps. TubeGeometry builds an OPEN pipe, so without these you see straight down the
                hollow inside of every stroke. */}
            {[0, 1].map((end) => {
              const p = curve.getPoint(end);
              return (
                <mesh key={end} position={[p.x, p.y, p.z]} material={markMaterial}>
                  <sphereGeometry args={[STROKE, 12, 8]} />
                </mesh>
              );
            })}
          </group>
        ))}

        {/* The orbit ring, at the artwork's own diagonal. Rotations apply in XYZ order, so the Z
            term lands last and tips the finished ellipse in the screen plane, which is where that
            diagonal actually lives. */}
        <mesh rotation={[Math.PI / 2 - 0.38, 0, 0.44]} material={markMaterial}>
          <torusGeometry args={[RING_RADIUS, STROKE * 0.55, 10, 180]} />
        </mesh>
      </group>

      {/* The shell. Only this turns — the mark inside stays upright, because a logo that rotates
          with its container is a logo you cannot read for most of every revolution. */}
      <group ref={spin}>
        {/* Split at the equator. `thetaStart`/`thetaLength` cut the sphere by latitude, which is
            the seam that reads as a lid; cutting by longitude (phi) gives two halves that part
            sideways and look like a broken egg rather than an opened one. */}
        <group ref={topHalf}>
          <mesh material={planetMaterial}>
            <sphereGeometry args={[PLANET_RADIUS, 64, 40, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </group>
        <group ref={bottomHalf}>
          <mesh material={planetMaterial}>
            <sphereGeometry
              args={[PLANET_RADIUS, 64, 40, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export const HeroPlanet: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting);
        // Scrolling away with the pointer still on it would otherwise leave the planet stuck open,
        // and it would be found that way on the way back.
        if (!entry.isIntersecting) setHovered(false);
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /**
   * Hover, from the pointer's POSITION rather than from it landing on this element.
   *
   * `onPointerEnter` on the host was tried and never fired once: this sits at `z-index: 0` and the
   * hero's copy column is `z-10` and full width, so the copy is stacked over it across its whole
   * area — `elementFromPoint` at this element's own centre returns the text. No amount of
   * `pointer-events` changes that, and the copy has to stay on top because it is what people read.
   *
   * So the listener goes on the hero SECTION, which contains both, and asks a geometric question
   * instead of a hit-testing one. For a planet that is also the more honest target: the element is
   * square and the object in it is a circle.
   *
   * Gated on `(hover: hover)`. Touch fires pointermove on tap, and a tap that opens the planet and
   * leaves it open until the next tap elsewhere is not a hover, it is a stuck state.
   */
  useEffect(() => {
    const el = hostRef.current;
    const section = el?.closest('section');
    if (!el || !section) return;
    if (!window.matchMedia('(hover: hover)').matches) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      // The planet fills about 0.4 of the box across (2·1.28 units of 3.23 visible, halved). A
      // little over that, because a target ending exactly at the ink edge feels like it is failing
      // whenever the pointer is a few pixels out.
      const reach = r.width * 0.44;
      setHovered(dx * dx + dy * dy <= reach * reach);
    };
    const onLeave = () => setHovered(false);

    section.addEventListener('pointermove', onMove);
    section.addEventListener('pointerleave', onLeave);
    return () => {
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={hostRef} className="hero-mark" aria-hidden="true">
      {/* Kept MOUNTED and parked at frameloop="never" off screen, rather than unmounted. Tearing
          the canvas down destroys the GL context and rebuilding it costs a fresh context, a shader
          recompile and a scene rebuild on the main thread every time the hero scrolls back. */}
      <Canvas
        frameloop={active ? 'always' : 'never'}
        dpr={[1, MAX_DPR]}
        // At fov 45 the visible height at the origin is 2·dist·tan(22.5°); 3.9 gives 3.2314 units.
        camera={{ position: [0, 0, 3.9], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        {/* The figure that has to fit is the OPEN planet, not the closed one. The lid rises 1.05,
            so its crown reaches 1.28 + 1.05 = 2.33 at full extension against 1.6157 of half-height
            — 0.66 brings that to 1.54, inside with room for the limb glow.

            That also means the CLOSED planet is 1.69 across on a 3.23 canvas, or 0.52 of the box
            rather than the 0.69 the mark it replaced used. `.hero-mark` in index.css states that
            ratio as a contract; it is updated there to match. The direction is the safe one — the
            art is smaller in the same box, so the phone band it has to fit gains clearance rather
            than losing it. */}
        <group scale={0.66}>
          <Scene hovered={hovered} />
        </group>
      </Canvas>
    </div>
  );
};
