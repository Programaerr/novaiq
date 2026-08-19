import React, { useEffect, useRef, useState } from 'react';

/**
 * A drawn phone, with the app running inside it at its real size.
 *
 * The screen is always exactly 390 x 844 CSS pixels — an iPhone's own viewport — and the whole
 * device is *scaled* to fit whatever box it is given rather than being laid out responsively.
 * That is the point: an app is not a website that got narrow. Everything inside is written
 * against one known width, with no breakpoints at all, which is how app code is actually
 * written and why the result feels like an app instead of a squeezed page.
 *
 * Unlike the website preview next door, this needs no iframe. The app has no media queries to
 * resolve against a browsing context — its width is a constant, so a plain div is genuinely the
 * same 390px the device is.
 */

export const PHONE_W = 390;
export const PHONE_H = 844;

const BEZEL = 11;
const RADIUS = 46;

export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  /** Never scale above this. 1 keeps the device pixel-exact; the app section on a wide desktop
   *  looks better letting it sit a touch smaller than life-size than filling half the screen. */
  maxScale?: number;
  className?: string;
  /** Painted behind the screen while the app's own background is still transparent. */
  screenBg?: string;
}> = ({ children, maxScale = 1, className, screenBg = '#0b0f17' }) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      setScale(Math.min(w / (PHONE_W + BEZEL * 2), h / (PHONE_H + BEZEL * 2), maxScale));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxScale]);

  return (
    <div ref={boxRef} className={`relative flex items-center justify-center ${className ?? ''}`}>
      {scale > 0 && (
        <div
          // Sized from the scale so the surrounding layout reserves the space the device really
          // takes — a transform alone would leave a full-size hole in the flow and overlap
          // whatever sits beside it.
          style={{
            width: (PHONE_W + BEZEL * 2) * scale,
            height: (PHONE_H + BEZEL * 2) * scale,
          }}
          className="relative shrink-0"
        >
          <div
            style={{
              width: PHONE_W + BEZEL * 2,
              height: PHONE_H + BEZEL * 2,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              borderRadius: RADIUS,
              padding: BEZEL,
              background: 'linear-gradient(160deg, #3b3f4a 0%, #14171d 38%, #0a0c11 70%, #2a2e37 100%)',
              boxShadow: '0 40px 80px -40px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.07) inset',
            }}
            // `left-0`, never `rtl:right-0`. `transform-origin: top left` shrinks the box toward
            // its physical left edge, so the left edge is the only one that stays put — anchoring
            // the RIGHT edge in RTL pinned the box's *unscaled* right edge to the container and
            // left the drawn phone floating (1 - scale) x 412px to the left of the space reserved
            // for it. The visible symptom was the phone sitting off-centre with its two side
            // buttons stranded fifty pixels away from its own edges, in mid-air.
            className="absolute top-0 left-0"
          >
            <div
              style={{
                width: PHONE_W,
                height: PHONE_H,
                borderRadius: RADIUS - BEZEL,
                background: screenBg,
              }}
              className="relative overflow-hidden"
            >
              {children}
            </div>

            {/* The island. Drawn on top of the app rather than reserved out of it, exactly like
                the real one — the app's own header pads itself clear of it. */}
            <div
              style={{ top: BEZEL + 9 }}
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 h-[26px] w-[104px] rounded-full bg-black"
            />
          </div>

          {/* Side hardware. Two buttons and a switch, drawn because a slab with rounded corners
              reads as a card and a phone is recognised by its edges. */}
          <span
            style={{ top: 128 * scale, height: 30 * scale, width: 3 * scale }}
            className="absolute -left-px rounded-s bg-[#2c3038]"
          />
          <span
            style={{ top: 172 * scale, height: 54 * scale, width: 3 * scale }}
            className="absolute -left-px rounded-s bg-[#2c3038]"
          />
          <span
            style={{ top: 240 * scale, height: 54 * scale, width: 3 * scale }}
            className="absolute -left-px rounded-s bg-[#2c3038]"
          />
          <span
            style={{ top: 190 * scale, height: 76 * scale, width: 3 * scale }}
            className="absolute -right-px rounded-e bg-[#2c3038]"
          />
        </div>
      )}
    </div>
  );
};
