import React from 'react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Language } from '../lib/i18n';
import { HeroStack } from './HeroStack';

/**
 * The home page's first section: the claim, the two ways in, and NOVAIQ's mark landing beside it.
 *
 * ## Why this owns its own screen
 *
 * It is the FIRST section of the home page, and the rule the home page is being rebuilt under is
 * that the first section fills the viewport on its own — nothing from the section below may show
 * until the visitor scrolls. That is the `min-h` below, and it subtracts the floating navbar's
 * measured height and the gap <main> already holds under it, so "one screen" means one screen
 * rather than one screen plus the header's band.
 *
 * Everything about this section's size lives in this file: its own <section>, its own
 * `.nq-container`, its own padding. No ancestor spaces it against its neighbours.
 *
 * ## Two columns, and they swap sides on their own
 *
 * Copy on one side, artwork on the other. The DOM order is copy first and there is no explicit
 * ordering anywhere — a grid lays its items out along the writing direction, so in Arabic the copy
 * takes the right half and the artwork the left, and in English they trade places. Pinning either
 * one with `order-*` or `left-*` is what breaks that, and it breaks it silently in only one of the
 * two languages.
 *
 * Below `lg` the columns stack, copy first, and the copy centres — a left-aligned column under a
 * centred object on a narrow screen reads as a mistake rather than as alignment.
 */

interface HomeHeroProps {
  language?: Language;
  /** Into the template gallery — the lighter of the two ways in. */
  onStart?: () => void;
  /** Straight to the contract form, for someone who already knows they want something built. */
  onRequestProject?: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  language = 'ar',
  onStart,
  onRequestProject,
}) => {
  const isAr = language === 'ar';
  // The CTA arrow points "away, forward" — up and outward — so it follows the reading direction the
  // way every other directional glyph on the site does.
  const CtaArrow = isAr ? ArrowUpLeft : ArrowUpRight;

  return (
    <section
      id="home-hero"
      // One full screen, less the floating navbar's measured height and the gap <main> already
      // holds under it. `svh` rather than `vh` so a phone's collapsing address bar cannot make this
      // taller than the screen it is supposed to match.
      className="relative flex items-center overflow-hidden py-6 sm:py-10 lg:py-12 min-h-[calc(100svh-var(--nav-bottom,74px)-var(--content-gap))]"
    >
      {/* No background layer of its own. A violet wash sat here and it is deliberately gone — the
          section takes the page's own ground, and the only violet left in view is on the objects
          themselves (the platform's seam and two of the blocks), where it reads as light coming
          off something rather than as a tint over everything. */}

      <div className="relative z-10 nq-container">
        <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="text-center lg:text-start">
            <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#7C5CFF]/10 border border-[#7C5CFF]/30 text-[#c4b5fd] text-[0.62rem] sm:text-[0.7rem] font-semibold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFF]" aria-hidden="true" />
              {isAr ? 'مبني لمستقبل الأعمال الرقمية' : 'Built for the future of business'}
            </span>

            {/* Two tones on separate lines, which is the reference's own device: the WHAT in white
                and the HOW in the accent, so the second line reads as the promise rather than as a
                continuation of the sentence. `text-balance` covers the narrow screens where a line
                cannot fit, splitting it evenly instead of orphaning one word. */}
            {/* The `lg` step DOWN from `md` is not a typo. Up to `md` the headline has the full
                container to run across; at `lg` the layout splits into two columns and the same
                type suddenly has half the width, which took it to four lines on a 1024 tablet in
                landscape. It goes back up at `xl`, where the half-column is wide enough again. */}
            <h1 className="mt-4 sm:mt-6 text-[2rem] sm:text-5xl md:text-6xl lg:text-[3.1rem] xl:text-[3.9rem] font-extrabold tracking-tight leading-[1.12] font-['Cairo'] text-balance">
              <span className="block text-white">
                {isAr ? 'بناء مواقع وتطبيقات' : 'Powering digital'}
              </span>
              <span className="block bg-clip-text text-transparent bg-gradient-to-l from-[#7C5CFF] to-[#c4b5fd]">
                {isAr ? 'سريعة. آمنة. متكاملة.' : 'Fast. Secure. Complete.'}
              </span>
            </h1>

            <p className="mt-4 sm:mt-6 mx-auto lg:mx-0 max-w-xl text-xs sm:text-sm text-zinc-400 leading-relaxed">
              {isAr
                ? 'نحن في NOVAIQ نبتكر منصات رقمية فائقة السرعة والأمان. تصفح معرض قوالبنا الجاهزة لشركتك، أو تواصل معنا لصياغة نظام خاص ومخصص يلبي احتياجاتك بدقة واحترافية متكاملة.'
                : 'At NOVAIQ, we build high-performance, secure digital platforms. Explore our ready-made templates for your business, or contact us to build a custom application tailored exactly to your needs.'}
            </p>

            {/* `.filter-pill-btn` is the site's button with the motion — the swell on hover, the
                press, and the conic ring rolling round the outline — the same object ProjectCtaButton
                and the templates toolbar already wear. `relative` is not decoration: the class brings
                `isolation: isolate` but not a position, and the beam is `position: absolute; inset: 0`,
                so without it the ring hangs off the nearest positioned ancestor instead of the
                button. */}
            <div className="mt-6 sm:mt-9 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <button
                type="button"
                onClick={onRequestProject}
                className="filter-pill-btn relative ps-7 pe-2 py-2 rounded-full font-extrabold text-sm inline-flex items-center justify-center gap-3 cursor-pointer"
              >
                <span className="filter-pill-beam" aria-hidden="true" />
                <span>{isAr ? 'ابدأ معنا' : 'Get started'}</span>
                <span className="nq-cta-badge" aria-hidden="true">
                  <CtaArrow className="w-4 h-4" strokeWidth={2.5} />
                </span>
              </button>

              <button
                type="button"
                onClick={onStart}
                className="filter-pill-btn filter-pill-btn--ghost relative px-6 py-3 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="filter-pill-beam" aria-hidden="true" />
                <span>{isAr ? 'شاهد القوالب' : 'View templates'}</span>
              </button>
            </div>
          </div>

          {/* The artwork's box, and it is deliberately NOT square when the layout is stacked.
              `relative` so the canvas inside can fill it absolutely without measuring anything.

              Stacked, it takes the full column width and is then clamped by height: `aspect-square`
              states the intent, `max-h` overrides it, and what comes out is a WIDE box. That is the
              shape the artwork actually wants. The composition is a shallow ring of modules seen
              from a three-quarter angle, so it projects about half as tall as it is wide — in a
              square frame that leaves a third of the canvas empty above it and another third below,
              and the whole thing reads as small and stranded no matter how many pixels it is given.
              In a wide box the same height budget buys real width, and the artwork is bigger where
              being bigger shows.

              The height clamps are set from the measured fit rather than picked: the copy, the gap
              and the section's padding are known at every size, so the artwork takes what is left
              minus a margin for the copy growing a line. The tightest case is a 360×740 phone,
              which has 654px of section with 334 already spoken for — hence 40svh.

              From `lg` the two-column layout gives this its own half of the page, which is nowhere
              near wide, so it goes back to a square driven by height. */}
          <div className="relative mx-auto aspect-square w-full max-h-[40svh] sm:max-h-[42svh] md:max-h-[46svh] lg:h-[min(68svh,37.5rem)] lg:w-auto lg:max-h-none">
            <HeroStack />
          </div>
        </div>
      </div>
    </section>
  );
};
