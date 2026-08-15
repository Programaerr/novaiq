import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Language } from '../lib/i18n';
import { HeroOrb } from './HeroOrb';

/**
 * The home page's first section: what NOVAIQ does, and the two ways in.
 *
 * ## Three things and nothing else
 *
 * A claim, a route to the work, a route to a contract. Everything the previous versions of this
 * hero carried beyond those — a second copy of the navbar, a canvas of drifting dust, a streamed
 * video of somebody else's sphere, three numbered service cards — has been taken out rather than
 * rearranged. A hero is the one screen where every extra element competes with the sentence the
 * visitor came to read.
 *
 * What survives of the services is a capability strip on the bottom rule: the same three ideas at
 * a tenth of the height, positioned where they read as a footer to the claim instead of as a
 * second column arguing with it.
 *
 * ## The two buttons are the design system's, not this file's
 *
 * `.nq-btn--ghost` exists in index.css for exactly this pair, and says so where it is defined:
 * the hero offers two ways in at two different levels of commitment, and two solid pills side by
 * side would say they are the same size of decision. Starting a project is the primary; browsing
 * the work is the low-commitment one. Both props were always on this component — until now only
 * one of them was wired to anything.
 *
 * ## The backdrop
 *
 * HeroOrb — a real object, rendered here, replacing a video that was streamed from a third
 * party's CDN. Over it sit two scrims and a vignette, and each one has a job: the copy has to
 * stay legible over a moving surface, and the surface has to stay visible in the space the copy
 * leaves. The scrim is DIRECTIONAL and follows the layout — down the copy's side on desktop,
 * top-and-bottom on a phone where the copy is above the object rather than beside it.
 */

/**
 * This section has no colours of its own. It uses the site's two, by token.
 *
 * `--nq-ground` is #000000 and `--nq-accent` is #E4E4E7 — a near-white rather than pure white,
 * because the accent is an EMPHASIS LEVEL rather than a hue and a fill already at #FFFFFF has
 * nowhere left to go on hover. Written as `var(...)` rather than copied hex so retuning the site
 * retunes this too.
 */
const GROUND = 'var(--nq-ground, #000000)';
const ACCENT = 'var(--nq-accent, #E4E4E7)';

/** Entrance stagger, in ms. Small: this is meant to be felt as the page settling, not watched. */
const STEP = 70;

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
  // The CTA arrow points "away, forward" — up and outward — so it follows the reading direction
  // the way every other directional glyph on the site does.
  const CtaArrow = isAr ? ArrowUpLeft : ArrowUpRight;

  /* Read once here rather than left to CSS, because the entrance below is an inline `animation`
     and an inline longhand cannot be overridden by a `motion-reduce:` utility — .page-in is
     unlayered, so it outranks the utilities layer whichever order they land in. Deciding it in JS
     is the version that actually honours the preference instead of appearing to. */
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  /** Staggered entrance for one element, or nothing at all if motion is not wanted. */
  const enter = (i: number): React.CSSProperties =>
    reduced ? {} : { animation: 'page-in 0.5s ease-out both', animationDelay: `${i * STEP}ms` };

  const capabilities = isAr
    ? ['تصميم واجهات', 'هوية بصرية', 'أنظمة وتطبيقات']
    : ['Interface design', 'Brand identity', 'Systems & apps'];

  return (
    <section
      id="home-hero"
      /* The full first screen, pulled up behind the floating (transparent) Navbar: `<main>`'s
         padding reserves the nav band + gap, so without a matching negative margin this section
         would start below that padding and leave an empty strip between the navbar and the
         artwork. `svh` rather than `vh` so a phone's collapsing address bar cannot make this
         taller than the screen it is meant to match. */
      style={{
        minHeight: '100svh',
        marginTop: 'calc(-1 * (var(--nav-bottom, 74px) + var(--content-gap, 0.75rem)))',
      }}
      className="relative flex flex-col overflow-hidden"
    >
      {/* A flat ground under everything, so a slow first frame leaves a dark section rather than
          a white hole. */}
      <div className="absolute inset-0" style={{ background: GROUND }} aria-hidden="true" />

      <HeroOrb flip={!isAr} />

      {/* The copy-side scrim, and it follows the layout rather than the screen. On desktop the
          copy is beside the object, so the darkening runs across from the copy's own edge and
          leaves the far side clear; on a phone the copy is above it and the strip below it, so it
          runs top and bottom instead. Getting this backwards costs either a headline over a
          moving highlight or an object nobody can see. */}
      <div
        className="absolute inset-0 lg:hidden"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 26%, rgba(0,0,0,0.05) 46%, rgba(0,0,0,0.45) 82%, rgba(0,0,0,0.9) 100%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          background: `linear-gradient(to ${isAr ? 'left' : 'right'}, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.62) 30%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0) 72%)`,
        }}
        aria-hidden="true"
      />

      {/* An ELLIPSE, not a linear fade. A straight gradient across a full-bleed backdrop leaves a
          visible horizontal edge, which reads as a seam in the page; a radial one has no edge to
          see and darkens exactly the corners where the object's rim light would otherwise run
          into the section boundary. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 78% 72% at 50% 50%, transparent 30%, rgba(0,0,0,0.45) 62%, rgba(0,0,0,0.9) 100%)',
        }}
        aria-hidden="true"
      />

      {/* ── The claim ───────────────────────────────────────────────────────────────────────
          The grid IS the flex child, with no wrapper between them. Nested one level down it would
          need a percentage height to know how tall to be, and a percentage height inside a
          flex-derived box does not resolve — it collapses to its content and stops distributing.

          Top padding clears the floating navbar by a FIXED 1.75rem, measured from `--nav-bottom`
          at runtime rather than guessed per breakpoint. `content-start` below `lg` because the
          object owns the middle of the screen and the strip owns the bottom; from `lg` the copy
          is beside the object and centres in its own column. */}
      <div className="relative z-10 flex-1 nq-container pt-[calc(var(--nav-bottom,74px)+1.75rem)] lg:pt-16 pb-8 lg:pb-16 grid grid-cols-1 lg:grid-cols-12 content-start lg:content-center">
        <div className="lg:col-span-6 xl:col-span-5">
          {/* Availability, not a slogan. It is the one line here that is time-sensitive and
              therefore the one that reads as a real company rather than a template. */}
          <span
            className="inline-flex items-center gap-2 rounded-full ps-2 pe-3.5 py-1.5 text-[0.65rem] sm:text-[0.7rem] font-bold tracking-[0.2em] uppercase text-white/80 glass-bar glass-bar--blur"
            style={enter(0)}
          >
            <span className="relative flex w-1.5 h-1.5" aria-hidden="true">
              <span
                className="absolute inset-0 rounded-full opacity-70 animate-ping motion-reduce:animate-none"
                style={{ background: ACCENT }}
              />
              <span className="relative w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
            </span>
            {isAr ? 'متاح لمشاريع جديدة' : 'Open for new projects'}
          </span>

          {/* Display type: heavy and tight, but NOT at the sub-1 leading Latin display type takes.
              Arabic sets its own limit here — نصمّم carries a shadda above the line and تجارب a
              descender below it, so at 0.98 the two lines physically collided. 1.14 is the point
              where they stop touching at every size this renders at, and it is set here rather
              than left to the font's default because the default is looser than a headline wants.

              Phone sizing is a clamp on `vw` rather than one fixed value, because a headline
              picked to look right on a 430px screen is oversized on a 360px one — same pixels, a
              fifth less room. */}
          <h1
            className="mt-5 sm:mt-6 text-[clamp(2rem,8.4vw,2.6rem)] sm:text-5xl lg:text-[4.2rem] xl:text-[4.8rem] font-black leading-[1.14] tracking-tight font-['Cairo'] text-balance"
            style={enter(1)}
          >
            <span className="block text-white">{isAr ? 'نصمّم ونبني' : 'We design and build'}</span>
            {/* The second line carries the accent, which is the whole hierarchy of the headline:
                one thing said in two weights beats two things said in one. */}
            <span className="block" style={{ color: ACCENT }}>
              {isAr ? 'تجارب رقمية' : 'digital experiences'}
            </span>
          </h1>

          <p
            className="mt-5 sm:mt-6 max-w-lg text-[0.8125rem] sm:text-[0.95rem] text-white/70 leading-relaxed"
            style={enter(2)}
          >
            {isAr
              ? 'من الهوية للواجهة للنظام اللي وراها. نشتغل مع الشركات اللي تريد موقعاً يشتغل ويبيع، مو بس يبيّن حلو.'
              : 'From the brand to the interface to the system behind it. We work with companies that want a site that performs, not just one that looks the part.'}
          </p>

          <div className="mt-7 sm:mt-9 flex flex-wrap items-center gap-3" style={enter(3)}>
            <button
              type="button"
              onClick={onRequestProject}
              className="nq-btn nq-btn--solid group ps-6 pe-1.5 py-1.5 rounded-full flex items-center gap-3 text-xs sm:text-sm font-extrabold cursor-pointer"
            >
              <span className="nq-btn-beam" aria-hidden="true" />
              <span>{isAr ? 'ابدأ مشروعك' : 'Start your project'}</span>
              {/* The disc takes the button's two colours swapped over, so it stays inverted
                  against its own body through the hover flip — see .nq-cta-badge. */}
              <span className="nq-cta-badge" aria-hidden="true">
                <CtaArrow className="w-4 h-4" strokeWidth={2.6} />
              </span>
            </button>

            <button
              type="button"
              onClick={onStart}
              // `min-h-11` rather than relying on the padding: at the phone's smaller type this
              // measured 40px tall, and 44 is the floor for something a finger has to hit.
              className="nq-btn nq-btn--ghost min-h-11 px-6 py-3 rounded-full inline-flex items-center text-xs sm:text-sm font-bold cursor-pointer"
            >
              <span className="nq-btn-beam" aria-hidden="true" />
              {isAr ? 'شاهد أعمالنا' : 'See our work'}
            </button>
          </div>
        </div>
      </div>

      {/* ── The bottom rule ─────────────────────────────────────────────────────────────────
          A real flex child at the end of the section rather than a row inside the grid, which is
          what pins it to the bottom of the screen at every height without any space having to be
          distributed to put it there. */}
      <div className="relative z-10 nq-container pb-5 sm:pb-7" style={enter(4)}>
        <div className="border-t border-white/12 pt-4 sm:pt-5 flex items-center justify-between gap-4">
          <ul className="flex items-center">
            {capabilities.map((c, i) => (
              <li
                key={c}
                /* `border-s` rather than `border-l`: the logical side flips with the document
                   direction on its own, so this stays a divider BETWEEN items in both languages
                   instead of landing on the outside edge in one of them. */
                className={`text-[0.6rem] sm:text-[0.7rem] font-bold tracking-[0.14em] sm:tracking-[0.2em] uppercase text-white/55 px-3 sm:px-5 first:ps-0 ${
                  i > 0 ? 'border-s border-white/12' : ''
                }`}
              >
                {c}
              </li>
            ))}
          </ul>

          {/* Decorative: the section below is reachable by scrolling whether or not this is here,
              so it is hidden from assistive technology rather than announced as a control. */}
          <div
            className="hidden sm:flex items-center gap-2 text-[0.6rem] font-bold tracking-[0.2em] uppercase text-white/40 shrink-0"
            aria-hidden="true"
          >
            <span>{isAr ? 'اكتشف أكثر' : 'Scroll'}</span>
            <ArrowDown className="w-3.5 h-3.5 animate-bounce motion-reduce:animate-none" />
          </div>
        </div>
      </div>
    </section>
  );
};
