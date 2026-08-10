import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import { Template } from '../types';
import { useLiveTemplates } from '../lib/pricingOverrides';
import {
  Search,
  CheckCircle2,
  FileSignature,
  Clock,
  Cpu,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Info
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
  /** Card to open on, if any — used to come back to the template a preview was opened from. */
  focusTemplateId?: string | null;
}

export const TemplateGrid: React.FC<TemplateGridProps> = ({
  onSelectTemplateForContract,
  onOpenStandalonePreview,
  language = 'ar',
  currency = 'IQD',
  focusTemplateId = null,
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
  // The live drag offset is published as a CSS variable on the track and read by every
  // card's own transform, rather than held in React state. State would re-render all ten
  // card subtrees on every pointermove — the exact per-frame main-thread work that shows
  // up as stutter on a weak device. One custom property write on one element instead, and
  // the cards' transforms update straight from it.
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef(0);
  const setDragOffset = (px: number) => {
    trackRef.current?.style.setProperty('--drag-x', `${px}px`);
  };

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
    { id: 'cars', label: translateText('معارض سيارات', currentLang) },
    { id: 'realestate', label: translateText('عقارات وتطوير', currentLang) },
    { id: 'healthcare', label: translateText('خدمات وطب', currentLang) },
    { id: 'fintech', label: translateText('فينتك وخدمات مالية', currentLang) },
    { id: 'restaurant', label: translateText('مطاعم وتوصيل الطلبات', currentLang) },
    { id: 'education', label: translateText('تعليم ومعاهد تدريب', currentLang) },
    { id: 'mobile', label: translateText('هواتف وإلكترونيات', currentLang) },
    { id: 'watches', label: translateText('ساعات يد ومجوهرات', currentLang) },
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

  // Compares against the last values it actually saw rather than just firing whenever the
  // effect runs. Under StrictMode an effect is invoked twice on mount, and a run-counting
  // guard would burn its one shot on the throwaway first pass — leaving the second pass free
  // to reset an index the restore below had just set.
  const lastFilters = useRef({ selectedCategory, maxPriceUSD, sortBy, searchQuery });
  useEffect(() => {
    const prev = lastFilters.current;
    if (
      prev.selectedCategory === selectedCategory &&
      prev.maxPriceUSD === maxPriceUSD &&
      prev.sortBy === sortBy &&
      prev.searchQuery === searchQuery
    ) return;
    lastFilters.current = { selectedCategory, maxPriceUSD, sortBy, searchQuery };
    setActiveIndex(0);
  }, [selectedCategory, maxPriceUSD, sortBy, searchQuery]);

  // Opening a standalone preview unmounts this whole component (App swaps the tree out), so
  // returning would otherwise drop the visitor on the first card rather than the one they
  // were just looking at. Only claims the position once, so changing a filter afterwards
  // still snaps to the first result instead of yanking them back here.
  const didRestoreFocus = useRef(false);
  useEffect(() => {
    if (didRestoreFocus.current || !focusTemplateId) return;
    const idx = filteredTemplates.findIndex((t) => t.id === focusTemplateId);
    if (idx === -1) return;
    didRestoreFocus.current = true;
    setActiveIndex(idx);
  }, [focusTemplateId, filteredTemplates]);

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
    setDragOffset(0);
  };

  // Move/up are tracked on `window`, not as onPointerMove/onPointerUp props on the track
  // element — a real swipe routinely carries the pointer outside the track's own bounds
  // (fast or diagonal drags near its edge do this constantly), and an element-scoped
  // listener simply stops receiving events the instant that happens. An earlier version of
  // this used onPointerLeave to close the gesture in that case, but pointerleave fires the
  // moment the pointer exits the bounds — including mid-drag, while the button/finger is
  // still down — which was ending swipes prematurely instead of only on an actual release.
  //
  // Global listeners fix that at the root: onPointerDown stays on the track (that is still
  // the right place to detect "a drag started here"), but once isDragging flips on, this
  // effect owns move/up for the rest of the gesture regardless of where the pointer travels
  // or lets go — the same reason a text selection or a native <input type="range"> keeps
  // tracking past its own edges. Still no setPointerCapture (see handleTrackPointerDown's
  // history above): these are separate, non-capturing listeners, so a tap that starts and
  // ends on a button's own bounds is never touched by this at all.
  //
  // The index moves *during* the drag, not on release. Every time the drag passes half a
  // card's step, the neighbour that has reached the middle becomes the active card there
  // and then, and the start point advances by exactly that step so the residual offset
  // carries on from where it was. Both halves matter: committing the index is what makes
  // the centered card genuinely the selected one (so letting go anywhere keeps whatever is
  // in the middle, instead of the whole strip springing back to where the drag began), and
  // moving startX in the same breath is what keeps the motion continuous — the card that
  // just became active is drawn at the same pixel before and after the hand-off, so nothing
  // jumps at the moment of commit. Release then has nothing left to decide; it only settles
  // the residual back to zero.
  useEffect(() => {
    if (!isDragging) return;
    const step = isMobile ? 180 : 235;
    const n = filteredTemplates.length;
    let frame = 0;
    let offset = 0;

    const apply = () => {
      frame = 0;
      const drag = dragRef.current;
      if (!drag) return;
      const steps = n > 1 ? Math.round(offset / step) : 0;
      if (steps !== 0) {
        drag.startX += steps * step;
        offset -= steps * step;
        dragOffsetRef.current = offset;
        // Deliberately does NOT publish --drag-x here. Changing the index is a React state
        // update that lands on a later frame, while a style write lands immediately — so
        // pushing the rebased residual now would draw every card against positions still
        // computed from the *old* index, a full card's step out of place, until React caught
        // up. That one-frame mismatch is exactly the previous card flashing into view before
        // the new one takes the middle. The layout effect below publishes it in the same
        // commit as the index instead, so the two are always painted together.
        //
        // Dragging right (positive) walks backwards through the list, same direction the
        // release-time swipe used to resolve to.
        setActiveIndex((i) => (((i - steps) % n) + n) % n);
        return;
      }
      dragOffsetRef.current = offset;
      setDragOffset(offset);
    };

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      offset = e.clientX - drag.startX;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isDragging, isMobile, filteredTemplates.length]);

  // The other half of the pact above: publishes whatever offset the gesture is currently at,
  // after every render and synchronously before the browser paints. That timing is the whole
  // point — a committed index and the residual that belongs with it reach the screen in one
  // frame, so the strip never draws itself in a position neither of them describes.
  useLayoutEffect(() => {
    if (!isDragging) return;
    trackRef.current?.style.setProperty('--drag-x', `${dragOffsetRef.current}px`);
  });

  // Settling the residual offset home, once the drag is over. Deliberately not done inside
  // onUp: that runs while the cards still carry the drag's own transition rules (isDragging
  // is only flipped in the same call, and React has not re-rendered yet), so zeroing it
  // there would snap rather than glide. A frame later the re-render has restored the
  // transform transition, and the same write animates instead.
  useEffect(() => {
    if (isDragging) return;
    const el = trackRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      dragOffsetRef.current = 0;
      el.style.setProperty('--drag-x', '0px');
    });
    return () => cancelAnimationFrame(id);
  }, [isDragging]);

  // Auto-advance one card every 8s (see the 0.55s transition below) — loops
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
        
        {/* Filter & Search bar — first thing on the page now, with the price notice below it.
            `relative` anchors the dropdown below it — the dropdown itself is `absolute`, so
            opening it floats a glass panel over the templates instead of pushing them down.
            The explicit `z-40` is what keeps that panel above the coverflow: the cards below
            carry their own z-index (up to 10) and, sitting later in the DOM, would otherwise
            paint straight over a menu whose own stacking order was still `auto`. */}
        <div ref={filterBarRef} className="relative z-40 mb-4">
          {/* bg-white/5 + backdrop-blur-xl used to leave this bar almost see-through, forcing
              the heaviest (24px) blur tier to do all the work of hiding what's scrolling
              behind it — recomputed every scroll frame, which is exactly the kind of GPU cost
              CosmicBackground's own glow comment warns about. Navbar's pill and PageBackBar
              solve the identical "glass bar sitting over scrolling content" problem with a
              much denser fill (55% black) at a cheaper 12px blur — same frosted look, far
              less to recompute per frame. Reusing that proven combo here instead of a bespoke
              one. */}
          <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 shadow-xl shadow-black/20 p-4 sm:p-5">
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
              <SlidersHorizontal className="w-3.5 h-3.5 text-current shrink-0" />
              <span className="font-semibold text-current">{currentLang === 'ar' ? 'تصفية' : 'Filter'}</span>
              {activeFiltersCount > 0 && (
                <span className="filter-pill-badge w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Search Box — carries the same rotating beam as the Filter pill beside it, so
                the toolbar's two controls answer a pointer the same way. It lights on hover
                and stays lit while the field has focus (a text field is "active" for as long
                as someone is typing in it, not just while the cursor rests on it). */}
            <div className="search-neu relative w-full sm:w-72 sm:ms-auto rounded-full">
              <span className="nq-btn-beam nq-btn-beam--dark" aria-hidden="true" />
              <Search className="w-4 h-4 text-zinc-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getTranslation('searchPlaceholder', currentLang)}
                className="w-full pr-11 pl-4 py-2 rounded-full bg-transparent border-none focus:outline-none text-zinc-800 text-xs sm:text-sm font-semibold placeholder-zinc-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 text-xs font-bold cursor-pointer"
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

        {/* Price notice — sits under the filter bar so the controls are the first thing on
            the page. It stays above the cards because it qualifies every price on them. */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-400">
            <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span>
              {currentLang === 'ar'
                ? 'السعر المعروض للقالب (التصميم) فقط، ويختلف عند طلب موقع متكامل وجاهز للعمل الفعلي'
                : 'The price shown is for the template design only — pricing differs for a fully complete, ready-to-launch website'}
            </span>
          </div>
        </div>

        {/* Templates Coverflow — clicking any off-center card brings it to focus (same
            "click to bring to front" idea as a music-app cover carousel) instead of firing
            its buttons; only the centered card is actually interactive, enforced via the
            pointerEvents toggle below rather than guessing which inner element was clicked. */}
        <div className="flex items-center justify-center gap-2 sm:gap-6 mt-8 sm:mt-10">
          {/* Both arrows wear the toolbar's Filter pill (.filter-pill-btn +
              .filter-pill-beam), same as the card's "Choose template" action, so every
              control on this page answers a pointer identically. Only w-10 h-10 rounded-full
              is theirs — the pill brings the surface, the inversion and the beam, and the
              chevron takes text-current so it flips with the body instead of staying white
              on a white circle. The old bg/border/glow-white-hover utilities are gone for
              that reason: they fought the pill rather than layering on it. */}
          <button
            type="button"
            onClick={() => goToOffset(1)}
            aria-label={currentLang === 'ar' ? 'التالي' : 'Next'}
            className="filter-pill-btn relative hidden sm:flex shrink-0 w-10 h-10 rounded-full items-center justify-center cursor-pointer"
          >
            <span className="filter-pill-beam" aria-hidden="true" />
            <ChevronRight className="w-4 h-4 ltr:rotate-180 text-current" />
          </button>

          {/* Taller than the card it holds, on purpose. The track clips (overflow-hidden)
              and the card is centered in it, so anything the card's own height exceeds gets
              cut off top *and* bottom. Measured at the card widths below, the tallest
              template runs 599px on desktop and 521px on mobile — a full feature list, two
              action rows and the optional live-site link — so this clears the worst case at
              both breakpoints with room to spare. It had to be raised well past this while
              the cards were narrower: less width meant more wrapping, and the same content
              stood ~630px tall. */}
          <div
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            style={{ perspective: '1800px' }}
            className="relative w-full max-w-4xl h-[600px] sm:h-[700px] overflow-hidden touch-pan-y cursor-grab active:cursor-grabbing"
          >
          {filteredTemplates.map((template, index) => {
            const displayTitle = translateText(template.title, currentLang);
            const displaySubtitle = translateText(template.subtitle, currentLang);
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
            // Real depth instead of the size-only illusion scale() used to fake alone:
            // pushed back in Z per step away from center, and angled toward the
            // centerline like a physical cover-flow shelf (mirrored by sign so the two
            // sides lean toward each other, not the same way). scale() stays layered on
            // top rather than replaced — perspective's own foreshortening depends on the
            // exact px chosen for perspective/translateZ, which isn't something to tune
            // blind; the already-accepted 0.82/0.68 sizing is the safe, known-good part
            // of this and rotateY/translateZ are purely additive to it.
            const rotY = isActive ? 0 : offset > 0 ? -16 : 16;
            // Holds the same ratio to card width it always has (0.6 mobile / 0.618 desktop),
            // so the gap between cards reads the same however wide they are. Mirrors the
            // `step` the drag effect above computes — both describe the same one-card
            // travel distance, and they have to agree or a drag lands off-centre.
            const stepPx = isMobile ? 156 : 204;

            return (
              <div
                key={template.id}
                onClick={() => { if (!isActive) setActiveIndex(index); }}
                style={{
                  // --drag-x is the live gesture offset, published on the track by the drag
                  // effect above. Folded into the transform here rather than applied to a
                  // wrapper so the whole strip moves as one, and so a card's resting
                  // position and its drag offset stay a single composited transform.
                  transform: `translate(-50%, -50%) translateX(calc(${clampedOffset * stepPx}px + var(--drag-x, 0px))) translateZ(${-cappedDistance * 90}px) rotateY(${rotY}deg)`,
                  opacity: isActive ? 1 : cappedDistance === 1 ? 0.55 : cappedDistance === 2 ? 0.28 : 0,
                  zIndex: 10 - cappedDistance,
                  // 0.55s, matched to the scale transition on the wrapper below. It used to
                  // be 1.6s against that 0.45s, and three different durations for one
                  // movement is what made a flip read as unfinished: the incoming card
                  // reached full size and full brightness in under half a second and then
                  // kept drifting toward the middle for another second, so it looked like
                  // the wrong card was sitting in the centre. Position and size now arrive
                  // together and the card lands where it belongs, at once. Opacity stays
                  // slightly ahead on purpose — otherwise the card fades up out of a haze
                  // rather than sliding in already clear.
                  //
                  // The transform half is suspended while dragging so the offset tracks the
                  // finger/mouse 1:1 rather than chasing it on an easing; opacity keeps its
                  // transition throughout, since a card that takes the middle mid-drag
                  // should still brighten smoothly rather than pop.
                  transition: isDragging
                    ? 'opacity 0.35s ease'
                    : 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease',
                  pointerEvents: isVisible ? undefined : 'none',
                  // Do NOT add `visibility: hidden` (or `content-visibility`) to the
                  // out-of-range cards. It looks like free performance — they are at zero
                  // opacity anyway, and it would drop their compositor layers — and it was
                  // tried here and reverted. Taking an element out of rendering lets the
                  // browser discard its decoded image, so every card that cycled back into
                  // range had to decode its preview again, and the autoplay stepping every
                  // 8s turned that into a card visibly blanking and popping back. It is the
                  // same failure the note above records from when far cards were unmounted
                  // outright; keeping them mounted is only half the fix, they have to stay
                  // *rendered* too. A fully transparent element is already skipped at paint
                  // time, so what was left to win here was small and this is what it cost.
                }}
                className={`absolute top-1/2 left-1/2 w-[260px] sm:w-[330px] h-[400px] sm:h-[480px] ${isActive ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {/* Scale lives here, one level in from the positional transform above,
                    precisely so it can keep its own transition while that one is switched
                    off mid-drag. The index now commits as the drag crosses each half-step,
                    so a neighbour becomes the active card *during* the gesture — on a
                    single element it would jump 0.82 → 1 in one frame at that moment. Split
                    across two, the position still tracks the finger exactly and the size
                    eases into it. */}
                <div
                  style={{
                    transform: `scale(${isActive ? 1 : cappedDistance === 1 ? 0.82 : 0.68})`,
                    // Same 0.55s and same curve as the positional transform above — see the
                    // note there on why the two must agree.
                    transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  className="h-full"
                >
                {/* One full-bleed frame instead of image-plus-panel-below: the photo fills
                    the whole card and everything the card needs to say floats over it in a
                    single glass strip, the same "profile card" read the design was asked to
                    match. Price, features and tech stack aren't gone — they're one tap away
                    in the full preview this card opens, so nothing is actually lost. */}
                <div
                  style={{ pointerEvents: isActive ? 'auto' : 'none' }}
                  onClick={() => {
                    if (onOpenStandalonePreview) {
                      onOpenStandalonePreview(template);
                    } else {
                      setPreviewTemplate(template);
                    }
                    cosmicAudio.playPing();
                  }}
                  className="relative h-full rounded-[28px] bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/30 transition-colors duration-300 cursor-pointer group shadow-2xl p-2 sm:p-2.5"
                >
                  {/* The photo sits inset inside the frame's own padding — a bezel margin all
                      round, like a phone case holding its screen — rather than bleeding to
                      the card's own edges the way it did before. */}
                  <div className="relative w-full h-full rounded-[20px] overflow-hidden">
                    <img
                      src={template.previewImage}
                      alt={displayTitle}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/40" />

                    {/* Category badge */}
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 max-w-[75%] truncate px-2.5 py-1 sm:px-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] sm:text-[11px] font-bold">
                      {displayCategory}
                    </div>

                    {/* Bottom glass panel — name, one-line pitch and the single action this
                        card needs, mirroring the reference's name + tagline + one button. */}
                    <div className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4 p-3.5 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-xl">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-white font-bold text-base sm:text-lg line-clamp-1">{displayTitle}</h3>
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                      </div>
                      <p className="text-zinc-300 text-[11px] sm:text-xs leading-relaxed line-clamp-2 mt-1">
                        {displaySubtitle}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-3">
                        <div className="flex items-center gap-3 text-[10px] sm:text-[11px] text-zinc-300 font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                            {template.deliveryWeeks} {translateText('أسابيع', currentLang)}
                          </span>
                          <span className="font-mono font-bold text-white">
                            {formatPrice(template.basePriceIQD, currentLang, currency)}
                          </span>
                        </div>

                        {/* Wears the toolbar's Filter pill outright (.filter-pill-btn +
                            .filter-pill-beam): same bevelled white surface, same inversion to
                            black on hover, same undulating beam every other primary action on
                            this page carries. Stops the click from bubbling to the card's own
                            onClick above it, since the two now sit nested. */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTemplateForContract(template);
                            cosmicAudio.playWarp();
                          }}
                          className="filter-pill-btn relative shrink-0 px-3.5 py-2 rounded-full text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="filter-pill-beam" aria-hidden="true" />
                          <FileSignature className="w-3.5 h-3.5 text-current shrink-0" />
                          <span>{getTranslation('selectForContract', currentLang)}</span>
                        </button>
                      </div>
                    </div>
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
            className="filter-pill-btn relative hidden sm:flex shrink-0 w-10 h-10 rounded-full items-center justify-center cursor-pointer"
          >
            <span className="filter-pill-beam" aria-hidden="true" />
            <ChevronLeft className="w-4 h-4 ltr:rotate-180 text-current" />
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

