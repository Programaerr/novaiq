import { useEffect, useRef, useState } from 'react';

// Visibility gate for anything that would otherwise keep running while the visitor is
// looking elsewhere: auto-advance carousels, interval-driven effects, scroll rigs. If a
// section is off-screen the visitor cannot see it change, so keeping its timer firing is
// pure waste that on a weak device competes with the on-screen render for the same GPU/CPU.
//
// Returns [ref, isInView]. IntersectionObserver, not a scroll listener — no per-frame work,
// and the browser reports crossings off the main scroll path.
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit & { initiallyVisible?: boolean } = {}
) {
  const ref = useRef<T | null>(null);
  // Default to visible until the first observation, so a first paint is never wrongly
  // suppressed by an observer that has not fired yet.
  const [isInView, setIsInView] = useState(options.initiallyVisible ?? true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { rootMargin: options.rootMargin, threshold: options.threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, isInView] as const;
}