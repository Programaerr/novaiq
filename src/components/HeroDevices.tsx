import React from 'react';

/**
 * Three devices — a laptop, a tablet and a phone — with a site building itself on the laptop.
 *
 * ## Why these are drawn rather than photographed
 *
 * The generated render this replaces had two problems no amount of prompting reliably fixes.
 * It produced four devices overlapping each other because a model composes what it likes, not
 * what it is told; and every screen came out blank white, because a still cannot show a process.
 *
 * Drawn, all three are exactly what they should be — one laptop, one tablet, one phone, clearly
 * separated — and the laptop screen has room for the thing worth showing: a site assembling
 * itself, header first, then hero, then content, then the call to action, on a ten-second loop.
 * That says "we build these" far more directly than a photograph of switched-off hardware.
 *
 * ## Why it is not a video
 *
 * A generated video of a website being designed produces warped, unreadable interface — text in
 * particular — which would look worse than the blank screens it replaced. And a video decodes
 * continuously for as long as it plays.
 *
 * This is markup and CSS keyframes: sharp at any size and on any pixel ratio, a few hundred bytes
 * against a video's megabytes, and every animated property is `opacity` or `transform`, which the
 * compositor runs off the main thread. It also stops with everything else when the tab is hidden.
 */
export const HeroDevices: React.FC = () => (
  <div className="hero-rig" aria-hidden="true">
    {/* Tablet — furthest back and to one side, so the group reads as three depths. */}
    <div className="rig-tablet">
      <div className="rig-screen rig-screen--tablet">
        <span className="tb tb-1" />
        <span className="tb tb-2" />
        <span className="tb tb-3" />
        <span className="tb tb-4" />
      </div>
    </div>

    {/* Laptop — the centrepiece, and the only screen detailed enough to carry the sequence. */}
    <div className="rig-laptop">
      <div className="rig-lid">
        <div className="rig-screen rig-screen--laptop">
          {/* Each piece appears in the order a page is actually built: chrome, then the thing
              it frames, then the supporting content, then the one action. */}
          <span className="bp bp-nav" />
          <span className="bp bp-hero" />
          <span className="bp bp-l1" />
          <span className="bp bp-l2" />
          <span className="bp bp-c1" />
          <span className="bp bp-c2" />
          <span className="bp bp-c3" />
          <span className="bp bp-cta" />
          {/* The cursor that appears to be placing them. It moves between the positions the
              blocks land in, arriving just before each one does. */}
          <span className="bp-cursor" />
        </div>
      </div>
      <div className="rig-base" />
    </div>

    {/* Phone — nearest the viewer, showing the same build in a single column. */}
    <div className="rig-phone">
      <div className="rig-screen rig-screen--phone">
        <span className="ph ph-nav" />
        <span className="ph ph-hero" />
        <span className="ph ph-1" />
        <span className="ph ph-2" />
        <span className="ph ph-cta" />
      </div>
      <span className="rig-notch" />
    </div>
  </div>
);

export default HeroDevices;
