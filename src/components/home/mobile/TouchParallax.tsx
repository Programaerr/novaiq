import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

interface TouchParallaxProps {
  children: React.ReactNode;
  className?: string;
  /** Max translate fraction in px per 100% of pointer offset. */
  strength?: number;
}

/**
 * Finger-driven parallax: as the user drags on the wrapped surface, the content translates a
 * fraction of the gesture — the effect of looking through glass at the film beneath. Uses raw
 * pointer movement with `will-change` and a fast `translate` (GPU) update. Reduced-motion and
 * non-touch devices get static content.
 */
export const TouchParallax: React.FC<TouchParallaxProps> = ({
  children,
  className,
  strength = 26,
}) => {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ raf: 0, dx: 0, dy: 0, tx: 0, ty: 0, active: false });

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner || reduce) return;

    const apply = () => {
      const s = stateRef.current;
      s.raf = 0;
      // Ease the target toward the accumulated offset (springy settle when the finger lifts).
      s.tx += (s.dx - s.tx) * 0.12;
      s.ty += (s.dy - s.ty) * 0.12;
      inner.style.transform = `translate3d(${s.tx.toFixed(1)}px, ${s.ty.toFixed(1)}px, 0) scale(1.06)`;
      if (Math.abs(s.dx - s.tx) > 0.05 || Math.abs(s.dy - s.ty) > 0.05) {
        s.raf = requestAnimationFrame(apply);
      } else {
        s.dx = s.dy = 0;
      }
    };
    const tick = () => {
      if (!stateRef.current.raf) stateRef.current.raf = requestAnimationFrame(apply);
    };

    const down = (e: PointerEvent) => {
      stateRef.current.active = true;
    };
    const move = (e: PointerEvent) => {
      if (!stateRef.current.active) return;
      stateRef.current.dx = Math.max(-1, Math.min(1, e.movementX * 0.12)) * strength;
      stateRef.current.dy = Math.max(-1, Math.min(1, e.movementY * 0.12)) * strength;
      tick();
    };
    const up = () => {
      stateRef.current.active = false;
    };
    const leave = () => {
      stateRef.current.active = false;
    };

    wrap.addEventListener('pointerdown', down);
    wrap.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    wrap.addEventListener('pointerleave', leave);
    return () => {
      wrap.removeEventListener('pointerdown', down);
      wrap.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      wrap.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(stateRef.current.raf);
    };
  }, [reduce, strength]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className ?? ''}`}>
      <div ref={innerRef} className="relative w-full h-full" style={{ willChange: 'transform' }}>
        {children}
      </div>
    </div>
  );
};