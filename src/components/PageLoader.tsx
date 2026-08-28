import React from 'react';
import { COBALT, MIDNIGHT, PAPER } from '../lib/homePalette';

/**
 * The one loader the whole app uses.
 *
 * Full-screen and opaque: while real work is happening (a lazy chunk downloading, auth still
 * resolving) there is exactly one thing on screen — a paper field, a cobalt ring, the name.
 * Nothing else is mounted that could peek through and read as a half-loaded page.
 */
export const PageLoader: React.FC = () => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: PAPER }}>
    <div className="flex flex-col items-center gap-5">
      <div
        className="w-12 h-12 rounded-full animate-spin"
        style={{
          border: `2px solid ${COBALT}33`,
          borderTopColor: COBALT,
          boxShadow: `0 0 24px ${COBALT}55`,
        }}
      />
      <span
        className="font-black tracking-[0.3em] font-mono text-base select-none"
        style={{ color: MIDNIGHT, opacity: 0.75 }}
      >
        NOVAIQ
      </span>
    </div>
  </div>
);