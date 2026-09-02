/**
 * Colour maths shared by anything that has to derive a family of tones from one surface colour.
 *
 * This existed twice before: `shadeColor` was private to TileField.tsx, where it builds a
 * connection band's trough and crest from the section it stands on. The button field needs exactly
 * the same operation for exactly the same reason — a surface, and a step either side of it — so it
 * lives here and both read it. A second private copy is how two things that are meant to be the
 * same ramp end up as two different ramps.
 */

/** Parse `#rgb` or `#rrggbb` into 0..255 components. Anything else returns black rather than
    throwing: these values come from props, and a bad colour should make a button look wrong, not
    take the page down. */
function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return [0, 0, 0];
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

const toHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

/** Mix `hex` toward black (amt < 0) or white (amt > 0) by `amt` (0..1). */
export function shadeColor(hex: string, amt: number): string {
  const [r, g, b] = parse(hex);
  const target = amt < 0 ? 0 : 255;
  const p = Math.min(1, Math.max(0, Math.abs(amt)));
  const mix = (c: number) => (target - c) * p + c;
  return toHex(mix(r), mix(g), mix(b));
}

/** Straight linear mix of two colours, `t` from 0 (all `a`) to 1 (all `b`). */
export function mixColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const k = Math.min(1, Math.max(0, t));
  return toHex(ar + (br - ar) * k, ag + (bg - ag) * k, ab + (bb - ab) * k);
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = parse(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two colours, 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** True where `hex` is light enough that dark ink belongs on it. */
export const isLight = (hex: string): boolean => relativeLuminance(hex) > 0.5;

/* ── Button field tones ─────────────────────────────────────────────────────────────────── */

/** The four paints a button's cube field is drawn with. Same roles as the page field's, minus the
    two `into` colours — a button's field ends at the button's own clipped edge rather than
    dissolving into a neighbouring section, so it has nothing to fade toward. */
export interface ButtonTones {
  /** The low of the swell, a step off the surface. */
  trough: string;
  /** The high of the swell, a step the other way. */
  crest: string;
  /** An accent carried on the crests only, tying the button to the page it sits on. */
  foam: string;
  /** The surface the cubes stand on — the button's own fill. */
  ground: string;
}

/**
 * A cube field's tones derived from the button's own fill, so the field reads as that surface
 * rising rather than as a texture laid over it.
 *
 * The step sizes are asymmetric by luminance, and they have to be. A fixed ±0.14 either side gives
 * a black button a crest of #242424 against a trough that is still #000 — a relief you cannot see —
 * while a white button gets a crest of #FFF with nowhere left to go. So a dark surface is opened
 * upward and a light one downward: whichever direction has room is the direction the swell uses.
 */
export function buttonTones(surface: string, accent: string): ButtonTones {
  const light = isLight(surface);
  const down = light ? 0.10 : 0.04;
  const up = light ? 0.05 : 0.20;
  return {
    trough: shadeColor(surface, -down),
    crest: shadeColor(surface, up),
    /* The accent, carried at full strength on a light surface and pulled most of the way back
       toward the fill on a dark one.

       Straight `accent` was wrong on black. The page accents are SAND and PERIWINKLE — both
       light, both warm or cool against a near-black pill — and a light accent on a dark fill does
       not read as a highlight, it reads as a smear of a different material dropped on the button.
       On PAPER the same value is a clean tick of colour, because there it is a step DOWN in
       luminance and the surface has room above it. So the mix is against the fill: on black the
       accent survives as a tint of the crest, which is what an accent on a dark surface is. */
    foam: light ? accent : mixColor(surface, accent, 0.55),
    ground: surface,
  };
}
