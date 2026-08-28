import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { COBALT, COBALT_DEEP, ICE, PAPER } from '../lib/homePalette';

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

/**
 * What a field is painted in.
 *
 * The ramp has to sit within a few steps of the ground it stands on, or the field stops being
 * texture on the background and becomes a second object competing with whatever is on top of it.
 * That is a rule about the RELATIONSHIP between these five values, not about the values, which is
 * why they travel together as one object rather than as five loose props.
 */
export interface FieldTones {
  /** The low of the swell. A step darker than the ground. */
  trough: string;
  /** The high of the swell. A step lighter than the ground. */
  crest: string;
  /** An accent, on the crests only, tying the field to the rest of the page. */
  foam: string;
  /** The ground the field stands on. Troughs sink back toward it. */
  ground: string;
  /**
   * What the cubes turn into as they break up, at the BOTTOM edge and at the TOP edge.
   *
   * Two, because the two edges of a field do not generally meet the same thing: a strip that
   * arrives out of the paper above it and settles into the blue below it has to pale toward paper
   * at one end and toward blue at the other. One colour for both leaves pale specks on the dark
   * end or dark specks on the pale one — which is the tell that the cubes are being faded rather
   * than actually going.
   */
  intoLo: string;
  intoHi: string;
}

/**
 * The hero's: the ice of its own section, with the brand's cobalt on the crests.
 *
 * Trough/crest are DERIVED from the ground via `shadeColor` (defined below) rather than picked by
 * eye — `±0.14`, the same step `connectionTones` already uses for a per-page belt, so a hand-set
 * ramp and a computed one are built by the same rule instead of two different ones that happen to
 * look similar today and drift apart the next time either ground colour moves.
 */
export const HERO_TONES: FieldTones = {
  trough: shadeColor(ICE, -0.14),
  crest: shadeColor(ICE, 0.14),
  foam: COBALT,
  ground: ICE,
  // Down into the paper of the section below. The top never fades, so its colour is only ever the
  // ground it already stands on.
  intoLo: PAPER,
  intoHi: ICE,
};

/**
 * The contact band's: the brand's blue at rest, with the page's ice on the crests.
 *
 * `COBALT_DEEP` rather than `COBALT` for the ground — this fills the ENTIRE section, and the
 * brand's own brief asks for bold colour to stay rare enough to carry weight when it appears. A
 * full-bleed panel in the button-bright blue would be exactly the loud, undifferentiated colour
 * use the brief warns against; brought back toward Midnight, the section reads as "the brand's
 * blue, at rest" instead of a CTA stretched across the screen. See homePalette.ts for the measured
 * derivation and the contrast numbers on it.
 */
export const COBALT_TONES: FieldTones = {
  trough: shadeColor(COBALT_DEEP, -0.14),
  crest: shadeColor(COBALT_DEEP, 0.14),
  foam: ICE,
  ground: COBALT_DEEP,
  // Up out of the paper above and down into the section's own blue below.
  intoLo: COBALT_DEEP,
  intoHi: PAPER,
};

/**
 * The footer band's: the page's paper coming up out of the contact section's blue.
 *
 * The only ramp here that does not straddle its ground. Paper is a step off white, so a crest
 * "lighter than the ground" would be white — the tops of the swell would go out at exactly the
 * moment they catch the most light, and the field would read as a grid of holes rather than a
 * relief. Both ends sit BELOW paper instead, in the same ice-deep family the rest of the page is
 * made of, so the cubes read as blocks standing on paper and the swell still runs dark to light
 * across them.
 */
export const PAPER_BAND_TONES: FieldTones = {
  trough: shadeColor(PAPER, -0.1),
  crest: shadeColor(PAPER, 0.05),
  foam: COBALT,
  ground: PAPER,
  // Down into the footer's own paper, up into the blue of the section above.
  intoLo: PAPER,
  intoHi: COBALT_DEEP,
};

/**
 * A whole SECTION of blue, rather than a strip across the edge of one.
 *
 * Both `into` edges are the ground's own colour, which is what makes this different from the band
 * sets above: those cross from one section's colour into the next, so each end fades toward
 * something else. This one has nothing to cross into — it fills its section and simply runs out at
 * the top and bottom, so neither end lands on a straight seam.
 *
 * `foam` stays the page's ice so the field ties to whatever panel is sitting on it. Ground is
 * `COBALT_DEEP` for the same reason `COBALT_TONES` above uses it: this is a full-bleed fill, and
 * the brand's brief reserves the brighter, button-toned Cobalt for things that are actually being
 * pointed at rather than for whole screens of colour.
 *
 * Shared by the timeline page and the templates page. It was written twice, once in each, which is
 * exactly how two sections that are meant to be the same surface drift into two surfaces.
 */
export const SECTION_TONES: FieldTones = {
  trough: shadeColor(COBALT_DEEP, -0.14),
  crest: shadeColor(COBALT_DEEP, 0.14),
  foam: ICE,
  ground: COBALT_DEEP,
  intoLo: COBALT_DEEP,
  intoHi: COBALT_DEEP,
};

/**
 * How much of the canvas, as a fraction of its height, the field spends breaking up at each edge.
 *
 * This is how a field ENDS, and it is a real edge rather than a shape laid over one: the cubes
 * themselves get shorter, narrower and paler as they approach the edge, each one crossing its own
 * threshold, until there is nothing left to stop. What you see is a field running out, not a field
 * being cropped.
 *
 * `lo` is the bottom of the canvas and `hi` the top; zero means that edge does not fade at all.
 *
 * The DOM has to agree with whatever is passed here. The ground under the canvas ramps to the next
 * colour across exactly the same band, so the blocks thin out over ground that is already turning
 * into what comes next — which is why the two consumers export their bands as constants rather than
 * writing the number twice.
 */
export interface FieldFade {
  lo: number;
  hi: number;
}

/** The hero's: full strength at the top of the screen, breaking up into the fold. */
export const HERO_FADE: FieldFade = { lo: 0.16, hi: 0 };

/**
 * The contact band's: arrives out of the paper section above and settles into the blue below.
 *
 * `hi` has been wrong in both directions, and the two failures look nothing alike.
 *
 * At 0.36 the top third of the band held almost no cubes, over a ground that was still a pale
 * paper-to-blue ramp — a dead strip between the paper section and the field, which is the "void"
 * that got reported. The answer to that was to drop `hi` to 0.05, and that produced the opposite
 * fault: "no fade" in this shader does not mean the field starts at the top, it means the first
 * row of cubes stands at FULL HEIGHT on the band's first pixel and is sliced flat by the canvas
 * edge. A straight horizontal cut across a field of hard-edged blocks — the same failure the note
 * on FOOTER_BAND_FADE below describes, arriving a second time on the other band.
 *
 * Neither number was the real lever. The fade only reads as a void when the ground UNDER it has
 * already left paper: cubes fraying in over paper look like the section above sprouting them,
 * and the same cubes over a half-blue ramp look like a gap. So 0.22 here is paired with a
 * gradient in ContactSection that holds paper through most of it — see the note there. The two
 * numbers are one decision and cannot be tuned apart.
 */
export const BAND_FADE: FieldFade = { lo: 0.36, hi: 0.28 };

/** A full section's: a little at the top where the cubes slide under the navbar, more at the bottom
    where they run into whatever follows. The middle stays full strength, which is where the content
    sits. */
export const SECTION_FADE: FieldFade = { lo: 0.22, hi: 0.1 };

/**
 * A connection band at the meeting of a coloured section and the footer. The cubes stand on
 * `from` (the section above) and dissolve into `to` (the footer's ground) across the band.
 *
 * BOTH edges fade, and the top one is the fix for a cut that was visible on every page. This read
 * `hi: 0` on the reasoning that the top is continuous with the section above, so it needed no
 * fade — but "no fade" in this shader means the first row of cubes stands at FULL HEIGHT on the
 * band's very first pixel. The result was a hard horizontal line across the page: flat colour
 * above it, a solid wall of cubes below it, starting all at once. The band's own gradient was
 * continuous; the field on top of it was not, and that was the seam.
 *
 * 0.3 against the 0.42 below is deliberate rather than symmetric. The top has to dissolve into a
 * flat colour, where any residue reads as dirt on a clean surface; the bottom dissolves into the
 * footer's own ruled grid and links, which hide the tail end. So the top gets a shorter, cleaner
 * exit and the bottom a longer one, and 0.72 of the band is spent arriving and leaving — the
 * middle third is where the field is actually at full strength.
 */
export const FOOTER_BAND_FADE: FieldFade = { lo: 0.42, hi: 0.3 };

/** Mix `hex` toward black (amt < 0) or white (amt > 0) by `amt` (0..1). Used to derive a band's
 *  trough/crest from the section it stands on, so the palette stays in one family without hand
 *  spelling a ramp for every possible ground. */
function shadeColor(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const target = amt < 0 ? 0 : 255;
  const p = Math.min(1, Math.max(0, Math.abs(amt)));
  const mix = (c: number) => Math.round((target - c) * p + c);
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The five paint colours for a connection band joining `from` (the section above) to `to` (the
 * footer's ground), with `foam` as the accent on the crests.
 *
 * `body` is what the field itself is MADE of — its ground, and the trough/crest a step either side
 * of it. It defaults to `from`, which makes the band a continuation of the section above; passing
 * something else makes the band a colour in its own right, arriving out of `from` at the top and
 * settling into `to` at the bottom. Only the middle changes: both ends still resolve to exactly the
 * colours either side of them, which is what keeps the joins invisible whatever the body is.
 */
export function connectionTones(
  from: string,
  to: string,
  foam: string,
  body: string = from,
): FieldTones {
  return {
    trough: shadeColor(body, -0.14),
    crest: shadeColor(body, 0.14),
    foam,
    ground: body,
    intoLo: to,
    intoHi: from,
  };
}

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
 * keeps 1.25 rather than 1.5. Slightly softer than it used to be: the field is flat tiles, the
 * extra 0.25 cost a fifth of the fragment budget for detail nobody sits close enough to see, and on
 * a weak laptop that fifth is the difference between the swell running smooth and the page slowing.
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
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? 1 : 1.25;

/** Pixels per world unit. Fixes the mapping between the screen and the scene, which is what lets
    the grid be specified in pixels below. */
const ZOOM = 100;

/**
 * Tile pitch in CSS pixels, floor and ceiling. Smaller on a coarse pointer: a phone holds the
 * screen closer, and the same pitch that reads as a texture at arm's length reads as a
 * chequerboard at 30cm.
 */
const CELL_MIN = MAX_DPR > 1 ? 46 : 34;
const CELL_MAX = MAX_DPR > 1 ? 78 : 62;

/** Cubes across the screen, which is the thing that actually has to stay constant. */
const CELL_COLS = 44;

/**
 * The pitch for a given screen width.
 *
 * A pitch fixed in CSS pixels is a pitch fixed in inches, and that is the wrong invariant for this
 * field. It is not a texture with a grain size, it is a COMPOSITION: a screen's worth of blocks
 * with a swell running through it, and what makes it read is how many blocks that is. Held at 46px
 * a 1440 screen gets 33 across and an ultrawide gets 78 — same picture, but at more than double the
 * count the blocks stop being blocks and the field turns into woven cloth behind the panel.
 *
 * So the count is what is held and the pitch follows, between a floor and a ceiling. The floor is
 * the old fixed value, which means nothing at or below 1500px moves by a pixel — the ramp only
 * starts where the screen is wider than the composition was ever drawn for. Rounded to whole
 * pixels so a drag-resize crosses a handful of values rather than rebuilding the material on
 * every frame of the drag.
 */
const cellFor = (width: number): number =>
  Math.round(Math.min(CELL_MAX, Math.max(CELL_MIN, width / CELL_COLS)));

function makeFieldMaterial(cell: number, tones: FieldTones, fade: FieldFade): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    // Solid now, where the flat version was transparent. Cubes genuinely overlap each other on
    // screen, so the depth buffer is doing real work and there is nothing left to blend.
    transparent: false,
    uniforms: {
      uTime: { value: 0 },
      uCell: { value: cell },
      uTrough: { value: new THREE.Color(tones.trough) },
      uCrest: { value: new THREE.Color(tones.crest) },
      uFoam: { value: new THREE.Color(tones.foam) },
      uSand: { value: new THREE.Color(tones.ground) },
      uIntoLo: { value: new THREE.Color(tones.intoLo) },
      uIntoHi: { value: new THREE.Color(tones.intoHi) },
      // A hair above zero on an edge that is meant not to fade: smoothstep with both edges equal
      // is undefined at the boundary, and the artefact it produces is a single row of cubes that
      // flickers between full height and nothing along the top of the screen.
      uFade: { value: new THREE.Vector2(Math.max(fade.lo, 1e-4), Math.max(fade.hi, 1e-4)) },
      uLight: { value: LIGHT.clone() },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uCell;
      uniform vec2 uFade;
      uniform vec3 uIntoLo;
      uniform vec3 uIntoHi;

      varying vec3 vInto;
      varying float vW;
      varying float vK;
      varying vec3 vN;

      // One stable pseudo-random value per cell. Stable is the whole requirement: the threshold a
      // cube dissolves at has to be a property of that cube, not of the frame, or the bottom of the
      // field boils instead of settling.
      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

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
        vec4 centre4 = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 centre = centre4.xy;
        float w = swell(centre) * 0.5 + 0.5;

        vW = w;

        // Where this cube sits DOWN THE SCREEN, taken through the same projection everything else
        // goes through. The field is a flat grid that is then tilted as a whole, so no axis of the
        // grid runs along the bottom of the frame; asking the projection is the only way to get a
        // measure of "how close to the bottom edge" that survives the tilt, a resize, and a change
        // of aspect. -1.0 is the bottom of the canvas.
        float ndcY = (projectionMatrix * modelViewMatrix * centre4).y;
        // One band per edge, multiplied: a cube is at full strength only where it is clear of
        // BOTH. A strip that has to arrive out of one colour and settle into another inside its
        // own height needs both; a full-screen field that only ends at the fold sets the other to
        // nothing and this collapses to the single band it had before.
        float tLo = smoothstep(-1.0, -1.0 + 2.0 * uFade.x, ndcY);
        float tHi = smoothstep(1.0, 1.0 - 2.0 * uFade.y, ndcY);
        float t = tLo * tHi;

        // Whichever band is the limiting one is the edge this cube is leaving by, and so is the
        // colour it has to pale toward on the way out.
        vInto = mix(uIntoHi, uIntoLo, step(tLo, tHi));

        // Each cube gets its own point in the band to give out at, so the field frays. Without the
        // per-cell offset every cube in a row would shrink in lockstep and the dissolve would be a
        // horizontal line again — a soft one, but still a line, and a soft line across a field of
        // hard-edged blocks is the one thing that would look like a mistake.
        float k = clamp((t - hash21(centre * 7.3) * 0.62) / 0.38, 0.0, 1.0);
        vK = k;
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
        // The dissolve rides on the height the swell already asked for, so a cube on its way out
        // keeps the shape of the wave it belongs to instead of being flattened by a separate rule.
        float d = mix(0.08, 0.86, w) * uCell * k;
        vec3 p = position;
        // Under two thirds of the cell, so a third of the ground shows between neighbours. At 0.8
        // the side faces of a tilted grid close every gap and the field fuses into one corrugated
        // sheet — the cubes stop being countable, which is the only thing making them cubes.
        // Narrowing as well as shortening, which is the difference between blocks lying down and
        // blocks receding. Height alone leaves a full-width tiled floor at the bottom of the frame;
        // pulling the footprint in too opens the ground between them as they go.
        p.xy *= uCell * 0.62 * mix(0.42, 1.0, k);
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

      varying vec3 vInto;
      varying float vW;
      varying float vK;
      varying vec3 vN;

      void main() {
        // Spent cubes leave rather than lie flat. A cube driven to zero height is still a quad on
        // the base plane, and a field of those is a tiled floor across the bottom of the frame —
        // the exact hard edge this is here to avoid. Dropping the fragment costs nothing and keeps
        // the material opaque, so the depth buffer goes on doing its job for the cubes that remain.
        if (vK < 0.02) discard;

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

        // And the last of the colour goes with the last of the height. The ground beneath is
        // already ramping to whatever comes next across this same band, so a cube that kept full
        // colour until the moment it vanished would read as a chip of debris on a clean page.
        // Held near full for most of the band and given up late, so the field stays itself until
        // it is genuinely going.
        c = mix(vInto, c, mix(0.12, 1.0, smoothstep(0.0, 0.7, vK)));

        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
}

/* ── The field ──────────────────────────────────────────────────────────────────────────── */

const Field: React.FC<{ reduced: boolean; tones: FieldTones; fade: FieldFade }> = ({
  reduced,
  tones,
  fade,
}) => {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const cellPx = cellFor(size.width);
  const cell = cellPx / ZOOM;
  /* Margin rows and columns, and the tilt is what they pay for. Tipping the grid shortens its
     projected height by cos(TILT_X) and its width by cos(TILT_Y), so a field sized exactly to the
     screen pulls its own edges inside the frame and leaves bare sand along two sides. Six either
     way covers that, the cube height standing proud at the top, and a resize mid-drag. */
  const cols = Math.ceil(size.width / cellPx / Math.cos(TILT_Y)) + 10;
  const rows = Math.ceil(size.height / cellPx / Math.cos(TILT_X)) + 10;
  const count = cols * rows;

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(() => makeFieldMaterial(cell, tones, fade), [cell, tones, fade]);
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

export interface TileFieldProps {
  /** What the field is painted in, and what it turns into where it breaks up. */
  tones?: FieldTones;
  /** How much of the canvas it spends breaking up at each edge. */
  fade?: FieldFade;
}

/**
 * One field, two configurations: the hero's full screen of sand and the contact section's strip of
 * blue. Both are the same grid, the same swell and the same shader — what differs is five colours
 * and two numbers, and keeping them as arguments rather than as a second copy of this file is what
 * stops the two drifting into two different ideas of what a cube looks like.
 */
export const TileField: React.FC<TileFieldProps> = ({ tones = HERO_TONES, fade = HERO_FADE }) => {
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
          <Field reduced={reduced} tones={tones} fade={fade} />
        </group>
      </Canvas>
    </div>
  );
};
