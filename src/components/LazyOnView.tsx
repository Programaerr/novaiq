import React, { useEffect, useRef, useState } from 'react';

interface LazyOnViewProps {
  /** Content to reveal. Pass the fully-loaded children here — the component decides
      whether they have been "seen" yet, not how they load. */
  children: React.ReactNode;
  /** Rendered before the section enters the viewport. Keeps the layout from jumping
      when the real section finally mounts. */
  placeholder?: React.ReactNode;
  /** How far from the viewport the section starts loading. A positive margin loads
      just before it scrolls into view, so there is no blank while the user scrolls. */
  rootMargin?: string;
  className?: string;
}

/**
 * Renders `placeholder` until the element approaches the viewport, then mounts
 * `children` once. Built on IntersectionObserver so nothing loads for a section the
 * visitor never reaches — the browser downloads a lazy `import()` chunk only when the
 * observer fires, which is the whole point: parse and network cost are paid per section
 * actually seen, not for the entire page at once.
 */
export const LazyOnView: React.FC<LazyOnViewProps> = ({
  children,
  placeholder = null,
  rootMargin = '600px 0px',
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {seen ? children : placeholder}
    </div>
  );
};