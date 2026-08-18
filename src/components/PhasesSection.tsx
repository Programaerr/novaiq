import React, { useCallback, useEffect, useRef, useState } from 'react';
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
 * For a screen reader the two halves are stitched back together by a visually hidden heading on
 * each card, so the list still reads "العقد, نتفق على النطاق…" in order rather than as four
 * unlabelled lines. Nothing is hidden from anyone; the name is only shown once.
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
  /** `line` is the card's one-line summary; `body` is the full terms, in the block below it. */
  ar: { name: string; line: string; body: string };
  en: { name: string; line: string; body: string };
}

/**
 * The four steps, twice: once as a glance and once in full.
 *
 * `line` is the summary the cards carry. `body` is the company's own wording from the Canva board,
 * with its spelling corrected and nothing else touched — الرائيسية to الرئيسية, تتم بناء to يتم
 * بناء, واقسام to وأقسام, حقيقة to حقيقية, "الأقسام البقية" to "بقية الأقسام", plus the missing
 * hamzas and full stops. The meaning, the order and the commitments are exactly as written: this is
 * a real company setting out what it will and will not do, and it is not mine to reword.
 *
 * The English is a translation of the same commitments rather than a shorter marketing version of
 * them, for the same reason.
 */
const PHASES: Phase[] = [
  {
    key: 'contract',
    Icon: FileSignature,
    ar: {
      name: 'العقد',
      line: 'نتفق على النطاق والسعر بعقد واحد واضح.',
      body: 'يتم الاتفاق من خلال العقد المبرم بين الشركة وصاحب العمل، ويتم تنفيذ كل ما هو مطلوب من ألوان وأقسام وأنواع خط وتصاميم الصور والشعار وما إلى ذلك. وما خارج العقد يُحسب بسعره الخاص.',
    },
    en: {
      name: 'Contract',
      line: 'Scope and price, settled in one clear agreement.',
      body: 'The work is fixed by the contract between the company and the client: colours, sections, typefaces, image and logo design, and the rest. Anything outside the contract is quoted at its own price.',
    },
  },
  {
    key: 'planning',
    Icon: PencilRuler,
    ar: {
      name: 'التخطيط',
      line: 'نرسم البنية والشاشات قبل أول سطر كود.',
      body: 'يتم التخطيط للتصميم مع تناسق الألوان والخطوط والمسافات والأزرار والحركات التفاعلية مع الموقع، قبل كتابة سطر واحد.',
    },
    en: {
      name: 'Planning',
      line: 'Structure and screens, mapped before the first line of code.',
      body: 'The design is planned out — colour, type, spacing, buttons and how the site moves under the hand — before a single line of code is written.',
    },
  },
  {
    key: 'build',
    Icon: Blocks,
    ar: {
      name: 'البناء',
      line: 'نبني على مراحل، وتشوف كل مرحلة أول بأول.',
      body: 'يتم بناء الواجهة الرئيسية (Hero-section) مع بقية الأقسام بالتدريج، مع اختبار عملي ومباشر لكل قسم وزر وحركة لضمان الاستقرار الكامل.',
    },
    en: {
      name: 'Build',
      line: 'Built in stages, and you see each one as it lands.',
      body: 'The hero section is built first and the rest follow in stages, with every section, button and movement tested live to be sure the whole thing holds.',
    },
  },
  {
    key: 'delivery',
    Icon: Rocket,
    ar: {
      name: 'التسليم',
      line: 'نسلّمه شغّال، ونضل وراك بعد الإطلاق.',
      body: 'يُسلَّم الموقع لصاحب الفكرة أو صاحب العمل لغرض التجربة قبل التسليم، وإن ظهرت ملاحظات حقيقية تتم معالجتها من قبل شركتنا مع احتساب الوقت المبذول لغرض التعديل، لضمان حق الزبون وضمان حق الشركة (NOVAIQ).',
    },
    en: {
      name: 'Delivery',
      line: 'Shipped live, and we stay with you after launch.',
      body: 'The site is handed to the owner to try before final delivery. Where genuine issues come back we fix them, with the time spent on the changes accounted for — so the client is covered and so is NOVAIQ.',
    },
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
  /* The detail block gets a latch of its own. It sits a full screen below the point where the
     section's own latch flips, so sharing that one would have it play its entrance off the bottom
     of the screen and be sitting still by the time anyone reached it. */
  const { ref: detailRef, seen: detailSeen } = useSeen<HTMLDivElement>();

  const [active, setActive] = useState(0);
  /* Set the first time anyone points at, clicks or tabs into the rail, and never cleared. The
     auto-advance exists to show that the rail is live at all; once someone has taken hold of it,
     moving it under them is the thing carousels are hated for. */
  const [held, setHeld] = useState(false);

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
          className={`nq-ph-sweep-${isAr ? 'r' : 'l'} relative grid grid-cols-4 mx-auto max-w-[56rem] p-1.5 rounded-2xl`}
          style={{ background: INK }}
          onPointerEnter={hold}
          onFocusCapture={hold}
        >
          {/* The indicator, behind the labels. Kept out of the accessibility tree: it says exactly
              what `aria-pressed` on the live button already says.

              Its position is DERIVED, not measured. The first build of this measured the live
              step's `offsetLeft` and slid the pill to it, which is correct until the language
              changes: flipping the document to LTR moves every step without changing the rail's
              size, so no ResizeObserver fires, and the pill stays on the segment the RTL layout
              put it under. The live label — near-black, because it is meant to be read on blue —
              was then near-black on the near-black bar, so switching to English made step 4
              disappear.

              Four `1fr` columns are exactly a quarter each by construction, so a quarter-width
              block offset by whole multiples of itself lands on the segment by arithmetic, with
              nothing to fall out of date. `inset-inline-start` puts it at the reading start — the
              right in Arabic — and the sign flip is what sends it the same way the numbers go. */}
          <span
            aria-hidden="true"
            className="absolute top-1.5 bottom-1.5 rounded-xl"
            /* The 0.375rem/0.75rem are the rail's own `p-1.5`, and they are here because an
               absolutely positioned child measures against its ancestor's PADDING box while the
               grid columns divide up the CONTENT box. A plain `w-1/4` is a quarter of the wrong
               box and drifts 3px further off at every step. */
            style={{
              background: PERIWINKLE,
              insetInlineStart: '0.375rem',
              width: 'calc((100% - 0.75rem) / 4)',
              transform: `translateX(${(isAr ? -100 : 100) * active}%)`,
              transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />

          {PHASES.map((phase, i) => {
            const isActive = i === active;
            return (
              <li key={phase.key} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setHeld(true);
                    setActive(i);
                  }}
                  /* Stacked on phones and inline from `sm` up. The drawing's `1 │ العقد` needs
                     roughly 150px to sit on one line without the label crowding the number, and
                     four of those do not fit across a 360px screen — so below `sm` the rule drops
                     out and the number rides above the label instead of being squeezed beside it.

                     The vertical padding is set from the 44px touch minimum backwards rather than
                     from how the bar looks: the stacked form clears it at `py-3` and the inline
                     one, whose content is a single 14px line, needs `py-4` to get there. */
                  className="relative z-10 w-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2.5 px-1 sm:px-3 py-3 sm:py-4 rounded-xl cursor-pointer transition-colors duration-300"
                  style={{ color: isActive ? INK : 'rgba(213, 189, 172, 0.72)' }}
                >
                  <span className="text-[0.68rem] sm:text-xs font-black tabular-nums leading-none">
                    {i + 1}
                  </span>
                  <span
                    aria-hidden="true"
                    className="hidden sm:block w-px h-3.5 shrink-0"
                    style={{ background: 'currentColor', opacity: 0.4 }}
                  />
                  <span className="text-[0.74rem] sm:text-[0.82rem] font-extrabold whitespace-nowrap leading-none">
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
        {/* The same 56rem measure as the rail, so the first cell's numeral starts on the bar's
            edge and the centre rule falls on the seam between steps 2 and 3. A wider grid here
            reads as the bar being too short for the section it heads, which is the sort of thing
            that looks like nothing in particular and is felt as untidiness. */}
        <div className="relative mx-auto max-w-[56rem] mt-14 sm:mt-20">
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
                    {/* The name, for anyone who is not looking at the rail. On screen the rail
                        carries it and repeating it here would be the section saying "العقد" twice
                        within 200px; in the accessibility tree the two halves are separated by
                        four buttons, so without this the list reads as four unlabelled lines.
                        A hidden heading rather than `aria-labelledby` on the <li>: naming a plain
                        list item is not reliably announced, and this also gives the four phases a
                        real h3 level under the section's h2. */}
                    <h3 className="sr-only">{isAr ? phase.ar.name : phase.en.name}</h3>
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

        {/* ── The same four steps, in full ────────────────────────────────────────────────────
            From the Canva board: a numeral and a blue mark on one line, the paragraph underneath
            it running the full measure, four of them stacked down the page.

            The paragraph sits UNDER its mark rather than to one side, and that is the whole reason
            this does not look like every other process section on the web — the eye reads straight
            down one column instead of zig-zagging across four rows of the same shape.

            It repeats the four steps the cards above already named, and that is deliberate: the
            cards are the glance and this is the contract, in the company's own words. The two are
            kept plainly apart — a rule, a change of scale and a real gap — so the second block
            reads as detail rather than as the first one said twice. */}
        <div
          ref={detailRef}
          data-detail-seen={detailSeen ? 'true' : 'false'}
          className="mx-auto max-w-[56rem] mt-20 sm:mt-28 lg:mt-32 pt-14 sm:pt-20"
          style={{ borderTop: `1px solid ${SAND_DEEP}` }}
        >
          {/* The block has a name in the accessibility tree and not on screen. Without it the
              cards' four headings and these four are eight headings with four names between them,
              and no way to hear which half you are in. */}
          <h3 className="sr-only">{isAr ? 'تفاصيل المراحل' : 'The phases in detail'}</h3>

          <ol>
            {PHASES.map((phase, i) => {
              const { Icon } = phase;
              return (
                <li
                  key={phase.key}
                  className="nq-ph-detail pt-10 sm:pt-14 first:pt-0"
                  style={{
                    /* Staggered off the index, so the four arrive in reading order. */
                    ['--nq-ph-delay' as string]: `${120 + i * 110}ms`,
                    borderTop: i === 0 ? undefined : `1px solid ${SAND_DEEP}`,
                  }}
                >
                  <h4 className="sr-only">{isAr ? phase.ar.name : phase.en.name}</h4>

                  <div className="flex items-center gap-4 sm:gap-6">
                    <span
                      className="text-[2.6rem] sm:text-[3.4rem] font-black leading-[0.8] tabular-nums"
                      style={{ color: INK }}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>

                    {/* The `│` from the rail, brought down here too, so both halves of the section
                        are built from the same mark. */}
                    <span
                      aria-hidden="true"
                      className="w-px self-stretch shrink-0"
                      style={{ background: SAND_DEEP }}
                    />

                    {/* Blue on every one of them, as the board has it — nothing in this block is a
                        state, so nothing in it should look like one. The mark is near-black on the
                        blue rather than white: white on #8295CF is 2.97:1, under the 4.5:1 it
                        would need. */}
                    <span
                      className="grid place-items-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shrink-0"
                      style={{ background: PERIWINKLE, color: INK }}
                      aria-hidden="true"
                    >
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.9} />
                    </span>
                  </div>

                  {/* Capped in CHARACTERS rather than pixels: at 1700px+ the container opens to
                      100rem, and a paragraph free to run the full measure is unreadable however
                      well it is written. The generous line height is for the Arabic — stacked
                      diacritics and descenders need the room that Latin body copy does not. */}
                  <p
                    className="mt-5 sm:mt-6 max-w-[58ch] text-[0.92rem] sm:text-[1.02rem] font-bold leading-[1.9]"
                    style={{ color: INK, opacity: 0.78 }}
                  >
                    {isAr ? phase.ar.body : phase.en.body}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};
