/**
 * NOVAIQ's brand palette, in one place.
 *
 * ## What this replaced, twice now
 *
 * This module first carried a warm sand/periwinkle exception for the home and account pages,
 * then a Midnight/Cobalt/Violet system when the company adopted a restrained blue identity. Both
 * are retired: the company moved again, to Obsidian Black + Signal Orange — "a dark engineering
 * laboratory meets premium enterprise software." Every name below describes what the colour
 * actually is under THIS system; nothing here is a leftover name holding a new hex.
 *
 * ## Why the large fills are neutral, not a tint of the accent
 *
 * The Cobalt system before this one used a darkened tint of its own accent (`COBALT_DEEP`) for
 * the handful of full-bleed colour panels this layout relies on (the hero's curtain, the contact
 * section, the timeline section, the templates section, half the sign-in screen). That move does
 * not carry over: this brief is explicit that Orange is never a background — "لا تجعل: كل
 * Background برتقالي" — and a "deep orange" panel would be exactly that, just quieter. So the
 * large-fill role moves to OBSIDIAN, the brand's own dark neutral, with Orange kept for what it
 * is reserved for everywhere else in this system: the small thing that is actually asking to be
 * pressed or noticed — a button, an icon tile, the foam on a crest. A dark panel with an orange
 * signal on it is closer to the brief's own mental image ("شبكة تقنية مظلمة دقيقة جدًا تحتوي على
 * نقاط اتصال برتقالية مهمة") than a panel dyed orange ever was.
 *
 * ## Why the primary button's label is dark, not white
 *
 * The reflex for a saturated fill is white text. Measured, Signal Orange does not support it:
 * white on `#FF6A00` is 2.87:1, under the 3:1 floor even for large text. Obsidian on the same
 * orange is 6.90:1. Every pairing below that puts text ON Orange or Ember uses the dark member of
 * the pair for exactly this reason — it is not a stylistic choice, white genuinely does not read.
 *
 * ## Why the light neutrals are four steps, not one
 *
 * Warm White (`#F7F7F5`) is the brief's own light-mode background, but a single flat tone used
 * everywhere is what the brief itself warns against as flattening — the light-neutral family
 * (WHITE/PAPER/PAPER_DEEP/SURFACE_LIGHT) gives adjacent sections and raised surfaces a way to
 * separate without a border, the same four-step idea the previous two identities also needed,
 * derived here by the same channel-mix math (`shadeColor` in TileField.tsx) rather than picked
 * by eye.
 *
 * ## Why muted text and three semantic colours each have two values
 *
 * Steel Gray (`#9299A3`) is 6.90:1 on Obsidian and a failing 2.68:1 on Warm White — correct on a
 * dark surface, silently broken on a light one. The four semantic colours have the same problem
 * in a more severe form (Success/Info/Warning all fall under 2.2:1 on Warm White). Each below has
 * a light-ground counterpart, darkened toward Obsidian until it clears 4.5:1, because the brief
 * is explicit that accessibility is not negotiable for a look.
 *
 * ## Why Warning is yellow-gold rather than amber-orange
 *
 * The brief calls this out directly: Orange is the brand, and a Warning colour that reads as
 * "slightly duller orange" would teach a visitor that every brand moment might be a caution. This
 * Warning sits in yellow-gold territory instead, far enough from `#FF6A00` on the wheel that the
 * two are never confused.
 */

/** Obsidian Black — the brand's dark neutral: primary dark ground, ink for light surfaces, AND
 *  the fill for every full-bleed panel this layout uses (see the module note on why that role
 *  did not become a tint of Orange). */
export const OBSIDIAN = '#080A0D';

/** Graphite — a step up from Obsidian, for cards, modals and elevated surfaces that need to read
 *  as sitting ABOVE the dark ground rather than as more of it. */
export const GRAPHITE = '#12161C';

/**
 * Signal Orange — the primary accent, and reserved for things that are actually interactive or
 * singled out: buttons, active states, links, an icon that matters, the foam on a crest. Never a
 * background or a large fill.
 */
export const ORANGE = '#FF6A00';
/** Orange, darkened toward Obsidian until it clears 4.5:1 on Warm White — for a link or small
 *  text label that has to be Orange but sits on a LIGHT ground, where plain Orange measures a
 *  failing 2.68:1. */
export const ORANGE_ON_LIGHT = '#BA4F04';

/**
 * Ember — the secondary accent, used more sparingly than Orange itself: illustration detail, a
 * hover glow, a chart series, one end of the brand gradient. Not a text colour on either ground
 * at body size (white on it is 2.36:1; use Obsidian, exactly as with Orange, where it must carry
 * text at all).
 */
export const EMBER = '#FF8A1F';

/** Warm White — the primary light ground, and the brief's literal light-mode background value. */
export const WHITE = '#F7F7F5';
/** A step down from WHITE, for a section that has to read as a clean break from its neighbour
 *  without a border between them. */
export const PAPER = '#E9E7E3';
/** A further step down from PAPER, for a badge, divider or note-box that needs to separate from
 *  the surface around it without a border. */
export const PAPER_DEEP = '#DCDBD6';
/** A step up from WHITE — pure white, for a raised card surface. */
export const SURFACE_LIGHT = '#FFFFFF';

/** Secondary/metadata text on a DARK ground (Obsidian or Graphite). 6.90:1 on Obsidian. */
export const STEEL = '#9299A3';
/** Secondary/metadata text on a LIGHT ground. The same steel, darkened toward Obsidian until it
 *  clears AA on Warm White — STEEL itself measures 2.68:1 there and fails; this measures 4.59:1. */
export const STEEL_LIGHT = '#6B7179';

/**
 * Semantic status colours — success/warning/error/info — deliberately independent of the brand
 * core. Brand colour must never double as a status colour: Orange means the brand, not "this is
 * a warning" or "this succeeded", and a user who has learned one meaning for it should not have
 * to unlearn it reading a toast.
 *
 * Each has two members, for the ground it is measured against: the bright member is correct on
 * Obsidian/Graphite (4.8–10.3:1) and fails on Warm White; the `_ON_LIGHT` member is the same hue
 * darkened until it clears 4.5:1 there.
 */
export const SUCCESS = '#22C55E';
export const SUCCESS_ON_LIGHT = '#198241';
export const WARNING = '#EAB308';
export const WARNING_ON_LIGHT = '#8B6C0A';
export const ERROR = '#EF4444';
export const ERROR_ON_LIGHT = '#CA3B3B';
export const INFO = '#38BDF8';
export const INFO_ON_LIGHT = '#26799F';
