import React, { useEffect, useRef, useState } from 'react';

/**
 * A tiny scroll-reveal wrapper for the homepage sections: fades and lifts content in once it
 * enters the viewport. Pure CSS transitions driven by an IntersectionObserver — no animation
 * library, no GPU-backed per-frame work, and it does nothing at all for `prefers-reduced-motion`.
 *
 * Sections start visually hidden and animate in; if JS or the observer ever fail, the `is-ready`
 * fallback class (set on a timeout) keeps content visible rather than pinned at opacity 0.
 */
interface RevealProps {
  children: React.ReactNode;
  /** How far the block travels while fading in, in px. */
  y?: number;
  /** Stagger delay in ms — pass a small positive value to siblings to cascade. */
  delay?: number;
  className?: string;
}

export const Reveal: React.FC<RevealProps> = ({ children, y = 24, delay = 0, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If the visitor asked for less motion, show everything immediately and do no observing.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    );
    io.observe(el);

    // Safety net: if the observer never fires for whatever reason, show the content anyway.
    const t = window.setTimeout(() => setShown(true), 2500);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translateY(${y}px)`,
        transition: `opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: shown ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
};
