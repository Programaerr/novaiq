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
/** The panel. */
export const PERIWINKLE = '#8295CF';
/**
 * One ink for everything on the light surfaces.
 *
 * Near-black rather than black: pure black on a mid-tone reads as a hole punched in it. It also
 * has to be the DARK member of every pair on this page — white on PERIWINKLE measures 2.97:1,
 * under the 4.5:1 a body-sized line needs, where this ink is 6.4:1 on the same blue.
 */
export const INK = '#101322';
