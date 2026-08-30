import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Layers,
  Compass,
  Home,
  Globe,
  LogIn,
  UserCircle2
} from 'lucide-react';
import { Language } from '../lib/i18n';
import { NqButton } from './ui/NqButton';
import { NqLink } from './ui/NqLink';
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
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  setActivePage,
  language,
  setLanguage,
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
  const [userName, setUserName] = useState<string | null>(null);
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
        setUserName(user?.displayName || null);
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
    { id: 'templates', label: isAr ? 'القوالب' : 'Ready Templates', icon: Layers, href: '?page=templates' },
    { id: 'timeline', label: isAr ? 'مراحل العمل' : 'Roadmap & Process', icon: Calendar, href: '?page=timeline' },
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
      {/* Transparent spacer on desktop holding the two halves apart — it paints nothing itself,
          and the LOGIN cluster and NAVIGATION group stay two separate glass bars. On phones
          (.navbar-connect) the spacer becomes one continuous glass bar and the halves defrost
          into it, so the navbar reads as a single connected pill.

          The pill hugs its contents and centres at EVERY width: `w-fit mx-auto` with
          `justify-center`. It measures 209px on a phone and 867px from `lg` up, always with
          equal air either side.

          It used to stretch the full container and push the brand to one end and the controls
          to the other. That is a fine header when something lives in the middle, and nothing
          does: below `lg` the page links are in the drawer, so the bar held a mark and two
          buttons across 177px of empty glass at 390; from `lg` the links sit in one group
          beside the login button, so the middle was empty there too, just wider — 1232px
          of bar around 867px of content.

          A bar sized to what it holds needs no breakpoint for its width, which is why there is
          no `lg:` left on any of this. `max-w-[var(--nq-container)]` on the <header> stays as a
          ceiling rather than a width: at 1024 it leaves 976px for a bar that wants 867, and it
          never binds above that. Worth knowing if a fifth page link is ever added — the bar
          grows with it, and 109px is the headroom before 1024 becomes the tight case. */}
      <div
        ref={barRef}
        className="navbar-connect flex items-center justify-center gap-2 sm:gap-4 lg:gap-8 relative w-fit mx-auto"
      >

        {/* ── Half 1 (physical left): the brand logo on its own, in a self-contained glass
            bar. The account/login entry lives in the navigation half (Half 2) — see below.

            In flow at every width, where it used to be absolutely centred below `lg`. The
            centring was chosen when the mark was the only thing that showed on a phone, and
            it is what made the full lockup impossible there: a centred box can only grow
            HALF its width toward the language button, and that button starts about 40px
            from the centre. So the ceiling was a lockup of ~80px. NOVAIQ + a 34px mark +
            "...Design" is 147px.

            That is the whole story behind what this looked like: the arithmetic never
            worked, so the pieces were taken away one at a time until what was left fitted
            — the wordmark hidden outright, then the mark shrunk to 17px while the rest
            was out. Moving the box is what makes the pieces affordable again.

            Left, it has the bar's whole width less the navigation cluster: 240px at 390
            and 210px at 320, against a lockup that peaks at 147. It is also what the
            desktop does, which is the point — `lg:static` used to be the exception here
            and is now simply how it works. */}
        <div className="navbar-glass flex items-center gap-3 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl">
          <a
            href="/"
            onClick={(e) => handleNavClick('home', e)}
            onTouchStart={() => {
              setLogoRevealed(true);
              if (logoRevealTimer.current) window.clearTimeout(logoRevealTimer.current);
              logoRevealTimer.current = window.setTimeout(() => setLogoRevealed(false), 2200);
            }}
            /* `min-h-11` plus a padding/negative-margin pair: the link's hit area becomes
               46x44 while the mark it wraps stays 34x34 and the pill around it keeps its own
               width, because the negative margin gives back exactly what the padding took.
               It was the mark's own 34x34 (and 26x26 before that), which is under the 44px
               floor on the one control here that has a second job beyond navigating - it is
               also what reveals the wordmark. */
            className="flex items-center justify-center cursor-pointer group min-h-11 px-1.5 -mx-1.5"
          >
            <NovaiqLogo size={34} showText={true} animated revealed={logoRevealed} />
          </a>
        </div>

        {/* ── Half 2 (physical right): NAVIGATION — its own glass bar, completely separate from
            the login cluster. Page links render inline from `lg` up; the hamburger menu button
            is mobile-only and hidden from `lg` up. */}
        {/* No `ms-auto` any more. It was what pushed this group to the far end of a
            full-width bar; the bar now hugs its contents below `lg`, and `justify-between`
            does the same job from `lg` up without a margin fighting it. */}
        <div className="navbar-glass flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl relative z-10">
          <nav className="hidden lg:flex items-center gap-2" aria-label={isAr ? 'التنقل الرئيسي' : 'Main navigation'}>
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
                      : 'text-white/90 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Account/login — lives in the navigation half on desktop, and moves INSIDE the
              drawer menu on phones (`lg:hidden` hides it here; the drawer renders it below). */}
          <div className="hidden lg:block">
            {isLoggedIn === undefined ? (
              <div
                aria-hidden="true"
                className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 animate-pulse"
              />
            ) : isLoggedIn ? (
              <a
                href="?page=orders"
                onClick={(e) => handleNavClick('orders', e)}
                title={userName || (isAr ? 'حسابي' : 'My Account')}
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
                  <UserCircle2 className="w-7 h-7 text-white/90" />
                )}
              </a>
            ) : (
              /* An NqLink, not an NqButton: this changes the URL, so it has to be an anchor —
                 middle-click, ⌘-click and "copy link address" all depend on it. */
              <NqLink
                href="?page=login"
                onClick={goToLogin}
                tone="chrome"
                variant="solid"
                size="sm"
                className="whitespace-nowrap"
                icon={<LogIn className="w-4 h-4 shrink-0" />}
              >
                {isAr ? 'تسجيل دخول' : 'Login'}
              </NqLink>
            )}
          </div>

          {/* A ghost on the chrome. It was 32px tall before — a target you have to aim at, and
              the one control in the bar that a thumb reaches for most. `sm` puts it at 44.

              No cube field on this one. It is the smallest button on the site and it sits in the
              navbar, which is on screen the whole time — so its field is the one most likely to be
              grazed by a pointer on its way somewhere else, and at this width there is barely room
              for the cluster to read as anything. */}
          <NqButton
            tone="chrome"
            variant="ghost"
            size="sm"
            tiles={false}
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            title={isAr ? 'تبديل اللغة' : 'Switch language'}
            aria-label={isAr ? 'تبديل اللغة' : 'Switch language'}
            className="px-3"
            icon={<Globe className="w-4 h-4" />}
          >
            <span className="font-mono">{isAr ? 'AR' : 'EN'}</span>
          </NqButton>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuDrawerOpen(!menuDrawerOpen)}
            aria-label={isAr ? (menuDrawerOpen ? 'إغلاق القائمة' : 'فتح القائمة') : (menuDrawerOpen ? 'Close menu' : 'Open menu')}
            aria-expanded={menuDrawerOpen}
            /* 44 square at every width. It was 40 on phones — which is where it is the ONLY way
               into the navigation, so it was under the floor exactly where it mattered most. Kept
               as hand-written markup rather than an NqButton: AnimatedMenuIcon draws its own two
               bars off this element's `group`, and a cube field behind a morphing icon is two
               animations fighting for the same 44 pixels. */
            className={`lg:hidden group flex items-center justify-center w-11 h-11 rounded-xl transition-transform duration-300 active:duration-100 cursor-pointer active:scale-90 active:opacity-70 text-white outline-none focus-visible:ring-2 focus-visible:ring-white`}
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

          {/* Account/login for phones — hidden from the inline bar, this is the only place it
              appears on mobile. Same states as the desktop button: loading, signed-in avatar,
              or the sign-in pill. */}
          <div className="lg:hidden">
            {isLoggedIn === undefined ? (
              <div
                aria-hidden="true"
                className="w-full h-10 rounded-xl bg-zinc-800 border border-zinc-700 animate-pulse"
              />
            ) : isLoggedIn ? (
              <a
                href="?page=orders"
                onClick={(e) => handleNavClick('orders', e)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-[11px] font-medium text-white/90 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-zinc-900 border border-zinc-800 text-white/90 overflow-hidden"
                >
                  {avatarUrl && !avatarBroken ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarBroken(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircle2 className="w-3.5 h-3.5" />
                  )}
                </span>
                <span>{userName || (isAr ? 'حسابي' : 'My Account')}</span>
              </a>
            ) : (
              <a
                href="?page=login"
                onClick={goToLogin}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-[11px] font-bold text-white bg-white/10 border border-white/10 hover:bg-white/15 transition-all cursor-pointer"
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-black text-white"
                >
                  <LogIn className="w-3.5 h-3.5" />
                </span>
                <span>{isAr ? 'تسجيل دخول' : 'Sign in'}</span>
              </a>
            )}
          </div>

          {/* Row height is what the panel's height actually is — seven of these are the whole
              list. The icon tile sets the floor (it is taller than the label beside it), so it
              comes down with the padding; trimming only the padding around a 32px tile would
              have bought almost nothing. 48px per row before, 40 now. */}
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.id, e)}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-[11px] transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-black font-bold shadow-lg'
                      : 'text-white/90 font-medium hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      isActive ? 'bg-black text-white' : 'bg-zinc-900 border border-zinc-800 text-white/90'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>


        </div>
      )}
    </header>
  );
};
