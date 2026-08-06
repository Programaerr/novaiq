import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { Template } from '../types';
import { useLiveTemplates } from '../lib/pricingOverrides';
import {
  Search,
  CheckCircle2,
  FileSignature,
  Clock,
  Cpu,
  Globe,
  Sparkle,
  ChevronLeft,
  ChevronRight,
  Info,
  ExternalLink
} from 'lucide-react';
import { cosmicAudio } from '../lib/audio';
import { Language, getTranslation, translateText } from '../lib/i18n';
import { formatPrice, Currency } from '../lib/currency';
import { PageLoader } from './PageLoader';
import { NovaiqLogo } from './NovaiqLogo';
import { TemplateFilterPanel } from './TemplateFilterPanel';

// The interactive sandbox is the single largest component in the app (per-template demo logic
// for all 10 templates). Loading it only when a customer actually opens a preview keeps it out
// of the initial "Templates" page bundle entirely, which matters most on weak/low-end devices.
const TemplateInteractiveSandbox = lazy(() =>
  import('./TemplateInteractiveSandbox').then((m) => ({ default: m.TemplateInteractiveSandbox }))
);

interface TemplateGridProps {
  onSelectTemplateForContract: (template: Template) => void;
  onOpenStandalonePreview?: (template: Template) => void;
  language?: Language;
  currency?: Currency;
}

export const TemplateGrid: React.FC<TemplateGridProps> = ({
  onSelectTemplateForContract,
  onOpenStandalonePreview,
  language = 'ar',
  currency = 'IQD',
}) => {
  const currentLang: Language = (language === 'en' ? 'en' : 'ar');
  // Static catalogue merged with any live admin price overrides — same shape and name as
  // the old static import, so every existing reference below still works unchanged.
  const templatesData = useLiveTemplates();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [maxPriceUSD, setMaxPriceUSD] = useState<number>(10000); // Slider range from $300 to $10,000
  const [sortBy, setSortBy] = useState<string>('default'); // 'default', 'priceLowToHigh', 'priceHighToLow', 'fastest'
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
  const filterBarRef = useRef<HTMLDivElement | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // The filter dropdown floats over the page rather than pushing content down, so it needs
  // its own dismissal — clicking anywhere outside it, or Escape, closes it (same pattern as
  // the navbar's own drawer).
  useEffect(() => {
    if (!showFilterPanel) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (filterBarRef.current?.contains(e.target as Node)) return;
      setShowFilterPanel(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFilterPanel(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [showFilterPanel]);

  // Coverflow focus index — clicking any off-center card brings it to the middle instead
  // of firing its buttons immediately (see pointerEvents toggle below); a fresh filter/
  // search/sort always snaps back to the first result rather than an index that may no
  // longer exist.
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number } | null>(null);

  // Drives the coverflow's per-card translateX step — narrower on phones so the smaller
  // card doesn't overlap its neighbors (a fixed desktop-sized offset would).
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const categories = [
    { id: 'all', label: getTranslation('allCategories', currentLang) },
    { id: 'corporate', label: translateText('شركات ومؤسسات', currentLang) },
    { id: 'ecommerce', label: translateText('تجارة إلكترونية', currentLang) },
    { id: 'tech', label: translateText('تقنية وسحابة', currentLang) },
    { id: 'realestate', label: translateText('عقارات وتطوير', currentLang) },
    { id: 'healthcare', label: translateText('خدمات وطب', currentLang) },
    { id: 'fintech', label: translateText('فينتك وخدمات مالية', currentLang) },
    { id: 'restaurant', label: translateText('مطاعم وتوصيل الطلبات', currentLang) },
    { id: 'education', label: translateText('تعليم ومعاهد تدريب', currentLang) },
    { id: 'hospitality', label: translateText('ضيافة وسياحة - فنادق', currentLang) },
    { id: 'logistics', label: translateText('خدمات لوجستية وتوصيل', currentLang) },
  ];

  const sortOptions = [
    { id: 'default', label: currentLang === 'ar' ? 'الافتراضي' : 'Default' },
    { id: 'priceLowToHigh', label: currentLang === 'ar' ? 'السعر: من الأقل إلى الأعلى' : 'Price: Low to High' },
    { id: 'priceHighToLow', label: currentLang === 'ar' ? 'السعر: من الأعلى إلى الأقل' : 'Price: High to Low' },
    { id: 'fastest', label: currentLang === 'ar' ? 'سرعة الإنجاز (الأسرع)' : 'Fastest Delivery' },
  ];

  const activeFiltersCount = (selectedCategory !== 'all' ? 1 : 0) + (maxPriceUSD < 10000 ? 1 : 0) + (sortBy !== 'default' ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setMaxPriceUSD(10000);
    setSortBy('default');
    setSearchQuery('');
    cosmicAudio.playPing();
  };

  const filteredTemplates = useMemo(() => {
    let list = templatesData.filter((t) => {
      // Category filter
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      
      // Price Slider filter
      const matchesPrice = t.basePriceUSD <= maxPriceUSD;

      // Search filter
      const titleTranslated = translateText(t.title, currentLang);
      const subtitleTranslated = translateText(t.subtitle, currentLang);
      const matchesSearch = 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        titleTranslated.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subtitleTranslated.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.techStack.some(tech => tech.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesPrice && matchesSearch;
    });

    // Sorting
    if (sortBy === 'priceLowToHigh') {
      list = [...list].sort((a, b) => a.basePriceUSD - b.basePriceUSD);
    } else if (sortBy === 'priceHighToLow') {
      list = [...list].sort((a, b) => b.basePriceUSD - a.basePriceUSD);
    } else if (sortBy === 'fastest') {
      list = [...list].sort((a, b) => a.deliveryWeeks - b.deliveryWeeks);
    }

    return list;
  }, [selectedCategory, maxPriceUSD, sortBy, searchQuery, currentLang]);

  useEffect(() => {
    setActiveIndex(0);
  }, [selectedCategory, maxPriceUSD, sortBy, searchQuery]);

  // Wraps rather than clamping — arrows/swipes loop continuously past either end, same
  // as the auto-advance, instead of stopping dead at the first/last card.
  const goToOffset = (delta: number) => {
    const n = filteredTemplates.length;
    setActiveIndex((i) => (n === 0 ? 0 : (i + delta + n) % n));
  };

  // Deliberately does NOT call setPointerCapture: capturing on the track would retarget
  // every subsequent pointerup here too, including a plain tap on the active card's own
  // "Full Site" / "Select for Contract" buttons — the browser then can't match that
  // pointerup's target back to the button's mousedown target, so it never synthesizes a
  // click and the button silently stops working. A plain start-X plus a pointerup that
  // lands somewhere reasonable is enough for swipe detection without that trade-off.
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX };
    setIsDragging(true);
  };

  const handleTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    dragRef.current = null;
    setIsDragging(false);
    if (Math.abs(dx) < 40) return;
    goToOffset(dx > 0 ? -1 : 1);
  };

  // Auto-advance one card every 8s, in slow motion (see the 1.6s transition below) — loops
  // back to the first card after the last one. Paused while the visitor is dragging, and
  // skipped entirely under reduced-motion. Depending on `activeIndex` restarts the 8s clock
  // after any manual click/arrow/swipe, so autoplay never fights the visitor's own input.
  useEffect(() => {
    if (isDragging) return;
    if (filteredTemplates.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % filteredTemplates.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, [isDragging, activeIndex, filteredTemplates.length]);

  return (
    <section id="templates-section" className="py-4 sm:py-6 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            {getTranslation('templatesHeading', currentLang)}
          </h2>
          <p className="text-zinc-300 text-xs sm:text-sm">
            {getTranslation('templatesSubheading', currentLang)}
          </p>
          <div className="inline-flex items-center gap-2 mt-3 px-3.5 py-1.5 rounded-full bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-400">
            <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span>
              {currentLang === 'ar'
                ? 'السعر المعروض للقالب (التصميم) فقط، ويختلف عند طلب موقع متكامل وجاهز للعمل الفعلي'
                : 'The price shown is for the template design only — pricing differs for a fully complete, ready-to-launch website'}
            </span>
          </div>
        </div>

        {/* Filter & Search bar. `relative` anchors the dropdown below it — the dropdown
            itself is `absolute`, so opening it floats a glass panel over the templates
            instead of pushing them down the page. */}
        <div ref={filterBarRef} className="relative mb-6">
          {/* bg-white/5 + backdrop-blur-xl used to leave this bar almost see-through, forcing
              the heaviest (24px) blur tier to do all the work of hiding what's scrolling
              behind it — recomputed every scroll frame, which is exactly the kind of GPU cost
              CosmicBackground's own glow comment warns about. Navbar's pill and PageBackBar
              solve the identical "glass bar sitting over scrolling content" problem with a
              much denser fill (55% black) at a cheaper 12px blur — same frosted look, far
              less to recompute per frame. Reusing that proven combo here instead of a bespoke
              one. */}
          <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 shadow-xl shadow-black/20 p-3 sm:p-4">
            <button
              onClick={() => {
                setShowFilterPanel(!showFilterPanel);
                cosmicAudio.playPing();
              }}
              className={`filter-pill-btn relative w-full sm:w-auto px-4 py-2.5 rounded-full text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer ${
                showFilterPanel || activeFiltersCount > 0 ? 'is-active' : ''
              }`}
            >
              <span className="filter-pill-beam" aria-hidden="true" />
              <Sparkle className="w-3.5 h-3.5 text-current fill-current shrink-0" />
              <span className="font-semibold text-current">{currentLang === 'ar' ? 'تصفية' : 'Filter'}</span>
              {activeFiltersCount > 0 && (
                <span className="filter-pill-badge w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Search Box */}
            <div className="relative w-full sm:w-80 sm:ms-auto">
              <Search className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getTranslation('searchPlaceholder', currentLang)}
                className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-black/20 border border-white/10 focus:border-white/40 focus:outline-none text-white text-xs sm:text-sm placeholder-zinc-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  {currentLang === 'ar' ? 'مسح' : 'Clear'}
                </button>
              )}
            </div>
          </div>

          <TemplateFilterPanel
            open={showFilterPanel}
            currentLang={currentLang}
            currency={currency}
            categories={categories}
            sortOptions={sortOptions}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            maxPriceUSD={maxPriceUSD}
            setMaxPriceUSD={setMaxPriceUSD}
            sortBy={sortBy}
            setSortBy={setSortBy}
            activeFiltersCount={activeFiltersCount}
            resetAllFilters={resetAllFilters}
          />
        </div>

        {/* Templates Coverflow — clicking any off-center card brings it to focus (same
            "click to bring to front" idea as a music-app cover carousel) instead of firing
            its buttons; only the centered card is actually interactive, enforced via the
            pointerEvents toggle below rather than guessing which inner element was clicked. */}
        <div className="flex items-center justify-center gap-2 sm:gap-6 mt-8 sm:mt-10">
          <button
            type="button"
            onClick={() => goToOffset(1)}
            aria-label={currentLang === 'ar' ? 'التالي' : 'Next'}
            className="hidden sm:flex shrink-0 w-10 h-10 rounded-full bg-zinc-950/90 border border-zinc-800 items-center justify-center text-white hover:border-white/50 glow-white-hover transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 ltr:rotate-180" />
          </button>

          <div
            onPointerDown={handleTrackPointerDown}
            onPointerUp={handleTrackPointerUp}
            className="relative w-full max-w-4xl h-[600px] sm:h-[700px] overflow-hidden touch-pan-y cursor-grab active:cursor-grabbing"
          >
          {filteredTemplates.map((template, index) => {
            const displayTitle = translateText(template.title, currentLang);
            const displaySubtitle = translateText(template.subtitle, currentLang);
            const displayDesc = translateText(template.description, currentLang);
            const displayCategory = translateText(template.categoryLabel, currentLang);

            // Shortest circular distance, not plain index subtraction — so wrapping past
            // the last card continues smoothly into the first one (like a looping menu)
            // instead of snapping backward across the whole strip to reach index 0.
            const n = filteredTemplates.length;
            let offset = index - activeIndex;
            if (offset > n / 2) offset -= n;
            if (offset < -n / 2) offset += n;
            const distance = Math.abs(offset);
            const isActive = offset === 0;
            const isVisible = distance <= 2;
            // Every card stays mounted permanently (never unmounted/remounted as it cycles
            // near or away from center) — cards beyond distance 2 just sit at 0 opacity,
            // pinned to the near edge so they're ready to slide back in. Unmounting far
            // cards used to force each <img> to reload from scratch every time it cycled
            // back into range, which is what showed up as the image/text flashing blank.
            const cappedDistance = Math.min(distance, 3);
            const clampedOffset = isVisible ? offset : Math.sign(offset) * 3;

            return (
              <div
                key={template.id}
                onClick={() => { if (!isActive) setActiveIndex(index); }}
                style={{
                  transform: `translate(-50%, -50%) translateX(${clampedOffset * (isMobile ? 180 : 235)}px) scale(${isActive ? 1 : cappedDistance === 1 ? 0.82 : 0.68})`,
                  opacity: isActive ? 1 : cappedDistance === 1 ? 0.55 : cappedDistance === 2 ? 0.28 : 0,
                  zIndex: 10 - cappedDistance,
                  // Position/scale glide in slow motion; opacity settles fast on its own —
                  // otherwise the incoming card visibly fades up out of a haze for the
                  // whole 1.6s, instead of just sliding into place already at full clarity.
                  transition: 'transform 1.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease',
                  pointerEvents: isVisible ? undefined : 'none',
                }}
                className={`absolute top-1/2 left-1/2 w-[300px] sm:w-[380px] ${isActive ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div
                  style={{ pointerEvents: isActive ? 'auto' : 'none' }}
                  className="bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 hover:border-white/50 glow-white-hover transition-colors duration-300 flex flex-col group shadow-2xl"
                >

                {/* Card Image Banner */}
                <div
                  onClick={() => {
                    if (onOpenStandalonePreview) {
                      onOpenStandalonePreview(template);
                    } else {
                      setPreviewTemplate(template);
                    }
                    cosmicAudio.playPing();
                  }}
                  className="relative h-40 sm:h-56 overflow-hidden bg-black cursor-pointer group/img"
                >
                  <img
                    src={template.previewImage}
                    alt={displayTitle}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700 opacity-80 group-hover/img:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                  {/* Top Badge Tag — stacked above the delivery badge on mobile (both hug
                      the right edge) since the two pills' combined width can exceed the
                      300px-wide mobile card and collide; back to opposite corners once
                      there's enough room on desktop's 380px card. */}
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 max-w-[75%] truncate px-2.5 py-1 sm:px-3 rounded-full bg-black/90 border border-zinc-700 text-white text-[10px] sm:text-[11px] font-bold">
                    {displayCategory}
                  </div>

                  {/* Delivery Time Badge */}
                  <div className="absolute top-10 right-3 sm:top-4 sm:right-auto sm:left-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/90 border border-zinc-800 text-white text-[10px] sm:text-[11px] font-bold">
                    <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>{getTranslation('deliveryTime', currentLang)} {template.deliveryWeeks} {translateText('أسابيع', currentLang)}</span>
                  </div>

                  {/* Hover Overlay Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/70">
                    <span className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold flex items-center gap-2 shadow-2xl scale-95 group-hover/img:scale-100 transition-transform">
                      <Globe className="w-4 h-4 text-black" />
                      <span>{currentLang === 'ar' ? 'معاينة موقع منفصل' : 'Open Standalone Site'}</span>
                    </span>
                  </div>

                  {/* Title overlay */}
                  <div className="absolute bottom-3 right-4 left-4">
                    <h3 className="text-xl font-bold text-white line-clamp-1">
                      {displayTitle}
                    </h3>
                    <p className="text-xs text-zinc-400 font-light line-clamp-1">
                      {displaySubtitle}
                    </p>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between space-y-3 sm:space-y-5">
                  
                  <div className="p-3.5 rounded-xl bg-black/60 border border-zinc-800/80 hover:border-white/30 glow-white-hover transition-colors">
                    <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed line-clamp-2">
                      {displayDesc}
                    </p>
                  </div>

                  {/* Tech Stack Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {template.techStack.slice(0, 4).map((tech, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 text-[10px] font-mono"
                      >
                        {tech}
                      </span>
                    ))}
                    {template.techStack.length > 4 && (
                      <span className="px-2 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 text-[10px]">
                        +{template.techStack.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Features Checklist */}
                  <ul className="space-y-1.5 text-xs text-zinc-300 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-white/30 glow-white-hover transition-colors">
                    {template.features.slice(0, 3).map((feat, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                        <span className="line-clamp-1">{translateText(feat, currentLang)}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Price & Action Buttons */}
                  <div className="pt-4 border-t border-zinc-800 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">{currentLang === 'ar' ? 'التكلفة الأساسية للقالب:' : 'Base Template Cost:'}</span>
                      <div className="text-left">
                        <span className="text-lg font-bold text-white font-mono">
                          {formatPrice(template.basePriceIQD, currentLang, currency)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          if (onOpenStandalonePreview) {
                            onOpenStandalonePreview(template);
                          } else {
                            setPreviewTemplate(template);
                          }
                          cosmicAudio.playPing();
                        }}
                        className="border-beam-btn w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-500 glow-white-hover text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5 text-zinc-300" />
                        <span>{currentLang === 'ar' ? 'موقع منفصل' : 'Full Site'}</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectTemplateForContract(template);
                          cosmicAudio.playWarp();
                        }}
                        className="border-beam-btn w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold white-btn-glow flex items-center justify-center gap-1.5 cursor-pointer border border-white"
                      >
                        <FileSignature className="w-3.5 h-3.5 text-black" />
                        <span>{getTranslation('selectForContract', currentLang)}</span>
                      </button>
                    </div>

                    {/* Optional external live-site link — set by the admin per template
                        (Pricing tab). Hidden entirely when empty, same "empty = hidden,
                        filled = shown" convention as the footer social links. */}
                    {template.demoUrl && (
                      <a
                        href={template.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full py-2 rounded-xl bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white border border-dashed border-zinc-800 hover:border-zinc-600 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{currentLang === 'ar' ? 'زيارة الموقع الفعلي' : 'Visit Live Site'}</span>
                      </a>
                    )}

                  </div>

                </div>
                </div>
              </div>
            );
          })}
          </div>

          <button
            type="button"
            onClick={() => goToOffset(-1)}
            aria-label={currentLang === 'ar' ? 'السابق' : 'Previous'}
            className="hidden sm:flex shrink-0 w-10 h-10 rounded-full bg-zinc-950/90 border border-zinc-800 items-center justify-center text-white hover:border-white/50 glow-white-hover transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 ltr:rotate-180" />
          </button>
        </div>

        {/* Position dots */}
        {filteredTemplates.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {filteredTemplates.map((template, i) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={translateText(template.title, currentLang)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === activeIndex ? 'w-6 bg-white' : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'
                }`}
              />
            ))}
          </div>
        )}

        {/* Brand mark — sized to actually fill the empty stretch between the carousel and
            the footer, not just sit as a small centered icon within it. Scaled up as a whole
            (not just a bigger `size` prop) so the wordmark grows in step with the icon
            instead of staying pinned at its fixed text-xl/2xl size while the icon balloons
            past it; growing by breakpoint so it fills proportionally more on wider screens
            without overflowing narrow ones. */}
        <div className="flex justify-center mt-16 sm:mt-24 mb-8 sm:mb-14 opacity-[0.22]">
          <NovaiqLogo size={60} showText={true} className="scale-150 sm:scale-[2.25] lg:scale-[3]" />
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-16 bg-zinc-950 rounded-3xl border border-zinc-800">
            <Cpu className="w-12 h-12 text-zinc-400 mx-auto mb-3 animate-pulse" />
            <h3 className="text-lg font-bold text-white mb-1">{currentLang === 'ar' ? 'لم نجد قوالب تطابق البحث والفلاتر' : 'No templates match your filters'}</h3>
            <p className="text-zinc-400 text-sm mb-4">{currentLang === 'ar' ? 'جرب تغيير خيارات السعر أو الأقسام' : 'Try adjusting your budget range or category selection'}</p>
            <button
              onClick={resetAllFilters}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold cursor-pointer white-btn-glow"
            >
              {currentLang === 'ar' ? 'إعادة ضبط كافة الفلاتر' : 'Reset All Filters'}
            </button>
          </div>
        )}

      </div>

      {/* Interactive Live Sandbox Preview Modal */}
      {previewTemplate && (
        <Suspense fallback={<PageLoader />}>
          <TemplateInteractiveSandbox
            template={previewTemplate}
            language={language}
            currency={currency}
            onClose={() => setPreviewTemplate(null)}
            onSelectForContract={(template) => {
              setPreviewTemplate(null);
              onSelectTemplateForContract(template);
            }}
          />
        </Suspense>
      )}

    </section>
  );
};

