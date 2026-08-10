// One-time capability probe. Instead of tuning every animation/"effect by hand per device
// (which is why the site still janked on a Dimensity 8200 while the top-end iPhones were
// fine), the whole page is classified once into a cheap "low-end" tier. Heavy GPU effects —
// full-viewport backdrop-filter re-rasterization, multi-surface star-drift compositing, the
// WebGL scene — stay exactly as designed on capable GPUs, and get a cheaper equivalent that
// looks the same on the rest. This is the thing that makes scroll smooth on both.
//
// Heuristics (all read once, all free): a device with very few CPU cores, little RAM, or a
// user's explicit reduce-motion preference is a safe bet to be GPU-poor too. Anything not
// classified is assumed capable — we never degrade a device we're not sure weak.
export const isLowEndDevice = (): boolean => {
  try {
    if (typeof navigator === 'undefined') return false;
    if (
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) return true;

    const cores = navigator.hardwareConcurrency;
    const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    // Raw heuristics, deliberately conservative: 2 cores / 4GB RAM are unambiguous low-end
    // (a 3-core laptop or a 4-core budget phone), and nothing stronger gets flagged.
    if (typeof cores === 'number' && cores > 0 && cores <= 2) return true;
    if (typeof deviceMemory === 'number' && deviceMemory > 0 && deviceMemory <= 4) return true;
    return false;
  } catch {
    return false;
  }
};

// Applied once, before first paint, as a data-attribute on <html> so the entire stylesheet can
// branch on it without any per-element JS. Keeps the check on module import (a single small
// script cost) instead of inside React render.
export function applyDeviceClass(): void {
  if (isLowEndDevice()) {
    document.documentElement.dataset.device = 'low';
  }
}