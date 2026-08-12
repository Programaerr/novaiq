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
    // The same culling drives layer promotion (`.rv-lit`). A 560px disc held as its own
    // compositor layer is ~1.25MB of GPU memory, and the whole group's discs were promoted
    // together on first hover — fourteen of them at once is ~17MB allocated in a single
    // frame, which on a device short of texture memory is exactly what evicts the layers
    // around it and makes a card, and the light itself, blink out and back. So a layer is
    // created only for cards the pointer can actually move, and kept until they are
    // comfortably past reach — hysteresis, so a card hovering right on the boundary does not
    // thrash in and out of promotion. See `.rv-lit` in index.css.
    const RELEASE = REACH + 120;
    const RELEASE_SQ = RELEASE * RELEASE;

    const paint = (clientX: number, clientY: number, force = false) => {
      // Nothing at all while a scroll is in flight, and this is the single most important line
      // in the file for how the page feels.
      //
      // Scrolling invalidates the cached boxes, because they are viewport-relative. It also
      // makes the browser emit pointermove on every scroll frame, since the cards slide under a
      // cursor that has not moved. Those two together meant each frame of every scroll ran
      // measure() — one getBoundingClientRect for the group plus one per card, up to fifteen
      // forced synchronous layouts — before the frame could be painted. That is the case where
      // scrolling while anything moves goes from smooth to unusable.
      //
      // The light simply holds its position for the ~120ms a scroll is running and re-syncs on
      // the next real pointer move. Freezing a decorative highlight for a fraction of a second
      // is not something anyone will see; the stutter it replaces is the whole complaint.
      if (scrolling) return;
      if (stale) measure();
      const gx = clientX - groupX;
      const gy = clientY - groupY;
      let hit: HTMLElement | null = null;
      for (let i = 0; i < cards.length; i++) {
        const b = boxes[i];
        const x = gx - b.x;
        const y = gy - b.y;
        if (x >= 0 && x <= b.w && y >= 0 && y <= b.h) hit = cards[i];

        // Gap between the pointer and this card's box, per axis — zero while inside it.
        const dx = x < 0 ? -x : x > b.w ? x - b.w : 0;
        const dy = y < 0 ? -y : y > b.h ? y - b.h : 0;
        const dsq = dx * dx + dy * dy;

        // Promotion, per card, with hysteresis — the block above has described this since it
        // was written and it was never actually here. `.rv-lit` existed only in that comment:
        // no rule in index.css, no line in this file, and RELEASE_SQ computed and unused. What
        // the CSS did instead was promote EVERY disc in the group the instant `is-live` landed.
        //
        // On a phone that is the whole bug behind "it blinks out and comes back whenever I
        // touch it". A touch calls light() -> is-live -> every disc in the panel is handed its
        // own compositor layer in one frame; at three device pixels to one those are megabytes
        // each, and a device short of texture memory answers a sudden demand like that by
        // evicting layers that are already there — including the card being touched, which then
        // has to be re-rastered before it can be shown again. touchend drops is-live, all of
        // them are destroyed, and the next touch allocates the lot over again.
        //
        // Two thresholds rather than one so a card sitting exactly on the boundary does not
        // thrash in and out of promotion as the pointer jitters across it.
        if (dsq <= REACH_SQ) cards[i].classList.add('rv-lit');
        else if (dsq > RELEASE_SQ) cards[i].classList.remove('rv-lit');

        // Past reach the write itself is skipped too: every pixel of such a card is already
        // drawn in the gradient's flat tail colour, so moving its centre cannot change a pixel.
        if (!force && dsq > REACH_SQ) continue;
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
      // Hand every layer back. On touch this runs on every touchend, which is exactly when the
      // memory should be released — nothing is going to move until the next touch anyway.
      for (const card of cards) card.classList.remove('rv-lit');
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
    //
    // Scrolling additionally suppresses painting outright until it settles — see the guard at
    // the top of paint() for why that, and not merely re-measuring, is what this needs.
    let scrolling = false;
    let scrollTimer = 0;
    const onScroll = () => {
      stale = true;
      scrolling = true;
      clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        scrolling = false;
      }, 120);
    };
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
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', invalidate);

    detach.current = () => {
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(scrollTimer);
      group.removeEventListener('pointermove', onPointerMove);
      group.removeEventListener('pointerenter', onPointerEnter);
      group.removeEventListener('pointerleave', onPointerLeave);
      group.removeEventListener('touchstart', onTouchStart);
      group.removeEventListener('touchmove', onTouchMove);
      group.removeEventListener('touchend', leave);
      group.removeEventListener('touchcancel', leave);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', invalidate);
    };
    // Stable identity: a ref callback that changed each render would be torn down and re-run on
    // every one, re-measuring the group and dropping `is-live` mid-hover.
  }, []);
}
