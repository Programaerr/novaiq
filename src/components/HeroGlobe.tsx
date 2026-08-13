import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Points } from 'three';

/**
 * The globe behind the hero: a dark body, a lit atmosphere, and a shell of points turning on it.
 *
 * ## Three parts, and each one is doing a job the others cannot
 *
 * 1. THE BODY — an opaque sphere just inside the point shell. It contributes almost no colour of
 *    its own; it is there to OCCLUDE. Without it every point on the far hemisphere shows through
 *    the near one, and what you get is a translucent ball of noise rather than a planet. It is the
 *    single change that makes the thing read as solid.
 *
 * 2. THE ATMOSPHERE — a slightly larger sphere carrying a Fresnel shader, and the reason the rim
 *    glows. See the note on the shader below for why it cannot be done with a gradient.
 *
 * 3. THE POINTS — the surface detail, and the only part that turns. The body and the atmosphere are
 *    spheres: rotating them would be work with no visible result, so they stay still.
 *
 * ## Why the rim needs a shader and not a texture
 *
 * The bright edge on the reference's globe is a VIEW-DEPENDENT effect: a surface is bright where
 * you are looking along it and dark where you are looking straight at it. That relationship is
 * between the surface normal and the camera, so it can only be evaluated per fragment, per frame —
 * which is exactly what Fresnel is. A painted-on ring would be a picture of the effect from one
 * angle and would sit still while the globe moved under it.
 *
 * `BackSide` and additive blending are what make it an ATMOSPHERE rather than a coating: rendering
 * the inside of a shell larger than the planet means the glow you see is the far wall of that
 * shell, seen past the planet's edge — light around the body rather than paint on it. Additive
 * because light adds; normal blending would let the halo darken the sky it sits on.
 *
 * ## Points rather than a shaded surface
 *
 * A lit sphere needs a light, and putting one here would mean a second lighting direction on a page
 * that already commits to one. Points have no shading to get wrong — the globe reads from how they
 * are arranged. Their spacing comes from a Fibonacci spiral, not random angles: random
 * latitude/longitude bunches hard at the poles and the result looks like a globe wearing two hats.
 *
 * ## What it costs
 *
 * Everything else on this page settles to zero frames at rest. A turning globe cannot, so the cost
 * is bounded rather than removed: `frameloop` is `'never'` unless the hero is on screen, DPR caps
 * at 1.5 (the card scene in this project caps at 2.5 and says in its own comment that it can afford
 * to because it is a card and not a full screen — this IS full-width), antialiasing is off because
 * points are round sprites with no polygon edges to smooth, and reduced-motion stops the loop
 * entirely.
 */

const COUNT = 5200;
const RADIUS = 1;

/** Violet, from the reference. Kept beside each other so the scene's palette is one thing to read. */
const POINT_COLOR = '#CBB8FF';
/* Barely above the page's own ground (#0B0714), and that margin is the whole specification for
   this colour. The body's job is to OCCLUDE, not to be seen: any darker and it stops reading as a
   planet and starts reading as a hole punched through the page, which is exactly what happened at
   #0C0518. It has to be dark enough to hide the far hemisphere and close enough to the ground that
   its silhouette is drawn by the rim rather than by a step in brightness. */
const BODY_COLOR = '#0E0920';
const ATMOSPHERE_COLOR = '#8B5CF6';

/**
 * A round sprite for the points, because `pointsMaterial` draws SQUARES by default — every point is
 * a quad, and with no texture the whole quad is filled. At two pixels that reads as digital noise
 * rather than as dust, and the globe's silhouette comes out visibly serrated.
 *
 * Built once and shared by every point, so the same bitmap is uploaded to the GPU a single time.
 * The falloff is squared to keep the core opaque and put all the softness in the last third, which
 * is what stops a small sprite from simply looking blurry.
 */
function makeDotTexture(): THREE.Texture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    const image = ctx.createImageData(size, size);
    const mid = (size - 1) / 2;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - mid) / mid;
        const dy = (y - mid) / mid;
        const d = Math.sqrt(dx * dx + dy * dy);
        const a = d >= 1 ? 0 : Math.pow(1 - d, 2);
        const i = (y * size + x) * 4;
        image.data[i] = 255;
        image.data[i + 1] = 255;
        image.data[i + 2] = 255;
        image.data[i + 3] = Math.round(a * 255);
      }
    }

    ctx.putImageData(image, 0, 0);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * The atmosphere. Raw `THREE.ShaderMaterial` rather than drei's `shaderMaterial` helper, because
 * drei is not a dependency of this project — the helper's real benefit is the HMR `key`, and it is
 * not worth a package for one material.
 */
function makeAtmosphereMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(ATMOSPHERE_COLOR) },
      // How fast the glow falls off away from the silhouette. Higher = a tighter band hugging the
      // edge; lower = a wash that creeps across the whole disc and flattens it.
      uPower: { value: 2.6 },
      uIntensity: { value: 1.5 },
      // Where the star is. The reference does not light its globe evenly — the rim is hot on one
      // shoulder and nearly gone on the other, and that asymmetry is most of what stops it looking
      // like a ring drawn around a circle. Normalised here rather than in the shader so it is not
      // recomputed per fragment for a value that never changes.
      uLight: { value: new THREE.Vector3(-0.55, 0.72, 0.42).normalize() },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorld;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uIntensity;
      uniform vec3 uLight;
      varying vec3 vNormal;
      varying vec3 vWorld;

      void main() {
        vec3 n = normalize(vNormal);
        vec3 view = normalize(cameraPosition - vWorld);

        // abs(), because this shell is rendered BackSide: the normals still point outward while
        // the faces being drawn face away, so the raw dot product arrives negative and an
        // unguarded pow() of it would clip the entire halo to nothing.
        float facing = abs(dot(view, n));
        float rim = pow(1.0 - facing, uPower);

        // Which shoulder the light is on. Remapped to 0.25..1 rather than 0..1 so the dark side
        // keeps a trace of atmosphere instead of the rim vanishing halfway round and leaving the
        // globe looking like a crescent.
        float lit = dot(n, uLight) * 0.5 + 0.5;
        lit = 0.25 + 0.75 * lit * lit;

        gl_FragColor = vec4(uColor, rim * lit * uIntensity);
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    // The halo must not occlude the planet in front of it, and additive layers should never write
    // depth — two of them would otherwise cut each other out depending on draw order.
    depthWrite: false,
  });
}

function Globe({ spin }: { spin: boolean }) {
  const points = useRef<Points>(null);
  const dot = useMemo(makeDotTexture, []);
  const atmosphere = useMemo(makeAtmosphereMaterial, []);

  // Both are GPU resources React does not own, so they are released explicitly when the hero
  // unmounts. R3F disposes what it created from JSX; these two were built here.
  useEffect(() => {
    return () => {
      dot.dispose();
      atmosphere.dispose();
    };
  }, [dot, atmosphere]);

  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    // The golden angle. Any rational angle here makes successive points line up into spokes
    // radiating from the poles; an irrational one never repeats, which is the entire trick.
    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < COUNT; i++) {
      // y walks the diameter linearly, and that is what makes the spacing even: equal steps in
      // HEIGHT cut equal areas off a sphere, equal steps in latitude do not.
      const y = 1 - (i / (COUNT - 1)) * 2;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;

      arr[i * 3] = Math.cos(theta) * ring * RADIUS;
      arr[i * 3 + 1] = y * RADIUS;
      arr[i * 3 + 2] = Math.sin(theta) * ring * RADIUS;
    }

    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!spin || !points.current) return;
    // Delta-based so the globe turns at one speed on a 60Hz and a 120Hz screen. Clamped because
    // delta is the length of the pause after the loop has been stopped off-screen, and an
    // unclamped one would snap the globe forward by that entire gap the moment it returns.
    points.current.rotation.y += Math.min(delta, 0.05) * 0.045;
  });

  return (
    <group rotation={[0.32, 0, 0.16]}>
      {/* The occluder. Very slightly inside the point shell, so points on the near side stay in
          front of it while the far side is hidden behind it. `basic`, not `standard`: there is no
          light in this scene, and a lit material would render black. */}
      <mesh>
        <sphereGeometry args={[RADIUS * 0.985, 48, 48]} />
        <meshBasicMaterial color={BODY_COLOR} />
      </mesh>

      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          // Roughly two screen pixels, and that ceiling is the design of this element. It sits
          // DIRECTLY BEHIND the headline: at any size where a single point can be picked out it
          // competes with the type in front of it. Dust, not confetti — which is also why the
          // count went up as the size came down.
          size={0.005}
          map={dot}
          alphaMap={dot}
          color={POINT_COLOR}
          transparent
          opacity={0.9}
          // Perspective size: points on the far side are smaller as well as sparser, which is
          // most of what separates a sphere from a flat ring of dots.
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* The atmosphere, outside everything else. */}
      <mesh material={atmosphere}>
        <sphereGeometry args={[RADIUS * 1.16, 48, 48]} />
      </mesh>
    </group>
  );
}

export const HeroGlobe: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [motion, setMotion] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setMotion(!mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Mount and run only while the hero is near the viewport. The margin means the globe is already
  // turning by the time its first pixel shows, rather than being caught starting from rest.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: '200px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="hero-globe" aria-hidden="true">
      {active && (
        <Canvas
          // The one scene here that genuinely animates at rest, so it is switched off rather than
          // throttled: 'never' draws nothing at all, not fewer frames.
          frameloop={motion ? 'always' : 'never'}
          dpr={[1, 1.5]}
          // 3.9, and the exact value matters. At fov 45 the visible height at the origin is
          // 2·dist·tan(22.5°); at the 2.75 this started on that came to 2.278 world units, while
          // the ATMOSPHERE shell is 2.32 across. The halo was therefore very slightly wider than
          // the frame and got sliced off flat against all four canvas edges — which showed up as
          // bright wedges in the corners of an obviously rectangular box.
          //
          // A glow has to fade out before it reaches the edge of its own canvas or the canvas
          // becomes visible, so the frame is sized to the widest thing in the scene plus margin,
          // not to the planet. 3.9 gives 3.23 units of height for a 2.32 shell; the CSS box grew
          // to match so the globe still lands the same size on the page.
          camera={{ position: [0, 0, 3.9], fov: 45 }}
          gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        >
          <Globe spin={motion} />
        </Canvas>
      )}
    </div>
  );
};
