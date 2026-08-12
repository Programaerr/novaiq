import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

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

  // Body. White, and that is a deliberate inversion of the dark card this replaces: on a
  // near-black page a dark card recedes into it, which is half of why it read as a picture of a
  // card set into the section rather than an object sitting in front of it. White separates it
  // from everything behind it before a single pixel of geometry is drawn.
  const g = ctx.createRadialGradient(TEX_W * 0.12, TEX_H * 0.08, 0, TEX_W * 0.12, TEX_H * 0.08, TEX_W * 1.1);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#f4f4f6');
  g.addColorStop(1, '#e2e2e8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const PAD = 92;
  const INK = '#0a0a0c';

  // Circuit tracery — the same motif the CSS card carried, at texture scale.
  ctx.strokeStyle = 'rgba(0,0,0,0.11)';
  ctx.lineWidth = 3;
  const traces: Array<[number, number][]> = [
    [[0, 230], [369, 230], [438, 300], [722, 300]],
    [[TEX_W, 369], [1260, 369], [1199, 307], [975, 307]],
    [[0, 730], [461, 730], [546, 645], [915, 645]],
    [[TEX_W, 807], [1190, 807], [1121, 738], [967, 738]],
  ];
  for (const pts of traces) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  for (const [cx, cy] of [[722, 300], [975, 307], [915, 645], [967, 738]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Header: wordmark on the reading-start side, chip opposite it — mirrored as a pair so the
  // card is laid out for the language rather than translated inside a Latin layout.
  ctx.textBaseline = 'top';
  ctx.fillStyle = INK;
  ctx.font = '900 76px Cairo, system-ui, sans-serif';
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
  // Gold rather than steel now the card is white: a pale chip on a pale card disappears.
  chipG.addColorStop(0, '#e8cf87');
  chipG.addColorStop(1, '#a37f2c');
  ctx.fillStyle = chipG;
  roundRect(ctx, chipX, chipY, CHIP_W, CHIP_H, 16);
  ctx.fill();
  ctx.fillStyle = 'rgba(60,45,10,0.5)';
  for (let r = 0; r < 2; r++) {
    for (let col = 0; col < 2; col++) {
      roundRect(ctx, chipX + 12 + col * 70, chipY + 12 + r * 51, 58, 39, 7);
      ctx.fill();
    }
  }
  // Contactless mark, beside the chip
  ctx.strokeStyle = 'rgba(0,0,0,0.42)';
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

  const GAP = 40;
  const colW = (TEX_W - PAD * 2 - GAP) / 2;
  const BADGE = 78;

  titles.forEach((title, i) => {
    const col = i % 2;
    const row = (i / 2) | 0;
    const top = 386 + row * 176;
    // Columns run from the reading-start edge inward, so column order follows the language.
    const startX = isAr ? TEX_W - PAD - col * (colW + GAP) : PAD + col * (colW + GAP);
    const badgeX = isAr ? startX - BADGE : startX;
    const textX = isAr ? startX - BADGE - 24 : startX + BADGE + 24;

    ctx.fillStyle = 'rgba(10,10,12,0.06)';
    roundRect(ctx, badgeX, top, BADGE, BADGE, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,10,12,0.16)';
    ctx.lineWidth = 2.5;
    roundRect(ctx, badgeX, top, BADGE, BADGE, 18);
    ctx.stroke();
    glyph(ctx, i, badgeX + BADGE / 2, top + BADGE / 2, 36, INK);

    ctx.direction = isAr ? 'rtl' : 'ltr';
    ctx.textAlign = isAr ? 'right' : 'left';
    const maxText = colW - BADGE - 24;

    ctx.fillStyle = INK;
    ctx.font = '700 42px Cairo, system-ui, sans-serif';
    ctx.fillText(title, textX, top - 2, maxText);

    ctx.fillStyle = 'rgba(10,10,12,0.62)';
    ctx.font = '500 31px Cairo, system-ui, sans-serif';
    ctx.fillText(descs[i], textX, top + 52, maxText);
  });

  // Footer, opposite the wordmark
  ctx.fillStyle = 'rgba(10,10,12,0.5)';
  ctx.font = '600 27px Cairo, system-ui, sans-serif';
  ctx.letterSpacing = '5px';
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

function drawBack(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = BACK_W;
  c.height = BACK_H;
  const ctx = c.getContext('2d')!;
  clipRounded(ctx, BACK_W, BACK_H);
  // Everything below is written in front-texture units, so the two faces stay described by one
  // set of numbers; this is the only place the difference in size is handled.
  ctx.scale(0.5, 0.5);

  ctx.fillStyle = '#f2f2f5';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Magnetic stripe — the one dark element, as on a real card
  const s = ctx.createLinearGradient(0, TEX_H * 0.16, 0, TEX_H * 0.38);
  s.addColorStop(0, '#2a2a30');
  s.addColorStop(0.5, '#0b0b0e');
  s.addColorStop(1, '#2a2a30');
  ctx.fillStyle = s;
  ctx.fillRect(0, TEX_H * 0.16, TEX_W, TEX_H * 0.22);

  // Mark
  ctx.strokeStyle = 'rgba(10,10,12,0.7)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(TEX_W / 2, TEX_H * 0.66, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(10,10,12,0.7)';
  ctx.beginPath();
  ctx.arc(TEX_W / 2, TEX_H * 0.66, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(10,10,12,0.5)';
  ctx.font = '600 20px Cairo, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.letterSpacing = '5px';
  ctx.fillText('novaiq.space', TEX_W / 2, TEX_H * 0.78);
  ctx.letterSpacing = '0px';

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
      // The card is read at an angle for most of a turn, which is exactly when a texture without
      // anisotropic filtering goes to mush along the receding edge.
      t.anisotropy = 8;
      return t;
    };
    return [mk(drawFront(isAr)), mk(drawBack())];
  }, [isAr]);

  useEffect(() => () => {
    front.dispose();
    back.dispose();
    geometry.dispose();
  }, [front, back, geometry]);

  // Ease towards the target, and keep the renderer awake only while there is motion left. With
  // frameloop="demand" this is what makes an idle card cost literally nothing: once the card has
  // settled, invalidate() stops being called and no further frames are drawn at all.
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const k = Math.min(1, delta * 7);
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
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#d8d8de" roughness={0.38} metalness={0.25} />
      </mesh>

      {/* The two printed faces, just proud of the body so the rim shows around them. Their
          textures carry transparent corners, so their square outline is never visible. */}
      <mesh position={[0, 0, faceZ]}>
        <planeGeometry args={[CARD_W - 0.012, CARD_H - 0.012]} />
        {/* Low metalness on a white surface: a metallic white takes its colour from what it
            reflects, and with nothing around it to reflect that reads as grey. */}
        <meshStandardMaterial map={front} transparent roughness={0.42} metalness={0.06} />
      </mesh>
      <mesh position={[0, 0, -faceZ]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[CARD_W - 0.012, CARD_H - 0.012]} />
        <meshStandardMaterial map={back} transparent roughness={0.55} metalness={0.05} />
      </mesh>
    </group>
  );
}

/** Wakes the renderer for one frame whenever the drag handler has moved the target. */
function Waker({ signal }: { signal: React.MutableRefObject<number> }) {
  const invalidate = useThree((s) => s.invalidate);
  const seen = useRef(-1);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (seen.current !== signal.current) {
        seen.current = signal.current;
        invalidate();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [invalidate, signal]);
  return null;
}

export const CredentialCard3D: React.FC<CredentialCard3DProps> = ({ language }) => {
  const isAr = language === 'ar';
  const target = useRef({ x: 0, y: 0 });
  const signal = useRef(0);
  const drag = useRef<{ px: number; py: number; ax: number; ay: number } | null>(null);
  const restTimer = useRef(0);
  const [ready, setReady] = useState(false);

  // Fonts first: a texture drawn before Cairo has loaded bakes the fallback face into the card
  // permanently, because it is uploaded to the GPU once and never redrawn.
  useEffect(() => {
    let alive = true;
    const go = () => alive && setReady(true);
    if (document.fonts?.ready) document.fonts.ready.then(go).catch(go);
    else go();
    return () => {
      alive = false;
      clearTimeout(restTimer.current);
    };
  }, []);

  const turnTo = (x: number, y: number) => {
    target.current = { x, y };
    signal.current++;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    clearTimeout(restTimer.current);
    drag.current = { px: e.clientX, py: e.clientY, ax: target.current.x, ay: target.current.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    // Vertical is `+`, and the sign is not arbitrary: CSS's Y axis points down and three.js's
    // points up, so the rotation this card had as a DOM element inverts on the X axis when moved
    // into a scene. Dragging down must bring the top edge towards the viewer, which is a positive
    // rotation.x here and was a negative rotateX there. Horizontal needs no such flip — both
    // systems turn the right edge away for a positive rotation about Y.
    turnTo(d.ax + (e.clientY - d.py) * 0.007, d.ay + (e.clientX - d.px) * 0.008);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    clearTimeout(restTimer.current);
    // Home by the shortest route: a card left at four full turns looks identical to one at rest,
    // so it goes to the nearest whole revolution rather than unwinding everything it was given.
    restTimer.current = window.setTimeout(() => {
      if (drag.current) return;
      const near = (v: number) => Math.round(v / (Math.PI * 2)) * Math.PI * 2;
      turnTo(near(target.current.x), near(target.current.y));
    }, 3000);
  };

  return (
    <div
      // Deliberately wider than the column it sits in, and lifted above everything around it.
      //
      // `w-[142%] mx-[-21%]` overflows its grid cell evenly on both sides — evenly, so the same
      // rule works in Arabic and English without a direction-aware variant — and z-30 puts it in
      // front of the panel's border and the copy beside it rather than being boxed in by them.
      // The panel has no overflow clip, so nothing cuts this off.
      //
      // The box is larger than the card on purpose: the camera frames the card at ~78% of it, so
      // the remaining quarter is transparent room for the card to turn through without meeting
      // the canvas edge (see the camera note). Because that room is part of this element, the
      // card lands at roughly 111% of its column — bigger than before, not smaller, despite being
      // framed more loosely.
      className="relative z-30 w-[142%] mx-[-21%] max-w-2xl aspect-[1.586/1] select-none cursor-grab active:cursor-grabbing"
      // `none`, so a drag that starts on the card turns the card instead of scrolling the page.
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
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
          dpr={[1, 1.75]}
          // Pulled back so the card fills about 78% of the frame instead of 95%, and the
          // container below is enlarged to match so the card itself does not shrink.
          //
          // That margin is what stops this looking like a card being shown on a screen. A canvas
          // is a rectangle and it cannot draw outside itself, so a card framed tightly is a card
          // pressed against four invisible walls: swing it and the near corner — magnified by
          // perspective as it comes towards the camera — runs into the edge and is cut off. With
          // air around it, the whole card stays in frame through a full turn, and since the
          // canvas is transparent that air is invisible: what you see is an object turning in the
          // page, not a picture of one inside a box.
          //
          // Visible width at distance d is 2·d·tan(17°)·1.586 = 0.970·d; at d = 2.16 that is 2.10
          // world units against a card 1.586 wide.
          camera={{ position: [0, 0, 2.16], fov: 34 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        >
          {/* Turned down from what a dark card needed. A white surface is already near the top
              of the range, so the same lighting flattens it to a solid block with no shading
              left to show which way it is facing. */}
          <ambientLight intensity={0.62} />
          {/* One key light, and it is not decoration: the highlight sliding across the card as it
              turns is this reflecting off a real surface, rather than the hand-positioned
              gradient the CSS version had to fake. */}
          <directionalLight position={[2.2, 2.6, 3.4]} intensity={1.35} />
          <directionalLight position={[-2.5, -1.5, -2.5]} intensity={0.45} />
          <Card isAr={isAr} targetRef={target} />
          <Waker signal={signal} />
        </Canvas>
      )}
    </div>
  );
};

export default CredentialCard3D;
