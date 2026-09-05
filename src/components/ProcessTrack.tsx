import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Language } from '../lib/i18n';
import { useSeen } from '../lib/useSeen';
import { OBSIDIAN, ORANGE, PAPER_DEEP, WHITE } from '../lib/homePalette';
import { CHEVRON, bandSvgPath } from '../lib/bandPath';

/**
 * The process track: eight stages on one continuous path, start to end.
 *
 * ## The path is the section, and the stages sit inside it
 *
 * The brief for this one was explicit that the stages must not read as eight cards in a row, and
 * the difference is structural rather than decorative: there is exactly ONE band, drawn once as a
 * single SVG outline, and the stages are marks placed on it. Nothing here has its own border, its
 * own background or its own shadow. A card grid would say "eight things"; this says "one journey
 * with eight moments on it", which is what a process is.
 *
 * ## Measured, then drawn in real pixels
 *
 * The band is an SVG whose viewBox is the element's own pixel size, set from a ResizeObserver,
 * rather than a fixed viewBox stretched with `preserveAspectRatio="none"`. That attribute is the
 * obvious shortcut and it is wrong here: stretching a viewBox scales X and Y by different factors,
 * so the arrow head and the notch would flatten out on a wide screen and go sharp on a narrow one.
 * The chevrons are the one shape in this section that has to hold its angle, since they are what
 * says "direction". Measuring costs one observer and keeps every coordinate honest.
 *
 * ## Direction follows the language, not the viewport
 *
 * The concept sketch runs left to right. This site is Arabic-first and `dir` is `rtl`, where a
 * process that starts on the left starts at the END of the line as far as the reader is concerned.
 * So the flow is LOGICAL: the arrow head, the stage order, the reveal wipe and the travelling
 * indicator all run from the side the language starts on, which is the right in Arabic and the
 * left in English. `flowsRight` below is the single place that decides it; everything else asks it.
 *
 * ## What is animated, and what is not
 *
 * Three things move, all of them on `transform` or `opacity` only:
 *
 *   - the reveal, an SVG mask rect scaled along X from the flow start, gated on `data-seen` so it
 *     plays when the section is reached rather than when the page mounts;
 *   - the stages, staggered in on the project's existing `.nq-rise` + `--nq-rise-delay` pair, so
 *     this section inherits the same entrance curve as every other one instead of inventing a
 *     second one;
 *   - the indicator, a soft sweep clipped to the band, on an infinite linear cycle.
 *
 * The hover/focus state is a `transform: scale()` and a colour, both of which the compositor
 * handles. Nothing animates width, height, or a layout property, and nothing runs per frame in
 * JavaScript. `prefers-reduced-motion` stops all three -- see the `.nq-proc-*` rules in index.css.
 *
 * ## Keyboard and screen readers
 *
 * Each stage is a real `<button>`, so it is tabbable and takes focus rings for free, and focus
 * opens the same card hover does -- a detail that is easy to skip and turns the whole section into
 * decoration for anyone not using a mouse. Left/Right arrows move between stages, mapped to the
 * VISUAL order rather than the array order, because an arrow key means the direction it points.
 *
 * The horizontal and vertical layouts are two renderings of one array, each hidden at the other's
 * breakpoint with `display: none` -- which removes it from the accessibility tree, so a screen
 * reader reads the stages once, not twice.
 */

/* ── The eight stages ────────────────────────────────────────────────────────────────────────── */

interface Stage {
  key: string;
  ar: { title: string; body: string };
  en: { title: string; body: string };
}

/**
 * The copy stays descriptive and promises nothing measurable.
 *
 * This is a marketing description of how the work runs, and it sits on the same site as a contract
 * whose clauses set the actual commitments. So no duration, no count of revision rounds, and no
 * warranty period appears here: the phases section and the contract are where those numbers live,
 * and a second place saying them is a second place they can drift out of agreement.
 */
const STAGES: Stage[] = [
  {
    key: 'discovery',
    ar: { title: 'الاستكشاف', body: 'نفهم المشكلة والجمهور ونطاق العمل قبل أن يُكتب سطر واحد.' },
    en: { title: 'Discovery', body: 'We learn the problem, the audience and the scope before a line is written.' },
  },
  {
    key: 'strategy',
    ar: { title: 'الاستراتيجية', body: 'نحوّل ما فهمناه إلى خطة: ما يُبنى أولاً، وما يؤجَّل، ولماذا.' },
    en: { title: 'Strategy', body: 'What gets built first, what waits, and the reasoning behind the order.' },
  },
  {
    key: 'design',
    ar: { title: 'التصميم والواجهات', body: 'واجهات ومسارات استخدام تُراجَع معك قبل أن تبدأ البرمجة.' },
    en: { title: 'UX/UI Design', body: 'Interfaces and user journeys, reviewed with you before any code starts.' },
  },
  {
    key: 'development',
    ar: { title: 'البرمجة', body: 'بناء النظام وواجهاته ولوحة إدارته على أساس يحتمل التوسّع.' },
    en: { title: 'Development', body: 'The system, its interfaces and its admin panel, built to grow.' },
  },
  {
    key: 'testing',
    ar: { title: 'الاختبار', body: 'اختبارات أمان وسرعة وأجهزة قبل أن يرى المستخدم أي شيء.' },
    en: { title: 'Testing', body: 'Security, performance and device passes before anyone else sees it.' },
  },
  {
    key: 'optimization',
    ar: { title: 'التحسين', body: 'نقيس ما يحدث فعلاً بعد التسليم، ونحسّن ما يستحق التحسين.' },
    en: { title: 'Optimization', body: 'We measure what actually happens, then improve what is worth improving.' },
  },
  {
    key: 'launch',
    ar: { title: 'الإطلاق', body: 'النشر على نطاقك وخوادمك، وتسليم الصلاحيات كاملة.' },
    en: { title: 'Launch', body: 'Live on your own domain and servers, with full access handed over.' },
  },
  {
    key: 'support',
    ar: { title: 'الدعم', body: 'الدعم بعد الإطلاق، ونطاقه ومدّته يُحدَّدان في العقد.' },
    en: { title: 'Support', body: 'Post-launch support, with its scope and term set in the contract.' },
  },
];

/* ── Geometry ────────────────────────────────────────────────────────────────────────────────── */

/** Band height. The chevron's run belongs to the shape, so it lives with the shape. */
const BAND_H = 132;

/**
 * How much of the band's width the end shapes are allowed to take before a stage may stand there.
 *
 * Not just `CHEVRON`: a mark centred exactly on the point of the arrow would sit half outside the
 * outline. This is the chevron plus room for the mark itself.
 */
const END_PAD = CHEVRON + 46;

/** The floating card's width, and the margin it keeps from the band's ends. */
const CARD_W = 300;

/* ── The section ─────────────────────────────────────────────────────────────────────────────── */

export interface ProcessTrackProps {
  language?: Language;
}

export const ProcessTrack: React.FC<ProcessTrackProps> = ({ language = 'ar' }) => {
  const isAr = language !== 'en';
  const { ref: sectionRef, seen } = useSeen<HTMLElement>();

  /** The reading direction is the flow direction. See the note at the top of the file. */
  const flowsRight = !isAr;

  const bandRef = useRef<HTMLDivElement | null>(null);
  const [bandWidth, setBandWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const el = bandRef.current;
    if (!el) return;
    const read = () => setBandWidth(el.getBoundingClientRect().width);
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * Where stage `i` stands, in pixels from the band's left edge.
   *
   * The stages are evenly spread over what is left after both end shapes take their room, and the
   * FIRST stage stands at the flow start -- which is the right-hand end in Arabic. That mapping is
   * the whole reason this is a function of `flowsRight` rather than a plain division.
   */
  const stageX = useCallback(
    (i: number): number => {
      const usable = Math.max(0, bandWidth - END_PAD * 2);
      const step = usable / (STAGES.length - 1);
      const fromStart = END_PAD + step * i;
      return flowsRight ? fromStart : bandWidth - fromStart;
    },
    [bandWidth, flowsRight],
  );

  /** Arrow keys move by what the key POINTS at, which is the opposite array step in Arabic. */
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const visualStep = event.key === 'ArrowRight' ? 1 : -1;
    const next = index + (flowsRight ? visualStep : -visualStep);
    if (next < 0 || next >= STAGES.length) return;
    event.preventDefault();
    buttons.current[next]?.focus();
    setActiveIndex(next);
  };

  const active = activeIndex === null ? null : STAGES[activeIndex];
  const copy = (s: Stage) => (isAr ? s.ar : s.en);
  const numeral = (i: number) => String(i + 1).padStart(2, '0');

  /* The card follows the mark, then stops following it near the ends: half a card past the band
     edge is off the container, and a tooltip that leaves the section is worse than one that stops
     tracking for the last stage. */
  const cardLeft =
    activeIndex === null
      ? 0
      : Math.min(Math.max(stageX(activeIndex), CARD_W / 2), Math.max(CARD_W / 2, bandWidth - CARD_W / 2));

  return (
    <section
      ref={sectionRef}
      id="process-section"
      data-seen={seen ? 'true' : 'false'}
      aria-labelledby="process-heading"
      className="relative py-20 sm:py-28 lg:py-32"
      style={{ background: WHITE }}
    >
      <div className="nq-container">
        <header className="max-w-[44rem]">
          <p
            className="nq-label nq-rise text-[0.82rem] sm:text-[0.85rem] font-extrabold tracking-[0.14em] uppercase"
            /* 0.62, not 0.55. At 0.55 this line measures 4.33:1 on the section's warm white
               and fails the 4.5:1 floor; 0.62 is 5.41:1. Small tracked type is the last
               place that can afford to sit just under a threshold. */
            style={{ color: OBSIDIAN, opacity: 0.62, ['--nq-rise-delay' as string]: '40ms' }}
          >
            {isAr ? 'كيف نشتغل' : 'How we work'}
          </p>
          <h2
            id="process-heading"
            className={`nq-rise mt-3 text-[1.75rem] sm:text-[2.4rem] lg:text-[2.9rem] font-black leading-[1.2] ${
              isAr ? '' : 'tracking-tight'
            }`}
            style={{ color: OBSIDIAN, ['--nq-rise-delay' as string]: '90ms' }}
          >
            {isAr ? 'مسار المشروع، من أول سؤال إلى ما بعد الإطلاق' : 'From the first question to life after launch'}
          </h2>
          <p
            className="nq-rise mt-4 text-[1rem] sm:text-[1.05rem] font-bold leading-[1.9]"
            style={{ color: OBSIDIAN, opacity: 0.72, ['--nq-rise-delay' as string]: '140ms' }}
          >
            {isAr
              ? 'ثماني مراحل على مسار واحد متصل. مرّ على أي مرحلة لتقرأ ما يحدث فيها.'
              : 'Eight stages on one continuous path. Hover or focus any stage to read what happens there.'}
          </p>
        </header>

        {/* ── Desktop and tablet: the horizontal band ─────────────────────────────────────────── */}
        <div
          ref={bandRef}
          /* The gap above the band is the card's room, not decoration. The card is absolutely
             positioned so it takes no layout space of its own, and at mt-14 it opened straight
             through the lede above it. 11rem clears the tallest card (a three-line description
             at this width measures about 150px, plus its 14px stand-off) with a little left
             over. */
          className="nq-proc-band relative hidden md:block mt-[11rem] lg:mt-[12.5rem]"
          style={{ height: BAND_H }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {bandWidth > 0 && (
            <svg
              width={bandWidth}
              height={BAND_H}
              viewBox={`0 0 ${bandWidth} ${BAND_H}`}
              className="absolute inset-0"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                {/* The reveal. A mask rect scaled along X from the flow start: one transform on
                    one element wipes the fill, the outline and the indicator together, where
                    animating the path itself would have needed three animations kept in step. */}
                <mask id="nq-proc-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width={bandWidth} height={BAND_H}>
                  <rect
                    className="nq-band-wipe"
                    width={bandWidth}
                    height={BAND_H}
                    fill="#fff"
                    style={{ transformOrigin: flowsRight ? 'left center' : 'right center' }}
                  />
                </mask>
                <clipPath id="nq-proc-clip">
                  <path d={bandSvgPath(bandWidth, BAND_H, flowsRight)} />
                </clipPath>
                <linearGradient id="nq-proc-sweep" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor={ORANGE} stopOpacity="0" />
                  <stop offset="50%" stopColor={ORANGE} stopOpacity="0.16" />
                  <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
                </linearGradient>
              </defs>

              <g mask="url(#nq-proc-reveal)">
                {/* Fill first, outline last, so the hairline is never half-covered by its own
                    fill at the corners. */}
                <path d={bandSvgPath(bandWidth, BAND_H, flowsRight)} fill={OBSIDIAN} fillOpacity="0.028" />
                <g clipPath="url(#nq-proc-clip)">
                  <rect
                    className="nq-proc-sweep"
                    width={Math.max(200, bandWidth * 0.22)}
                    height={BAND_H}
                    fill="url(#nq-proc-sweep)"
                    style={{ ['--nq-proc-run' as string]: `${bandWidth}px` }}
                  />
                </g>
                <path
                  d={bandSvgPath(bandWidth, BAND_H, flowsRight)}
                  fill="none"
                  stroke={OBSIDIAN}
                  strokeOpacity="0.16"
                  strokeWidth="1"
                />
                {/* The spine: the line the marks stand on, so the eye reads one path rather than
                    eight points floating inside a shape. */}
                <line
                  x1={END_PAD}
                  x2={bandWidth - END_PAD}
                  y1={BAND_H / 2}
                  y2={BAND_H / 2}
                  stroke={OBSIDIAN}
                  strokeOpacity="0.1"
                  strokeWidth="1"
                  strokeDasharray="2 6"
                  strokeLinecap="round"
                />
              </g>
            </svg>
          )}

          {/* The marks. DOM rather than SVG because each one is a focusable control with a label,
              and a <foreignObject> would buy nothing but a wrapper. */}
          {bandWidth > 0 &&
            STAGES.map((stage, i) => {
              const isActive = activeIndex === i;
              return (
                /* Three elements, three transforms, in that order: the wrapper centres the mark
                   on its point, the middle one carries the entrance, the button carries the
                   hover scale. See proc_fix's note -- `.nq-rise` finishes on `transform: none`
                   and holds it with `forwards`, which outranks both of the others. */
                <div
                  key={stage.key}
                  className="absolute top-1/2"
                  style={{ left: stageX(i), transform: 'translate(-50%, -50%)' }}
                >
                <div className="nq-rise" style={{ ['--nq-rise-delay' as string]: `${240 + i * 70}ms` }}>
                <button
                  ref={(node) => {
                    buttons.current[i] = node;
                  }}
                  type="button"
                  className="nq-proc-stage flex flex-col items-center gap-2.5 rounded-xl outline-none"
                  onMouseEnter={() => setActiveIndex(i)}
                  onFocus={() => setActiveIndex(i)}
                  onBlur={() => setActiveIndex((prev) => (prev === i ? null : prev))}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  aria-expanded={isActive}
                  aria-controls="nq-proc-card"
                >
                  <span
                    className="nq-proc-mark grid place-items-center rounded-[0.7rem] text-[0.82rem] font-black tabular-nums"
                    style={{
                      width: 46,
                      height: 46,
                      background: isActive ? ORANGE : PAPER_DEEP,
                      color: isActive ? WHITE : OBSIDIAN,
                      /* 18% where this was 8%. The chip itself is PAPER_DEEP on a near-white
                         band, 1.29:1 — a surface for the numeral rather than the thing that
                         carries the meaning, which is the numeral at 14.30:1. The stronger
                         edge is so the chip has a boundary at all; it is not a claim that it
                         reaches the 3:1 a mark carrying information would owe. */
                      border: `1px solid ${OBSIDIAN}${isActive ? '00' : '2E'}`,
                    }}
                  >
                    {numeral(i)}
                  </span>
                  <span
                    className="nq-proc-title text-[0.82rem] lg:text-[0.88rem] font-black whitespace-nowrap"
                    style={{ color: OBSIDIAN, opacity: isActive ? 1 : 0.6 }}
                  >
                    {copy(stage).title}
                  </span>
                </button>
                </div>
                </div>
              );
            })}

          {/* One card, moved and refilled, rather than eight cards each waiting its turn. */}
          <div
            id="nq-proc-card"
            role="status"
            className="nq-proc-card absolute z-20 pointer-events-none"
            data-open={active ? 'true' : 'false'}
            style={{
              width: CARD_W,
              left: cardLeft,
              bottom: BAND_H + 14,
              transform: 'translateX(-50%)',
            }}
          >
            {active && (
              <div
                className="rounded-2xl border p-4 sm:p-5 text-start"
                style={{
                  background: 'rgba(8, 10, 13, 0.9)',
                  borderColor: 'rgba(247, 247, 245, 0.12)',
                  backdropFilter: 'blur(8px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                  boxShadow: '0 18px 40px -24px rgba(8, 10, 13, 0.7)',
                }}
              >
                <span
                  className="block text-[0.78rem] font-black tabular-nums"
                  style={{ color: PAPER_DEEP, opacity: 0.75 }}
                >
                  {numeral(activeIndex as number)}
                </span>
                <strong className="mt-1 block text-[1.05rem] font-black" style={{ color: WHITE }}>
                  {copy(active).title}
                </strong>
                <p className="mt-2 text-[0.9rem] font-bold leading-[1.85]" style={{ color: WHITE, opacity: 0.82 }}>
                  {copy(active).body}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile: the same path, stood on its end ─────────────────────────────────────────── */}
        {/* The spine and its two caps live OUTSIDE the list. `<ol>` may contain list items and
            nothing else; a bare span inside it renders only because browsers repair it, and the
            repair is not specified. */}
        <div className="md:hidden mt-12 relative">
          {/* The spine, dashed exactly like the horizontal one, inset to the middle of the marks. */}
          <span
            aria-hidden="true"
            className="absolute top-2 bottom-2 w-px"
            style={{
              insetInlineStart: 22,
              background: `repeating-linear-gradient(to bottom, ${OBSIDIAN}1A 0 2px, transparent 2px 8px)`,
            }}
          />

          {/* The band's own two end shapes, stood on end: the concave chevron the path starts
              from and the solid head it ends on. Same shapes, same opacities — the vertical
              layout is the same path rotated, not a different component that happens to list
              the same eight things. */}
          <svg
            aria-hidden="true"
            focusable="false"
            width="16"
            height="9"
            viewBox="0 0 16 9"
            className="absolute"
            style={{ insetInlineStart: 14, top: -14 }}
          >
            <path d="M1 1 L8 7.6 L15 1" fill="none" stroke={OBSIDIAN} strokeOpacity="0.28" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg
            aria-hidden="true"
            focusable="false"
            width="16"
            height="11"
            viewBox="0 0 16 11"
            className="absolute"
            style={{ insetInlineStart: 14, bottom: -13 }}
          >
            <path d="M8 10.2 L0.8 0.8 L15.2 0.8 Z" fill={OBSIDIAN} fillOpacity="0.22" />
          </svg>

          <ol>
          {STAGES.map((stage, i) => (
            <li
              key={stage.key}
              className="nq-rise relative flex gap-4 pb-7 last:pb-0"
              style={{ ['--nq-rise-delay' as string]: `${160 + i * 70}ms` }}
            >
              <span
                aria-hidden="true"
                className="grid place-items-center rounded-[0.7rem] shrink-0 text-[0.82rem] font-black tabular-nums"
                style={{
                  width: 45,
                  height: 45,
                  background: PAPER_DEEP,
                  color: OBSIDIAN,
                  border: `1px solid ${OBSIDIAN}14`,
                }}
              >
                {numeral(i)}
              </span>
              <div className="min-w-0 pt-1.5">
                <strong className="block text-[1rem] font-black" style={{ color: OBSIDIAN }}>
                  <span className="sr-only">{`${numeral(i)} — `}</span>
                  {copy(stage).title}
                </strong>
                {/* Always visible on touch. A hover card on a phone is a card nobody opens, and the
                    description is the only thing on this section that says what a stage IS. */}
                <p className="mt-1.5 text-[0.92rem] font-bold leading-[1.85]" style={{ color: OBSIDIAN, opacity: 0.72 }}>
                  {copy(stage).body}
                </p>
              </div>
            </li>
          ))}
          </ol>
        </div>
      </div>
    </section>
  );
};
