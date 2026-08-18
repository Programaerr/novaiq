/**
 * One loading counter for the whole app.
 *
 * Every lazily-imported route chunk reports into this single counter instead of mounting its own
 * spinner. A lazy chunk's factory runs exactly once — the first time the component renders — so
 * the counter only rises when the browser genuinely has to download a module it has never fetched
 * before. Navigating back to a page whose chunk is already cached never re-runs the factory, so
 * the counter stays at zero and no loader flashes.
 *
 * That is what makes the loader "smart": it exists only while real work is happening, covers the
 * entire viewport (see SmartPageLoader), and disappears the instant every pending import resolves.
 */

type Listener = (pending: number) => void;

let pending = 0;
const listeners = new Set<Listener>();

/** Subscribe to the counter. Returns an unsubscribe function. */
export function subscribeLoads(fn: Listener): () => void {
  listeners.add(fn);
  fn(pending);
  return () => listeners.delete(fn);
}

/** Wrap a lazy chunk's import() promise so the unified loader tracks it. */
export function trackLoad<T>(promise: Promise<T>): Promise<T> {
  pending += 1;
  listeners.forEach((fn) => fn(pending));
  return promise.finally(() => {
    pending = Math.max(0, pending - 1);
    listeners.forEach((fn) => fn(pending));
  });
}