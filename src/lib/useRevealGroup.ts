import { useEffect, useRef } from 'react';

/**
 * Drives the Windows/Fluent reveal across a row of cards — both halves of it: `.reveal-border`
 * for the edge nearest the pointer and `.reveal-face` for the surface under it (index.css).
 *
 * Returns a ref to put on the container. Every descendant carrying either class gets the
 * pointer's position written into its own `--rx`/`--ry`.
 *
 * One listener on the container rather than one per card, because that is the whole effect:
 * a card needs the pointer's position even while it sits over a *different* card, which is
 * what lights the near edge of its neighbours and carries the face light across the gap
 * between them. A card far from the pointer simply receives coordinates outside its own box,
 * so its gradient falls off to nothing on its own — the proximity falloff is the gradient's,
 * not distance math we have to write.
 *
 * Pointer events, not mouse events, so a finger drives this exactly as a mouse does: on touch
 * the enter/leave pair straddles the press rather than a hover, so the light appears under
 * the finger, follows it, and fades when it lifts. This used to bail out on `(hover: none)`
 * devices entirely, on the grounds that with no pointer --rx/--ry sit at their 50% fallback
 * and every card would glow dead-centre for ever. That is what `is-live` is for — nothing is
 * lit until a real pointer position has been written — so the guard was costing touch users
 * the effect to solve a problem the class already solved.
 */
export function useRevealGroup<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const group = ref.current;
    if (!group) return;

    let frame = 0;

    const paint = (clientX: number, clientY: number) => {
      const cards = group.querySelectorAll<HTMLElement>('.reveal-border, .reveal-face');
      // Measure every card first, then write. Interleaving the two would force a fresh
      // layout per card on every frame.
      const rects = [...cards].map((el) => el.getBoundingClientRect());
      cards.forEach((el, i) => {
        const r = rects[i];
        el.style.setProperty('--rx', `${clientX - r.left}px`);
        el.style.setProperty('--ry', `${clientY - r.top}px`);
      });
    };

    const onMove = (e: PointerEvent) => {
      // pointermove can fire well above the refresh rate; coalesce to one paint per frame.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        paint(e.clientX, e.clientY);
      });
    };

    // Class toggled straight on the node rather than through state: this fires on every
    // enter/leave and a re-render of the whole section per hover would be wasted work.
    const onEnter = () => group.classList.add('is-live');
    const onLeave = () => group.classList.remove('is-live');

    group.addEventListener('pointermove', onMove);
    group.addEventListener('pointerenter', onEnter);
    group.addEventListener('pointerleave', onLeave);
    // A finger that starts scrolling has its pointer stream cancelled by the browser: no
    // further pointermove arrives, so without this the light would freeze mid-card and stay
    // there while the page slid away underneath it.
    group.addEventListener('pointercancel', onLeave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      group.removeEventListener('pointermove', onMove);
      group.removeEventListener('pointerenter', onEnter);
      group.removeEventListener('pointerleave', onLeave);
      group.removeEventListener('pointercancel', onLeave);
    };
  }, []);

  return ref;
}
