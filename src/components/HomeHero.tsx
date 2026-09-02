import React from 'react';
import { ArrowUpLeft } from 'lucide-react';
import { Language } from '../lib/i18n';
import { channels, ORANGE, WHITE, PAPER } from '../lib/homePalette';
import { HERO_FADE, TileField } from './TileField';
import { NqButton } from './ui/NqButton';

/**
 * The home page's container: a WARM WHITE screen with a swell of tiles running across it, and a
 * single panel holding the name and the two ways in.
 *
 * ## The panel is Obsidian again — third pass, and it's where the brief's "black" now lives
 *
 * The ground is WHITE (`#F7F7F5`), the site's light-neutral. The panel went Obsidian → Orange →
 * Obsidian across three rounds of feedback: this brief's own written brand system reserved
 * Orange strictly for things being pressed or pointed at; the client then asked for a full-
 * strength Orange panel anyway; the client's third pass asks for a white ground with black
 * confined to secondary text — read as, the loudest brand moment on the page is exactly the
 * bounded panel that should carry the confined dark neutral, with white primary text on it. See
 * homePalette.ts for the contrast consequences.
 *
 * ## The header is not in this file
 *
 * The wireframe shows the bar sitting inside the container, and it does: the shared Navbar is
 * fixed and floats above the page, and this section is pulled up behind it so WHITE runs to the
 * top edge of the screen underneath. There is no second navbar here — an earlier version of this
 * hero carried a hand-kept copy of it and a merge is exactly where two copies of one navigation
 * drift apart and stop compiling.
 *
 * ## Contrast decided the panel's own text, and it flips back with the panel
 *
 * White on Signal Orange measured a failing 2.87:1; white on Obsidian is the opposite case, comfortably
 * past 18:1. The wordmark and tagline are WHITE again now that the panel is dark. The two buttons'
 * `glass` tone was recomputed the same way — see nqSurface.tsx's own note on it.
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




  return (
    <section
      id="home-hero"
      /* The full first screen, pulled up behind the floating Navbar: `<main>`'s padding reserves
         the nav band and gap, so without a matching negative margin the ground would start below it
         and leave a black strip across the top. `svh` rather than `vh` so a phone's collapsing
         address bar cannot make this taller than the screen it is meant to match. */
      style={{
        /* Warm white for all but the last band of the screen, then a ramp into the paper of the section
           below. The canvas above this is transparent, so this is the ground the cubes stand on —
           and they are breaking up across exactly the same band (HERO_FADE.lo, one value, shared).
           The two together are the edge: blocks thinning out over ground that is already becoming
           the next section, so there is no line anywhere for a line to be wrong at. */
        background: `linear-gradient(to bottom, ${WHITE} ${100 - HERO_FADE.lo * 100}%, ${PAPER} 100%)`,
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
          /* `rounded-[0.5rem]` is repeated inside the curtain keyframes in index.css, which clip
             to the same radius so the corners do not square off mid-animation. The two have to
             agree. */
          /* The cap steps up on an ultrawide with the container it sits in. 34rem in a 100rem
             column is a 544px slab beside 1000px of field: not a panel on a background any more,
             a bookmark. 42rem holds the same share of the column the 34rem cap holds of 80rem. */
          className="nq-curtain w-full mr-auto lg:w-[43%] lg:max-w-[34rem] uw:max-w-[42rem] min-h-[54svh] lg:min-h-[66vh] rounded-[0.5rem] p-5 sm:p-7 flex flex-col relative overflow-hidden"
          /* The frosted surface lives HERE, on the animated element, and not on the box
             inside it. That is the whole reason the frost is visible while the curtain
             opens rather than only after it lands.

             `backdrop-filter` filters everything painted behind the element up to its
             BACKDROP ROOT, and an ancestor becomes that root as soon as it carries a
             grouping property -- `opacity` below 1, `filter`, `mask`, `clip-path`. This
             element animates two of them. So while it ran, a blur on the child had a
             backdrop root containing nothing and blurred nothing; `backwards` fill meant
             both properties stopped applying at the end, the root dissolved, and the frost
             snapped in. An element's OWN clip-path and opacity do not cut it off from its
             backdrop -- the backdrop is filtered first, then clipped and faded along with
             the element -- so from here the frost is revealed BY the curtain.

             0.74 is where the field becomes visible through the glass rather than merely
             present in the arithmetic. It was 0.82 first, which measured fine and looked
             opaque: 18% of an already-blurred cube field arrives as a flat lift. The cost
             is measured -- the field behind is WARM WHITE, the worst backdrop white ink can
             have, so at 0.74 the surface is `#5D6468` and white ink reads 5.61:1, where the
             tagline's old 0.72 dimming would have read 3.81:1. That dimming is what paid
             for this; see the note on the tagline below. Both figures are worst case,
             against the brightest cube in the field, and the composited page probes darker.

             8px, not 22px: blurring a regular repeating grid averages it away by
             definition, and at 22px and 12px the panel looked opaque no matter how much
             light was getting through. At 8px the grid stays recognisable while going soft,
             which is what reads as glass OVER something rather than as grey.

             Derived from ORANGE rather than typed as `rgb(39 48 54 / 0.74)`: a hand-written
             channel triple beside a comment claiming it came from the accent is how the
             footer, the print document and the card field each sat out an accent change.

             No @supports guard: where backdrop-filter is unavailable the property is
             ignored, leaving the panel translucent but not frosted -- a weaker look and an
             IDENTICAL contrast, since blurring a near-uniform light field does not darken
             it. Every number above was computed without the blur for that reason. */
          style={{
            background: `rgb(${channels(ORANGE)} / ${0.74})`,
            backdropFilter: 'blur(8px) saturate(140%)',
            WebkitBackdropFilter: 'blur(8px) saturate(140%)',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center px-5 sm:px-7 py-8 sm:py-10 rounded-[0.5rem]"
            /* The accent, not OBSIDIAN, so the hero's slab is the same colour as the sign-in
               panel and the card field. Both inks here are light-on-dark and the ground rose,
               so both were re-measured: the wordmark 12.53:1, the tagline 7.29:1, and the panel
               itself 12.53:1 against the hero's warm-white ground so it still reads as a slab
               laid on the page rather than a tint of it. */
          >
            <div
              className="w-full max-w-[22rem] uw:max-w-[27rem] text-center"
            >
              <span
                className="block text-[2.1rem] sm:text-[2.6rem] uw:text-[3.2rem] font-black tracking-[0.06em] leading-none"
                style={{ color: WHITE }}
              >
                NUVAIQ
              </span>
              <p
                className="mt-3 text-[0.8rem] sm:text-sm uw:text-base font-bold leading-relaxed"
                /* Full strength, where this used to be 0.72 — and this is what pays for the
                   panel being see-through.

                   On the glass at 0.74 the dimmed version measures 3.81:1, under the floor.
                   Holding the dimming instead would have meant holding the panel at 0.82,
                   which is the version that read as opaque grey.

                   It is also the right call rather than merely the affordable one: a secondary
                   line is dimmed so it sits back from a SOLID surface, and there is no solid
                   surface here. The hierarchy now comes from size and weight, which is what
                   survives a backdrop that shows through. */
                style={{ color: WHITE }}
              >
                {isAr
                  ? 'اطلب موقعك او تصميمك الخاص والباقي علينا'
                  : "Order your website or your own custom design — we'll handle the rest."}
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
            {/* Both pills are NqButton on the `glass` tone — translucent white over the panel,
                which is the pairing that tone exists for. The cube field each one lifts on hover
                is built from what its own fill resolves to over that blue, so the solid one raises
                near-white blocks and the quiet one raises pale grey-tinted ones. */}
            <NqButton
              tone="glass"
              variant="solid"
              size="sm"
              onClick={onRequestProject}
              className="sm:text-sm"
              /* One glyph for both languages. The badge sits at the same physical end of the
                 button in either (see the row above), so an arrow that flipped with the language
                 would be pointing back into the label half the time. */
              badge={<ArrowUpLeft className="w-4 h-4" strokeWidth={2.6} />}
            >
              {isAr ? 'ابدأ مشروعك' : 'Start project'}
            </NqButton>

            <NqButton
              tone="glass"
              variant="quiet"
              size="sm"
              onClick={onStart}
              className="sm:text-sm"
            >
              {isAr ? 'اختار مشروعك' : 'Choose project'}
            </NqButton>
          </div>
        </div>
      </div>
    </section>
  );
};
