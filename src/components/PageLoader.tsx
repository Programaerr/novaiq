import React from 'react';

// Minimal, theme-matching fallback shown for the brief instant a lazy-loaded
// route chunk is being fetched — kept intentionally lightweight (no motion/framer
// dependency, no image) so it never becomes its own performance cost.
export const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-9 h-9 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
  </div>
);
