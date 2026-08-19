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
  ChevronDown,
  Info
} from 'lucide-react';
import { cosmicAudio } from '../lib/audio';
import { Language, getTranslation, translateText } from '../lib/i18n';
import { formatPrice, Currency } from '../lib/currency';
import { INK, PERIWINKLE } from '../lib/homePalette';
import { hueFor, washFor } from '../lib/templateHues';
import { BookFold } from './BookFold';
import { PageLoader } from './PageLoader';
import { TemplateFilterPanel } from './TemplateFilterPanel';

// The interactive sandbox is the single largest component in the app (per-template demo logic
// for all 10 templates). Loading it only when a customer actually opens a preview keeps it out
// of the initial "Templates" page bundle entirely, which matters most on weak/low-end devices.
const TemplateInteractiveSandbox = lazy(() =>
  import('./TemplateInteractiveSandbox').then((m) => ({ default: m.TemplateInteractiveSandbox }))
);

// ── The menu ───────────────────────────────────────────────────────────────────────────────
//
// One template per line, down a single column: a thumbnail, the name, what it costs, and the one
// action — then the details fold down underneath when the line is opened. A menu.
//
// It has been three shapes now and each one lost something the next got back. A focus carousel
// showed one template properly and hid ten behind a drag. A chessboard grid showed all eleven, and
// paid for it in width: three columns of 387px meant every name was truncated and every subtitle
// clipped to one line, on a page whose container is 1216px wide. A menu spends that width the way
// a list does — the picture stays small and fixed and the WORDS get the rest — so nothing is cut
// off, and eleven lines scan in the time three rows of cards take to read.
//
// The line's height when it is shut. The picture is as tall as the line and the text sits beside
// it, so this is the one number that sets the whole rhythm of the column.
const ROW_H_DESKTOP = 168;
const ROW_H_MOBILE = 150;

// How wide the picture is. Fixed, not a fraction: the point of the shape is that the words get
// every pixel the picture does not need.
const THUMB_W_DESKTOP = 244;
const THUMB_W_MOBILE = 116;
// Only a fallback, and the canvas's size before the first measurement. The body's real height is
// whatever its content comes to, measured per line and written back as --nq-body: eleven templates
// whose descriptions run from two lines to six were all being given the same panel, so the short
// ones ended in a hand's width of empty white and the long ones were clamped when they did not have
// to be. A line that opens into a page should be as tall as its page.
const BODY_H_DESKTOP = 240;
const BODY_H_MOBILE = 330;

// How long the page takes to fall. Slower than the 150-300ms a state change normally gets,
// deliberately: this is not a control changing state, it is an object moving through space, and
// the eye reads the arc rather than the endpoints. Short enough that it never feels like waiting.
const FOLD_MS = 720;

// The same travel, for a card that is shutting because a DIFFERENT one was opened. It gets a plain
// CSS height transition rather than the paper: the paper belongs to the card that was clicked, and
// two pages turning in opposite corners of the board at once is not a book, it is a poltergeist.
const SHUT_MS = 620;

// Slack around the folding page, on every side. See BookFold: the page bows toward the viewer and
// perspective turns that into magnification, so the canvas has to be bigger than the page or the
// bulge is clipped exactly when it is at its largest.
const PAGE_MARGIN = 56;

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

  // One breakpoint, and only because the line is a different size on a phone. There is no column
  // count to track any more — a menu is one column at every width, which is most of why it fits
  // a narrow screen without needing a second layout.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const read = () => setIsMobile(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  const rowH = isMobile ? ROW_H_MOBILE : ROW_H_DESKTOP;
  const thumbW = isMobile ? THUMB_W_MOBILE : THUMB_W_DESKTOP;
  const bodyH = isMobile ? BODY_H_MOBILE : BODY_H_DESKTOP;

  /* ── Opening ───────────────────────────────────────────────────────────────────────────
     One card open at a time. `expandedId` is which one; `foldingId` is which one the paper is
     currently turning for, and they are not the same question — opening B while A is open leaves
     A shutting and B opening in the same moment, and only one of them is the card that was
     clicked. The clicked one gets the page; the other just shuts. */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [foldingId, setFoldingId] = useState<string | null>(null);

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const foldingCardRef = useRef<HTMLElement | null>(null);
  const foldRef = useRef(0);
  // The canvas's own request-a-frame, handed up once it exists. See BookFold's onReady.
  const foldInvalidate = useRef<(() => void) | null>(null);
  const onFoldReady = React.useCallback((fn: () => void) => {
    foldInvalidate.current = fn;
  }, []);

  /* Where on the board the page is drawn: the folding card's body, in the grid's own pixels.
     Measured once when a fold begins rather than followed every frame, and that is safe for a
     reason worth writing down — the card grows DOWNWARD, so its own top edge does not move, and
     only the rows BELOW it are pushed. The one thing the page needs to know therefore holds still
     for the whole animation. */
  const [foldBox, setFoldBox] = useState<
    { top: number; left: number; width: number; height: number } | null
  >(null);

  /* Each card's body, measured and written back to the card as --nq-body.
     Read from the DOM rather than kept in state: it is one number per card that only ever feeds a
     CSS property, and routing eleven of them through React would re-render the whole board every
     time a font finished loading. The body is absolutely positioned, so measuring it costs nothing
     in layout and its natural height is available whether the card is open or shut. */
  const measureBodies = React.useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    for (const art of Array.from(grid.querySelectorAll('article'))) {
      const body = art.querySelector<HTMLElement>('[data-body]');
      if (body) (art as HTMLElement).style.setProperty('--nq-body', Math.ceil(body.scrollHeight) + 'px');
    }
  }, []);

  // When the text changes — not on every render. Reading scrollHeight on eleven elements forces a
  // layout each time, and running it unconditionally meant every state change on this screen paid
  // for one: opening a card sets two pieces of state, so a click that was supposed to start an
  // animation began by reflowing the whole board twice.
  // Keyed on the filter inputs rather than on filteredTemplates itself: the list is derived further
  // down the component and cannot be named up here, and its inputs change at exactly the same
  // moments it does.
  useLayoutEffect(measureBodies, [
    measureBodies,
    selectedCategory,
    maxPriceUSD,
    sortBy,
    searchQuery,
    currentLang,
    currency,
    isMobile,
  ]);

  // And on resize, because the height of a paragraph depends on the width it is set in.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const ro = new ResizeObserver(measureBodies);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [measureBodies]);

  const writeFold = (p: number) => {
    foldRef.current = p;
    const el = foldingCardRef.current;
    if (el) {
      // The projected fraction: the cosine of the angle the page still has to fall through, which
      // is exactly the card's height. --nq-open is the raw progress, which the content's own
      // fade-in is timed against.
      el.style.setProperty('--nq-fold', String(Math.sin((p * Math.PI) / 2)));
      el.style.setProperty('--nq-open', String(p));
    }
    // And one frame of paper to go with the pixels the DOM just moved.
    foldInvalidate.current?.();
  };

  /* The fold, and why an rAF loop rather than a CSS transition or the render loop of the canvas
     that draws the page.

     Not CSS, because two things have to move off ONE number — the card's height and the page
     falling into it — and the page lives in a WebGL scene that cannot read a CSS transition's
     interpolated value.

     Not the canvas either, and that is the important half: the card has to open on a machine with
     no working GL context just as well as on one with. So the number lives here, in ordinary
     JavaScript, written out to the DOM as two custom properties and handed to the canvas as a ref.
     Lose the canvas and the card still opens; it simply opens without the paper. */
  useLayoutEffect(() => {
    if (!foldingId) return;
    const to = expandedId === foldingId ? 1 : 0;
    const from = foldRef.current;

    // Found by id rather than held by a ref callback. A callback whose identity changes every
    // render is detached with null and re-attached on every commit, and `foldingId` changing is
    // exactly such a commit — so the one moment the element is needed is the one moment a callback
    // ref is most likely to be holding null.
    foldingCardRef.current = document.getElementById('tpl-card-' + foldingId);

    // The page's box, taken now, before a pixel has moved.
    const card = foldingCardRef.current;
    const grid = gridRef.current;
    if (card && grid) {
      const c = card.getBoundingClientRect();
      const g = grid.getBoundingClientRect();
      const body = card.querySelector<HTMLElement>('[data-body]');
      setFoldBox({
        top: c.top - g.top + rowH,
        left: c.left - g.left,
        width: c.width,
        height: body ? Math.ceil(body.scrollHeight) : bodyH,
      });
    }

    if (from === to || reduced) {
      writeFold(to);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / FOLD_MS);
      // Ease-out on the ANGLE, not on the height, and only gently.
      //
      // The height is already an ease-out before anything is applied to it: it is the cosine of the
      // remaining angle, so a page falling at a CONSTANT rate still arrives slowing down. A cubic on
      // top of that was measured at 96% of full height by 300ms of a 720ms fall — the card had
      // effectively finished while the page was still visibly turning. Quadratic leaves the two
      // reading as one motion.
      const e = 1 - Math.pow(1 - k, 2);
      writeFold(from + (to - from) * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foldingId, expandedId, reduced, rowH, bodyH]);

  const toggle = (id: string) => {
    setFoldingId(id);
    // The clicked card is the one the paper turns for, so the progress it starts from is the
    // progress THAT card is at — which is 0 unless it is the one already open.
    foldRef.current = expandedId === id ? 1 : 0;
    setExpandedId((cur) => (cur === id ? null : id));
    cosmicAudio.playPing();
  };

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

  // A filter, a search or a sort that changes the result set shuts whatever was open: the card
  // under an open panel may not even be in the list any more.
  useEffect(() => {
    setExpandedId(null);
    setFoldingId(null);
    foldRef.current = 0;
  }, [selectedCategory, maxPriceUSD, sortBy, searchQuery]);

  // Opening a standalone preview unmounts this whole component (App swaps the tree out), so
  // coming back would otherwise drop the visitor at the top of the board rather than beside the
  // card they were just looking at. Claims the position once, so changing a filter afterwards
  // does not yank them back here.
  const didRestoreFocus = useRef(false);
  useEffect(() => {
    if (didRestoreFocus.current || !focusTemplateId) return;
    if (!filteredTemplates.some((x) => x.id === focusTemplateId)) return;
    didRestoreFocus.current = true;
    const el = document.getElementById('tpl-card-' + focusTemplateId);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focusTemplateId, filteredTemplates]);

  return (
    <section
      id="templates-section"
      style={{
        background: PERIWINKLE,
        /* Pull the whole section up behind the floating navbar, exactly as the hero and the
           timeline do — so the blue reaches the top of the viewport instead of leaving the
           body's black visible between the navbar and the section. The navbar is fixed and
           floats above the page; without this the section would look like a blue panel sitting
           on a black page rather than a full-bleed surface the navbar sits on. */
        marginTop: 'calc(-1 * (var(--nav-bottom, 74px) + var(--content-gap, 0.75rem)))',
      }}
      className="relative overflow-hidden pt-[calc(var(--nav-bottom,74px)+1rem)] pb-4 sm:pb-6"
    >
      <div className="nq-container">
        
        {/* Filter & Search bar — first thing on the page now, with the price notice below it.
            `relative` anchors the dropdown below it — the dropdown itself is `absolute`, so
            opening it floats a glass panel over the templates instead of pushing them down.
            The explicit `z-40` is what keeps that panel above the coverflow: the cards below
            carry their own z-index (up to 10) and, sitting later in the DOM, would otherwise
            paint straight over a menu whose own stacking order was still `auto`. */}
        <div ref={filterBarRef} className="sticky top-3 sm:top-3 z-40 mb-4">
          {/* bg-white/5 + backdrop-blur-xl used to leave this bar almost see-through, forcing
              the heaviest (24px) blur tier to do all the work of hiding what's scrolling
              behind it — recomputed every scroll frame, which is exactly the kind of GPU cost
              CosmicBackground's own glow comment warns about. Navbar's pill and PageBackBar
              solve the identical "glass bar sitting over scrolling content" problem with a
              static .glass-bar material: a translucent near-black fill with a catch-light and
              inner glow, painted once and never invalidated during scroll — same frosted look,
              zero per-frame recompute. reusing that proven combo here instead of a bespoke
              one. */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4">
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
                as someone is typing in it, not just while the cursor rests on it).
                Everything inside it inverted along with the surface (see .search-cosmic): the
                body went from a pale soft-UI sheet to a lit near-black one, and dark-on-pale
                text left where it was would simply have gone invisible. The white beam
                replaces the --dark variant for the same reason in reverse. */}
            <div className="search-cosmic relative w-full sm:w-72 sm:ms-auto rounded-full">
              <span className="nq-btn-beam" aria-hidden="true" />
              <Search className="w-4 h-4 text-zinc-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getTranslation('searchPlaceholder', currentLang)}
                // placeholder-zinc-400, not the zinc-500 this used to carry: against the new
                // near-black body zinc-500 measures 4.0:1, under the 4.5:1 floor — the same
                // trap the back bar's title fell into. zinc-400 measures 7.4:1.
                className="w-full pr-11 pl-4 py-2 rounded-full bg-transparent border-none focus:outline-none text-zinc-100 text-xs sm:text-sm font-semibold placeholder-zinc-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
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

        {/* ── The board ──────────────────────────────────────────────────────────────────
            Every template at once, offset like a chessboard. `items-start` matters: a grid row
            stretches its children to the tallest one by default, so without it opening one card
            would stretch its whole row to match and the shut cards beside it would grow a blank
            white panel each. */}
        <div ref={gridRef} className="relative mt-8 sm:mt-10">
          {/* The page's box, laid exactly over the body panel of whichever card is folding.

              Mounted from the first render, not on the first fold. Gating it on foldBox looked like
              free economy — a board nobody opens pays for no GL context — and it moved the cost of
              creating that context to the worst possible moment: the first click. Measured as a
              41.7ms frame at the start of the first fold, against a median of 8.3ms. Built during
              the page's own load it is invisible; built mid-animation it is a visible hitch on the
              one interaction this whole screen is for.

              Costs nothing until then: at progress 0 the mesh is not visible, the loop is on demand,
              and nothing asks it for a frame. */}
          <div
            style={{
              top: (foldBox?.top ?? 0) - PAGE_MARGIN,
              left: (foldBox?.left ?? 0) - PAGE_MARGIN,
              width: (foldBox?.width ?? 320) + PAGE_MARGIN * 2,
              height: (foldBox?.height ?? bodyH) + PAGE_MARGIN * 2,
            }}
            className="absolute z-20 pointer-events-none"
          >
            <BookFold margin={PAGE_MARGIN} progressRef={foldRef} onReady={onFoldReady} />
          </div>

          <div className="grid items-start gap-x-6 gap-y-8 sm:gap-x-7 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template, index) => {
              const displayTitle = translateText(template.title, currentLang);
              const displaySubtitle = translateText(template.subtitle, currentLang);
              const displayCategory = translateText(template.categoryLabel, currentLang);
              const displayDescription = translateText(template.description, currentLang);
              const displayLong = translateText(template.longDescription, currentLang);
              const wash = washFor(template.category);
              const isOpen = expandedId === template.id;
              const isFolding = foldingId === template.id;

              return (
                <div key={template.id} style={{ marginTop: offsetFor(index) }}>
                  <article
                    id={'tpl-card-' + template.id}
                    style={{
                      // The card's height IS the fold. HEADER is always there; BODY arrives in
                      // proportion to how much of the page is currently projected onto the screen,
                      // which is what --nq-fold holds. The page falling and the card growing are
                      // therefore not two animations that have to be kept in step — they are one
                      // number read twice.
                      height: `calc(${headerH}px + var(--nq-body, ${bodyH}px) * var(--nq-fold, 0))`,
                      // Two ways in, and a card is only ever on one of them. The card the paper is
                      // turning for is driven frame by frame from the loop above, so it must NOT
                      // also carry a height transition — the transition would chase each written
                      // value and lag a whole animation behind. Every other card is told where it
                      // belongs and eases there itself, which is how a card that is shutting
                      // because a different one was opened gets its motion.
                      ...(isFolding
                        ? null
                        : {
                            ['--nq-fold' as string]: isOpen ? 1 : 0,
                            ['--nq-open' as string]: isOpen ? 1 : 0,
                          }),
                      transition: isFolding
                        ? 'box-shadow 0.4s ease'
                        : `height ${SHUT_MS}ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease`,
                      // Cast in the ink the wash is pulled toward rather than in black — a neutral
                      // shadow under a coloured card on a blue ground is the tell that it came from
                      // a palette instead of from the surface it falls on. The open card is lifted
                      // further, which is the only thing on the board saying which one is open once
                      // you have scrolled its body past the fold.
                      boxShadow: isOpen
                        ? '0 32px 64px -28px rgba(8, 10, 26, 0.62)'
                        : '0 16px 40px -24px rgba(8, 10, 26, 0.45)',
                    }}
                    className="relative w-full rounded-[26px] overflow-hidden bg-white"
                  >
                    {/* ── The picture, and everything the card says when it is shut ─────────── */}
                    <div
                      style={{ height: headerH }}
                      onClick={() => {
                        if (onOpenStandalonePreview) onOpenStandalonePreview(template);
                        else setPreviewTemplate(template);
                        cosmicAudio.playPing();
                      }}
                      className="absolute inset-x-0 top-0 overflow-hidden cursor-pointer group"
                    >
                      <img
                        src={template.previewImage}
                        alt={displayTitle}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      {/* The wash — the card's own colour, poured up the photograph. Solid where
                          the name sits and gone by three quarters of the way up, so the picture is
                          a picture and the colour is still what says which kind of template it is. */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(to top, ${wash} 0%, ${wash}E6 30%, ${wash}00 74%)`,
                        }}
                      />

                      <div className="absolute top-3 start-3 max-w-[52%] truncate px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold">
                        {displayCategory}
                      </div>

                      {/* Name on one side, the one action on the other, both on the floor of the
                          picture — the reference's own bottom bar. */}
                      <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 flex items-end gap-3">
                        <div className="min-w-0">
                          <h3 className="text-white font-black text-[0.95rem] sm:text-[1.1rem] leading-tight line-clamp-1">
                            {displayTitle}
                          </h3>
                          <p className="mt-0.5 text-[0.66rem] sm:text-[0.72rem] font-bold text-white/85 line-clamp-1">
                            {displaySubtitle}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTemplateForContract(template);
                            cosmicAudio.playWarp();
                          }}
                          // Filled in the card's own wash rather than in the page's white pill.
                          // Eleven cards each washed a different colour, every one wearing the same
                          // white button, and the colour stops belonging to the card. Contrast is
                          // known rather than hoped for, too: white on this is measured, where
                          // white on a translucent black over an unknown photograph is not.
                          style={{ background: `${wash}F2` }}
                          className="ms-auto shrink-0 min-h-11 px-4 rounded-full text-white text-[0.7rem] sm:text-[0.78rem] font-bold whitespace-nowrap cursor-pointer transition-[filter] duration-200 hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          {getTranslation('selectForContract', currentLang)}
                        </button>
                      </div>
                    </div>

                    {/* ── The page, once it has fallen ───────────────────────────────────────
                        Held at nothing until the fold is all but finished, then brought up across
                        the last of it — the same window the paper above is fading out over, so one
                        becomes the other instead of the two overlapping.

                        overflow-hidden as a floor, not as the plan: the heights are sized to the
                        content and the clamps keep it there, but a translation is a string somebody
                        else writes, and this is what guarantees a long one is cut off rather than
                        spilling out through the bottom of the card. */}
                    <div
                      data-body
                      style={{
                        top: headerH,
                        color: INK,
                        opacity: 'clamp(0, calc((var(--nq-open, 0) - 0.86) / 0.14), 1)',
                      }}
                      className="absolute inset-x-0 px-4 sm:px-5 py-4 flex flex-col"
                    >
                      <h4 className="text-[0.95rem] sm:text-[1.05rem] font-black leading-tight line-clamp-1">
                        {displayTitle}
                      </h4>
                      <p className="mt-0.5 text-[0.68rem] sm:text-[0.72rem] font-bold opacity-70">
                        {displayCategory} · {template.id}
                      </p>

                      <div
                        className="mt-3 pt-3 flex items-start gap-3 border-t"
                        style={{ borderColor: 'rgba(16, 19, 34, 0.14)' }}
                      >
                        {/* Three equal columns put the price — the only value here that can run to
                            eleven characters — in the same width as a one-digit week count, and it
                            came out as "...00,000". A flex row with the price on flex-1 gives the
                            long one the slack and the two short ones exactly what they need. */}
                        <dl className="flex-1 min-w-0 flex items-start gap-2.5">
                          {[
                            {
                              v: String(template.deliveryWeeks),
                              u: currentLang === 'ar' ? 'أسابيع' : 'wks',
                              k: currentLang === 'ar' ? 'التسليم' : 'Delivery',
                              grow: false,
                            },
                            {
                              v: formatPrice(template.basePriceIQD, currentLang, currency),
                              u: '',
                              k: currentLang === 'ar' ? 'السعر' : 'Price',
                              grow: true,
                            },
                            {
                              v: String(template.features.length),
                              u: '',
                              k: currentLang === 'ar' ? 'ميزة' : 'Features',
                              grow: false,
                            },
                          ].map((s) => (
                            <div key={s.k} className={s.grow ? 'flex-1 min-w-0' : 'shrink-0'}>
                              <dd
                                className={`font-black leading-none truncate ${
                                  s.grow ? 'text-[0.74rem] sm:text-[0.8rem]' : 'text-[0.82rem] sm:text-[0.9rem]'
                                }`}
                              >
                                {s.v}
                                {s.u ? <span className="text-[0.62rem] font-bold"> {s.u}</span> : null}
                              </dd>
                              <dt className="mt-1 text-[0.6rem] sm:text-[0.64rem] font-bold opacity-70 truncate">
                                {s.k}
                              </dt>
                            </div>
                          ))}
                        </dl>

                        {/* The reference puts a little map of the route here. The equivalent fact
                            about a template is what it is built out of, so that is what the box
                            holds — three names, which is as many as it fits and as many as anyone
                            reads at this size. */}
                        <div
                          className="shrink-0 w-[76px] sm:w-[84px] rounded-xl px-2 py-1.5 grid gap-0.5"
                          style={{ background: 'rgba(16, 19, 34, 0.06)' }}
                        >
                          {template.techStack.slice(0, 3).map((tech) => (
                            <span
                              key={tech}
                              dir="ltr"
                              className="block truncate text-[0.55rem] sm:text-[0.6rem] font-bold opacity-75 text-center"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="mt-3 text-[0.72rem] sm:text-[0.78rem] font-semibold leading-[1.8] opacity-80 line-clamp-3">
                        {displayDescription}
                      </p>
                      <p className="mt-2 text-[0.72rem] sm:text-[0.78rem] font-semibold leading-[1.8] opacity-65 line-clamp-3 sm:line-clamp-4">
                        {displayLong}
                      </p>
                    </div>
                  </article>

                  {/* The chevron, under the card and outside it, exactly as the reference has it.
                      On every card now — on the board they are all equally reachable, where the
                      row this replaced could only ever open the one in the middle. */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => toggle(template.id)}
                      aria-expanded={isOpen}
                      aria-controls={'tpl-card-' + template.id}
                      aria-label={
                        isOpen
                          ? currentLang === 'ar'
                            ? 'إغلاق التفاصيل'
                            : 'Close details'
                          : currentLang === 'ar'
                            ? 'عرض التفاصيل'
                            : 'Show details'
                      }
                      className="mt-1 w-11 h-11 grid place-items-center rounded-full text-white/90 hover:text-white cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}
                        strokeWidth={2.4}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── The closing stage: the price caveat, lit, with the brand mark under the light ──
            The caveat used to sit above the carousel, under the filter bar. That put a paragraph
            of small print between someone and the thing they came to look at, and it was read
            before there was a single price on screen for it to qualify. Here it is the last word
            on the prices they have just been through, which is when it means something.

            The lighting is CSS gradients inside `.tpl-lightstage` — see index.css. No blur filter
            and nothing animated: it rasterizes once and costs nothing after that. */}
        <div className="tpl-lightstage mt-20 sm:mt-28">
          <span className="tpl-lightstage__spill" aria-hidden="true" />
          <span className="tpl-lightstage__pool" aria-hidden="true" />

          {/* The lamp. White on white type, because this is the thing the light is coming out
              of — a dark pill at the apex of two bright beams reads as a hole punched in them. */}
          <div className="relative z-10 text-center max-w-3xl mx-auto px-4">
            <div className="tpl-lamp inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[11px] font-semibold text-black">
              <Info className="w-3.5 h-3.5 text-black/60 shrink-0" />
              <span>
                {currentLang === 'ar'
                  ? 'السعر المعروض للقالب (التصميم) فقط، ويختلف عند طلب موقع متكامل وجاهز للعمل الفعلي'
                  : 'The price shown is for the template design only — pricing differs for a fully complete, ready-to-launch website'}
              </span>
            </div>
          </div>

          {/* Brand name — the mark's boxy icon is gone; only the wordmark sits in the light,
              scaled to fill the empty stretch between the carousel and the footer. It is the
              thing the cone above it lands on, so it takes the lamp's glow rather than casting
              its own: bright enough to read as the object the light is hitting. Set in the
              site's own typeface (Cairo) and left selectable, so the name reads and copies as
              text rather than as a picture. */}
          <div dir="ltr" className="relative z-10 flex justify-center mt-16 sm:mt-24 mb-8 sm:mb-14 opacity-70">
            <span
              className="font-black tracking-widest text-white font-['Cairo'] text-4xl sm:text-6xl lg:text-7xl"
              style={{ textShadow: '0 0 34px rgba(255,255,255,0.45), 0 0 90px rgba(255,255,255,0.22)' }}
            >
              NOVAIQ
            </span>
          </div>
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

