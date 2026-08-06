import { useEffect, useRef, useState, lazy, Suspense, type CSSProperties } from 'react';
import { CosmicBackground } from './components/CosmicBackground';
import { useSmoothScroll, useSectionScrollSpy } from './lib/useScrollBehavior';
import { useSpotlight } from './lib/useSpotlight';
import { Navbar } from './components/Navbar';
import { PageBackBar } from './components/PageBackBar';
import { HeroSection } from './components/HeroSection';
import { MilestoneTimeline } from './components/MilestoneTimeline';
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

  // Dynamic active background image computation
  const activeBgImage = (activePage === 'custom-request' && selectedTemplateForContract ? selectedTemplateForContract.previewImage : null)
    || (standalonePreviewTemplate ? standalonePreviewTemplate.previewImage : null);

  useSmoothScroll();
  useSectionScrollSpy(activePage, setActiveSection);

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

  const handleContractGenerated = (contract: ContractData) => {
    setActiveContractForPreview(contract);
  };

  const isAr = language === 'ar';

  const pageTitles: Record<string, string> = {
    templates: isAr ? 'القوالب البرمجية' : 'Ready Templates',
    'custom-request': isAr ? 'عقد مخصص وتطوير' : 'Custom Contract',
    orders: isAr ? 'حسابي' : 'My Account',
    timeline: isAr ? 'مراحل العمل والتسليم' : 'Roadmap & Process',
    about: isAr ? 'عن NOVAIQ' : 'About NOVAIQ',
    privacy: isAr ? 'سياسة الخصوصية' : 'Privacy Policy',
    terms: isAr ? 'الشروط والأحكام' : 'Terms of Service',
  };

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

  const spotlight = useSpotlight<HTMLDivElement>();

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

      {/* Main Content View with Hardware Accelerated Transitions. Both bars above are
          fixed/floating, so they don't push content down like an in-flow element would —
          this padding is what clears them. It starts --content-gap below whichever bar is
          lowest: the PageBackBar on inner pages, the Navbar itself on home (where no back
          bar renders). Both offsets are measured at runtime rather than hardcoded per
          breakpoint, so a change to either bar's own size re-flows the page automatically
          instead of silently overlapping it. */}
      <main
        style={{
          paddingTop:
            activePage === 'home'
              ? 'calc(var(--nav-bottom, 74px) + var(--content-gap))'
              : 'calc(var(--backbar-bottom, 126px) + var(--content-gap))',
        }}
        className="flex-1 relative z-10 pb-8"
      >

        {/* Back/Home bar — every page other than home gets one, pinned right under the
            Navbar, since the hamburger drawer alone wasn't a clear enough "how do I leave
            this page" affordance. "Back" always returns to home rather than using browser
            history.back(): navigateTo() only ever pushes new entries (never replaces), so
            home is the one predictable, always-correct destination regardless of how the
            visitor arrived at the current page. */}
        {activePage !== 'home' && (
          <PageBackBar
            language={language}
            title={pageTitles[activePage] || ''}
            onBack={() => navigateTo('home')}
            onHome={() => navigateTo('home')}
          />
        )}

        {activePage === 'home' && (
          <div className="page-in space-y-20 sm:space-y-24">
            {/* Hero Banner */}
            <HeroSection
              onExploreTemplates={() => navigateTo('templates')}
              onCreateContract={() => navigateTo('custom-request')}
              language={language}
            />

            {/* Quick Overview Grid to drive leads */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="corner-sweep grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch bg-zinc-950/80 border border-zinc-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl">
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
                        {...spotlight}
                        className="spotlight-card group flex flex-col items-center gap-2 text-center p-3 rounded-xl bg-black border border-zinc-700/80"
                      >
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
                      {...spotlight}
                      className="spotlight-card aspect-square flex flex-col justify-center items-center text-center p-4 rounded-2xl bg-black border border-zinc-700/80 space-y-1"
                    >
                      <div className="relative z-10 text-xs font-bold text-white">{x.label}</div>
                      <div className="relative z-10 text-[11px] text-zinc-400">{x.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Structured Timeline */}
            <MilestoneTimeline
              language={language}
              onCreateContract={() => navigateTo('custom-request')}
            />

            {/* About Section */}
            <AboutSection language={language} />
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
            <MilestoneTimeline
              language={language}
              onCreateContract={() => navigateTo('custom-request')}
            />
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

      {/* Contract PDF Generated Preview Modal */}
      {activeContractForPreview && (
        <Suspense fallback={<ContractPreparingLoader language={language} />}>
          <ContractPDFPreview
            contract={activeContractForPreview}
            language={language}
            currency={currency}
            onClose={() => setActiveContractForPreview(null)}
            // Used to auto-navigate to 'orders' the instant the Firebase save resolved —
            // which happens near-instantly, so the customer got yanked away from the "here's
            // your contract, download it now" modal to the account/orders list before they
            // ever saw it, and had to go hunt for the same contract there to download it. The
            // modal itself stayed mounted throughout (this never closed it), so nothing here
            // needs to navigate anywhere: the customer already has the download button in
            // front of them and can go to 'orders' on their own once they're done with it.
            onSavedSuccess={() => {}}
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
