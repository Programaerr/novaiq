import React from 'react';
import { PERIWINKLE, PAPER, INK } from '../lib/homePalette';

// Minimal, theme-matching fallback shown for the brief instant a lazy-loaded
// route chunk is being fetched — kept intentionally lightweight (no motion/framer
// dependency, no image) so it never becomes its own performance cost.
export const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center py-24 bg-paper">
    <div className="flex flex-col items-center gap-4">
      <div
        className="w-10 h-10 rounded-full animate-spin"
        style={{
          border: `2px solid ${PERIWINKLE}33`,
          borderTopColor: PERIWINKLE,
          boxShadow: `0 0 18px ${PERIWINKLE}40`,
        }}
      />
      <span
        className="font-black tracking-[0.3em] font-mono text-sm select-none"
        style={{ color: INK, opacity: 0.7 }}
      >
        NOVAIQ
      </span>
    </div>
  </div>
);
