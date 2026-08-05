import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  ExternalLink,
  Wifi,
  BatteryFull,
  SignalHigh,
  Plus,
} from 'lucide-react';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

interface DeviceSpec {
  /** Arabic name shown under the frame */
  label: string;
  /** The viewport the site actually gets inside the frame, in CSS pixels */
  vw: number;
  vh: number;
  /** Height of the chrome strip drawn above the viewport (browser bar / status bar) */
  chromeH: number;
  bezel: number;
  radiusOuter: number;
  radiusScreen: number;
  /** Extra body below the screen — the branded chin on a monitor */
  chin: number;
  /** Monitor stand (neck + base) drawn under the body */
  stand: number;
}

// The numbers below are real, commonly-targeted breakpoints, not decorative ones: the
// iframe is genuinely laid out at this width, so a customer looking at the phone frame is
// seeing the exact layout a 390px phone renders — not a desktop layout shrunk to fit.
export const DEVICE_SPECS: Record<PreviewDevice, DeviceSpec> = {
  desktop: { label: 'شاشة كمبيوتر', vw: 1280, vh: 760, chromeH: 42, bezel: 14, radiusOuter: 18, radiusScreen: 6, chin: 46, stand: 56 },
  tablet: { label: 'جهاز لوحي', vw: 834, vh: 1076, chromeH: 34, bezel: 18, radiusOuter: 34, radiusScreen: 18, chin: 0, stand: 0 },
  mobile: { label: 'هاتف ذكي', vw: 390, vh: 800, chromeH: 44, bezel: 13, radiusOuter: 54, radiusScreen: 42, chin: 0, stand: 0 },
};

interface DevicePreviewFrameProps {
  device: PreviewDevice;
  /** Must be referentially stable — changing it reloads the live site inside the frame. */
  src: string;
  addressUrl: string;
  title: string;
  /** Pushed into the frame over postMessage so a colour change never reloads the demo. */
  themeColor: string;
  onOpenNewTab: () => void;
}

const useClock = () => {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
  useEffect(() => {
    const id = window.setInterval(
      () => setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })),
      20000
    );
    return () => window.clearInterval(id);
  }, []);
  return time;
};

export const DevicePreviewFrame: React.FC<DevicePreviewFrameProps> = ({
  device,
  src,
  addressUrl,
  title,
  themeColor,
  onOpenNewTab,
}) => {
  const spec = DEVICE_SPECS[device];
  const screenW = spec.vw;
  const screenH = spec.chromeH + spec.vh;
  const bodyW = screenW + spec.bezel * 2;
  const bodyH = screenH + spec.bezel * 2 + spec.chin;
  const frameW = bodyW;
  const frameH = bodyH + spec.stand;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const clock = useClock();

  // The frame is a fixed pixel object; the panel around it is not. Measuring the stage and
  // scaling the whole assembly is what lets the same 1280px monitor mock-up sit correctly on
  // a 4K desktop and on a phone, instead of overflowing or being cropped.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const compute = () => {
      const availW = el.clientWidth - 8;
      const availH = el.clientHeight - 8;
      if (availW <= 0 || availH <= 0) return;
      const next = Math.min(availW / frameW, availH / frameH, 1);
      setScale(Math.max(0.28, Math.round(next * 1000) / 1000));
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [frameW, frameH]);

  // Colour changes are messaged into the live frame rather than re-pointing its src, so the
  // customer never loses their place (a filled cart, a half-finished booking) to a reload.
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'novaiq:theme', color: themeColor },
      window.location.origin
    );
  }, [themeColor, device]);

  const reload = () => {
    const frame = iframeRef.current;
    if (!frame) return;
    setIsLoading(true);
    frame.src = frame.src;
  };

  const isDesktop = device === 'desktop';

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col items-center gap-2 sm:gap-3">
      <div ref={stageRef} className="flex-1 min-h-0 w-full overflow-auto flex items-center justify-center">
        <div className="relative shrink-0" style={{ width: frameW * scale, height: frameH * scale }}>
          <div
            className="absolute top-0 left-0"
            style={{ width: frameW, height: frameH, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            {/* Device body */}
            <div
              className="device-body relative"
              style={{
                width: bodyW,
                height: bodyH,
                borderRadius: spec.radiusOuter,
                padding: spec.bezel,
              }}
            >
              {/* Screen */}
              <div
                className="relative overflow-hidden bg-[#05070c]"
                style={{ width: screenW, height: screenH, borderRadius: spec.radiusScreen }}
              >
                {/* Chrome strip — a browser toolbar on the monitor, an OS status bar on
                    handhelds. Kept as a sibling above the iframe so switching devices
                    restyles the frame without ever unmounting the running site. */}
                <div
                  className="relative z-20 flex items-center bg-[#0b0d12] border-b border-white/10 select-none"
                  style={{ height: spec.chromeH }}
                >
                  {isDesktop ? (
                    <div dir="ltr" className="flex items-center gap-3 w-full px-3">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                      </div>
                      <div className="flex items-center gap-1 shrink-0 text-zinc-500">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <ArrowRight className="w-3.5 h-3.5" />
                        <button
                          type="button"
                          onClick={reload}
                          title="إعادة تحميل الموقع"
                          className="p-1 rounded-md hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex-1 flex items-center gap-2 h-7 px-3 rounded-lg bg-[#161a23] border border-white/10 text-[11px] text-zinc-300 font-mono min-w-0">
                        <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{addressUrl}</span>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenNewTab}
                        title="فتح الموقع في تبويب مستقل"
                        className="shrink-0 p-1.5 rounded-md text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <Plus className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    </div>
                  ) : (
                    <div dir="ltr" className="flex items-center justify-between w-full px-6 text-white">
                      <span className="text-[13px] font-semibold tracking-wide">{clock}</span>
                      <div className="flex items-center gap-1.5">
                        <SignalHigh className="w-4 h-4" />
                        <Wifi className="w-4 h-4" />
                        <BatteryFull className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                </div>

                {/* The live site. A real browsing context, so the template's own media
                    queries resolve against THIS width — the whole reason the preview can be
                    trusted as a device simulation instead of a scaled screenshot. */}
                <iframe
                  ref={iframeRef}
                  src={src}
                  title={title}
                  onLoad={() => setIsLoading(false)}
                  style={{ width: spec.vw, height: spec.vh, border: 0, display: 'block' }}
                />

                {isLoading && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#05070c] text-zinc-500">
                    <span className="w-7 h-7 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
                    <span className="text-[11px] font-mono">جارٍ تحميل الموقع…</span>
                  </div>
                )}

                {/* Handheld hardware details drawn over the screen */}
                {device === 'mobile' && (
                  <>
                    <span className="absolute top-[9px] left-1/2 -translate-x-1/2 z-30 w-[112px] h-[30px] rounded-full bg-black pointer-events-none" />
                    <span className="absolute bottom-[8px] left-1/2 -translate-x-1/2 z-30 w-[134px] h-[5px] rounded-full bg-white/70 pointer-events-none" />
                  </>
                )}
                {device === 'tablet' && (
                  <span className="absolute top-[12px] left-1/2 -translate-x-1/2 z-30 w-[7px] h-[7px] rounded-full bg-black/70 ring-1 ring-white/10 pointer-events-none" />
                )}

                <span className="device-screen-glare absolute inset-0 z-40 pointer-events-none" />
              </div>

              {/* Monitor chin */}
              {spec.chin > 0 && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center" style={{ height: spec.chin }}>
                  <span className="text-[11px] font-black tracking-[0.35em] text-white/25 font-mono">NOVAIQ</span>
                </div>
              )}

              {/* Phone side hardware */}
              {device === 'mobile' && (
                <>
                  <span className="device-side-button absolute left-[-2px] top-[128px] w-[3px] h-[54px] rounded-s-md" />
                  <span className="device-side-button absolute left-[-2px] top-[196px] w-[3px] h-[54px] rounded-s-md" />
                  <span className="device-side-button absolute right-[-2px] top-[160px] w-[3px] h-[84px] rounded-e-md" />
                </>
              )}
            </div>

            {/* Monitor stand */}
            {spec.stand > 0 && (
              <div className="relative flex flex-col items-center" style={{ height: spec.stand }}>
                <span className="device-stand-neck w-[128px]" style={{ height: spec.stand - 14 }} />
                <span className="device-stand-base w-[300px] h-[14px] rounded-b-xl rounded-t-sm" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Readout — states plainly that this is a true viewport at a known zoom, which is
          what makes the simulation credible to a client evaluating the design. */}
      <div className="shrink-0 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
        <span className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-sans font-bold">
          {spec.label}
        </span>
        <span dir="ltr">{spec.vw} × {spec.vh}</span>
        <span className="text-zinc-700">|</span>
        <span dir="ltr">{Math.round(scale * 100)}%</span>
      </div>
    </div>
  );
};
