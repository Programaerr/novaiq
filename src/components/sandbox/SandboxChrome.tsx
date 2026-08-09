import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

// Chrome that wraps a template demo rather than being part of any one demo: the fixed-width
// responsive preview frame and the shared menu glyph. Split out of
// TemplateInteractiveSandbox.tsx — neither touches the sandbox's own state.
// Widths the preview can be pinned to. These are real, commonly-targeted breakpoints — the
// site is genuinely laid out at the chosen one, so what the customer sees is what that class
// of screen actually gets.
export type ViewportChoice = 'full' | 'desktop' | 'tablet' | 'mobile';

export const VIEWPORT_PRESETS: Record<Exclude<ViewportChoice, 'full'>, { label: string; width: number }> = {
  desktop: { label: 'كمبيوتر', width: 1280 },
  tablet: { label: 'تابلت', width: 834 },
  mobile: { label: 'جوال', width: 390 },
};

/**
 * The template rendered at a fixed viewport width — no device mock-up around it, just the
 * site reflowing at that width.
 *
 * It has to be an iframe rather than a narrow `div`: CSS media queries resolve against the
 * browsing context, so a `div` capped at 390px on a desktop would still serve the desktop
 * layout, squeezed. An iframe genuinely is 390px wide, so the template's own breakpoints do
 * the work and the preview can be trusted.
 */
export const ResponsivePreview: React.FC<{
  width: number;
  src: string;
  title: string;
  themeColor: string;
}> = ({ width, src, title, themeColor }) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [stage, setStage] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [isLoading, setIsLoading] = useState(true);
  // Frozen at mount: re-pointing a live iframe reloads it, and the palette is kept in sync
  // over postMessage instead so the demo never loses the customer's place.
  const [frameSrc] = useState(src);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'novaiq:theme', color: themeColor },
      window.location.origin
    );
  }, [themeColor, width]);

  // Only ever scales down, and only when the chosen width genuinely doesn't fit the panel —
  // so a phone preview on a desktop stays pixel-exact.
  const scale = stage.w > 0 ? Math.min(stage.w / width, 1) : 1;
  const frameHeight = stage.h > 0 ? stage.h / scale : 0;

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col items-center gap-2">
      <div ref={stageRef} className="flex-1 min-h-0 w-full flex items-start justify-center">
        {stage.h > 0 && (
          <div
            className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-[#05070c]"
            style={{ width: width * scale, height: stage.h }}
          >
            <iframe
              ref={iframeRef}
              src={frameSrc}
              title={title}
              onLoad={() => {
                setIsLoading(false);
                iframeRef.current?.contentWindow?.postMessage(
                  { type: 'novaiq:theme', color: themeColor },
                  window.location.origin
                );
              }}
              style={{
                width,
                height: frameHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                border: 0,
                display: 'block',
              }}
            />
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#05070c] text-zinc-500">
                <span className="w-7 h-7 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
                <span className="text-[11px] font-mono">جارٍ تحميل الموقع…</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
        <span dir="ltr">عرض {width}px</span>
        {scale < 1 && (
          <>
            <span className="text-zinc-700">|</span>
            <span dir="ltr">{Math.round(scale * 100)}%</span>
          </>
        )}
      </div>
    </div>
  );
};

/** Three bars of deliberately uneven length — the same treatment as the NOVAIQ navbar's own
 *  menu control, so the demos share the studio's visual language. */
export const SiteMenuIcon: React.FC = () => (
  <span className="flex flex-col items-start gap-[3.5px] w-5 shrink-0" aria-hidden="true">
    <span className="site-menu-bar block h-[2px] w-full rounded-full bg-current" />
    <span className="site-menu-bar block h-[2px] w-[68%] rounded-full bg-current" />
    <span className="site-menu-bar block h-[2px] w-[44%] rounded-full bg-current" />
  </span>
);

/**
 * The header every demo site wears — menu and search on one side, the logo lockup centred on
 * the row, and whatever action that template's own business needs on the other (a cart for the
 * store, "my appointments" for the clinic, and so on).
 *
 * It was the store's header alone until now; the other nine each hand-rolled a plain
 * logo-and-menu strip, so the demos read as nine different products rather than one studio's
 * work. Everything template-specific arrives as a prop, which is what lets one bar serve all
 * ten without any of them looking generic.
 */
export const SiteTopBar: React.FC<{
  logoMark: React.ReactNode;
  logoName: string;
  /** Tailwind classes for the logo tile — the caller owns theming, this owns layout. */
  logoMarkClass: string;
  /** For wordmarks that are latin//path-like ("~/Logo") — RTL would otherwise reorder them
   *  into "Logo/~", since the surrounding document runs right-to-left. */
  logoNameLtr?: boolean;
  /** NOVAIQ's own catalogue name for this template — a preview-only label, not part of the
   *  fictional site's own branding, so it gets a thin strip of its own inside the same
   *  rounded/bordered shell rather than sharing the logo row with the demo's own identity. */
  topLabel?: React.ReactNode;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  menuButton: React.ReactNode;
  actionSlot?: React.ReactNode;
  isNarrow: boolean;
}> = ({
  logoMark,
  logoName,
  logoMarkClass,
  logoNameLtr,
  topLabel,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  menuButton,
  actionSlot,
  isNarrow,
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <div className="sticky top-1 sm:top-2 z-30 mb-6 select-none">
      {topLabel && (
        <div className="text-center text-xs sm:text-sm font-bold text-white mb-2">
          {topLabel}
        </div>
      )}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/20 rounded-2xl overflow-hidden">
        <div className={`relative flex items-center justify-between gap-2 p-3 px-3 ${isNarrow ? '' : 'sm:gap-4 sm:p-4 sm:px-6'}`}>
        {/* Right cluster: sections menu, then search. */}
        <div className="flex items-center gap-2 shrink-0">
          {menuButton}

          {/* Narrow screens get an icon trigger that expands over the whole row — a usable
              text field can't share a 390px row with a centred logo and an action button. */}
          {isNarrow ? (
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(true)}
              aria-label="بحث"
              className="flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/25 text-slate-300 cursor-pointer transition-colors shrink-0 p-2.5"
            >
              <Search className="w-4 h-4" />
            </button>
          ) : (
            <div className="relative w-36 lg:w-56 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-800 transition-all"
              />
            </div>
          )}

          {isNarrow && isMobileSearchOpen && (
            <div className="absolute inset-0 z-10 flex items-center gap-2 px-3 bg-zinc-950/95 backdrop-blur-sm rounded-2xl animate-fade-in">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                <input
                  autoFocus
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-800 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                aria-label="إغلاق البحث"
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white cursor-pointer transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Centred on the row's own midpoint, not between the two clusters — those are
            different widths, and justify-between only splits the leftover space, which drags
            the logo toward whichever side is narrower. */}
        <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-2 min-w-0 ${isNarrow ? '' : 'sm:gap-3'}`}>
          <span
            dir={logoNameLtr ? 'ltr' : undefined}
            className={`font-extrabold text-xs text-white tracking-wide whitespace-nowrap ${isNarrow ? '' : 'sm:text-base'}`}
          >
            {logoName}
          </span>
          <div className={`navbar-logo-mark relative w-8 h-8 rounded-xl ${logoMarkClass} flex items-center justify-center shrink-0 shadow-lg ring-1 ring-white/20 ${isNarrow ? '' : 'sm:w-11 sm:h-11 sm:rounded-2xl'}`}>
            {logoMark}
          </div>
        </div>

        {/* Left cluster: whatever this template's business actually does. */}
        <div className="flex items-center gap-2 shrink-0">{actionSlot}</div>
      </div>
      </div>
    </div>
  );
};
