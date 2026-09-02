/**
 * One WebGL surface at a time, and every surface on the page in the same load.
 *
 * ## What this is protecting against, and what it is deliberately NOT
 *
 * Creating a WebGL context and compiling its GLSL is synchronous main-thread work measured in
 * tens of milliseconds. Three of them landing in the SAME FRAME at load is what used to print
 * "[Violation] requestAnimationFrame handler took 124ms" in the console.
 *
 * That is a collision, not a budget. The fix that was in place before this one gated each field
 * on approaching the viewport, which does prevent the collision — and charges the bill to the
 * worst possible moment. The contact section's band began its work when the reader scrolled to
 * it, and so finished assembling itself while it was being looked at.
 *
 * A queue answers the actual requirement instead: the compiles all still happen at load, they
 * just happen one after another with an idle slot between them, so no single frame ever carries
 * more than one. Everything is finished long before a reader could scroll to the second surface.
 *
 * ## Why it lives here rather than inside TileField
 *
 * The page has more than one kind of WebGL surface — the cube fields, the hero panel's water,
 * the card field on the sign-in page. A queue that only knew about one of them would let the
 * others collide with it, which is the whole thing being prevented. There is one queue and
 * everything that opens a context joins it.
 *
 * `timeout` on the idle request is a ceiling, not a target: a page that never goes idle — which
 * a page still loading rarely is — would otherwise hold the second and third surfaces forever.
 */
type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };

const buildQueue: Array<() => void> = [];
let draining = false;

/** Yield to the browser, but never for longer than a beat. Safari still has no rIC. */
function afterAGap(fn: () => void) {
  const w = window as IdleWindow;
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 180 });
  else window.setTimeout(fn, 32);
}

function drainBuildQueue() {
  const next = buildQueue.shift();
  if (!next) {
    draining = false;
    return;
  }
  next();
  if (buildQueue.length) afterAGap(drainBuildQueue);
  else draining = false;
}

/**
 * Register a surface to be built. Returns a canceller, for one that unmounts — or that jumped
 * the queue by being on screen already — before its turn comes up.
 */
export function queueWebGLBuild(build: () => void): () => void {
  let cancelled = false;
  buildQueue.push(() => {
    if (!cancelled) build();
  });
  if (!draining) {
    draining = true;
    afterAGap(drainBuildQueue);
  }
  return () => {
    cancelled = true;
  };
}
