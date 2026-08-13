import React, { useMemo, type CSSProperties } from 'react';
import { templatesData } from '../data/templatesData';

/**
 * How many cards sit around the full circle. The count is not decorative — it is what makes the
 * belt seamless. The cards are spaced evenly around 360°, so the arrangement is identical after
 * every 360/N degrees of spin: there is no start and no end to reach, which means no jump to
 * hide. The old flat marquee had to be padded to twelve covers and masked at both edges
 * precisely because a straight track DOES end, and its seam had to be pushed off-screen.
 *
 * Twenty-six, and it is chosen together with the radius rather than on its own. A ring spans
 * roughly 1.45 × its radius on screen, and the radius is fixed by the card size and the count
 * (see index.css) — so "fill the width of a desktop" and "cards this big" between them decide N.
 * Fewer cards here would mean either a narrower fan that stops short of both edges, or cards
 * half again as large to close the gaps.
 *
 * With ten templates in the catalogue that puts the two copies of a cover about 138° apart, so
 * unlike the old twenty-slot version they are no longer guaranteed to be on opposite sides of
 * the ring. A repeat can be on screen twice — but at very different angles and sizes, on
 * photographs rather than on labelled work, which is not something anyone reads as a repeat.
 */
const RING_SIZE = 26;

/**
 * The hero's belt of work: the studio's covers standing on a slowly turning carousel.
 *
 * ## Why a ring and not a strip
 *
 * The look being matched is a fan of cards curving away at both edges — near cards facing you,
 * far ones turned and smaller. On a flat marquee that is impossible to hold: how much a card is
 * turned depends on where it is, and on a strip every card is constantly moving, so each one
 * would need its rotation recomputed every frame from JavaScript.
 *
 * Put the cards on a cylinder instead and the geometry does it for free. Each card is pinned at
 * its own angle and the whole ring turns; a card arrives at the edge already foreshortened,
 * swings round to face you at the front, and turns away again — one CSS rotation on one element,
 * running on the compositor, driving the entire effect.
 *
 * ## Two details that are load-bearing
 *
 * `backface-visibility: hidden` is what hides the far half of the ring. Cards past ±90° have
 * their backs to us; without this they would show through the front of the carousel and the
 * whole thing would read as transparent clutter. It is also why no opacity fade is needed.
 *
 * The stage is pushed back by exactly the ring's radius, so the nearest card sits ON the screen
 * plane and everything else is behind it. That keeps the whole carousel inside its own box —
 * nothing ever projects out toward the viewer and gets clipped by the section, and no card is
 * ever magnified past its natural size.
 */
export const HeroCoverArc: React.FC = () => {
  const covers = useMemo(() => {
    const base = templatesData.map((t) => t.previewImage);
    if (base.length === 0) return base;
    // Every slot on the ring has to be filled. A gap here is not a missing card, it is a hole
    // you can see straight through the carousel — so a short catalogue repeats until the circle
    // is closed, then is cut to exactly RING_SIZE so the angular spacing stays even.
    const out = [...base];
    while (out.length < RING_SIZE) out.push(...base);
    return out.slice(0, RING_SIZE);
  }, []);

  if (covers.length === 0) return null;

  const step = 360 / RING_SIZE;

  return (
    // Decorative in full: the same covers are the templates page's actual content, reachable
    // from the button directly above this. A screen reader announcing twenty unlabelled images
    // here would be reading out the scenery before the visitor reaches anything they can act on.
    <div className="hero-ring" aria-hidden="true">
      <div className="hero-ring__stage">
        <div className="hero-ring__spin">
          {covers.map((src, i) => (
            <div
              key={i}
              className="hero-ring__card"
              style={{ '--a': `${i * step}deg` } as CSSProperties}
            >
              <img
                src={src}
                alt=""
                // Never lazy, for the reason the old strip learned the hard way: the browser
                // decides "near the viewport" from layout position, and a card parked on the far
                // side of a 3D carousel confuses that badly enough that covers arrive blank and
                // fill in as they swing round.
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroCoverArc;
