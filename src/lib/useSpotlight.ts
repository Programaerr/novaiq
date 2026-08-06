import { useCallback } from 'react';

function setSpotPosition(el: HTMLElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--spot-x', `${clientX - rect.left}px`);
  el.style.setProperty('--spot-y', `${clientY - rect.top}px`);
}

/**
 * Windows/Fluent-style spotlight: a soft white light that tracks the pointer inside a card
 * or button (`.spotlight-card`/`.spotlight-glow` + `.cta-spotlight`). Position is pushed
 * straight into a `--spot-x`/`--spot-y` CSS custom property via the DOM — no setState — so
 * the glow tracks every frame without a React re-render.
 *
 * Mouse relies on CSS `:hover` to fade the glow in/out, but touch screens have no hover —
 * a finger down needs its own signal, so `onTouchStart`/`onTouchEnd` toggle a `spotlight-touch`
 * class that the same CSS rules key off of alongside `:hover`. Previously four components each
 * hand-rolled an identical mouse-only version of this; centralized here so touch support only
 * had to be written once.
 */
export function useSpotlight<T extends HTMLElement>() {
  const onMouseMove = useCallback((e: React.MouseEvent<T>) => {
    setSpotPosition(e.currentTarget, e.clientX, e.clientY);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent<T>) => {
    const touch = e.touches[0];
    if (touch) setSpotPosition(e.currentTarget, touch.clientX, touch.clientY);
    e.currentTarget.classList.add('spotlight-touch');
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent<T>) => {
    const touch = e.touches[0];
    if (touch) setSpotPosition(e.currentTarget, touch.clientX, touch.clientY);
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent<T>) => {
    e.currentTarget.classList.remove('spotlight-touch');
  }, []);

  return { onMouseMove, onTouchStart, onTouchMove, onTouchEnd };
}
