import { useRef } from 'react';

// Speed-of-light "border beam" hover effect shared by the glow CTA buttons and the
// template cards' action buttons — drives --border-beam-angle every animation frame from
// JS instead of a CSS @keyframes animation on the custom property. Tailwind's build strips
// the @property registration a custom property needs to be smoothly interpolable; without
// it, var(--border-beam-angle) with no fallback resolves as invalid and silently
// invalidates the whole conic-gradient that reads it (see .border-beam-btn / .cta-border-beam
// in index.css).
export function useBorderBeam() {
  const rafRef = useRef<number | null>(null);

  const startBorderBeam = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const start = performance.now();
    const tick = (now: number) => {
      const angle = ((now - start) / 1400) * 360 % 360;
      el.style.setProperty('--border-beam-angle', `${angle}deg`);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopBorderBeam = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  return { startBorderBeam, stopBorderBeam };
}
