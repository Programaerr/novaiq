import React from 'react';

interface RevealLightProps {
  /** Light the surface under the pointer as well as the outline. */
  face?: boolean;
}

/**
 * The two layers of the Fluent reveal, as real elements rather than pseudo-elements.
 *
 * They have to be real elements, and that is the entire point of this component. The effect
 * moves a light around, and the only way to move anything in a browser without repainting it
 * is `transform` on a promoted layer. But the light also has to be clipped — to the card's
 * rounded shape for the surface wash, and to a 1px outline for the ring — and a clip belongs
 * to a *container*, not to the thing being clipped. That is two nested boxes: a static shell
 * that establishes the shape, and a moving disc inside it. A pseudo-element cannot contain
 * another pseudo-element, so the shell has to exist in the markup; its `::before` is then
 * free to be the disc.
 *
 * Everything visual lives in `.rv` / `.rv--face` / `.rv--ring` in index.css — see the long
 * note there for why the old single-pseudo version (which moved a gradient's centre instead)
 * repainted on every frame and this one does not repaint at all.
 *
 * Drop it as the first child of any element carrying `.reveal-border` (and `.reveal-face`
 * when `face` is wanted), inside a container wired to useRevealGroup. The card is what the
 * hook writes --rx/--ry to; these inherit them, so both layers read one shared position.
 *
 * `aria-hidden` throughout: this is lighting, and there is nothing here to announce.
 */
export const RevealLight: React.FC<RevealLightProps> = ({ face = false }) => (
  <>
    {face && <span className="rv rv--face" aria-hidden="true" />}
    <span className="rv rv--ring" aria-hidden="true" />
  </>
);
