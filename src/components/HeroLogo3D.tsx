import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_DPR } from '../lib/renderBudget';

/**
 * The NOVAIQ mark, built as real geometry and turning in 3D. It replaces HeroGlobe's planet.
 *
 * ## Tubes, not an extruded outline
 *
 * The mark is two braces and an orbit ring — all of them STROKES of roughly constant width. The
 * obvious way to get a glyph into a scene is `ExtrudeGeometry` on a `THREE.Shape`, and it is the
 * wrong tool here: an extruded outline is a flat slab, so the moment it turns past about 70° it
 * collapses to its own edge and the mark reads as a sheet of card rather than an object. Half of a
 * full rotation would be spent looking at a line.
 *
 * A stroke of constant width swept along a path is a TUBE, and a tube has a round cross-section, so
 * it presents the same thickness from every angle. The mark stays solid all the way round. That is
 * also why the ring is a torus — a torus is the same thing closed into a loop, so the ring and the
 * braces are made of the same stuff and agree with each other under rotation.
 *
 * The source art is a PNG (`assets/images/novaiq-icon.png`), not a vector, so there was nothing to
 * trace automatically — no SVG exists anywhere in the repo. The curve below is the mark rebuilt
 * from its construction rather than converted from its pixels.
 *
 * ## Nothing in it moves
 *
 * The mark is drawn once, at the artwork's pose, and never touched again. It has been through a
 * full-axis tumble, a brace swing with the ring precessing against it, and the ring carried around
 * the vertical; all of them are gone. The logo simply stands there, and it answers a hover.
 *
 * That is a bigger change than it sounds. A scene with no animation needs no render loop, so the
 * canvas runs at `frameloop="demand"`: it draws ONE frame and then does no work for the rest of
 * the session. There is no useFrame in this file at all. The rAF loop, the clamped delta
 * accumulator that protected it from the scroll-away gap, the ease-in envelope and the
 * reduced-motion listener that switched the whole thing off are all deleted rather than disabled —
 * none of them have anything left to govern.
 *
 * The one thing worth keeping from all of it: a torus spun about its OWN axis produces literally
 * no change, because it is rotationally symmetric about that axis. Every frame comes out identical
 * and the GPU draws a still image at 60fps. If this ring is ever animated again, it has to be the
 * ORIENTATION OF ITS PLANE that moves — that is a ring's only visible degree of freedom.
 *
 * ## The ring sits under the braces
 *
 * Geometrically it does not: it is a hoop AROUND them, so half of it is genuinely nearer the
 * camera. That is settled in draw order rather than in the geometry — see `ringMaterial` for why
 * moving it back in Z does not survive perspective.
 *
 * The clearance between the two is stated as a bounding-sphere test in RING_RADIUS rather than a
 * case analysis of which angles they meet at. That is deliberately stronger than a static ring
 * needs — it holds for ANY orientation — so if the motion ever comes back it cannot quietly put
 * the ring through the mark.
 *
 * ## The mark does not mirror in RTL
 *
 * NovaiqLogo.tsx sets `dir="ltr"` on itself and says why: a brand lockup keeps its physical order
 * in Arabic. The same applies to the ring's diagonal, which runs low-left to high-right in the
 * artwork and stays there — everything else in this hero mirrors with the writing direction, this
 * one thing deliberately does not.
 */

/* GLASS. The ramp was a metal one — five neutral greys from charcoal to white — and the difference
   between that and this is not the hex values, it is WHERE the light goes.

   A metal is brightest where it faces the light and dark everywhere else, so its colour lives in
   the midtones and both ends run neutral. Glass does the opposite in two ways at once. Its flat
   faces go almost transparent, because most of what hits them passes straight through; and its
   EDGES go bright, because light travelling inside the body cannot escape a shallow angle and
   piles up wherever the surface turns away. So the ramp below sits cool and pale, the body reads
   thin, and the two terms doing the real work are the rim and the transmission glow in the shader.

   Cool, not blue. The stops carry a slight cast toward blue — glass is never neutral, and a truly
   grey one reads as smoked plastic — but it stops well short of a hue anyone would name, so the
   page stays black and white with the panel's water as its only colour. */
const C0_ABYSS = '#12141C';
const C1_SLATE = '#39404F';
const C2_STEEL = '#7E8899';
const C3_PALE = '#CFD8E6';
const C4_WHITE = '#FFFFFF';
/* The light piping — the edges. Cooler and brighter than the body, because the light in there has
   bounced along the inside of the glass and the shallow angles it survives are the blue ones. */
const RIM_COLOR = '#EAF2FF';
/* What comes through from behind. The most saturated thing on the object, and correctly so: this
   stands in for light that has crossed the whole body and picked up its tint on the way. */
const GLOW_COLOR = '#9FC0FF';

/* Same light as the globe used, and for the same reason: up and toward the page's outer edge, so
   the lit shoulder faces away from the copy instead of into it. */
const LIGHT = new THREE.Vector3(-0.42, 0.8, 0.43).normalize();

/** Stroke radius. The artwork's braces are about a tenth of their own height across — 0.105 here
    against a half-height of 1. At 0.062 they came out as wire and the mark read as a diagram. */
const STROKE = 0.105;
/** How far each brace sits from the centre line. Set from the INNER edge rather than by eye: the
    arms reach x = 0.48 in the curve below, so 0.70 leaves 0.44 of clear air down the middle. */
const BRACE_X = 0.7;

/* ── The base ───────────────────────────────────────────────────────────────────────────────
   The ring is a PLATE the mark stands on now, not a hoop around it. It has been a tilted orbit
   through several revisions of this file; that is gone, along with RING_TILT_Z, RING_ORBIT_RATE
   and WAKE_RATE. Constants nothing reads are promises the file does not keep. */

/** Flat, in the horizontal plane. Read on its own that projects to a straight line — the camera
    sits at y = 0 and an edge-on circle has no height. What opens it back into the ellipse you
    actually see is RING_Y putting it BELOW the eye: at 1.25 down and 3.9 back, the perspective
    gives it a minor axis about 1.25/3.9 = 0.32 of its major. The two numbers only mean anything
    together, so moving either one changes how flat the base reads. */
const RING_TILT_X = Math.PI / 2;

/**
 * How far below the origin the base sits, and the whole mark rides up by MARK_Y to pay for it.
 *
 * The braces' feet reach y = −1.105 including their stroke, so at −1.65 the ring stands about half
 * a unit clear of them and the logo reads as floating above its plate rather than resting on it.
 *
 * THIS PAIR IS AT THE FRAME'S LIMIT and the two numbers cannot be changed independently. The
 * camera shows 3.2314 units of height, so nothing may leave ±1.6157. Drop the ring alone to −1.65
 * and its lower tube edge lands at −1.708 — outside, sliced flat by the canvas. Lifting everything
 * by 0.25 is what buys it back: the ring bottom comes to −1.458 and the braces' crown to 1.355,
 * both inside with room. Push the ring lower without moving MARK_Y with it and the base is cut in
 * half; push both and the crown goes instead.
 */
const RING_Y = -1.3;
/** Was a +0.25 lift, to buy room for a lower ring. Deleted, and worth recording why: the hero
    section is `overflow-hidden` and `.hero-mark` hangs 14% of its own height above the section's
    top edge, so the art has only about 1.5% of the box in hand up there. Raising it inside the
    canvas by 7.7% of the box put the braces' crown straight through that clip and sliced it flat.
    Vertical room has to come from the frustum, never from moving the art up the canvas. */
const MARK_Y = 0;

/**
 * How much the ring is flattened along Z, and this is what let it drop at all.
 *
 * A ring is a hoop, so its near half swings toward the camera — and the frustum narrows as it
 * comes. The test is (|y| + tube) / (camZ − z_near) ≤ tan(fov/2) = 0.41421, and the near point of
 * a circular ring of radius 1.05 sits at z = +1.05, leaving only 2.85 units of depth to work with.
 * That caps it at y = −1.12, which is ABOVE the braces' feet at −1.105: with a round ring there is
 * no height at all that both clears the mark and stays inside the frame.
 *
 * 0.45 makes it an ellipse in plan — same 1.05 across, 0.47 deep. The near point comes back to
 * 3.43 units of depth, and −1.30 then passes at 0.396. On screen almost nothing changes, because
 * the shallow ellipse you see is mostly perspective foreshortening rather than the ring's own
 * depth; what changes is that all of it is now inside the frame.
 */
const RING_DEPTH_SCALE = 0.45;

/** Radius. Wider than the braces (0.945 at their furthest) so the mark reads as standing ON it
    rather than balanced inside it, and narrow enough that base and braces still read as one
    object. */
const RING_RADIUS = 1.05;

/** How far the mark lifts off its base on hover. Small on purpose — 0.18 against a 2.2-unit mark
    is about 8%, which is enough to see it leave the ground and not so much that it reads as the
    logo being thrown. What sells the lift is the gap OPENING under it, not the distance. */
const HOVER_LIFT = 0.18;

/** Damping rate for that lift. 7 puts it within a pixel of its target in about half a second —
    fast enough to feel like a response rather than an animation being played at you. */
const HOVER_DAMP = 7;

/** The halo's geometry. It stands ON the ring, so its bottom radius is the ring's; it flares to
    1.45 by the top, which is the widest it can go before the flare reaches the canvas edge and
    the beam gets cut off square. Height 3.0 now that the ring has dropped — it still has to clear
    the braces' crown, and that crown is further above the ring than it used to be. */
const HALO_TOP_RADIUS = 1.45;
const HALO_HEIGHT = 3.0;
/** Cool white with a trace of blue. Pure white came out as fog; the tint is what reads as light
    rather than as haze, and it is faint enough not to put a hue back into a monochrome page. */
const HALO_COLOR = '#CFE0FF';

/** How fast the code climbs the beam, in texture heights per second. Slow — 0.09 takes about
    eleven seconds to travel one tile. Code that races reads as a screensaver; code that drifts
    reads as something being carried by the light. */
const CODE_SPEED = 0.09;
/** How many times the glyph sheet tiles around the cone and up it. The horizontal figure must be a
    WHOLE NUMBER: the cone's UV wraps from 1 back to 0, and a fractional repeat cuts a glyph in
    half down one vertical line of the beam. */
const CODE_REPEAT_X = 6;
const CODE_REPEAT_Y = 3;

/**
 * The code that rides up inside the beam, drawn once to a canvas and used as a texture.
 *
 * TOKENS, not random characters. A field of random glyphs is the Matrix effect and it reads as
 * "computery"; actual fragments of source read as code, which is what this company sells. They are
 * deliberately the punctuation-heavy kind — braces, arrows, tags — because those are legible as
 * code at a glance and at a size where whole words would not be.
 *
 * ## It has to tile, and that is the only hard part
 *
 * The texture repeats up the cone, so the bottom edge butts against the top edge forever. Anything
 * crossing that boundary shows as a line of half-glyphs running around the beam. Rows are placed
 * on an exact division of the canvas height and drawn from the row's own baseline, so nothing ever
 * straddles the seam.
 *
 * Alpha only — the colour comes from the shader's uniform. That keeps one place to change how the
 * light looks and lets the same sheet be tinted differently if it is ever reused.
 */
function makeCodeTexture(): THREE.CanvasTexture {
  const SIZE = 512;
  const ROWS = 16;
  const ROW_H = SIZE / ROWS;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  ctx.font = '600 19px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.textBaseline = 'middle';

  const tokens = [
    '{ }', '=>', '</>', 'const', 'return', 'async', 'await', 'npm i', 'git push',
    '0x1F', 'if (', ') {', '[ ]', '&&', '::', '/>', 'void', 'true', 'null', '===',
    'map(', 'src/', '.tsx', 'let', 'type', '</div>', '#!/', '||', '?.', '<T>',
  ];

  // A fixed sequence rather than Math.random: this texture is generated on every page load, and a
  // logo whose light says something different each time is a logo that cannot be checked against a
  // screenshot. The hash below is deterministic and still looks scattered.
  let seed = 7;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let row = 0; row < ROWS; row++) {
    const y = row * ROW_H + ROW_H / 2;
    let x = next() * 60;
    while (x < SIZE) {
      const token = tokens[Math.floor(next() * tokens.length)];
      // Varied alpha, so the field has depth instead of reading as one flat printed sheet.
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + next() * 0.65).toFixed(2) + ')';
      ctx.fillText(token, x, y);
      x += ctx.measureText(token).width + 26 + next() * 70;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // The beam is viewed at a glancing angle up its whole height, which is the exact case mipmaps
  // blur into mush. Anisotropy is what keeps the glyphs readable up there.
  texture.anisotropy = 4;
  return texture;
}

/**
 * One curly brace, as a path from its top terminal to its bottom one.
 *
 * Written for the LEFT brace: arms reaching right, nub pointing left. The right brace is this same
 * curve with x negated — a mirror rather than a second hand-built path, so the two halves of the
 * mark cannot drift out of agreement when one is adjusted.
 *
 * Catmull-Rom rather than explicit beziers: the shape is defined by where the stroke GOES, and a
 * spline through those positions is a direct statement of that. Beziers would put the control
 * points off the curve, where every adjustment is indirect.
 */
const BRACE_POINTS: [number, number][] = [
  // The top arm. It runs FLAT for a stretch before it turns down, which is the detail that makes
  // this read as a typographic brace rather than as a bent wire — the artwork's terminals are
  // horizontal, and a spline given only the corner and the tip rounds that flat off entirely.
  [0.48, 1.0],
  [0.32, 1.0],
  [0.19, 0.94],
  [0.13, 0.8],
  // The upper stem, sampled twice down its length so the spline holds it straight instead of
  // bowing it between the two corners at either end.
  [0.13, 0.5],
  [0.13, 0.26],
  // The nub: the brace's waist, and the only part that crosses to the far side of the stem.
  [0.01, 0.13],
  [-0.14, 0.0],
  [0.01, -0.13],
  // Mirrored back down. The curve is symmetric about y = 0 by construction rather than by hand,
  // so the two halves cannot drift apart.
  [0.13, -0.26],
  [0.13, -0.5],
  [0.13, -0.8],
  [0.19, -0.94],
  [0.32, -1.0],
  [0.48, -1.0],
];

function makeBraceCurve(mirrored: boolean): THREE.CatmullRomCurve3 {
  const sign = mirrored ? -1 : 1;
  return new THREE.CatmullRomCurve3(
    BRACE_POINTS.map(([x, y]) => new THREE.Vector3(x * sign, y, 0)),
    false,
    // Centripetal, not the default centripetal-vs-chordal guess: uniform parameterisation
    // overshoots at the tight corners of the nub and puts a visible kink in the stroke.
    'centripetal',
    0.5,
  );
}

/**
 * The mark's surface. Raw `THREE.ShaderMaterial` rather than drei's helper, because drei is not a
 * dependency of this project and the helper's real benefit is its HMR key.
 *
 * NO BACKTICKS anywhere inside the shader strings below, including in prose: they are JS template
 * literals, and one backtick closes the string mid-shader. That mistake compiles to a syntax error
 * inside GLSL and shows up as the whole object silently failing to draw.
 */
function makeMarkMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uC0: { value: new THREE.Color(C0_ABYSS) },
      uC1: { value: new THREE.Color(C1_SLATE) },
      uC2: { value: new THREE.Color(C2_STEEL) },
      uC3: { value: new THREE.Color(C3_PALE) },
      uC4: { value: new THREE.Color(C4_WHITE) },
      uRim: { value: new THREE.Color(RIM_COLOR) },
      uGlow: { value: new THREE.Color(GLOW_COLOR) },
      uLight: { value: LIGHT.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vWorld;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform vec3 uC0;
      uniform vec3 uC1;
      uniform vec3 uC2;
      uniform vec3 uC3;
      uniform vec3 uC4;
      uniform vec3 uRim;
      uniform vec3 uGlow;
      uniform vec3 uLight;

      varying vec3 vNormal;
      varying vec3 vWorld;

      void main() {
        vec3 n = normalize(vNormal);
        vec3 view = normalize(cameraPosition - vWorld);

        // Half-Lambert (the *0.5+0.5 remap) rather than a raw clamped dot. A raw one drops to zero
        // across the whole terminator, and on a tube that reads as a hard black line running the
        // length of every stroke. The remap keeps a gradient going round the back so the strokes
        // stay round.
        float lit = dot(n, uLight) * 0.5 + 0.5;

        // Barely any bias, and pointed the OTHER WAY from the planet's cube. A planet is meant to
        // be mostly in shadow; a logo is meant to be read. So the ramp sits high: most of the lit
        // side lands in the pale end and only the surfaces genuinely turned away fall through the
        // dark stops.
        float k = pow(lit, 1.1);

        // The stops OVERLAP now, where the metal version had them nearly butting. That widening is
        // the frosting: glass scatters, so it has no hard terminator anywhere on it. Tighten these
        // back up and the same five colours read as painted chrome.
        vec3 c = uC0;
        c = mix(c, uC1, smoothstep(0.02, 0.34, k));
        c = mix(c, uC2, smoothstep(0.24, 0.56, k));
        c = mix(c, uC3, smoothstep(0.46, 0.82, k));
        c = mix(c, uC4, smoothstep(0.72, 1.00, k));

        // Light coming THROUGH the body, and this is the term that separates glass from paint: a
        // solid object is darkest where it faces away from the light, and a translucent one GLOWS
        // there, because that is the face light leaves by after crossing the material.
        //
        // Real transparency was the alternative and it is the wrong trade. The mark is seven
        // overlapping tubes, so an actually transparent material needs per-fragment sorting to look
        // right; without it the strokes composite in draw order and the mark turns to mush wherever
        // two cross. This is opaque, costs one dot product, and reads as the same thing.
        float through = pow(max(dot(n, -uLight), 0.0), 1.6);
        c += uGlow * through * 0.30;

        // The light piping — the edges. On glass this is the headline rather than a finishing
        // touch: light travelling inside the body cannot escape at a shallow angle, so it piles up
        // wherever the surface turns away and every edge runs a bright filament.
        //
        // Tighter and stronger than the metal version (3.4 and 0.8, against 2.6 and 0.5). The
        // exponent decides how WIDE that filament is, and a wide one is a soft glow around the
        // object rather than a hard line in its surface. Ungated by the light term, which is also
        // physically right here — piped light does not care where the source is.
        float fres = pow(1.0 - abs(dot(view, n)), 3.4);
        c += uRim * fres * 0.8;

        // One hard specular. Everything above is soft, and soft alone reads as wax — the tight
        // highlight is what says the surface is polished. 84 is deliberately narrow so it lands as
        // a glint on the crown of a stroke rather than as a sheen down its length.
        vec3 halfway = normalize(uLight + view);
        c += vec3(1.0) * pow(max(dot(n, halfway), 0.0), 84.0) * 0.55;

        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
}

/**
 * The halo: a cone of light standing on the base ring and flaring upward.
 *
 * This replaces a CSS radial-gradient that brightened behind the mark on hover. The gradient was
 * cheaper and it could only ever be a disc BEHIND the object — it had no way to pass in front of a
 * stroke, be occluded by another, or stand in the same space the mark occupies. In the scene it
 * does all three for free, because it is geometry among geometry.
 *
 * ## Additive, and never writing depth
 *
 * Light ADDS. Two beams crossing are brighter where they cross, and normal alpha blending would
 * instead have the nearer one hide the further. `AdditiveBlending` is what makes overlapping parts
 * of the cone accumulate rather than replace, and it is also why the colour needs no alpha channel
 * of its own — with additive blending, alpha IS the brightness.
 *
 * `depthWrite: false` is not optional. A transparent surface that writes depth stamps its own
 * silhouette into the buffer, and every part of the mark drawn after it inside that silhouette is
 * rejected — the braces would be punched out by a shape made of light. Depth TESTING stays on, so
 * the cone is still correctly hidden behind whatever is genuinely in front of it.
 *
 * NO BACKTICKS anywhere inside the shader strings, including in prose: they are JS template
 * literals and one backtick closes the string mid-shader.
 */
function makeHaloMaterial(code: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    // The cone is an open shell, so without this its far wall is culled and the beam is hollow on
    // one side — obvious the moment anything passes through it.
    side: THREE.DoubleSide,
    uniforms: {
      uAmount: { value: 0 },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(HALO_COLOR) },
      uCode: { value: code },
      uRepeat: { value: new THREE.Vector2(CODE_REPEAT_X, CODE_REPEAT_Y) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      uniform float uAmount;
      uniform float uTime;
      uniform vec3 uColor;
      uniform sampler2D uCode;
      uniform vec2 uRepeat;

      varying vec2 vUv;

      void main() {
        // Brightest at the foot and gone by the top. Squared rather than linear: a linear falloff
        // reads as a solid cone with a soft edge — a lampshade — because too much of its length
        // stays near full brightness. The square puts most of the falloff in the first third,
        // which is where light actually loses itself.
        float rise = pow(1.0 - vUv.y, 2.0);

        // The streaks. Without them this is one smooth sheet of light and it reads as a surface
        // rather than as a beam; the eye needs structure travelling with the direction of the
        // light to see it as light. 14 around the cone, and they never fully close to black so the
        // shell stays continuous between them.
        float rays = 0.55 + 0.45 * sin(vUv.x * 6.2831853 * 14.0);

        // Faded at both vertical seams of the shell. A cone's UV wraps from 1 back to 0, and the
        // ray function does not land on a whole cycle there — leaving it produces one seam that is
        // brighter or darker than its neighbours, running the full height of the beam.
        float seam = smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x);

        // The code, climbing. MINUS uTime because the cone's V runs from its base upward, so
        // subtracting slides the sheet toward the top — a plus sends the code down the beam, which
        // reads as it draining rather than rising.
        vec2 codeUv = vUv * uRepeat - vec2(0.0, uTime);
        float glyphs = texture2D(uCode, codeUv).a;

        // The code does NOT get its own alpha added on top of the beam's. It is multiplied into a
        // band that already fades with height, so the glyphs dissolve as they climb exactly as the
        // light does. Added instead, they would still be at full strength where the beam has gone
        // — text hanging in empty air above the logo.
        //
        // 0.34 of plain beam under it, so the shaft still reads as a shaft where no glyph happens
        // to be. All code and no wash is a column of floating text, not a column of light.
        float body = 0.34 + glyphs * 0.9;

        gl_FragColor = vec4(uColor, rise * rays * seam * body * uAmount * 0.62);
      }
    `,
  });
}

function Mark({ hovered }: { hovered: boolean }) {
  const material = useMemo(makeMarkMaterial, []);
  const codeTexture = useMemo(makeCodeTexture, []);
  const haloMaterial = useMemo(() => makeHaloMaterial(codeTexture), [codeTexture]);

  /** The group that leaves the ground on hover. The base ring is NOT inside it — the mark lifts
      off its plate, and if the plate came too there would be no gap to see. */
  const lift = useRef<THREE.Group>(null);
  /** 0 resting, 1 fully lifted. A ref rather than state: it changes every frame during the
      transition, and routing that through React would re-render the tree sixty times a second to
      move one number. */
  const amount = useRef(0);
  /** Drives the code's climb. Its own accumulator rather than the scene clock, for the reason
      given at the bottom of useFrame — and because a paused demand-mode canvas leaves the scene
      clock's behaviour across the gap up to R3F. */
  const clock = useRef(0);

  const invalidate = useThree((s) => s.invalidate);

  const leftBrace = useMemo(() => makeBraceCurve(false), []);
  const rightBrace = useMemo(() => makeBraceCurve(true), []);

  // GPU resources React does not own, so they are released explicitly when the hero unmounts. R3F
  // disposes what it created from JSX; these were built here.
  useEffect(
    () => () => {
      material.dispose();
      haloMaterial.dispose();
      // The texture holds a 512×512 canvas AND its GPU upload. Disposing the material does not
      // release it — three deliberately leaves textures alone there, since one is commonly shared
      // between materials.
      codeTexture.dispose();
    },
    [material, haloMaterial, codeTexture],
  );

  /**
   * The lift, and the render loop that carries it.
   *
   * The canvas runs at `frameloop="demand"`, which means R3F draws nothing unless something asks
   * it to — the resting scene costs literally zero, which is the whole reason it is on demand. So
   * the animation has to ask, and it asks in two places: this effect kicks the first frame when
   * the hover flag flips, and useFrame below re-arms itself for as long as the value is still
   * moving. The moment it settles, the asking stops and the canvas goes quiet again.
   *
   * Driving it from `frameloop="always"` while hovered would also work and is worse: the loop
   * would then be running whenever the pointer rests on the mark, drawing sixty identical frames a
   * second of a settled scene.
   */
  useEffect(() => {
    invalidate();
  }, [hovered, invalidate]);

  useFrame((_, delta) => {
    // Clamped for the usual reason: it is the length of the pause after the loop stopped, and an
    // unclamped step would jump the whole transition in a single frame.
    const dt = Math.min(delta, 0.05);
    const target = hovered ? 1 : 0;

    // Exponential damping, framed as a fraction of the remaining distance per second, so it
    // settles at the same rate on a 60Hz and a 144Hz screen.
    const k = 1 - Math.exp(-dt * HOVER_DAMP);
    const next = amount.current + (target - amount.current) * k;

    // Snapped when close enough. Exponential damping approaches its target and never arrives, so
    // without a floor this would re-arm the loop forever over differences far below one pixel.
    const settled = Math.abs(target - next) < 0.001;
    amount.current = settled ? target : next;

    if (lift.current) lift.current.position.y = amount.current * HOVER_LIFT;
    haloMaterial.uniforms.uAmount.value = amount.current;

    // The code only climbs while there is light carrying it, and its own clock only advances then
    // too — so the beam always starts from the same frame of code rather than from wherever a
    // free-running timer had got to. That also means this loop keeps itself alive for as long as
    // the beam is lit, which is the real cost of the effect: a hover holds the canvas at frame
    // rate. It is bounded by the pointer being on the mark, and it stops dead when it leaves.
    if (amount.current > 0.001) {
      clock.current += dt;
      haloMaterial.uniforms.uTime.value = clock.current * CODE_SPEED;
      invalidate();
    } else if (!settled) {
      invalidate();
    }
  });

  // Both braces and both of their end caps share ONE material instance, so retuning the mark's
  // colour is a single edit and the parts cannot fall out of step with each other.
  const braces: { curve: THREE.CatmullRomCurve3; x: number }[] = [
    { curve: leftBrace, x: -BRACE_X },
    { curve: rightBrace, x: BRACE_X },
  ];

  return (
    // Everything rides up by MARK_Y. That is not composition — it is what keeps the dropped base
    // inside the frame; see RING_Y for the arithmetic.
    <group position={[0, MARK_Y, 0]}>
      {/* The braces, in the group that lifts. Everything that should leave the ground on hover
          goes in here and nothing else does. */}
      <group ref={lift}>
        {braces.map(({ curve, x }, i) => (
          <group key={i} position={[x, 0, 0]}>
            <mesh material={material}>
              {/* 128 segments along the path: the nub is a tight reversal and a coarser sweep
                  visibly facets it into a corner. 10 around is plenty for a stroke this thin. */}
              <tubeGeometry args={[curve, 128, STROKE, 10, false]} />
            </mesh>

            {/* Caps. `TubeGeometry` builds an open pipe — it does not close its ends — so without
                these you can see straight down the hollow inside of every stroke as the mark
                turns, which is far more obvious than the four extra spheres cost. */}
            {[0, 1].map((end) => {
              const p = curve.getPoint(end);
              return (
                <mesh key={end} position={[p.x, p.y, p.z]} material={material}>
                  <sphereGeometry args={[STROKE, 12, 8]} />
                </mesh>
              );
            })}
          </group>
        ))}
      </group>

      {/* The base. Flat and below the mark's feet, OUTSIDE the lifting group so the mark rises off
          it. Shares the braces' material, so it cannot fall out of colour with them.

          It does not intersect anything, so no depth-order trickery is needed here — the second
          material that used to force the ring under the braces is gone with the arrangement that
          needed it. */}
      <group
        position={[0, RING_Y, 0]}
        rotation={[RING_TILT_X, 0, 0]}
        // Z in the group's own space is world Z only because the rotation above puts it there —
        // the torus is built in XY, tipped flat, so its depth axis ends up as the group's local Y.
        scale={[1, RING_DEPTH_SCALE, 1]}
      >
        <mesh material={material}>
          {/* Thinner tube than the strokes it carries (0.55×), because in the artwork the ring is a
              hairline — at equal weight the two stop being figure and ground. 180 segments around
              the path: perspective squashes this into a wide, shallow ellipse, and a coarser sweep
              shows as flats along the two long edges where the curve is slowest on screen. */}
          <torusGeometry args={[RING_RADIUS, STROKE * 0.55, 10, 180]} />
        </mesh>
      </group>

      {/* The halo: a cone of light standing on the base, flaring up past the mark's crown.

          Positioned by its FOOT rather than its centre — `cylinderGeometry` is built around its
          own middle, so the group sits at the ring and the mesh is pushed up half its own height
          to put its base there. Stating it this way means changing HALO_HEIGHT does not also move
          where the beam starts.

          Open-ended: a cap at either end is a disc of light hanging in the air, and the bottom one
          would sit exactly on the base ring where it reads as a puddle. */}
      <group position={[0, RING_Y, 0]}>
        <mesh material={haloMaterial} position={[0, HALO_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[HALO_TOP_RADIUS, RING_RADIUS, HALO_HEIGHT, 48, 1, true]} />
        </mesh>
      </group>
    </group>
  );
}

export const HeroLogo3D: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  // The hover flag no longer leaves this component. It used to be handed up to HeroSection so a
  // CSS halo, which was that component's sibling, could answer it — the halo is geometry in this
  // scene now, so the flag stays where it is used and the prop, the state up there and the
  // `data-mark-hover` attribute it drove are all gone.
  const [hovered, setHovered] = useState(false);

  // Mount and run only while the hero is near the viewport.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting);
        // Scrolling away with the pointer still over the mark would otherwise leave it stuck
        // lifted, and it would be found that way on the way back.
        if (!entry.isIntersecting) setHovered(false);
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /**
   * Hover, worked out from the pointer's POSITION rather than from it landing on this element.
   *
   * `onPointerEnter` on the host was the obvious way and it never fired once. The mark sits at
   * `z-index: 0` and the hero's copy column is `z-10` and full width, so the copy is stacked over
   * the mark across its whole area — `elementFromPoint` at the mark's own centre returns the text
   * div. No amount of `pointer-events` on the mark changes that; the element on top is genuinely
   * on top, and it has to be, because the copy is what people read and click.
   *
   * So the listener goes on the hero SECTION, which contains both, and asks a geometric question
   * instead of a hit-testing one: is the pointer within the mark's own circle. That also gives a
   * better target than the element ever would — the box is square and the logo is round, and the
   * corners of a square are a long way from anything anyone would call the logo.
   *
   * Gated on `(hover: hover)`. Touch fires pointermove on tap, and a tap that lights the mark and
   * then leaves it lit until the next tap somewhere else is not a hover, it is a stuck state.
   */
  useEffect(() => {
    const el = hostRef.current;
    const section = el?.closest('section');
    if (!el || !section) return;
    if (!window.matchMedia('(hover: hover)').matches) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      // 0.38 of the box, against the artwork's own 0.345 (it fills 0.69 of the box across). The
      // margin is deliberate: a target that ends exactly at the ink edge feels like it is failing
      // whenever the pointer is a few pixels out.
      const reach = r.width * 0.38;
      setHovered(dx * dx + dy * dy <= reach * reach);
    };
    const onLeave = () => setHovered(false);

    section.addEventListener('pointermove', onMove);
    section.addEventListener('pointerleave', onLeave);
    return () => {
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    // The site's only WebGL scene, and therefore its only context.
    //
    // It briefly shared a single canvas with the credential card through drei's `<View>`, which is
    // the right answer when several scenes have to coexist — three contexts on this page had the
    // browser dropping them mid-scroll. The card left the site entirely (it is a 3D-printed object
    // now, see tools/export-card-model.mjs), so there is nothing left to share with, and one scene
    // in its own canvas is simpler than one scene in a shared one.
    //
    // If a second scene is ever added, `@react-three/drei`'s View is what to reach for again —
    // not a second `<Canvas>`.
    <div
      ref={hostRef}
      className="hero-mark"
      aria-hidden="true"
      // No pointer handlers and no `pointer-events` — the copy column is stacked over this element,
      // so neither would ever fire. Hover is read from the pointer's coordinates on the section
      // instead; see the effect above.
    >
      {/* Paused, NOT unmounted. `{active && <Canvas/>}` destroyed the context on every scroll past
          and rebuilt it on the way back, which is a fresh context, a shader recompile and a scene
          rebuild on the main thread each time. Kept mounted it churns nothing. */}
      <Canvas
        // 'demand', not 'always'. The scene is completely static now, so it draws once and then
        // does nothing for the rest of the session. `active` still gates it: a demand-mode canvas
        // renders on mount and on prop changes, and there is no reason to spend even that one
        // frame on a hero nobody has scrolled to yet.
        frameloop={active ? 'demand' : 'never'}
        dpr={[1, MAX_DPR]}
        // At fov 45 the visible height at the origin is 2·dist·tan(22.5°); 3.9 gives 3.23 world
        // units. The figure that has to fit is the ring: 1.30 + 0.058 = 1.358 from the centre, so
        // 2.72 across, inside 3.23 with 8% clear on each side. The braces sit entirely within it,
        // so nothing else can reach the canvas edge.
        camera={{ position: [0, 0, 3.9], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <Mark hovered={hovered} />
      </Canvas>
    </div>
  );
};
