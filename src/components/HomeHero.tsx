import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Language } from '../lib/i18n';

/**
 * The home page's first section: the claim and the work.
 *
 * ## No header of its own any more
 *
 * This briefly carried a full duplicate of the shared Navbar — its own logo bar, links, language
 * toggle and mobile drawer — because App.tsx hid the real bar on `home` and let this section sit
 * directly on the video backdrop instead. That duplication was the wrong trade: a second, hand-kept
 * copy of the navbar is a second place for every future nav change to be applied, and a merge is
 * exactly where two copies of the same thing drift apart and stop compiling.
 *
 * The shared Navbar now renders on every page, including this one — see App.tsx, which no longer
 * special-cases `home`. Its floating pill sits fixed above the video regardless, so the "sitting on
 * the backdrop" look is unchanged; what changed is that there is only one navbar to maintain.
 *
 * ## The backdrop
 *
 * A video and a vignette, and nothing else — a canvas of drifting dust motes sat over both and has
 * been removed. The video is drained of colour rather than used as shot: it is a red sphere, and
 * this site is monochrome, so greyscale puts it in the same palette as everything else.
 *
 * The vignette is an ellipse rather than a linear fade. A straight gradient leaves a visible
 * horizontal edge across the frame, which is the one thing a backdrop must never do.
 *
 * The video stops under `prefers-reduced-motion`. It is now the only thing in this section that
 * moves at all.
 */

/**
 * This section has no colours of its own. It uses the site's two, by token.
 *
 * `--nq-ground` is #000000 and `--nq-accent` is #E4E4E7 — a near-white rather than pure white,
 * because the accent is an EMPHASIS LEVEL rather than a hue and a fill already at #FFFFFF has
 * nowhere left to go on hover. Between them the whole site is monochrome, and it had violet in it
 * only here, which is exactly what made this section read as a different page.
 *
 * Written as `var(...)` rather than copied hex so retuning the site retunes this too — a colour
 * typed into thirty components is a colour the site is stuck with.
 */
const GROUND = 'var(--nq-ground, #000000)';
const ACCENT = 'var(--nq-accent, #E4E4E7)';

interface HomeHeroProps {
  language?: Language;
  /** Into the template gallery — the lighter of the two ways in. */
  onStart?: () => void;
  /** Straight to the contract form, for someone who already knows they want something built. */
  onRequestProject?: () => void;
}

/* ── The section ──────────────────────────────────────────────────────────────────────────── */

export const HomeHero: React.FC<HomeHeroProps> = ({
  language = 'ar',
  onStart,
  onRequestProject,
}) => {
  const isAr = language === 'ar';
  // The CTA arrow points "away, forward" — up and outward — so it follows the reading direction the
  // way every other directional glyph on the site does.
  const CtaArrow = isAr ? ArrowUpLeft : ArrowUpRight;

  const videoRef = useRef<HTMLVideoElement>(null);

  // The backdrop holds still for anyone who asked for that. It is the only thing left in this
  // section that moves at all.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const v = videoRef.current;
      if (!v) return;
      if (mq.matches) v.pause();
      else void v.play().catch(() => {});
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const cards = [
    {
      n: '01',
      t: isAr ? 'تصميم إبداعي' : 'Creative design',
      d: isAr ? 'واجهات تُبنى لتُقنع، مو بس تُعجب.' : 'Interfaces built to convince, not only to please.',
    },
    {
      n: '02',
      t: isAr ? 'هوية واستراتيجية' : 'Brand strategy',
      d: isAr ? 'هوية تخليك تنعرف من أول نظرة.' : 'A brand that is recognised at first glance.',
    },
    {
      n: '03',
      t: isAr ? 'حلول رقمية' : 'Digital solutions',
      d: isAr ? 'أنظمة تشتغل بهدوء وتكبر معك.' : 'Systems that run quietly and grow with you.',
    },
  ];

  return (
    <section
      id="home-hero"
      // The viewport less the floating Navbar's own band — the same clearance every other full-
      // height section on the site subtracts, now that this one sits under that bar again instead
      // of carrying a copy of it. `svh` rather than `vh` so a phone's collapsing address bar cannot
      // make this taller than the screen it is meant to match.
      style={{ minHeight: 'calc(100svh - var(--nav-bottom, 74px) - var(--content-gap, 0.75rem))' }}
      className="relative flex flex-col overflow-hidden"
    >
      {/* ── Backdrop ────────────────────────────────────────────────────────────────────────
          A flat ground under the video, so a slow network or a blocked CDN leaves a dark section
          rather than a white hole. */}
      <div className="absolute inset-0" style={{ background: GROUND }} aria-hidden="true" />

      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        // Drained of colour entirely, not recoloured. The source is a red sphere; rotating its hue
        // to violet only swapped one colour the site does not have for another, and a violet
        // backdrop is precisely what made this section look like it belonged to a different page.
        // Greyscale puts it in the site's own monochrome, where the only thing separating it from
        // the ground is value. Contrast is lifted a little because desaturating a mid-red flattens
        // it toward one grey.
        style={{ filter: 'grayscale(1) contrast(1.18) brightness(0.52)' }}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='%23000000'/%3E%3C/svg%3E"
        aria-hidden="true"
      >
        <source
          src="https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/bg-red-ball.mp4"
          type="video/mp4"
        />
      </video>

      {/* An ELLIPSE, not a linear fade. A straight gradient across a full-bleed backdrop leaves a
          visible horizontal edge, which reads as a seam in the page; a radial one has no edge to
          see and darkens exactly where the copy needs contrast. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 68% 68% at 50% 50%, transparent 22%, rgba(0,0,0,0.42) 50%, rgba(0,0,0,0.82) 75%, rgba(0,0,0,0.98) 100%)',
        }}
        aria-hidden="true"
      />


      {/* ── The content ─────────────────────────────────────────────────────────────────── */}
      {/* Stacked, the two blocks are pushed APART to the ends of the screen rather than centred as
          one lump. Centred, they measured 574px of content in 934px of section on a tablet — 180px
          of dead band above and another 180 below, a third of the screen empty, with the copy and
          the cards floating in the middle of it. Padding cannot fix that: the leftover space is
          redistributed by the centring, so trimming the padding just hands the same gap back.
          Growing the content is the only real lever, and `content-between` is that lever costing
          nothing — the copy takes the top, the cards take the bottom, and the free space goes
          between them where it reads as breathing room instead of as a margin.

          From `lg` the two are side by side in one row, so there is nothing to distribute and it
          goes back to centred. */}
      {/* The grid IS the flex child, with no wrapper between them, and that is what makes the
          distribution work at all. Nested one level down it needed `h-100%` to know how tall to be,
          and a percentage height inside a flex-derived box does not resolve — the grid stayed at
          its content height of 535px inside a 766px parent, so there was no free space for
          `space-between` to hand out and the cards never moved. As the flex child itself it takes
          the height directly.

          Twelve columns from `lg`, split 5 / 3 / 4. The middle three are EMPTY on purpose — that is
          the gap the sphere behind shows through, and it is the whole reason the copy sits in two
          side columns rather than one centred block. Below `lg` there are no columns to keep clear,
          so it collapses to a single stack. */}
      <div className="relative z-10 flex-1 nq-container py-8 sm:py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center content-between lg:content-center">
          <div className="lg:col-span-5">
            <span className="block text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase" style={{ color: ACCENT }}>
              {isAr ? 'نحن نصمم' : 'We design'}
            </span>

            {/* Display type: heavy, tight and uppercase, set at a leading under 1 so the lines lock
                into a block rather than reading as a paragraph. `text-balance` covers the narrow
                screens where a line cannot fit. */}
            <h1 className="mt-5 text-[2.6rem] sm:text-6xl lg:text-[4.6rem] font-black uppercase leading-[0.96] tracking-tight text-white font-['Cairo'] text-balance">
              {isAr ? 'تجارب رقمية' : 'Digital experiences'}
            </h1>

            <p className="mt-6 max-w-md text-sm text-white/70 leading-relaxed">
              {isAr
                ? 'نصنع في NOVAIQ تجارب رقمية غامرة تزيد التفاعل، تلهم الإبداع، وتوصل نتائج حقيقية لشركتك.'
                : 'At NOVAIQ we craft immersive digital experiences that drive engagement, inspire creativity and deliver real results.'}
            </p>

            <button
              type="button"
              onClick={onStart}
              className="mt-9 inline-flex items-center gap-3 ps-7 pe-2 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-xs font-bold tracking-[0.16em] uppercase text-white hover:bg-white/10 hover:border-white/40 transition-colors cursor-pointer"
            >
              <span>{isAr ? 'شاهد أعمالنا' : 'Explore our work'}</span>
              {/* The disc is the accent and the arrow is the ground, which is the same inversion
                  `.nq-cta-badge` uses everywhere else on the site. */}
              <span
                className="w-9 h-9 rounded-full grid place-items-center"
                style={{ background: ACCENT, color: '#000000' }}
                aria-hidden="true"
              >
                <CtaArrow className="w-4 h-4" strokeWidth={2.6} />
              </span>
            </button>
          </div>

          {/* The clear middle. It holds no content at any size — it exists to keep the backdrop's
              centre unobstructed. */}
          <div className="hidden lg:block lg:col-span-3" aria-hidden="true" />

          <div className="lg:col-span-4">
            <ul className="flex flex-col">
              {cards.map((c, i) => (
                <li
                  key={c.n}
                  className={`py-5 sm:py-6 ${i > 0 ? 'border-t border-white/12' : ''} flex gap-4 sm:gap-5`}
                >
                  <span className="text-xs font-bold tracking-widest pt-1" style={{ color: ACCENT }}>
                    {c.n}
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold tracking-[0.1em] uppercase text-white">
                      {c.t}
                    </h2>
                    <p className="mt-1.5 text-xs sm:text-sm text-white/60 leading-relaxed">{c.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
      </div>
    </section>
  );
};
