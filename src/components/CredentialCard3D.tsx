import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import logoMark from '../assets/images/novaiq-icon.png';

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

  // Body. White, with everything on it in near-pure black — the point is contrast, so the type
  // is #000 rather than the softened near-blacks used elsewhere on the site, and the card is
  // lighter than anything around it on a near-black page.
  const g = ctx.createRadialGradient(TEX_W * 0.12, TEX_H * 0.08, 0, TEX_W * 0.12, TEX_H * 0.08, TEX_W * 1.1);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#f6f6f8');
  g.addColorStop(1, '#e4e4ea');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const PAD = 92;
  const INK = '#000000';

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

  strokeTraces(1.5, 1.5, 'rgba(255,255,255,0.95)', 3.5); // lit lip
  strokeTraces(0, 0, 'rgba(0,0,0,0.3)', 3.5); // shadowed cut

  // The pads at the ends of each run, sunk the same way.
  for (const [cx, cy] of dots) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(cx + 1.5, cy + 1.5, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Header: wordmark on the reading-start side, chip opposite it — mirrored as a pair so the
  // card is laid out for the language rather than translated inside a Latin layout.
  ctx.textBaseline = 'top';
  ctx.fillStyle = INK;
  ctx.font = `900 76px ${FONT}`;
  ctx.letterSpacing = '15px';
  ctx.direction = 'ltr';
  ctx.textAlign = isAr ? 'right' : 'left';
  ctx.fillText('NOVAIQ', isAr ? TEX_W - PAD : PAD, PAD - 6);
  ctx.letterSpacing = '0px';

  const CHIP_W = 152;
  const CHIP_H = 114;
  const chipX = isAr ? PAD : TEX_W - PAD - CHIP_W;
  const chipY = PAD - 12;
  const chipG = ctx.createLinearGradient(chipX, chipY, chipX + CHIP_W, chipY + CHIP_H);
  // Gold, because a steel chip on a white card is a pale shape on a pale ground and disappears.
  chipG.addColorStop(0, '#e9d08a');
  chipG.addColorStop(1, '#9d7826');
  ctx.fillStyle = chipG;
  roundRect(ctx, chipX, chipY, CHIP_W, CHIP_H, 16);
  ctx.fill();
  ctx.fillStyle = 'rgba(30,22,4,0.55)';
  for (let r = 0; r < 2; r++) {
    for (let col = 0; col < 2; col++) {
      roundRect(ctx, chipX + 12 + col * 70, chipY + 12 + r * 51, 58, 39, 7);
      ctx.fill();
    }
  }
  // Contactless mark, beside the chip
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const waveX = isAr ? chipX + CHIP_W + 46 : chipX - 46;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(waveX, chipY + CHIP_H / 2, i * 13, isAr ? Math.PI * 0.72 : -Math.PI * 0.28, isAr ? Math.PI * 1.28 : Math.PI * 0.28);
    ctx.stroke();
  }

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

    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    roundRect(ctx, badgeX, top, BADGE, BADGE, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
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

    // 600 rather than 500, and 82% black rather than 68%: on a white card at this size those two
    // changes are the difference between a second line you read and one you merely notice.
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.font = `600 40px ${FONT}`;
    ctx.fillText(descs[i], textX, top + 62, maxText);
  });

  // Footer, opposite the wordmark
  // Bigger and darker than it was: at 27px and half-opacity this line was reported as simply not
  // visible on a phone, which it effectively was not — it worked out to about nine screen pixels
  // tall after the canvas had been rendered and scaled.
  ctx.fillStyle = 'rgba(0,0,0,0.66)';
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
 * replaces every colour in it with one flat black. That is what makes it a silhouette of the
 * logo rather than the logo's own light-on-dark rendering dropped onto a white card, where it
 * would have all but disappeared.
 */
function drawBack(c: HTMLCanvasElement, mark?: HTMLImageElement) {
  const ctx = c.getContext('2d')!;
  ctx.save();
  ctx.clearRect(0, 0, BACK_W, BACK_H);
  clipRounded(ctx, BACK_W, BACK_H);
  // Everything below is written in front-texture units, so the two faces stay described by one
  // set of numbers; this is the only place the difference in size is handled.
  ctx.scale(0.5, 0.5);

  ctx.fillStyle = '#f4f4f7';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // A single hairline frame, and nothing else competing with the mark.
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
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
    octx.fillStyle = '#000000';
    octx.fillRect(0, 0, size, size);
    ctx.drawImage(off, (TEX_W - size) / 2, (TEX_H - size) / 2);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = `600 30px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.direction = 'ltr';
  ctx.letterSpacing = '6px';
  ctx.fillText('novaiq.space', TEX_W / 2 + 3, TEX_H - 92 - 30);
  ctx.letterSpacing = '0px';
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
      bevelSize: 0.006,
      bevelThickness: 0.006,
      bevelSegments: 2,
      curveSegments: 14,
    });
    // Extrude builds from z=0 forward; centre it so the card turns about its own middle.
    geo.translate(0, 0, -(CARD_D + 0.012) / 2);
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
      body: new THREE.MeshStandardMaterial({ color: '#e6e6ec', roughness: 0.35, metalness: 0.15 }),
      // Barely metallic: a metallic white takes its colour from what it reflects, and with an
      // empty scene around it that reads as grey rather than white.
      front: new THREE.MeshStandardMaterial({ map: front, transparent: true, roughness: 0.44, metalness: 0.05 }),
      // DoubleSide on the reverse only. Its plane is turned to face backwards and then the whole
      // card is turned over on top of that, and with single-sided culling the composition of those
      // two rotations left it facing away at exactly the angles it is meant to be read from — the
      // card showed the bare edge of its body instead of its printed back. The front stays
      // single-sided so it cannot appear through the card from behind; the body is opaque and
      // sits between them, so nothing else can either.
      back: new THREE.MeshStandardMaterial({
        map: back,
        transparent: true,
        roughness: 0.55,
        metalness: 0.05,
        side: THREE.DoubleSide,
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

  const faceZ = CARD_D / 2 + 0.007;

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
  const seen = useRef(-1);

  useEffect(() => {
    let raf = 0;
    const TAU = Math.PI * 2;
    const near = (v: number) => Math.round(v / TAU) * TAU;

    const tick = () => {
      if (seen.current !== signal.current) {
        seen.current = signal.current;
        invalidate();
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
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [invalidate, signal, touched, dragging, target]);

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
        <Canvas
          // Renders on request only. An untouched card draws zero frames, which is the whole
          // reason a WebGL card can be cheaper than the CSS one it replaced.
          frameloop="demand"
          // 2.5, up from 1.75, and this is what the blurred text was.
          //
          // A phone reports a device pixel ratio of 3. Capped at 1.75 the scene was rendered at
          // 58% of the pixels the screen actually has and then stretched up to fill it — an
          // upscale of a finished image, which no amount of texture resolution can undo. The cap
          // exists to stop a full-screen scene rendering nine times the pixels on a phone, and
          // this scene is a card, not a full screen; the higher cap costs a few hundred thousand
          // pixels on an element that only renders at all while it is being turned.
          dpr={[1, 2.5]}
          // 3.4 — deliberately far more room than the arithmetic below demands, because every
          // tighter value tried here was still reported as cutting the card off somewhere.
          //
          // A canvas is a rectangle and cannot draw outside itself, so the card must fit inside
          // the frame at EVERY angle, not just at rest. The binding case is a quarter turn about
          // Y: the near long edge swings (W/2 = 0.793) units towards the camera, so it is
          // magnified by d/(d − 0.793) — at a tight framing that is enough to push its full
          // height past the top and bottom of the frame, which is exactly the straight cut across
          // the card in the report that prompted this.
          //
          //   frame height  = 2·d·tan(17°) = 0.6116·d
          //   near-edge height = 1 · d/(d − 0.793)
          //   fits when 0.6116·d ≥ d/(d − 0.793)  ⟺  d ≥ 2.428
          //
          // The worst case is a quarter turn about the card's long axis, where the near edge is
          // magnified by d/(d − 0.793) — 1.30 at this distance — while the frame is 0.6116·d =
          // 2.08 tall. 1.30 against 2.08 is 60% headroom, and the diagonal case (both axes at
          // once) still clears comfortably. There is no angle at which any corner reaches an
          // edge.
          //
          // The card occupies about 48% of the frame, so more than half of the canvas is empty
          // transparent space. That is not waste: it is the room the card turns in, and because
          // it is transparent it is invisible — what remains is an object moving freely in the
          // page rather than one pressed against the sides of a box.
          camera={{ position: [0, 0, 3.4], fov: 34 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        >
          {/* Lower than a dark card needs. White is already near the top of the range, so the
              lighting that made a black card read blew this one out to a flat slab with no
              shading left to say which way it faces. */}
          <ambientLight intensity={0.68} />
          {/* One key light, and it is not decoration: the highlight sliding across the card as it
              turns is this reflecting off a real surface, rather than the hand-positioned
              gradient the CSS version had to fake. */}
          <directionalLight position={[2.2, 2.6, 3.4]} intensity={1.25} />
          <directionalLight position={[-2.5, -1.5, -2.5]} intensity={0.4} />
          <Card isAr={isAr} targetRef={target} />
          <Waker signal={signal} touched={touched} dragging={drag} target={target} />
        </Canvas>
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
