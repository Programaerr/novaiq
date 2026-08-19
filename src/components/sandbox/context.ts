import type { ThemeColor } from '../../data/sandboxDemoData';

// The palette every demo surface is painted from, and nothing else. This file used to also
// carry `SandboxCtx` — the ~20-member object ten different template demos each took a slice
// of. There is one demo now, and it has its own context next door in ./rental/rentalContext.ts
// written for what it actually needs, so the general-purpose one had nothing left to serve.

/** The palette a demo paints itself with, derived from the customer's colour choice. */
export interface SandboxTheme {
  primaryBg: string;
  primaryText: string;
  primaryBorder: string;
  badgeBg: string;
  gradient: string;
  /** Text/icon colour that stays legible *on* primaryBg — monochrome's is white, so this flips to black there. */
  onPrimary: string;
  /** A solid button sitting on a *light* surface (the white property cards), where primaryBg
   *  can't be reused directly: the mid-tone palettes read fine on white, but monochrome's
   *  primaryBg is itself white and would vanish into the card. Only monochrome differs. */
  solidOnLight: string;
  solidOnLightText: string;
  /** A dark card body tinted toward the palette's hue — a raw hex, not a Tailwind class, and
   *  the only field here that is. The car catalogue card paints this value twice, as its own
   *  background and as the end stop of the gradient that dissolves the photo into it, and the
   *  two have to be the same colour to the byte or a seam appears where the photo stops. A
   *  class name cannot be handed to a gradient stop, so the hex travels instead. */
  cardSurface: string;
}

/**
 * Tailwind class sets per palette. Kept as whole literal class strings rather than composed
 * from fragments because Tailwind only ships classes it can see spelled out in the source.
 */
export function themeClassesFor(themeColor: ThemeColor): SandboxTheme {
  switch (themeColor) {
    case 'purple':
      return {
        primaryBg: 'bg-purple-600 hover:bg-purple-500',
        primaryText: 'text-purple-400',
        primaryBorder: 'border-purple-500/40',
        badgeBg: 'bg-purple-500/20 text-purple-300',
        gradient: 'from-purple-950/80 via-slate-900 to-slate-950',
        onPrimary: 'text-white',
        solidOnLight: 'bg-purple-600 hover:bg-purple-500',
        solidOnLightText: 'text-white',
        cardSurface: '#272334',
      };
    case 'cyan':
      return {
        primaryBg: 'bg-cyan-600 hover:bg-cyan-500',
        primaryText: 'text-cyan-400',
        primaryBorder: 'border-cyan-500/40',
        badgeBg: 'bg-cyan-500/20 text-cyan-300',
        gradient: 'from-cyan-950/80 via-slate-900 to-slate-950',
        onPrimary: 'text-white',
        solidOnLight: 'bg-cyan-600 hover:bg-cyan-500',
        solidOnLightText: 'text-white',
        cardSurface: '#1d2c30',
      };
    case 'amber':
      return {
        primaryBg: 'bg-amber-600 hover:bg-amber-500',
        primaryText: 'text-amber-400',
        primaryBorder: 'border-amber-500/40',
        badgeBg: 'bg-amber-500/20 text-amber-300',
        gradient: 'from-amber-950/80 via-slate-900 to-slate-950',
        onPrimary: 'text-white',
        solidOnLight: 'bg-amber-600 hover:bg-amber-500',
        solidOnLightText: 'text-white',
        cardSurface: '#302719',
      };
    case 'rose':
      return {
        primaryBg: 'bg-rose-600 hover:bg-rose-500',
        primaryText: 'text-rose-400',
        primaryBorder: 'border-rose-500/40',
        badgeBg: 'bg-rose-500/20 text-rose-300',
        gradient: 'from-rose-950/80 via-slate-900 to-slate-950',
        onPrimary: 'text-white',
        solidOnLight: 'bg-rose-600 hover:bg-rose-500',
        solidOnLightText: 'text-white',
        cardSurface: '#33232a',
      };
    case 'monochrome':
      return {
        primaryBg: 'bg-white hover:bg-zinc-200 text-black',
        primaryText: 'text-zinc-100',
        primaryBorder: 'border-zinc-400/40',
        badgeBg: 'bg-zinc-800 text-zinc-200',
        gradient: 'from-zinc-900 via-slate-950 to-black',
        // The other themes are all mid-tone (-600) backgrounds that read fine with the
        // hardcoded text-white/icon colour used everywhere primaryBg is applied; monochrome
        // is the one theme whose primaryBg is actually white, so that same white text/icon
        // goes invisible on it unless call sites swap in onPrimary instead.
        onPrimary: 'text-black',
        solidOnLight: 'bg-zinc-900 hover:bg-black',
        solidOnLightText: 'text-white',
        cardSurface: '#232325',
      };
    case 'emerald':
    default:
      return {
        primaryBg: 'bg-emerald-600 hover:bg-emerald-500',
        primaryText: 'text-emerald-400',
        primaryBorder: 'border-emerald-500/40',
        badgeBg: 'bg-emerald-500/20 text-emerald-300',
        gradient: 'from-emerald-950/80 via-slate-900 to-slate-950',
        onPrimary: 'text-white',
        solidOnLight: 'bg-emerald-600 hover:bg-emerald-500',
        solidOnLightText: 'text-white',
        cardSurface: '#232c28',
      };
  }
}
