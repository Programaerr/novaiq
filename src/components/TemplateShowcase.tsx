import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import dashboard from '../assets/images/templates/dashboard.webp';
import storefront from '../assets/images/templates/storefront.webp';
import editor from '../assets/images/templates/editor.webp';
import landing from '../assets/images/templates/landing.webp';
import mobileApp from '../assets/images/templates/mobile-app.webp';

/**
 * The stills, in the order they play.
 *
 * Five different KINDS of software rather than five views of one product: a dashboard, a
 * storefront, an IDE, a marketing page and a phone app. Someone arriving at the sign-in screen
 * has usually not decided what they want built yet, and a panel cycling through one product's
 * screens answers a question they did not ask. Five categories say what the range is, which is
 * the only thing a sign-in screen has room to say.
 *
 * The ORDER alternates light ground and dark ground, and that is the whole reason it is this
 * order and not the order the files happen to sit in. Five dark boards in a row is one long
 * grey rectangle with things moving inside it; alternating gives the rotation a pulse you can
 * see from across the room, which is the only way a panel this size communicates at all.
 *
 * They are drawn in the site's palette — INK ground, PERIWINKLE accents, SAND on the second
 * series — rather than pulled from stock. They sit on the site's cube field, and five unrelated
 * colour schemes rotating on top of it would read as a slideshow bolted onto the card.
 */
const SHOTS: readonly string[] = [dashboard, storefront, editor, landing, mobileApp];

/**
 * Seconds per still, and how long the crossfade between two of them takes.
 *
 * CYCLE is the number that was asked for: a still changes every five seconds. The fade is carved
 * out of it rather than added to it, so the cadence stays five seconds however slow the
 * transition is. 0.9s is slow on purpose — a fast dissolve on a decorative panel reads as a
 * glitch, and this panel sits beside a form somebody is trying to read.
 */
const CYCLE = 5.0;
const WIPE = 0.9;

/**
 * Device pixel cap.
 *
 * The frame is ~456 CSS px at its widest, so 2x asks for 912 device pixels from a 1600px
 * still — comfortably inside it, which is the point: a texture sampled below its own
 * resolution stays sharp, one sampled above it cannot. The same cap on a phone costs nothing,
 * because the band there is 310x128 CSS and 2x of that is a sixth of a megapixel.
 */
const MAX_DPR = 2;

/**
 * A clip-space quad. `position.xy * 2` on a 1x1 plane covers exactly -1..1, which is the whole
 * canvas at any size — so there is no camera to fit, no plane to resize, and nothing to
 * recompute when the frame changes shape. The meshes set `frustumCulled={false}` because their
 * bounding sphere no longer means anything once the matrices are skipped.
 */
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uAspect;      // canvas width / height
  uniform float uTexAspect;   // still width / height
  uniform float uAlpha;       // 1 for the still that is holding, 0..1 for one fading in
  varying vec2 vUv;

  /* Cover-fit, anchored to the TOP of the still rather than its centre.
     Every board is a full page taller than the frame it lands in, so something has to be
     cropped. The top of a screen is the part that identifies it — a nav bar, a headline, a
     phone's status bar — and the bottom is usually a footer that identifies nothing. On the
     phone band, where the frame is very wide and very short, that difference is the whole
     legibility of the panel. */
  vec2 cover() {
    float sx = 1.0;
    float sy = 1.0;
    if (uAspect > uTexAspect) sy = uTexAspect / uAspect;
    else                      sx = uAspect / uTexAspect;
    return vec2(
      (vUv.x - 0.5) * sx + 0.5,
      (vUv.y - 1.0) * sy + 1.0
    );
  }

  void main() {
    /* A plain crossfade and nothing else. The incoming still is drawn OVER the outgoing one
       and its opacity is raised from 0 to 1; neither of them moves, scales or drifts while it
       does. That is the whole transition, and the restraint is the point — this panel sits
       beside a form somebody is trying to read, so the one thing it must not do is pull the
       eye back every five seconds. A still that also creeps toward the viewer is asking to be
       watched. */
    if (uAlpha <= 0.002) discard;

    /* The -0.5 is a mip bias, and it is the difference between this panel looking sharp and
       looking like a photograph of a screen.

       The stills are minified by about 1.75x on a 2x desktop (1600 texels into 912 pixels).
       Trilinear turns that into an LOD of ~0.8, which weights the sample almost entirely
       toward mip 1 — an 800px image, drawn into 912 pixels. The source is high resolution and
       the frame is high resolution and the thing sampled between them is not. Biasing half a
       level down puts the weight back on mip 0 while leaving enough mipmap in play for the
       phone band, where the same still is minified 3.4x and needs the filtering for real. */
    gl_FragColor = vec4(texture2D(uTex, cover(), -0.5).rgb, uAlpha);

    /* The one line that is easy to leave out of a hand-written material and impossible to
       misread once it bites. The stills are tagged SRGBColorSpace, so texture2D hands back
       LINEAR values; the renderer's output space is sRGB but it only encodes for its own
       built-in materials, never for a custom one. Without it the whole panel renders as if
       every colour had gone through a gamma the wrong way -- ink #101322 comes out at
       rgb(1,2,4) and the frame looks like a hole cut in the card. */
    #include <colorspace_fragment>
  }
`;

/** Builds the one material that belongs to one still. Its sampler is set here and never moves. */
function makeMaterial(tex: THREE.Texture, aspect: number) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTex: { value: tex },
      uAspect: { value: 1 },
      uTexAspect: { value: aspect },
      uAlpha: { value: 1 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
}

interface SlidesProps {
  reduced: boolean;
}

/**
 * Two quads and one material per still.
 *
 * The obvious shape for this is ONE quad whose shader holds two samplers, swapping which
 * textures they point at as the sequence advances. That shape does not work here, and the way
 * it fails is worth writing down because it looks like a shader bug for a long time: three
 * assigns a texture UNIT to a sampler uniform and caches that assignment, so replacing the
 * value underneath an already-bound sampler can leave the old texture serving the slot. The
 * panel then fades perfectly, on time, forever — while never changing picture, and every
 * non-sampler uniform in the same material updates correctly the whole time.
 *
 * So no sampler ever changes value here. Each still gets a material of its own with its texture
 * bound once at construction, and the sequence advances by pointing the two meshes at different
 * MATERIALS. Everything that varies per frame — the fade and the aspect — is a float, which
 * is the class of uniform that was never in question.
 *
 * Two meshes and not five: only ever two stills are on screen, the one leaving and the one
 * arriving, so this is two draw calls at the peak and one the rest of the time.
 */
const Slides: React.FC<SlidesProps> = ({ reduced }) => {
  const { gl, size, invalidate } = useThree();
  const backRef = useRef<THREE.Mesh>(null);
  const frontRef = useRef<THREE.Mesh>(null);
  const materialsRef = useRef<(THREE.ShaderMaterial | null)[]>(SHOTS.map(() => null));
  const [ready, setReady] = useState(false);
  const clockRef = useRef(0);

  /* One geometry for both meshes. It is the same unit quad twice; two of them would be two
     buffers holding identical numbers. */
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  /* Loaded one after another rather than all at once, and the chaining is the point.
     This is the FIRST page of the site a visitor sees, often on a phone connection. Five
     parallel image requests at that moment compete with the fonts and with the auth SDK for
     the same few hundred kilobits; one at a time, each ~20 KB, the whole set is in well inside
     the first still's five seconds and nothing else on the page waits for it. */
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    const anisotropy = gl.capabilities.getMaxAnisotropy();

    const loadFrom = (i: number) => {
      if (cancelled || i >= SHOTS.length) return;
      loader.load(
        SHOTS[i],
        (tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          /* sRGB because these are colour images. Left on the default linear space every still
             would render a full stop too bright and washed out, which on a frame this size
             looks like the images themselves are low quality. */
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = anisotropy;

          /* Upload it to the GPU now instead of waiting for a draw to trigger it. It also
             removes the frame-time spike the first draw of each still would otherwise carry —
             a 1600px texture uploading mid-fade is exactly when a hitch would be seen. */
          gl.initTexture(tex);

          const img = tex.image as { width?: number; height?: number } | undefined;
          const aspect = img?.width && img?.height ? img.width / img.height : 1;
          materialsRef.current[i] = makeMaterial(tex, aspect);

          if (i === 0) setReady(true);
          invalidate();
          loadFrom(i + 1);
        },
        undefined,
        // Skip past a still that will not load rather than stalling the chain on it. One
        // missing image should cost one slot in the rotation, not the four behind it.
        () => loadFrom(i + 1)
      );
    };
    loadFrom(0);

    return () => {
      cancelled = true;
      /* Three never releases GPU memory on its own, and none of this is JSX for R3F to clean
         up. On this page it matters more than usual: the sign-in screen is mounted and
         unmounted every time somebody signs out. */
      for (const mat of materialsRef.current) {
        if (!mat) continue;
        (mat.uniforms.uTex.value as THREE.Texture)?.dispose();
        mat.dispose();
      }
      materialsRef.current = SHOTS.map(() => null);
    };
  }, [gl, invalidate]);

  /* Guarantees a painted frame after every commit, which matters because the canvas spends
     most of its life on 'demand'. Without it, a panel that finished loading while the window
     was unfocused would have nothing to show when the visitor came back to it: R3F would be
     waiting for a request that never came. `invalidate` is a no-op while the loop is running. */
  useEffect(() => invalidate());

  useFrame((_, delta) => {
    const mats = materialsRef.current;
    const back = backRef.current;
    const front = frontRef.current;
    if (!mats[0] || !back || !front) return;

    const aspect = size.width / Math.max(1, size.height);

    const show = (mesh: THREE.Mesh, mat: THREE.ShaderMaterial | null, alpha: number) => {
      if (!mat) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      mesh.material = mat;
      mat.uniforms.uAspect.value = aspect;
      mat.uniforms.uAlpha.value = alpha;
    };

    if (reduced) {
      show(back, mats[0], 1);
      front.visible = false;
      return;
    }

    /* Advanced by delta rather than read off state.clock, so a pause is a real pause: the
       canvas drops off the render loop, useFrame stops being called, and the sequence picks up
       exactly where it stopped instead of jumping forward by however long the tab spent in the
       background.

       The clamp catches the single enormous delta that arrives on the first frame after a
       resume, and 0.5 rather than something tight is deliberate: a clamp BELOW the real frame
       time silently slows the whole sequence down, because every frame then contributes less
       than the time it actually took. At 0.1 a device rendering at 5fps would advance this
       clock at a fifth of real speed and the five-second cadence would quietly become
       twenty-five. Half a second is past any frame rate a person would sit through, so the
       clamp only ever fires on a resume, which is what it is for. */
    clockRef.current += Math.min(delta, 0.5);
    const t = clockRef.current;

    const cycle = Math.floor(t / CYCLE);
    const p = t - cycle * CYCLE;
    const wipeStart = CYCLE - WIPE;

    const iFrom = cycle % SHOTS.length;
    const iTo = (cycle + 1) % SHOTS.length;

    show(back, mats[iFrom], 1);

    if (p < wipeStart || !mats[iTo]) {
      // Nothing arriving yet — or the next still has not decoded, in which case the current one
      // simply holds rather than fading into an empty frame.
      front.visible = false;
      return;
    }
    const raw = (p - wipeStart) / WIPE;
    /* Smoothstep rather than a straight ramp, which is the same curve the CSS version of this
       panel got for free from `ease-in-out`. A linear crossfade has a visible flat middle where
       both stills sit at half opacity and the frame reads as neither of them. */
    show(front, mats[iTo], raw * raw * (3 - 2 * raw));
  });

  if (!ready) return null;

  return (
    <>
      <mesh ref={backRef} geometry={geometry} frustumCulled={false} renderOrder={0} />
      {/* Drawn after the back quad, which is what makes the wipe read as the new still arriving
          ON TOP rather than the old one dissolving away underneath it. */}
      <mesh ref={frontRef} geometry={geometry} frustumCulled={false} renderOrder={1} />
    </>
  );
};

/**
 * The rotating template panel in the sign-in card's second half.
 *
 * It sits INSET on the site's cube field rather than filling the half, and the two together are
 * the composition: the field is the ground, the still is a screen resting on it. Full bleed was
 * the other option and it loses the field entirely — the card's second half becomes one dark
 * rectangle, and the only place the site's blue appears on this screen goes with it.
 *
 * Three things gate it, all of them the gates the cube fields already use:
 *
 *   - `prefers-reduced-motion` freezes it on the first still. This is also the WCAG 2.2.2
 *     answer: the sequence auto-updates and runs past five seconds, so it needs a way to be
 *     stopped, and this media query is the site's answer to that everywhere else.
 *   - `html[data-idle]` pauses it while the tab is backgrounded or the window has lost focus.
 *   - Hovering pauses it, so a still that catches somebody's eye can be looked at.
 *
 * Paused drops the canvas to `frameloop='demand'`: React Three Fiber stops driving the loop and
 * the last frame stays on screen. 'never' would be the obvious choice and is the wrong one — it
 * refuses to render AT ALL, including the first frame, and this panel's content arrives
 * asynchronously, so "became ready while paused" is the normal case rather than an edge one.
 */
export const TemplateShowcase: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [idle, setIdle] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hovered, setHovered] = useState(false);

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
     window minimised or another window takes focus. Every CSS animation on the site stops on
     it and so does every other WebGL loop here; this one reads the same flag rather than
     keeping its own idea of who is watching. */
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

  const running = active && !idle && !hovered;

  return (
    <div
      ref={hostRef}
      /* The inset IS the design. Sized so the still keeps the card's proportions on a desktop
         and still leaves a band of field visible all the way round on a phone, where the whole
         cell is only 10rem tall. */
      className="absolute inset-4 sm:inset-5 lg:inset-7 rounded-[0.4rem] overflow-hidden"
      style={{
        /* A dark bed and a lit edge. The bed is what the frame shows in the moment before the
           first still decodes — an ink card resting on the field, which is what it is about to
           become, rather than a hole. The inset hairline reads as the lit edge of a screen and
           is what separates a dark board from the dark side of a cube underneath it. */
        background: '#101322',
        boxShadow: '0 20px 46px -20px rgba(16, 19, 34, 0.62), inset 0 0 0 1px rgba(246, 241, 233, 0.14)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Canvas
        frameloop={!reduced && running ? 'always' : 'demand'}
        dpr={[1, MAX_DPR]}
        /* `alpha: true`, and not for translucency — nothing here is see-through once a still is
           up. It is so the canvas has nothing of its own to clear TO: an opaque context clears
           to black, and any moment it has not drawn yet is then a black rectangle punched into
           the card. Transparent, those moments show the bed above instead.

           `antialias` can only be set when the context is created, and there is nothing here
           with a geometric edge to alias — every edge in this panel is inside a texture. */
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      >
        <Slides reduced={reduced} />
      </Canvas>
    </div>
  );
};
