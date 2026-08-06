import type { Template } from '../../types';
import type { Language } from '../../lib/i18n';
import type { Currency } from '../../lib/currency';
import type { CompanyProfile, SiteAccount, ThemeColor } from '../../data/sandboxDemoData';

// Everything a single template's demo needs from the sandbox shell around it. Each demo lives
// in its own file under ./templates/ and receives exactly this object plus its own state, so a
// demo can be read, understood and edited without opening the shell at all — which was the
// whole problem with the 4,700-line single-component version this replaces.

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
}

export interface SandboxCtx {
  template: Template;
  language: Language;
  currency: Currency;
  /** Currency suffix shown next to bare numbers inside the demos. */
  CUR: string;
  /** Formats an IQD amount in whichever currency the visitor is browsing in. */
  price: (amountIQD: number) => string;
  themeStyle: SandboxTheme;
  /**
   * Picks between a phone-width and a wide column count. The demos render into a viewport
   * that is genuinely their own (the real screen, or a 390/834/1280px device iframe), so this
   * covers only the handful of layout decisions taken in JS rather than in CSS.
   */
  gridCols: (mobileCols: string, wideCols: string) => string;
  isNarrowViewport: boolean;
  /** Which section of the demo site is open — every demo drives its own nav through this. */
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  /** The visitor's in-demo account, once they've "signed in" to the fake site. */
  account: SiteAccount | null;
  /** The shared marketing homepage, rendered from the demo's own company identity. */
  renderCompanyHome: (profile: CompanyProfile) => React.ReactNode;
  /**
   * The sticky glass header every demo sits under — one bar shared by all of them rather
   * than a near-identical copy per template. `logoNameLtr` keeps the SaaS demo's `~/Logo`
   * terminal prompt reading left-to-right inside the otherwise RTL layout.
   */
  renderSiteTopBar: (logoMark: React.ReactNode, logoName: string, logoNameLtr?: boolean) => React.ReactNode;
  /**
   * True when the visitor's query in the shared header matches any of the given fields (or
   * when they haven't typed anything). Every demo filters its own list through this, so one
   * search box drives doctors, rooms, courses, shipments and the rest alike.
   */
  matchesSiteSearch: (...fields: Array<string | number | undefined | null>) => boolean;
  /** Shown in place of a list the visitor's query filtered down to nothing. */
  renderNoSearchResults: (what: string) => React.ReactNode;
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
      };
  }
}
