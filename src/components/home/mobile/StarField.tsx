import React, { useMemo } from 'react';

interface StarFieldProps {
  count?: number;
  className?: string;
}

/**
 * A canvas-less star field: N pure-white specks, each with a pseudo-random position, size and
 * twinkle timing baked in at render time. It drifts slowly across the video layer on phones,
 * where the desktop's static grid has no meaning.
 */
export const StarField: React.FC<StarFieldProps> = ({ count = 70, className }) => {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = (i * 2654435761) % 1000 / 1000;
        const seed2 = ((i * 40503 + 1337) % 1000) / 1000;
        return {
          left: `${Math.round(seed * 100)}%`,
          top: `${Math.round(seed2 * 100)}%`,
          size: 1 + Math.round(seed2 * 2),
          dur: 2.4 + seed * 4.6,
          delay: -seed * 5,
        };
      }),
    [count],
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`} aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            opacity: 0,
            animation: `nq-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite, nq-star-drift 26s linear infinite`,
            boxShadow: '0 0 4px rgba(255,255,255,0.9)',
          }}
        />
      ))}
    </div>
  );
};