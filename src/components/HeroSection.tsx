import React from 'react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { HeroCoverArc } from './HeroCoverArc';

interface HeroSectionProps {
  language: 'ar' | 'en';
  /** Takes the visitor into the template gallery — the lighter of the two ways in. */
  onStart: () => void;
  /** Straight to the contract form, for someone who already knows they want something built. */
  onRequestProject: () => void;
}

/**
 * The hero: a claim, a reason, two ways in, and the studio's work curving away underneath.
 *
 * ## Why it is laid out this way now
 *
 * It was two columns — copy on the left, a drawn render of a laptop/tablet/phone on the right —
 * with a separate flat filmstrip of covers as its own section below (HeroProofStrip, now gone).
 * That is three separate things competing for the first screenful, and the split meant the
 * headline could never be more than about half the page wide.
 *
 * It is one centred composition now: the claim across the middle, the two actions directly under
 * it where the eye already is, and the work itself fanning out below on a turning carousel. The
 * evidence is still above the fold — that was the whole point of bringing the strip up here in
 * the first place — it is just part of the hero instead of a section that follows it.
 *
 * ## The sky
 *
 * The site's own starfield, and nothing else. A layer of drifting CSS planets stood here for one
 * revision — the reference this hero was built from sets its cards against a sky full of clouds,
 * and planets were the dark-site equivalent — but painted spheres on a black page read as grey
 * smudges rather than as bodies, and the hero was better without them. The depth behind this
 * section comes from CosmicBackground, which the whole page already shares.
 */
export const HeroSection: React.FC<HeroSectionProps> = ({ language, onStart, onRequestProject }) => {
  const isAr = language === 'ar';
  // The CTA arrow points "away, forward" — up and outward — so it has to follow the reading
  // direction the way every other directional glyph on the site does.
  const CtaArrow = isAr ? ArrowUpLeft : ArrowUpRight;

  return (
    <section className="relative pt-4 pb-2 md:pt-8 md:pb-6 overflow-hidden">
      {/* Ambient glow, drawn as a radial gradient rather than a blurred circle: an animated 600px
          `blur(140px)` layer has to be re-rasterized by the GPU continuously, which is pure cost
          on a low-end device for something that looks the same either way. */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none animate-pulse-glow"
        style={{ backgroundImage: 'radial-gradient(circle closest-side, rgba(39,39,42,0.55) 0%, rgba(39,39,42,0.18) 45%, rgba(0,0,0,0) 78%)' }}
      />

      {/* ── The claim ────────────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Two lines by construction, not by luck. Left to wrap on its own the break would move
            with the viewport width and the emphasised half would sometimes trail on the end of
            the first line — the shape of this headline is half of what it is doing. */}
        <h1 className="text-4xl sm:text-6xl lg:text-[4.4rem] font-extrabold text-white tracking-tight leading-[1.1] font-['Cairo']">
          {isAr ? (
            <>
              <span className="block">بناء</span>
              <span className="block underline decoration-zinc-700 decoration-2 underline-offset-[12px] font-black">
                مواقع وتطبيقات
              </span>
            </>
          ) : (
            <>
              <span className="block">Web &amp; App</span>
              <span className="block underline decoration-zinc-700 decoration-2 underline-offset-[12px] font-black">
                Development
              </span>
            </>
          )}
        </h1>

        <p className="mt-6 mx-auto max-w-2xl text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {isAr
            ? 'نحن في NOVAIQ نبتكر منصات رقمية فائقة السرعة والأمان. تصفح معرض قوالبنا الجاهزة لشركتك، أو تواصل معنا لصياغة نظام خاص ومخصص يلبي احتياجاتك بدقة واحترافية متكاملة.'
            : 'At NOVAIQ, we build high-performance, secure digital platforms. Explore our ready-made templates for your business, or contact us to build a custom application tailored exactly to your needs.'}
        </p>

        {/* Two buttons, which the single-CTA note that used to live here argued against — and the
            objection it raised was the right one: a pair of equally weighted buttons makes the
            visitor decide something before they know enough to decide it. These are not equally
            weighted. They are two different destinations at two different levels of commitment —
            browse the catalogue, or start a project — and the surfaces say which is which. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onStart}
            className="nq-btn nq-btn--ghost px-6 py-3 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="nq-btn-beam" aria-hidden="true" />
            <span>{isAr ? 'شاهد القوالب' : 'View templates'}</span>
          </button>

          <button
            type="button"
            onClick={onRequestProject}
            className="nq-btn nq-btn--solid ps-7 pe-2 py-2 rounded-full font-extrabold text-sm inline-flex items-center justify-center gap-3 cursor-pointer"
          >
            <span className="nq-btn-beam" aria-hidden="true" />
            <span>{isAr ? 'ابدأ معنا' : 'Get started'}</span>
            {/* The filled disc inverts along with the button: its background is `currentColor`
                and the arrow inside is painted with the button's own surface colour, so one
                `color` flip on hover carries both without a second rule. */}
            <span className="nq-cta-badge" aria-hidden="true">
              <CtaArrow className="w-4 h-4" strokeWidth={2.5} />
            </span>
          </button>
        </div>
      </div>

      {/* ── The work ─────────────────────────────────────────────────────────────────────── */}
      <HeroCoverArc />
    </section>
  );
};
