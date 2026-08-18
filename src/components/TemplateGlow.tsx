import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** One pool of light, in the row's own terms. */
export interface GlowLight {
  /** Pixels from the centre of the row, positive toward the right of the SCREEN. */
  x: number;
  /** Pixels down from the centre of the canvas — where under the card the pool sits. */
  y: number;
  /** Pixels. Where the pool has fallen to nothing. */
  radius: number;
  /** 0..1. How brightly it burns. */
  amp: number;
  /** '#rrggbb'. */
  color: string;
}

export interface TemplateGlowProps {
  /** At most MAX_LIGHTS are read; anything past that is ignored rather than truncating oddly. */
  lights: GlowLight[];
  /** The flat colour the pools are added to — the section's own ground. */
  ground: string;
}

/**
 * Fixed, because a GLSL array is sized at compile time and a shader that recompiles when a card
 * scrolls into range is a shader that stutters. Five is what the row can ever show: the centre
 * card and two on each side.
 */
const MAX_LIGHTS = 5;

/** How much flatter than round a pool is. Light landing on a floor seen at a shallow angle
    spreads sideways, and a circular bloom under a card reads as a sticker rather than as light. */
const POOL_SQUASH = 0.58;

function makeGlowMaterial(ground: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    // Opaque, and it paints the ground colour itself rather than blending over the DOM behind it.
    // That is the whole reason this is worth a canvas: the pools are ADDED to each other, so two
    // overlapping ones get brighter where they meet, which is what light does. Stacked translucent
    // radial-gradients composite with alpha instead — each one darkens toward its own colour over
    // what is beneath it — so overlaps go muddy exactly where the reference is at its brightest.
    transparent: false,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uRes: { value: new THREE.Vector2(1, 1) },
      uGround: { value: new THREE.Color(ground) },
      // xy = pixels from centre, z = radius in pixels. w is unused and kept for alignment.
      uPos: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector3(0, 0, 1)) },
      uColor: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Color('#000000')) },
      uAmp: { value: new Array(MAX_LIGHTS).fill(0) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform vec2  uRes;
      uniform vec3  uGround;
      uniform vec3  uPos[${MAX_LIGHTS}];
      uniform vec3  uColor[${MAX_LIGHTS}];
      uniform float uAmp[${MAX_LIGHTS}];

      varying vec2 vUv;

      float hash21(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        vec2 p = (vUv - 0.5) * uRes;

        vec3 lit = vec3(0.0);
        for (int i = 0; i < ${MAX_LIGHTS}; i++) {
          vec2 d = p - uPos[i].xy;
          d.y /= ${POOL_SQUASH.toFixed(3)};
          // Squared falloff on a linear ramp rather than a true inverse square: a physical falloff
          // never actually reaches zero, so every pool would still be tinting the far edge of the
          // canvas and the whole ground would drift off the section colour it is supposed to match.
          float r = clamp(1.0 - length(d) / max(uPos[i].z, 1.0), 0.0, 1.0);
          lit += uColor[i] * (r * r * r) * uAmp[i];
        }

        // The canvas has edges and the section it sits in does not. Everything above is added to a
        // ground painted the section's exact colour, so the two match wherever there is no light —
        // this is what guarantees there is none by the time the canvas runs out.
        float edge =
          smoothstep(0.0, 0.09, vUv.x) * smoothstep(1.0, 0.91, vUv.x) *
          smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);

        vec3 c = uGround + lit * edge;

        // A pool this wide crosses only a few dozen 8-bit steps over hundreds of pixels, which is
        // the exact condition for visible banding — concentric rings around every card. One step of
        // noise, below the threshold of being seen as noise, is enough to break the rings up.
        c += (hash21(gl_FragCoord.xy) - 0.5) / 255.0;

        gl_FragColor = vec4(c, 1.0);

        // Not optional, and its absence is not subtle. three converts every colour handed to it
        // from sRGB into linear light on the way in, and converts back on the way out — but only
        // for materials that ask, and a hand-written ShaderMaterial has to ask. Without this line
        // the canvas writes linear values straight into an sRGB buffer, and the ground it paints
        // comes out visibly lighter and more saturated than the identical hex on the section
        // behind it: the canvas reads as a bright rectangle laid over the page, with a hard edge
        // all the way round, which no amount of edge-fading can hide because the fade is in the
        // light and the mismatch is in the GROUND.
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * The quad, and the easing that carries the pools from wherever they were to wherever the row has
 * just put them.
 *
 * The lights are a prop and the prop changes the instant the active card does — but the cards
 * themselves take 0.9s to glide there. Snapping the light to the new arrangement while the cards
 * are still travelling is the tell that the glow is a separate decoration rather than something
 * the cards are casting, so this chases the targets on an exponential rather than taking them.
 */
const Pools: React.FC<{ lights: GlowLight[]; ground: string }> = ({ lights, ground }) => {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const material = useMemo(() => makeGlowMaterial(ground), [ground]);

  useEffect(() => () => material.dispose(), [material]);

  // Where each pool is heading. Read inside useFrame, so a ref rather than state — the frame loop
  // must never be the thing that re-renders React.
  const targets = useRef<GlowLight[]>([]);
  targets.current = lights;

  // One frame after every render, unconditionally. The loop below asks for its own frames while it
  // is easing, but it cannot ask for the FIRST one — under `frameloop='demand'` nothing runs until
  // something requests it, so a canvas that mounts off screen, or one whose lights change while it
  // is parked, would come back showing whatever it was last painted with. Cheap enough to be
  // unconditional: invalidate sets a flag.
  useEffect(() => {
    invalidate();
  });

  useFrame((_, delta) => {
    const u = material.uniforms;
    u.uRes.value.set(size.width, size.height);

    // Frame-rate independent: the same fraction of the remaining distance per SECOND, not per
    // frame, so the glide takes the same time on 60Hz and on 144Hz.
    const k = 1 - Math.pow(0.0025, Math.min(delta, 0.05));
    let moving = false;

    for (let i = 0; i < MAX_LIGHTS; i++) {
      const t = targets.current[i];
      const pos = u.uPos.value[i] as THREE.Vector3;
      const col = u.uColor.value[i] as THREE.Color;
      const amp = u.uAmp.value as number[];

      // A pool with no card is a pool at zero amplitude, NOT a pool that vanishes: fading it out
      // in place is the difference between a light being switched off and a light being deleted.
      const tx = t ? t.x : pos.x;
      // Negated. A GlowLight's y is measured DOWNWARD, because everything placing one is laying
      // out a DOM row and thinking in the direction CSS does; the shader reads it out of a uv
      // whose origin is the bottom-left corner. One minus here, at the boundary between the two
      // conventions, rather than a sign flip at every call site that has to be remembered.
      const ty = t ? -t.y : pos.y;
      const tr = t ? t.radius : pos.z;
      const ta = t ? t.amp : 0;

      pos.x += (tx - pos.x) * k;
      pos.y += (ty - pos.y) * k;
      pos.z += (tr - pos.z) * k;
      amp[i] += (ta - amp[i]) * k;

      // Colour is set rather than eased. A card's hue does not travel through the hues between it
      // and its neighbour's — crossfading two pools by amplitude is what actually blends them, and
      // it blends them the way overlapping light does instead of through a line of muddy midpoints.
      if (t) col.set(t.color);

      if (
        Math.abs(tx - pos.x) > 0.5 ||
        Math.abs(ty - pos.y) > 0.5 ||
        Math.abs(tr - pos.z) > 0.5 ||
        Math.abs(ta - amp[i]) > 0.002
      ) {
        moving = true;
      }
    }

    // Nothing to flag: every uniform above was mutated in place on the object three.js already
    // holds, and it re-uploads them on each draw. The frames are the only thing that has to be
    // asked for — and only while something is still moving.
    if (moving) invalidate();
  });

  // A unit plane scaled to the canvas, rather than a plane built at the canvas's size: the camera
  // below is orthographic at zoom 1, so one world unit is one pixel and this covers it exactly —
  // and a resize is a scale change instead of a new geometry every time the window moves.
  return (
    <mesh scale={[size.width, size.height, 1]} material={material} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
};

/**
 * The light the cards stand in.
 *
 * A flat plane of the section's own colour with one soft pool of coloured light added under each
 * visible card, brightest and widest under the one in focus. It is the reference's single most
 * characteristic feature — the purple bloom that spills out from under the Dubai card onto the
 * page — and the one part of that picture that a stack of CSS gradients cannot honestly do, for
 * the reason written on the material above.
 */
export const TemplateGlow: React.FC<TemplateGlowProps> = ({ lights, ground }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: '200px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Same flag every animation on the site reads: `data-idle` goes on <html> when the tab is
     backgrounded or the window loses focus. See TileField for the note on why a WebGL loop has to
     opt into it explicitly rather than keeping its own idea of who is watching. */
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIdle(root.hasAttribute('data-idle'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['data-idle'] });
    return () => mo.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0" aria-hidden="true">
      {/* `demand`, never `always`. Nothing here moves on its own — the pools are still until a card
          changes, and then they ease for under a second. The loop asks for the frames it needs and
          the canvas is otherwise as cheap as an image. Parked rather than unmounted off screen for
          the same reason the tile field is: tearing the canvas down destroys the GL context and
          coming back costs a fresh one plus a shader recompile.

          Orthographic at zoom 1 so one world unit is one CSS pixel, which is what lets the pools be
          positioned in the same pixels the cards are laid out in. */}
      <Canvas
        orthographic
        frameloop={active && !idle ? 'demand' : 'never'}
        dpr={[1, 1.5]}
        camera={{ zoom: 1, position: [0, 0, 10], near: 0.1, far: 100 }}
        // No antialias: there is not one edge in this scene, only gradients.
        gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
      >
        <Pools lights={lights} ground={ground} />
      </Canvas>
    </div>
  );
};
