/**
 * The pixel-ratio ceiling every WebGL canvas on this site renders at.
 *
 * ## Why one number, decided once, at module scope
 *
 * A phone reports a `devicePixelRatio` of 2 or 3. Rendering a shader-heavy scene at 2× means four
 * times the fragments of 1×, and at 3× it is nine times — on the device with the least GPU to
 * spend and the only one that gets hot in someone's hand. It is also the least visible: at 1× the
 * scenes here are a turning silhouette, a body of water and a card, none of which have fine detail
 * for the extra pixels to resolve. So a coarse pointer (a touch screen) is capped at 1.
 *
 * A mouse means a desktop or a laptop, which has both the GPU headroom and a screen you sit close
 * enough to see aliasing on, so it keeps 1.5.
 *
 * Evaluated once when the module loads rather than per component: `matchMedia` is a layout-adjacent
 * read, this answer cannot change without a new device, and three canvases each asking the same
 * question on every mount is three chances to do it inside a render.
 *
 * Guarded for SSR/build, where `window` does not exist and the value is never used anyway.
 */
export const MAX_DPR: number =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? 1 : 1.5;
