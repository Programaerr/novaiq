import React from 'react';
import { GravityField } from './GravityField';

interface CosmicBackgroundProps {
  activeSection?: string;
  activeBgImage?: string | null;
}

// Ambient glows are painted as radial gradients rather than as solid circles behind a
// large CSS blur filter. Visually the two are nearly identical at these opacities, but a
// `filter: blur(120px)` forces the browser to rasterize a huge off-screen surface and
// re-composite it whenever anything about that layer changes — one of the heaviest things
// a page can ask a low-end GPU to do. A gradient is drawn directly with zero filter cost.
const GLOW_SOFT = 'radial-gradient(circle closest-side, rgba(82,82,91,0.30) 0%, rgba(63,63,70,0.14) 45%, rgba(0,0,0,0) 78%)';
const GLOW_DIM = 'radial-gradient(circle closest-side, rgba(63,63,70,0.24) 0%, rgba(39,39,42,0.12) 45%, rgba(0,0,0,0) 78%)';

// Per-section glow placement. Expressed as translate3d offsets (never top/left/width) so
// moving them between sections is a GPU-composited transform: no layout, no repaint.
const SECTION_GLOW_OFFSETS: Record<string, { glow1: string; glow2: string }> = {
  templates: { glow1: 'translate3d(58vw, 14vh, 0)', glow2: 'translate3d(4vw, 56vh, 0)' },
  contract: { glow1: 'translate3d(18vw, 30vh, 0)', glow2: 'translate3d(62vw, 64vh, 0)' },
  'custom-request': { glow1: 'translate3d(18vw, 30vh, 0)', glow2: 'translate3d(62vw, 64vh, 0)' },
  timeline: { glow1: 'translate3d(52vw, 44vh, 0)', glow2: 'translate3d(10vw, 20vh, 0)' },
  about: { glow1: 'translate3d(30vw, 36vh, 0)', glow2: 'translate3d(60vw, 68vh, 0)' },
  hero: { glow1: 'translate3d(24vw, 6vh, 0)', glow2: 'translate3d(66vw, 46vh, 0)' },
};

export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  activeSection = 'hero',
  activeBgImage = null,
}) => {
  const offsets = SECTION_GLOW_OFFSETS[activeSection] ?? SECTION_GLOW_OFFSETS.hero;

  return (
    <div className="cosmic-bg fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black select-none">

      {/* Dynamic Background Image Layer (fades in while inspecting a specific template) */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          activeBgImage ? 'opacity-25' : 'opacity-0'
        }`}
      >
        {activeBgImage && (
          <img
            src={activeBgImage}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover blur-md opacity-80"
          />
        )}
      </div>

      {/* Ambient glows — position shifts only when the active section changes (a few times
          per visit), never on scroll, so there is no per-frame work on the scroll path. */}
      <div
        className="absolute top-0 left-0 w-[620px] h-[620px] -ml-[310px] -mt-[310px] transition-transform duration-[1200ms] ease-out"
        style={{ transform: offsets.glow1, backgroundImage: GLOW_SOFT }}
      />
      <div
        className="absolute top-0 left-0 w-[460px] h-[460px] -ml-[230px] -mt-[230px] transition-transform duration-[1200ms] ease-out"
        style={{ transform: offsets.glow2, backgroundImage: GLOW_DIM }}
      />

      {/* Subtle Grid Lines Background Pattern for Tech feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />

      {/* Dark Vignette & Radial Mask Layer to guarantee maximum readability & high contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.85)_100%)]" />

      {/* Drifting star field — painted above the vignette on purpose: the vignette exists to
          dim the grid/glow layers for text contrast, but stars are meant to read as the
          brightest thing in the sky, not another layer it darkens.

          Four planes, ordered far to near. Distance is carried by three things at once — the
          further a plane is, the smaller, dimmer and slower its stars — and all three are set
          together in .star-layer--*, because getting one of them wrong reads as two identical
          fields sliding rather than as depth. */}
      {/* Above the vignette, and that placement is a fix rather than a preference. Sitting below
          it the nebula was invisible: the vignette is a black/80 → black/90 wash with a second
          radial mask at 0.85 black on top, and a cloud a few percent opaque underneath both of
          them is arithmetically gone. It belongs with the stars, in the sky, not behind the
          curtain that exists to darken the sky for the text. */}
      <div className="nebula-layer" />

      <div className="star-layer star-layer--deep" />
      <div className="star-layer star-layer--far" />
      <div className="star-layer star-layer--mid" />
      <div className="star-layer star-layer--near" />

      {/* The reactive plane, on top of the four drifting ones: a well of light under the hand
          with stars leaning into it. Draws only while the hand is moving and stops dead
          afterwards — see GravityField for why that rule is the price of admission here. */}
      <GravityField />

    </div>
  );
};
