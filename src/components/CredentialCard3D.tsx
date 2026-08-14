import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { View, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import logoMark from '../assets/images/novaiq-icon.png';
import { MAX_DPR } from '../lib/renderBudget';

interface CredentialCard3DProps {
  language: 'ar' | 'en';
}

/**
 * The hero credential card, as real geometry.
 *
 * ## Why this stopped being CSS
 *
 * The card needs three things at once: a rounded outline, visible thickness, and a back. In CSS
 * 3D that combination has no correct construction, and every approximation was tried here before
 * this file existed. A rounded corner is a curved surface, and CSS has no element that draws
 * one — it only has flat rectangles, so the rim has to be faked:
 *
 *   · a stack of rings follows the curve, but is many stacked surfaces;
 *   · four straight strips are few surfaces, but meet at a point, because a chord is not an arc;
 *   · one flat ring follows the curve and is one surface, but has no extent in depth, so the
 *     gap it was added to hide stays open;
 *   · coplanar faces have no gap at all, but then there is no thickness either.
 *
 * Each of those is a different corner of the same impossibility, not a tuning failure. WebGL has
 * no such gap: a bevelled, rounded slab is an ordinary mesh, and it is right from every angle
 * because it is actually that shape.
 *
 * ## Why it does not cost anything
 *
 * `frameloop="demand"` — the renderer draws only when something asks it to. Nothing here asks
 * unless the card is being turned or is easing back, so a card sitting on screen renders exactly
 * zero frames per second and the GPU is idle. That is the opposite of the hero scene this
 * project removed earlier, which drifted forever and kept a phone's GPU running flat out; the
 * expense there was never three.js, it was a render loop that never stopped.
 *
 * It is also one canvas, which the browser composites as a single layer. The whole class of bug
 * that plagued the CSS version — layers being created, promoted, evicted and re-rasterised as
 * the card moved, seen as the card blinking out and back — cannot occur, because there are no
 * per-element layers to churn.
 *
 * The faces are drawn once into a 2D canvas and used as textures: Arabic shapes correctly there
 * through the browser's own text engine, and a texture is uploaded to the GPU once rather than
 * being re-rasterised per frame.
 */

// The card now breaks out of its column to about 34rem (544px); a phone at three device pixels
// to one wants ~1630 real pixels across it, so anything much below this is visibly soft text.
const TEX_W = 1600;
const TEX_H = 1009; // 1.586:1, the ISO card ratio

/** The card's type, and the site's: one family, so the card is not a foreign object on the page. */
const FONT = "'Cairo', system-ui, sans-serif";

/**
 * The logo, loaded once at module scope rather than per mount.
 *
 * Loading it inside the component meant the back was drawn blank first and repainted when the
 * image arrived — and if that repaint was missed for any reason, the reverse of the card was
 * simply empty, which is what was reported. Starting the fetch when this module is first imported
 * means it is normally decoded before the card is even mounted, and anything that mounts later
 * gets it synchronously.
 */
const markImage = new Image();
let markReady = false;
const markWaiters = new Set<() => void>();
markImage.onload = () => {
  markReady = true;
  for (const w of markWaiters) w();
  markWaiters.clear();
};
markImage.src = logoMark;
const CARD_W = 1.586;
const CARD_H = 1;
const CARD_D = 0.05;
const CARD_R = 0.1; // corner radius in world units
const BEVEL = 0.006;
/** Half the finished slab, bevel included — the faces sit just outside this. */
const HALF_D = CARD_D / 2 + BEVEL;

/** Rounded-rectangle clip, so the texture's own corners are transparent and match the mesh. */
function clipRounded(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = (CARD_R / CARD_W) * w;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.clip();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * The four guarantee glyphs, drawn rather than imported.
 *
 * The DOM card used lucide's Clock / ShieldCheck / Award / Globe2. A texture cannot mount a React
 * icon, and shipping their path data would be copying a library's internals into this file to be
 * scaled by hand. These are the same four ideas at the same weight, built from arcs and lines, at
 * the one size they are ever drawn — which is all a 66px badge can show anyway.
 */
function glyph(ctx: CanvasRenderingContext2D, kind: number, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.13;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (kind === 0) {
    // Clock
    ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
    ctx.moveTo(cx, cy - s * 0.28);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + s * 0.22, cy + s * 0.14);
  } else if (kind === 1) {
    // Shield with a check
    ctx.moveTo(cx, cy - s * 0.52);
    ctx.lineTo(cx + s * 0.44, cy - s * 0.3);
    ctx.lineTo(cx + s * 0.44, cy + s * 0.06);
    ctx.quadraticCurveTo(cx + s * 0.44, cy + s * 0.42, cx, cy + s * 0.55);
    ctx.quadraticCurveTo(cx - s * 0.44, cy + s * 0.42, cx - s * 0.44, cy + s * 0.06);
    ctx.lineTo(cx - s * 0.44, cy - s * 0.3);
    ctx.closePath();
    ctx.moveTo(cx - s * 0.2, cy + s * 0.02);
    ctx.lineTo(cx - s * 0.04, cy + s * 0.18);
    ctx.lineTo(cx + s * 0.24, cy - s * 0.16);
  } else if (kind === 2) {
    // Award: medal over a ribbon
    ctx.arc(cx, cy - s * 0.16, s * 0.34, 0, Math.PI * 2);
    ctx.moveTo(cx - s * 0.22, cy + s * 0.12);
    ctx.lineTo(cx - s * 0.3, cy + s * 0.56);
    ctx.lineTo(cx, cy + s * 0.38);
    ctx.lineTo(cx + s * 0.3, cy + s * 0.56);
    ctx.lineTo(cx + s * 0.22, cy + s * 0.12);
  } else {
    // Globe: outline, equator, meridian
    ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
    ctx.moveTo(cx - s * 0.5, cy);
    ctx.lineTo(cx + s * 0.5, cy);
    ctx.moveTo(cx, cy - s * 0.5);
    ctx.bezierCurveTo(cx + s * 0.32, cy - s * 0.2, cx + s * 0.32, cy + s * 0.2, cx, cy + s * 0.5);
    ctx.bezierCurveTo(cx - s * 0.32, cy + s * 0.2, cx - s * 0.32, cy - s * 0.2, cx, cy - s * 0.5);
  }
  ctx.stroke();
  ctx.restore();
}

function drawFront(isAr: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TEX_W;
  c.height = TEX_H;
  const ctx = c.getContext('2d')!;
  clipRounded(ctx, TEX_W, TEX_H);

  // Body, in dark charcoal. It has been three things: white, then brand violet, and now neutral.
  //
  // White was a bright rectangle on a near-black page that the eye went to before anything else.
  // Violet was right while the site HAD an accent hue — the card read as the same product as the
  // interface around it. The site is monochrome now, and the only colour left on it is the hero
  // mark. A violet card would be a second chromatic object, and two accents are no accent.
  //
  // The lightness of the three stops is carried over unchanged from the violet version, so the
  // card's material reads exactly as before and only its hue is gone.
  //
  // Still a radial gradient from the upper left, because that is where the key light is: the corner
  // nearest the light is the lightest part of the material, which is what makes a flat plane read
  // as a solid rather than as a fill.
  const g = ctx.createRadialGradient(TEX_W * 0.12, TEX_H * 0.08, 0, TEX_W * 0.12, TEX_H * 0.08, TEX_W * 1.1);
  g.addColorStop(0, '#48474d');
  g.addColorStop(0.45, '#2a2a2e');
  g.addColorStop(1, '#141416');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const PAD = 92;
  const INK = '#ffffff';

  // Circuit tracery, engraved rather than printed.
  //
  // A groove cut into a surface is read from two cues and only two: the far wall of the cut is in
  // shadow, and the near lip of it catches the light. So each line is drawn twice — once in white
  // offset down-right by a pixel and a half, once in black on the true path — and the eye reads
  // the pair as a channel below the surface instead of ink on top of it. The offset direction has
  // to agree with the scene's key light, which comes from the upper left; reverse it and the same
  // two strokes read as raised instead.
  const traces: Array<[number, number][]> = [
    [[0, 230], [369, 230], [438, 300], [722, 300]],
    [[TEX_W, 369], [1260, 369], [1199, 307], [975, 307]],
    [[0, 730], [461, 730], [546, 645], [915, 645]],
    [[TEX_W, 807], [1190, 807], [1121, 738], [967, 738]],
  ];
  const dots: Array<[number, number]> = [[722, 300], [975, 307], [915, 645], [967, 738]];

  const strokeTraces = (dx: number, dy: number, style: string, width: number) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    for (const pts of traces) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0] + dx, pts[0][1] + dy);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + dx, pts[i][1] + dy);
      ctx.stroke();
    }
    for (const [cx, cy] of dots) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  // Same two cues on a dark body, at the tones a dark body actually gives them: the lit lip is a
  // lighter grey than the card rather than pure white, and the cut goes darker than the card
  // instead of being drawn in a black that has nowhere left to go.
  strokeTraces(1.5, 1.5, 'rgba(255,255,255,0.22)', 3.5); // lit lip
  strokeTraces(0, 0, 'rgba(0,0,0,0.62)', 3.5); // shadowed cut

  // The pads at the ends of each run, sunk the same way.
  for (const [cx, cy] of dots) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(cx + 1.5, cy + 1.5, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.66)';
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Header: the wordmark, alone, on the reading-start side.
  //
  // A gold EMV chip and a contactless arc used to sit opposite it. They made this look like a
  // payment card, which is the one thing it is not — it is an identity card, printed and handed
  // to someone so they can find the company later. A chip on a card that carries no chip is a
  // promise the object cannot keep, and on paper it prints as a gold rectangle that means
  // nothing. The header is the name, and the space is the design.
  ctx.textBaseline = 'top';
  ctx.fillStyle = INK;
  ctx.font = `900 76px ${FONT}`;
  ctx.letterSpacing = '15px';
  ctx.direction = 'ltr';
  ctx.textAlign = isAr ? 'right' : 'left';
  ctx.fillText('NOVAIQ', isAr ? TEX_W - PAD : PAD, PAD - 6);
  ctx.letterSpacing = '0px';

  // The four guarantees: badge, title, and the description line underneath. The description is
  // what the DOM card dropped below the `sm` breakpoint; the texture is a fixed 1.586:1 canvas
  // rather than a responsive box, so there is always room for it and it is always drawn.
  const titles = isAr
    ? ['تسليم سريع ومنظم', 'مواصفات برمجية دقيقة', 'دعم فني متكامل', 'أداء فائق السرعة']
    : ['Fast, structured delivery', 'Precise technical specs', 'Complete technical support', 'Blazing performance'];
  const descs = isAr
    ? ['منهجية برمجية واضحة ومحددة', 'حقوق الكود كاملة مع الحفظ', 'متابعة دورية حسب الاتفاق', 'أحدث التقنيات لسرعة استثنائية']
    : ['Clear timeline and sprints', 'Full code ownership', 'Ongoing technical SLA', 'Modern web tech stacks'];

  const GAP = 36;
  const colW = (TEX_W - PAD * 2 - GAP) / 2;
  const BADGE = 88;

  titles.forEach((title, i) => {
    const col = i % 2;
    const row = (i / 2) | 0;
    const top = 356 + row * 200;
    // Columns run from the reading-start edge inward, so column order follows the language.
    const startX = isAr ? TEX_W - PAD - col * (colW + GAP) : PAD + col * (colW + GAP);
    const badgeX = isAr ? startX - BADGE : startX;
    const textX = isAr ? startX - BADGE - 24 : startX + BADGE + 24;

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, badgeX, top, BADGE, BADGE, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2.5;
    roundRect(ctx, badgeX, top, BADGE, BADGE, 18);
    ctx.stroke();
    glyph(ctx, i, badgeX + BADGE / 2, top + BADGE / 2, 42, INK);

    ctx.direction = isAr ? 'rtl' : 'ltr';
    ctx.textAlign = isAr ? 'right' : 'left';
    const maxText = colW - BADGE - 24;

    ctx.fillStyle = INK;
    ctx.font = `800 56px ${FONT}`;
    ctx.fillText(title, textX, top - 8, maxText);

    // 600 rather than 500, and 78% rather than 68%: at this size those two changes are the
    // difference between a second line you read and one you merely notice.
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = `600 40px ${FONT}`;
    ctx.fillText(descs[i], textX, top + 62, maxText);
  });

  // Footer, opposite the wordmark
  // Bigger and darker than it was: at 27px and half-opacity this line was reported as simply not
  // visible on a phone, which it effectively was not — it worked out to about nine screen pixels
  // tall after the canvas had been rendered and scaled.
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `700 34px ${FONT}`;
  ctx.letterSpacing = '4px';
  ctx.direction = isAr ? 'rtl' : 'ltr';
  ctx.textAlign = isAr ? 'left' : 'right';
  ctx.fillText(
    isAr ? 'شركة برمجية عراقية' : 'IRAQI SOFTWARE STUDIO',
    isAr ? PAD : TEX_W - PAD,
    TEX_H - PAD - 20,
  );
  ctx.letterSpacing = '0px';

  return c;
}

// Half the front's resolution. The back is a stripe, a mark and one line of small type — there is
// no dense text on it to keep crisp, and at full size the pair of textures would cost about 21MB
// of GPU memory with mipmaps, which is real money on the weak phones this has to run on.
const BACK_W = TEX_W / 2;
const BACK_H = TEX_H / 2;

/**
 * The reverse: the company mark, centred, in flat black on white.
 *
 * `mark` arrives later than the first call — it is a PNG and the texture has to exist before it
 * loads — so this is written to be run twice into the same canvas, once bare and once with the
 * logo, rather than being blocked on the image. The caller flags the texture for re-upload.
 *
 * The mark is drawn through an offscreen `source-in` fill, which keeps the artwork's alpha and
 * replaces every colour in it with one flat tone — white now that the card is dark. That is what
 * makes it a clean silhouette at any size, rather than the source PNG's own shading dropped onto
 * a surface it was never drawn against.
 */
function drawBack(c: HTMLCanvasElement, mark?: HTMLImageElement) {
  const ctx = c.getContext('2d')!;
  ctx.save();
  ctx.clearRect(0, 0, BACK_W, BACK_H);
  clipRounded(ctx, BACK_W, BACK_H);
  // Everything below is written in front-texture units, so the two faces stay described by one
  // set of numbers; this is the only place the difference in size is handled.
  ctx.scale(0.5, 0.5);

  // A touch lighter than the front's darkest corner, so turning the card is a change of shade and
  // not a jump between two unrelated surfaces.
  ctx.fillStyle = '#212124';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // A single hairline frame, and nothing else competing with the mark.
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 4;
  roundRect(ctx, 34, 34, TEX_W - 68, TEX_H - 68, 44);
  ctx.stroke();

  if (mark) {
    // Centred on the card, both axes, and left as the only thing on this face — the wordmark that
    // used to sit under it made the mark read as the top half of a lockup rather than as the
    // reverse of a card, which is a different thing to be looking at.
    const size = Math.round(TEX_H * 0.46);
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const octx = off.getContext('2d')!;
    octx.drawImage(mark, 0, 0, size, size);
    octx.globalCompositeOperation = 'source-in';
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, size, size);
    ctx.drawImage(off, (TEX_W - size) / 2, (TEX_H - size) / 2);
  }

  // No domain under the mark. `novaiq.space` was printed here before a domain had actually been
  // registered — and this is the face of a card meant to be printed and handed to people, where a
  // wrong address is worse than no address: it sends someone to nothing and cannot be corrected
  // once the card is in their hand. The mark stands on its own until there is a real one to add.
  ctx.restore();
}

function makeBackCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = BACK_W;
  c.height = BACK_H;
  // With the logo already in it wherever possible. The module-level fetch below normally finishes
  // long before this component is reached — it is lazy-loaded behind a chunk boundary and waits on
  // fonts as well — so the usual path bakes the mark in at creation and never needs the repaint at
  // all. The repaint stays as the fallback for a genuinely slow first load.
  drawBack(c, markReady ? markImage : undefined);
  return c;
}

/** A rounded, bevelled slab — the part CSS could not express. */
function useCardGeometry() {
  return useMemo(() => {
    const w = CARD_W / 2;
    const h = CARD_H / 2;
    const r = CARD_R;
    const shape = new THREE.Shape();
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: CARD_D,
      bevelEnabled: true,
      bevelSize: BEVEL,
      bevelThickness: BEVEL,
      bevelSegments: 2,
      curveSegments: 14,
    });

    // Centre the slab on z = 0, and the exact figure matters more than it looks.
    //
    // A bevelled extrusion spans [-bevelThickness, depth + bevelThickness], so its midpoint is
    // depth/2 — the bevel adds the same amount at both ends and cancels. This was translated by
    // -(depth + 2·bevel)/2 instead, which is 6 thousandths too far, leaving the solid sitting
    // 0.037 behind the origin and only 0.025 in front of it.
    //
    // Face-on nothing showed: the front face at 0.032 still cleared the body's 0.025. Turn the
    // card over and the long side swung to the front, reaching 0.037 — past the back face at
    // 0.032 — so the body stood in front of its own printing and the reverse of the card was a
    // blank grey slab. Centred properly, both faces clear the body by the same margin at every
    // angle.
    geo.translate(0, 0, -CARD_D / 2);
    return geo;
  }, []);
}

function Card({ isAr, targetRef }: { isAr: boolean; targetRef: React.MutableRefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useCardGeometry();

  const [front, back] = useMemo(() => {
    const mk = (canvas: HTMLCanvasElement) => {
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;

      // No mipmaps. Not a bug fix — see the materials below for what the blank card actually was
      // — but the right setting here: these canvases are 1600x1009, so a mip chain costs a third
      // again in memory to serve a card that is at most ~1300 device pixels wide and therefore
      // barely minified. LinearFilter reads the full-size texture, and anisotropy covers the
      // oblique angles a turn puts it at.
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      // Drivers clamp anisotropy to their own maximum, so asking for 16 is safe everywhere.
      t.anisotropy = 16;
      return t;
    };
    return [mk(drawFront(isAr)), mk(makeBackCanvas())];
  }, [isAr]);

  // The logo is a PNG, so the back is drawn once without it and again the moment it arrives.
  // invalidate() is needed as well as needsUpdate: under frameloop="demand" a texture that
  // changes while nothing is animating would sit there un-drawn until the next interaction.
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let alive = true;
    const paint = () => {
      if (!alive) return;
      drawBack(back.image as HTMLCanvasElement, markImage);
      back.needsUpdate = true;
      // needsUpdate alone is not enough under frameloop="demand": the texture would be re-uploaded
      // on the next frame, and there is no next frame until something asks for one.
      invalidate();
    };

    if (markReady) paint();
    else markWaiters.add(paint);

    return () => {
      alive = false;
      markWaiters.delete(paint);
    };
  }, [back, invalidate]);

  /**
   * Materials built with their maps already in them, rather than given a `map` prop in JSX.
   *
   * This is what a card that rendered as a featureless pale slab actually was. Declared as
   * `<meshStandardMaterial map={front} />`, the material is constructed first and the texture
   * assigned to it a moment later; three.js compiles a shader per material configuration, and a
   * map that arrives after that compile is not part of it, so the program samples nothing and
   * draws the material's flat base colour. Everything else looked perfectly healthy while this
   * was happening — the mesh was visible, the texture was uploaded and the right size, and the
   * renderer reported all three draw calls — which is why it took a live experiment to find:
   * setting `material.needsUpdate = true` by hand made the card appear instantly.
   *
   * Passing a finished material avoids the whole question. There is no window in which the
   * material exists without its map, so there is no stale program to recompile.
   */
  const materials = useMemo(
    () => ({
      // The edge and the unprinted core of the slab, in the same violet as the faces. More metallic
      // than the white version could be: a metallic surface takes its colour from what it
      // reflects, which turned a white card grey, but on a dark one that is exactly the effect —
      // it puts a moving sheen along the bevel as the card turns.
      body: new THREE.MeshStandardMaterial({ color: '#232326', roughness: 0.3, metalness: 0.45 }),
      // The artwork is its own bump map.
      //
      // The colour texture's luminance is already a height field, so handing the same texture to
      // `bumpMap` makes the shader perturb its normals along every edge in the artwork — each
      // letter and rule is then lit as a cut in the surface rather than as paint lying flat on it.
      // Tilt the card and the light genuinely runs along the engraving.
      //
      // `bumpScale` is NEGATIVE, and that is the whole reason this still reads as engraved now
      // that the card is dark. A bump map treats bright as high: with white ink on a near-black
      // body the type would be pushed OUT of the surface, embossed rather than cut. Negating the
      // scale flips every bump into a dent, which is the same trick as inverting the height map
      // without generating and uploading a second texture to do it.
      //
      // Low roughness on both faces: a matte surface scatters light too evenly for a groove to
      // catch a highlight, and the highlight is the entire point of engraving something.
      front: new THREE.MeshStandardMaterial({
        map: front,
        bumpMap: front,
        bumpScale: -2.4,
        transparent: true,
        roughness: 0.26,
        metalness: 0.35,
      }),
      back: new THREE.MeshStandardMaterial({
        map: back,
        bumpMap: back,
        bumpScale: -2.4,
        transparent: true,
        roughness: 0.3,
        metalness: 0.35,
      }),
    }),
    [front, back],
  );

  useEffect(() => () => {
    front.dispose();
    back.dispose();
    geometry.dispose();
    materials.body.dispose();
    materials.front.dispose();
    materials.back.dispose();
  }, [front, back, geometry, materials]);

  // Ease towards the target, and keep the renderer awake only while there is motion left. With
  // frameloop="demand" this is what makes an idle card cost literally nothing: once the card has
  // settled, invalidate() stops being called and no further frames are drawn at all.
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    // delta is clamped, and without it the card teleports home instead of travelling there.
    //
    // `frameloop="demand"` means no frames are drawn while the card sits still — which is the
    // whole point of it — so `delta` on the first frame after a pause is the length of that
    // pause. The card rests for three seconds before returning, so that first delta is ~3, the
    // damping factor min(1, delta·7) saturates at 1, and the entire journey home is completed in
    // one frame: the card is simply somewhere else the next time you look at it.
    //
    // Clamping to a 30fps step makes that first frame an ordinary one, and the eased return then
    // plays out over the frames that follow, each of which is real.
    const k = Math.min(1, Math.min(delta, 1 / 30) * 7);
    const dx = targetRef.current.x - g.rotation.x;
    const dy = targetRef.current.y - g.rotation.y;
    if (Math.abs(dx) > 0.0004 || Math.abs(dy) > 0.0004) {
      g.rotation.x += dx * k;
      g.rotation.y += dy * k;
      state.invalidate();
    }
  });

  // Just clear of the slab's real half-thickness, bevel included — so each face sits the same
  // distance proud of the body whichever way the card is turned.
  const faceZ = HALF_D + 0.007;

  return (
    <group ref={group}>
      {/* The body. This is the rim: rounded in plan, bevelled at both edges, and correct from
          every angle because it is genuinely that solid. */}
      <mesh geometry={geometry} material={materials.body} />

      {/* The two printed faces, just proud of the body so the rim shows around them. Their
          textures carry transparent corners, so their square outline is never visible. */}
      <mesh position={[0, 0, faceZ]} material={materials.front}>
        <planeGeometry args={[CARD_W - 0.012, CARD_H - 0.012]} />
      </mesh>
      <mesh position={[0, 0, -faceZ]} rotation={[0, Math.PI, 0]} material={materials.back}>
        <planeGeometry args={[CARD_W - 0.012, CARD_H - 0.012]} />
      </mesh>
    </group>
  );
}

/**
 * Wakes the renderer for one frame whenever the drag handler has moved the target, and — the
 * part that matters — brings the card home even if no pointer event ever tells it the drag ended.
 *
 * The return used to be armed by `onPointerUp`, which is one event handler away from never
 * running: a `pointercancel` the browser fires without an `up`, a touch that ends outside the
 * element, a capture that was already released. Any of those left the card parked wherever the
 * finger had put it, and the state a visitor was most likely to see it stuck in is edge-on, where
 * a card is a bare sliver and looks broken.
 *
 * This watches the clock instead of the events. Nothing can fail to fire, because nothing has to.
 *
 * ## Why it sleeps
 *
 * It used to re-request a frame unconditionally, which made it a permanent main-thread wake-up at
 * the display's refresh rate for the whole session. Instrumenting `requestAnimationFrame` on an
 * idle, untouched page measured 301 of 301 calls over 2.5 seconds coming from this one loop —
 * 120 a second, polling a counter that could not change, with the card sitting perfectly still.
 * That is the cost that shows up as a page which feels heavy to scroll: the scroll itself is
 * cheap, but it is sharing the main thread with something that never yields it.
 *
 * The loop has real work in exactly two windows — while the card is being turned, and for the
 * three seconds afterwards when it may still need to bring itself home. Outside those it stops,
 * and the canvas's own pointer events start it again.
 */
function Waker({
  signal,
  touched,
  dragging,
  target,
}: {
  signal: React.MutableRefObject<number>;
  touched: React.MutableRefObject<number>;
  dragging: React.MutableRefObject<unknown>;
  target: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const invalidate = useThree((s) => s.invalidate);
  const canvas = useThree((s) => s.gl.domElement);
  const seen = useRef(-1);

  useEffect(() => {
    let raf = 0;
    let lastWorkAt = performance.now();
    const TAU = Math.PI * 2;
    const near = (v: number) => Math.round(v / TAU) * TAU;

    const tick = () => {
      let didWork = false;

      if (seen.current !== signal.current) {
        seen.current = signal.current;
        invalidate();
        didWork = true;
      }
      // Three seconds after the last movement, with nothing being dragged, the card goes back to
      // the nearest orientation that shows its front — the nearest, so a card turned twice round
      // travels the short way rather than unwinding both turns.
      if (!dragging.current && performance.now() - touched.current > 3000) {
        const { x, y } = target.current;
        const rx = near(x);
        const ry = near(y);
        if (rx !== x || ry !== y) {
          target.current = { x: rx, y: ry };
          signal.current++;
          touched.current = performance.now();
          didWork = true;
        }
      }

      if (didWork || dragging.current) lastWorkAt = performance.now();

      // A time-based tail, not a frame count. The homecoming above is armed three seconds after
      // the last touch, so the loop has to outlive that by a margin or it would sleep straight
      // through its own remaining job — and a frame count would mean a different amount of time
      // on a 60Hz screen than on a 120Hz one, so the margin would silently change with hardware.
      if (performance.now() - lastWorkAt > 4500) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    // Anything that could move the card, or end a move. Bound to the canvas rather than the
    // window: a pointer crossing some other part of the page cannot give this loop work, and a
    // window-level pointermove handler would be its own small permanent cost on every mouse
    // movement anywhere on the site — trading one always-on job for another.
    const wake = () => {
      lastWorkAt = performance.now();
      if (raf === 0) raf = requestAnimationFrame(tick);
    };

    const events = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave', 'touchstart', 'touchmove'] as const;
    events.forEach((e) => canvas.addEventListener(e, wake, { passive: true }));

    // Started once on mount so the card can settle into place on first paint without waiting for
    // someone to touch it.
    wake();

    return () => {
      events.forEach((e) => canvas.removeEventListener(e, wake));
      if (raf !== 0) cancelAnimationFrame(raf);
    };
  }, [invalidate, canvas, signal, touched, dragging, target]);

  return null;
}

export const CredentialCard3D: React.FC<CredentialCard3DProps> = ({ language }) => {
  const isAr = language === 'ar';
  const target = useRef({ x: 0, y: 0 });
  const signal = useRef(0);
  const drag = useRef<{ px: number; py: number; ax: number; ay: number } | null>(null);
  const restTimer = useRef(0);
  /** When the card last moved. The return home is driven off this, not off a pointer event. */
  const touched = useRef(0);
  const [ready, setReady] = useState(false);

  // Cairo first, and asked for by name rather than waited on generically.
  //
  // A texture drawn before the font has arrived bakes the fallback face into the card for good —
  // it is uploaded to the GPU once and never redrawn. `document.fonts.ready` is not enough on its
  // own here: these @font-face rules are split by unicode-range, so the browser fetches Cairo only
  // once something on the page actually needs those characters, and `ready` can resolve perfectly
  // happily before that has been requested at all. `fonts.load()` asks for the exact weights this
  // card draws with and resolves when they are usable.
  useEffect(() => {
    let alive = true;
    const go = () => {
      if (alive) setReady(true);
    };

    const fonts = document.fonts;
    if (fonts?.load) {
      Promise.all([
        fonts.load(`900 76px ${FONT}`),
        fonts.load(`800 56px ${FONT}`),
        fonts.load(`600 40px ${FONT}`),
        fonts.load(`700 34px ${FONT}`),
      ])
        .then(go)
        .catch(go);
    } else {
      go();
    }

    return () => {
      alive = false;
      clearTimeout(restTimer.current);
    };
  }, []);

  const turnTo = (x: number, y: number) => {
    target.current = { x, y };
    signal.current++;
    touched.current = performance.now();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    clearTimeout(restTimer.current);
    // No flip. A previous version negated the deltas once the back was facing the viewer, on the
    // reasoning that the visible surface then travels the other way — but the effect in the hand
    // is that the controls silently reverse depending on which side happens to be showing, and a
    // drag right sometimes goes left. One constant direction is what free rotation means here:
    // right always turns the card one way, left always the other, however many times it has been
    // round.
    const t = target.current;
    drag.current = { px: e.clientX, py: e.clientY, ax: t.x, ay: t.y };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a convenience — the drag still works without it */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    // Vertical is `+`, and the sign is not arbitrary: CSS's Y axis points down and three.js's
    // points up, so the rotation this card had as a DOM element inverts on the X axis when moved
    // into a scene. Dragging down must bring the top edge towards the viewer, which is a positive
    // rotation.x here and was a negative rotateX there. Horizontal needs no such flip — both
    // systems turn the right edge away for a positive rotation about Y.
    // Unclamped on both axes — the card is a solid with a printed back, so there is no wrong side
    // to keep anyone away from and nothing to protect. Drag far enough and it simply keeps
    // turning, as many revolutions as you give it; the return home takes the short way back
    // regardless of how many that was.
    turnTo(
      d.ax + (e.clientY - d.py) * 0.011,
      d.ay + (e.clientX - d.px) * 0.012,
    );
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;

    // The rest timer is armed BEFORE the capture is released, and the release is wrapped —
    // between them they are the reason a card could be left standing on its edge for good.
    //
    // releasePointerCapture throws NotFoundError when the pointer is not actually captured, and
    // that is the normal state on `pointercancel`: the browser has already taken the capture away
    // before telling us. The throw propagated out of this handler and killed everything after it,
    // which was the line that scheduled the return home — so on a phone, where cancel is what
    // ends a gesture the browser decides to claim, the card simply stayed where the finger left
    // it. `?.` does not help: the method exists, it is the call that fails.
    // Marks the release; the Waker's clock does the rest. No timer is armed here on purpose —
    // one was, and it lived or died with this handler being reached at all.
    touched.current = performance.now();

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released by the browser — nothing to undo */
    }
  };

  return (
    <div
      // Deliberately wider than the column it sits in, and lifted above everything around it.
      //
      // Breaks out of its column on a phone only.
      //
      // Small screens are where the card has no room and the copy below it is what has to give,
      // so there `w-[136%] mx-[-18%]` runs it past the panel's padding and z-30 lifts it over
      // whatever it lands on. Evenly on both sides, so one rule serves Arabic and English without
      // a direction-aware variant. From `lg` up the layout already gives the card its own half of
      // a wide screen and there is nothing to escape, so it goes back to filling its cell.
      //
      // The box is deliberately larger than the card: the camera frames it at ~63% of this (see
      // there), and the rest is transparent turning room. So the visible card is roughly 0.63 of
      // these numbers — about 300px on a phone and 380px on a desktop — rather than the whole
      // width, which is why 136% here is not the card growing by a third.
      // Negative margins on all four sides, not just left and right.
      //
      // Horizontal alone only got the card past the panel's side padding; the ask is that it
      // leave the panel's black rounded border entirely and lie over the copy below it, which
      // needs vertical overflow too. `my` is smaller than `mx` because the copy underneath is
      // what gets covered, and burying it is not the effect — clearing the border and resting
      // over the first line or two is.
      //
      // Everything above and below still reflows as if the card were its normal height, so
      // nothing else on the page moves; z-30 decides what is on top.
      // The box is roughly twice the card, because the camera frames the card at ~48% of it. It
      // therefore hangs well outside its column on all four sides — including the top, so the
      // card can turn up out of the panel as readily as down out of it — and z-30 puts it over
      // everything it reaches. The negative margins also mean the page reflows as if the card
      // were its plain size, so nothing else moves to accommodate it.
      // pointer-events-none, and it is doing real work: this element is roughly twice the card
      // and hangs over the page on all four sides, so if it accepted input it would swallow every
      // tap and every scroll in that whole area — a card that eats the page around it. Input is
      // handled by the small hit area below instead, and everything else here is see-through to
      // the pointer as well as to the eye.
      className="pointer-events-none relative z-30 w-[210%] mx-[-55%] mt-[-24%] mb-[-34%] max-w-[54rem] lg:w-[150%] lg:mx-[-25%] lg:mt-[-14%] lg:mb-[-16%] lg:max-w-[58rem] aspect-[1.586/1] select-none"
      role="img"
      aria-label={
        isAr
          ? 'بطاقة ضمانات NOVAIQ — تسليم سريع، مواصفات دقيقة، دعم متكامل، أداء فائق'
          : 'NOVAIQ guarantees card — fast delivery, precise specs, full support, high performance'
      }
    >
      {ready && (
        <View
        >
          {/* Each view brings its own camera — the hero mark is framed at fov 45 from 3.9 and
              the two must not share one. Everything the old `camera` prop carried is here.

              3.4 is deliberately more room than the arithmetic demands. A view is a rectangle
              and cannot draw outside itself, so the card has to fit at EVERY angle, not at rest.
              The binding case is a quarter turn about Y: the near long edge swings W/2 = 0.793
              towards the camera and is magnified by d/(d − 0.793), which at a tight framing is
              enough to push its height past the top and bottom of the frame.

                frame height     = 2·d·tan(17°) = 0.6116·d
                near-edge height = 1 · d/(d − 0.793)
                fits when 0.6116·d ≥ d/(d − 0.793)  ⟺  d ≥ 2.428

              At 3.4 that is 1.30 against 2.08 — 60% headroom, and the diagonal case still
              clears. The card fills about 48% of the view; the rest is the room it turns in. */}
          <PerspectiveCamera makeDefault position={[0, 0, 3.4]} fov={34} />
          {/* Raised for the dark body — a near-black surface reflects a fraction of what a white
              one did, and at the level the white card wanted this one read as a silhouette — but
              deliberately kept well under the key. Ambient light arrives from every direction at
              once, which is precisely the light that cannot cast a shadow inside a groove: push it
              too high and the bump map's shading washes flat and the carving disappears. */}
          <ambientLight intensity={0.6} />
          {/* The key, angled to graze the surface rather than face it. A light square-on to a card
              lights the floor of every groove as brightly as the surface around it; a shallow angle
              leaves one wall of each cut bright and the other in shadow, which is what the eye
              reads as depth. It is also the highlight that slides across the card as it turns —
              and on a dark, half-metallic body that sheen is most of what makes it look solid. */}
          <directionalLight position={[3.1, 2.4, 1.6]} intensity={2.1} />
          <directionalLight position={[-2.5, -1.5, -2.5]} intensity={0.7} />
          <Card isAr={isAr} targetRef={target} />
          <Waker signal={signal} touched={touched} dragging={drag} target={target} />
        </View>
      )}

      {/* The only part of this that takes input: the card's own footprint at rest.
          The camera frames the card at ~48% of the canvas, so it sits exactly 26% in from every
          side — the same figure the placeholder uses to position itself. A press anywhere else
          lands on the page behind, which is what keeps a scroll a scroll and a tap on the copy
          underneath a tap on the copy underneath.

          `touch-none` is scoped to this box alone, so a drag that starts on the card turns the
          card rather than scrolling the page, without that rule applying to the large empty area
          around it. Pointer capture is taken here, so a turn that wanders off the card keeps
          working — it is only where a gesture STARTS that is being restricted. */}
      <div
        className="pointer-events-auto touch-none absolute inset-[26%] cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-hidden="true"
      />
    </div>
  );
};

export default CredentialCard3D;
