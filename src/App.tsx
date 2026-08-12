import { useEffect, useRef, useState, lazy, Suspense, type CSSProperties } from 'react';
import { CosmicBackground } from './components/CosmicBackground';
import { useSmoothScroll, useSectionScrollSpy } from './lib/useScrollBehavior';
import { usePauseOffscreenWork } from './lib/usePauseOffscreenWork';
import { useRevealGroup } from './lib/useRevealGroup';
import { RevealLight } from './components/RevealLight';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { FloatingTemplateCards } from './components/FloatingTemplateCards';
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

export default function App() {
  const liveTemplates = useLiveTemplates();
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
      } else if (pageParam === 'login') {
        setActivePage('login');
      } else if (pageParam === 'admin') {
        // Same unified account/admin page as 'orders' — kept as an alias since it was
        // shared before customers and admins used the same entry point.
        setActivePage('orders');
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

  // Sign-in takes the whole viewport, before the shared shell is built at all — it brings its
  // own background, its own logo and its own way out, so putting it inside the navbar/footer
  // chrome would only wrap a self-contained page in a second, redundant one. Same early-return
  // shape the standalone template preview below already uses.
  if (activePage === 'login') {
    return (
      <Suspense fallback={<PageLoader />}>
        <LoginPage language={language} onBack={() => navigateTo('home')} />
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
            {/* Hero Banner */}
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
                className="below-fold reveal-group grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch border border-zinc-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex-1 flex flex-col justify-start space-y-3 text-start">
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

                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto w-full">
                  {[
                    { label: isAr ? "قوالب مجربة ومعتمدة" : "Verified Templates", desc: isAr ? "جاهزة للتركيب الفوري" : "Instant deployment" },
                    { label: isAr ? "برمجة مرنة مخصصة" : "Flexible Engineering", desc: isAr ? "نطور كل ما تريده" : "Custom built features" },
                    { label: isAr ? "ربط وحفظ في Firebase" : "Firebase Cloud Storage", desc: isAr ? "ضمان حفظ كل البيانات" : "Persistent data sync" },
                    { label: isAr ? "أكواد برمجية نظيفة" : "Clean Source Code", desc: isAr ? "سهلة الصيانة والتشغيل" : "Maintainable architecture" }
                  ].map((x, idx) => (
                    <div
                      key={idx}
                      className="reveal-face reveal-border aspect-square flex flex-col justify-center items-center text-center p-4 rounded-2xl bg-black border border-zinc-700/80 space-y-1"
                    >
                      <RevealLight face />
                      <div className="relative z-10 text-xs font-bold text-white">{x.label}</div>
                      <div className="relative z-10 text-[11px] text-zinc-400">{x.desc}</div>
                    </div>
                  ))}
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
