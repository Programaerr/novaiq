import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OBSIDIAN, ORANGE, PAPER, PAPER_DEEP, WHITE } from '../../lib/homePalette';
import { buttonTones, contrastRatio, isLight } from '../../lib/tone';
import { ButtonTiles, newDrive } from './ButtonTiles';

/**
 * Everything a pressable surface on this site is made of, shared by NqButton and NqLink.
 *
 * The split is semantic, not visual. A thing that navigates is an `<a>` — it belongs in the tab
 * order as a link, it opens in a new tab on middle-click, and a screen reader announces where it
 * goes. A thing that acts is a `<button>`. The navbar's login and the templates page's contract
 * button look and feel identical and are not the same element, so the look and the feel live here
 * and each component contributes only its tag.
 *
 * Before this, the site had three button systems that had drifted apart — `.filter-pill-btn` with
 * its conic beam, `.nq-btn` with a different beam, and a handful of sections writing pills inline
 * with `style={{ background, color }}`. All three are replaced by this one.
 */

/* ── Tones ──────────────────────────────────────────────────────────────────────────────── */

export type NqTone = 'chrome' | 'paper' | 'white' | 'obsidian' | 'glass' | 'footer';
export type NqVariant = 'solid' | 'quiet' | 'ghost';
export type NqSize = 'sm' | 'md' | 'lg';
/** Pill everywhere by default. `xl` exists for the two places a pill would be wrong — a row of
    buttons filling the foot of a rounded card (the cookie bar, the sign-out dialog), where a
    full radius on a wide, short button reads as a capsule floating in a box rather than as part
    of it. */
export type NqRadius = 'full' | 'xl';

interface Pair {
  /** The CSS background. May be translucent; `tile` is what the cubes are derived from. */
  bg: string;
  /** The label colour. */
  fg: string;
  /** An opaque stand-in for `bg` where `bg` is translucent, so the cube field has a real colour to
      build its ramp from. Required whenever `bg` is not a plain hex — a field built from
      `rgba(255,255,255,0.55)` has no idea what is behind it. */
  tile?: string;
  /** The filled circle a `badge` sits in. Spelled out per pair rather than derived: the badge is
      the loudest thing on the button, and the site already has three established pairings for it
      that no single rule reproduces. */
  badgeBg?: string;
  badgeFg?: string;
}

interface ToneSpec {
  solid: Pair;
  quiet: Pair;
  ghost: Pair;
  /** Carried on the crests of the cube field. The one colour that says which page this is on. */
  accent: string;
  /** Whether the focus ring is drawn in Midnight rather than white. Keyed to the PAGE behind the
      button, not to the button: a ring in the button's own family disappears into it, and what has
      to be visible is the outline against the ground. */
  darkRing: boolean;
}

const CHROME_QUIET = '#17171C';

/**
 * The six grounds, and what a pressable surface on each is made of.
 *
 * ## Why Orange needs dark text where Cobalt (the identity before this one) needed light
 *
 * The two accents fail contrast in OPPOSITE directions, which is the whole reason this table was
 * rewritten pair by pair rather than swapped by search-and-replace. Cobalt (`#2864FF`) was dark
 * enough that white read on it and Midnight did not. Signal Orange (`#FF6A00`) is the other way:
 * white on it is 2.87:1, under even the 3:1 floor for a large mark, where Obsidian on it is
 * 6.90:1. Every pair below that puts a label ON Orange or Ember uses Obsidian, not white. A badge
 * sitting on a LIGHT fill still wants Obsidian too — both directions land on the same dark ink
 * here, which is different from the Cobalt table (where the light-fill case wanted dark and the
 * bright-fill case wanted light) purely because Orange is the brighter of the two accents in
 * absolute terms, not because there is a single rule for "the accent's text colour".
 *
 * ## Why the full-bleed panels are Obsidian, not a tint of Orange
 *
 * The previous identity used a darkened tint of its own accent for the sections that fill the
 * whole screen. This brief rules that out explicitly — Orange is never a background, not even a
 * quiet one — so those same sections (the `obsidian` tone below, and `SECTION_TONES` /
 * `OBSIDIAN_TONES` in TileField.tsx) fill with the brand's dark neutral instead, and Orange
 * survives only as the badge, the border, the small thing actually being pointed at.
 */
export const TONES: Record<NqTone, ToneSpec> = {
  /* The dark site chrome: navbar, login, cookie bar, dialogs. Orange is the brand's one saturated
     accent on Obsidian, and Obsidian on Orange measures 6.90:1 where white measures a failing
     2.87:1 — so the label is dark here, on its own bright fill. */
  chrome: {
    solid: { bg: ORANGE, fg: OBSIDIAN, badgeBg: OBSIDIAN, badgeFg: ORANGE },
    quiet: { bg: CHROME_QUIET, fg: '#F4F4F5', badgeBg: ORANGE, badgeFg: OBSIDIAN },
    ghost: { bg: 'transparent', fg: '#F4F4F5', tile: CHROME_QUIET, badgeBg: ORANGE, badgeFg: OBSIDIAN },
    accent: WHITE,
    darkRing: false,
  },
  /* PAPER sections — the phases section, the templates grid's own card chrome. The solid pair is
     the templates page's existing dark pill with its white badge, Obsidian rather than a flat
     `#000000` — the brief is explicit that pure black is not the brand's dark neutral, Obsidian
     is, and a button is not the one exception. */
  paper: {
    solid: { bg: OBSIDIAN, fg: '#FFFFFF', badgeBg: '#FFFFFF', badgeFg: OBSIDIAN },
    quiet: { bg: 'rgba(8,10,13,0.06)', fg: OBSIDIAN, tile: WHITE, badgeBg: OBSIDIAN, badgeFg: PAPER },
    ghost: { bg: 'transparent', fg: OBSIDIAN, tile: PAPER, badgeBg: OBSIDIAN, badgeFg: PAPER },
    accent: ORANGE,
    darkRing: true,
  },
  /* WHITE grounds — the light surfaces earlier tables called "sand" then "ice". */
  white: {
    solid: { bg: OBSIDIAN, fg: PAPER, badgeBg: ORANGE, badgeFg: OBSIDIAN },
    quiet: { bg: PAPER_DEEP, fg: OBSIDIAN, badgeBg: OBSIDIAN, badgeFg: PAPER },
    ghost: { bg: 'transparent', fg: OBSIDIAN, tile: WHITE, badgeBg: OBSIDIAN, badgeFg: PAPER },
    accent: ORANGE,
    darkRing: true,
  },
  /* The contact section's ground — Obsidian, the full-bleed neutral (see the module note on why
     this is not a tint of Orange). The solid pair is that form's own light pill; its badge is the
     one Orange moment in this tone, because a form's submit action is exactly the kind of thing
     the brief calls "worth being a point of attraction" — the quiet/ghost badges stay neutral so
     Orange does not appear twice in the same cluster and dilute itself. */
  obsidian: {
    solid: { bg: WHITE, fg: OBSIDIAN, badgeBg: ORANGE, badgeFg: OBSIDIAN },
    quiet: { bg: '#3F444B', fg: '#FFFFFF', badgeBg: OBSIDIAN, badgeFg: PAPER },
    ghost: { bg: 'transparent', fg: '#FFFFFF', tile: OBSIDIAN, badgeBg: OBSIDIAN, badgeFg: PAPER },
    accent: WHITE,
    darkRing: false,
  },
  /* The footer, which is a paper ground that carries Orange as its accent rather than as its fill
     — so its call to action is the one surface on the site that is Orange-on-paper. It gets its
     own entry rather than borrowing `paper` (whose solid is Obsidian, and Obsidian is not what the
     footer's `--ft-accent` means) or `chrome` (whose ring is white, and white on paper is no ring
     at all). */
  footer: {
    solid: { bg: OBSIDIAN, fg: '#FFFFFF', badgeBg: ORANGE, badgeFg: OBSIDIAN },
    quiet: { bg: 'rgba(255,106,0,0.16)', fg: OBSIDIAN, tile: PAPER_DEEP, badgeBg: ORANGE, badgeFg: OBSIDIAN },
    ghost: { bg: 'transparent', fg: OBSIDIAN, tile: PAPER, badgeBg: ORANGE, badgeFg: OBSIDIAN },
    accent: ORANGE,
    darkRing: true,
  },
  /* The hero's two pills, which are translucent white sitting on the panel — Obsidian, the
     full-bleed neutral. The fills stay translucent so the panel reads through them; `tile` is
     what each one actually resolves to over THAT ground, recomputed rather than guessed. The
     primary pill's badge is Orange-on-Obsidian: this is the site's main call to action, and the
     brief's own test for whether something earns the accent — "is this worth being a point of
     attraction?" — the answer for the hero's own primary button is yes. The secondary (quiet)
     pill's badge stays Obsidian-on-white, so the one Orange mark in the hero is unambiguous. */
  glass: {
    solid: { bg: 'rgba(255,255,255,0.92)', fg: OBSIDIAN, tile: '#EBEBEC', badgeBg: ORANGE, badgeFg: OBSIDIAN },
    quiet: { bg: 'rgba(255,255,255,0.55)', fg: OBSIDIAN, tile: '#909192', badgeBg: OBSIDIAN, badgeFg: '#FFFFFF' },
    ghost: { bg: 'transparent', fg: '#FFFFFF', tile: OBSIDIAN, badgeBg: OBSIDIAN, badgeFg: '#FFFFFF' },
    accent: ORANGE,
    darkRing: true,
  },
};

/* ── Sizing ─────────────────────────────────────────────────────────────────────────────── */

interface SizeSpec {
  pad: string;
  badgePad: string;
  text: string;
  icon: string;
  badge: string;
}

/**
 * Every size clears 44px, which is the floor for a touch target and not a matter of taste — the
 * navbar's language switch was 32px before this and the footer's back-to-top was the height of its
 * own 12px type.
 */
export const SIZES: Record<NqSize, SizeSpec> = {
  sm: {
    pad: 'min-h-11 px-4 py-2.5 gap-2',
    badgePad: 'min-h-11 ps-4 pe-1.5 py-1.5 gap-2',
    text: 'text-xs',
    icon: 'w-4 h-4',
    badge: 'w-8 h-8',
  },
  md: {
    pad: 'min-h-12 px-6 py-3 gap-2.5',
    badgePad: 'min-h-12 ps-6 pe-2 py-2 gap-2.5',
    text: 'text-sm',
    icon: 'w-4 h-4',
    badge: 'w-9 h-9',
  },
  lg: {
    pad: 'min-h-14 px-8 py-3.5 gap-3',
    badgePad: 'min-h-14 ps-8 pe-2.5 py-2.5 gap-3',
    text: 'text-sm sm:text-base',
    icon: 'w-5 h-5',
    badge: 'w-10 h-10',
  },
};

/* ── The WebGL budget ───────────────────────────────────────────────────────────────────── */

/**
 * How many cube fields may hold a WebGL context at once, site-wide.
 *
 * A browser keeps somewhere around sixteen contexts and silently kills the oldest past that, so "a
 * canvas in every button" is not a heavy option, it is a broken one — it would take the hero's own
 * field down the first time a templates page scrolled. A pointer can only be in one place and
 * focus in one more, so two is the realistic ceiling and four is headroom for a linger overlapping
 * the next hover. Past it a surface simply goes without: it still presses, still rings its focus,
 * and the only thing missing is an ornament.
 */
const MAX_LIVE_FIELDS = 4;
let liveFields = 0;

/** How long the field stays mounted after the pointer leaves, so it can settle out rather than
    vanish mid-fall. Matched to the ease-out in ButtonTiles. */
const LINGER_MS = 900;

/* ── The shared surface ─────────────────────────────────────────────────────────────────── */

export interface NqSurfaceOptions {
  tone: NqTone;
  variant: NqVariant;
  size: NqSize;
  /** Off for anything inert, and for anything rendered many times in a list where the ornament is
      noise rather than feedback. */
  tiles: boolean;
  /** Override the cube field's base colour. Only needed where the fill is translucent and the tone
      table has no opaque stand-in for it. */
  tileSurface?: string;
  block: boolean;
  radius: NqRadius;
  /** Greys the surface out and stops the field. */
  inert: boolean;
  loading: boolean;
  hasBadge: boolean;
  className: string;
}

export interface NqSurface {
  pair: Pair;
  size: SizeSpec;
  className: string;
  style: React.CSSProperties;
  badgeBg: string;
  badgeFg: string;
  /** Spread onto the element. Pointer and focus handlers that drive the field. */
  handlers: {
    ref: (node: HTMLElement | null) => void;
    onPointerEnter: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerLeave: (e: React.PointerEvent) => void;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
    onFocus: (e: React.FocusEvent) => void;
    onBlur: (e: React.FocusEvent) => void;
  };
  /** The field itself, or null when it is asleep. Render as the first child. */
  tiles: React.ReactNode;
}

export function useNqSurface(
  opts: NqSurfaceOptions,
  externalRef?: React.ForwardedRef<never>,
): NqSurface {
  const { tone, variant, size, tiles, tileSurface, block, radius, inert, loading, hasBadge,
    className } = opts;

  const spec = TONES[tone];
  const pair = spec[variant];
  const s = SIZES[size];

  const el = useRef<HTMLElement | null>(null);
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      el.current = node;
      if (typeof externalRef === 'function') (externalRef as (n: unknown) => void)(node);
      else if (externalRef) (externalRef as { current: unknown }).current = node;
    },
    [externalRef],
  );

  const drive = useRef(newDrive());
  const [mounted, setMounted] = useState(false);
  const holdsSlot = useRef(false);
  const lingerTimer = useRef<number | undefined>(undefined);

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  const wantsTiles = tiles && !inert && !reduced;

  /* Claiming and releasing a slot in the site-wide budget. Both are idempotent — a pointer that
     leaves and re-enters inside the linger must not decrement twice, which would let the counter
     drift below zero and quietly raise the real ceiling. */
  const claim = useCallback(() => {
    if (holdsSlot.current) return true;
    if (liveFields >= MAX_LIVE_FIELDS) return false;
    liveFields += 1;
    holdsSlot.current = true;
    return true;
  }, []);

  const release = useCallback(() => {
    if (!holdsSlot.current) return;
    liveFields -= 1;
    holdsSlot.current = false;
  }, []);

  // Releasing on unmount matters more than it looks: a surface that is hovered when the page
  // navigates away never sees a pointerleave, and without this the counter would only ever climb.
  useEffect(
    () => () => {
      window.clearTimeout(lingerTimer.current);
      release();
    },
    [release],
  );

  const wake = useCallback(() => {
    if (!wantsTiles) return;
    window.clearTimeout(lingerTimer.current);
    drive.current.target = 1;
    if (claim()) setMounted(true);
  }, [wantsTiles, claim]);

  const sleep = useCallback(() => {
    drive.current.target = 0;
    window.clearTimeout(lingerTimer.current);
    lingerTimer.current = window.setTimeout(() => {
      setMounted(false);
      release();
    }, LINGER_MS);
  }, [release]);

  /** Pointer position as a fraction of the element's own box. */
  const localise = useCallback((e: React.PointerEvent) => {
    const node = el.current;
    if (!node) return { x: 0.5, y: 0.5 };
    const r = node.getBoundingClientRect();
    if (!r.width || !r.height) return { x: 0.5, y: 0.5 };
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }, []);

  const handlers = {
    ref: setRef,
    onPointerEnter: (e: React.PointerEvent) => {
      // A touch fires enter/leave around the tap as well, and waking on it makes the field flash
      // on and off around a press that already has its own ring. Press is the touch entry point.
      if (e.pointerType === 'touch') return;
      const p = localise(e);
      drive.current.px = p.x;
      drive.current.py = p.y;
      wake();
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!mounted) return;
      const p = localise(e);
      drive.current.px = p.x;
      drive.current.py = p.y;
    },
    onPointerLeave: () => {
      // Focus outlives the pointer: tabbing to a control and then brushing past it with the mouse
      // must not put the field to sleep while it is still the focused one.
      if (el.current?.matches(':focus-visible')) return;
      sleep();
    },
    onPointerDown: (e: React.PointerEvent) => {
      if (!wantsTiles) return;
      const p = localise(e);
      drive.current.pressX = p.x;
      drive.current.pressY = p.y;
      drive.current.px = p.x;
      drive.current.py = p.y;
      drive.current.pressAt = performance.now();
      wake();
    },
    // On a touch screen the press IS the whole interaction — there is no hover to hold the field
    // open afterwards, so it is released here and the linger carries the ring to its end.
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') sleep();
    },
    onPointerCancel: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') sleep();
    },
    onFocus: (e: React.FocusEvent) => {
      // Only a keyboard focus. A mouse press focuses too, and lighting the field from the centre
      // on every click would fight the ring the press itself just started.
      if (!(e.currentTarget as HTMLElement).matches(':focus-visible')) return;
      drive.current.px = 0.5;
      drive.current.py = 0.5;
      wake();
    },
    onBlur: () => sleep(),
  };

  const surface = tileSurface ?? pair.tile ?? pair.bg;
  const tones = useMemo(() => buttonTones(surface, spec.accent), [surface, spec.accent]);

  /* A dev-only contrast check on the pair this surface actually resolved to. The table above is
     measured, but `tileSurface` and a stray `className` can put a label on a fill nobody checked,
     and a 3:1 label is not something you notice by looking — it is something you notice in a
     screenshot six months later. */
  if (import.meta.env.DEV && pair.bg.startsWith('#')) {
    const ratio = contrastRatio(pair.bg, pair.fg);
    if (ratio < 4.5) {
      console.warn(
        `[nq] tone="${tone}" variant="${variant}" resolves to ${pair.fg} on ${pair.bg} — ` +
          `${ratio.toFixed(2)}:1, under the 4.5:1 a label needs.`,
      );
    }
  }

  /* The ring is keyed to the GROUND, not to the surface. A ring in the button's own accent sits
     invisibly on top of a button already wearing that accent; what has to be seen is the outline
     against the page behind it. */
  const ring = spec.darkRing ? 'focus-visible:ring-[#080A0D]' : 'focus-visible:ring-white';

  return {
    pair,
    size: s,
    style: { background: pair.bg, color: pair.fg },
    badgeBg: pair.badgeBg ?? (isLight(surface) ? OBSIDIAN : '#FFFFFF'),
    badgeFg: pair.badgeFg ?? (isLight(surface) ? PAPER : OBSIDIAN),
    handlers,
    tiles: mounted && wantsTiles ? <ButtonTiles drive={drive} tones={tones} /> : null,
    className: [
      // `relative` positions the field, `overflow-hidden` is what clips it to the pill — the
      // shader softens its outermost cubes but the actual rounded edge is this.
      'nq-button relative overflow-hidden isolate inline-flex items-center justify-center',
      radius === 'xl' ? 'rounded-xl' : 'rounded-full',
      'font-extrabold leading-none select-none no-underline',
      // 150–300ms, and on transform/filter/opacity only. Animating a colour here would fight the
      // field, which is already the thing that moves.
      'transition-[transform,filter,opacity] duration-200 ease-out',
      'active:scale-[0.98] motion-reduce:active:scale-100',
      'hover:brightness-[1.06] motion-reduce:hover:brightness-100',
      // Never removed, only restyled — and offset so it reads on a fill of the same family.
      'outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
      ring,
      'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
      'aria-disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:active:scale-100',
      loading ? 'cursor-wait' : inert ? '' : 'cursor-pointer',
      variant === 'ghost' ? 'hover:bg-current/10' : '',
      hasBadge ? s.badgePad : s.pad,
      s.text,
      block ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

/* ── Shared content ─────────────────────────────────────────────────────────────────────── */

export interface NqContentProps {
  surface: NqSurface;
  loading?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  spinner?: React.ReactNode;
}

/** Everything readable, above the field. `relative` is enough — it comes after the absolutely
    positioned canvas in the DOM, so it paints over it without a z-index. */
export const NqContent: React.FC<NqContentProps> = ({
  surface,
  loading,
  icon,
  trailing,
  badge,
  children,
  spinner,
}) => (
  <span className="relative inline-flex items-center justify-center gap-[inherit] w-full">
    {loading
      ? spinner
      : icon && (
          <span className={`${surface.size.icon} shrink-0 grid place-items-center`} aria-hidden="true">
            {icon}
          </span>
        )}

    <span className="min-w-0">{children}</span>

    {trailing && (
      <span className={`${surface.size.icon} shrink-0 grid place-items-center`} aria-hidden="true">
        {trailing}
      </span>
    )}

    {badge && (
      <span
        className={`${surface.size.badge} rounded-full grid place-items-center shrink-0`}
        style={{ background: surface.badgeBg, color: surface.badgeFg }}
        aria-hidden="true"
      >
        {badge}
      </span>
    )}
  </span>
);
