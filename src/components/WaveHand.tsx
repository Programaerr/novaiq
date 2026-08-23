import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PERIWINKLE, SAND_DEEP, SAND_LIGHT } from '../lib/homePalette';

/**
 * Shake the mouse left and right and a hand comes up beside the cursor and waves back.
 *
 * It is built out of the site's own cubes — the same tilted, three-face-lit blocks as the hero,
 * the section bands and every button — rather than modelled or drawn. That is not a shortcut. A
 * smooth 3D hand, or an SVG one, would be the only object on this site made of something else,
 * and the joke reads better when the page waves at you in its own material.
 *
 * SAND is the skin, which is a coincidence worth taking: `#D5BDAC` is the ground this whole site
 * is painted on AND a plausible hand. The crests carry PERIWINKLE like every other cube here.
 */

/* ── Constants ──────────────────────────────────────────────────────────────────────────── */

/** Pixels per world unit, matching TileField and ButtonTiles. */
const ZOOM = 100;

/**
 * Much shallower than the cube fields' 0.42 / -0.3, and it has to be.
 *
 * The fields are a surface seen from above, where a steep tilt is what opens the tops of the
 * cubes and makes the swell readable. This is a SHAPE, and the shape is the whole message — at
 * the fields' angle the silhouette skews far enough that the fingers stop lining up and the
 * thing reads as a pile of blocks. Just enough tilt to keep three faces on every cube.
 */
const TILT_X = 0.16;
const TILT_Y = -0.1;

/** The key direction, shared with every other cube on the site. */
const LIGHT = new THREE.Vector3(-0.42, 0.5, 0.76).normalize();

/** Cube pitch, CSS px. Six across and eight up, so the hand is 132 x 176. */
const CELL = 22;

/**
 * The hand, on a grid, wrist at the bottom.
 *
 * Read it as a picture: three fingers with a clear column of nothing between them, a thumb out
 * to the left two rows down, a palm, and one cube of wrist to rotate around.
 *
 * The gaps in the finger rows are not decoration. The first version ran the fingers together as
 * a solid block on the theory that the render already draws each cube with space around it —
 * and it does, but a 3x2 block of cubes reads as a block of cubes, not as fingers. An empty
 * COLUMN is what separates them. Three fingers rather than four for the same reason: four needs
 * eight columns to keep its gaps, and at that width the hand stops being a hand and becomes a
 * wall.
 */
const HAND = [
  '.#.#.#',
  '.#.#.#',
  '.#####',
  '######',
  '#####.',
  '.####.',
  '.###..',
  '..#...',
];

/** Where the wrist is in grid coordinates — the point the wave rotates about. */
const PIVOT_COL = 2;

const CELLS: Array<[number, number]> = [];
for (let r = 0; r < HAND.length; r++) {
  for (let c = 0; c < HAND[r].length; c++) {
    // Rows are written top-down and the scene is y-up, so the row index is flipped.
    if (HAND[r][c] === '#') CELLS.push([c - PIVOT_COL, HAND.length - 1 - r]);
  }
}

/** How long the whole thing lasts, ms. A wave is short — three passes and it is gone. */
export const WAVE_MS = 2600;

/* ── The hand ───────────────────────────────────────────────────────────────────────────── */

function handMaterial(): THREE.ShaderMaterial {
  /* The site's own three-step sand ramp rather than `buttonTones`, which is tuned to sit quietly
     inside a button and comes out too narrow here — the hand has to be an OBJECT on top of the
     page, and over the sand ground a narrow ramp is a smudge. SAND_DEEP to SAND_LIGHT is the
     same pair the hero's field already uses for its trough and crest. */
  const tones = {
    trough: SAND_DEEP,
    crest: SAND_LIGHT,
    foam: PERIWINKLE,
  };
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTrough: { value: new THREE.Color(tones.trough) },
      uCrest: { value: new THREE.Color(tones.crest) },
      uFoam: { value: new THREE.Color(tones.foam) },
      uLight: { value: LIGHT.clone() },
      uAlpha: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aHeight;
      varying vec3  vN;
      varying float vH;
      void main() {
        vN = normal;
        vH = aHeight;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform vec3  uTrough;
      uniform vec3  uCrest;
      uniform vec3  uFoam;
      uniform vec3  uLight;
      uniform float uAlpha;
      varying vec3  vN;
      varying float vH;

      void main() {
        if (uAlpha <= 0.004) discard;
        vec3 c = mix(uTrough, uCrest, vH);
        // The accent on the tallest cubes — the fingertips — which is where the eye goes.
        c = mix(c, uFoam, smoothstep(0.72, 1.0, vH) * 0.34);
        // Three flat values, one per visible face. The same corner that makes the page's fields
        // read as solid is what stops this reading as a flat pixel-art sprite.
        float lam = max(dot(normalize(vN), uLight), 0.0);
        c *= 0.80 + 0.30 * lam;
        gl_FragColor = vec4(c, uAlpha);
      }
    `,
  });
}

const Hand: React.FC<{ origin: { x: number; y: number } }> = ({ origin }) => {
  const size = useThree((s) => s.size);
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const clock = useRef(0);

  const material = useMemo(handMaterial, []);

  /* Geometry, the per-cube heights, and the layout — all fixed, all built once. Nothing about
     this hand changes shape while it waves; only the group it lives in rotates. */
  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const heights = new Float32Array(CELLS.length);
    const top = HAND.length - 1;
    for (let i = 0; i < CELLS.length; i++) {
      // Up the hand is "further from the wrist", which is what the colour ramp follows.
      heights[i] = CELLS[i][1] / top;
    }
    g.setAttribute('aHeight', new THREE.InstancedBufferAttribute(heights, 1));
    return g;
  }, []);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  const cell = CELL / ZOOM;

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < CELLS.length; i++) {
      const [cx, cy] = CELLS[i];
      dummy.position.set(cx * cell, cy * cell, 0);
      // A hair under the pitch, so the gap between cubes is what separates the fingers.
      dummy.scale.setScalar(cell * 0.78);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [cell]);

  /* Where the wrist sits, in world units. Offset up and to one side of the pointer so the hand
     stands BESIDE the cursor rather than under it, then clamped so a shake in a corner still
     waves somewhere you can see it. */
  const place = useMemo(() => {
    const w = size.width / ZOOM;
    const h = size.height / ZOOM;
    const handW = 6 * cell;
    const handH = HAND.length * cell;
    const x = origin.x / ZOOM - w / 2 + 0.34;
    const y = h / 2 - origin.y / ZOOM + 0.1;
    return {
      x: Math.min(w / 2 - handW * 0.7, Math.max(-w / 2 + handW * 0.7, x)),
      y: Math.min(h / 2 - handH - 0.1, Math.max(-h / 2 + 0.2, y)),
    };
  }, [origin.x, origin.y, size.width, size.height, cell]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const t = (clock.current += Math.min(delta, 0.05));
    const life = WAVE_MS / 1000;

    /* Arrival: up from nothing with a small overshoot, so it reads as being raised rather than
       switched on. 220ms, which is inside the 150–300ms a UI gesture is allowed. */
    const inK = Math.min(1, t / 0.22);
    const grow = 1 - Math.pow(1 - inK, 3);
    const overshoot = inK < 1 ? 1 + Math.sin(inK * Math.PI) * 0.14 : 1;

    // Leaving is faster than arriving, which is the rule for anything dismissing itself.
    const outStart = life - 0.42;
    const outK = t > outStart ? Math.min(1, (t - outStart) / 0.42) : 0;

    /* The wave itself: two and a bit passes, inside an envelope that starts and ends at rest.
       Without the envelope the hand snaps to full tilt on the first frame and stops mid-swing on
       the last, which reads as a glitch rather than a greeting. */
    const wt = Math.max(0, t - 0.18);
    const env = Math.sin(Math.min(1, wt / (life - 0.6)) * Math.PI);
    g.rotation.z = Math.sin(wt * Math.PI * 2 * 1.15) * 0.34 * env;

    g.position.set(place.x, place.y + outK * 0.22, 0);
    g.scale.setScalar(grow * overshoot * (1 - outK * 0.25));
    material.uniforms.uAlpha.value = Math.min(grow, 1 - outK);
  });

  return (
    <group ref={group} scale={0}>
      <instancedMesh
        ref={mesh}
        args={[geometry, material, CELLS.length]}
        frustumCulled={false}
      />
    </group>
  );
};

/* ── The host ───────────────────────────────────────────────────────────────────────────── */

export interface WaveHandProps {
  /** Where the pointer was when the shake was detected, in client pixels. */
  origin: { x: number; y: number };
  onDone: () => void;
}

/**
 * One wave. Mounted on a shake and dropped when `onDone` fires, so there is no canvas and no
 * WebGL context on the page at any other time — the same discipline the buttons' cube fields
 * use, and for the same reason: contexts are a scarce browser-wide resource.
 */
export const WaveHand: React.FC<WaveHandProps> = ({ origin, onDone }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, WAVE_MS);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div
      // Decorative, and it sits over live controls for two seconds: it must not take a click or
      // a place in the accessibility tree while it does.
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
        <group rotation={[TILT_X, TILT_Y, 0]}>
          <Hand origin={origin} />
        </group>
      </Canvas>
    </div>
  );
};

export default WaveHand;
