import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'motion/react';
import { CosmicBackground } from './components/CosmicBackground';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { MilestoneTimeline } from './components/MilestoneTimeline';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { CookieConsent } from './components/CookieConsent';
import { PageLoader } from './components/PageLoader';
import { templatesData } from './data/templatesData';
import { Home } from 'lucide-react';

import { Template, ContractData } from './types';
import { Language } from './lib/i18n';

// Everything below is only needed after a navigation action (clicking into a page,
// opening a live template demo, generating a contract PDF). Splitting these into their
// own chunks keeps the initial home-page bundle small — the biggest single lever for
// smooth performance on weak/low-end devices, since less JS means less to download,
// parse, and execute before the page becomes interactive.
const TemplateGrid = lazy(() => import('./components/TemplateGrid').then((m) => ({ default: m.TemplateGrid })));
const ContractBuilder = lazy(() => import('./components/ContractBuilder').then((m) => ({ default: m.ContractBuilder })));
const ContractPDFPreview = lazy(() => import('./components/ContractPDFPreview').then((m) => ({ default: m.ContractPDFPreview })));
const FirebaseOrdersModal = lazy(() => import('./components/FirebaseOrdersModal').then((m) => ({ default: m.FirebaseOrdersModal })));
const PolicyPage = lazy(() => import('./components/PolicyPage').then((m) => ({ default: m.PolicyPage })));
const TemplateInteractiveSandbox = lazy(() => import('./components/TemplateInteractiveSandbox').then((m) => ({ default: m.TemplateInteractiveSandbox })));

export default function App() {
  const [activePage, setActivePage] = useState<string>('home');
  const [selectedTemplateForContract, setSelectedTemplateForContract] = useState<Template | null>(null);
  const [standalonePreviewTemplate, setStandalonePreviewTemplate] = useState<Template | null>(null);
  const [activeSection, setActiveSection] = useState<string>('hero');
  
  // Modals state
  const [activeContractForPreview, setActiveContractForPreview] = useState<ContractData | null>(null);
  const [savedContractsCount, setSavedContractsCount] = useState<number>(0);
  const [language, setLanguage] = useState<Language>('ar');

  // Carries the customer's exact choices from the interactive live-site demo into the contract form
  const [initialCustomFeaturesText, setInitialCustomFeaturesText] = useState<string>('');
  const [initialPrimaryColor, setInitialPrimaryColor] = useState<string>('');

  // Dynamic active background image computation
  const activeBgImage = (activePage === 'custom-request' && selectedTemplateForContract ? selectedTemplateForContract.previewImage : null)
    || (standalonePreviewTemplate ? standalonePreviewTemplate.previewImage : null);

  // Scroll Spy for Home Page sections
  useEffect(() => {
    if (activePage !== 'home') {
      setActiveSection(activePage);
      return;
    }

    let ticking = false;
    const computeActiveSection = () => {
      const scrollPos = window.scrollY + window.innerHeight / 3;
      const templatesEl = document.getElementById('templates-section');
      const contractEl = document.getElementById('contract-section');
      const timelineEl = document.getElementById('timeline-section');
      const aboutEl = document.getElementById('about-section');

      let nextSection = 'hero';
      if (aboutEl && scrollPos >= aboutEl.offsetTop) {
        nextSection = 'about';
      } else if (timelineEl && scrollPos >= timelineEl.offsetTop) {
        nextSection = 'timeline';
      } else if (contractEl && scrollPos >= contractEl.offsetTop) {
        nextSection = 'contract';
      } else if (templatesEl && scrollPos >= templatesEl.offsetTop) {
        nextSection = 'templates';
      }

      setActiveSection(prev => (prev !== nextSection ? nextSection : prev));
      ticking = false;
    };

    // Throttle to once per animation frame so scrolling never queues up more
    // layout reads (offsetTop) than the browser can paint.
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(computeActiveSection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activePage]);

  // Handle URL changes & popstate (browser back/forward)
  useEffect(() => {
    const handleLocationChange = () => {
      const params = new URLSearchParams(window.location.search);
      const previewId = params.get('preview');
      if (previewId) {
        const found = templatesData.find(t => t.id === previewId);
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
      } else {
        setActivePage('home');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);

    // Firebase is a large SDK (~120KB gzipped) — deferring it to a dynamic import means
    // the browser only has to fetch/parse the small app shell before first paint, and
    // Firebase loads right after in parallel while the user is already seeing the page.
    // The badge count simply fills in a moment later, same as the subscription always did.
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    import('./lib/firebase').then(({ subscribeToContracts }) => {
      if (cancelled) return;
      unsubscribe = subscribeToContracts((contracts) => {
        setSavedContractsCount(contracts.length);
      });
    });

    return () => {
      cancelled = true;
      window.removeEventListener('popstate', handleLocationChange);
      unsubscribe?.();
    };
  }, []);

  // Maintain page direction (RTL) regardless of language text selection as requested
  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = language;
  }, [language]);

  // Anonymous page-view logging — a no-op until the visitor accepts the cookie banner.
  // Dynamically imported so the analytics module (which pulls in Firebase) never sits
  // on the critical path for first paint.
  useEffect(() => {
    import('./lib/analytics').then(({ trackPageView }) => trackPageView(activePage));
  }, [activePage]);

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

  if (standalonePreviewTemplate) {
    return (
      <div className="min-h-screen bg-black text-white relative">
        <CosmicBackground activeSection="templates" activeBgImage={activeBgImage} />
        <Suspense fallback={<PageLoader />}>
          <TemplateInteractiveSandbox
            template={standalonePreviewTemplate}
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
        savedContractsCount={savedContractsCount}
        language={language}
        setLanguage={setLanguage}
      />

      {/* Main Content View with Hardware Accelerated Transitions */}
      <main className="flex-1 relative z-10 pt-24 sm:pt-28 md:pt-32 pb-8">
        
        {/* Persistent "Return to Main Page" button on inner views */}
        {activePage !== 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-3 flex justify-between items-center">
            <button
              onClick={() => navigateTo('home')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-bold transition-all shadow-md cursor-pointer group"
            >
              <Home className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              <span>{isAr ? 'العودة إلى الصفحة الرئيسية' : 'Return to Home Page'}</span>
            </button>
            <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
              {isAr ? `الصفحة الحالية: ${activePage}` : `Page: ${activePage}`}
            </span>
          </div>
        )}

        {activePage === 'home' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 sm:space-y-8"
          >
            {/* Hero Banner */}
            <HeroSection
              onExploreTemplates={() => navigateTo('templates')}
              onCreateContract={() => navigateTo('custom-request')}
              language={language}
            />

            {/* Quick Overview Grid to drive leads */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl">
                <div className="space-y-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    {isAr ? 'الإنتاجية والسرعة في تسليم مشروعك' : 'Speed & Efficiency for Your Project'}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {isAr
                      ? 'نحن لا نضيع وقتك في نقاشات ومفاوضات مطولة. قوالبنا البرمجية الجاهزة تمنحك انطلاقة فورية بنسبة 80% من مشروعك، بينما نتولى نحن تخصيص الـ 20% المتبقية لتلائم هوية شركتك ومتطلباتك الخاصة.'
                      : 'We get straight to execution. Our pre-built production templates give you an instant 80% head start, while we customize the remaining 20% specifically for your brand identity.'}
                  </p>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {[
                      { value: '80%', label: isAr ? 'جاهزية فورية' : 'Instant readiness' },
                      { value: isAr ? '3-4' : '3-4', label: isAr ? 'أسابيع تسليم' : 'Weeks delivery' },
                      { value: '100%', label: isAr ? 'ملكية الكود' : 'Code ownership' },
                    ].map((stat, idx) => (
                      <div key={idx} className="text-center p-3 rounded-xl bg-black border border-zinc-800/80">
                        <div className="text-lg sm:text-xl font-extrabold text-white font-mono">{stat.value}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: isAr ? "قوالب مجربة ومعتمدة" : "Verified Templates", desc: isAr ? "جاهزة للتركيب الفوري" : "Instant deployment" },
                    { label: isAr ? "برمجة مرنة مخصصة" : "Flexible Engineering", desc: isAr ? "نطور كل ما تريده" : "Custom built features" },
                    { label: isAr ? "ربط وحفظ في Firebase" : "Firebase Cloud Storage", desc: isAr ? "ضمان حفظ كل البيانات" : "Persistent data sync" },
                    { label: isAr ? "أكواد برمجية نظيفة" : "Clean Source Code", desc: isAr ? "سهلة الصيانة والتشغيل" : "Maintainable architecture" }
                  ].map((x, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-black border border-zinc-800/80 space-y-1">
                      <div className="text-xs font-bold text-white">{x.label}</div>
                      <div className="text-[11px] text-zinc-400">{x.desc}</div>
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
          </motion.div>
        )}

        {activePage === 'templates' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageLoader />}>
              <TemplateGrid
                language={language}
                onSelectTemplateForContract={handleSelectTemplateForContract}
                onOpenStandalonePreview={(template) => setStandalonePreviewTemplate(template)}
              />
            </Suspense>
          </motion.div>
        )}

        {activePage === 'custom-request' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
          >
            <Suspense fallback={<PageLoader />}>
              <ContractBuilder
                language={language}
                selectedTemplate={selectedTemplateForContract}
                onContractGenerated={handleContractGenerated}
                initialCustomFeaturesText={initialCustomFeaturesText}
                initialPrimaryColor={initialPrimaryColor}
              />
            </Suspense>
          </motion.div>
        )}

        {activePage === 'orders' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          >
            <Suspense fallback={<PageLoader />}>
              <FirebaseOrdersModal
                language={language}
                onClose={() => navigateTo('home')}
                onNewContract={() => {
                  setSelectedTemplateForContract(null);
                  navigateTo('custom-request');
                }}
              />
            </Suspense>
          </motion.div>
        )}

        {activePage === 'timeline' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MilestoneTimeline
              language={language}
              onCreateContract={() => navigateTo('custom-request')}
            />
          </motion.div>
        )}

        {activePage === 'about' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AboutSection language={language} />
          </motion.div>
        )}

        {activePage === 'privacy' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageLoader />}>
              <PolicyPage type="privacy" language={language} />
            </Suspense>
          </motion.div>
        )}

        {activePage === 'terms' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageLoader />}>
              <PolicyPage type="terms" language={language} />
            </Suspense>
          </motion.div>
        )}

      </main>

      {/* Footer */}
      <Footer language={language} onNavigate={navigateTo} />

      {/* Bottom Cookie Consent Banner */}
      <CookieConsent language={language} onNavigateToPrivacy={() => navigateTo('privacy')} />

      {/* Contract PDF Generated Preview Modal */}
      {activeContractForPreview && (
        <Suspense fallback={<PageLoader />}>
          <ContractPDFPreview
            contract={activeContractForPreview}
            onClose={() => setActiveContractForPreview(null)}
            onSavedSuccess={() => {
              navigateTo('orders');
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
