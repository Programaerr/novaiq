import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Layers,
  Compass,
  FileSignature,
  Home,
  Building2,
  Globe,
  LogIn,
  UserCircle2
} from 'lucide-react';
import { Language } from '../lib/i18n';
import { NovaiqLogo } from './NovaiqLogo';

// The nav toggle's icon: three uneven bars that settle toward an even split on hover, and
// morph in place into an X on open — the same three bars animating throughout, never two
// icons swapped for each other. Anchored with the logical `start` side (not a hardcoded
// `left`) so the uneven lengths land on the correct physical edge in both the Arabic (RTL)
// and English (LTR) shells instead of only ever reading right in one of them.
const AnimatedMenuIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <span className="relative block w-4 h-3.5" aria-hidden="true">
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
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  setActivePage,
  language,
  setLanguage,
}) => {
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  // undefined = the initial auth check hasn't resolved yet. Left this way (instead of
  // defaulting to false) so an already-logged-in visitor never sees the page flash
  // "Login" for a moment before flipping to "My Account" — the skeleton bridges that gap.
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const isAr = language === 'ar';

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
    { id: 'custom-request', label: isAr ? 'عقد مخصص وتطوير' : 'Custom Contract', icon: FileSignature, href: '?page=custom-request' },
    { id: 'timeline', label: isAr ? 'مراحل العمل والتسليم' : 'Roadmap & Process', icon: Calendar, href: '?page=timeline' },
    { id: 'about', label: isAr ? 'عن NOVAIQ' : 'About NOVAIQ', icon: Building2, href: '?page=about' },
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

  // Separate from handleNavClick because these two need an extra `mode` query param so
  // the account page opens on the matching tab — AdminLogin reads it directly on mount.
  const goToAccount = (mode: 'login' | 'signup', e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setActivePage('orders');
    setMenuDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.pushState({}, '', `${window.location.pathname}?page=orders&mode=${mode}`);
  };

  return (
    <header className="fixed top-3 left-0 right-0 z-50 w-full max-w-7xl mx-auto px-3 sm:px-6 transition-all duration-300 pointer-events-auto">
      <div className="bg-black/55 backdrop-blur-md border border-white/15 rounded-2xl sm:rounded-3xl p-3 sm:px-6 shadow-2xl shadow-black flex items-center justify-between gap-3 relative">
        
        {/* Side 1: Menu & Navigation Triggers */}
        <div className="flex items-center gap-2 relative z-10">
          <button
            ref={menuButtonRef}
            onClick={() => setMenuDrawerOpen(!menuDrawerOpen)}
            aria-label={isAr ? (menuDrawerOpen ? 'إغلاق القائمة' : 'فتح القائمة') : (menuDrawerOpen ? 'Close menu' : 'Open menu')}
            aria-expanded={menuDrawerOpen}
            className={`group flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 transition-transform duration-300 active:duration-100 cursor-pointer active:scale-90 active:opacity-70 ${
              menuDrawerOpen ? 'text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <AnimatedMenuIcon open={menuDrawerOpen} />
          </button>
        </div>

        {/* Center: Brand Logo — absolutely positioned against the bar (which is `relative`)
            instead of just being the middle flex child, so it stays pixel-perfect centered
            regardless of how wide the menu button or account button happen to be (their
            widths differ by auth state and language, which would otherwise nudge it off-center). */}
        <a
          href="/"
          onClick={(e) => handleNavClick('home', e)}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer group z-10"
        >
          <NovaiqLogo size={34} showText={true} animated />
        </a>

        {/* Side 2: Account — before login, a single "Login" entry point (Google sign-in
            covers both login and first-time sign-up in one click, so a separate "Sign Up"
            button would just be a second path to the exact same screen); once signed in,
            one "My Account" button (own contracts, or the control panel if the account is
            an admin — AdminPage decides which). */}
        <div className="flex items-center gap-2 relative z-10">
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
              href="?page=orders&mode=login"
              onClick={(e) => goToAccount('login', e)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-zinc-200 text-black border border-white transition-all cursor-pointer white-btn-glow"
            >
              <LogIn className="w-4 h-4 text-black" />
              <span className="hidden sm:inline">{isAr ? 'تسجيل دخول' : 'Login'}</span>
            </a>
          )}
        </div>

      </div>

      {/* Floating Side Drawer Menu — deliberately a sibling of the glass pill above, not
          nested inside it. A backdrop-blur element nested inside another backdrop-blur
          element samples the ANCESTOR's own blurred/darkened layer instead of the real page
          behind both of them — it renders as a flat dark box with no visible glass effect.
          Positioned relative to <header> (which has no filter of its own) instead. */}
      {menuDrawerOpen && (
        <div
          ref={drawerRef}
          className="absolute top-full mt-3 rtl:right-3 sm:rtl:right-6 ltr:left-3 sm:ltr:left-6 w-80 bg-black/55 border border-white/15 rounded-2xl p-4 shadow-2xl backdrop-blur-xl space-y-3 z-50 animate-fade-in"
        >
          {/* No close control here — the toggle button already becomes an X once the
              drawer is open, so a second one here would just be the same action twice.
              Clicking outside the drawer, or Escape, close it instead (see the effect
              above). */}
          <div className="pb-3 border-b border-zinc-800">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-white" />
              <span>{isAr ? 'أقسام منصة NOVAIQ' : 'NOVAIQ Pages'}</span>
            </span>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.id, e)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-black font-bold shadow-lg'
                      : 'text-zinc-300 font-medium hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      isActive ? 'bg-black text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>

          <div className="pt-2 border-t border-zinc-800 space-y-2">
            {/* Language Switcher Button — no backdrop-blur of its own: the drawer panel
                it sits inside already blurs the page behind it, so a second nested
                blur here would only add compositing cost with no visible difference. */}
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-white/10 text-zinc-100 text-xs font-medium cursor-pointer transition-colors shadow-lg glow-white-hover"
            >
              <span className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-zinc-300" />
                <span>{isAr ? 'لغة المنصة / Language' : 'App Language / اللغة'}</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white font-mono text-[11px] font-bold border border-white/10">
                {isAr ? 'العربية (AR)' : 'English (EN)'}
              </span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
