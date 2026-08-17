import React from 'react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Language } from '../lib/i18n';
import { HeroWaves } from './HeroWaves';

/**
 * The home page's container: a sand-coloured screen with a swell of tiles running across it, and a
 * single panel holding the name and the two ways in.
 *
 * ## Built from the wireframe, including its colours
 *
 * #D5BDAC for the ground and #8295CF for the panel were specified directly, and they are a
 * deliberate break from the site's monochrome — every other page here is black with a near-white
 * accent. That is a design decision rather than an oversight, so the two values live at the top of
 * this file as named constants and nowhere else, which keeps the departure to one section and one
 * place to change it back.
 *
 * ## The header is not in this file
 *
 * The wireframe shows the bar sitting inside the container, and it does: the shared Navbar is
 * fixed and floats above the page, and this section is pulled up behind it so the sand runs to the
 * top edge of the screen underneath. There is no second navbar here — an earlier version of this
 * hero carried a hand-kept copy of it and a merge is exactly where two copies of one navigation
 * drift apart and stop compiling.
 *
 * ## Contrast decided the one place this diverges from the drawing
 *
 * The wireframe shows two identical white pills. White TEXT on #8295CF measures 2.97:1, which is
 * under the 4.5:1 a body-sized label needs, so both buttons carry dark ink on a light body instead
 * of the second one being an outline in white. They still differ in weight — solid against
 * translucent — so the hierarchy the drawing shows survives; it is carried by fill rather than by
 * a colour that could not be read.
 */

/* ── The wireframe's palette ────────────────────────────────────────────────────────────── */

/** The ground the whole section is painted on. */
const SAND = '#D5BDAC';
/** The panel. */
const PERIWINKLE = '#8295CF';
/** One ink for everything on the light surfaces, the panel included. Near-black rather than black:
    pure black on a mid-tone reads as a hole punched in it. */
const INK = '#101322';

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
      /* The full first screen, pulled up behind the floating Navbar: `<main>`'s padding reserves
         the nav band and gap, so without a matching negative margin the sand would start below it
         and leave a black strip across the top. `svh` rather than `vh` so a phone's collapsing
         address bar cannot make this taller than the screen it is meant to match. */
      style={{
        background: SAND,
        minHeight: '100svh',
        marginTop: 'calc(-1 * (var(--nav-bottom, 74px) + var(--content-gap, 0.75rem)))',
      }}
      className="relative flex flex-col overflow-hidden"
    >
      <HeroWaves />

      {/* The panel sits in the container's own column rather than against the screen edge, so it
          lines up with the navbar above it and with every section below — both read --nq-container.

          Top padding clears the floating navbar by a fixed 1.25rem, measured from `--nav-bottom` at
          runtime rather than guessed per breakpoint. */}
      <div className="relative z-10 flex-1 nq-container pt-[calc(var(--nav-bottom,74px)+1.25rem)] pb-6 sm:pb-10 flex items-center">
        <div
          /* `mr-auto` is PHYSICAL, and deliberately so. The page is RTL, so a logical `me-auto`
             would put this panel on the right — which is normally the correct instinct and is
             wrong here: the wireframe places it on the left, and the composition is a picture
             rather than a reading order. The tile field has to be given the wider side, and which
             side that is does not change with the language. */
          className="w-full mr-auto lg:w-[43%] lg:max-w-[34rem] min-h-[54svh] lg:min-h-[66vh] rounded-[1.5rem] p-5 sm:p-7 flex flex-col"
          /* A shadow, because the panel is a flat fill sitting on a busy field and without one the
             two planes fight for the same depth. Warm and near-black rather than neutral grey: a
             grey shadow on sand greys the sand under it, which is the tell that a shadow was
             picked from a palette instead of from the surface it falls on. */
          style={{
            background: PERIWINKLE,
            boxShadow: '0 26px 64px -24px rgba(48, 32, 20, 0.5)',
          }}
        >
          {/* The card, centred in whatever height the panel has left above the buttons — the
              wireframe puts it high and the buttons on the floor, which is what this does at every
              screen height without a single fixed offset. */}
          <div className="flex-1 grid place-items-center py-8 sm:py-10">
            <div
              /* No frame around the name — it sits directly on the panel. The lighter inset card
                 this started with drew a box around the one thing on the screen that does not need
                 one: a wordmark is already a shape, and putting it in a second rectangle inside a
                 rectangle reads as a placeholder rather than as a brand.
                 The ink stays near-black rather than white for a measured reason: white on
                 #8295CF is 2.97:1, under the 4.5:1 a body-sized line needs, where this ink is
                 6.4:1 on the same blue.

                 The book animation stays on this element, and the origin with it. It is declared
                 in index.css so a reduced-motion preference switches it off in the one place the
                 rest of the site's motion is switched off from. */
              className={`nq-book ${isAr ? 'nq-book--rtl' : ''} w-full max-w-[22rem] text-center`}
            >
              <span
                className="block text-[2.1rem] sm:text-[2.6rem] font-black tracking-[0.06em] leading-none"
                style={{ color: INK }}
              >
                NOVAIQ
              </span>
              <p
                className="mt-3 text-[0.8rem] sm:text-sm font-bold leading-relaxed"
                style={{ color: INK, opacity: 0.72 }}
              >
                {isAr
                  ? 'استوديو تصميم وبرمجة — نبني مواقع وأنظمة تشتغل لشركتك.'
                  : 'A design and engineering studio building sites and systems that work.'}
              </p>
            </div>
          </div>

          {/* The two ways in, at two levels of commitment: the solid one starts a project, the
              lighter one goes to the work. */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRequestProject}
              className="min-h-11 ps-5 pe-1.5 py-1.5 rounded-full inline-flex items-center gap-2.5 text-xs sm:text-sm font-extrabold transition-colors duration-200 cursor-pointer hover:bg-white"
              style={{ background: 'rgba(255,255,255,0.92)', color: INK }}
            >
              <span>{isAr ? 'ابدأ مشروعك' : 'Start your project'}</span>
              <span
                className="w-8 h-8 rounded-full grid place-items-center shrink-0"
                style={{ background: INK, color: '#FFFFFF' }}
                aria-hidden="true"
              >
                <CtaArrow className="w-4 h-4" strokeWidth={2.6} />
              </span>
            </button>

            <button
              type="button"
              onClick={onStart}
              className="min-h-11 px-6 py-3 rounded-full inline-flex items-center text-xs sm:text-sm font-bold transition-colors duration-200 cursor-pointer hover:bg-white/75"
              style={{ background: 'rgba(255,255,255,0.55)', color: INK }}
            >
              {isAr ? 'شاهد أعمالنا' : 'See our work'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
