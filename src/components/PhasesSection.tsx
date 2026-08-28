import React from 'react';
import { Blocks, FileSignature, PencilRuler, Rocket } from 'lucide-react';
import { Language } from '../lib/i18n';
import { useSeen } from '../lib/useSeen';
import { ORANGE, PAPER_DEEP, OBSIDIAN, PAPER } from '../lib/homePalette';

/**
 * The phases section: the four steps of a project, as a rail and four cards.
 *
 * ## Four cells, laid out column-major
 *
 * 1 and 2 share a column, 3 and 4 share the next, with a rule down the middle — which is what the
 * wireframe shows and is NOT what a plain `grid-cols-2` does, since that fills across and would
 * put 1 beside 2. Hence `grid-flow-col` with two rows spelled out.
 *
 * Each cell carries the whole step: numeral, rule, name, mark, and the terms for that step in the
 * company's own words. Nothing in the section is said twice.
 *
 * ## The bar used to be here
 *
 * A dark bar across the top held `1 │ العقد` through `4 │ التسليم` and was the only place the
 * names appeared. It is gone, and the names came down into the cells with it — which is why a
 * card header reads numeral, rule, name, mark: it is the bar's own format, one step per card.
 *
 * Everything that existed to drive that bar went with it: the live step, the timer that advanced
 * it, the dimmed numerals and the blue that filled the rule and the tile of whichever step was
 * lit. There is nothing left to be live, so nothing pretends to be.
 *
 * ## Orange is on every mark now
 *
 * The brand's one accent was the state while the bar could set one. Without it the four cells
 * are equals, so all four marks carry it. The glyph on them is near-black rather than white, and
 * this one IS a hard requirement rather than a style choice: white on Signal Orange (`#FF6A00`)
 * is 2.87:1, under even the 3:1 a graphical icon needs; Obsidian measures 6.90:1 on the same
 * fill. There is no version of this mark that reads with a light glyph.
 *
 * ## Reading order follows the language
 *
 * The numeral sits at the RIGHT in Arabic and at the LEFT in English, because this is a sequence
 * being read rather than a picture being composed — unlike the hero's panel, which is pinned
 * physically left in both. Nothing here is mirrored by hand; the cells are a grid and take their
 * direction from the document, which is also what puts the name on the mark's right in Arabic and
 * on its left in English.
 */

interface Phase {
  /** Stable id, used to tie a rail button to the card it labels. */
  key: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  ar: { name: string; body: string };
  en: { name: string; body: string };
}

/**
 * The four steps, in the company's own words.
 *
 * The Arabic began as the copy from the Canva board, with its spelling corrected — الرائيسية to
 * الرئيسية, تتم بناء to يتم بناء, واقسام to وأقسام, "الأقسام البقية" to "بقية الأقسام", plus the missing hamzas and full stops.
 *
 * The English is a translation of the same commitments rather than a shorter marketing version of
 * them.
 *
 * ## These four must agree with the contract the client signs
 *
 * This section states what the company will do; contractTerms states what it is bound to do. When
 * the two disagree, the page is advertising terms the agreement does not give — so the clauses win
 * and the copy is corrected to them, which is why this is no longer verbatim board copy.
 *
 * Step 4 is where that bit. It read "تتم معالجتها ... مع احتساب الوقت المبذول" — every revision
 * billed — while clause 2 grants two FREE revision rounds and clause 6 fixes defects free for 30
 * days. A client who read the page would have been quoted for something their own contract gives
 * them. It now carries the clauses it is bound by: the two free rounds (clause 2), the 7-day
 * window after which a phase is deemed approved (clause 3), and handover of code and admin access
 * only once payment completes (clause 1).
 *
 * Nothing here may promise faster, cheaper, or more than the clauses do. Check both when editing.
 */
const PHASES: Phase[] = [
  {
    key: 'contract',
    Icon: FileSignature,
    ar: {
      name: 'العقد',
      body: 'يتم الاتفاق من خلال العقد المبرم بين الشركة وصاحب العمل، ويتم تنفيذ كل ما هو مطلوب من ألوان وأقسام وأنواع خط وتصاميم الصور والشعار وما إلى ذلك. وما خارج العقد يُحسب بسعره الخاص.',
    },
    en: {
      name: 'Contract',
      body: 'The work is fixed by the contract between the company and the client: colours, sections, typefaces, image and logo design, and the rest. Anything outside the contract is quoted at its own price.',
    },
  },
  {
    key: 'planning',
    Icon: PencilRuler,
    ar: {
      name: 'التخطيط',
      body: 'يتم التخطيط للتصميم مع تناسق الألوان والخطوط والمسافات والأزرار والحركات التفاعلية مع الموقع، قبل كتابة سطر واحد.',
    },
    en: {
      name: 'Planning',
      body: 'The design is planned out — colour, type, spacing, buttons and how the site moves under the hand — before a single line of code is written.',
    },
  },
  {
    key: 'build',
    Icon: Blocks,
    ar: {
      name: 'البناء',
      body: 'يتم بناء الواجهة الرئيسية (Hero-section) مع بقية الأقسام بالتدريج، مع اختبار عملي ومباشر لكل قسم وزر وحركة لضمان الاستقرار الكامل.',
    },
    en: {
      name: 'Build',
      body: 'The hero section is built first and the rest follow in stages, with every section, button and movement tested live to be sure the whole thing holds.',
    },
  },
  {
    key: 'delivery',
    Icon: Rocket,
    ar: {
      name: 'التسليم',
      body: 'يُسلَّم الموقع لصاحب العمل لتجربته قبل التسليم النهائي، وله جولتا تعديل مجانيتان ضمن النطاق المتفق عليه، وما خرج عنه يُسعَّر على حدة. وإن لم تصلنا ملاحظات خلال 7 أيام تُعتبر المرحلة معتمدة، ويُسلَّم الكود وصلاحيات الإدارة بعد اكتمال السداد.',
    },
    en: {
      name: 'Delivery',
      body: 'The site is handed to the owner to try before final delivery, with two free revision rounds inside the agreed scope; anything beyond it is quoted separately. If no comments reach us within 7 days the phase is taken as approved, and the code and admin access are handed over once payment is complete.',
    },
  },
];

interface PhasesSectionProps {
  language?: Language;
}

export const PhasesSection: React.FC<PhasesSectionProps> = ({ language = 'ar' }) => {
  const isAr = language === 'ar';
  const { ref: sectionRef, seen } = useSeen<HTMLElement>();


  return (
    <section
      ref={sectionRef}
      id="phases"
      data-seen={seen ? 'true' : 'false'}
      /* Its own ground and its own vertical rhythm — see HOME_SECTIONS.md. The change of ground
         from the hero's warm white is what separates the two sections; the padding is what stops
         the rail from landing on the seam. */
      style={{ background: PAPER }}
      className="relative py-20 sm:py-28 lg:py-32"
    >
      <div className="nq-container">
        {/* The section's own name, standing where the dark bar used to. Aligned to the reading
            start — right in Arabic, left in English — and held to the same 56rem measure as the
            cells below, so it starts on the edge of cell 1 rather than floating over the middle
            of them. Nothing mirrors this by hand; the box takes its direction from the document. */}
        <h2
          className="mx-auto max-w-[56rem] uw:max-w-[72rem] text-[1.55rem] sm:text-[2.1rem] uw:text-[2.6rem] font-black leading-none tracking-tight"
          style={{ color: OBSIDIAN }}
        >
          {isAr ? 'مراحل العمل' : 'How we work'}
        </h2>

        {/* ── The four cells ──────────────────────────────────────────────────────────────────
            `grid-flow-col` with two rows is what puts 1 above 2 and 3 above 4, as drawn. A plain
            two-column grid fills across instead and would put 1 beside 2. */}
        {/* Narrower than the container, and stepped rather than tracking it. At 1700px+ the
            container opens to 100rem, and two columns spread across the full 1600px stop being a
            pair and become two pages the eye has to travel between — but staying at 56rem there is
            the opposite failure, and the one an ultrawide actually shows: an 896px island adrift in
            3440px of paper, with each card's text down to a 330px measure, cramped copy surrounded
            by empty ground. 72rem is the middle: the pair still reads as a pair, and the measure
            goes back to something a line of Arabic wants to be. */}
        <div className="relative mx-auto max-w-[56rem] uw:max-w-[72rem] mt-14 sm:mt-20">
          {/* The rule between the columns. Only from `sm` up, because below that the cells are
              one column and a rule down the middle of them would be crossing out the content.

              A plain hairline: it had a short blue mark on it that slid to whichever row was
              live, and with the rail gone there is no live row for it to point at. */}
          <span
            aria-hidden="true"
            className="hidden sm:block absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2"
            style={{ background: PAPER_DEEP }}
          />

          <ol className="grid gap-y-12 sm:gap-y-16 sm:grid-cols-2 sm:grid-rows-2 sm:grid-flow-col sm:gap-x-14 lg:gap-x-20">
            {PHASES.map((phase, i) => {
              const { Icon } = phase;
              return (
                <li
                  key={phase.key}
                  className="nq-rise flex items-stretch gap-4 sm:gap-6"
                  /* Staggered off the index rather than a wrapper, so the four cards arrive in
                     reading order no matter which column they landed in. */
                  style={{ ['--nq-rise-delay' as string]: `${140 + i * 110}ms` }}
                >
                  <span
                    className="text-[2.4rem] sm:text-[3rem] uw:text-[3.6rem] font-black leading-[0.85] tabular-nums"
                    style={{ color: OBSIDIAN }}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>

                  {/* The `│` from the drawing. A plain hairline now: it used to fill with the
                      accent while its phase was live, and with the rail gone there is no live
                      phase for it to report. */}
                  <span
                    aria-hidden="true"
                    className="w-px shrink-0 self-stretch"
                    style={{ background: PAPER_DEEP }}
                  />

                  <div className="min-w-0 pt-0.5">
                    {/* The name and its mark, on one line. This is where the rail's
                        `1 │ العقد` ended up once the bar was taken out: the numeral and the rule
                        are already to the right of this row, so the name lands beside the icon and
                        the card header reads as the rail step it replaces.

                        The heading is REAL text now rather than the screen-reader-only copy it was
                        while the rail carried the visible name — one h3 per phase, under the
                        section's h2, and nothing said twice.

                        Orange on all four marks. The tile used to be blue only on the live phase,
                        and there is no live phase without the rail to set one. Obsidian on the
                        Orange rather than white: white on Signal Orange is 2.87:1, under even the
                        3:1 a graphical icon needs. */}
                    <div className="flex items-center gap-3 sm:gap-4">
                      <h3
                        className="text-[1.05rem] sm:text-[1.2rem] uw:text-[1.35rem] font-black leading-none"
                        style={{ color: OBSIDIAN }}
                      >
                        {isAr ? phase.ar.name : phase.en.name}
                      </h3>
                      <span
                        className="grid place-items-center w-14 h-14 sm:w-16 sm:h-16 uw:w-[4.5rem] uw:h-[4.5rem] rounded-2xl shrink-0"
                        style={{ background: ORANGE, color: OBSIDIAN }}
                        aria-hidden="true"
                      >
                        <Icon className="w-6 h-6 sm:w-7 sm:h-7 uw:w-8 uw:h-8" strokeWidth={1.9} />
                      </span>
                    </div>
                    {/* Capped in CHARACTERS rather than pixels: at 1700px+ the container opens to 100rem,
                        and a paragraph free to run the full half of that is unreadable however well it is
                        written. In a two-column cell the column is usually the narrower of the two, and
                        the cap is what holds the line at a readable measure on the widest screens.

                        The generous line height is for the Arabic — stacked diacritics and descenders need
                        room that Latin body copy does not, and these are paragraphs now rather than the one
                        line the cards started with. */}
                    <p
                      className="mt-5 sm:mt-6 max-w-[58ch] text-[0.92rem] sm:text-[1.02rem] uw:text-[1.1rem] font-bold leading-[1.9]"
                      style={{ color: OBSIDIAN, opacity: 0.78 }}
                    >
                      {isAr ? phase.ar.body : phase.en.body}
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