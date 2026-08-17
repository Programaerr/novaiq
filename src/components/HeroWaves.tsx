import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * The hero's field: a grid of CUBES standing on a tilted plane, with a swell running through it.
 * Each cube's height is the wave at its own cell, so the surface reads as water made of blocks.
 *
 * ## One draw call, and no per-frame work on the CPU
 *
 * A field like this is usually built as a few thousand React elements, or as an InstancedMesh whose
 * matrices are rewritten every frame from JavaScript. Both spend the main thread on something the
 * GPU already knows how to do. Here the instance matrices are written ONCE — they only carry which
 * cell each cube belongs to — and the wave is evaluated in the vertex shader from the cube's own
 * position. Per frame the CPU updates a single float.
 *
 * ## The grid is screen-aligned and then TILTED, rather than laid on the floor
 *
 * The obvious way to stand cubes up is to put the grid on the ground plane and look at it from an
 * isometric angle. That framing costs a great deal on a phone: a tall narrow viewport looking along
 * a floor needs the grid to run far into the distance to reach the top of the screen, and the cube
 * count roughly triples for a portrait screen that can afford it least.
 *
 * So the grid stays aligned to the screen and the whole field is tilted toward the viewer instead.
 * An orthographic camera does not foreshorten, so a tilt of about 24 degrees is enough to open the
 * tops and one side of every cube — which is all it takes to read as solid — while the coverage
 * cost is 1/cos(24°), about nine per cent, rather than a factor of three.
 *
 * ## Why the cubes are sized in PIXELS rather than in world units
 *
 * The camera is orthographic at a fixed zoom, so one world unit is a fixed number of pixels and the
 * grid can be laid out in screen terms. That is the property that matters here: a field whose cell
 * COUNT is fixed gets chunky on a phone and fine on a desktop, where what you actually want is the
 * same size of cube everywhere and however many of them the screen has room for.
 *
 * ## Shading is six flat tones, and that is the point
 *
 * A box's normals are axis-aligned, so a plain lambert term against a fixed light resolves to one
 * tone per face — top bright, one side mid, one side dark. No gradients, no specular: the thing
 * that makes a cube read as a cube is three flat faces meeting at a corner, and anything smoother
 * fights that.
 *
 * NO BACKTICKS anywhere inside the shader strings below, including in prose: they are JS template
 * literals, and one backtick closes the string mid-shader. That compiles to a GLSL syntax error and
 * shows up as the field silently failing to draw.
 */

/* ── Palette ────────────────────────────────────────────────────────────────────────────── */

/* Tones of the section's own sand, plus the panel's blue on the crests only. The field has to read
   as texture on the background rather than as a second object competing with the panel, so the
   whole ramp sits within a few steps of the ground it is painted on. */
const T_TROUGH = '#CDB49C';
const T_CREST = '#F3E8DC';
const T_FOAM = '#8295CF';
/** The section's own ground, which the troughs sink back into. Kept in step with SAND in
    HomeHero.tsx — if that changes, this follows, or the field stops meeting its background. */
const T_SAND = '#D5BDAC';

/** Key direction, in the field's own space. Up and across, so the tops are the lit faces and the
    two visible sides split into half light and shadow. */
const LIGHT = new THREE.Vector3(-0.42, 0.5, 0.76).normalize();

/** How far the whole field is tipped toward the viewer, in radians. Enough to open the tops and one
    side of every cube; more than about 0.5 and the far rows start hiding behind the near ones. */
const TILT_X = 0.42;
const TILT_Y = -0.3;

/**
 * The pixel-ratio ceiling this canvas renders at.
 *
 * A phone reports a devicePixelRatio of 2 or 3. Rendering at 2x means four times the fragments and
 * at 3x nine times, on the device with the least GPU to spend and the only one that gets hot in
 * someone's hand — and it is the least visible, because the scene is flat tiles with no fine detail
 * for the extra pixels to resolve. So a coarse pointer (a touch screen) is capped at 1, and a mouse
 * — which means a desktop, with the headroom and a screen you sit close enough to see aliasing on —
 * keeps 1.5.
 *
 * This was a shared module while the site had three canvases on it. It has one, so the constant
 * lives with its only consumer; if a second scene ever appears it belongs back in lib/ rather than
 * copied into a second file.
 *
 * Evaluated once at module load rather than per render: matchMedia is a layout-adjacent read and
 * the answer cannot change without a new device. Guarded for the build, where window does not exist
 * and the value is never used anyway.
 */
const MAX_DPR: number =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? 1 : 1.5;

/** Pixels per world unit. Fixes the mapping between the screen and the scene, which is what lets
    the grid be specified in pixels below. */
const ZOOM = 100;

/** Tile pitch in CSS pixels. Smaller on a coarse pointer: a phone holds the screen closer, and the
    same pitch that reads as a texture at arm's length reads as a chequerboard at 30cm. */
const CELL_PX = MAX_DPR > 1 ? 46 : 34;

function makeFieldMaterial(cell: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    // Solid now, where the flat version was transparent. Cubes genuinely overlap each other on
    // screen, so the depth buffer is doing real work and there is nothing left to blend.
    transparent: false,
    uniforms: {
      uTime: { value: 0 },
      uCell: { value: cell },
      uTrough: { value: new THREE.Color(T_TROUGH) },
      uCrest: { value: new THREE.Color(T_CREST) },
      uFoam: { value: new THREE.Color(T_FOAM) },
      uSand: { value: new THREE.Color(T_SAND) },
      uLight: { value: LIGHT.clone() },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uCell;

      varying float vW;
      varying vec3 vN;

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
        // The instance matrix carries nothing but this cube's cell centre, so the wave can be
        // sampled per cube without any attribute of its own.
        vec2 centre = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xy;
        float w = swell(centre) * 0.5 + 0.5;

        vW = w;
        // Axis-aligned box normals survive a non-uniform axis-aligned scale unchanged in direction,
        // so the geometry's own normal is the right one to light with — no normal matrix needed,
        // and lighting in object space keeps the light fixed to the field rather than to the screen.
        vN = normal;

        // The FOOTPRINT is constant and the HEIGHT carries the wave. The flat version varied the
        // footprint because that was the only dimension it had; a cube that changes width as well
        // as height reads as a grid of objects breathing, where a cube field with one moving
        // dimension reads as a surface. A gap of 0.16 of a cell is what keeps them individual
        // blocks rather than a continuous extruded sheet.
        // Under a cell tall at the crest, and that ceiling is the difference between a sea and a
        // brick wall. Tall blocks on a tilted plane hide the ones behind them, so the swell stops
        // being visible as a surface and the field flattens into a texture of pillars — which is
        // exactly what 1.7 cells looked like. Keeping the tallest cube shorter than its own
        // footprint means every row can still be seen over.
        float d = mix(0.08, 0.86, w) * uCell;
        vec3 p = position;
        // Under two thirds of the cell, so a third of the ground shows between neighbours. At 0.8
        // the side faces of a tilted grid close every gap and the field fuses into one corrugated
        // sheet — the cubes stop being countable, which is the only thing making them cubes.
        p.xy *= uCell * 0.62;
        // Grown from the base rather than about the centre, so the tops rise and the field keeps a
        // floor. Scaling about the centre sinks the trough cubes through the plane they stand on.
        p.z = (p.z + 0.5) * d;

        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;

      uniform vec3 uTrough;
      uniform vec3 uCrest;
      uniform vec3 uFoam;
      uniform vec3 uSand;
      uniform vec3 uLight;

      varying float vW;
      varying vec3 vN;

      void main() {
        vec3 c = mix(uTrough, uCrest, smoothstep(0.04, 0.94, vW));
        // The panel's blue, on the crests only. It is what ties the field to the thing sitting on
        // it — without it the two halves of the section read as two unrelated pictures.
        c = mix(c, uFoam, smoothstep(0.86, 1.0, vW) * 0.55);

        // One tone per face. A box has six normals and three of them ever face the camera, so this
        // resolves to exactly three flat values — the top lit, one side in half light, one in
        // shadow. That corner is the whole reason the field reads as solid rather than printed.
        // The ambient floor is high on purpose. A textbook 0.2 gives the shaded faces real contrast
        // and drags the whole field several steps darker than the sand it stands on, which turns a
        // sand-coloured section brown. Lifting the floor keeps the three faces distinguishable
        // while the field's average stays where the background is.
        float lam = max(dot(normalize(vN), uLight), 0.0);
        c *= 0.72 + 0.4 * lam;

        // Troughs sink toward the ground they stand on instead of just being short. Without it the
        // low cubes are still full-strength colour and the field looks like a bar chart; with it
        // the swell fades into the sand at its edges the way spent water does.
        c = mix(uSand, c, mix(0.35, 1.0, vW));

        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
}

/* ── The field ──────────────────────────────────────────────────────────────────────────── */

const Field: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const cell = CELL_PX / ZOOM;
  /* Margin rows and columns, and the tilt is what they pay for. Tipping the grid shortens its
     projected height by cos(TILT_X) and its width by cos(TILT_Y), so a field sized exactly to the
     screen pulls its own edges inside the frame and leaves bare sand along two sides. Six either
     way covers that, the cube height standing proud at the top, and a resize mid-drag. */
  const cols = Math.ceil(size.width / CELL_PX / Math.cos(TILT_Y)) + 10;
  const rows = Math.ceil(size.height / CELL_PX / Math.cos(TILT_X)) + 10;
  const count = cols * rows;

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
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
      // `key` so a change in cube count rebuilds the mesh: an InstancedMesh's count is fixed at
      // construction, and R3F reconstructs on an args change rather than mutating in place.
      key={count}
      args={[geometry, material, count]}
      // The shader moves vertices the bounding sphere does not know about, and the sphere is
      // derived from instance matrices that describe points rather than cubes. Culling against it
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
        // `far` matters now that there is depth in the scene: the default orthographic near/far is
        // 0.1..2000, which is fine, but the camera has to stand back far enough that a crest at
        // 1.7 cells tall cannot cross the near plane.
        camera={{ zoom: ZOOM, position: [0, 0, 60], near: 0.1, far: 200 }}
        // `antialias` back ON. The flat version drew its only edges with a signed-distance field
        // and antialiased itself for free; a cube's silhouette is real geometry, and a field of
        // hard-edged boxes without MSAA crawls with jaggies as the swell moves through it.
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        {/* The tilt. On the group rather than the camera so the grid can still be laid out in
            screen terms above — the cells are placed on a flat XY grid, and this turns that whole
            plane toward the viewer afterwards. */}
        <group rotation={[TILT_X, TILT_Y, 0]}>
          <Field reduced={reduced} />
        </group>
      </Canvas>
    </div>
  );
};
