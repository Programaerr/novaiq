import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Blocks, FileSignature, PencilRuler, Rocket } from 'lucide-react';
import { Language } from '../lib/i18n';
import { INK, PAPER, PERIWINKLE, SAND, SAND_DEEP } from '../lib/homePalette';

/**
 * The phases section: the four steps of a project, as a rail and four cards.
 *
 * ## Built from the wireframe
 *
 * The drawing is specific and this follows it: a bar across the top carrying `1 │ العقد` through
 * `4 │ التسليم`, and below it four cells in two stacked columns with a rule down the middle. The
 * cells are laid out COLUMN-major — 1 and 2 share a column, 3 and 4 share the next — which is what
 * the drawing shows and is not what a plain `grid-cols-2` does, so the grid is explicitly
 * `grid-flow-col` with two rows.
 *
 * ## The rail and the cards do not repeat each other
 *
 * This is the one decision that does the most work here. The obvious build gives every card a
 * heading, and then the section says "العقد" twice within 200px of itself — the rail becomes
 * decoration, because deleting it would cost nothing. Instead the rail owns the four NAMES and
 * each card owns a number, a mark and one line. The numeral is the join between them, the rail is
 * load-bearing, and the section's entire word count is four names and four short lines.
 *
 * For a screen reader the two halves are stitched back together with `aria-labelledby`: each card
 * is labelled by the rail button that names it, so the list still reads "العقد, نتفق على النطاق…"
 * in order rather than as four unlabelled numbers.
 *
 * ## #8295CF is the state, not the bar
 *
 * The wireframe draws the bar black and annotates it #8295CF. Both cannot be the fill, so the bar
 * is drawn as drawn and the blue is what MOVES across it — the indicator behind the live step, the
 * rule that fills on the live card, the mark on its tile. That reading keeps the drawing's black
 * bar and puts the annotated colour on the only thing in the section that changes, and it is also
 * the only reading that is legible: white on #8295CF measures 2.97:1, under the 4.5:1 a label
 * needs, where the ink on it is 6.4:1.
 *
 * ## Reading order follows the language
 *
 * Step 1 sits at the RIGHT in Arabic and at the LEFT in English, because this is a sequence being
 * read rather than a picture being composed — unlike the hero's panel, which is pinned physically
 * left in both. Nothing here is mirrored by hand: the rail is a grid and the cards are a grid, and
 * both take their direction from the document.
 */

interface Phase {
  /** Stable id, used to tie a rail button to the card it labels. */
  key: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  ar: { name: string; line: string };
  en: { name: string; line: string };
}

const PHASES: Phase[] = [
  {
    key: 'contract',
    Icon: FileSignature,
    ar: { name: 'العقد', line: 'نتفق على النطاق والسعر بعقد واحد واضح.' },
    en: { name: 'Contract', line: 'Scope and price, settled in one clear agreement.' },
  },
  {
    key: 'planning',
    Icon: PencilRuler,
    ar: { name: 'التخطيط', line: 'نرسم البنية والشاشات قبل أول سطر كود.' },
    en: { name: 'Planning', line: 'Structure and screens, mapped before the first line of code.' },
  },
  {
    key: 'build',
    Icon: Blocks,
    ar: { name: 'البناء', line: 'نبني على مراحل، وتشوف كل مرحلة أول بأول.' },
    en: { name: 'Build', line: 'Built in stages, and you see each one as it lands.' },
  },
  {
    key: 'delivery',
    Icon: Rocket,
    ar: { name: 'التسليم', line: 'نسلّمه شغّال، ونضل وراك بعد الإطلاق.' },
    en: { name: 'Delivery', line: 'Shipped live, and we stay with you after launch.' },
  },
];

/** How long a step stays lit before the rail moves on, until someone touches it. */
const DWELL_MS = 3400;

/**
 * True once the element has been on screen, and true forever after.
 *
 * Entrance animations are gated on this rather than run on mount, because this section starts
 * below the fold: run on mount and the whole thing has already played by the time anyone scrolls
 * to it. `IntersectionObserver` delivers an initial callback as soon as it observes, so a section
 * that IS in view on load — a short viewport, a deep link — animates immediately and correctly.
 *
 * The one-way latch matters: without it, scrolling back up replays the entrance every time, which
 * is how a page starts feeling like a demo reel.
 */
function useSeen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    /* No observer means no way to know — show the content rather than leave it clipped to
       nothing by the from-state it is waiting on. */
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      /* A little above the fold, so the rail has finished sweeping by the time it is properly
         in front of someone rather than starting under their thumb. */
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, seen };
}

interface PhasesSectionProps {
  language?: Language;
}

export const PhasesSection: React.FC<PhasesSectionProps> = ({ language = 'ar' }) => {
  const isAr = language === 'ar';
  const { ref: sectionRef, seen } = useSeen<HTMLElement>();

  const [active, setActive] = useState(0);
  /* Set the first time anyone points at, clicks or tabs into the rail, and never cleared. The
     auto-advance exists to show that the rail is live at all; once someone has taken hold of it,
     moving it under them is the thing carousels are hated for. */
  const [held, setHeld] = useState(false);

  const railRef = useRef<HTMLOListElement>(null);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  /* The sliding block behind the live step. Measured rather than expressed as `25% * index`,
     because the four segments are only equal until a label wraps or a font loads late. */
  const [pill, setPill] = useState({ x: 0, w: 0, ready: false });

  const measure = useCallback(() => {
    const el = stepRefs.current[active];
    if (!railRef.current || !el) return;
    /* offsetLeft is measured from the offsetParent's border box; the rail is `relative` and
       borderless, so this is the same origin the absolutely positioned pill sits at. */
    setPill({ x: el.offsetLeft, w: el.offsetWidth, ready: true });
  }, [active]);

  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const ro = new ResizeObserver(measure);
    ro.observe(rail);
    /* Arabic labels are laid out twice — once in the fallback face, once in Cairo — and the
       second pass is what the pill has to agree with. */
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!seen || held) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % PHASES.length), DWELL_MS);
    return () => window.clearInterval(id);
  }, [seen, held]);

  const hold = useCallback(() => setHeld(true), []);

  /* Column-major placement puts 1 and 2 in the first column, 3 and 4 in the second — so the live
     ROW is the index's parity, and that is what the mark on the centre rule tracks. */
  const activeRow = active % 2;

  return (
    <section
      ref={sectionRef}
      id="phases"
      data-seen={seen ? 'true' : 'false'}
      /* Its own ground and its own vertical rhythm — see HOME_SECTIONS.md. The change of ground
         from the hero's sand is what separates the two sections; the padding is what stops the
         rail from landing on the seam. */
      style={{ background: PAPER }}
      className="relative py-20 sm:py-28 lg:py-32"
    >
      <div className="nq-container">
        {/* The rail names the four steps, so a visible heading would be a fifth thing saying what
            the section already says. It still needs a name in the accessibility tree. */}
        <h2 className="sr-only">{isAr ? 'مراحل العمل' : 'How we work'}</h2>

        {/* ── The rail ────────────────────────────────────────────────────────────────────────
            Held to a measure of its own rather than the full container: at 1700px+ the container
            opens to 100rem, and a four-item bar stretched across 1600px stops reading as a bar
            and starts reading as a table. */}
        <ol
          ref={railRef}
          className={`nq-ph-sweep-${isAr ? 'r' : 'l'} relative grid grid-cols-4 mx-auto max-w-[56rem] p-1.5 rounded-2xl`}
          style={{ background: INK }}
          onPointerEnter={hold}
          onFocusCapture={hold}
        >
          {/* The indicator, behind the labels. Kept out of the accessibility tree: it says
              exactly what `aria-pressed` on the live button already says. */}
          <span
            aria-hidden="true"
            className="absolute top-1.5 bottom-1.5 left-0 rounded-xl"
            style={{
              background: PERIWINKLE,
              width: pill.w,
              transform: `translateX(${pill.x}px)`,
              opacity: pill.ready ? 1 : 0,
              transition:
                'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), width 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s linear',
            }}
          />

          {PHASES.map((phase, i) => {
            const isActive = i === active;
            return (
              <li
                key={phase.key}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="min-w-0"
              >
                <button
                  type="button"
                  id={`phase-name-${phase.key}`}
                  aria-pressed={isActive}
                  onClick={() => {
                    setHeld(true);
                    setActive(i);
                  }}
                  /* Stacked on phones and inline from `sm` up. The drawing's `1 │ العقد` needs
                     roughly 150px to sit on one line without the label crowding the number, and
                     four of those do not fit across a 360px screen — so below `sm` the rule drops
                     out and the number rides above the label instead of being squeezed beside it. */
                  className="relative z-10 w-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2.5 px-1 sm:px-3 py-2.5 sm:py-3 rounded-xl cursor-pointer transition-colors duration-300"
                  style={{ color: isActive ? INK : 'rgba(213, 189, 172, 0.72)' }}
                >
                  <span className="text-[0.6rem] sm:text-xs font-black tabular-nums leading-none">
                    {i + 1}
                  </span>
                  <span
                    aria-hidden="true"
                    className="hidden sm:block w-px h-3.5 shrink-0"
                    style={{ background: 'currentColor', opacity: 0.4 }}
                  />
                  <span className="text-[0.7rem] sm:text-[0.82rem] font-extrabold whitespace-nowrap leading-none">
                    {isAr ? phase.ar.name : phase.en.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* ── The four cells ──────────────────────────────────────────────────────────────────
            `grid-flow-col` with two rows is what puts 1 above 2 and 3 above 4, as drawn. A plain
            two-column grid fills across instead and would put 1 beside 2. */}
        <div className="relative mx-auto max-w-[64rem] mt-14 sm:mt-20">
          {/* The rule between the columns, with a short mark that follows the live row. Only from
              `sm` up, because below that the cells are one column and a rule down the middle of
              them would be crossing out the content. */}
          <span
            aria-hidden="true"
            className="hidden sm:block absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 overflow-hidden"
            style={{ background: SAND_DEEP }}
          >
            <span
              className="absolute inset-x-0 h-[38%] rounded-full"
              style={{
                background: PERIWINKLE,
                top: activeRow === 0 ? '6%' : '56%',
                transition: 'top 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </span>

          <ol className="grid gap-y-12 sm:gap-y-16 sm:grid-cols-2 sm:grid-rows-2 sm:grid-flow-col sm:gap-x-14 lg:gap-x-20">
            {PHASES.map((phase, i) => {
              const isActive = i === active;
              const { Icon } = phase;
              return (
                <li
                  key={phase.key}
                  aria-labelledby={`phase-name-${phase.key}`}
                  className="nq-ph-rise flex items-stretch gap-4 sm:gap-6"
                  /* Staggered off the index rather than a wrapper, so the four cards arrive in
                     reading order no matter which column they landed in. */
                  style={{ ['--nq-ph-delay' as string]: `${140 + i * 110}ms` }}
                >
                  <span
                    className="text-[2.4rem] sm:text-[3rem] font-black leading-[0.85] tabular-nums transition-opacity duration-500"
                    style={{ color: INK, opacity: isActive ? 1 : 0.5 }}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>

                  {/* The `│` from the drawing, doing a second job: it fills with the accent while
                      its phase is live, which is the quietest way to tie a card to the rail
                      without moving or resizing anything. */}
                  <span
                    aria-hidden="true"
                    className="relative w-px shrink-0 self-stretch overflow-hidden"
                    style={{ background: SAND_DEEP }}
                  >
                    <span
                      className="absolute inset-x-0 top-0"
                      style={{
                        background: PERIWINKLE,
                        height: isActive ? '100%' : '0%',
                        transition: 'height 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    />
                  </span>

                  <div className="min-w-0 pt-0.5">
                    <span
                      className="grid place-items-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl transition-colors duration-500"
                      style={{ background: isActive ? PERIWINKLE : SAND, color: INK }}
                      aria-hidden="true"
                    >
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.9} />
                    </span>
                    {/* Capped in characters rather than pixels: at 1700px+ the container is
                        100rem, and a line free to run the full half of that is unreadable however
                        few words it has. */}
                    <p
                      className="mt-4 sm:mt-5 max-w-[34ch] text-[0.86rem] sm:text-[0.95rem] font-bold leading-relaxed"
                      style={{ color: INK, opacity: 0.74 }}
                    >
                      {isAr ? phase.ar.line : phase.en.line}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};
