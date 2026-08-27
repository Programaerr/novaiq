/**
 * The site's palette, in one place.
 *
 * ## What changed, and why the names did too
 *
 * This file used to hold a light, warm system: SAND grounds, a PAPER break, a PERIWINKLE accent
 * and a near-black INK for the type. The site is now black and orange, which is not a hue swap —
 * it is an inversion. Every ground goes dark and the mark on it goes light, so a constant called
 * SAND holding `#101013` and one called INK holding a near-white would have been two lies sitting
 * in the one file the whole site reads its colour from.
 *
 * So the names describe the ROLE now rather than the colour: GROUND, SURFACE, ACCENT, INK. The
 * next repaint is a change to the eight values below and nothing else — no rename, no audit. That
 * is the property this file is supposed to have and did not.
 *
 * ## The one rule that survives the inversion
 *
 * The old palette's load-bearing note was that INK, not white, had to be the label on PERIWINKLE:
 * white measured 2.94:1 there and the ink measured 6.28:1. The same asymmetry holds on orange and
 * points the same way — `INK on ACCENT` is 2.55:1 and fails, `ON_ACCENT on ACCENT` is 7.31:1. The
 * bright accent takes a DARK label. Every measurement below is computed, not estimated.
 *
 *   INK on GROUND ............ 16.89:1      ACCENT on GROUND ......... 6.62:1
 *   INK on GROUND_DEEP ....... 18.68:1      ACCENT on GROUND_DEEP .... 7.31:1
 *   INK on GROUND_RAISED ..... 14.76:1      ON_ACCENT on ACCENT ...... 7.31:1
 *   INK on SURFACE ........... 13.36:1      INK on ACCENT ............ 2.55:1  <- fails, by design
 *   INK_DIM on GROUND ........ 9.14:1       INK on ACCENT_DEEP ....... 4.77:1
 *
 * ## The grounds are spaced by L*, not by contrast ratio
 *
 * Four near-blacks a contrast ratio cannot tell apart: GROUND against SURFACE is 1.2:1, which
 * says nothing, because the ratio formula compresses to nothing down here. The question for two
 * grounds is whether the step is VISIBLE, and that is a CIE L* question. These are spaced to the
 * same perceptual steps the sand system had:
 *
 *                          new             old it replaces
 *   deep    -> ground      4.8 L*          5.4 L*
 *   ground  -> raised      6.7 L*          7.4 L*
 *   ground  -> surface    10.7 L*         17.1 L*
 */

/** The ground every section is painted on. */
export const GROUND = '#101013';

/**
 * A step down from the ground, for a band that has to separate from its neighbours without a
 * border. True black: on a near-black ground there is nowhere else for a step down to go.
 */
export const GROUND_DEEP = '#000000';

/** A step up from the ground, for a raised surface standing on it. */
export const GROUND_RAISED = '#1E1E23';

/**
 * The ground for a section that has to read as a clean break from the others without leaving
 * the family — what PAPER was in the light system, inverted.
 *
 * The break is smaller than it used to be (10.7 L* against 17.1) and that is deliberate rather
 * than a shortfall. Matching the old jump would put this at L* 22, a mid grey, and a grey panel
 * on a black page reads as a different material rather than as the same page a shade lighter.
 */
export const SURFACE = '#26262D';

/**
 * The one accent: buttons, marks, the crest of the cube fields, anything that has to be found.
 *
 * Bright enough that it carries at small sizes on black (6.62:1) and still takes a black label
 * (7.31:1). Those two facts together are what let one value be both the fill and the mark.
 */
export const ACCENT = '#FF6A00';

/**
 * The accent as a GROUND, for a section painted in it rather than marked with it.
 *
 * A full page of #FF6A00 is not a section, it is a warning. This is the same hue taken down until
 * it can hold a light label (INK on it is 4.77:1) — so the rule flips between the two: the bright
 * accent takes a dark mark, the deep accent takes a light one. Both directions are measured above.
 */
export const ACCENT_DEEP = '#B8460A';

/**
 * The mark on every ground. Near-white rather than pure white, and warm rather than neutral, so
 * it sits with the orange instead of against it.
 *
 * "Ink" is still the right word: it is what is written on the page. The page just went black.
 */
export const INK = '#F5F1EC';

/**
 * The same mark, quieted, for supporting copy. Kept as a solid value rather than as INK at an
 * alpha, because an alpha over the four different grounds above resolves to four different
 * colours and only one of them would ever have been the one that was measured.
 */
export const INK_DIM = '#B9B3AC';

/**
 * The mark on ACCENT, and the only place black is used as a foreground.
 *
 * It exists as its own name rather than as GROUND_DEEP at the call sites, because those two are
 * the same value for a reason that could stop being true: this one is "whatever reads on the
 * accent", and if the accent ever moves toward red this is what moves with it.
 */
export const ON_ACCENT = '#000000';
