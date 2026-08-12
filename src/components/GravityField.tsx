import React, { useEffect, useRef } from 'react';

/** Stars that answer the hand. Enough to read as a field, few enough to draw in a fraction of a ms. */
const COUNT = 300;
/** Planes of depth. Nearer stars are bigger, brighter and pulled harder — that difference IS the depth. */
const PLANES = 4;

/**
 * A gravity well under the pointer, and stars that fall toward it.
 *
 * ## What it does
 *
 * A soft light follows the hand, and the stars near it lean in and brighten — hard near the
 * centre, falling off with distance, and stronger for the near planes than the far ones. The
 * page stops being a picture behind the content and becomes something that notices you.
 *
 * ## What it costs, which is the reason it is allowed to exist
 *
 * Nothing at rest. The loop runs only while there is motion left to resolve — the well easing
 * toward wherever the hand last was — and then it stops dead, drawing zero frames until touched
 * again. That is the same rule everything on this page follows and the reason the WebGL hero
 * this project deleted could not stay: its expense was never the effect, it was a loop that
 * never ended.
 *
 * A frame is one radial gradient and ~300 filled arcs. On a mid-range phone that is well under a
 * millisecond, and it happens only while a finger is actually moving.
 *
 * ## Why both pointer AND touch listeners
 *
 * This looks redundant next to pointer events' whole promise of unifying input, and it is not: a
 * finger that starts to drag has its POINTER stream cancelled, because the browser has decided
 * the gesture belongs to the scroller — while `touchmove` keeps firing throughout. Since the ask
 * is that the light follow the finger, it has to outlive that handover. So touch reads touch
 * events, the pointer handler ignores `touch` entirely rather than the two fighting over one
 * gesture, and the touch listeners are passive so this can never hold up a scroll.
 */
export const GravityField: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // A full-screen canvas is paid for in fragments, so the pixel count is what gives way on a
    // phone: at a ratio of 1 against a screen reporting 3 this is a ninth of the work, and on an
    // image made of soft glow and round dots the difference is invisible.
    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const cap = coarse ? 1 : 1.5;

    let w = 0;
    let h = 0;
    let ratio = 1;

    const fit = () => {
      ratio = Math.min(window.devicePixelRatio || 1, cap);
      w = Math.floor(window.innerWidth * ratio);
      h = Math.floor(window.innerHeight * ratio);
      canvas.width = w;
      canvas.height = h;
    };

    // Deterministic, so the field is the same sky on every visit and across a resize rather than
    // reshuffling into a different one each time.
    let seed = 1337;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const stars = Array.from({ length: COUNT }, () => {
      const plane = Math.floor(rnd() * PLANES);
      return {
        x: rnd(),
        y: rnd(),
        r: 0.4 + plane * 0.3 + rnd() * 0.35,
        a: 0.18 + plane * 0.17 + rnd() * 0.14,
        plane,
      };
    });

    // Target (where the hand is) and current (where the light has eased to). Refs, not state:
    // this must never touch React on a move.
    let tx = 0.5;
    let ty = 0.4;
    let cx = 0.5;
    let cy = 0.4;
    let raf = 0;
    let settle = 0;
    let hidden = false;

    const frame = () => {
      raf = 0;
      if (hidden) return;

      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;

      ctx.clearRect(0, 0, w, h);

      const px = cx * w;
      const py = cy * h;
      const reach = Math.min(w, h) * 0.42;

      // The well itself.
      const glow = ctx.createRadialGradient(px, py, 0, px, py, reach);
      glow.addColorStop(0, 'rgba(255,255,255,0.085)');
      glow.addColorStop(0.5, 'rgba(255,255,255,0.028)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#fff';
      for (const s of stars) {
        const sx = s.x * w;
        const sy = s.y * h;
        const dx = px - sx;
        const dy = py - sy;
        const dist = Math.hypot(dx, dy) || 1;
        // Falls off with the square of distance and scales with the plane, so near stars lean in
        // hard and far ones barely stir. Capped at `reach` so nothing snaps to the cursor.
        const near = Math.min(1, reach / dist);
        const pull = near * near * (0.035 + s.plane * 0.045);
        ctx.globalAlpha = Math.min(1, s.a + (1 - Math.min(1, dist / reach)) * 0.45);
        ctx.beginPath();
        ctx.arc(sx + dx * pull, sy + dy * pull, s.r * ratio, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Keep going only while there is something left to resolve, then stop completely. `settle`
      // buys two extra frames so the last pixels of an ease are actually drawn rather than the
      // loop cutting out a frame early.
      if (Math.abs(tx - cx) > 0.0004 || Math.abs(ty - cy) > 0.0004 || settle++ < 2) {
        raf = requestAnimationFrame(frame);
      }
    };

    const wake = () => {
      settle = 0;
      if (!raf && !hidden) raf = requestAnimationFrame(frame);
    };

    const aim = (clientX: number, clientY: number) => {
      tx = clientX / window.innerWidth;
      ty = clientY / window.innerHeight;
      wake();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // touch is handled below, on its own events
      aim(e.clientX, e.clientY);
    };

    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) aim(t.clientX, t.clientY);
    };

    // On a phone the light drifts back to the middle when the finger lifts, so the page is never
    // left lit from a corner nobody is touching any more.
    const onTouchEnd = () => {
      tx = 0.5;
      ty = 0.4;
      wake();
    };

    const onResize = () => {
      fit();
      wake();
    };

    const onVisibility = () => {
      hidden = document.hidden;
      if (hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else {
        wake();
      }
    };

    fit();
    wake();

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="gravity-field" aria-hidden="true" />;
};

export default GravityField;
