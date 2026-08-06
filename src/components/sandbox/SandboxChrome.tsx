import React, { useState, useEffect, useRef } from 'react';

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
