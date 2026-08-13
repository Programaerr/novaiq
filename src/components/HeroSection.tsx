import React, { useEffect, useRef } from 'react';
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

  // The hero's two continuous animations stop the moment the hero leaves the screen.
  //
  // This is the single largest piece of permanent work on the site. The carousel is one CSS
  // rotation, but that rotation drives twenty-six separately composited, 3D-transformed card
  // layers — and it was measured still `running` with the visitor scrolled 2537px past it, at
  // the very bottom of the page. Nothing stopped it: `html[data-idle]` covers a hidden or
  // unfocused window, which is a different situation entirely from a window the visitor is
  // actively using while the animation plays somewhere they cannot see. A device answers a
  // permanent compositor job it can never show anyone the same way it answers a game.
  //
  // Paused, not unmounted: the ring keeps its angle, so scrolling back finds it where it was
  // rather than snapped to the start. The margin means it is already turning again by the time
  // its first pixel appears — arriving at a frozen carousel that then starts moving is more
  // noticeable than the saving is worth.
  const heroRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) delete el.dataset.heroOff;
        else el.dataset.heroOff = 'true';
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={heroRef} className="relative pb-2 md:pb-6 overflow-hidden">
      {/* ── The limb ─────────────────────────────────────────────────────────────────────────
          A planet's edge rising across the top of the section: one enormous circle, of which only
          the crown is ever in frame, with its rim catching the light and that light spilling
          upward into the sky above it.

          It replaces a 600px `animate-pulse-glow` disc that used to sit here. That was a soft blob
          pulsing forever in the middle of the hero — one more permanently running animation, and
          nothing to look at. This is bigger, sharper, still, and free. */}
      <div className="hero-limb" aria-hidden="true" />
      <div className="hero-sky" aria-hidden="true" />

      {/* ── The claim ────────────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Two lines by construction, not by luck. Left to wrap on its own the break would move
            with the viewport width and the emphasised half would sometimes trail on the end of
            the first line — the shape of this headline is half of what it is doing.

            Two tones rather than an underline. The underline that used to mark the second line was
            a rule drawn under the words; this makes the words themselves carry the emphasis, which
            is what the reference does and is one less thing on the page. The quiet half stays at
            zinc-500 — still ~7:1 on this ground, so the whole heading remains readable rather than
            half of it turning into texture. */}
        <h1 className="text-4xl sm:text-6xl lg:text-[4.4rem] font-extrabold tracking-tight leading-[1.1] font-['Cairo']">
          {isAr ? (
            <>
              <span className="block text-zinc-500">بناء</span>
              <span className="block text-white font-black">مواقع وتطبيقات</span>
            </>
          ) : (
            <>
              <span className="block text-zinc-500">Web &amp; App</span>
              <span className="block text-white font-black">Development</span>
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
