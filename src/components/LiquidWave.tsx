import React, { useEffect, useRef } from 'react';

interface LiquidWaveProps {
  /** 0-100. How full the glass stands for the figure currently on the card. */
  fill: number;
}

/**
 * The stat card's liquid.
 *
 * ## Why this stopped being WebGL
 *
 * It was a real fragment shader: the surface evaluated per pixel as a level plus a tilt plus three
 * sines, with two springs driving it. It looked right and it was the wrong tool for this page, for
 * a reason that has nothing to do with the shader's own quality.
 *
 * The home page was carrying THREE WebGL contexts — the hero mark, the credential card, and this.
 * Two of them animating. A context is not a cheap object: it has its own GL state, its own buffers
 * and its own compositing surface, and three of them on one page is past what a weak phone will
 * hold. Measured, the browser was dropping contexts (`THREE.WebGLRenderer: Context Lost`) and
 * reporting rAF handlers of 84-203ms. Tuning `frameloop` and pixel ratio took the worst off it and
 * could not fix it, because the cost was structural: this scene competed with the two that are
 * genuinely geometry, for a picture that is a level, a slope and some ripples.
 *
 * None of those three needs a GPU program. They are a translate, a rotate and a repeating shape
 * moving sideways — which is to say they are exactly what the compositor does, off the main thread,
 * for free. So the effect is unchanged and the machinery under it is gone.
 *
 * ## How each part of the old shader survives
 *
 * - **Level** — `--level`, one custom property, written once per figure change. Not per frame.
 * - **Overshoot** — the transition's easing goes past 1 and comes back (`cubic-bezier(.34,1.42,.5,1)`).
 *   That single overshoot is what separated "liquid arriving" from "a bar resizing", and it is a
 *   curve rather than a spring integrated at 60Hz.
 * - **Slosh** — a decaying rotation, run once per change as a keyframe animation and then over.
 *   The old one was a second underdamped spring kicked by the first; this is the same ringing
 *   written out, and it stops on its own instead of being integrated forever.
 * - **The three sines** — two wave strips at different widths, speeds and directions. Two that
 *   never come back into phase already have no visible period, which was the whole point of three
 *   irrational-ratio frequencies; the third was buying detail no one can see at this size.
 *
 * ## What it costs now
 *
 * Two `translateX` keyframes on two small layers. No context, no shader, no `useFrame`, nothing on
 * the main thread per frame, and no render loop to remember to stop when the card scrolls away —
 * the compositor simply does not run animations for layers it is not painting. The only JavaScript
 * that runs at all is one class toggle per figure change, a few seconds apart.
 */
const LEVEL_MIN = 5;
const LEVEL_MAX = 86;

export const LiquidWave: React.FC<LiquidWaveProps> = ({ fill }) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const isFirst = useRef(true);

  const level = LEVEL_MIN + (LEVEL_MAX - LEVEL_MIN) * Math.min(Math.max(fill / 100, 0), 1);

  // Kick the slosh on every change of figure — but not on the first render, where there is no
  // change to have caused it and the card would arrive already rocking.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    // Removing the class, forcing a reflow and re-adding it is what restarts a CSS animation that
    // is already on the element. The reflow is deliberate and it is the only one here: it happens
    // once when the figure changes, seconds apart, not on any frame.
    el.classList.remove('liquid__body--slosh');
    void el.offsetWidth;
    el.classList.add('liquid__body--slosh');
  }, [fill]);

  return (
    <div className="liquid" aria-hidden="true">
      <div
        ref={bodyRef}
        className="liquid__body"
        style={{ '--level': `${level}%` } as React.CSSProperties}
      >
        <span className="liquid__crest liquid__crest--back" />
        <span className="liquid__crest liquid__crest--front" />
        {/* The meniscus: the bright line where the surface meets the air. It rides the front wave
            rather than sitting flat, which is why it is a child of that strip's own layer. */}
        <span className="liquid__meniscus" />
        {/* Rising bubbles. Four, at four sizes and four rates, so nothing about them lines up.
            Positions are literals rather than random: a random layout re-rolls on every render and
            the bubbles would teleport whenever the figure changed. */}
        <span className="liquid__bubble" style={{ left: '18%', '--d': '7.5s', '--s': '5px', '--o': '0s' } as React.CSSProperties} />
        <span className="liquid__bubble" style={{ left: '39%', '--d': '5.8s', '--s': '3px', '--o': '1.9s' } as React.CSSProperties} />
        <span className="liquid__bubble" style={{ left: '63%', '--d': '9.2s', '--s': '4px', '--o': '3.4s' } as React.CSSProperties} />
        <span className="liquid__bubble" style={{ left: '81%', '--d': '6.6s', '--s': '2.5px', '--o': '0.8s' } as React.CSSProperties} />
      </div>
      {/* The glass. A single slow highlight travelling across the whole card, above the water and
          independent of it — it is the light on the front of the vessel, not on the liquid. */}
      <span className="liquid__sheen" />
    </div>
  );
};
