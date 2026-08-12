import { useEffect, useRef, useState, lazy, Suspense, type CSSProperties } from 'react';
import { CosmicBackground } from './components/CosmicBackground';
import { useSmoothScroll, useSectionScrollSpy } from './lib/useScrollBehavior';
import { usePauseOffscreenWork } from './lib/usePauseOffscreenWork';
import { useScrollingFlag } from './lib/useScrollingFlag';
import { useRevealGroup } from './lib/useRevealGroup';
import { RevealLight } from './components/RevealLight';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { FloatingTemplateCards } from './components/FloatingTemplateCards';
import { CredentialCard } from './components/CredentialCard';
import { MilestoneTimeline } from './components/MilestoneTimeline';
import { ProjectCtaButton } from './components/ProjectCtaButton';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { CookieConsent } from './components/CookieConsent';
import { ToastHost } from './components/ToastHost';
import { PageLoader } from './components/PageLoader';
import { ContractPreparingLoader } from './components/ContractPreparingLoader';
import { useLiveTemplates } from './lib/pricingOverrides';

import { Template, ContractData, CUSTOM_PROJECT_TEMPLATE_ID } from './types';
import { Language } from './lib/i18n';
import { useCurrentUser } from './lib/auth';
import { Currency, CURRENCY_STORAGE_KEY, readStoredCurrency } from './lib/currency';
import { consumePendingContractSelection } from './lib/pendingContractSelection';
import { saveContractToFirebase } from './lib/firebase';
import { clearContractDraft } from './lib/contractDraft';
import { showToast } from './lib/toast';

// Everything below is only needed after a navigation action (clicking into a page,
// opening a live template demo, generating a contract PDF). Splitting these into their
// own chunks keeps the initial home-page bundle small — the biggest single lever for
// smooth performance on weak/low-end devices, since less JS means less to download,
// parse, and execute before the page becomes interactive.
const TemplateGrid = lazy(() => import('./components/TemplateGrid').then((m) => ({ default: m.TemplateGrid })));
const ContractBuilderGate = lazy(() => import('./components/ContractBuilderGate').then((m) => ({ default: m.ContractBuilderGate })));
const ContractPDFPreview = lazy(() => import('./components/ContractPDFPreview').then((m) => ({ default: m.ContractPDFPreview })));
const PolicyPage = lazy(() => import('./components/PolicyPage').then((m) => ({ default: m.PolicyPage })));
const TemplateInteractiveSandbox = lazy(() => import('./components/TemplateInteractiveSandbox').then((m) => ({ default: m.TemplateInteractiveSandbox })));
const AdminPage = lazy(() => import('./components/AdminPage').then((m) => ({ default: m.AdminPage })));
const LoginPage = lazy(() => import('./components/LoginPage').then((m) => ({ default: m.LoginPage })));

// A visitor who chose "أكمل كضيف" at the sign-in screen.
//
// sessionStorage rather than component state alone, because state does not survive a reload:
// without it, refreshing — or following an outside link back into the site — would drop a guest
// at the sign-in screen again, which is the exact friction the button exists to remove.
//
// And sessionStorage rather than localStorage, because the choice should not outlive the visit.
// Persisted forever it would quietly hide sign-in from someone who does eventually want an
// account, and they would have no obvious way to get the screen back.
const GUEST_KEY = 'novaiq_guest';

function readGuestMode(): boolean {
  try {
    return sessionStorage.getItem(GUEST_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeGuestMode(): void {
  try {
    sessionStorage.setItem(GUEST_KEY, 'true');
  } catch {
    // Storage blocked (private mode, strict settings) — guest mode still works for this
    // render, it simply will not survive a reload. That is a better outcome than throwing.
  }
}

function clearGuestMode(): void {
  try {
    sessionStorage.removeItem(GUEST_KEY);
  } catch {
    // As above.
  }
}

export default function App() {
  const liveTemplates = useLiveTemplates();
  // `undefined` while Firebase is still resolving the session, `null` once it has settled on
  // "signed out". Read here at the top rather than inside the gate below, because hooks cannot
  // live behind the early returns that gate depends on.
  const currentUser = useCurrentUser();
  const [isGuest, setIsGuest] = useState(readGuestMode);
  // Lands the visitor on the home page, not merely "somewhere that isn't the sign-in screen".
  // Reached from the gate the URL is already clean, but reached from the navbar's own sign-in
  // button the address bar still says `?page=login`, and without resetting it a refresh — or
  // the back button — would put them straight back on the screen they just chose to leave.
  const continueAsGuest = () => {
    writeGuestMode();
    setIsGuest(true);
    setActivePage('home');
    setActiveSection('hero');
    window.history.replaceState({}, '', window.location.pathname);
    window.scrollTo(0, 0);
  };
  const [activePage, setActivePage] = useState<string>('home');
  const [selectedTemplateForContract, setSelectedTemplateForContract] = useState<Template | null>(null);
  const [standalonePreviewTemplate, setStandalonePreviewTemplate] = useState<Template | null>(null);
  // Opening a standalone preview swaps the whole tree below (see the early return further
  // down), so TemplateGrid unmounts and its carousel position dies with it. Remembering which
  // template was opened — and outliving the preview itself — is what lets the grid come back
  // to that card instead of snapping to the first one.
  const [lastPreviewedTemplateId, setLastPreviewedTemplateId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('hero');
  
  // Modals state
  const [activeContractForPreview, setActiveContractForPreview] = useState<ContractData | null>(null);
  // True only while the signed contract is actually being written. The preparing loader used
  // to stand for "a lazy chunk is downloading", which is not something the customer has any
  // stake in; now it stands for the save itself, so what it claims to be doing is what is
  // happening.
  const [isSavingContract, setIsSavingContract] = useState(false);
  // Remembered across visits so switching to English once doesn't reset back to Arabic
  // (and re-trigger the whole-page translation pass) on every single page load.
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('novaiq_language');
      return saved === 'en' ? 'en' : 'ar';
    } catch {
      return 'ar';
    }
  });

  // Independent of language on purpose — the store is fully Iraqi, so switching to English
  // must never silently convert prices to dollars. USD only shows once a customer explicitly
  // picks it here, and it then persists the same way the language choice does.
  const [currency, setCurrency] = useState<Currency>(() => readStoredCurrency());
  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch {
      // Storage unavailable — the choice just won't persist.
    }
  }, [currency]);

  // Carries the customer's exact choices from the interactive live-site demo into the contract form
  const [initialCustomFeaturesText, setInitialCustomFeaturesText] = useState<string>('');
  const [initialPrimaryColor, setInitialPrimaryColor] = useState<string>('');

  // Dynamic active background image computation. The standalone preview sandbox used to feed
  // its own template photo in here too, tinting the cosmic background behind it — but that tint
  // is whatever color the photo happens to be, purple included, bleeding through the sandbox's
  // own glass toolbar in a way nothing there was designed to sit on top of.
  const activeBgImage = activePage === 'custom-request' && selectedTemplateForContract ? selectedTemplateForContract.previewImage : null;

  useSmoothScroll();
  useSectionScrollSpy(activePage, setActiveSection);
  // Halts every animation on the page whenever the window is hidden or unfocused — the
  // always-mounted background otherwise keeps drifting for a tab nobody is looking at.
  usePauseOffscreenWork();
  // Stands decorative pointer-driven animation down for the moment a scroll is in flight —
  // scrolling fires hover on its own as content slides under a still cursor, and that work
  // lands on the same main thread the scroll is using. See `html[data-scrolling]` in index.css.
  useScrollingFlag();

  // Handle URL changes & popstate (browser back/forward)
  useEffect(() => {
    const handleLocationChange = () => {
      const params = new URLSearchParams(window.location.search);
      const previewId = params.get('preview');
      if (previewId) {
        const found = liveTemplates.find(t => t.id === previewId);
        if (found) setStandalonePreviewTemplate(found);
      } else {
        setStandalonePreviewTemplate(null);
      }

      const pageParam = params.get('page');
      if (pageParam === 'templates') {
        setActivePage('templates');
      } else if (pageParam === 'contract' || pageParam === 'custom-request') {
        setActivePage('custom-request');
      } else if (pageParam === 'orders' || pageParam === 'contracts') {
        setActivePage('orders');
      } else if (pageParam === 'timeline') {
        setActivePage('timeline');
      } else if (pageParam === 'about') {
        setActivePage('about');
      } else if (pageParam === 'privacy') {
        setActivePage('privacy');
      } else if (pageParam === 'terms') {
        setActivePage('terms');
      } else if (pageParam === 'admin') {
        // Same unified account/admin page as 'orders' — kept as an alias since it was
        // shared before customers and admins used the same entry point.
        setActivePage('orders');
      } else if (pageParam === 'login') {
        // A real route again. It was removed when sign-in gated the whole site — a signed-out
        // visitor met the gate anyway, so nothing needed to navigate here. Guests changed that:
        // they are past the gate and browsing without an account, so the navbar's sign-in button
        // needs somewhere to take them, and this is it.
        setActivePage('login');
      } else {
        setActivePage('home');
      }
    };
    
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Picks up a template selected from the standalone `?live=` tab's "order this template"
  // button (TemplateLivePage.tsx) — that tab shares no React state with this one, so the
  // hand-off travels through localStorage instead (see lib/pendingContractSelection.ts).
  // Runs once on mount; `?page=custom-request` is already set by the effect above, so this
  // only needs to fill in which template and what the customer customized in the demo. If
  // they aren't signed in yet, ContractBuilderGate shows the login screen first — this state
  // just waits until they finish.
  useEffect(() => {
    const pending = consumePendingContractSelection();
    if (!pending) return;
    const found = liveTemplates.find((t) => t.id === pending.templateId);
    if (!found) return;
    setSelectedTemplateForContract(found);
    setInitialCustomFeaturesText(pending.customNotes || '');
    setInitialPrimaryColor(pending.primaryColorHex || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page direction follows the selected language — English needs LTR to read correctly
  // (mixed word order, punctuation, and alignment all break under a forced RTL shell).
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    try {
      localStorage.setItem('novaiq_language', language);
    } catch {
      // Storage unavailable (private browsing) — the choice just won't persist.
    }
  }, [language]);

  // Whole-page auto-translation. Components that already have explicit English strings
  // render them directly; this catches everything else — including any section added in
  // future — so nothing silently stays Arabic in English mode. Loaded on demand so the
  // Arabic default (the common case) never pays for it.
  useEffect(() => {
    let cancelled = false;
    import('./lib/pageTranslator').then(({ setPageTranslation }) => {
      if (!cancelled) setPageTranslation(language);
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  // A sign-in that happens in front of us lands on home, whatever ?page= the URL was carrying.
  // That parameter belongs to the visit BEFORE the gate — someone opened a link to ?page=orders
  // while signed out, got the sign-in screen, and would otherwise be dropped straight into an
  // account page the instant the Google popup closes, having never seen the site.
  //
  // Only the null → signed-in transition counts, which is why the previous value is tracked at
  // all. The undefined → signed-in one means Firebase merely finished restoring a session that
  // already existed, and resetting on that would break every deep link in the app: refreshing on
  // ?page=orders, or opening one from outside while already signed in, would bounce to home.
  const previousUserRef = useRef(currentUser);
  useEffect(() => {
    const previous = previousUserRef.current;
    previousUserRef.current = currentUser;
    if (previous !== null || !currentUser) return;
    // Signing in supersedes guest mode. Without this the flag would outlive the session and a
    // later sign-OUT would drop them straight back into browsing instead of the sign-in screen
    // they just asked for.
    clearGuestMode();
    setIsGuest(false);
    setActivePage('home');
    setActiveSection('hero');
    // replace, not push: the pre-sign-in entry is already the current one, and leaving it there
    // would put "back" onto a page the visitor never chose to be on.
    window.history.replaceState({}, '', window.location.pathname);
    window.scrollTo(0, 0);
  }, [currentUser]);

  // `?page=login` reached while already signed in — an old link, or the back button after
  // signing in. Nothing below renders a 'login' page (the gate above owns that screen, and it
  // only runs for signed-OUT visitors), so left alone this would draw the site shell around an
  // empty middle.
  useEffect(() => {
    if (currentUser && activePage === 'login') {
      setActivePage('home');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [currentUser, activePage]);

  // The in-app history stack that used to live here went with the Back/Home bar: it existed
  // only to feed that bar's Back button, and with the bar gone nothing read it — it was being
  // pushed to on every navigation and popped by no one. The `record` parameter that opted a
  // navigation out of it went the same way; every call site already used the default.
  const navigateTo = (page: string) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const newUrl = page === 'home' 
      ? window.location.pathname 
      : `${window.location.pathname}?page=${page}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleSelectTemplateForContract = (template: Template, customNotes?: string, primaryColorHex?: string) => {
    setSelectedTemplateForContract(template);
    setInitialCustomFeaturesText(customNotes || '');
    setInitialPrimaryColor(primaryColorHex || '');
    navigateTo('custom-request');
  };

  /**
   * Saves the signed contract, then opens the preview.
   *
   * The save used to live inside ContractPDFPreview's mount effect, which made creating a
   * contract depend on a lazy chunk that also carries jsPDF and html2canvas finishing its
   * download. On a weak connection that chunk can take a long time or stall outright, and
   * while it did the customer sat on "جارِ تجهيز عقدك الإلكتروني..." forever with nothing
   * saved anywhere — the contract they had just signed existed only in React state, because
   * the builder had already cleared its own saved draft. A slow network could therefore
   * destroy a completed contract.
   *
   * Saving is business-critical and needs nothing from that chunk; only the *download* button
   * does. So the save happens here first, and the heavy PDF code stays lazy behind it.
   *
   * The preview opens either way. saveContractToFirebase writes to localStorage before it
   * touches the network, so even a failed cloud sync leaves the contract recoverable, and the
   * customer keeps the download button that turns it into a PDF they can keep. The draft is
   * cleared only on a confirmed save, so a failure leaves them able to retry rather than
   * having to fill the whole form again.
   */
  const handleContractGenerated = async (contract: ContractData) => {
    setIsSavingContract(true);
    try {
      await saveContractToFirebase(contract);
      clearContractDraft();
      showToast(
        isAr ? 'تم إنشاء العقد وحفظه في حسابك' : 'Contract created and saved to your account',
        'success'
      );
    } catch (e) {
      console.error('Failed to save the contract:', e);
      showToast(
        isAr
          ? 'تعذر حفظ العقد على الخادم — نسخة محفوظة على جهازك، ويمكنك تنزيل PDF الآن'
          : 'Could not save the contract to the server — a copy is kept on this device and you can download a PDF now',
        'error'
      );
    } finally {
      setIsSavingContract(false);
      setActiveContractForPreview(contract);
    }
  };

  const isAr = language === 'ar';


  // Stat bars start empty and only fill up once the visitor actually scrolls them
  // into view (not on page mount, which would finish the animation off-screen before
  // anyone sees it). IntersectionObserver fires once, then disconnects.
  const [statsFilled, setStatsFilled] = useState(false);
  const statsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsFilled(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Drives both halves of the Fluent reveal — ring and face — across the tiles below.
  const revealGroup = useRevealGroup<HTMLDivElement>();

  // ── The gate ────────────────────────────────────────────────────────────────────────────
  // Sign-in is now the door to the whole site: nothing below this point renders until someone
  // is signed in. It takes the whole viewport, before the shared shell is built at all — the
  // page brings its own background and its own logo, so wrapping it in the navbar/footer chrome
  // would only put a self-contained screen inside a second, redundant one.
  //
  // The `undefined` branch is the one that matters and is easy to get wrong. Firebase resolves
  // the session asynchronously, so on EVERY page load there is a moment where the app does not
  // yet know whether anyone is signed in. Treating that moment as "signed out" would flash the
  // sign-in screen at an already-signed-in visitor on every single load and then rip it away —
  // which reads as a bug, and worse, invites them to click a Google popup they did not need.
  // A loader is the honest answer to "we don't know yet".
  //
  // There is deliberately no separate `?page=login` route any more. It existed to reach this
  // screen on purpose from a signed-out site; with the site gated, a signed-out visitor lands
  // here anyway and a signed-IN one following that link would have been dropped on a sign-in
  // screen with nothing to sign into and no way back out. `?page=login` now falls through to
  // home like any other unrecognised page.
  //
  // The `?preview=` sandbox below is deliberately left in front of this gate: it is a
  // customer-facing demo and the thing a visitor is most likely to have been sent a direct link
  // to. The `?live=` view never reaches this file at all — main.tsx mounts it as its own
  // document outside <App>.
  //
  // Guests pass the gate too. Browsing the catalogue, opening a demo and reading the roadmap
  // need no account, and demanding one to look around turns visitors away before they have seen
  // anything worth signing in for. The wall that genuinely matters is further in — creating a
  // contract — and that one is enforced where it belongs, by ContractBuilderGate, which asks a
  // guest to sign in at the point it actually needs an account to attach the contract to.
  if (currentUser === undefined) {
    return <PageLoader />;
  }
  // Either the visitor has not chosen yet (the gate), or a guest asked for the sign-in screen
  // from the navbar. Same screen, and both offer the way back out to browsing.
  if (currentUser === null && (!isGuest || activePage === 'login')) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LoginPage language={language} onContinueAsGuest={continueAsGuest} />
      </Suspense>
    );
  }

  if (standalonePreviewTemplate) {
    return (
      <div className="min-h-screen bg-black text-white relative">
        <CosmicBackground activeSection="templates" activeBgImage={activeBgImage} />
        <Suspense fallback={<PageLoader />}>
          <TemplateInteractiveSandbox
            template={standalonePreviewTemplate}
            language={language}
            currency={currency}
            onClose={() => {
              setStandalonePreviewTemplate(null);
              window.history.replaceState({}, '', window.location.pathname);
            }}
            onSelectForContract={(template, customNotes, primaryColorHex) => {
              setStandalonePreviewTemplate(null);
              window.history.replaceState({}, '', window.location.pathname);
              handleSelectTemplateForContract(template, customNotes, primaryColorHex);
            }}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-['Cairo'] relative selection:bg-zinc-100 selection:text-black overflow-x-hidden">
      
      {/* Supernova Atmospheric Background */}
      <CosmicBackground activeSection={activeSection} activeBgImage={activeBgImage} />

      {/* Main Header Bar */}
      <Navbar
        activePage={activePage}
        setActivePage={(page) => navigateTo(page)}
        language={language}
        setLanguage={setLanguage}
        currency={currency}
        setCurrency={setCurrency}
      />

      {/* Main Content View with Hardware Accelerated Transitions. The Navbar above is
          fixed/floating, so it doesn't push content down like an in-flow element would —
          this padding is what clears it, starting --content-gap below wherever it actually
          ends. That offset is measured at runtime rather than hardcoded per breakpoint, so a
          change to the bar's own size re-flows the page automatically instead of silently
          overlapping it.
          One value for every page now. It used to branch, because inner pages carried a
          second floating bar (a Back/Home strip) beneath the Navbar and had to clear that
          one instead. With the strip gone the Navbar is the only bar there is, and keeping
          the branch would have left inner pages padding down to --backbar-bottom's 126px
          fallback — a gap held open for something no longer rendered. */}
      <main
        style={{ paddingTop: 'calc(var(--nav-bottom, 74px) + var(--content-gap))' }}
        className="flex-1 relative z-10 pb-8"
      >

        {activePage === 'home' && (
          <div className="page-in space-y-20 sm:space-y-24">
            {/* Hero copy and the card/pitch panel are deliberately one block, held to their own
                tight spacing rather than the page's `space-y-20`. Apart they read as two
                sections and the panel starts below the fold; together they are the first
                screenful — headline, the card, and the claim it backs, all visible at once,
                which is the whole point of moving the panel up here. The larger page rhythm
                resumes at the section after it. */}
            <div className="space-y-6 sm:space-y-8">
              <HeroSection language={language} />

              {/* Quick Overview Grid to drive leads */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* The reveal group is this whole panel, not each grid — so moving across the
                  copy on one side already lights the near edges of the cards on the other,
                  which is the cross-card proximity the effect is for.

                  No background of its own: the panel is a frame, and the page's own drifting
                  starfield reads straight through it. The `bg-zinc-950/80` that used to be
                  here was near-black anyway, so what it mostly did was hide the stars. */}
              <div
                ref={revealGroup}
                className="below-fold reveal-group border border-zinc-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl"
              >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
                {/* The credential card, in the same row as the pitch it illustrates rather than
                    alone in the hero above. Two reasons, both about the screen rather than the
                    card: alone it left a wide empty band beside it at any desktop width, and
                    this panel — which used to start below the fold — was carrying the page's
                    strongest claim where nobody had scrolled to it yet. Paired, the first
                    screenful now holds the claim and the proof of it side by side.
                    `order-first lg:order-none`: stacked on a phone the card leads, because it
                    is the thing worth seeing before a paragraph is read; side by side the grid's
                    own order puts the words first, which is the reading order. */}
                <div className="order-first lg:order-none">
                  <CredentialCard language={language} />
                </div>

                <div className="flex flex-col gap-5">
                  <div className="flex flex-col justify-start space-y-3 text-start">
                    <h3 className="text-xl sm:text-3xl font-bold text-white">
                      {isAr ? 'الإنتاجية والسرعة في تسليم مشروعك' : 'Speed & Efficiency for Your Project'}
                    </h3>
                    <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                      {isAr
                        ? 'نحن لا نضيع وقتك في نقاشات ومفاوضات مطولة. قوالبنا البرمجية الجاهزة تمنحك انطلاقة فورية بنسبة 80% من مشروعك، بينما نتولى نحن تخصيص الـ 20% المتبقية لتلائم هوية شركتك ومتطلباتك الخاصة.'
                        : 'We get straight to execution. Our pre-built production templates give you an instant 80% head start, while we customize the remaining 20% specifically for your brand identity.'}
                    </p>
                  </div>
                  <div ref={statsRef} className="grid grid-cols-3 gap-3 items-end">
                    {[
                      { value: '80%', label: isAr ? 'جاهزية فورية' : 'Instant readiness', fill: 80 },
                      { value: isAr ? '3-4' : '3-4', label: isAr ? 'أسابيع تسليم' : 'Weeks delivery', fill: 65 },
                      { value: '100%', label: isAr ? 'ملكية الكود' : 'Code ownership', fill: 100 },
                    ].map((stat, idx) => (
                      <div
                        key={idx}
                        className="reveal-face reveal-border group flex flex-col items-center gap-2 text-center p-3 rounded-xl bg-black border border-zinc-700/80"
                      >
                        <RevealLight face />
                        <div className="relative z-10 w-2.5 h-16 sm:h-20 rounded-full bg-zinc-900 overflow-hidden">
                          <div
                            className="stat-bar-fill absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-zinc-500 to-white"
                            style={{
                              '--fill': statsFilled ? `${stat.fill}%` : '0%',
                              '--fill-hover': `${Math.min(stat.fill + 15, 100)}%`,
                              transitionDelay: `${idx * 150}ms`,
                            } as CSSProperties}
                          />
                        </div>
                        <div className="relative z-10 text-lg sm:text-xl font-extrabold text-white font-mono text-center">
                          {stat.value}
                        </div>
                        <div className="relative z-10 text-[10px] text-zinc-400 text-center">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

                {/* The four capability tiles, now a full-width band under both columns instead
                    of a 2×2 block squeezed into one of them. The card took the column they used
                    to share, and rather than shrink them further they get the whole width — at
                    which point four across reads as a row of facts, and the square aspect they
                    needed to look deliberate at 2×2 is no longer holding them to a shape the
                    text has to fit inside. Two across on a phone, where four would leave nothing
                    but a word per line. */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-8 border-t border-zinc-800">
                  {[
                    { label: isAr ? "قوالب مجربة ومعتمدة" : "Verified Templates", desc: isAr ? "جاهزة للتركيب الفوري" : "Instant deployment" },
                    { label: isAr ? "برمجة مرنة مخصصة" : "Flexible Engineering", desc: isAr ? "نطور كل ما تريده" : "Custom built features" },
                    { label: isAr ? "ربط وحفظ في Firebase" : "Firebase Cloud Storage", desc: isAr ? "ضمان حفظ كل البيانات" : "Persistent data sync" },
                    { label: isAr ? "أكواد برمجية نظيفة" : "Clean Source Code", desc: isAr ? "سهلة الصيانة والتشغيل" : "Maintainable architecture" }
                  ].map((x, idx) => (
                    <div
                      key={idx}
                      className="reveal-face reveal-border flex flex-col justify-center items-center text-center p-4 sm:p-5 rounded-2xl bg-black border border-zinc-700/80 space-y-1"
                    >
                      <RevealLight face />
                      <div className="relative z-10 text-xs font-bold text-white">{x.label}</div>
                      <div className="relative z-10 text-[11px] text-zinc-400">{x.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            </div>

            {/* Floating 3D template cards — placed right after the speed/efficiency pitch
                above, where "our templates give you an 80% head start" has just been made
                and showing the actual templates is the natural next beat. */}
            <div className="below-fold">
              <FloatingTemplateCards
                language={language}
                onExploreTemplates={() => navigateTo('templates')}
              />
            </div>

            {/* Structured Timeline */}
            <div className="below-fold">
              <MilestoneTimeline language={language} />
            </div>

            {/* Bridges the timeline and about sections rather than living inside either,
                so it reads as a shared next step and not "the end of the roadmap." */}
            <div className="below-fold py-10 sm:py-14">
              <ProjectCtaButton language={language} onCreateContract={() => navigateTo('custom-request')} />
            </div>

            {/* About Section */}
            <div className="below-fold">
              <AboutSection language={language} />
            </div>
          </div>
        )}

        {activePage === 'templates' && (
          <div className="page-in">
            <Suspense fallback={<PageLoader />}>
              <TemplateGrid
                language={language}
                currency={currency}
                focusTemplateId={lastPreviewedTemplateId}
                onSelectTemplateForContract={handleSelectTemplateForContract}
                onOpenStandalonePreview={(template) => {
                  setLastPreviewedTemplateId(template.id);
                  setStandalonePreviewTemplate(template);
                }}
              />
            </Suspense>
          </div>
        )}

        {activePage === 'custom-request' && (
          <div className="page-in max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<PageLoader />}>
              <ContractBuilderGate
                language={language}
                currency={currency}
                selectedTemplate={selectedTemplateForContract}
                onContractGenerated={handleContractGenerated}
                initialCustomFeaturesText={initialCustomFeaturesText}
                initialPrimaryColor={initialPrimaryColor}
              />
            </Suspense>
          </div>
        )}

        {activePage === 'orders' && (
          <div className="page-in">
            <Suspense fallback={<PageLoader />}>
              <AdminPage language={language} currency={currency} />
            </Suspense>
          </div>
        )}

        {activePage === 'timeline' && (
          <div className="page-in">
            <MilestoneTimeline language={language} />
            <div className="py-10 sm:py-14">
              <ProjectCtaButton language={language} onCreateContract={() => navigateTo('custom-request')} />
            </div>
          </div>
        )}

        {activePage === 'about' && (
          <div className="page-in">
            <AboutSection language={language} />
          </div>
        )}

        {activePage === 'privacy' && (
          <div className="page-in">
            <Suspense fallback={<PageLoader />}>
              <PolicyPage type="privacy" language={language} />
            </Suspense>
          </div>
        )}

        {activePage === 'terms' && (
          <div className="page-in">
            <Suspense fallback={<PageLoader />}>
              <PolicyPage type="terms" language={language} />
            </Suspense>
          </div>
        )}

      </main>

      {/* Footer */}
      <Footer language={language} onNavigate={navigateTo} />

      {/* Bottom Cookie Consent Banner */}
      <CookieConsent language={language} onNavigateToPrivacy={() => navigateTo('privacy')} />

      {/* Global toast notifications — validation warnings, save confirmations, errors */}
      <ToastHost />

      {/* Shown while the contract is being written, before the preview exists at all. */}
      {isSavingContract && <ContractPreparingLoader language={language} />}

      {/* Contract PDF Generated Preview Modal */}
      {activeContractForPreview && (
        <Suspense fallback={<ContractPreparingLoader language={language} />}>
          <ContractPDFPreview
            contract={activeContractForPreview}
            language={language}
            currency={currency}
            onClose={() => setActiveContractForPreview(null)}
            onFinish={() => {
              const templateId = activeContractForPreview.templateId;
              setActiveContractForPreview(null);
              if (templateId && templateId !== CUSTOM_PROJECT_TEMPLATE_ID) {
                setLastPreviewedTemplateId(templateId);
                navigateTo('templates');
              } else {
                navigateTo('home');
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
