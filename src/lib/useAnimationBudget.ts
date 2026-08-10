// Global "nothing animates when nobody is looking" switch. A hidden tab is the ultimate
// off-screen: the visitor cannot see a single frame, so every running animation — CSS loops,
// the WebGL scene, the scroll rig's rAF — is pure CPU/GPU/RAM burn for zero benefit. Browsers
// already throttle timers in a hidden tab, but they leave CSS animations and WebGL render
// loops running on the compositor/GPU unless told to stop.
//
// Flipping `html[data-hidden]` lets one blanket CSS rule pause every opacity/transform
// animation at once (see index.css), and modules that read `isTabHidden()` skip their rAF.
export function applyAnimationBudget(): void {
  const root = document.documentElement;
  const sync = () => {
    if (document.visibilityState === 'hidden') root.dataset.hidden = 'true';
    else delete root.dataset.hidden;
  };
  sync();
  document.addEventListener('visibilitychange', sync, { passive: true });
}

export function isTabHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}