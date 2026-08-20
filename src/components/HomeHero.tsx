import React from 'react';
import { ArrowUpLeft } from 'lucide-react';
import { Language } from '../lib/i18n';
import { INK, PAPER, PERIWINKLE, SAND } from '../lib/homePalette';
import { HERO_FADE, TileField } from './TileField';

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

/* The wireframe's palette, now shared with every section below this one — see lib/homePalette.ts
   for why it lives in one file rather than being retyped per component. */

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




  return (
    <section
      id="home-hero"
      /* The full first screen, pulled up behind the floating Navbar: `<main>`'s padding reserves
         the nav band and gap, so without a matching negative margin the sand would start below it
         and leave a black strip across the top. `svh` rather than `vh` so a phone's collapsing
         address bar cannot make this taller than the screen it is meant to match. */
      style={{
        /* Sand for all but the last band of the screen, then a ramp into the paper of the section
           below. The canvas above this is transparent, so this is the ground the cubes stand on —
           and they are breaking up across exactly the same band (HERO_FADE.lo, one value, shared).
           The two together are the edge: blocks thinning out over ground that is already becoming
           the next section, so there is no line anywhere for a line to be wrong at. */
        background: `linear-gradient(to bottom, ${SAND} ${100 - HERO_FADE.lo * 100}%, ${PAPER} 100%)`,
        minHeight: '100svh',
        marginTop: 'calc(-1 * (var(--nav-bottom, 74px) + var(--content-gap, 0.75rem)))',
      }}
      className="relative flex flex-col overflow-hidden"
    >
      <TileField />

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
          /* `rounded-[1.5rem]` is repeated inside the curtain keyframes in index.css, which clip
             to the same radius so the corners do not square off mid-animation. The two have to
             agree. */
          /* The cap steps up on an ultrawide with the container it sits in. 34rem in a 100rem
             column is a 544px slab beside 1000px of field: not a panel on a background any more,
             a bookmark. 42rem holds the same share of the column the 34rem cap holds of 80rem. */
          className="nq-curtain w-full mr-auto lg:w-[43%] lg:max-w-[34rem] uw:max-w-[42rem] min-h-[54svh] lg:min-h-[66vh] rounded-[1.5rem] p-5 sm:p-7 flex flex-col relative overflow-hidden"
          /* A shadow, because the panel is a flat fill sitting on a busy field and without one the
             two planes fight for the same depth. Tinted navy rather than near-black: a dark shadow
             on sand reads as a black "veil" under the panel, which is the tell that a shadow was
             picked from a palette instead of from the surface it falls on. */
          style={{
            boxShadow: '0 26px 64px -24px rgba(16, 19, 34, 0.38)',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center px-5 sm:px-7 py-8 sm:py-10 rounded-[1.5rem]"
            style={{ background: PERIWINKLE }}
          >
            <div
              className="w-full max-w-[22rem] uw:max-w-[27rem] text-center"
            >
              <span
                className="block text-[2.1rem] sm:text-[2.6rem] uw:text-[3.2rem] font-black tracking-[0.06em] leading-none"
                style={{ color: INK }}
              >
                NOVAIQ
              </span>
              <p
                className="mt-3 text-[0.8rem] sm:text-sm uw:text-base font-bold leading-relaxed"
                style={{ color: INK, opacity: 0.72 }}
              >
                {isAr
                  ? 'استوديو تصميم وبرمجة — نبني مواقع وأنظمة تشتغل لشركتك.'
                  : 'A design and engineering studio building sites and systems that work.'}
              </p>
            </div>
          </div>

          {/* The two ways in, at two levels of commitment: the solid one starts a project, the
              lighter one goes to the work.

              A SIBLING of the text block rather than a child of it, and that is what actually
              lowers them. Inside the group, the whole thing is centred as one object, so every
              pixel of margin added under the text pushed the buttons down and lifted the text by
              the same amount — the gap grew and the pair stayed put. Out here the text centres in
              whatever height is left above, the buttons sit on the panel's floor, and that floor is
              as low as they go without leaving the panel.

              `flex-row-reverse` in English, and it is there to STOP the mirroring rather than to
              add any. A normal flex row starts at the inline start, which is the right in Arabic
              and the left in English, so the same markup put the primary button on opposite sides
              in the two languages — the one thing in this section that flipped, in a composition
              where the panel itself is pinned physically left either way. Reversing the row in
              English lands both buttons in the same physical place, and the arrow below points the
              same way for the same reason. */}
          <div
            className={`relative z-10 mt-auto flex ${isAr ? '' : 'flex-row-reverse'} flex-wrap items-center justify-center gap-3`}
          >
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
                {/* One glyph for both languages. The badge sits at the same physical end of the
                    button in either (see the row above), so an arrow that flipped with the language
                    would be pointing back into the label half the time. */}
                <ArrowUpLeft className="w-4 h-4" strokeWidth={2.6} />
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
