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
 * ## Mouse only, deliberately
 *
 * This is a cursor effect, and a touchscreen has no cursor. It used to run on touch too, via
 * a second set of touch listeners, and that was the source of two separate bugs on phones:
 *
 *   - Every `touchstart` painted synchronously and re-lit the group, so rapid taps restarted
 *     the 260ms opacity transition over and over. On a card that is also running a
 *     scroll-driven transform (the roadmap cards' drift), that repaint pressure showed up as
 *     the card visibly blinking out and back.
 *   - Phones are the weakest hardware the site runs on, and they were being asked to
 *     rasterize a large masked radial gradient per card per frame for an effect that has no
 *     meaning without a pointer to follow.
 *
 * Gating on `(hover: hover) and (pointer: fine)` removes both at the root rather than tuning
 * around them: on touch, nothing here attaches at all, and the matching `@media` block in
 * index.css takes the pseudo-elements out of the render tree entirely so their masks are
 * never rasterized either. Touch devices keep the cards' own static borders.
 *
 * ## No layout reads per frame
 *
 * The naive version measured every card with getBoundingClientRect() inside the rAF, which is
 * a forced synchronous layout on every single frame of every pointer move — with four to ten
 * cards in a group, the dominant cost of the whole effect and the reason it stuttered on
 * weaker machines. Card positions relative to their group do not change as the pointer moves,
 * so they are measured once and cached; a frame then needs only arithmetic and style writes.
 * Anything that *can* invalidate the cache (scroll, resize) just flags it, and the next frame
 * re-measures at most once.
 */
export function useRevealGroup<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    // No cursor, no cursor effect. See the note above — this is what keeps phones out of it.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    let stale = true;
    let cards: HTMLElement[] = [];
    let groupX = 0;
    let groupY = 0;
    // Each card's box relative to the group's own origin — fixed as long as nothing reflows,
    // which is what lets a frame skip measuring entirely.
    let boxes: Array<{ x: number; y: number; w: number; h: number }> = [];

    const measure = () => {
      const gr = group.getBoundingClientRect();
      groupX = gr.left;
      groupY = gr.top;
      cards = [...group.querySelectorAll<HTMLElement>('.reveal-border, .reveal-face')];
      boxes = cards.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - gr.left, y: r.top - gr.top, w: r.width, h: r.height };
      });
      stale = false;
    };

    const paint = (clientX: number, clientY: number) => {
      if (stale) measure();
      const gx = clientX - groupX;
      const gy = clientY - groupY;
      for (let i = 0; i < cards.length; i++) {
        const b = boxes[i];
        cards[i].style.setProperty('--rx', `${gx - b.x}px`);
        cards[i].style.setProperty('--ry', `${gy - b.y}px`);
      }
    };

    // Move events can fire well above the refresh rate; coalesce to one paint per frame.
    let nextX = 0;
    let nextY = 0;
    const schedule = (clientX: number, clientY: number) => {
      nextX = clientX;
      nextY = clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        paint(nextX, nextY);
      });
    };

    // Classes toggled straight on the node rather than through state: these fire on every
    // enter/leave and a re-render of the whole section per hover would be wasted work.
    const onEnter = (e: PointerEvent) => {
      paint(e.clientX, e.clientY);
      group.classList.add('is-live');
    };

    const onLeave = () => {
      group.classList.remove('is-live');
    };

    const invalidate = () => {
      stale = true;
    };

    const onMove = (e: PointerEvent) => schedule(e.clientX, e.clientY);

    group.addEventListener('pointermove', onMove);
    group.addEventListener('pointerenter', onEnter);
    group.addEventListener('pointerleave', onLeave);
    // Cached boxes are viewport-relative, so both of these move them. Flag-only handlers:
    // the re-measure itself happens inside the next frame's paint, at most once.
    window.addEventListener('scroll', invalidate, { passive: true });
    window.addEventListener('resize', invalidate);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      group.removeEventListener('pointermove', onMove);
      group.removeEventListener('pointerenter', onEnter);
      group.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', invalidate);
      window.removeEventListener('resize', invalidate);
    };
  }, []);

  return ref;
}
