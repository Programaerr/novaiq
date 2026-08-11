import { useSyncExternalStore } from 'react';

// One capability classifier for the whole page, applied as a `data-device='low'` attribute
// on <html> so CSS can branch on it without per-element JS. Heavy GPU effects (backdrop
// blurs, star-drift compositing, 3D wheels, floated layers) stay exactly as designed on
// capable GPUs, and get a cheaper equivalent that looks the same on the rest.
//
// Two passes:
//   1. Synchronous hardware guess at import time (cores / RAM / reduced-motion) — applied
//      before first paint so a known-weak device never even starts the expensive effects.
//   2. A runtime jank probe a couple of seconds after load: if the median frame interval
//      stays above budget even while idle, the GPU/CPU cannot hold 60fps and the page
//      downgrades late. This is what catches weak machines that pass the hardware checks
//      (e.g. a 4-core laptop with an integrated GPU) — the exact devices the user sees
//      stutter on. Downgrade-only: discover a weak device, never an upgrade.

const JANK_BUDGET_MS = 26; // median frame interval over budget = not holding 60fps
const PROBE_FRAMES = 45;   // ~0.75s of rAF samples
const PROBE_DELAY_MS = 1800;

let lowEnd = false;
const listeners = new Set<() => void>();

export function isLowEndDevice(): boolean {
  return lowEnd;
}

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

function detectHardware(): boolean {
  try {
    if (typeof navigator === 'undefined') return false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;

    const cores = navigator.hardwareConcurrency;
    const mem = (navigator as { deviceMemory?: number }).deviceMemory;
    if (typeof cores === 'number' && cores > 0 && cores <= 2) return true;
    if (typeof mem === 'number' && mem > 0 && mem <= 4) return true;
    return false;
  } catch {
    return false;
  }
}

function scheduleRuntimeProbe(): void {
  if (typeof requestAnimationFrame !== 'function' || typeof setTimeout !== 'function') return;

  const run = () => {
    if (document.visibilityState === 'hidden') return;
    let frame = 0;
    let last = performance.now();
    const intervals: number[] = [];

    const step = (now: number) => {
      if (frame > 0) intervals.push(now - last);
      last = now;
      frame += 1;
      if (frame >= PROBE_FRAMES) {
        const sorted = [...intervals].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
        if (median > JANK_BUDGET_MS) flagLowEnd();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  setTimeout(run, PROBE_DELAY_MS);
}

// Applied once, before React mounts: hardware guess synchronously (so CSS is already on the
// cheap tier for a known-weak device), then the runtime probe schedules itself for later.
export function applyDeviceClass(): void {
  if (detectHardware()) flagLowEnd();
  else scheduleRuntimeProbe();
}