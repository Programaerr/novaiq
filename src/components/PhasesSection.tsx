import React from 'react';
import { Blocks, FileSignature, PencilRuler, Rocket } from 'lucide-react';
import { Language } from '../lib/i18n';
import { useSeen } from '../lib/useSeen';
import { INK, PAPER, PERIWINKLE } from '../lib/homePalette';
import { BAND_FADE, PERIWINKLE_TONES, TileField } from './TileField';

/**
 * The phases section: the four steps of a project, in the same model as the contact section.
 *
 * ## The same edge as the contact section
 *
 * The section's ground is #8295CF and the one above it is paper, so the top carries the same
 * strip of tile field the hero and contact sections use — cubes absent at the top where the
 * ground is still paper, assembling as the ground turns, settling into flat blue before the
 * heading. It is the same gesture the contact section makes on its way in.
 *
 * ## No more cards
 *
 * The four steps used to sit in a numbered two-column grid of cells, each with its own numeral,
 * rule and blue mark. That card look is gone. The steps now live inside one frosted glass panel
 * over the blue ground: semi-transparent and blurred, so the field reads through it without the
 * copy fighting it — text stays sharp while the background around it stays visible.
 *
 * ## The wording is untouched
 *
 * The Arabic copy is the company's own words from the Canva board (spelling corrected, nothing
 * else changed), and the English a translation of the same commitments. Only the container
 * changed; the four commitments are exactly as they were.
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
 * The Arabic is the copy from the Canva board, with its spelling corrected and nothing else
 * touched — الرائيسية to الرئيسية, تتم بناء to يتم بناء, واقسام to وأقسام, حقيقة to حقيقية, "الأقسام البقية" to "بقية الأقسام", plus the missing
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
         from the hero's sand is what separates the two sections. The top padding clears the tile
         strip above it, which is absolutely positioned and so takes up no height of its own. */
      style={{ background: PERIWINKLE }}
      className="relative overflow-hidden pt-[calc(var(--nq-band)+3.5rem)] pb-20 sm:pb-28 lg:pb-32"
    >
      {/* ── The edge ────────────────────────────────────────────────────────────────────────────
          The same band the contact section carries: the ground's change of colour and the field
          of cubes crossing it. The gradient reaches full blue well before the strip ends, so the
          cubes have solid ground to settle onto rather than vanishing the moment the colour
          lands. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0"
        style={{
          height: 'var(--nq-band)',
          background: 'linear-gradient(to bottom, ' + PAPER + ' 6%, ' + PERIWINKLE + ' 74%)',
        }}
      >
        <TileField tones={PERIWINKLE_TONES} fade={BAND_FADE} />
      </div>

      <div className="relative nq-container">
        <div className="mx-auto max-w-[56rem]">
          <h2
            className="nq-rise text-[1.55rem] sm:text-[2.1rem] font-black leading-none tracking-tight"
            style={{ color: INK, ['--nq-rise-delay' as string]: '80ms' }}
          >
            {isAr ? 'مراحل العمل' : 'How we work'}
          </h2>

          {/* ── The steps, in one frosted panel ────────────────────────────────────────────────
              Semi-transparent over the blue, with a heavy blur: the copy stays sharp while the
              background keeps showing through, instead of hiding it behind an opaque card. The
              panel IS the container — no per-step cards inside it. */}
          <div
            className="nq-rise mt-10 sm:mt-12 rounded-3xl px-5 sm:px-8 lg:px-10 py-8 sm:py-10 border border-white/25 backdrop-blur-2xl"
            style={{
              background: 'rgba(246, 241, 233, 0.16)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), 0 30px 60px rgba(16,19,34,0.18)',
              ['--nq-rise-delay' as string]: '180ms',
            }}
          >
            <ol className="grid gap-10 sm:gap-9">
              {PHASES.map((phase, i) => {
                const { Icon } = phase;
                return (
                  <li key={phase.key} className="flex items-start gap-4 sm:gap-5">
                    {/* The step number, quiet and small — sequence without the card's numeral. */}
                    <span
                      className="pt-1 text-[1.35rem] sm:text-[1.5rem] font-black leading-none tabular-nums shrink-0"
                      style={{ color: INK, opacity: 0.5 }}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>

                    <span
                      aria-hidden="true"
                      className="w-px self-stretch shrink-0"
                      style={{ background: INK, opacity: 0.18 }}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <h3
                          className="text-[1.05rem] sm:text-[1.2rem] font-black leading-none"
                          style={{ color: INK }}
                        >
                          {isAr ? phase.ar.name : phase.en.name}
                        </h3>
                        {/* The mark in ink, on the blue — near-black rather than white on purpose:
                            white on #8295CF is 2.97:1, under the 4.5:1 it would need, where this
                            ink is 6.4:1. */}
                        <span
                          className="grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl shrink-0"
                          style={{ background: PERIWINKLE, color: INK }}
                          aria-hidden="true"
                        >
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.9} />
                        </span>
                      </div>

                      <p
                        className="mt-4 max-w-[62ch] text-[0.92rem] sm:text-[1.02rem] font-bold leading-[1.9]"
                        style={{ color: INK, opacity: 0.82 }}
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
      </div>
    </section>
  );
};