import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OBSIDIAN, ORANGE, ORANGE_ON_DARK, PAPER, PAPER_DEEP, WHITE } from '../../lib/homePalette';
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

export type NqTone = 'chrome' | 'paper' | 'white' | 'obsidian' | 'glass' | 'frost' | 'footer' | 'signal';
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
 * ## Why the accent's ink has now flipped twice
 *
 * Three accents, three answers, which is the whole reason this table gets rewritten pair by pair
 * rather than swapped by search-and-replace. Cobalt (`#2864FF`) was dark enough that white read on
 * it and Midnight did not. Signal Orange (`#FF8E3D`) went the other way — white on it was 2.29:1,
 * under even the 3:1 floor for a large mark, where Obsidian was 8.67:1 — so for the length of that
 * identity the accent was the rare saturated fill that wanted a DARK label.
 *
 * The accent is `#273036` now, and it is back to Cobalt's side of the line, harder: Obsidian on it
 * is 1.47:1 and white is 13.44:1. Every pair below that puts a label on the accent uses white.
 *
 * ## And why half of them use a different accent value entirely
 *
 * A bright accent has one failure mode — the ink on it. A dark accent has two, because it can also
 * fail against the GROUND it stands on: `#273036` measures 1.47:1 on Obsidian and 1.35:1 on
 * Graphite, so on any dark surface the fill simply is not there. `ORANGE_ON_DARK` (`#C4CED4`) is
 * the accent's light twin for exactly those places.
 *
 * Which of the two a pair takes is decided by what is BEHIND it, never by the tone's name. The
 * badge on `obsidian.solid` sits on that tone's white pill and keeps the dark accent; the badge on
 * `footer.solid` sits on that tone's Obsidian pill and takes the light twin. The two lines read
 * almost identically and resolve opposite ways.
 *
 * ## Where Obsidian actually lives, after three passes on the same question
 *
 * The brief ruled out Orange as any kind of background, including a quiet tint — that part never
 * moved. What moved is WHERE the dark neutral lives. Pass one put Obsidian on the full-bleed
 * sections themselves; the client asked for Orange there instead; the client's third pass asked
 * for white sections with black confined to "where secondary things are written" — read as: the
 * flat sections (and `SECTION_TONES` / `SIGNAL_TONES` in TileField.tsx) are WHITE now, and
 * Obsidian lives in the bounded panel each section carries instead — the hero's curtain, the
 * timeline's frosted panel, the templates grid's two cards (the `obsidian` tone below). Orange
 * moved the other way: off the flat ground entirely and onto the cube swell itself.
 */
export const TONES: Record<NqTone, ToneSpec> = {
  /* The dark site chrome: navbar, login, cookie bar, dialogs. This is the tone the accent change
     hit hardest, because every pair here stands on Obsidian and the accent measures 1.47:1 against
     it — a sign-in pill in `#273036` on the navbar would have been an invisible rectangle with a
     label floating in it. So the whole tone runs on ORANGE_ON_DARK (12.39:1 on Obsidian), and the
     ink on it goes back to being dark, since the light twin is a light fill. The tone keeps the
     shape it always had — accent fill, contrasting label — at the other end of the ramp. */
  chrome: {
    solid: { bg: ORANGE_ON_DARK, fg: OBSIDIAN, badgeBg: OBSIDIAN, badgeFg: ORANGE_ON_DARK },
    quiet: { bg: CHROME_QUIET, fg: '#F4F4F5', badgeBg: ORANGE_ON_DARK, badgeFg: OBSIDIAN },
    ghost: { bg: 'transparent', fg: '#F4F4F5', tile: CHROME_QUIET, badgeBg: ORANGE_ON_DARK, badgeFg: OBSIDIAN },
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
    /* `solid` is the ACCENT, not the black pill it was. A page sweep found that pill was one of
       only two near-black fills left on the site, and a primary control on a light ground is what
       the accent is FOR in this identity — this is the same pair `signal` already uses on the
       sign-in card, down to the white badge disc.

       Deliberately not white, which is what the footer's CTA became in the same breath: that one
       sits INSIDE the #273036 card, where white is 13.44:1. This one stands on the warm-white
       section, where a white fill measures 1.07:1 and the button would be a label floating in the
       page. Same instruction, opposite ground, opposite answer.

       Measured: accent on warm white 12.53:1, its white label 13.44:1, the disc 13.44:1 both
       ways. `darkRing` is unaffected — the ring is drawn outside the button with an offset, so it
       is measured against the page (18.48:1) and not against the fill. */
    solid: { bg: ORANGE, fg: '#FFFFFF', badgeBg: '#FFFFFF', badgeFg: ORANGE },
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
  /* Named for the ground this tone was built for, and — third pass now — actually matches it
     again. It served ContactSection first (genuinely Obsidian), then Orange when the client
     asked for a saturated ground there; ContactSection's ground is WHITE now (see that file, and
     `tone="white"` is what its button uses instead) and this tone has moved on to the templates
     grid's two cards, which are a REAL dark ground under the third pass — an ~90% Obsidian glass
     panel over the page's white (`#202224`), not a tint the tone has to guess at. `solid` never
     changed through any of this: `{bg: WHITE, fg: OBSIDIAN}` is a light pill that reads on any
     ground darker than itself, orange or true Obsidian alike. `ghost.fg` and `.tile`, and the
     ring, are what actually depend on which ground is real: `fg` is WHITE again (this ground is
     genuinely dark, so white text is what reads, the reverse of the Orange interlude), `tile` is
     the card's own `#202224`, and the ring goes back to white (`darkRing: false`) since a dark
     ring on a dark card would vanish the same way a white one vanished on Orange. */
  obsidian: {
    /* Two badges, opposite answers, and the difference is the fill under each: `solid`'s disc
       sits on a WHITE pill where the dark accent is 13.44:1, `ghost`'s sits on the card's own
       `#202224` where it would be 1.3:1. */
    solid: { bg: WHITE, fg: OBSIDIAN, badgeBg: ORANGE, badgeFg: '#FFFFFF' },
    quiet: { bg: '#3F444B', fg: '#FFFFFF', badgeBg: OBSIDIAN, badgeFg: PAPER },
    ghost: { bg: 'transparent', fg: '#FFFFFF', tile: '#202224', badgeBg: ORANGE_ON_DARK, badgeFg: OBSIDIAN },
    accent: ORANGE,
    darkRing: false,
  },
  /* The footer, a paper ground that carries the accent rather than being filled with it — so its
     call to action is the one surface on the site that is accent-on-paper. It gets its own entry
     rather than borrowing `paper` (whose solid is Obsidian, and Obsidian is not what the footer's
     `--ft-accent` means) or `chrome` (whose ring is white, and white on paper is no ring at all).

     `solid` is WHITE, on the owner's call, and that also repairs something the card's move to
     the accent quietly broke: this pill was OBSIDIAN, which is 1.47:1 against a #273036 card — a
     black button on a slate card with no edge between them. White is 13.44:1, and its Obsidian
     label 19.82:1. The badge inverts with the fill or it vanishes the other way: the light twin
     was right on a black pill and measures 1.60:1 on a white one.

     The other two badges sit on paper and keep the dark accent with white glyphs. Three lines,
     three different grounds, three answers.

     `darkRing` was already correct and stays: the ring is #080A0D, 19.82:1 on the new fill. */
  footer: {
    solid: { bg: '#FFFFFF', fg: OBSIDIAN, badgeBg: ORANGE, badgeFg: '#FFFFFF' },
    quiet: { bg: 'rgba(39,48,54,0.16)', fg: OBSIDIAN, tile: PAPER_DEEP, badgeBg: ORANGE, badgeFg: '#FFFFFF' },
    ghost: { bg: 'transparent', fg: OBSIDIAN, tile: PAPER, badgeBg: ORANGE, badgeFg: '#FFFFFF' },
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
  /* Recomputed a second time now that the hero's panel has moved back to Obsidian (the third
     pass — see HomeHero's own note): `tile` is the translucent fill's real colour over whatever
     is actually behind it, and that ground is Obsidian again. `ghost`'s `fg` flips from Obsidian
     back to white, the reverse of the Orange interlude — this button is genuinely transparent,
     so its label sits on the real Obsidian fill, where white is 18+:1 and Obsidian text would be
     invisible. `darkRing` follows the same reversal: a dark ring vanishes on a dark panel, so
     it's false again, as it was before the Orange interlude. */
  glass: {
    solid: { bg: 'rgba(255,255,255,0.92)', fg: OBSIDIAN, tile: '#E4E4E2', badgeBg: ORANGE, badgeFg: '#FFFFFF' },
    quiet: { bg: 'rgba(255,255,255,0.55)', fg: OBSIDIAN, tile: '#8B8C8D', badgeBg: OBSIDIAN, badgeFg: '#FFFFFF' },
    ghost: { bg: 'transparent', fg: '#FFFFFF', tile: OBSIDIAN, badgeBg: OBSIDIAN, badgeFg: '#FFFFFF' },
    accent: ORANGE,
    darkRing: false,
  },
  /* `glass` again, on a LIGHT page instead of a dark one — the sign-in card, which is frosted
     white over the card field. Exactly the move `signal` makes below for Orange: the same fill,
     the opposite ring, because `darkRing` is keyed to the PAGE and not to the button. `glass`'s
     white ring is correct on the hero's Obsidian panel and vanishes here.

     `ghost` also flips its label to Obsidian for the same reason: this button is genuinely
     transparent, so its text sits on the frosted card, where white would be invisible.

     Nothing drawn around it, and that is the owner's call twice over: a 1px outline read as a
     frame, and a soft shadow after it was not wanted either. So the fill is on its own, and it
     is fully opaque #FFFFFF rather than the 92% `glass` uses — the most separation a white
     button can have from a white card without drawing anything at all. Measured, that is 1.06:1
     where the card is neutral, and a little more wherever the Orange behind the glass warms it.
     The label is what identifies this control; the fill is not doing that work. */
  frost: {
    solid: { bg: '#FFFFFF', fg: OBSIDIAN, badgeBg: ORANGE, badgeFg: '#FFFFFF' },
    quiet: { bg: 'rgba(255,255,255,0.55)', fg: OBSIDIAN, tile: '#8B8C8D', badgeBg: OBSIDIAN, badgeFg: '#FFFFFF' },
    ghost: { bg: 'transparent', fg: OBSIDIAN, tile: WHITE, badgeBg: OBSIDIAN, badgeFg: PAPER },
    accent: ORANGE,
    darkRing: true,
  },
  /* The accent as an actual fill, on a LIGHT surface — the sign-in card's primary button. It was
   * created as "`chrome`'s fill with a dark ring instead of white", back when both were Orange;
   * `chrome` has since had to move to the light twin to survive its dark ground, so this is now
   * the ONE tone that still fills with the accent itself. It keeps `darkRing: true`, which is the
   * reason it was split out: a white ring is invisible on the light card next to it.
   *
   * This is also the pair the change helps rather than fights. Orange was the weakest silhouette
   * in the table on a light card; `#273036` measures 12.53:1 against warm white, and its white
   * label 13.44:1 on the fill. The badge inverts with it — an Obsidian disc on a `#273036` button
   * is 1.47:1, so the disc becomes white with the accent as its glyph. */
  signal: {
    solid: { bg: ORANGE, fg: '#FFFFFF', badgeBg: '#FFFFFF', badgeFg: ORANGE },
    quiet: { bg: CHROME_QUIET, fg: '#F4F4F5', badgeBg: ORANGE_ON_DARK, badgeFg: OBSIDIAN },
    ghost: { bg: 'transparent', fg: '#FFFFFF', tile: ORANGE, badgeBg: '#FFFFFF', badgeFg: ORANGE },
    accent: WHITE,
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
const MAX_LIVE_FIELDS = 2;
let liveFields = 0;

/* خُفِّض من 4 إلى 2.
   كانت 4 "هامشاً" لتداخل بقاء حقل مع بدء الذي يليه — أي أن أربعة سياقات WebGL قد تكون حيّة
   معاً مقابل زخرفة تُرى في مكان واحد. وكل سياق منها تخصيصٌ على بطاقة الرسوميات وترجمة shader
   على الخيط الرئيسي. اثنان يكفيان لما يمكن أن يُرى فعلاً — مؤشّر في مكان، وتركيز لوحة مفاتيح
   في مكان ثانٍ — ويجعلان السقف حقيقياً لا اسمياً: مهما أسرع المؤشّر، لا يتجاوز العدد اثنين. */

/** How long the field stays mounted after the pointer leaves, so it can settle out rather than
    vanish mid-fall. Matched to the ease-out in ButtonTiles. */
const LINGER_MS = 900;

/**
 * كم يبقى المؤشّر على الزرّ قبل أن يُنشأ له سياق WebGL أصلاً.
 *
 * كل تركيب لهذا الحقل سياق WebGL جديد، وكل تفكيك `forceContextLoss()` — وthree تطبع سطراً في
 * الكونسول عند كل واحد منهما. مؤشّر يمرّ فوق شريط فيه ستة أزرار في طريقه إلى السابع كان ينشئ
 * ستة سياقات ويتلفها في أقل من ثانية: ستّة أسطر في الكونسول، وستّ دورات تخصيص وتحرير على بطاقة
 * الرسوميات، مقابل زخرفة لم يرها أحد.
 *
 * 120ms أطول من مرور عابر وأقصر من قصد. والضغط والتركيز بلوحة المفاتيح يتجاوزانها: كلاهما
 * نيّة صريحة لا تحتمل تأخيراً.
 */
const WAKE_DELAY_MS = 120;

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
  const wakeTimer = useRef<number | undefined>(undefined);
  /* نسخة مرجعية من `mounted` ليقرأها المؤقّت: المؤقّت يعيش في إغلاق قد يكون قديماً، وقراءة
     الحالة منه مباشرة كانت ستعني احتساب فتحة (slot) مرّتين. */
  const mountedRef = useRef(false);

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
      window.clearTimeout(wakeTimer.current);
      release();
    },
    [release],
  );

  const mount = useCallback(() => {
    if (mountedRef.current) return;
    if (!claim()) return;
    mountedRef.current = true;
    setMounted(true);
  }, [claim]);

  /** `immediate` للضغط والتركيز؛ المرور بالمؤشّر ينتظر WAKE_DELAY_MS. */
  /* التركيب مؤجَّل دائماً، بلا استثناء "فوري".
   *
   * كان للضغط والتركيز مسار يركّب الحقل في نفس اللحظة، بحجّة أن كليهما نيّة صريحة لا تحتمل
   * تأخيراً. والنيّة صحيحة، لكن ما يقع في تلك اللحظة ليس رسم زخرفة: هو إنشاء WebGLRenderer
   * وترجمة shader، متزامنَين، داخل معالج الضغطة — أي أن الموقع يتوقّف عند كل نقرة ليجهّز
   * مكعّبات. وهذا ما كان يظهر في الكونسول كـ"[Violation] 'click' handler took Nms" عشر مرّات
   * متتالية.
   *
   * الآن مسار واحد: مؤقّت قصير ثم تركيب. من ينوي الضغط يكون قد مرّ بالمؤشّر أوّلاً فالحقل
   * جاهز قبل يده؛ ومن ضغط مباشرة يرى المكعّبات بعد جزء من الثانية — بلا أن تتوقّف الصفحة
   * لحظة الضغط. والحركة تبدأ فوراً في الحالتين لأن `drive` مجرّد ref يقرؤه الحقل حين يوجد،
   * فيظهر في منتصف حركته لا من الصفر. */
  const wake = useCallback(() => {
    if (!wantsTiles) return;
    window.clearTimeout(lingerTimer.current);
    drive.current.target = 1;
    if (mountedRef.current || wakeTimer.current !== undefined) return;
    wakeTimer.current = window.setTimeout(() => {
      wakeTimer.current = undefined;
      mount();
    }, WAKE_DELAY_MS);
  }, [wantsTiles, mount]);

  const sleep = useCallback(() => {
    drive.current.target = 0;
    rect.current = null;
    // غادر المؤشّر قبل أن ينتهي التأخير: لا سياق يُنشأ إطلاقاً، وهذا هو كل المكسب.
    window.clearTimeout(wakeTimer.current);
    wakeTimer.current = undefined;
    window.clearTimeout(lingerTimer.current);
    lingerTimer.current = window.setTimeout(() => {
      mountedRef.current = false;
      setMounted(false);
      release();
    }, LINGER_MS);
  }, [release]);

  /* صندوق العنصر، مقيساً مرّة عند الدخول لا عند كل حركة.
   *
   * كانت `localise` تستدعي getBoundingClientRect() في كل حدث pointermove — وهذه قراءة تُجبر
   * المتصفح على إعادة حساب التخطيط فوراً إن كان هناك أي تغيير معلّق (forced synchronous
   * layout). أي أن مجرّد تحريك المؤشّر فوق زرّ كان يفرض دورة تخطيط لكل حدث، وهو ما يظهر في
   * الكونسول كـ"[Violation] Forced reflow while executing JavaScript".
   *
   * الصندوق لا يتغيّر أثناء المرور فوقه، فقياسه مرّة عند الدخول (وعند الضغط، تحسّباً لتمرير
   * الصفحة بينهما) يكفي — والحركة بعدها حساب بلا لمس DOM. */
  const rect = useRef<DOMRect | null>(null);

  const measure = useCallback(() => {
    const node = el.current;
    rect.current = node ? node.getBoundingClientRect() : null;
  }, []);

  /** Pointer position as a fraction of the element's own box. */
  const localise = useCallback((e: React.PointerEvent) => {
    const r = rect.current;
    if (!r || !r.width || !r.height) return { x: 0.5, y: 0.5 };
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
      measure();
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
      // قياس ثانٍ: قد تكون الصفحة مُرِّرت بين الدخول والضغط، فيصير الصندوق المخزَّن قديماً.
      measure();
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
