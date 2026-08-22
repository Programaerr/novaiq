import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ButtonTones } from '../../lib/tone';

/**
 * The cube field that lives inside a button.
 *
 * Same object as the page's TileField — the same tilted grid of instanced boxes, the same
 * three-face lighting, the same accent carried on the crests — at a button's scale and driven by
 * the pointer instead of by a clock. That sameness is the point: the site's whole surface is made
 * of these cubes, and a button that lifts a handful of them under your cursor reads as the page
 * responding rather than as a widget with an effect bolted on.
 *
 * What it is NOT is a second copy of TileField. The two shaders answer different questions — the
 * page field asks "where is this cube in an endless swell", this one asks "how close is it to the
 * cursor" — and the fifteen lines they would share are not worth a common abstraction that has to
 * be told which of two completely different things it is.
 */

/* ── Geometry constants ─────────────────────────────────────────────────────────────────── */

/** Matched to TileField exactly. The cubes have to sit at the same angle as the ones in the bands
    above and below them, or the button reads as a different material. */
const TILT_X = 0.42;
const TILT_Y = -0.3;

/** Pixels per world unit, matching TileField, so a cell specified in pixels means the same thing
    in both. */
const ZOOM = 100;

/** The key direction, in the field's own space — up and across, so tops are lit and the two
    visible sides split into half light and shadow. TileField's, unchanged. */
const LIGHT = new THREE.Vector3(-0.42, 0.5, 0.76).normalize();

const COARSE: boolean =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/** A button is 44–56px tall, so the pitch is set by how many rows read across that height rather
    than by a fixed grain. Three and a bit is what makes the field read as cubes at this size:
    below two the button grows teeth, and above five the grain is finer than the label's stroke
    and the whole thing turns to noise behind the text. */
const ROWS_TARGET = 3.4;
const CELL_MIN = 9;
const CELL_MAX = 18;

/* ── The drive ──────────────────────────────────────────────────────────────────────────── */

/**
 * What the button tells the field, every frame, without re-rendering React.
 *
 * A pointermove that went through setState would re-render the button — and everything inside it —
 * at pointer rate. This is a plain mutable object the button writes and the field reads inside
 * useFrame, which is the one place per frame where reading it costs nothing.
 */
export interface TileDrive {
  /** 1 while the pointer is over the button or it holds focus, 0 otherwise. Eased inside. */
  target: number;
  /** Pointer position in the button's own box, 0..1 from the top-left. Centre when there is no
      pointer (keyboard focus), so the field lifts evenly rather than in a corner. */
  px: number;
  py: number;
  /** performance.now() of the last press, or 0. The ring is timed from this. */
  pressAt: number;
  /** Where the press landed, same 0..1 box. */
  pressX: number;
  pressY: number;
}

export const newDrive = (): TileDrive => ({
  target: 0,
  px: 0.5,
  py: 0.5,
  pressAt: 0,
  pressX: 0.5,
  pressY: 0.5,
});

/* ── The material ───────────────────────────────────────────────────────────────────────── */

function makeMaterial(cell: number, tones: ButtonTones): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: false,
    uniforms: {
      uTime: { value: 0 },
      uCell: { value: cell },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPressPt: { value: new THREE.Vector2(0, 0) },
      /** Overall presence, 0 (no field) to 1 (fully risen). Eased from the drive's target. */
      uPres: { value: 0 },
      /** Seconds since the last press; large means "no ring". */
      uPressT: { value: 99 },
      /** Radius of the pointer bulge, in world units. Set from the cell so it covers a
          consistent number of cubes at any button size. */
      uRadius: { value: cell * 2.6 },
      uTrough: { value: new THREE.Color(tones.trough) },
      uCrest: { value: new THREE.Color(tones.crest) },
      uFoam: { value: new THREE.Color(tones.foam) },
      uGround: { value: new THREE.Color(tones.ground) },
      uLight: { value: LIGHT.clone() },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uCell;
      uniform vec2  uPointer;
      uniform vec2  uPressPt;
      uniform float uPres;
      uniform float uPressT;
      uniform float uRadius;

      varying float vW;
      varying float vK;
      varying vec3  vN;

      // One stable value per cell, so the order the cubes arrive in is a property of the cube and
      // not of the frame. Without it the whole grid rises in lockstep and the button looks like a
      // rectangle inflating; with it the field assembles, which is the thing worth watching.
      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      void main() {
        vec4 centre4 = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 centre = centre4.xy;

        /* Three contributions, and each one is a different thing the button is saying.

           The drift is the button being awake — a slow, shallow motion so a field that is simply
           being hovered is not a frozen diagram. The bulge is where the cursor is, and it is the
           loudest of the three because it is the only one carrying information. The ring is the
           press: a wave leaving the point of contact, which is what makes a click feel like it
           landed on a surface rather than toggling a state. */
        float drift =
          sin(centre.x * 3.1 - uTime * 1.35) * 0.5 +
          sin((centre.x * 1.7 + centre.y * 2.4) + uTime * 0.95) * 0.5;

        float dp = distance(centre, uPointer);
        float bulge = exp(-(dp * dp) / (uRadius * uRadius));

        float dr = distance(centre, uPressPt);
        // exp(-dr) keeps the ring from re-crossing the far side of a wide button, exp(-uPressT)
        // ends it. Both are needed: distance alone leaves a ring that never stops, time alone
        // leaves one that fills the whole button at full strength on the way out.
        float ring = sin(dr * 15.0 - uPressT * 12.0) * exp(-dr * 2.6) * exp(-uPressT * 3.6);

        float w = clamp(
          (drift * 0.5 + 0.5) * 0.20 * uPres + bulge * uPres * 0.9 + ring * 0.55,
          0.0, 1.0
        );
        vW = w;

        /* How near this cube is to the edge of the button, measured after projection so it
           survives the tilt. The box is clipped by the button's own border-radius anyway, but a
           field that ran at full height straight into that clip would read as cropped wallpaper;
           shortening the outermost cubes is what makes it read as a field that ends. */
        vec4 ndc = projectionMatrix * modelViewMatrix * centre4;
        float ex = smoothstep(1.0, 0.62, abs(ndc.x));
        float ey = smoothstep(1.0, 0.55, abs(ndc.y));
        float edge = ex * ey;

        /* Presence, staggered per cube AND gated by how near the cursor is.

           The stagger alone was not enough. With presence a flat function of hover, every cube in
           the button existed the moment the pointer crossed the edge, and what the bulge then did
           was raise the middle of a field that already covered the whole pill — which reads as a
           textured button, not as something answering the cursor. Multiplying presence by
           proximity means the far cubes mostly never arrive: the floor of 0.26 leaves a thin
           scatter across the rest of the button so it is clearly one surface, and the cluster
           travels with the pointer. The ring term is what lets a press reach the corners the
           cursor never visits. */
        float local = clamp(0.26 + bulge * 0.85 + abs(ring) * 1.5, 0.0, 1.0);
        float rise = clamp((uPres * local - hash21(centre * 7.3) * 0.45) / 0.55, 0.0, 1.0);

        float k = edge * rise;
        vK = k;
        vN = normal;

        float d = mix(0.10, 0.92, w) * uCell * k;
        vec3 p = position;
        // Footprint constant in the same proportion TileField uses, narrowing as the cube leaves
        // so the ground opens up between them rather than staying a tiled floor.
        p.xy *= uCell * 0.62 * mix(0.45, 1.0, k);
        // Grown from the base, so the tops rise and the field keeps a floor.
        p.z = (p.z + 0.5) * d;

        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;

      uniform vec3 uTrough;
      uniform vec3 uCrest;
      uniform vec3 uFoam;
      uniform vec3 uGround;
      uniform vec3 uLight;

      varying float vW;
      varying float vK;
      varying vec3  vN;

      void main() {
        // A cube driven to nothing leaves rather than lying flat — otherwise the button carries a
        // full-coverage floor of zero-height quads whenever the field is on its way out, which is
        // a visible rectangle of slightly-wrong colour inside the pill.
        if (vK < 0.03) discard;

        vec3 c = mix(uTrough, uCrest, smoothstep(0.04, 0.94, vW));
        /* The page accent, on the raised cubes. On a button this is the whole tie to the page —
           without it a field derived from one fill is a set of neutral greys, and neutral grey
           next to a coloured page reads as dirt rather than as relief. Broader than the page
           field's crests-only band (0.80) because a button only ever shows a handful of cubes at
           once: reserve the accent for the very tallest and most presses never show it at all. */
        c = mix(c, uFoam, smoothstep(0.55, 1.0, vW) * 0.42);

        // Three flat values, one per visible face. The ambient floor is higher than the page
        // field's 0.72, and it has to be: the page field is a whole screen where a dark side
        // face is depth, whereas here the same face is a grey block a centimetre from a label.
        // 0.86 keeps the corner readable and keeps the field's average on the button's own fill.
        float lam = max(dot(normalize(vN), uLight), 0.0);
        c *= 0.86 + 0.22 * lam;

        // Troughs sink back into the button's own fill, so the low cubes disappear into the
        // surface instead of standing there as a grid.
        c = mix(uGround, c, mix(0.30, 1.0, vW));
        // And the last of the colour goes with the last of the height.
        c = mix(uGround, c, smoothstep(0.0, 0.55, vK));

        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
}

/* ── The field ──────────────────────────────────────────────────────────────────────────── */

const Field: React.FC<{ drive: React.RefObject<TileDrive>; tones: ButtonTones }> = ({
  drive,
  tones,
}) => {
  const size = useThree((s) => s.size);

  const cellPx = Math.round(
    Math.min(CELL_MAX, Math.max(CELL_MIN, size.height / ROWS_TARGET)),
  );
  const cell = cellPx / ZOOM;

  /* Margin rows and columns, and the tilt is what they pay for: tipping the grid shortens its
     projected width by cos(TILT_Y) and its height by cos(TILT_X), so a field sized exactly to the
     button pulls its own edges inside the pill and leaves two bare strips. */
  const cols = Math.ceil(size.width / cellPx / Math.cos(TILT_Y)) + 4;
  const rows = Math.ceil(size.height / cellPx / Math.cos(TILT_X)) + 4;
  const count = Math.max(1, cols * rows);

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(() => makeMaterial(cell, tones), [cell, tones]);
  const mesh = useRef<THREE.InstancedMesh>(null);

  const clock = useRef(0);
  const pres = useRef(0);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    let i = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dummy.position.set((x - (cols - 1) / 2) * cell, (y - (rows - 1) / 2) * cell, 0);
        dummy.updateMatrix();
        m.setMatrixAt(i++, dummy.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, [cols, rows, cell, count]);

  useFrame((_, delta) => {
    const d = drive.current;
    if (!d) return;
    const step = Math.min(delta, 0.05);
    clock.current += step;

    /* Asymmetric easing, and deliberately so. Arriving fast is the button answering; leaving
       slowly is the field settling. Swapping them — a lazy rise and a snapped exit — is what makes
       an interaction feel unresponsive even when the timings average out the same. */
    const rate = d.target > pres.current ? 9 : 4.5;
    pres.current += (d.target - pres.current) * Math.min(1, step * rate);

    const u = material.uniforms;
    u.uTime.value = clock.current;
    u.uPres.value = pres.current;

    // Screen 0..1 into the grid's own untilted space. Dividing by the cosines undoes the
    // foreshortening the tilt introduces, so the bulge sits under the cursor rather than
    // drifting away from it toward the edges.
    const wx = size.width / ZOOM;
    const wy = size.height / ZOOM;
    u.uPointer.value.set(
      ((d.px - 0.5) * wx) / Math.cos(TILT_Y),
      ((0.5 - d.py) * wy) / Math.cos(TILT_X),
    );
    u.uPressPt.value.set(
      ((d.pressX - 0.5) * wx) / Math.cos(TILT_Y),
      ((0.5 - d.pressY) * wy) / Math.cos(TILT_X),
    );
    u.uPressT.value = d.pressAt ? (performance.now() - d.pressAt) / 1000 : 99;
    u.uRadius.value = cell * 2.6;
  });

  return (
    <instancedMesh
      ref={mesh}
      // An InstancedMesh's count is fixed at construction, so a change in cube count has to
      // rebuild the mesh rather than mutate it.
      key={count}
      args={[geometry, material, count]}
      // The shader moves vertices the bounding sphere does not know about, and there is exactly
      // one object here — nothing for culling to save, and a real chance of it dropping the lot.
      frustumCulled={false}
    />
  );
};

/* ── The host ───────────────────────────────────────────────────────────────────────────── */

export interface ButtonTilesProps {
  drive: React.RefObject<TileDrive>;
  tones: ButtonTones;
}

/**
 * Mounted only while the button it belongs to is being interacted with, and unmounted a beat
 * after — see NqButton, which owns that decision.
 *
 * That policy is not a micro-optimisation, it is the only thing that makes this approach viable.
 * A WebGL context is a scarce, browser-wide resource — around sixteen of them, after which the
 * oldest is killed out from under whoever owned it. A site with a canvas permanently inside every
 * button would exhaust that on the templates page alone and take the hero's field down with it.
 * A pointer can only be in one place, so at most a couple of these exist at any moment.
 */
export const ButtonTiles: React.FC<ButtonTilesProps> = ({ drive, tones }) => (
  <span
    aria-hidden="true"
    // `span`, not `div`: this lives inside a <button>, whose content model is phrasing content.
    // Blocks in there are something browsers forgive rather than something that is allowed.
    className="absolute inset-0 block pointer-events-none"
  >
    <Canvas
      orthographic
      dpr={[1, COARSE ? 1.5 : 2]}
      camera={{ zoom: ZOOM, position: [0, 0, 60], near: 0.1, far: 200 }}
      // Alpha so the gaps between cubes show the button's own fill rather than a second copy of
      // it — the field IS the surface, and painting a background here would make it a layer.
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ pointerEvents: 'none' }}
    >
      <group rotation={[TILT_X, TILT_Y, 0]}>
        <Field drive={drive} tones={tones} />
      </group>
    </Canvas>
  </span>
);

export default ButtonTiles;
