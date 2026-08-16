import React, { useCallback, useState } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface TouchRippleProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  maxRipples?: number;
}

let uid = 0;

/**
 * A tap ripple: on every pointer press on the wrapped element, a white ring expands from the
 * exact contact point and fades. Desktop hover effects are irrelevant on a phone, so this is
 * the tactile replacement — each touch answers with a pulse.
 */
export const TouchRipple: React.FC<TouchRippleProps> = ({
  children,
  className,
  color = 'rgba(255,255,255,0.35)',
  maxRipples = 3,
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const addRipple = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const id = ++uid;
      setRipples((prev) => [
        ...prev.slice(-(maxRipples - 1)),
        { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
      ]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 700);
    },
    [maxRipples],
  );

  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      onPointerDown={addRipple}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: r.x,
            top: r.y,
            width: 4,
            height: 4,
            background: color,
            transform: 'translate(-50%, -50%)',
            animation: 'nq-touch-ripple 0.7s ease-out forwards',
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};