import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PAPER, PERIWINKLE, SAND_LIGHT } from '../lib/homePalette';

/**
 * Code falling down the screen, behind the sign-in card.
 *
 * The obvious reference is the green rain from the film, and the two things that make this NOT
 * that are deliberate. The glyphs are source-code characters — braces, angle brackets, slashes,
 * semicolons, hex — rather than katakana, so it reads as somebody's terminal instead of as a
 * costume. And the colour is the site's: periwinkle and sand on ink, with paper at the head of
 * each trail. Green here would be a different company's screen.
 *
 * It is background, so every choice below is about surviving being ignored and being blurred: big
 * glyphs, a narrow palette, trails long enough to read as motion, and nothing anywhere near the
 * middle of the frame competing with the card sitting on top of it.
 */

/* ── Scene constants ────────────────────────────────────────────────────────────────────── */

/**
 * The pixel-ratio ceiling, on the same rule the tile field uses and for the same reason: a phone
 * reports a devicePixelRatio of 2 or 3, which is four to nine times the fragments on the device
 * with the least GPU to spend. There is even less to resolve here — this layer is blurred before
 * anybody sees it.
 */
const MAX_DPR: number =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? 1 : 1.25;

/** Pixels per world unit, so the rain can be laid out in screen terms. Same as the tile field. */
const ZOOM = 100;

/** Glyph box in CSS pixels, and the column pitch as a multiple of it. Monospace rain wants the
    columns a little wider than the glyph so the characters do not touch side to side. */
const GLYPH_PX = 19;
const COLUMN_PITCH = 1.5;

/** How many glyphs are in a trail, and how far apart they sit vertically. A trail shorter than
    about fifteen reads as a falling dot; much longer and the columns merge into a curtain. */
const TRAIL = 24;
const ROW_PITCH = 1.18;

/**
 * The column budget, allocated once and never resized.
 *
 * The straightforward version sizes the buffer from the viewport and rebuilds it on resize, and
 * it hitches every frame of a window drag — a few thousand instances re-uploaded per frame. This
 * allocates for the widest screen worth supporting and hides the surplus in the vertex shader
 * (one compare, then a vertex thrown outside clip space), so a resize is a single uniform write.
 */
const MAX_COLUMNS = 96;
const COUNT = MAX_COLUMNS * TRAIL;

/* ── Glyph atlas ────────────────────────────────────────────────────────────────────────── */

/**
 * Sixty-four characters that look like code.
 *
 * Weighted toward punctuation rather than toward the alphabet, and that is what makes it read as
 * SOURCE at a glance. A rain of random letters reads as an eye chart; braces, arrows, slashes and
 * semicolons are recognisable as code from across the room and at any blur.
 */
const GLYPHS = '{}<>[]()/\\|;:=+-*&%$#@!?._,^~0123456789abcdefxyzABCDEFXYZ<>{}/;=';
const ATLAS_GRID = 8;
const ATLAS_CELL = 64;

/**
 * Draws the glyph sheet once, on a 2D canvas, and hands it over as a texture.
 *
 * White on transparent, because only the alpha channel is ever read — the colour is decided in
 * the fragment shader per instance, so one sheet serves the paper heads, the periwinkle bodies
 * and the sand columns without three copies of it.
 *
 * Mipmaps OFF. An atlas with mipmaps bleeds neighbouring cells into each other at small sizes and
 * every glyph picks up ghosts of the ones beside it — the classic atlas artefact, and invisible
 * until the layer is scaled down, which is exactly what happens here.
 */
function makeAtlas(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = ATLAS_GRID * ATLAS_CELL;
  const g = c.getContext('2d')!;
  g.font = `bold ${Math.round(ATLAS_CELL * 0.68)}px "JetBrains Mono", ui-monospace, "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace`;
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < GLYPHS.length && i < ATLAS_GRID * ATLAS_GRID; i++) {
    const x = (i % ATLAS_GRID) * ATLAS_CELL + ATLAS_CELL / 2;
    const y = Math.floor(i / ATLAS_GRID) * ATLAS_CELL + ATLAS_CELL / 2;
    g.fillText(GLYPHS[i], x, y);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/* ── Material ───────────────────────────────────────────────────────────────────────────── */

function makeRainMaterial(atlas: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    // Not written to the depth buffer: the glyphs overlap along a column and must blend rather
    // than punch holes in each other. There is nothing else in the scene to be occluded by.
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uAtlas: { value: atlas },
      /** Half the visible area, in world units. */
      uHalf: { value: new THREE.Vector2(1, 1) },
      /** How many of the allocated columns are actually in use at this width. */
      uCols: { value: 1 },
      /** Glyph box and the two pitches, in world units. */
      uGlyph: { value: 0.19 },
      uColPitch: { value: 0.28 },
      uRowPitch: { value: 0.22 },
      uHead: { value: new THREE.Color(PAPER) },
      uBody: { value: new THREE.Color(PERIWINKLE) },
      uWarm: { value: new THREE.Color(SAND_LIGHT) },
    },
    vertexShader: `
      attribute vec2 aCell;   // (column, row in the trail; 0 is the head)
      attribute float aSeed;

      uniform float uTime;
      uniform vec2 uHalf;
      uniform float uCols;
      uniform float uGlyph;
      uniform float uColPitch;
      uniform float uRowPitch;

      varying vec2 vUv;
      varying float vFade;
      varying float vHead;
      varying float vWarm;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
      }

      void main() {
        // Surplus columns leave through the front door. The buffer is sized for the widest screen
        // worth supporting, so on anything narrower most instances are not wanted — throwing the
        // vertex outside clip space costs one compare and no fragments at all.
        if (aCell.x >= uCols) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          return;
        }

        float x = -uHalf.x + (aCell.x + 0.5) * uColPitch;

        // Every column falls at its own speed and starts at its own point in the cycle, or the
        // whole sheet descends as one object and the rain reads as a texture being scrolled.
        float speed = 1.1 + hash(vec2(aCell.x, 7.0)) * 3.4;
        float span = uHalf.y * 2.0 + uRowPitch * float(${TRAIL}) + uRowPitch * 6.0;
        float phase = hash(vec2(aCell.x, 3.0)) * span;
        float head = uHalf.y + uRowPitch * 3.0 - mod(uTime * speed + phase, span);

        // The trail hangs ABOVE the head, because the head is the lowest glyph and the one that
        // has most recently been "typed".
        float y = head + aCell.y * uRowPitch;

        vHead = 1.0 - smoothstep(0.0, 1.6, aCell.y);
        // Fades out along the trail, and never to a hard stop: the last glyph of a column going
        // out at full strength is the tell that a trail is a fixed-length sprite.
        vFade = pow(1.0 - aCell.y / float(${TRAIL}), 1.05);
        // A minority of columns run warm, so the rain is not one flat hue.
        vWarm = step(0.78, hash(vec2(aCell.x, 19.0)));

        // The glyph changes on its own clock. Held for a fraction of a second rather than picked
        // per frame — re-rolled every frame it is static noise, not characters.
        float tick = floor(uTime * (3.0 + hash(vec2(aCell.x, 11.0)) * 5.0) + aSeed * 20.0);
        float g = floor(hash(vec2(aCell.x * 31.0 + aCell.y, tick)) * ${ATLAS_GRID * ATLAS_GRID}.0);
        float gx = mod(g, ${ATLAS_GRID}.0);
        // The canvas atlas is drawn top-down and uploaded with flipY, so the row index counts
        // from the bottom of the texture. Getting this backwards silently mirrors the sheet.
        float gy = ${ATLAS_GRID}.0 - 1.0 - floor(g / ${ATLAS_GRID}.0);
        vUv = (uv + vec2(gx, gy)) / ${ATLAS_GRID}.0;

        vec3 p = position * uGlyph;
        p.xy += vec2(x, y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uAtlas;
      uniform vec3 uHead;
      uniform vec3 uBody;
      uniform vec3 uWarm;

      varying vec2 vUv;
      varying float vFade;
      varying float vHead;
      varying float vWarm;

      void main() {
        // Only the alpha channel. The sheet is white, so its RGB carries no information — the
        // colour is decided here, per instance, which is what lets one atlas serve every trail.
        float a = texture2D(uAtlas, vUv).a;
        if (a < 0.05) discard;

        vec3 c = mix(uBody, uWarm, vWarm);
        // The head of a trail is near-white, and it is the whole reason the rain reads as falling
        // rather than as a static column flickering: the eye tracks the bright glyph down.
        c = mix(c, uHead, vHead);

        gl_FragColor = vec4(c, a * vFade);
      }
    `,
  });
}

/* ── The rain ───────────────────────────────────────────────────────────────────────────── */

const Rain: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const atlas = useMemo(makeAtlas, []);
  const material = useMemo(() => makeRainMaterial(atlas), [atlas]);

  /* One quad, and a column/row index per instance. Nothing about a glyph's position is stored —
     it is all derived in the vertex shader from `uTime`, so the CPU never touches this buffer
     again after it is uploaded once. */
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    const cell = new Float32Array(COUNT * 2);
    const seed = new Float32Array(COUNT);
    let i = 0;
    for (let c = 0; c < MAX_COLUMNS; c++) {
      for (let r = 0; r < TRAIL; r++) {
        cell[i * 2] = c;
        cell[i * 2 + 1] = r;
        seed[i] = Math.random();
        i++;
      }
    }
    g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 2));
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
    return g;
  }, []);

  // Three never frees GPU memory on its own, and the atlas is the expensive one here.
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      atlas.dispose();
    },
    [geometry, material, atlas],
  );

  /* A resize is four uniform writes and no reallocation — the point of the fixed budget. */
  useLayoutEffect(() => {
    const glyph = GLYPH_PX / ZOOM;
    const colPitch = glyph * COLUMN_PITCH;
    const u = material.uniforms;
    u.uHalf.value.set(size.width / 2 / ZOOM, size.height / 2 / ZOOM);
    u.uGlyph.value = glyph;
    u.uColPitch.value = colPitch;
    u.uRowPitch.value = glyph * ROW_PITCH;
    u.uCols.value = Math.min(MAX_COLUMNS, Math.ceil(size.width / ZOOM / colPitch));
    // Under a reduced-motion preference the loop is on `demand`, so without this a resize would
    // recompute the layout and never draw at it.
    invalidate();
  }, [size.width, size.height, material, invalidate]);

  const clock = useRef(reduced ? 6 : 0);

  useFrame((_, delta) => {
    if (reduced) return;
    // Clamped: this is the length of the pause after the loop stopped off screen, and an
    // unclamped step would integrate the whole gap in one frame and teleport every column.
    clock.current += Math.min(delta, 0.05);
    material.uniforms.uTime.value = clock.current;
  });

  return (
    <instancedMesh
      args={[geometry, material, COUNT]}
      // The shader positions every instance itself and never reads `instanceMatrix`, so the
      // bounding sphere three would cull against describes nothing real.
      frustumCulled={false}
    />
  );
};

/* ── The host ───────────────────────────────────────────────────────────────────────────── */

/**
 * Mounts the rain and keeps it from running when nobody is watching: off screen, backgrounded
 * tab, or a reduced-motion preference. The same three gates the tile field uses.
 */
export const CodeRain: React.FC = () => {
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
     window minimised or another window takes focus. Every CSS animation on the site stops on it;
     a WebGL loop is the one thing on the page that would otherwise carry on burning frames for
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
      {/* Kept MOUNTED and parked at `frameloop="never"` off screen rather than unmounted. Tearing
          the canvas down destroys the GL context, and rebuilding it costs a fresh context, a
          shader recompile and the glyph sheet being redrawn and re-uploaded every time.

          Orthographic: this is a flat sheet seen head on, and a perspective camera would taper
          the outer columns for no reason. `antialias` off — the only edges in the scene come out
          of a texture's alpha, which is already smooth. */}
      <Canvas
        orthographic
        frameloop={reduced ? 'demand' : active && !idle ? 'always' : 'never'}
        dpr={[1, MAX_DPR]}
        camera={{ zoom: ZOOM, position: [0, 0, 60], near: 0.1, far: 200 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      >
        <Rain reduced={reduced} />
      </Canvas>
    </div>
  );
};

export default CodeRain;
