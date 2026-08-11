import { useSyncExternalStore } from 'react';

// One capability classifier for the whole page, applied as a `data-device='low'` attribute
// on <html> so CSS can branch on it without per-element JS. Heavy GPU effects (backdrop
// blurs, star-drift compositing, 3D wheels, floated layers) stay exactly as designed on
// capable GPUs, and get a cheaper equivalent that looks the same on the rest.
//
// Two passes:
//   1. Synchronous hardware guess at import time (cores / RAM / touch / reduced-motion) —
//      applied before first paint so a known-weak device never even starts the expensive
//      effects. Phones get a lower budget than desktops: a mobile GPU chokes on the same
//      layer count far earlier, so the same spec sheet means "low-end" sooner there.
//   2. A runtime jank probe a couple of seconds after load: if the median frame interval
//      stays above budget even while idle, the GPU/CPU cannot hold 60fps and the page
//      downgrades late. This is what catches weak machines that pass the hardware checks
//      (e.g. a 4-core laptop with an integrated GPU) — the exact devices the user sees
//      stutter on. Downgrade-only: discover a weak device, never an upgrade.

const JANK_BUDGET_MS = 26;     // desktop: median frame interval over budget = not holding 60fps
const TOUCH_BUDGET_MS = 22;    // phones/tablets get a tighter budget — weaker squeezed GPUs
const PROBE_FRAMES = 45;       // ~0.75s of rAF samples
const PROBE_DELAY_MS = 1800;

let lowEnd = false;
const listeners = new Set<() => void>();

// Live tier for React consumers — re-renders (and re-reads) if the jank probe downgrades
// after mount, so components built for capable GPUs hand themselves over to the lite path
// the moment the sticker is applied.
export function useLowEndDevice(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    () => lowEnd,
    () => lowEnd,
  );
}

function flagLowEnd(): void {
  if (lowEnd) return;
  lowEnd = true;
  try {
    document.documentElement.dataset.device = 'low';
  } catch {
    // no DOM to write to — the flag itself is still enough for JS consumers
  }
  listeners.forEach((fn) => fn());
}

function isTouchDevice(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 0
  );
}

function detectHardware(): boolean {
  try {
    if (typeof navigator === 'undefined') return false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;

    const cores = navigator.hardwareConcurrency;
    const mem = (navigator as { deviceMemory?: number }).deviceMemory;
    const touch = isTouchDevice();

    if (typeof cores === 'number' && cores > 0 && cores <= 2) return true;
    if (typeof mem === 'number' && mem > 0 && mem <= 4) return true;
    // Touch devices only — a 4-core phone (or ≤6GB one) is already a low-end phone, where
    // the same numbers on a desktop would pass. Desktops keep the conservative budget.
    if (touch && typeof cores === 'number' && cores > 0 && cores <= 4) return true;
    if (touch && typeof mem === 'number' && mem > 0 && mem <= 6) return true;
    return false;
  } catch {
    return false;
  }
}

/** Samples PROBE_FRAMES frames and downgrades if the median interval misses the budget. */
function measureFrames(): void {
  if (document.visibilityState === 'hidden' || lowEnd) return;
  const budget = isTouchDevice() ? TOUCH_BUDGET_MS : JANK_BUDGET_MS;
  let frame = 0;
  let last = performance.now();
  const gaps: number[] = [];

  const step = (now: number) => {
    if (frame > 0) gaps.push(now - last);
    last = now;
    if (++frame < PROBE_FRAMES) {
      requestAnimationFrame(step);
      return;
    }
    gaps.sort((a, b) => a - b);
    if ((gaps[gaps.length >> 1] ?? 0) > budget) flagLowEnd();
  };
  requestAnimationFrame(step);
}

function scheduleRuntimeProbe(): void {
  if (typeof requestAnimationFrame !== 'function' || typeof setTimeout !== 'function') return;

  // Long tasks are the most direct evidence there is: the main thread was blocked for over
  // 50ms and could not have produced a frame during it. A handful of those early on means
  // this machine cannot hold the expensive tier, whatever its spec sheet claims.
  try {
    let long = 0;
    const po = new PerformanceObserver((list) => {
      long += list.getEntries().length;
      if (long >= 3) {
        po.disconnect();
        flagLowEnd();
      }
    });
    po.observe({ type: 'longtask', buffered: true });
    setTimeout(() => po.disconnect(), 15000);
  } catch {
    // longtask unsupported (Safari/Firefox) — the frame probes below still cover it
  }

  // Measured while the page is actually being *used*, which is the fix for the flaw this
  // replaces: the old probe sampled 45 frames on a page sitting perfectly still 1.8s after
  // load, and an idle page is exactly where a weak machine still holds 60fps. It reported
  // "capable" for the very devices that stutter the moment anything moves, so they were
  // handed the expensive tier — permanently promoted layers, the 3D fan, live backdrop
  // blurs — which is what they could not afford. Sampling on the first scroll or pointer
  // move catches the machine under the load that actually hurts it.
  let armed = false;
  const arm = () => {
    if (armed) return;
    armed = true;
    window.removeEventListener('scroll', arm);
    window.removeEventListener('pointermove', arm);
    measureFrames();
  };
  window.addEventListener('scroll', arm, { passive: true });
  window.addEventListener('pointermove', arm, { passive: true });

  // Backstop, in case nobody ever scrolls or moves the pointer.
  setTimeout(measureFrames, PROBE_DELAY_MS);
}

// Applied once, before React mounts: hardware guess synchronously (so CSS is already on the
// cheap tier for a known-weak device), then the runtime probe schedules itself for later.
export function applyDeviceClass(): void {
  if (detectHardware()) flagLowEnd();
  else scheduleRuntimeProbe();
}