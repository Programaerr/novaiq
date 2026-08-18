import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Blocks, FileSignature, PencilRuler, Rocket } from 'lucide-react';
import { Language } from '../lib/i18n';
import { INK, PAPER, PERIWINKLE, SAND_DEEP } from '../lib/homePalette';

/**
 * The phases section: how a NOVAIQ project actually runs, in four steps.
 *
 * ## Built from the Canva board, on the wireframe's rail
 *
 * The board lays the four steps out as a vertical stack — a big numeral and a blue mark on one
 * line, the paragraph underneath it running the full measure — and that is what the cells do here.
 * It is deliberately NOT the icon-with-text-beside-it card that every process section on the web
 * is: the paragraph sits under its mark rather than to one side, so the eye reads down a column
 * instead of zig-zagging across four rows of the same shape.
 *
 * The rail across the top is from the earlier wireframe and is kept, because the board has no
 * names on it at all — only numerals — and "1, 2, 3, 4" is not a description of anything. The rail
 * carries العقد / التخطيط / البناء / التسليم, so the two halves together say what neither says
 * alone, and no word appears twice.
 *
 * ## The rail follows the reader; it does not drive them
 *
 * With four short lines the rail could cycle on a timer and read as alive. With four paragraphs it
 * cannot: the lit step would be describing something a screen and a half away. So the rail is
 * STICKY and reads the scroll instead — it lights whichever step is passing the middle of the
 * viewport, and clicking a step goes to it. That makes it the thing that tells you where you are in
 * a long read, which is the only honest job left for it here.
 *
 * ## #8295CF is the state, not the bar
 *
 * The wireframe draws the bar black and annotates it #8295CF. Both cannot be the fill, so the bar
 * is drawn as drawn and the blue is what MOVES across it. It is also the only reading that is
 * legible: white on #8295CF measures 2.97:1, under the 4.5:1 a label needs, where the ink on it is
 * 6.4:1 — which is why every mark on blue in this file is near-black.
 *
 * ## Reading order follows the language
 *
 * Step 1 sits at the RIGHT in Arabic and at the LEFT in English, because this is a sequence being
 * read rather than a picture being composed — unlike the hero's panel, which is pinned physically
 * left in both. Nothing here is mirrored by hand; the rail is a grid and takes its direction from
 * the document.
 */

interface Phase {
  key: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  ar: { name: string; body: string };
  en: { name: string; body: string };
}

/**
 * The four steps, in the company's own words.
 *
 * The Arabic is the copy from the Canva board, with its spelling corrected and nothing else
 * touched — الرائيسية to الرئيسية, تتم بناء to يتم بناء, واقسام to وأقسام, حقيقة to حقيقية, و"الأقسام
 * البقية" to "بقية الأقسام", plus the missing hamzas and full stops. The meaning, the order and the
 * commitments are exactly as written; this is a real company describing what it will and will not
 * do, and it is not mine to reword.
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
      body: 'يُسلَّم الموقع لصاحب الفكرة أو صاحب العمل لغرض التجربة قبل التسليم، وإن ظهرت ملاحظات حقيقية تتم معالجتها من قبل شركتنا مع احتساب الوقت المبذول لغرض التعديل، لضمان حق الزبون وضمان حق الشركة (NOVAIQ).',
    },
    en: {
      name: 'Delivery',
      body: 'The site is handed to the owner to try before final delivery. Where genuine issues come back we fix them, with the time spent on the changes accounted for — so the client is covered and so is NOVAIQ.',
    },
  },
];

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
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  /* Which step is being read. A band across the middle of the viewport rather than a scroll
     handler doing arithmetic: the observer only wakes when a row crosses the line, so this costs
     nothing while someone is just scrolling past, and it stays right through a resize, an image
     loading late or the paragraphs reflowing in another language. */
  useEffect(() => {
    const rows = rowRefs.current.filter(Boolean) as HTMLLIElement[];
    if (!rows.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = rows.indexOf(e.target as HTMLLIElement);
          if (i >= 0) setActive(i);
        }
      },
      /* Top and bottom pulled in until only a thin band across the middle of the screen is left,
         so the lit step is the one someone is actually looking at rather than the one that has
         just appeared at the bottom edge. */
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    rows.forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, []);

  const goTo = useCallback((i: number) => {
    /* `scrollMarginTop` on the row is what stops this landing under the navbar and the rail — see
       the style on the <li>. Left to the browser rather than computed here, so it stays correct
       when the bar's height changes at a breakpoint. */
    rowRefs.current[i]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  return (
    <section
      ref={sectionRef}
      id="phases"
      data-seen={seen ? 'true' : 'false'}
      /* Its own ground and its own vertical rhythm — see HOME_SECTIONS.md. */
      style={{ background: PAPER }}
      className="relative py-20 sm:py-28 lg:py-32"
    >
      <div className="nq-container">
        {/* The rail names the four steps, so a visible heading would be a fifth thing saying what
            the section already says. It still needs a name in the accessibility tree. */}
        <h2 className="sr-only">{isAr ? 'مراحل العمل' : 'How we work'}</h2>

        {/* ── The rail ────────────────────────────────────────────────────────────────────────
            Sticky under the floating navbar, so it is still there to say where you are once the
            first paragraph has scrolled past. Its offset is read from --nav-bottom, which is
            measured at runtime, rather than guessed per breakpoint.

            Held to a measure of its own rather than the full container: at 1700px+ the container
            opens to 100rem, and a four-item bar stretched across 1600px stops reading as a bar
            and starts reading as a table. */}
        <ol
          className={`nq-ph-sweep-${isAr ? 'r' : 'l'} sticky z-20 grid grid-cols-4 mx-auto max-w-[56rem] p-1.5 rounded-2xl`}
          style={{
            background: INK,
            top: 'calc(var(--nav-bottom, 74px) + var(--content-gap, 0.75rem))',
            boxShadow: '0 18px 40px -22px rgba(48, 32, 20, 0.55)',
          }}
        >
          {/* The indicator, behind the labels. Kept out of the accessibility tree: it says exactly
              what `aria-pressed` on the live button already says.

              Its position is DERIVED, not measured. An earlier build measured the live step's
              `offsetLeft` and slid the pill to it, which is correct until the language changes:
              flipping the document to LTR moves every step without changing the rail's size, so no
              ResizeObserver fires and the pill stays on the segment the RTL layout put it under.
              The live label — near-black, because it is meant to be read on blue — was then
              near-black on the near-black bar, and switching to English made step 4 disappear.

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
                  onClick={() => goTo(i)}
                  /* Stacked on phones and inline from `sm` up. The board's `1 │ العقد` needs
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

        {/* ── The four steps ──────────────────────────────────────────────────────────────────
            One column, as the board has it. The two-by-two grid this replaced was right for four
            one-line cells and wrong for four paragraphs: at two columns the text either runs to an
            unreadable measure or wraps to six ragged lines in a half-width box, and either way the
            reader is being asked to track two columns at once through a sequence that is strictly
            in order. */}
        <ol className="mx-auto max-w-[56rem] mt-14 sm:mt-20">
          {PHASES.map((phase, i) => {
            const { Icon } = phase;
            return (
              <li
                key={phase.key}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                className="nq-ph-rise pt-10 sm:pt-14 first:pt-0"
                style={{
                  /* Where a click from the rail lands: clear of the floating navbar AND of the
                     sticky rail itself, which is the part that is easy to forget — without the
                     second term the row arrives exactly underneath the bar that sent you to it. */
                  scrollMarginTop: 'calc(var(--nav-bottom, 74px) + var(--content-gap, 0.75rem) + 6rem)',
                  /* Staggered off the index, so the four arrive in reading order. */
                  ['--nq-ph-delay' as string]: `${140 + i * 110}ms`,
                  borderTop: i === 0 ? undefined : `1px solid ${SAND_DEEP}`,
                }}
              >
                {/* The name, for anyone who is not looking at the rail. On screen the rail carries
                    it and repeating it here would be the section saying "العقد" twice; in the
                    accessibility tree the two halves are separated by four buttons, so without this
                    the list reads as four unlabelled paragraphs. */}
                <h3 className="sr-only">{isAr ? phase.ar.name : phase.en.name}</h3>

                <div className="flex items-center gap-4 sm:gap-6">
                  <span
                    className="text-[2.6rem] sm:text-[3.4rem] font-black leading-[0.8] tabular-nums"
                    style={{ color: INK }}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>

                  {/* The `│` from the wireframe's rail, brought down into the cell so the two
                      halves of the section are built from the same mark. */}
                  <span
                    aria-hidden="true"
                    className="w-px self-stretch shrink-0"
                    style={{ background: SAND_DEEP }}
                  />

                  <span
                    className="grid place-items-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shrink-0"
                    style={{ background: PERIWINKLE, color: INK }}
                    aria-hidden="true"
                  >
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.9} />
                  </span>
                </div>

                {/* Under the mark rather than beside it, which is the board's layout and also the
                    thing that keeps this from being the same card every other process section
                    uses. Capped in CHARACTERS rather than pixels: at 1700px+ the container opens to
                    100rem and a paragraph free to run the full measure is unreadable however well
                    it is written. */}
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
    </section>
  );
};
