import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { OBSIDIAN, ORANGE_ON_LIGHT } from '../../lib/homePalette';

// Chrome that wraps a template demo rather than being part of any one demo: the fixed-width
// responsive preview frame and the shared menu glyph. Split out of
// TemplateInteractiveSandbox.tsx — neither touches the sandbox's own state.
// Widths the preview can be pinned to. These are real, commonly-targeted breakpoints — the
// site is genuinely laid out at the chosen one, so what the customer sees is what that class
// of screen actually gets.
export type ViewportChoice = 'full' | 'desktop' | 'tablet' | 'mobile';

// Width is the viewport the template is genuinely laid out at. Height is a *ceiling*, not a
// fixed size — the real height of that class of device, used only to stop the frame growing
// past it. See `frameHeight` below for what that ceiling does and why it matters.
export const VIEWPORT_PRESETS: Record<
  Exclude<ViewportChoice, 'full'>,
  { label: string; width: number; maxHeight: number }
> = {
  desktop: { label: 'كمبيوتر', width: 1280, maxHeight: 800 },
  tablet: { label: 'تابلت', width: 834, maxHeight: 1112 },
  mobile: { label: 'جوال', width: 390, maxHeight: 844 },
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
  maxHeight: number;
  src: string;
  title: string;
  themeColor: string;
}> = ({ width, maxHeight, src, title, themeColor }) => {
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
      { type: 'nuvaiq:theme', color: themeColor },
      window.location.origin
    );
  }, [themeColor, width]);

  // Scale is set by the WIDTH alone, and only ever downwards — so a phone preview on a desktop
  // stays pixel-exact. Height is not part of the fit: scaling to fit both axes was tried and
  // letterboxed the desktop view on a desktop into a short wide sliver, because it shrank the
  // frame to fit 800px of height that the panel had plenty of room for. The height question is
  // answered separately, by the ceiling below, which only ever binds when it needs to.
  const scale = stage.w > 0 ? Math.min(stage.w / width, 1) : 1;

  // The frame fills the stage, but never grows past the real height of the device it is
  // imitating. One `min` settles both cases that used to need different treatment:
  //
  //  · On a wide screen the scale is near 1, so `stage.h / scale` is roughly the stage's own
  //    height and lands well under the ceiling. The frame fills the panel and scrolls for the
  //    rest, exactly as before — a website preview, not a device photo.
  //  · On a phone showing the desktop preset the scale is ~0.27, so `stage.h / scale` asks for
  //    something near 1300px tall. The ceiling cuts that to 800, and 1280x800 is both a real
  //    desktop viewport and barely half the pixels. That is what makes it render at all: the
  //    uncapped frame was ~2 million pixels to lay out and rasterize for a thumbnail a few
  //    hundred pixels wide, and mobile browsers cap frame size and simply dropped it, which is
  //    why every preset came up blank on a phone.
  //
  // It also produces exactly the shape the preview should have: capped, the box takes the
  // device's own proportions, so picking "كمبيوتر" on a phone gives a wide landscape rectangle
  // that reads as a computer screen instead of a phone-shaped column.
  const frameHeight = stage.h > 0 ? Math.min(stage.h / scale, maxHeight) : 0;

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col items-center gap-2">
      {/* items-center, and a floor under the stage. Centred so a frame shorter than the panel
          (the capped case above) sits in the middle rather than clinging to the top, and
          min-h-0 alone is not enough of a guarantee on a phone, where the surrounding chrome
          stacks taller and can squeeze a flex child to nothing. */}
      <div ref={stageRef} className="flex-1 min-h-50 w-full flex items-center justify-center">
        {stage.h > 0 && (
          <div
            className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black"
            // Derived from the frame, never from the stage: the box is exactly as tall as the
            // scaled frame inside it, so nothing can extend past the panel and disappear under
            // the action bar below it.
            style={{ width: width * scale, height: frameHeight * scale }}
          >
            <iframe
              ref={iframeRef}
              src={frameSrc}
              title={title}
              onLoad={() => {
                setIsLoading(false);
                iframeRef.current?.contentWindow?.postMessage(
                  { type: 'nuvaiq:theme', color: themeColor },
                  window.location.origin
                );
              }}
              style={{
                // Pinned to the box's physical top-left, which is the same corner
                // `transform-origin: top left` scales from. As a normal in-flow block it was
                // not: the frame is deliberately wider than the box that holds it (390px of
                // site inside a 343px box, then scaled down to fit), and an overflowing block
                // in an RTL context is laid out from the *right* edge, so its left edge sat at
                // a negative offset — 343 - 390 = -47px. Scaling from a corner that is already
                // 47px off-screen drags the whole preview left with it, which clipped the
                // start of every row and left a gap down the other side. Taking it out of flow
                // makes the origin the box's corner in every writing direction, so what is
                // rendered is exactly the frame, aligned to the frame.
                position: 'absolute',
                top: 0,
                left: 0,
                width,
                height: frameHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                border: 0,
                display: 'block',
              }}
            />
            {isLoading && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ background: 'rgba(247, 247, 245, 0.92)' }}
              >
                <span
                  className="w-7 h-7 rounded-full animate-spin"
                  style={{ border: `2px solid ${ORANGE_ON_LIGHT}33`, borderTopColor: ORANGE_ON_LIGHT }}
                />
                <span className="text-[11px] font-mono" style={{ color: OBSIDIAN, opacity: 0.6 }}>
                  جارٍ تحميل الموقع…
                </span>
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

/** Three bars of deliberately uneven length — the same treatment as the NUVAIQ navbar's own
 *  menu control, so the demos share the studio's visual language. */
export const SiteMenuIcon: React.FC = () => (
  <span className="flex flex-col items-start gap-[3.5px] w-5 shrink-0" aria-hidden="true">
    <span className="site-menu-bar block h-[2px] w-full rounded-full bg-current" />
    <span className="site-menu-bar block h-[2px] w-[68%] rounded-full bg-current" />
    <span className="site-menu-bar block h-[2px] w-[44%] rounded-full bg-current" />
  </span>
);

/**
 * Frosted-glass fill for a sticky bar, without a live `backdrop-filter`. That property blurs
 * whatever is visually behind the element — for a `sticky` bar sitting over scrolling demo
 * content, "whatever is behind it" changes every single frame of every scroll gesture, so the
 * browser was re-blurring fresh input 60 times a second for as long as a visitor scrolled.
 *
 * This blurs a small static gradient instead. Same soft, translucent look — a heavy blur
 * radius destroys nearly all detail of whatever sits behind it anyway, live or not — but the
 * input here never changes, so the blur runs once on first paint and the result is then just
 * composited like any other layer, sticky or scrolling or not.
 *
 * `-inset-6` oversizes the source past the bar's own edge so the blur has room to fall off
 * naturally instead of being hard-cropped at the box boundary; the parent's own
 * `overflow-hidden` (needed anyway, for its rounded corners) crops that bleed at the pill
 * shape. `-z-10` keeps it behind the bar's real content regardless of DOM/paint-order edge
 * cases, rather than relying on source order alone.
 */
export const FrostedFill: React.FC = () => (
  <div
    aria-hidden="true"
    className="absolute -inset-6 -z-10"
    style={{
      filter: 'blur(24px)',
      background:
        'radial-gradient(circle at 18% 15%, rgba(255,255,255,0.18), transparent 55%), radial-gradient(circle at 85% 75%, rgba(255,255,255,0.1), transparent 60%), rgba(12,12,16,0.88)',
    }}
  />
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
  /** NUVAIQ's own catalogue name for this template — a preview-only label, not part of the
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
      <div className="relative bg-white/5 border border-white/10 shadow-xl shadow-black/20 rounded-2xl overflow-hidden">
        <FrostedFill />
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

      {topLabel && (
        <div className="text-center text-xs sm:text-sm font-bold text-white mt-2">
          {topLabel}
        </div>
      )}
    </div>
  );
};
