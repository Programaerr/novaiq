/**
 * The home page's palette, in one place.
 *
 * The site is monochrome everywhere else — black ground, near-white accent. The home page is a
 * deliberate exception built from a wireframe that specified these two values directly, and an
 * exception is only survivable if it is contained: five components each carrying their own copy of
 * `#8295CF` is not an exception any more, it is a second theme nobody can find all of.
 *
 * So every home section reads its colour from here, and reverting the page to the site's
 * monochrome is a change to this file rather than an audit of the components.
 *
 * The sand tones are not free choices either — SAND is the section ground, and DEEP and LIGHT are
 * the trough and crest of the cube field's own shader ramp. Keeping the DOM inside the range the
 * WebGL is already painting is what stops the canvas reading as a picture pasted onto a page.
 */

/** The ground every section below the hero is painted on. */
export const SAND = '#D5BDAC';
/** A step down, for a band that needs to separate from its neighbours without a border. */
export const SAND_DEEP = '#C9AE95';
/** A step up, for a raised surface on sand. */
export const SAND_LIGHT = '#E4D3C4';
/**
 * The ground for a section that has to read as a clean break from the sand without leaving the
 * family.
 *
 * The wireframe draws the phases section on plain white, and plain white is what it must LOOK
 * like sitting under a #D5BDAC screen — but a true #FFF next to sand goes blue by comparison, the
 * same way a white shirt goes blue next to tan. This is the crest tone of the hero's own tile
 * shader (#F3E8DC) lightened until it reads as paper, so the break between the two sections is a
 * change in value rather than in temperature.
 */
export const PAPER = '#F6F1E9';
/**
 * PAPER at zero alpha, for the end of a fade.
 *
 * Spelled out rather than written `transparent`, because `transparent` is rgba(0,0,0,0) and a
 * gradient running to it passes through darkening greys on the way — a grey bruise down the middle
 * of a fade that is supposed to be paper dissolving into nothing. Most engines premultiply and
 * hide it; the ones that do not, do it on exactly the large soft gradients where it shows most.
 */
export const PAPER_CLEAR = 'rgba(246, 241, 233, 0)';
/** The panel, and the one accent that marks state on the light grounds. */
export const PERIWINKLE = '#8295CF';
/**
 * One ink for everything on the light surfaces.
 *
 * Near-black rather than black: pure black on a mid-tone reads as a hole punched in it. It also
 * has to be the DARK member of every pair on this page — white on PERIWINKLE measures 2.97:1,
 * under the 4.5:1 a body-sized line needs, where this ink is 6.4:1 on the same blue.
 */
export const INK = '#101322';
