import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_DPR } from '../lib/renderBudget';

/**
 * The hero's field: a grid of small square tiles with a swell running through it.
 *
 * ## One draw call, and no per-frame work on the CPU
 *
 * A field like this is usually built as a few thousand React elements, or as an InstancedMesh whose
 * matrices are rewritten every frame from JavaScript. Both spend the main thread on something the
 * GPU already knows how to do. Here the instance matrices are written ONCE — they only carry which
 * cell each tile belongs to — and the wave is evaluated in the vertex shader from the tile's own
 * position. Per frame the CPU updates a single float.
 *
 * ## Why the tiles are sized in PIXELS rather than in world units
 *
 * The camera is orthographic at a fixed zoom, so one world unit is a fixed number of pixels and the
 * grid can be laid out in screen terms. That is the property that matters here: a tile field whose
 * cell count is fixed gets chunky on a phone and fine on a desktop, where what you actually want is
 * the same size of tile everywhere and however many of them the screen has room for.
 *
 * ## The squares are drawn, not modelled
 *
 * Each tile is one quad, and its rounded corners come from a signed-distance field in the fragment
 * shader rather than from geometry. Rounding 1,500 quads with real corners would cost twenty times
 * the vertices; this costs four lines and antialiases itself at any size.
 *
 * NO BACKTICKS anywhere inside the shader strings below, including in prose: they are JS template
 * literals, and one backtick closes the string mid-shader. That compiles to a GLSL syntax error and
 * shows up as the field silently failing to draw.
 */

/* ── Palette ────────────────────────────────────────────────────────────────────────────── */

/* Tones of the section's own sand, plus the panel's blue on the crests only. The field has to read
   as texture on the background rather than as a second object competing with the panel, so the
   whole ramp sits within a few steps of the ground it is painted on. */
const T_TROUGH = '#C6A98F';
const T_CREST = '#EADCCC';
const T_FOAM = '#8295CF';

/** Pixels per world unit. Fixes the mapping between the screen and the scene, which is what lets
    the grid be specified in pixels below. */
const ZOOM = 100;

/** Tile pitch in CSS pixels. Smaller on a coarse pointer: a phone holds the screen closer, and the
    same pitch that reads as a texture at arm's length reads as a chequerboard at 30cm. */
const CELL_PX = MAX_DPR > 1 ? 34 : 26;

function makeFieldMaterial(cell: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    // The tiles never overlap, so there is nothing for a depth test to resolve, and writing depth
    // from a transparent material is how you get tiles punching holes in the ones behind them.
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uCell: { value: cell },
      uTrough: { value: new THREE.Color(T_TROUGH) },
      uCrest: { value: new THREE.Color(T_CREST) },
      uFoam: { value: new THREE.Color(T_FOAM) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uCell;

      varying float vW;
      varying vec2 vUv;

      // Three sines crossing at angles that share no common period, which is the whole trick to
      // water: two waves make a visibly repeating interference pattern, three do not repeat inside
      // the time anyone looks at it. The two travelling one way and one the other is what gives the
      // swell somewhere to break against instead of marching evenly across the screen.
      float swell(vec2 p) {
        float a = sin(p.x * 1.35 - uTime * 0.85);
        float b = sin((p.x * 0.72 + p.y * 1.05) - uTime * 0.55 + 1.7);
        float c = sin((p.y * 0.9 - p.x * 0.35) * 1.4 + uTime * 0.4);
        return a * 0.45 + b * 0.35 + c * 0.2;
      }

      void main() {
        // The instance matrix carries nothing but this tile's cell centre, so the wave can be
        // sampled per tile without any attribute of its own.
        vec2 centre = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xy;
        float w = swell(centre) * 0.5 + 0.5;

        vW = w;
        vUv = uv;

        // The tile GROWS with the swell rather than moving with it. Size is what survives being
        // one tile among a thousand: a few pixels of travel is invisible at this scale, where the
        // same amount of scale reads across the whole field at once.
        float s = mix(0.34, 0.92, w);
        vec3 p = vec3(position.xy * uCell * s, 0.0);

        vec4 world = instanceMatrix * vec4(p, 1.0);
        // A small lift on top of the scale. On its own it would be too subtle to see; with the
        // scale it is what stops the field reading as a grid of blinking lights.
        world.y += (w - 0.5) * uCell * 0.5;

        gl_Position = projectionMatrix * modelViewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;

      uniform vec3 uTrough;
      uniform vec3 uCrest;
      uniform vec3 uFoam;

      varying float vW;
      varying vec2 vUv;

      void main() {
        // Rounded square as a signed distance, so the corner radius costs no geometry and the edge
        // antialiases itself at whatever size the tile happens to be this frame.
        vec2 p = (vUv - 0.5) * 2.0;
        float r = 0.34;
        vec2 q = abs(p) - vec2(1.0 - r);
        float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        float a = 1.0 - smoothstep(-0.08, 0.04, sd);
        if (a <= 0.001) discard;

        vec3 c = mix(uTrough, uCrest, smoothstep(0.04, 0.94, vW));
        // The panel's blue, on the crests only. It is what ties the field to the thing sitting on
        // it — without it the two halves of the section read as two unrelated pictures.
        c = mix(c, uFoam, smoothstep(0.88, 1.0, vW) * 0.5);

        // Troughs fade rather than just shrinking, which is what gives the field depth instead of
        // a flat sheet of squares all sitting at the same distance.
        gl_FragColor = vec4(c, a * mix(0.26, 1.0, vW));
      }
    `,
  });
}

/* ── The field ──────────────────────────────────────────────────────────────────────────── */

const Field: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const cell = CELL_PX / ZOOM;
  // One extra row and column so a resize cannot expose a bare edge mid-drag.
  const cols = Math.ceil(size.width / CELL_PX) + 1;
  const rows = Math.ceil(size.height / CELL_PX) + 1;
  const count = cols * rows;

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const material = useMemo(() => makeFieldMaterial(cell), [cell]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const clock = useRef(reduced ? 12 : 0);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Written once per layout, not per frame. Everything that moves is in the shader.
  useLayoutEffect(() => {
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
    material.uniforms.uTime.value = clock.current;
    invalidate();
  }, [cols, rows, cell, count, material, invalidate]);

  useFrame((_, delta) => {
    if (reduced) return;
    // Clamped: this is the length of the pause after the loop stopped off screen, and an unclamped
    // step would integrate the whole gap in one frame and jump the swell.
    clock.current += Math.min(delta, 0.05);
    material.uniforms.uTime.value = clock.current;
    invalidate();
  });

  return (
    <instancedMesh
      ref={mesh}
      // `key` so a change in tile count rebuilds the mesh: an InstancedMesh's count is fixed at
      // construction, and R3F reconstructs on an args change rather than mutating in place.
      key={count}
      args={[geometry, material, count]}
      // The shader moves vertices the bounding sphere does not know about, and the sphere is
      // derived from instance matrices that describe points rather than tiles. Culling against it
      // can drop the whole field at certain sizes; there is one object here, so there is nothing
      // for culling to save.
      frustumCulled={false}
    />
  );
};

/* ── The host ───────────────────────────────────────────────────────────────────────────── */

export const HeroWaves: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [idle, setIdle] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: '150px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* `data-idle` is set on <html> by usePauseOffscreenWork() when the tab is backgrounded, the
     window minimised or another window takes focus. Every CSS animation on the site stops on it; a
     WebGL loop is the one thing on the page that would otherwise carry on burning frames for
     nobody, so it reads the same flag rather than keeping its own idea of who is watching. */
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIdle(root.hasAttribute('data-idle'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['data-idle'] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0" aria-hidden="true">
      {/* Kept MOUNTED and parked at frameloop='never' off screen rather than unmounted. Tearing the
          canvas down destroys the GL context, and rebuilding it costs a fresh context, a shader
          recompile and a scene rebuild on the main thread every time the hero comes back.

          Orthographic: this is a flat field seen head on, and a perspective camera would taper the
          tiles toward the edges of the screen for no reason. `antialias` off because the only edges
          in the scene are the SDF ones, which antialias themselves for free. */}
      <Canvas
        orthographic
        frameloop={reduced ? 'demand' : active && !idle ? 'always' : 'never'}
        dpr={[1, MAX_DPR]}
        camera={{ zoom: ZOOM, position: [0, 0, 10] }}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      >
        <Field reduced={reduced} />
      </Canvas>
    </div>
  );
};
