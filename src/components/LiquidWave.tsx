import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useIsScrolling } from '../lib/useScrollingFlag';
import { MAX_DPR } from '../lib/renderBudget';

/**
 * The stat card's liquid, as a real WebGL surface.
 *
 * ## Why this replaced two sliding SVGs
 *
 * The version before this one was two SVG paths translating sideways behind a clipped div. It
 * worked, and it had a hard ceiling: a translating path is a RIGID shape moving past a window, so
 * the surface it draws is always the same surface. Water is not rigid. What tells you a glass has
 * just been filled is not that its top edge is wavy — it is that the level OVERSHOT and came back,
 * and that the whole body tipped side to side for a couple of seconds afterwards. Neither of those
 * is expressible as a translation, because both change the shape of the surface itself.
 *
 * Here the surface is evaluated per-pixel, so it can be any function of x and time:
 *
 *   height(x) = level + tilt·(x − ½)·2 + Σ sin(x·kᵢ ± t·sᵢ)
 *
 * `level` is a spring, `tilt` is a second spring that is KICKED by the first, and the sines are the
 * standing chop on top. Changing figure therefore pours the drink rather than resizing a box.
 *
 * ## The three sines, and why not one
 *
 * 6.9 / 11.7 / 3.7 with speeds 1.10 / −0.79 / 0.47: three frequencies at no small-integer ratio,
 * one of them travelling the other way. A single sine is instantly readable as a sine — the eye
 * finds the repeat immediately and the surface reads as corrugated metal. Three that never come
 * back into phase have no visible period at all, and the one running backwards is what makes them
 * cross each other instead of sliding along together.
 *
 * ## What it costs
 *
 * One triangle-pair, no depth buffer, no lights, no textures: a single draw call whose entire cost
 * is the fragment shader over the card's own area, at a dpr capped to 1.5. `antialias` is off
 * deliberately — the geometry is a full-canvas quad, so MSAA has no geometric edge to work on and
 * would only cost memory; every edge in the image is a smoothstep in the shader, which is where
 * the antialiasing actually happens.
 *
 * The canvas is only MOUNTED while the card is near the viewport, and rAF is already suspended by
 * the browser while the tab is hidden — which is the exact condition `usePauseOffscreenWork` sets
 * `data-idle` for, so unlike the CSS animations in that pause list this needs no registration.
 *
 * NO BACKTICKS anywhere inside the shader strings below, including in prose: they are JS template
 * literals, and a single backtick closes the string mid-shader. That failure compiles to a GLSL
 * syntax error and shows up as the object silently not drawing at all.
 */

/* The card's gold, in 0-1 linear-ish floats. Same pair as the --wave-gold / --wave-bronze tokens
   the CSS version used (#E8B448 / #9A6B12) — the hue did not change, only what draws it. */
const GOLD = new THREE.Color('#E8B448');
const BRONZE = new THREE.Color('#9A6B12');
/* The meniscus and the bubbles: a pale warm cream, NOT the page's neutral white. A cool highlight
   on a gold liquid reads as a separate object floating on it rather than as the same liquid
   catching a light — the same reason the hero mark's rim is warm. */
const CREST = new THREE.Color('#FFE8B4');

/* Where the surface sits at 0% and at 100% of the card's height.
   The top is 0.88, not 1.0, and that is headroom rather than a fudged datum: the chop has real
   amplitude, so at a literal 1.0 the crests would clip off against the card's edge and the one
   figure that most deserves to look full would be the only one drawn as a flat gold rectangle with
   no water in it. The bottom is 0.05 rather than 0 for the mirror-image reason — a level of
   exactly zero has no surface, and a surface is the thing this card draws.
   Mapping the range instead of clamping at the top is what keeps 100 and 90 visibly different. */
const LEVEL_MIN = 0.05;
const LEVEL_MAX = 0.86;

/* The level spring. omega = sqrt(34) = 5.8 rad/s and zeta = 8.2 / (2·5.8) = 0.70 — underdamped,
   so it goes slightly PAST the new level and settles back. That single overshoot is most of what
   separates "liquid arriving" from "a bar being resized", and it costs one number. */
const LEVEL_K = 34;
const LEVEL_C = 8.2;

/* The slosh: the same maths at zeta = 0.22, so it rings for three or four seconds instead of
   settling in one. It is not driven by anything continuous — it is kicked once, by the level's own
   step, and then left to decay. Liquid in a glass does exactly this and nothing else. */
const SLOSH_K = 26;
const SLOSH_C = 2.2;
/** How hard a level change tips the body. A full 100 -> 65 jump lands about 4% of the card's
    height of tilt at the peak, so the two ends of the surface differ by roughly 8%. */
const SLOSH_KICK = 0.7;

const levelFor = (fill: number) =>
  LEVEL_MIN + (LEVEL_MAX - LEVEL_MIN) * Math.min(Math.max(fill / 100, 0), 1);

function makeLiquidMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    // Nothing else is in this scene and nothing occludes anything, so both depth operations are
    // pure overhead. Turning them off also removes any chance of the quad z-fighting itself.
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uLevel: { value: LEVEL_MIN },
      uTilt: { value: 0 },
      uBoost: { value: 0 },
      uAspect: { value: 1 },
      uPx: { value: 1 / 300 },
      uGold: { value: GOLD.clone() },
      uBronze: { value: BRONZE.clone() },
      uCrest: { value: CREST.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        // Straight to clip space. The quad is 2x2 at the origin, so position.xy IS the clip-space
        // coordinate and the camera is bypassed entirely — no projection, no view matrix, and
        // nothing to keep in sync when the card resizes.
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      varying vec2 vUv;

      uniform float uTime;
      uniform float uLevel;
      uniform float uTilt;
      uniform float uBoost;
      uniform float uAspect;
      uniform float uPx;
      uniform vec3 uGold;
      uniform vec3 uBronze;
      uniform vec3 uCrest;

      // IQ's hash, not the usual fract(sin(dot(p, k)) * 43758.5). That one reads the low bits of a
      // very large sine, and mediump mobile GPUs do not have the precision to keep them apart — it
      // bands into visible stripes on exactly the phones this has to look right on. This is plain
      // multiply-and-fract, behaves identically everywhere, and is cheaper.
      float hash11(float p) {
        p = fract(p * 0.1031);
        p *= p + 33.33;
        p *= p + p;
        return fract(p);
      }

      // The surface, as a height for a given horizontal position. Everything about the shape of
      // the water lives in this one function.
      float surfaceAt(float u) {
        // Frequencies are counted ACROSS THE CARD, not in aspect-corrected space. Correcting them
        // was the first thing tried and it is wrong for this card specifically: it is portrait
        // (373x595 at lg), so one card width is only 0.63 height-units, and the lowest frequency
        // came out at two thirds of a single period — the whole surface was one slow bulge with no
        // wave in it at all. Counting in u puts the same number of crests across the card at every
        // size, which is what the eye is actually reading. 13.0 is 2.1 crests, and that is the
        // figure being set here.
        float x = u;

        // Amplitude is a property of the WATER, not of how deep the tank is: it stays fixed as the
        // level moves. (The CSS version learned this the hard way — its wave band was sized as a
        // percentage of the fill, so the crest ended up hundreds of pixels below the body's top
        // edge and the two drew a hard horizontal line across the card.) uBoost is the only thing
        // that moves it, and only while the liquid is still ringing from a change.
        // 4.0, measured rather than picked: the transient this multiplies is what decides how far
        // the water splashes up over the card's heading, and at 6.0 a 80 -> 100 change threw the
        // crest to within 30px of the card's top edge.
        float amp = 0.022 * (1.0 + uBoost * 4.0);

        float h = uLevel;
        h += sin(x * 13.0 + uTime * 1.10) * amp;
        h += sin(x * 21.5 - uTime * 0.79) * amp * 0.42;
        h += sin(x * 7.3 + uTime * 0.47) * amp * 0.66;

        // The slosh, as a straight tilt across the card. A real sloshing surface is the first mode
        // of a standing wave, which is very nearly a straight line pivoting about the middle at
        // these amplitudes, and a straight line has the property that matters: it conserves the
        // volume it is tipping, so the liquid does not appear to gain and lose itself as it rocks.
        h += uTilt * (u - 0.5) * 2.0;

        // The meniscus climb. Liquid wets the glass and rides up its walls, and leaving it out is
        // what makes CSS water read as a fill rather than as a liquid: a perfectly flat join at the
        // container's edge is the one thing real water never does.
        float edge = smoothstep(0.16, 0.0, u) + smoothstep(0.84, 1.0, u);
        h += edge * 0.011;

        return h;
      }

      // One bubble per lane, rising and looping. Bubbles are what make this read as a DRINK rather
      // than as a body of water — a sea has a surface and no interior, a poured glass has both.
      float bubbleLane(vec2 p, float top, float cols, float seed) {
        float lane = p.x * cols + seed;
        float id = floor(lane);
        float fx = fract(lane) - 0.5;

        float r1 = hash11(id + seed * 7.0);
        float r2 = hash11(id + seed * 7.0 + 41.7);

        // Each lane runs at its own speed from its own starting phase, so the lanes never line up
        // into a row of bubbles moving in formation.
        float y = fract(uTime * (0.05 + r1 * 0.09) + r2);

        float rad = 0.0035 + r1 * 0.0035;
        // fx is in lane widths; dividing by cols puts it back into UV-x, and multiplying by the
        // aspect ratio converts that to the same units as UV-y so the bubble comes out ROUND.
        float wobble = sin(uTime * 1.6 + r2 * 24.0) * 0.004;
        vec2 q = vec2((fx / cols + wobble) * uAspect, p.y - y * top);

        float b = smoothstep(rad, rad * 0.35, length(q));
        // Fade in off the bottom and out before the surface. A bubble that pops into existence at
        // the floor and punches through the meniscus draws attention to the loop; one that appears
        // and dissolves inside the body does not.
        b *= smoothstep(0.0, 0.18, y) * smoothstep(1.0, 0.70, y);
        return b;
      }

      void main() {
        float h = surfaceAt(vUv.x);
        // Signed distance to the surface: positive under the water, negative above it.
        float d = h - vUv.y;

        // One and a half device pixels of softness on every edge in the image. Derived from the
        // card's real pixel height rather than from fwidth() so it does not depend on derivative
        // support being present, and so it stays a fixed number of PIXELS at any card size.
        float aa = uPx * 1.6;
        float water = smoothstep(-aa, aa, d);

        // The body: gold at the surface going bronze with depth, and FADING OUT as it goes. The
        // fade is doing more work than the hue shift and has to be the faster of the two — on the
        // first build the alpha still had a third of its weight half a card down, and the result
        // was a long flat slab of brown under a nice gold surface. Letting the black card come
        // through instead is what turns that slab into depth.
        float depth = smoothstep(0.0, 0.50, d);
        vec3 c = mix(uGold, uBronze, smoothstep(0.03, 0.42, d));
        float a = mix(0.46, 0.05, depth);

        // The bright band just under the surface, where light collects in a real glass.
        float band = smoothstep(0.10, 0.0, d) * step(0.0, d);
        c = mix(c, uCrest, band * 0.26);
        a += band * 0.10;

        // Bubbles fade with depth alongside the liquid carrying them. Left at full strength they
        // stay brighter than the water around them once it has faded, and a bright speck on a dark
        // ground stops reading as something suspended IN the drink and starts reading as dust on
        // the screen.
        float b = bubbleLane(vUv, uLevel, 7.0, 0.0) + bubbleLane(vUv, uLevel, 11.0, 3.7);
        b *= step(0.0, d) * mix(1.0, 0.30, depth);
        c += uCrest * b * 0.50;
        a += b * 0.24;

        float alpha = clamp(a, 0.0, 1.0) * water;

        // The meniscus line, applied AFTER the water mask on purpose. Masked, its top half would
        // be cut away and what is left is a stripe living inside the liquid; a surface highlight
        // has to straddle the boundary it is highlighting.
        //
        // MIXED toward the crest colour, not added to it. Added, it came out as a saturated neon
        // yellow: uCrest is a pale cream, but cream ON TOP OF gold blows the red and green
        // channels past 1.0 and clips, so what survives is whatever is left in blue — the line
        // stopped being a highlight on the liquid and became a highlighter drawn around it.
        float line = smoothstep(aa * 2.0, 0.0, abs(d));
        c = mix(c, uCrest, min(line * 0.8, 1.0));
        alpha += line * 0.30;

        gl_FragColor = vec4(c, clamp(alpha, 0.0, 1.0));
      }
    `,
  });
}

/** The quad and the physics. Everything that moves is a ref, so a settling spring re-renders React
    exactly zero times — it only writes uniforms. */
function Liquid({ fill, motion }: { fill: number; motion: boolean }) {
  const material = useMemo(makeLiquidMaterial, []);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const target = levelFor(fill);

  const level = useRef(target);
  const levelVel = useRef(0);
  const tilt = useRef(0);
  const tiltVel = useRef(0);
  // Our own clock rather than state.clock.elapsedTime. The frame loop stops whenever the tab is
  // hidden or the card scrolls away, and elapsedTime keeps counting through the gap — so coming
  // back would snap the whole surface forward by the length of the pause. This only advances by
  // frames that were actually drawn.
  const time = useRef(0);
  const first = useRef(true);

  // A GPU resource React did not create, so it is released explicitly.
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    const u = material.uniforms;
    u.uAspect.value = size.width / Math.max(size.height, 1);
    u.uPx.value = 1 / Math.max(size.height, 1);
    invalidate();
  }, [material, size, invalidate]);

  // The kick. Fired on the figure changing, not every frame: the slosh is an impulse response, so
  // the only thing the change does is hand the tilt spring some velocity and step back.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    tiltVel.current += (target - level.current) * SLOSH_KICK;
  }, [target]);

  // Reduced motion: no spring, no chop, no bubbles moving — but the level is still drawn, because
  // the level IS the figure. Removing it would take the datum with it.
  useEffect(() => {
    if (motion) return;
    const u = material.uniforms;
    level.current = target;
    levelVel.current = 0;
    tilt.current = 0;
    tiltVel.current = 0;
    u.uLevel.value = target;
    u.uTilt.value = 0;
    u.uBoost.value = 0;
    invalidate();
  }, [motion, target, material, invalidate]);

  useFrame((_, delta) => {
    if (!motion) return;

    // Clamped, because delta is the length of the pause once the loop has been stopped off-screen
    // or in a background tab. An unclamped one would integrate that entire gap in a single step
    // and fling both springs across the card.
    const dt = Math.min(delta, 0.05);
    time.current += dt;

    levelVel.current += (target - level.current) * LEVEL_K * dt - levelVel.current * LEVEL_C * dt;
    level.current += levelVel.current * dt;

    tiltVel.current += -tilt.current * SLOSH_K * dt - tiltVel.current * SLOSH_C * dt;
    tilt.current += tiltVel.current * dt;

    const u = material.uniforms;
    u.uTime.value = time.current;
    u.uLevel.value = level.current;
    u.uTilt.value = tilt.current;
    // Derived from the slosh's own speed rather than stored: the chop is roughest while the body
    // is moving fastest and calms as it settles, which is one less piece of state to keep in step.
    u.uBoost.value = Math.min(Math.abs(tiltVel.current) * 0.9, 1);
  });

  return (
    <mesh material={material} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

interface LiquidWaveProps {
  /** 0-100. How full the glass stands for the figure currently on the card. */
  fill: number;
}

export const LiquidWave: React.FC<LiquidWaveProps> = ({ fill }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [motion, setMotion] = useState(true);
  // Holds the water still for the length of a scroll — see useIsScrolling.
  const scrolling = useIsScrolling();

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setMotion(!mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Mount only near the viewport, and tear the context down again on the way out. The margin means
  // the liquid is already moving by the time the card's first pixel shows rather than being caught
  // starting from a dead flat surface.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: '250px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* Paused, NOT unmounted — same correction as HeroLogo3D, and for the same measured reason.
          `{active && <Canvas/>}` tore down the WebGL context on every scroll past this card and
          rebuilt it on the way back: that is the `Context Lost` spam in the console and the
          84–203ms rAF handlers, which are a context creation plus a shader compile landing on the
          main thread mid-scroll.

          Three states, not two, because this card is not purely decorative: it has a level to
          show. Moving and on screen draws every frame; off screen draws nothing at all; reduced
          motion sits on 'demand', which costs one frame when the figure changes and nothing at
          any other time. */}
      <Canvas
          frameloop={!motion ? 'demand' : active && !scrolling ? 'always' : 'never'}
          dpr={[1, MAX_DPR]}
          gl={{ antialias: false, alpha: true, depth: false, powerPreference: 'low-power' }}
        >
          <Liquid fill={fill} motion={motion && active} />
      </Canvas>
    </div>
  );
};
