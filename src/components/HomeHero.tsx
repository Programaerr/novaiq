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
      // The full first screen, pulled up behind the floating (transparent) Navbar: `<main>`'s
      // padding reserves the nav band + gap, so without a matching negative margin this section
      // would start below that padding and leave an empty strip between the navbar and the video.
      // This margin cancels it, the video's `absolute inset-0` then runs from the very top of the
      // viewport and reads as sitting behind the navbar instead of leaving a gap above it.
      // `svh` rather than `vh` so a phone's collapsing address bar cannot make this taller than the
      // screen it is meant to match.
      style={{
        minHeight: '100svh',
        marginTop: 'calc(-1 * (var(--nav-bottom, 74px) + var(--content-gap, 0.75rem)))',
      }}
      className="relative flex flex-col overflow-hidden"
    >
      {/* ── Backdrop ────────────────────────────────────────────────────────────────────────
          A flat ground under the video, so a slow network or a blocked CDN leaves a dark section
          rather than a white hole. */}
      <div className="absolute inset-0" style={{ background: GROUND }} aria-hidden="true" />

      {/* Sized so the SPHERE fits the screen, not so the frame does.
          `h-full object-cover` fills the section, which on a portrait phone means the shorter
          dimension drives the scale: a 16:9 source on a 390x844 screen renders about 1500px wide
          and is cropped to 390, so the ball — roughly three quarters of the frame's height — comes
          out 590px across on a 390px screen and all that survives the crop is a patch of its
          middle. The backdrop stopped reading as a sphere at all and became texture.
          Cover only works out when the viewport is wider than about 0.75 of its height, which
          tablets and every desktop clear and no phone does.
          So the height is capped at 115vw: below that ratio the video becomes a centred band
          scaled to the WIDTH, the ball lands at ~86% of the screen and is whole, and the crop
          moves to the empty black sides where there is nothing to lose. At tablet size and up
          `100%` is the smaller of the two and this changes nothing. */}
      <video
        ref={videoRef}
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-[min(100%,115vw)] object-cover"
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
      {/* Stacked, the two blocks are ANCHORED to the ends of the screen rather than sharing the
          slack out between them.

          Centring was the first thing tried and it left 180px of dead band above the copy and
          another 180 below the cards on a tablet — a third of the screen empty with both blocks
          afloat in the middle of it. Distributing evenly fixed the symptom and kept the cause: an
          even split hands each gap the same THIRD of whatever is left over, so every gap grows and
          shrinks with the screen. Measured across phones that meant 11px between the navbar and
          the eyebrow at 360x740 — nearly touching — against 74px at 499x928, and a 142px void
          under the last card on the taller one. Neither number was chosen; both fell out of the
          screen height.

          So the two ends are pinned instead. The copy starts a FIXED 1.75rem below wherever the
          floating navbar actually ends (`--nav-bottom` is measured at runtime, so this holds at
          every width without a per-breakpoint offset), and the cards end a bottom margin that
          scales gently with the screen rather than with the leftover. Everything left over lands
          in the middle — which is not dead space here, it is the one part of the frame where the
          backdrop is unobstructed, and it is the same hole the empty middle column keeps open on
          desktop. `svh` for the same reason the section uses it: a collapsing address bar must not
          change the margin.

          From `lg` the two are side by side in one row, so there is nothing to distribute and it
          goes back to centred with even padding. */}
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
      <div className="relative z-10 flex-1 nq-container pt-[calc(var(--nav-bottom,74px)+1.75rem)] pb-[9svh] lg:pt-16 lg:pb-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center content-between lg:content-center">
          <div className="lg:col-span-5">
            <span className="block text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase" style={{ color: ACCENT }}>
              {isAr ? 'نحن نصمم' : 'We design'}
            </span>

            {/* Display type: heavy, tight and uppercase, set at a leading under 1 so the lines lock
                into a block rather than reading as a paragraph. `text-balance` covers the narrow
                screens where a line cannot fit.

                Phone sizing is a clamp on `vw` rather than one fixed value, because a headline
                picked to look right on a 430px screen is oversized on a 360px one — same pixels,
                a fifth less room. Tying it to the width keeps the same PROPORTION across every
                phone and the bounds stop it running away at either end. */}
            <h1 className="mt-4 sm:mt-5 text-[clamp(1.8rem,7.8vw,2.35rem)] sm:text-5xl lg:text-[4.6rem] font-black uppercase leading-[0.96] tracking-tight text-white font-['Cairo'] text-balance">
              {isAr ? 'تجارب رقمية' : 'Digital experiences'}
            </h1>

            <p className="mt-4 sm:mt-6 max-w-md text-[0.8125rem] sm:text-sm text-white/70 leading-relaxed">
              {isAr
                ? 'نصنع في NOVAIQ تجارب رقمية غامرة تزيد التفاعل، تلهم الإبداع، وتوصل نتائج حقيقية لشركتك.'
                : 'At NOVAIQ we craft immersive digital experiences that drive engagement, inspire creativity and deliver real results.'}
            </p>

            <button
              type="button"
              onClick={onStart}
              // Smaller on a phone, but not below the 44px a finger needs: the disc drops to 2rem
              // and the padding to 0.375rem, which lands the whole pill at exactly 44px tall.
              className="mt-7 sm:mt-9 inline-flex items-center gap-2.5 sm:gap-3 ps-6 sm:ps-7 pe-1.5 sm:pe-2 py-1.5 sm:py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-[0.6875rem] sm:text-xs font-bold tracking-[0.16em] uppercase text-white hover:bg-white/10 hover:border-white/40 transition-colors cursor-pointer"
            >
              <span>{isAr ? 'شاهد أعمالنا' : 'Explore our work'}</span>
              {/* The disc is the accent and the arrow is the ground, which is the same inversion
                  `.nq-cta-badge` uses everywhere else on the site. */}
              <span
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full grid place-items-center"
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
