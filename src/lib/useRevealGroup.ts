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
 * Mouse and touch are handled by two separate sets of listeners, which looks redundant next
 * to pointer events' whole promise of unifying them, and is not:
 *
 *   - A finger that starts to drag has its *pointer* stream cancelled, because the browser
 *     has decided the gesture belongs to the scroller. `touchmove` keeps firing throughout.
 *     Since the ask is that the light follow the finger, the light has to outlive that
 *     handover, so touch reads touch events and the pointer handlers ignore `touch` entirely
 *     rather than the two fighting over the same gesture.
 *   - Touch has no hover, so its lifecycle is the press: lit on touchstart, released on
 *     touchend. Which also means `is-live` cannot wait for the first *move* to know where
 *     the light goes — touchstart paints before it lights the group, or the first frame
 *     lands dead-centre on every card, at --rx/--ry's 50% fallback.
 *
 * Touch listeners are passive: this must never be able to hold up a scroll.
 *
 * ## No layout reads per frame
 *
 * Card rects used to be measured inside the rAF, one getBoundingClientRect() per card per
 * frame — a forced synchronous layout on every frame of every pointer move, and with four to
 * ten cards in a group the dominant cost of the whole effect. Positions relative to the group
 * do not change as the pointer moves, so they are measured once and cached; a frame then
 * needs only arithmetic and style writes. Anything that can invalidate the cache (scroll,
 * resize) just flags it, and the next frame re-measures at most once. Purely an internal
 * change — the effect itself is unchanged on every device.
 */
export function useRevealGroup<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const group = ref.current;
    if (!group) return;

    let frame = 0;
    let stale = true;
    let cards: HTMLElement[] = [];
    let groupX = 0;
    let groupY = 0;
    // Each card's box relative to the group's own origin — fixed as long as nothing reflows,
    // which is what lets a frame skip measuring entirely.
    let boxes: Array<{ x: number; y: number; w: number; h: number }> = [];
    // The card the pointer is currently inside, if any. `:hover` says this for a mouse but
    // has nothing to say for a finger, so it is tracked here and mirrored as `.is-touched`.
    let inside: HTMLElement | null = null;

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
      let hit: HTMLElement | null = null;
      for (let i = 0; i < cards.length; i++) {
        const b = boxes[i];
        const x = gx - b.x;
        const y = gy - b.y;
        cards[i].style.setProperty('--rx', `${x}px`);
        cards[i].style.setProperty('--ry', `${y}px`);
        if (x >= 0 && x <= b.w && y >= 0 && y <= b.h) hit = cards[i];
      }
      if (hit !== inside) {
        inside?.classList.remove('is-touched');
        hit?.classList.add('is-touched');
        inside = hit;
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

    // Classes toggled straight on the nodes rather than through state: these fire on every
    // enter/leave and a re-render of the whole section per hover would be wasted work.
    const light = (clientX: number, clientY: number) => {
      paint(clientX, clientY);
      group.classList.add('is-live');
    };

    const leave = () => {
      group.classList.remove('is-live');
      inside?.classList.remove('is-touched');
      inside = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') schedule(e.clientX, e.clientY);
    };
    const onPointerEnter = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') light(e.clientX, e.clientY);
    };
    const onPointerLeave = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') leave();
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) light(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) schedule(t.clientX, t.clientY);
    };

    // Cached boxes are viewport-relative, so both of these move them. Flag-only handlers:
    // the re-measure itself happens inside the next frame's paint, at most once.
    const invalidate = () => {
      stale = true;
    };

    group.addEventListener('pointermove', onPointerMove);
    group.addEventListener('pointerenter', onPointerEnter);
    group.addEventListener('pointerleave', onPointerLeave);
    group.addEventListener('touchstart', onTouchStart, { passive: true });
    group.addEventListener('touchmove', onTouchMove, { passive: true });
    group.addEventListener('touchend', leave, { passive: true });
    group.addEventListener('touchcancel', leave, { passive: true });
    window.addEventListener('scroll', invalidate, { passive: true });
    window.addEventListener('resize', invalidate);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      group.removeEventListener('pointermove', onPointerMove);
      group.removeEventListener('pointerenter', onPointerEnter);
      group.removeEventListener('pointerleave', onPointerLeave);
      group.removeEventListener('touchstart', onTouchStart);
      group.removeEventListener('touchmove', onTouchMove);
      group.removeEventListener('touchend', leave);
      group.removeEventListener('touchcancel', leave);
      window.removeEventListener('scroll', invalidate);
      window.removeEventListener('resize', invalidate);
    };
  }, []);

  return ref;
}
