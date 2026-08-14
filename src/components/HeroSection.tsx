import React, { useEffect, useRef } from 'react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { HeroLogo3D } from './HeroLogo3D';

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
    // Full-screen from `lg` up, which is the reference's proportion rather than a preference: it
    // sets its planet at 36% of the viewport WIDE, and a sphere that size simply does not fit in a
    // 440px band. The height is what buys the room for it. `calc(100vh - 6rem)` is the viewport
    // less the floating header above, so the hero ends where the fold does and the section below
    // starts on a scroll rather than half-showing.
    //
    // Centred rather than top-padded once it is that tall: `pt-28` on a 440px hero put the copy
    // near the middle by arithmetic, and the same padding on an 800px one strands it at the top.
    <section
      ref={heroRef}
      className="relative pb-2 md:pb-6 overflow-hidden lg:min-h-[calc(100vh-6rem)] lg:flex lg:items-center"
    >
      {/* ── The mark ─────────────────────────────────────────────────────────────────────────
          NOVAIQ's own logo as real geometry, standing on a base ring (HeroLogo3D.tsx). It took
          over from the planet, which took over from `.hero-limb` — a flat CSS arc.

          `.hero-halo` below is the AMBIENT glow and is still CSS, because it never changes: a
          gradient that sits there is cheaper drawn once by the compositor than re-rasterised by a
          scene. The one that answers the hover is a different thing and lives in the scene — it
          has to stand in the same space as the mark and be occluded by it, which a div behind the
          canvas can never do. */}
      <div className="hero-halo" aria-hidden="true" />
      <HeroLogo3D />
      <div className="hero-sky" aria-hidden="true" />

      {/* ── The claim ────────────────────────────────────────────────────────────────────── */}
      {/* The top padding is the limb's clearance, not decoration: the copy has to start below the
          arc's crown or the rim runs through the headline. It is on the content rather than on the
          section because the limb is positioned against the section's own top edge — padding the
          section would move the arc down by exactly as much and change nothing. */}
      {/* Centred on a phone, aligned to the reading edge from `lg` up — which is where the globe
          moves out of the middle and off to the far side. The two go together: copy centred under
          an off-centre planet looks like neither was placed on purpose.

          `w-full` because this is now the only in-flow child of a flex container, and a flex item
          shrinks to its content unless told otherwise — without it `mx-auto` has nothing to centre
          and the whole column collapses against one edge. */}
      {/* `pt-52` on a phone is the mark's band, not decoration — see the note on `.hero-mark`
          about why the copy cannot sit on top of a lit 3D object. It drops back to 0 at `lg`, where
          the mark moves out of the column entirely and the hero centres itself instead. */}
      <div className="relative z-10 w-full nq-container pt-52 sm:pt-56 lg:pt-0 text-center lg:text-start">
        {/* 35rem = 560px, which is 38.9% of a 1440px viewport — the reference's text column, whose
            copy runs from 7% to 46% of the frame. It was `max-w-2xl` (672px, 46.7%), and the extra
            110px is what pushed the headline into the planet's half of the composition. */}
        <div className="lg:max-w-[35rem]">
        {/* One line, two tones.

            One line because splitting it stranded the verb alone above its object, which reads as a
            heading with a subtitle rather than as a single claim. `text-balance` covers the narrow
            screens where it genuinely cannot fit, splitting it evenly instead of leaving one
            orphaned word behind.

            Two tones rather than an underline: the words themselves carry the emphasis instead of a
            rule drawn beneath them. The quiet half stays at zinc-500.

            That measures 4.3:1 on the black ground, and the note here used to claim ~7:1, which was
            simply wrong — worth stating rather than quietly correcting, because the number is what
            the next person will trust. It passes: at 4.4rem this is WCAG "large text", whose floor
            is 3:1, not the 4.5:1 that applies to body copy. It is also BETTER than it was — on the
            old navy ground the same grey came to 4.1:1, since a tinted dark ground is lighter than
            a black one. If this tone is ever reused at body size it will need to move to zinc-400. */}
        <h1 className="text-4xl sm:text-6xl lg:text-[4.4rem] font-extrabold tracking-tight leading-[1.1] font-['Cairo'] text-balance">
          {isAr ? (
            <>
              <span className="text-zinc-500">بناء</span>{' '}
              <span className="text-white font-black">مواقع وتطبيقات</span>
            </>
          ) : (
            <>
              <span className="text-zinc-500">Web &amp; App</span>{' '}
              <span className="text-white font-black">Development</span>
            </>
          )}
        </h1>

        {/* Narrower than the headline above it, deliberately and per the reference — its sub runs
            to 31% of the frame where its headline runs to 46%. A supporting line set to the same
            measure as the claim reads as a second claim; stepping it in says which is which. */}
        <p className="mt-6 mx-auto lg:mx-0 max-w-2xl lg:max-w-md text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {isAr
            ? 'نحن في NOVAIQ نبتكر منصات رقمية فائقة السرعة والأمان. تصفح معرض قوالبنا الجاهزة لشركتك، أو تواصل معنا لصياغة نظام خاص ومخصص يلبي احتياجاتك بدقة واحترافية متكاملة.'
            : 'At NOVAIQ, we build high-performance, secure digital platforms. Explore our ready-made templates for your business, or contact us to build a custom application tailored exactly to your needs.'}
        </p>

        {/* Two buttons, which the single-CTA note that used to live here argued against — and the
            objection it raised was the right one: a pair of equally weighted buttons makes the
            visitor decide something before they know enough to decide it. These are not equally
            weighted. They are two different destinations at two different levels of commitment —
            browse the catalogue, or start a project — and the surfaces say which is which.

            Both wear `.filter-pill-btn` now, the same object as ProjectCtaButton and the templates
            toolbar: the white body that inverts to black, the 1.03 swell on hover, the 0.98 press,
            and the 2px conic ring rolling round the outline. They were on `.nq-btn`, which is the
            site's OTHER button family — it has the beam but none of the motion, so the hero's two
            controls sat dead while every other button on the page moved under the pointer.

            `relative` is not decoration: `.filter-pill-btn` brings `isolation: isolate` but not a
            position, and the beam is `position: absolute; inset: 0`, so without it the ring hangs
            off the nearest positioned ancestor instead of the button. (`.nq-btn` supplied the
            position itself, which is exactly why this is easy to drop when converting.) */}
        <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3">
          <button
            type="button"
            onClick={onStart}
            className="filter-pill-btn filter-pill-btn--ghost relative px-6 py-3 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="filter-pill-beam" aria-hidden="true" />
            <span>{isAr ? 'شاهد القوالب' : 'View templates'}</span>
          </button>

          <button
            type="button"
            onClick={onRequestProject}
            className="filter-pill-btn relative ps-7 pe-2 py-2 rounded-full font-extrabold text-sm inline-flex items-center justify-center gap-3 cursor-pointer"
          >
            <span className="filter-pill-beam" aria-hidden="true" />
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
      </div>
    </section>
  );
};
