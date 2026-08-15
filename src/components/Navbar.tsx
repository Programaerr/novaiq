import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Layers,
  Compass,
  Home,
  Building2,
  Globe,
  LogIn,
  UserCircle2,
  ShieldCheck,
  FileText,
  DollarSign
} from 'lucide-react';
import { Language } from '../lib/i18n';
import { Currency } from '../lib/currency';
import { useFloatingBarBottom } from '../lib/useFloatingBarBottom';
import { NovaiqLogo } from './NovaiqLogo';

// The nav toggle's icon: three uneven bars that settle toward an even split on hover, and
// morph in place into an X on open — the same three bars animating throughout, never two
// icons swapped for each other. The header around it is permanently dir="ltr" (see comment
// below), so `start-0` always anchors the bars to the physical left and tapers rightward.
// Mirrored with scale-x-[-1] so it reads correctly for the button's fixed spot on the bar's
// physical right, without touching the shared .nav-menu-bar transform-origin CSS that other
// menu glyphs in the codebase (site preview drawers) still rely on following [dir] normally.
const AnimatedMenuIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <span className="relative block w-4 h-3.5 -scale-x-100" aria-hidden="true">
    <span
      className={`nav-menu-bar absolute start-0 top-0 h-0.5 w-4 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.65,0,0.35,1)] ${
        open ? 'translate-y-[6px] rotate-45 scale-x-100' : 'translate-y-0 rotate-0 scale-x-100 group-hover:scale-x-[0.62]'
      }`}
    />
    <span
      className={`nav-menu-bar absolute start-0 top-1/2 -translate-y-1/2 h-0.5 w-4 rounded-full bg-current transition-all duration-200 ease-out ${
        open ? 'scale-x-0 opacity-0' : 'scale-x-[0.625] opacity-100 group-hover:scale-x-100'
      }`}
    />
    <span
      className={`nav-menu-bar absolute start-0 bottom-0 h-0.5 w-4 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.65,0,0.35,1)] ${
        open ? '-translate-y-[6px] -rotate-45 scale-x-100' : 'translate-y-0 rotate-0 scale-x-[0.75] group-hover:scale-x-[0.82]'
      }`}
    />
  </span>
);

interface NavbarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  setActivePage,
  language,
  setLanguage,
  currency,
  setCurrency,
}) => {
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  // Stands in for :hover on touch screens — pressing the brand plays the same reveal, then it
  // settles back on its own. Deliberately not a toggle tied to the click: the logo is still a
  // link home, and swallowing the first tap to open an animation would be a worse trade.
  const [logoRevealed, setLogoRevealed] = useState(false);
  const logoRevealTimer = useRef<number | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  // Deliberately the glass pill, not the <header>: the drawer is a child of <header>, so
  // measuring the header would make everything below the navbar jump down whenever the menu
  // is opened. The pill is the actual bar, and the drawer is its sibling.
  const barRef = useRef<HTMLDivElement | null>(null);
  // undefined = the initial auth check hasn't resolved yet. Left this way (instead of
  // defaulting to false) so an already-logged-in visitor never sees the page flash
  // "Login" for a moment before flipping to "My Account" — the skeleton bridges that gap.
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const isAr = language === 'ar';

  // Everything below the navbar (PageBackBar, page content) positions itself off this.
  useFloatingBarBottom(barRef, '--nav-bottom');

  // Lightweight presence check only — just enough to swap "Login" for "My Account" in the
  // nav (using the Google account's own profile photo instead of an icon+label once signed
  // in). AdminPage does the real work of telling admins and customers apart after this.
  // Dynamically imported (not a static import) so Firebase never loads on a page view that
  // never touches auth — Navbar itself renders eagerly on every single page.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    import('../lib/auth').then(({ subscribeToAuthState }) => {
      if (cancelled) return;
      unsubscribe = subscribeToAuthState((user) => {
        setIsLoggedIn(!!user);
        setAvatarUrl(user?.photoURL || null);
        setAvatarBroken(false);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // The drawer no longer carries its own close control (the toggle button itself already
  // shows an X once open) — so clicking anywhere outside it, or pressing Escape, is what
  // takes over that job instead.
  useEffect(() => {
    if (!menuDrawerOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (drawerRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      setMenuDrawerOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuDrawerOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [menuDrawerOpen]);

  const navItems = [
    { id: 'home', label: isAr ? 'الرئيسية' : 'Home', icon: Home, href: '/' },
    { id: 'templates', label: isAr ? 'القوالب البرمجية' : 'Ready Templates', icon: Layers, href: '?page=templates' },
    { id: 'timeline', label: isAr ? 'مراحل العمل والتسليم' : 'Roadmap & Process', icon: Calendar, href: '?page=timeline' },
    { id: 'about', label: isAr ? 'عن NOVAIQ' : 'About NOVAIQ', icon: Building2, href: '?page=about' },
    { id: 'privacy', label: isAr ? 'سياسة الخصوصية' : 'Privacy Policy', icon: ShieldCheck, href: '?page=privacy' },
    { id: 'terms', label: isAr ? 'الشروط والأحكام' : 'Terms of Service', icon: FileText, href: '?page=terms' },
  ];

  const handleNavClick = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActivePage(id);
    setMenuDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const newUrl = id === 'home'
      ? window.location.pathname
      : `${window.location.pathname}?page=${id}`;
    window.history.pushState({}, '', newUrl);
  };

  // Signed-out visitors go to the sign-in screen itself, not to the account page.
  //
  // This pointed at `?page=orders` while sign-in gated the whole site: the navbar only ever
  // rendered for someone already signed in, so the signed-out branch below was unreachable and
  // where it pointed did not matter. Guests made it reachable again — they browse without an
  // account and this button is how they sign in — and sending them to the account page would
  // have shown them a sign-in form wrapped in the chrome of a page they cannot see, instead of
  // the full-screen sign-in page.
  const goToLogin = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActivePage('login');
    setMenuDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.pushState({}, '', `${window.location.pathname}?page=login`);
  };

  return (
    // dir="ltr" is forced here on purpose, independent of the active language — the whole
    // point is that the navbar's physical layout never mirrors when switching languages, so
    // the site doesn't visually "jump" every time someone toggles AR/EN. The two side groups
    // below are deliberately ordered to match the site's native Arabic (RTL) reading layout —
    // menu/language on the physical right, account/login on the physical left — and then kept
    // permanently fixed in that arrangement regardless of language. Only the drawer's own text
    // content flips reading direction internally (see dir on the drawer panel).
    // top-3 on mobile is left exactly as tuned; sm:top-2 lifts the whole bar 4px on larger
    // screens, where there was more dead space above it. Everything underneath re-derives
    // from the measured bottom edge, so this one value is all that needs changing.
    // Width comes from --nq-container, the same token every section below reads, rather than from
    // its own `max-w-7xl`. The two agreed while both were 80rem; once the container widened on
    // ultrawide the header stayed at 1280 against 1600 of content and sat visibly inset — a
    // floating bar narrower than the page it belongs to. Its PADDING stays its own: this is a pill
    // with its own edge, not a text column, so it does not want the container's gutters.
    <header dir="ltr" className="fixed top-3 sm:top-2 left-0 right-0 z-50 w-full max-w-[var(--nq-container)] mx-auto px-3 sm:px-6 transition-all duration-300 pointer-events-auto">
      {/* Transparent spacer holding the two halves apart — it paints nothing itself. Each half
          below is its own independent glass bar: the LOGIN cluster and the NAVIGATION group are
          two completely separate bars with no connection between them. No border, no outline
          anywhere (see .navbar-glass in index.css). */}
      <div
        ref={barRef}
        className="flex items-center justify-between gap-6 sm:gap-10 relative"
      >

        {/* ── Half 1 (physical left): LOGIN — the brand logo and the account/login entry in one
            self-contained glass bar. Logo sits inside this half, per the requested split. */}
        <div className="navbar-glass flex items-center gap-3 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl relative z-10">
          <a
            href="/"
            onClick={(e) => handleNavClick('home', e)}
            onTouchStart={() => {
              setLogoRevealed(true);
              if (logoRevealTimer.current) window.clearTimeout(logoRevealTimer.current);
              logoRevealTimer.current = window.setTimeout(() => setLogoRevealed(false), 2200);
            }}
            className="flex items-center justify-center cursor-pointer group"
          >
            <NovaiqLogo size={34} showText={true} animated revealed={logoRevealed} />
          </a>

          <span aria-hidden="true" className="hidden sm:block h-7 w-px bg-white/10" />

          {isLoggedIn === undefined ? (
            <div
              aria-hidden="true"
              className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 animate-pulse"
            />
          ) : isLoggedIn ? (
            <a
              href="?page=orders"
              onClick={(e) => handleNavClick('orders', e)}
              title={isAr ? 'حسابي' : 'My Account'}
              className={`relative flex items-center justify-center p-1 rounded-full border transition-all cursor-pointer ${
                activePage === 'orders'
                  ? 'border-white'
                  : 'border-zinc-700 hover:border-zinc-500'
              }`}
            >
              {avatarUrl && !avatarBroken ? (
                <img
                  src={avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarBroken(true)}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <UserCircle2 className="w-7 h-7 text-zinc-300" />
              )}
            </a>
          ) : (
            <a
              href="?page=login"
              onClick={goToLogin}
              className="filter-pill-btn relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap cursor-pointer"
            >
              <span className="filter-pill-beam" aria-hidden="true" />
              <LogIn className="w-4 h-4 text-current shrink-0" />
              <span className="hidden sm:inline text-current">{isAr ? 'تسجيل دخول' : 'Login'}</span>
            </a>
          )}
        </div>

        {/* ── Half 2 (physical right): NAVIGATION — its own glass bar, completely separate from
            the login cluster. Page links render inline from `lg` up; the hamburger menu button
            is mobile-only and hidden from `lg` up. */}
        <div className="navbar-glass flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl relative z-10">
          <nav className="hidden lg:flex items-center gap-0.5" aria-label={isAr ? 'التنقل الرئيسي' : 'Main navigation'}>
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.id, e)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-black shadow-lg'
                      : 'text-zinc-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            title={isAr ? 'تبديل اللغة' : 'Switch language'}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span className="font-mono">{isAr ? 'AR' : 'EN'}</span>
          </button>

          <button
            ref={menuButtonRef}
            onClick={() => setMenuDrawerOpen(!menuDrawerOpen)}
            aria-label={isAr ? (menuDrawerOpen ? 'إغلاق القائمة' : 'فتح القائمة') : (menuDrawerOpen ? 'Close menu' : 'Open menu')}
            aria-expanded={menuDrawerOpen}
            className={`lg:hidden group flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 transition-transform duration-300 active:duration-100 cursor-pointer active:scale-90 active:opacity-70 ${
              menuDrawerOpen ? 'text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <AnimatedMenuIcon open={menuDrawerOpen} />
          </button>
        </div>

      </div>

      {/* Floating Side Drawer Menu — a sibling of the glass pill above, not nested inside it.
          Both use the static .glass-bar material, so there is no backdrop-filter nesting to
          worry about any more (a nested backdrop-blur used to sample the ancestor's own
          blurred layer instead of the real page, rendering as a flat dark box). The pill stays
          separately positioned against the <header>. */}
      {menuDrawerOpen && (
        <div
          ref={drawerRef}
          dir={isAr ? 'rtl' : 'ltr'}
          data-lenis-prevent
          style={{ overscrollBehavior: 'contain' }}
          // Sized down from w-80/p-4/space-y-3, which rendered 320x503 — on a 393px phone that
          // was 81% of the width and 59% of the screen height for what is a seven-item list.
          // The width only came down a notch (w-72): the currency row below has a label and a
          // value pill side by side and needs ~240px of inner width to hold them on one line,
          // so the real saving is vertical, taken out of each row rather than out of the panel.
          className="glass-bar glass-bar--blur absolute top-full mt-3 right-3 sm:right-6 w-72 max-h-[75vh] overflow-y-auto border border-white/15 rounded-2xl p-3 shadow-2xl space-y-2 z-50 animate-fade-in"
        >
          {/* No close control here — the toggle button already becomes an X once the
              drawer is open, so a second one here would just be the same action twice.
              Clicking outside the drawer, or Escape, close it instead (see the effect
              above). */}
          <div className="pb-2 border-b border-zinc-800">
            <span className="text-[11px] font-bold text-white flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-white" />
              <span>{isAr ? 'أقسام منصة NOVAIQ' : 'NOVAIQ Pages'}</span>
            </span>
          </div>

          {/* Row height is what the panel's height actually is — seven of these are the whole
              list. The icon tile sets the floor (it is taller than the label beside it), so it
              comes down with the padding; trimming only the padding around a 32px tile would
              have bought almost nothing. 48px per row before, 40 now. */}
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.id, e)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-[11px] transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-black font-bold shadow-lg'
                      : 'text-zinc-300 font-medium hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      isActive ? 'bg-black text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>

          {/* Currency — independent of language on purpose: the store is fully Iraqi, so
              switching to English must not silently convert every price to dollars. USD
              only ever shows by an explicit choice made here. No backdrop-blur of its own:
              the drawer panel it sits inside already blurs the page behind it. */}
          <div className="pt-1.5 border-t border-zinc-800">
            <button
              onClick={() => setCurrency(currency === 'IQD' ? 'USD' : 'IQD')}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-white/10 text-zinc-100 text-[11px] font-medium cursor-pointer transition-colors shadow-lg glow-white-hover"
            >
              <span className="flex items-center gap-2 shrink-0">
                <DollarSign className="w-3.5 h-3.5 text-zinc-300" />
                <span>{isAr ? 'عملة عرض الأسعار' : 'Display Currency'}</span>
              </span>
              {/* No font-mono here. A monospace family carries no Arabic glyphs, so the browser
                  falls back per-character for "دينار عراقي" — which breaks the cursive joins and
                  pads every letter out to the mono advance width, exactly the stretched,
                  disconnected look this had. It survived unnoticed while the label was only ever
                  read as a currency code; it is a whole Arabic phrase. The page font shapes it
                  properly, and the Latin "(IQD)" reads fine in it too.
                  whitespace-nowrap, and the label beside it shrink-0: this row is the one place
                  in the panel where two pieces of text compete for a single line, and it is why
                  the panel is not narrower than w-72. Without these the value wraps mid-phrase
                  as soon as the longer English string ("Iraqi Dinar (IQD)") is in play. */}
              <span className="px-2 py-0.5 rounded-lg bg-white/10 text-white text-[11px] font-bold border border-white/10 whitespace-nowrap">
                {currency === 'IQD' ? (isAr ? 'دينار عراقي (IQD)' : 'Iraqi Dinar (IQD)') : (isAr ? 'دولار أمريكي (USD)' : 'US Dollar (USD)')}
              </span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
