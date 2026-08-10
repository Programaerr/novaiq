import { useCallback, useRef, useState } from 'react';

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
  // Default to visible until the first observation, so a first paint is never wrongly
  // suppressed by an observer that has not fired yet.
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(options.initiallyVisible ?? true);

  const callbackRef = useCallback((node: T | null) => {
    ref.current = node;
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
    // The observer instance is owned by the element, so it lives as long as the node does.
    (node as T & { __nqInViewObserver?: IntersectionObserver }).__nqInViewObserver = observer;
  }, [options.rootMargin, options.threshold]);

  return [callbackRef, isInView] as const;
}