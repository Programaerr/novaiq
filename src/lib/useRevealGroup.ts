import { useCallback, useRef } from 'react';

/**
 * Drives the Windows/Fluent reveal across a row of cards — both halves of it: `.reveal-border`
 * for the edge nearest the pointer and `.reveal-face` for the surface under it (index.css).
 *
 * Returns a ref to put on the container. Every descendant carrying either class gets the
 * pointer's position written into its own `--rx`/`--ry`.
 *
 * ## Why a callback ref, and not useRef + useEffect([])
 *
 * That is what this was, and it silently died on any container that mounts and unmounts while
 * the component holding the hook stays alive. App.tsx is exactly that shape: the hook lives in
 * App, which never unmounts, while its group sits inside `{activePage === 'home' && ...}`.
 * Leave home and come back and React destroys that div and builds a new one — `ref.current`
 * now points at the new node, but an effect with `[]` deps never re-runs, so every listener is
 * still attached to the old detached one. The reveal goes dead and only a full page reload
 * brings it back. Landing on any non-home URL first was the same bug from the other side:
 * `ref.current` was null when the effect ran, the hook returned immediately, and navigating to
 * home afterwards never wired anything up at all.
 *
 * A callback ref is called by React with the node on attach and with `null` on detach, every
 * time either happens — which is precisely the lifecycle the listeners need. The hook is then
 * correct for a container that appears late, disappears, or is replaced, without the caller
 * having to know that it must not be conditionally rendered.
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
  // Teardown for the node currently wired up, held across calls so attaching to a new node can
  // release the previous one. React hands us `null` before the replacement node in a remount,
  // so this is usually already spent by then — but not on a straight swap, and leaking a set of
  // listeners onto a detached node per navigation is the very thing being fixed.
  const detach = useRef<(() => void) | null>(null);

  return useCallback((group: T | null) => {
    detach.current?.();
    detach.current = null;
    if (!group) return;

    let frame = 0;
    let stale = true;
    let cards: HTMLElement[] = [];
    let groupX = 0;
    let groupY = 0;
    // Each card's box relative to the group's own origin — fixed as long as nothing reflows,
    // which is what lets a frame skip measuring entirely.
    let boxes: Array<{ x: number; y: number; w: number; h: number }> = [];
    // Last value actually written to each card, so an unchanged one can be skipped. NaN
    // seeds a first write for every card regardless of where the pointer entered.
    let lastX: number[] = [];
    let lastY: number[] = [];
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
      // Card list can change with the layout, so the skip-cache is rebuilt alongside it —
      // a stale entry would suppress the first write to a card that has genuinely moved.
      lastX = new Array(cards.length).fill(NaN);
      lastY = new Array(cards.length).fill(NaN);
      stale = false;
    };

    // Past this distance from a card's nearest edge, the pointer is beyond the reach of that
    // card's gradients: the ring's is a 240px circle whose last stop is a flat floor, and the
    // face's has decayed to nothing well before here. Every pixel of such a card is drawn in
    // that constant tail colour, so moving the gradient's centre around inside it produces a
    // byte-identical picture — the write is a repaint that cannot change what is on screen.
    //
    // Skipping those is the single biggest saving in this effect. Writing --rx/--ry
    // re-rasterizes the element's gradient, and for `.reveal-border` that gradient is carved
    // to an outline by a `mask-composite` pair, which is one of the most expensive things a
    // browser can be asked to repaint. Unculled, one pointer move repainted every card in
    // every group — fourteen of them across the page — sixty times a second, to change the
    // appearance of the two or three actually near the cursor. That is what made hovering
    // anywhere near a card stutter on a weak GPU.
    const REACH = 300;
    const REACH_SQ = REACH * REACH;

    const paint = (clientX: number, clientY: number, force = false) => {
      if (stale) measure();
      const gx = clientX - groupX;
      const gy = clientY - groupY;
      let hit: HTMLElement | null = null;
      for (let i = 0; i < cards.length; i++) {
        const b = boxes[i];
        const x = gx - b.x;
        const y = gy - b.y;
        if (x >= 0 && x <= b.w && y >= 0 && y <= b.h) hit = cards[i];
        if (!force) {
          // Gap between the pointer and this card's box, per axis — zero while inside it.
          const dx = x < 0 ? -x : x > b.w ? x - b.w : 0;
          const dy = y < 0 ? -y : y > b.h ? y - b.h : 0;
          if (dx * dx + dy * dy > REACH_SQ) continue;
        }
        // Quantised to a 2px grid, and skipped outright when the rounded value has not
        // moved. What a write costs now is a style recalc on the card and a compositor
        // transform on the light — no painting at all, since the disc these coordinates
        // move is a static texture (see `.rv` in index.css). That is why the grid is 2px
        // rather than the 6px it needed when this same write forced a masked gradient to be
        // regenerated: the expensive part is gone, so the quantisation only has to absorb
        // the sub-pixel noise that pointer streams emit, not ration real work. At 2px the
        // motion is smooth to the eye and every genuinely redundant event still costs
        // nothing.
        const qx = Math.round(x / 2) * 2;
        const qy = Math.round(y / 2) * 2;
        if (!force && qx === lastX[i] && qy === lastY[i]) continue;
        lastX[i] = qx;
        lastY[i] = qy;
        cards[i].style.setProperty('--rx', `${qx}px`);
        cards[i].style.setProperty('--ry', `${qy}px`);
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
    // Forced (unculled): this is the frame the group lights up on, and a card that has never
    // been written still sits on --rx/--ry's 50% fallback — a gradient centred in its own box,
    // which for the ring is its brightest state, not its dimmest. Culling here would light
    // every distant card instead of leaving it dark. Once seeded correctly, subsequent moves
    // can skip them safely, because the value they keep is the one that already renders right.
    const light = (clientX: number, clientY: number) => {
      paint(clientX, clientY, true);
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

    detach.current = () => {
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
    // Stable identity: a ref callback that changed each render would be torn down and re-run on
    // every one, re-measuring the group and dropping `is-live` mid-hover.
  }, []);
}
