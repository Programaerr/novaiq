import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Language } from '../lib/i18n';
import { LiquidWave } from './LiquidWave';

export interface WaveStat {
  /** What is shown big — "80%", "3-4". Not always a percentage, which is why `fill` is separate. */
  value: string;
  label: string;
  /** How high the water stands, 0-100. */
  fill: number;
  /** The unit line under the label, matching the reference's "0,6 liter". */
  note: string;
}

interface StatWaveCardProps {
  language: Language;
  stats: WaveStat[];
}

/**
 * How long each figure holds before the card moves to the next one.
 *
 * 5s, and it is not an arbitrary number any more — it is close enough to the liquid's own physics
 * that the two have to be checked against each other. The level spring settles in about 1.2s and
 * the slosh has rung itself out by about 2.7s, so a 5s dwell still leaves better than two seconds
 * of still water to read the figure against. Take this much below 4s and the next change starts
 * while the last one is still moving, and the card stops reading as a glass being filled and
 * starts reading as one that is never allowed to settle.
 */
const DWELL_MS = 5000;

/**
 * The tall card at the head of the panel: one figure at a time, shown as a water level.
 *
 * ## Why a wave and not the three bars this replaces
 *
 * The three figures used to sit side by side as thin vertical bars. Three bars at once means
 * three things to compare, and they are not comparable — 80% readiness, 3-4 weeks and 100%
 * ownership share an axis only by accident of being drawn the same way. Showing ONE at a time
 * removes a comparison that was never meaningful and gives each figure the whole card.
 *
 * ## The water is LiquidWave, and this card only tells it the level
 *
 * Everything about the liquid itself — the spring the level arrives on, the slosh it sets off, the
 * chop, the bubbles — lives in LiquidWave.tsx, which draws it in WebGL. The only thing that crosses
 * the boundary is a number between 0 and 100. That split is the point: this file owns which figure
 * is showing and how you change it, and knows nothing about how water is drawn.
 */
export const StatWaveCard: React.FC<StatWaveCardProps> = ({ language, stats }) => {
  const isAr = language === 'ar';
  const [index, setIndex] = useState(0);
  // Bumped on every manual change. The auto-advance effect depends on it, so touching a control
  // restarts the dwell instead of letting a timer that was already half-spent fire immediately
  // after — which reads as the card ignoring the press.
  const [nudge, setNudge] = useState(0);
  const hovering = useRef(false);

  useEffect(() => {
    if (stats.length < 2) return;
    const id = window.setInterval(() => {
      // Held while the pointer is on the card. Someone reading one figure should not have it
      // swapped out from under them, and this is the cheapest possible way to say so — no state,
      // no re-render, just a flag the tick consults.
      if (hovering.current) return;
      setIndex((i) => (i + 1) % stats.length);
    }, DWELL_MS);
    return () => window.clearInterval(id);
  }, [stats.length, nudge]);

  const select = useCallback((i: number) => {
    setIndex(i);
    setNudge((n) => n + 1);
  }, []);

  const step = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + stats.length) % stats.length);
      setNudge((n) => n + 1);
    },
    [stats.length],
  );

  const stat = stats[index];

  return (
    <div
      className="wave-card nq-card nq-card--hover relative overflow-hidden flex flex-col p-5 sm:p-6 min-h-[19rem] lg:h-full"
      onMouseEnter={() => (hovering.current = true)}
      onMouseLeave={() => (hovering.current = false)}
      // Arrow keys move between figures for anyone not using a pointer. The dots below are real
      // buttons and already reachable; this makes the card itself behave the way a stepper should
      // once focus is inside it.
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') step(isAr ? -1 : 1);
        if (e.key === 'ArrowLeft') step(isAr ? 1 : -1);
      }}
    >
      {/* ── The water ────────────────────────────────────────────────────────────────────────
          Behind the copy, clipped by the card's own rounding (this element is `overflow-hidden`).
          The level is passed as a plain number and the liquid springs to it — the card does not
          animate anything itself.

          `aria-hidden` sits inside LiquidWave: the figure is written out in text below, so the
          water is a second rendering of it rather than information of its own, and announcing it
          would read the same number to a screen reader twice. */}
      <LiquidWave fill={stat.fill} />

      {/* ── The legibility scrim ─────────────────────────────────────────────────────────────
          Between the water and the heading, and it is not decoration. Measured: at the 100%
          figure the crest peaks 44px down the card while the grey note line ends at 63px, so the
          copy is genuinely UNDER the brightest part of the liquid — and the band just below the
          surface is bright enough that even pure white lands at 4.3:1 on it, under the 4.5:1 floor
          the 16px bold label needs. The note at zinc-400 was at 1.7:1.

          Capping the level instead was the obvious alternative and it does not work: this copy is
          a fixed number of pixels tall while the level is a fraction of the card, so on the 19rem
          phone card the heading occupies the top fifth and any high reading would collide with it
          anyway. Darkening the water itself would draw a band across the liquid. A scrim is what
          subtitles do, for this exact reason, and on the card's near-black surface it is invisible
          wherever there is no water behind it. */}
      <div className="wave-scrim" aria-hidden="true" />

      {/* ── The copy ─────────────────────────────────────────────────────────────────────────
          `aria-live="polite"` so a screen reader is told when the figure changes on its own. A
          panel that silently swaps its own content is the case this attribute exists for. */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm sm:text-base font-bold text-white leading-tight">{stat.label}</div>
          {/* zinc-300 where the rest of the panel's secondary copy is zinc-400. A deliberate local
              exception: this is the one card in the bento with a bright animated background behind
              its heading, and at 400 the note measured 2.9:1 over the liquid's surface band. The
              scrim above carries the other half of the fix. */}
          <div className="text-[11px] text-zinc-300 mt-0.5">{stat.note}</div>
        </div>
        {/* zinc-300, not the 500 this started at. At 10px it needs 4.5:1 and 500 gave 3.6:1 even
            on the bare card — it was already under the floor before the water arrived, and the
            water is what made it worth measuring. It sits at the top-right, so it is under the
            same liquid the note is and takes the same answer. */}
        <div className="text-[10px] text-zinc-300 tabular-nums shrink-0 pt-0.5" dir="ltr">
          {index + 1}/{stats.length}
        </div>
      </div>

      <div className="relative z-10 mt-auto flex items-end justify-between gap-3" aria-live="polite">
        {/* `dir="ltr"` because a figure is not prose: under the page's RTL direction the bidi
            algorithm decides where a sign or separator lands from surrounding context rather than
            from what was written, so "3-4" and "80%" can come out reversed. `tabular-nums` keeps
            the digits on one advance so the figure does not jitter as the card cycles. */}
        <div
          dir="ltr"
          className="text-4xl sm:text-5xl font-black text-white tabular-nums leading-none tracking-tight"
        >
          {stat.value}
        </div>

        {/* The dots. Real buttons rather than a row of divs with a click handler, so they are
            focusable, announced, and operable from the keyboard for free. */}
        <div className="flex items-center gap-1.5 pb-1.5">
          {stats.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => select(i)}
              aria-label={isAr ? `عرض ${s.label}` : `Show ${s.label}`}
              aria-current={i === index ? 'true' : undefined}
              // 24px of hit area around a 6px dot: the dot is the thing you see, the padding is
              // the thing you press. A 6px target is unusable on a phone and this costs nothing.
              className="wave-dot group relative w-6 h-6 flex items-center justify-center cursor-pointer"
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  i === index ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/35 group-hover:bg-white/60'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
