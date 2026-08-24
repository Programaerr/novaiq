import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { PERIWINKLE } from '../lib/homePalette';

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
 * series — rather than pulled from stock. The mat behind them is periwinkle, and five
 * unrelated colour schemes rotating against it would read as a slideshow bolted onto the card.
 */
const SHOTS: readonly string[] = [dashboard, storefront, editor, landing, mobileApp];

/**
 * Seconds per still, and how long the wipe between two of them takes.
 *
 * CYCLE is the number that was asked for: a still changes every five seconds. WIPE is carved
 * out of it rather than added to it, so the cadence stays five seconds however slow the
 * transition is. 1.1s is slow on purpose — a fast dissolve on a decorative panel reads as a
 * glitch, and this panel sits beside a form somebody is trying to read.
 */
const CYCLE = 5.0;
const WIPE = 1.1;

/** How far each still drifts in over its life. Small: this is depth, not a zoom effect. */
const KEN_BURNS = 0.055;

/** Device pixel cap. The stills are 1000px wide and the panel is ~512 CSS px, so 2x is exactly
    native and anything beyond it is fill rate spent on pixels the texture does not have. */
const MAX_DPR =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2;

/**
 * A clip-space quad. `position.xy * 2` on a 1x1 plane covers exactly -1..1, which is the whole
 * canvas at any size — so there is no camera to fit, no plane to resize, and nothing to
 * recompute when the panel changes shape. The mesh sets `frustumCulled={false}` because its
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
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform float uMix;
  uniform float uAspect;      // canvas width / height
  uniform vec2  uTexAspect;   // from, to  (width / height)
  uniform vec2  uZoom;        // from, to
  varying vec2 vUv;

  /* Cover-fit, anchored to the TOP of the still rather than its centre.
     Every board is a full page taller than the slot it lands in, so something has to be
     cropped. The top of a screen is the part that identifies it — a nav bar, a headline, a
     phone's status bar — and the bottom is usually a footer that identifies nothing. On the
     phone band, where the slot is very wide and very short, that difference is the whole
     legibility of the panel. */
  vec2 cover(vec2 uv, float texAspect, float zoom) {
    float sx = 1.0;
    float sy = 1.0;
    if (uAspect > texAspect) sy = texAspect / uAspect;
    else                     sx = uAspect / texAspect;
    return vec2(
      (uv.x - 0.5) * sx / zoom + 0.5,
      (uv.y - 1.0) * sy / zoom + 1.0
    );
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec3 from = texture2D(uFrom, cover(vUv, uTexAspect.x, uZoom.x)).rgb;
    vec3 to   = texture2D(uTo,   cover(vUv, uTexAspect.y, uZoom.y)).rgb;

    /* A soft wipe travelling up the panel rather than a flat crossfade.
       A crossfade shows both stills at half strength through the middle of it, which on two
       dense screenshots is mud; a wipe only ever shows one of them at any given pixel, so both
       stay readable the whole way through. The noise term stops the edge being a ruled line —
       it breaks into the incoming still the way ink spreads rather than the way a blind drops. */
    float grad = mix(vUv.y, noise(vUv * 3.4), 0.34);
    float w = 0.34;
    float t = uMix * (1.0 + w) - w * 0.5;
    float m = smoothstep(t - w * 0.5, t + w * 0.5, grad);

    gl_FragColor = vec4(mix(to, from, m), 1.0);

    /* The one line that is easy to leave out of a hand-written material and impossible to
       misread once it bites. The stills are tagged SRGBColorSpace, so texture2D hands back
       LINEAR values; the renderer's output space is sRGB but it only encodes for its own
       built-in materials, never for a custom one. Without it the whole panel renders as if
       every colour had gone through a gamma the wrong way -- ink #101322 comes out at
       rgb(1,2,4) and the panel looks like a hole cut in the card. The mix above happens in
       linear, which is where mixing belongs; this converts once, at the very end. */
    #include <colorspace_fragment>
  }
`;

interface SlidesProps {
  reduced: boolean;
}

const Slides: React.FC<SlidesProps> = ({ reduced }) => {
  const { gl, size, invalidate } = useThree();
  const [firstReady, setFirstReady] = useState(false);
  const texturesRef = useRef<(THREE.Texture | null)[]>(SHOTS.map(() => null));
  const clockRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      uFrom: { value: null as THREE.Texture | null },
      uTo: { value: null as THREE.Texture | null },
      uMix: { value: 0 },
      uAspect: { value: 1 },
      uTexAspect: { value: new THREE.Vector2(1, 1) },
      uZoom: { value: new THREE.Vector2(1, 1) },
    }),
    []
  );

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
      loader.load(SHOTS[i], (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        /* sRGB because these are colour images. Left on the default linear space every still
           would render washed out and a full stop too bright, which on a panel this size looks
           like the images themselves are low quality. */
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = anisotropy;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        texturesRef.current[i] = tex;
        if (i === 0) setFirstReady(true);
        invalidate();
        loadFrom(i + 1);
      });
    };
    loadFrom(0);

    return () => {
      cancelled = true;
      /* Three never releases GPU memory on its own. The geometry and material below are JSX,
         so R3F disposes those; these textures were created by hand and would sit in VRAM for
         the rest of the session — which on this page means for as long as the tab lives, since
         the sign-in screen is mounted and unmounted every time somebody signs out. */
      for (const tex of texturesRef.current) tex?.dispose();
      texturesRef.current = SHOTS.map(() => null);
    };
  }, [gl, invalidate]);

  /* `Texture.image` is typed `unknown` — it can be an HTMLImageElement, an ImageBitmap, a
     canvas or raw data, and three does not narrow it. Everything here comes from
     TextureLoader, so it is always an element with real dimensions; the guard is for the one
     frame between the texture existing and its image being attached. */
  /* Guarantees a painted frame after every commit, which matters because the canvas spends
     most of its life on 'demand'. Without it, a panel that finished loading while the window
     was unfocused would have nothing to show when the visitor came back to it: R3F would be
     waiting for a request that never came, and an alpha:false canvas that has never rendered
     composites as a black rectangle. `invalidate` is a no-op while the loop is running. */
  useEffect(() => invalidate());

  const aspectOf = (tex: THREE.Texture | null) => {
    const img = tex?.image as { width?: number; height?: number } | undefined;
    return img?.width && img?.height ? img.width / img.height : 1;
  };

  useFrame((_, delta) => {
    const tex = texturesRef.current;
    if (!tex[0]) return;

    uniforms.uAspect.value = size.width / Math.max(1, size.height);

    if (reduced) {
      uniforms.uFrom.value = tex[0];
      uniforms.uTo.value = tex[0];
      uniforms.uMix.value = 0;
      uniforms.uTexAspect.value.set(aspectOf(tex[0]), aspectOf(tex[0]));
      uniforms.uZoom.value.set(1, 1);
      return;
    }

    /* Advanced by delta rather than read off state.clock, so a pause is a real pause: the
       canvas drops to frameloop='never', useFrame stops being called, and the sequence picks
       up exactly where it stopped instead of jumping forward by however long the tab was in
       the background. */
    clockRef.current += Math.min(delta, 0.1);
    const t = clockRef.current;

    const cycle = Math.floor(t / CYCLE);
    const p = t - cycle * CYCLE;
    const wipeStart = CYCLE - WIPE;

    const iFrom = cycle % SHOTS.length;
    const iNext = (cycle + 1) % SHOTS.length;
    // Falls back to the current still until the next one has decoded, so a slow connection
    // holds a frame rather than wiping into an empty black panel.
    const iTo = tex[iNext] ? iNext : iFrom;

    const raw = p < wipeStart ? 0 : (p - wipeStart) / WIPE;
    uniforms.uMix.value = iTo === iFrom ? 0 : raw * raw * (3 - 2 * raw);

    /* Each still drifts in slowly across its whole life — the WIPE it arrives during plus the
       CYCLE it holds for. Measuring the drift against that full span rather than against the
       hold alone is what keeps it continuous: the value a still leaves the wipe with is
       exactly the value it starts its hold with, so there is no jump on the handover. */
    const span = CYCLE + WIPE;
    const ageFrom = p + WIPE;
    const ageTo = Math.max(0, p - wipeStart);
    uniforms.uZoom.value.set(
      1 + KEN_BURNS * Math.min(1, ageFrom / span),
      1 + KEN_BURNS * Math.min(1, ageTo / span)
    );

    uniforms.uFrom.value = tex[iFrom];
    uniforms.uTo.value = tex[iTo];
    uniforms.uTexAspect.value.set(aspectOf(tex[iFrom]), aspectOf(tex[iTo]));
  });

  if (!firstReady) return null;

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms} depthTest={false} />
    </mesh>
  );
};

/**
 * The rotating template panel that fills the sign-in card's second half.
 *
 * Replaces a live cube field, and the trade is deliberate: the field was atmosphere, this says
 * what the company sells. The blurred cube field BEHIND the card stays, so the page still reads
 * as this site — atmosphere in the background, substance in the foreground, rather than the
 * same decoration twice.
 *
 * Full bleed, edge to edge. It sat inset on a periwinkle margin first and the margin was the
 * wrong call: it framed each still as a thumbnail of something happening elsewhere, when the
 * point is for the panel to BE the screen.
 *
 * Rendered rather than composited, and the shader is doing three things `<img>` cannot:
 *
 *   - Cover-fit anchored to the top of the still, correct at any panel shape. The same panel
 *     is a 512x568 portrait on a desktop and a 390x160 band on a phone; CSS `object-fit` would
 *     handle that, but not while also doing the two below.
 *   - A soft noise-broken wipe instead of a crossfade. Two dense screenshots at half opacity
 *     each is mud; a wipe keeps whichever still owns a pixel at full strength.
 *   - A slow continuous drift on each still, which is what stops five static images from
 *     reading as five static images.
 *
 * Three things gate it, all of them the gates the cube fields already use:
 *
 *   - `prefers-reduced-motion` freezes it on the first still. This is also the WCAG 2.2.2
 *     answer: the sequence auto-updates and runs past five seconds, so it needs a way to be
 *     stopped, and this media query is the site's answer to that everywhere else.
 *   - `html[data-idle]` pauses it while the tab is backgrounded or the window has lost focus.
 *   - Hovering pauses it, so a still that catches somebody's eye can be looked at.
 *
 * Paused means `frameloop='never'`: React Three Fiber stops calling the render loop entirely
 * and the last frame stays on the canvas. Nothing is redrawn and no timer runs.
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
      className="absolute inset-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Canvas
        /* 'demand' rather than 'never' when paused. 'never' stops React Three Fiber from
           rendering AT ALL, including the first frame, so anything that becomes ready while
           paused is never drawn — and this panel's content arrives asynchronously, so that is
           the normal case, not an edge one. On 'demand' the loop is equally stopped; the
           difference is that a frame can still be asked for. */
        frameloop={!reduced && running ? 'always' : 'demand'}
        dpr={[1, MAX_DPR]}
        /* `antialias` can only be set when the context is created, and there is nothing here
           with a geometric edge to alias — the only edges are inside the textures. Off, it is
           one less multisample buffer for a panel that is on screen the whole time.

           The clear colour is the mat's periwinkle rather than black, so the frames before the
           first still has decoded show the panel's own colour instead of a hole in the card. */
        gl={{ antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: true }}
      >
        <color attach="background" args={[PERIWINKLE]} />
        <Slides reduced={reduced} />
      </Canvas>
    </div>
  );
};
