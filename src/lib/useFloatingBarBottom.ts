import { useLayoutEffect, type RefObject } from 'react';

/**
 * Publishes a floating bar's bottom edge (px from the top of the viewport) as a CSS custom
 * property on <html>, kept in sync as the bar resizes or the window changes.
 *
 * The site stacks two independent `fixed` bars — the Navbar, and PageBackBar directly under
 * it — and everything below them (the other bar, the page's own top padding) used to carry
 * its own separate hardcoded Tailwind offsets at three breakpoints each. Those numbers
 * drifted apart twice, because trimming one bar's padding silently invalidated every magic
 * number underneath it and nothing connected the two. Measuring instead means each offset
 * derives from where the bar above it genuinely ends, so tweaking a bar's own padding or
 * font size re-flows everything below it automatically and they can't overlap again.
 *
 * Pass the bar's *untransformed* outer wrapper, not an inner element carrying an entrance
 * animation: getBoundingClientRect() includes transforms, so measuring a mid-animation
 * element would bake that animation's offset into the published value. A parent's own box
 * is unaffected by a child's transform, which is what makes the wrapper safe to measure.
 */
export function useFloatingBarBottom(ref: RefObject<HTMLElement | null>, cssVar: string): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const sync = () => {
      // Fixed-positioned, so this is already viewport-relative and doesn't move on scroll —
      // no scroll listener needed, which keeps this off the per-frame path entirely.
      document.documentElement.style.setProperty(cssVar, `${Math.round(el.getBoundingClientRect().bottom)}px`);
    };

    sync();
    // Catches the bar growing/shrinking (responsive padding, a longer title, a font swap).
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    // ResizeObserver only fires on size changes, not position ones — a breakpoint that only
    // moves the bar's `top` needs this second signal.
    window.addEventListener('resize', sync);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [ref, cssVar]);
}
