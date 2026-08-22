import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useSmoothScroll, useSectionScrollSpy } from './lib/useScrollBehavior';
import { usePauseOffscreenWork } from './lib/usePauseOffscreenWork';
import { useScrollingFlag } from './lib/useScrollingFlag';
import { Navbar } from './components/Navbar';
import { LazyOnView } from './components/LazyOnView';
import { MilestoneTimeline } from './components/MilestoneTimeline';
import { AboutSection } from './components/AboutSection';
import { CookieConsent } from './components/CookieConsent';
import { ToastHost } from './components/ToastHost';
import { PageLoader } from './components/PageLoader';
import { SmartPageLoader } from './components/SmartPageLoader';
import { ContractPreparingLoader } from './components/ContractPreparingLoader';
import { trackLoad } from './lib/loadTracker';
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
const TemplateGrid = lazy(() => trackLoad(import('./components/TemplateGrid').then((m) => ({ default: m.TemplateGrid }))));
const ContractBuilderGate = lazy(() => trackLoad(import('./components/ContractBuilderGate').then((m) => ({ default: m.ContractBuilderGate }))));
const ContractPDFPreview = lazy(() => trackLoad(import('./components/ContractPDFPreview').then((m) => ({ default: m.ContractPDFPreview }))));
const PolicyPage = lazy(() => trackLoad(import('./components/PolicyPage').then((m) => ({ default: m.PolicyPage }))));
const EcontractsPage = lazy(() => trackLoad(import('./components/EcontractsPage').then((m) => ({ default: m.EcontractsPage }))));
const TemplateInteractiveSandbox = lazy(() => trackLoad(import('./components/TemplateInteractiveSandbox').then((m) => ({ default: m.TemplateInteractiveSandbox }))));
const AdminPage = lazy(() => trackLoad(import('./components/AdminPage').then((m) => ({ default: m.AdminPage }))));
const LoginPage = lazy(() => trackLoad(import('./components/LoginPage').then((m) => ({ default: m.LoginPage }))));
const HomeHero = lazy(() => trackLoad(import('./components/HomeHero').then((m) => ({ default: m.HomeHero }))));
// The sections below the fold and the footer load on scroll (LazyOnView), so they are deliberately
// NOT tracked: when one of them downloads while the visitor is already reading, a full-screen
// loader popping up would be exactly the "annoying" flash we are removing. Their placeholders are
// solid blocks in the incoming section's colour, so a chunk that finishes mid-scroll simply
// replaces a block of the same colour — nothing flashes at all.
const PhasesSection = lazy(() => import('./components/PhasesSection').then((m) => ({ default: m.PhasesSection })));
const ContactSection = lazy(() => import('./components/ContactSection').then((m) => ({ default: m.ContactSection })));
const Footer = lazy(() => import('./components/Footer').then((m) => ({ default: m.Footer })));

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
    leaveSignIn();
  };
  // Shared by every sign-in screen in the app, so "أكمل كضيف" always does the same thing
  // wherever it is pressed: leave, and land on the home page.
  //
  // The inner pages (my orders, the contract builder) use this directly rather than
  // continueAsGuest, because reaching their sign-in screen does not mean the visitor chose to
  // be a guest — they may be a signed-out visitor who simply changed their mind about that one
  // page. Marking them a guest from there would silently answer a question they were never
  // asked. Leaving is the whole action.
  function leaveSignIn() {
    setActivePage('home');
    setActiveSection('hero');
    window.history.replaceState({}, '', window.location.pathname);
    window.scrollTo(0, 0);
  }
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
      } else if (pageParam === 'econtracts') {
        setActivePage('econtracts');
      } else if (pageParam === 'support') {
        // The dedicated messaging-and-support page (ContactSection) — phone-first, no email.
        setActivePage('support');
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

  // Where to go once the sign-in actually succeeds, set by whatever sent the visitor there.
  // A ref rather than state: nothing renders from it, and it must survive the re-render that
  // signing in causes without being a dependency of anything.
  const postLoginPage = useRef<string | null>(null);

  // `?page=login` reached while already signed in — either a visitor who just signed in, or an
  // old link / the back button. Nothing below renders a 'login' page (the gate above owns that
  // screen, and it only runs for signed-OUT visitors), so left alone this would draw the site
  // shell around an empty middle.
  useEffect(() => {
    if (currentUser && activePage === 'login') {
      // Someone who pressed "start your project" and had to sign in on the way lands in the
      // builder, not on the home page — being returned to the start after signing in is the
      // point at which people give up on a form.
      const next = postLoginPage.current || 'home';
      postLoginPage.current = null;
      setActivePage(next);
      window.history.replaceState({}, '', next === 'home' ? window.location.pathname : `${window.location.pathname}?page=${next}`);
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

  /**
   * "Start your project", from wherever it is pressed.
   *
   * It used to go straight to `custom-request` for everyone. A signed-out visitor therefore
   * landed on the contract page, where ContractBuilderGate renders the sign-in screen *inside*
   * that page's own `max-w-6xl` container — so instead of a sign-in page they got a panel
   * hovering in the middle of a contract form, which is the "strange floating window" it read as.
   *
   * The gate stays exactly as it is: it is the wall that guarantees no contract is ever created
   * without an account, and it still catches anyone who reaches the builder another way. This
   * simply stops sending guests through it head-first — a visitor with no account is asked for
   * one on the real sign-in page, and `postLoginPage` below carries them into the builder the
   * moment they have it.
   */
  // Every path into contract creation. A signed-out visitor is asked for an account on the real
  // full-screen sign-in page (never the floating inline one), and `postLoginPage` carries them
  // straight into the builder the moment they have one. A template chosen before signing in is
  // remembered, so they land on exactly the contract they picked.
  const startContract = (template?: Template, customNotes?: string, primaryColorHex?: string) => {
    if (template) {
      setSelectedTemplateForContract(template);
      setInitialCustomFeaturesText(customNotes || '');
      setInitialPrimaryColor(primaryColorHex || '');
    }
    if (!currentUser) {
      postLoginPage.current = 'custom-request';
      navigateTo('login');
      return;
    }
    navigateTo('custom-request');
  };

  const startProject = () => startContract();

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

  // Drives both halves of the Fluent reveal — ring and face — across the tiles below.

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
  // The `undefined` branch is the one that matters and is easy to get wrong. Firebase resolves
  // auth asynchronously — this is genuinely loading (not an error, not a decision), so it is the
  // one place the loader is shown for real work rather than for a chunk already in memory.
  if (currentUser === undefined) {
    return <PageLoader />;
  }
  // Either the visitor has not chosen yet (the gate), or a guest asked for the sign-in screen
  // from the navbar. Same screen, and both offer the way back out to browsing.
  if (currentUser === null && (!isGuest || activePage === 'login' || activePage === 'custom-request')) {
    return (
      <>
        <Suspense fallback={null}>
          <LoginPage language={language} onContinueAsGuest={continueAsGuest} />
        </Suspense>
        <SmartPageLoader />
      </>
    );
  }

  if (standalonePreviewTemplate) {
    return (
      <>
        <div className="min-h-screen text-white relative">
          <Suspense fallback={null}>
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
                startContract(template, customNotes, primaryColorHex);
              }}
            />
          </Suspense>
        </div>
        <SmartPageLoader />
      </>
    );
  }

  return (
    <div className="min-h-screen text-zinc-100 flex flex-col font-['Cairo'] relative selection:bg-zinc-100 selection:text-black overflow-x-hidden">
      
      {/* Supernova Atmospheric Background */}

      {/* Main Header Bar — on every page. Its floating pill is fixed and transparent, so it
          reads as sitting on the page backdrop rather than pushing content down. */}
      <Navbar
        activePage={activePage}
        setActivePage={(page) => navigateTo(page)}
        language={language}
        setLanguage={setLanguage}
      />

      {/* Main Content View with Hardware Accelerated Transitions. The Navbar above is
          fixed/floating, so it doesn't push content down like an in-flow element would —
          this padding is what clears it, starting --content-gap below wherever it actually
          ends. That offset is measured at runtime rather than hardcoded per breakpoint, so a
          change to the bar's own size re-flows the page automatically instead of silently
          overlapping it. */}
      <main
        style={{ paddingTop: 'calc(var(--nav-bottom, 74px) + var(--content-gap))' }}
        /* No bottom padding on the home, timeline, or templates pages. Everywhere else the page
           ends on black and this breathes before the footer's own margin; on home the last section
           is blue and the footer is sand, and on the timeline and templates pages the blue section
           runs straight into the footer's own periwinkle band — so the same 32px there is the
           body's black showing through as a stripe between two colours that are meant to meet. */
        className={`flex-1 relative z-10 ${activePage === 'home' || activePage === 'timeline' || activePage === 'templates' || activePage === 'support' ? '' : 'pb-8'}`}
      >

        {activePage === 'home' && (
          <div className="page-in">
            {/* Sections go here, one by one — each section is its own component file. No
                width/spacing classes on this div except page-in; each section owns its own
                <section>, .nq-container (or deliberate variant), and vertical padding, so that
                moving or retuning one section cannot shift the ones around it.

                Sections below the fold load lazily (LazyOnView + React.lazy): the browser
                downloads and parses each section's code only when it approaches the viewport,
                so a visitor pays for the part they actually see, not the whole page at once. */}
            <Suspense fallback={null}>
              <HomeHero
                language={language}
                onStart={() => navigateTo('templates')}
                onRequestProject={startProject}
              />
            </Suspense>

            <LazyOnView
              rootMargin="800px 0px"
              placeholder={<div className="h-[40vh] bg-paper" aria-hidden="true" />}
            >
              <Suspense fallback={null}>
                <PhasesSection language={language} />
              </Suspense>
            </LazyOnView>

            <LazyOnView
              rootMargin="800px 0px"
              placeholder={<div className="h-[40vh] bg-periwinkle" aria-hidden="true" />}
            >
              <Suspense fallback={null}>
              <ContactSection language={language} />
              </Suspense>
            </LazyOnView>
          </div>
        )}

        {activePage === 'templates' && (
          <div className="page-in">
            <Suspense fallback={null}>
              <TemplateGrid
                language={language}
                currency={currency}
                focusTemplateId={lastPreviewedTemplateId}
                onSelectTemplateForContract={startContract}
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
            {/* Frosted glass card: the same `nq-card` beam the site's other cards wear, a soft
                rounded frame and a blurred backdrop, so the contract builder reads as one of the
                site's panels rather than a bare dark slab. */}
            <div className="nq-card relative rounded-[1.75rem] overflow-hidden backdrop-blur-2xl ring-1 ring-white/15 p-3 sm:p-5">
              <Suspense fallback={null}>
                <ContractBuilderGate
                  language={language}
                  currency={currency}
                  user={currentUser}
                  selectedTemplate={selectedTemplateForContract}
                  onContractGenerated={handleContractGenerated}
                  initialCustomFeaturesText={initialCustomFeaturesText}
                  initialPrimaryColor={initialPrimaryColor}
                  onContinueAsGuest={leaveSignIn}
                />
              </Suspense>
            </div>
          </div>
        )}

        {activePage === 'orders' && (
          <div className="page-in">
            <Suspense fallback={null}>
              <AdminPage
                language={language}
                currency={currency}
                user={currentUser}
                onContinueAsGuest={leaveSignIn}
              />
            </Suspense>
          </div>
        )}

        {activePage === 'timeline' && (
          <div className="page-in">
            <MilestoneTimeline language={language} onCreateContract={startProject} />
          </div>
        )}

        {activePage === 'about' && (
          <div className="page-in">
            <AboutSection language={language} />
          </div>
        )}

        {activePage === 'privacy' && (
          <div className="page-in">
            <Suspense fallback={null}>
              <PolicyPage type="privacy" language={language} />
            </Suspense>
          </div>
        )}

        {activePage === 'terms' && (
          <div className="page-in">
            <Suspense fallback={null}>
              <PolicyPage type="terms" language={language} />
            </Suspense>
          </div>
        )}

        {activePage === 'econtracts' && (
          <div className="page-in">
            <Suspense fallback={null}>
              <EcontractsPage language={language} />
            </Suspense>
          </div>
        )}

        {activePage === 'support' && (
          <div className="page-in">
            <Suspense fallback={null}>
              <ContactSection language={language} />
            </Suspense>
          </div>
        )}

      </main>

      {/* Footer — mounted only when scrolled near, like the sections above. Not shown on the
        control panel (orders), where it is not wanted. */}
      {activePage !== 'orders' && (
        <LazyOnView rootMargin="800px 0px" placeholder={<div className="h-[60vh] bg-paper" aria-hidden="true" />}>
          <Suspense fallback={null}>
            <Footer
              language={language}
              onNavigate={navigateTo}
              onRequestProject={startContract}
              pageKey={activePage}
            />
          </Suspense>
        </LazyOnView>
      )}

      {/* Bottom Cookie Consent Banner */}
      <CookieConsent language={language} onNavigateToPrivacy={() => navigateTo('privacy')} />

      {/* Global toast notifications — validation warnings, save confirmations, errors */}
      <ToastHost />

      {/* Shown while the contract is being written, before the preview exists at all. */}
      {isSavingContract && <ContractPreparingLoader language={language} />}

      {/* Contract PDF Generated Preview Modal */}
      {activeContractForPreview && (
        <Suspense fallback={null}>
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

      {/* The one loader for the whole app — full-screen, and rendered only while a lazy chunk is
          actually downloading. See SmartPageLoader. */}
      <SmartPageLoader />
    </div>
  );
}
