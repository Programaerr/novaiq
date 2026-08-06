import React, { useRef } from 'react';
import { ArrowRight, Home } from 'lucide-react';
import { Language } from '../lib/i18n';
import { useFloatingBarBottom } from '../lib/useFloatingBarBottom';

interface PageBackBarProps {
  language: Language;
  title: string;
  onBack: () => void;
  onHome: () => void;
}

// A floating glass strip pinned directly under the main Navbar on every inner page
// (anything other than 'home') — without it, the only way back was the Navbar's
// hamburger menu, which isn't obvious as a "back" affordance. `fixed` (not static-in-flow)
// so it stays reachable while scrolling, exactly like the Navbar itself, and shares its
// same glass tone (bg-black/55 + backdrop-blur-md) plus the identical `left-0 right-0` +
// `max-w-7xl mx-auto px-3 sm:px-6` shell so the two pills line up edge-to-edge.
export const PageBackBar: React.FC<PageBackBarProps> = ({ language, title, onBack, onHome }) => {
  const isAr = language === 'ar';
  // The untransformed wrapper, not the pill inside it — the pill carries the `page-in`
  // entrance animation, and measuring mid-animation would bake its 15px slide into the value.
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useFloatingBarBottom(wrapperRef, '--backbar-bottom');

  return (
    // Sits exactly --stack-gap below wherever the Navbar actually ends, rather than at three
    // hand-tuned breakpoint offsets that had to be re-guessed every time the Navbar's own
    // padding changed (they fell out of sync twice, leaving this bar under the Navbar on
    // mobile). The fallback only matters for the very first paint before the measurement runs.
    <div
      ref={wrapperRef}
      style={{ top: 'calc(var(--nav-bottom, 74px) + var(--stack-gap))' }}
      className="fixed left-0 right-0 z-40 w-full max-w-7xl mx-auto px-3 sm:px-6 pointer-events-none"
    >
      {/* Shadowless for the same reason as the Navbar above it — see the note there. */}
      <div className="page-in pointer-events-auto flex items-center gap-2 bg-black/55 backdrop-blur-md border border-white/15 rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="nq-btn nq-btn--solid flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
        >
          <span className="nq-btn-beam" aria-hidden="true" />
          <ArrowRight className="w-3.5 h-3.5 ltr:rotate-180" />
          <span>{isAr ? 'رجوع' : 'Back'}</span>
        </button>

        <span className="w-px h-4 bg-white/10" />

        <button
          type="button"
          onClick={onHome}
          className="nq-btn nq-btn--solid flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
        >
          <span className="nq-btn-beam" aria-hidden="true" />
          <Home className="w-3.5 h-3.5" />
          <span>{isAr ? 'الرئيسية' : 'Home'}</span>
        </button>

        <span className="w-px h-4 bg-white/10 hidden sm:block" />

        {/* zinc-500 sat at 4.35:1 against this bar's fill — under the 4.5:1 floor, which is why
            it read as greyed-out rather than as a label. zinc-300 measures 14.2:1. */}
        <span className="hidden sm:block text-xs font-semibold text-zinc-300 truncate">{title}</span>
      </div>
    </div>
  );
};
