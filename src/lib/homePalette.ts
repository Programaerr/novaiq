/**
 * NOVAIQ's brand palette, in one place.
 *
 * ## What this replaced
 *
 * This module used to hold a warm sand/periwinkle exception carried by the home and account
 * pages alone, with the rest of the site running black-and-white. That identity is retired: the
 * company adopted a new, deliberately restrained system — Deep Midnight, Electric Cobalt,
 * Intelligent Violet, Ice White — and it now IS the site's identity end to end, not a page-level
 * exception. Every name below was chosen to describe what the colour actually is under the new
 * system, which is why none of them are the old SAND/PERIWINKLE/INK names with new hexes slotted
 * in: a constant called PERIWINKLE holding an electric blue would be a name that lies forever.
 *
 * ## Why one large fill and one small accent, from the same hue
 *
 * The brand's own brief is explicit that Cobalt is worth little if it is everywhere: bold colour
 * stays rare so it reads as a decision each time it appears, not as wallpaper. But the layout
 * this identity was applied to already uses a full-bleed colour panel as a real structural
 * element in several places (the hero's curtain, the contact section, the timeline section, the
 * templates section, half the sign-in card) — re-skinning without redesigning means those panels
 * stay panels, they cannot become plain neutral just because the brand wants restraint elsewhere.
 * COBALT_DEEP is the resolution: a large fill reads as "the brand's blue, at rest" rather than as
 * a shouted CTA, while COBALT itself stays reserved for the things that are actually asking to be
 * pressed or noticed — buttons, small icon tiles, the accent on a crest. One hue, two densities,
 * chosen by how much of the screen it is allowed to cover.
 *
 * ## Why the light neutrals are four steps, not one
 *
 * The brand brief itself warns against pure white everywhere flattening the page. The old
 * identity's answer to that was SAND/SAND_DEEP/SAND_LIGHT/PAPER — four related near-white tones
 * so adjacent sections and raised surfaces could separate without a border. ICE/PAPER/ICE_DEEP/
 * ICE_LIGHT is the same four-step idea, derived from the brief's own Ice White (`#F7F9FC`) by the
 * same channel-mix math `shadeColor` already uses elsewhere in this codebase, rather than four
 * independently eyeballed hexes.
 *
 * ## Why muted text has two values
 *
 * The brief's own Muted Slate (`#8B96A8`) is correct on the dark surfaces it names — measured at
 * 6.34:1 on Midnight — but drops to 2.83:1 on Ice White, under the 3:1 floor even for large text.
 * A single "muted" constant would be right in dark mode and silently failing in light mode.
 * MUTED_LIGHT is that same slate, darkened toward Midnight until it clears 4.5:1 on Ice
 * (measured 4.90:1) — the brief was explicit that accessibility is not negotiable for a look.
 */

/** Deep Midnight — the one dark ground, and the ink for every light surface. */
export const MIDNIGHT = '#07111F';

/**
 * Electric Cobalt — the brand's primary colour, reserved for things that are actually
 * interactive or singled out: buttons, active states, links, icons that matter, the accent a
 * field or crest carries. Never a large fill — see COBALT_DEEP for that.
 */
export const COBALT = '#2864FF';

/**
 * Cobalt, brought most of the way back to Midnight — for the handful of places in this layout
 * that are a full-bleed colour panel rather than a button or a highlight. Measured, not
 * eyeballed: `mix(MIDNIGHT, COBALT, 0.35)`, so a whole section reads as "the brand's blue at
 * rest" instead of a CTA stretched across the screen. White on it measures 12.81:1.
 */
export const COBALT_DEEP = '#132E6D';

/**
 * Intelligent Violet — the secondary accent, and the one the brief is strictest about: AI-related
 * moments, a gradient's second stop, a glow, never the majority colour of anything. It also reads
 * lower in contrast than Cobalt at both ends (4.12:1 on Midnight, 4.60:1 on white) — a genuine
 * reason beyond taste to keep it out of body-sized text and let it carry backgrounds, borders and
 * glows instead.
 */
export const VIOLET = '#7557FF';

/** Ice White — the primary light ground, and the brief's literal light-mode background value. */
export const ICE = '#F7F9FC';
/**
 * A step down from ICE, for a section that has to read as a clean break from its neighbour
 * without a border between them — the role PAPER played against SAND in the old identity, kept
 * under the same name because "paper" never implied warmth, only a quiet neutral surface.
 */
export const PAPER = '#E9EDF4';
/** A further step down from PAPER, for a badge, divider or note-box that needs to separate from
 *  the surface around it without a border. */
export const ICE_DEEP = '#DCE2EC';
/** A step up from ICE — pure white, for a raised card surface. The brief asks for cards that are
 *  "white/off-white with simple visual separation"; this is the white half of that pair. */
export const ICE_LIGHT = '#FFFFFF';

/** Surface Dark — dark-mode's elevated card, a step up from Midnight rather than more of it. */
export const SURFACE_DARK = '#101A28';

/** Secondary/metadata text on a DARK ground (Midnight or Surface Dark). 6.34:1 on Midnight. */
export const MUTED = '#8B96A8';
/** Secondary/metadata text on a LIGHT ground (Ice/Paper/Ice Deep). The same slate, darkened
 *  toward Midnight until it clears AA on Ice White — MUTED itself measures 2.83:1 there and
 *  fails; this measures 4.90:1. */
export const MUTED_LIGHT = '#636E7F';
