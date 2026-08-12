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

const TEX_W = 1024;
const TEX_H = 646; // 1.586:1, the ISO card ratio
const CARD_W = 1.586;
const CARD_H = 1;
const CARD_D = 0.05;
const CARD_R = 0.1; // corner radius in world units

/** Rounded-rectangle clip, so the texture's own corners are transparent and match the mesh. */
function clipRounded(ctx: CanvasRenderingContext2D) {
  const r = (CARD_R / CARD_W) * TEX_W;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(TEX_W - r, 0);
  ctx.quadraticCurveTo(TEX_W, 0, TEX_W, r);
  ctx.lineTo(TEX_W, TEX_H - r);
  ctx.quadraticCurveTo(TEX_W, TEX_H, TEX_W - r, TEX_H);
  ctx.lineTo(r, TEX_H);
  ctx.quadraticCurveTo(0, TEX_H, 0, TEX_H - r);
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

function drawFront(isAr: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TEX_W;
  c.height = TEX_H;
  const ctx = c.getContext('2d')!;
  clipRounded(ctx);

  // Body
  const g = ctx.createRadialGradient(TEX_W * 0.12, TEX_H * 0.08, 0, TEX_W * 0.12, TEX_H * 0.08, TEX_W * 1.1);
  g.addColorStop(0, '#2b2b31');
  g.addColorStop(0.42, '#131317');
  g.addColorStop(1, '#08080a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Circuit tracery — the same motif the CSS card carried, at texture scale.
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2.5;
  const traces: Array<[number, number][]> = [
    [[0, 154], [246, 154], [292, 200], [482, 200]],
    [[1024, 246], [840, 246], [799, 205], [650, 205]],
    [[0, 487], [307, 487], [364, 430], [610, 430]],
    [[1024, 538], [793, 538], [747, 492], [645, 492]],
  ];
  for (const pts of traces) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (const [cx, cy] of [[482, 200], [650, 205], [610, 430], [645, 492]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wordmark
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.font = '900 44px Cairo, system-ui, sans-serif';
  ctx.letterSpacing = '10px';
  ctx.fillText('NOVAIQ', 62, 56);
  ctx.letterSpacing = '0px';

  // Chip
  const chipX = TEX_W - 62 - 104;
  const chipY = 52;
  const chipG = ctx.createLinearGradient(chipX, chipY, chipX + 104, chipY + 78);
  chipG.addColorStop(0, '#d4d4d8');
  chipG.addColorStop(1, '#71717a');
  ctx.fillStyle = chipG;
  roundRect(ctx, chipX, chipY, 104, 78, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(39,39,42,0.65)';
  for (let r = 0; r < 2; r++) {
    for (let col = 0; col < 2; col++) {
      roundRect(ctx, chipX + 8 + col * 48, chipY + 8 + r * 35, 40, 27, 5);
      ctx.fill();
    }
  }

  // Guarantees, two columns
  const items = isAr
    ? ['تسليم سريع ومنظم', 'مواصفات برمجية دقيقة', 'دعم فني متكامل', 'أداء فائق السرعة']
    : ['Fast, structured delivery', 'Precise technical specs', 'Complete technical support', 'Blazing performance'];

  ctx.direction = isAr ? 'rtl' : 'ltr';
  const colW = (TEX_W - 124 - 40) / 2;
  items.forEach((label, i) => {
    const col = i % 2;
    const row = (i / 2) | 0;
    const top = 258 + row * 96;
    // The badge sits on the reading-start side, so it leads the text in both directions.
    const startX = isAr
      ? TEX_W - 62 - col * (colW + 40)
      : 62 + col * (colW + 40);
    const badgeX = isAr ? startX - 46 : startX;

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, badgeX, top, 46, 46, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    roundRect(ctx, badgeX, top, 46, 46, 12);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(badgeX + 23, top + 23, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 26px Cairo, system-ui, sans-serif';
    ctx.textAlign = isAr ? 'right' : 'left';
    ctx.fillText(label, isAr ? startX - 62 : startX + 62, top + 10, colW - 70);
  });

  // Footer
  ctx.fillStyle = 'rgba(161,161,170,0.75)';
  ctx.font = '600 19px Cairo, system-ui, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.textAlign = isAr ? 'right' : 'left';
  ctx.direction = isAr ? 'rtl' : 'ltr';
  ctx.fillText(
    isAr ? 'شركة برمجية عراقية' : 'IRAQI SOFTWARE STUDIO',
    isAr ? TEX_W - 62 : 62,
    TEX_H - 74,
  );
  ctx.letterSpacing = '0px';

  return c;
}

function drawBack(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TEX_W;
  c.height = TEX_H;
  const ctx = c.getContext('2d')!;
  clipRounded(ctx);

  ctx.fillStyle = '#0b0b0e';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Magnetic stripe
  const s = ctx.createLinearGradient(0, TEX_H * 0.16, 0, TEX_H * 0.38);
  s.addColorStop(0, '#18181b');
  s.addColorStop(0.5, '#000000');
  s.addColorStop(1, '#18181b');
  ctx.fillStyle = s;
  ctx.fillRect(0, TEX_H * 0.16, TEX_W, TEX_H * 0.22);

  // Mark
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(TEX_W / 2, TEX_H * 0.66, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(TEX_W / 2, TEX_H * 0.66, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(113,113,122,0.9)';
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
      t.anisotropy = 4;
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
        <meshStandardMaterial color="#2a2a31" roughness={0.42} metalness={0.55} />
      </mesh>

      {/* The two printed faces, just proud of the body so the rim shows around them. Their
          textures carry transparent corners, so their square outline is never visible. */}
      <mesh position={[0, 0, faceZ]}>
        <planeGeometry args={[CARD_W - 0.012, CARD_H - 0.012]} />
        <meshStandardMaterial map={front} transparent roughness={0.34} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0, -faceZ]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[CARD_W - 0.012, CARD_H - 0.012]} />
        <meshStandardMaterial map={back} transparent roughness={0.5} metalness={0.15} />
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
    turnTo(d.ax - (e.clientY - d.py) * 0.007, d.ay + (e.clientX - d.px) * 0.008);
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
      className="w-full max-w-md mx-auto aspect-[1.586/1] select-none cursor-grab active:cursor-grabbing"
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
          camera={{ position: [0, 0, 2.35], fov: 34 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        >
          <ambientLight intensity={1.15} />
          {/* One directional light, and it is not decoration: the highlight sliding across the
              card as it turns is this light reflecting off a real surface, rather than the
              hand-positioned gradient the CSS version had to fake. */}
          <directionalLight position={[2.2, 2.6, 3.4]} intensity={2.1} />
          <directionalLight position={[-2.5, -1.5, -2.5]} intensity={0.5} />
          <Card isAr={isAr} targetRef={target} />
          <Waker signal={signal} />
        </Canvas>
      )}
    </div>
  );
};

export default CredentialCard3D;
