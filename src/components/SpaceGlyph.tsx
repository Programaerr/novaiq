import React from 'react';

/**
 * The two decorative motifs in the panel's small cards.
 *
 * The reference these cards come from fills each one with a rendered 3D object — binoculars, a
 * magnifier, a pie chart. Rendering three more meshes on a page that already runs one live WebGL
 * scene is the wrong trade for decoration that never moves, so these are flat SVG instead. They
 * are drawn in the same language as the hero mark rather than in a generic icon style: thin
 * strokes, an orbit, round terminals. The section reads as one place that way.
 *
 * Monochrome, deliberately. Gold is spent in exactly two places on this site — the hero mark and
 * the panel's live figure — and both are things the eye is supposed to land on. Decoration that
 * takes the accent competes with the content that earned it.
 *
 * `aria-hidden` on both: every card states its meaning in text beside the glyph, so announcing
 * these would only add noise to a screen reader.
 */

/** Rings around a body — the hero mark's orbit, reduced to a diagram. */
export const OrbitGlyph: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    aria-hidden="true"
    className={className}
    // `vector-effect` is NOT used here and that is deliberate: these scale with the card, and a
    // stroke pinned to 1 device pixel would get relatively thinner as the card grows, which reads
    // as the drawing losing weight rather than keeping it.
    stroke="currentColor"
  >
    {/* Three orbits at different tilts, so the group reads as a system seen in perspective rather
        than as flat concentric circles. */}
    <ellipse cx="60" cy="60" rx="46" ry="17" strokeWidth="1.4" opacity="0.5" transform="rotate(-22 60 60)" />
    <ellipse cx="60" cy="60" rx="46" ry="17" strokeWidth="1.4" opacity="0.28" transform="rotate(28 60 60)" />
    <ellipse cx="60" cy="60" rx="46" ry="17" strokeWidth="1.4" opacity="0.16" transform="rotate(78 60 60)" />
    {/* The body. Filled, so it reads as solid against the open rings. */}
    <circle cx="60" cy="60" r="11" fill="currentColor" opacity="0.85" stroke="none" />
    {/* One satellite, on the nearest orbit — what makes the rings read as paths something travels
        rather than as an ornament. */}
    <circle cx="99" cy="43" r="3.4" fill="currentColor" opacity="0.7" stroke="none" />
  </svg>
);

/** A constellation: points and the lines drawn between them. */
export const ConstellationGlyph: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" className={className} stroke="currentColor">
    {/* The links first, so the points sit on top of their own joins rather than under them. */}
    <path
      d="M18 84 L44 58 L38 26 L74 40 L102 22 M44 58 L82 76 L74 40 M82 76 L102 104"
      strokeWidth="1.2"
      opacity="0.34"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Varied radii, because a constellation whose stars are all one size reads as a network
        diagram. Magnitude is what makes it a sky. */}
    {[
      [18, 84, 2.6],
      [44, 58, 4.2],
      [38, 26, 2.2],
      [74, 40, 3.4],
      [102, 22, 2],
      [82, 76, 3],
      [102, 104, 2.4],
    ].map(([cx, cy, r], i) => (
      <circle key={i} cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" opacity={0.55 + (r as number) / 14} />
    ))}
  </svg>
);
