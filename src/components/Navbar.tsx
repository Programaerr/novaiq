import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Layers,
  Menu,
  X,
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isAr = language === 'ar';

  // Lightweight presence check only — just enough to swap "Login" for "My Account" in the
  // nav. AdminPage does the real work of telling admins and customers apart after this.
  // Dynamically imported (not a static import) so Firebase never loads on a page view that
  // never touches auth — Navbar itself renders eagerly on every single page.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    import('../lib/auth').then(({ subscribeToAuthState }) => {
      if (cancelled) return;
      unsubscribe = subscribeToAuthState((user) => setIsLoggedIn(!!user));
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

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
            onClick={() => setMenuDrawerOpen(!menuDrawerOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
              menuDrawerOpen
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200'
            }`}
          >
            {menuDrawerOpen ? <X className="w-4 h-4 text-white" /> : <Menu className="w-4 h-4 text-zinc-300" />}
            <span className="hidden sm:inline">{isAr ? 'الأقسام والصفحات' : 'Menu'}</span>
          </button>
        </div>

        {/* Center: Brand Logo with uploaded icon visual design */}
        <a 
          href="/"
          onClick={(e) => handleNavClick('home', e)}
          className="flex items-center justify-center cursor-pointer group relative z-10"
        >
          <NovaiqLogo size={34} showText={true} />
        </a>

        {/* Side 2: Account — before login, a single "Login" entry point (Google sign-in
            covers both login and first-time sign-up in one click, so a separate "Sign Up"
            button would just be a second path to the exact same screen); once signed in,
            one "My Account" button (own contracts, or the control panel if the account is
            an admin — AdminPage decides which). */}
        <div className="flex items-center gap-2 relative z-10">
          {isLoggedIn ? (
            <a
              href="?page=orders"
              onClick={(e) => handleNavClick('orders', e)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                activePage === 'orders'
                  ? 'bg-zinc-800 text-white border-zinc-700'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
              }`}
            >
              <UserCircle2 className="w-4 h-4 text-zinc-300" />
              <span className="hidden sm:inline">{isAr ? 'حسابي' : 'My Account'}</span>
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
        <div className="absolute top-full right-3 sm:right-6 mt-3 w-80 bg-black/55 border border-white/15 rounded-2xl p-4 shadow-2xl backdrop-blur-xl space-y-3 z-50 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-white" />
              <span>{isAr ? 'أقسام منصة NOVAIQ' : 'NOVAIQ Pages'}</span>
            </span>
            <button
              onClick={() => setMenuDrawerOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
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
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-zinc-800 text-white font-bold border border-zinc-700 shadow-md'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-zinc-400" />
                    <span>{item.label}</span>
                  </span>
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
