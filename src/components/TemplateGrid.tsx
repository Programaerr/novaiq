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
  ChevronDown,
  Info
} from 'lucide-react';
import { cosmicAudio } from '../lib/audio';
import { Language, getTranslation, translateText } from '../lib/i18n';
import { formatPrice, Currency } from '../lib/currency';
import { INK, PERIWINKLE } from '../lib/homePalette';
import { hueFor, washFor } from '../lib/templateHues';
import { GlowLight, TemplateGlow } from './TemplateGlow';
import { BookFold } from './BookFold';
import { PageLoader } from './PageLoader';
import { TemplateFilterPanel } from './TemplateFilterPanel';

// The interactive sandbox is the single largest component in the app (per-template demo logic
// for all 10 templates). Loading it only when a customer actually opens a preview keeps it out
// of the initial "Templates" page bundle entirely, which matters most on weak/low-end devices.
const TemplateInteractiveSandbox = lazy(() =>
  import('./TemplateInteractiveSandbox').then((m) => ({ default: m.TemplateInteractiveSandbox }))
);

// ── The board ──────────────────────────────────────────────────────────────────────────────
//
// Every template is on screen at once, in a grid whose squares are offset against each other like
// a chessboard: a square is dropped by half a step when its column and its row have different
// parities, exactly the rule that makes a board's dark squares dark.
//
// It replaced a focus carousel — a row of five with the middle one at full size and its neighbours
// turned and dimmed. That row could only ever show one template properly and hid the other ten
// behind a drag; a board shows all eleven at their real size and the visitor picks. The drag, the
// pager and the auto-advance went with it, because all three existed only to move a window that
// no longer exists.
const STAGGER = 88;

// The card's two heights.
//
// SHUT it is the picture and nothing else — image, name, one action across the bottom of it.
// OPEN, the body falls down out of the picture's lower edge and the card is a page. Both are
// written here rather than as classes because the height in between them is arithmetic, not a
// breakpoint: it is HEADER + BODY x (how far the page has fallen), computed in one calc() off a
// custom property, so the card's height and the page turning into it are the same number.
const HEADER_H_DESKTOP = 250;
const HEADER_H_MOBILE = 210;
const BODY_H_DESKTOP = 360;
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

  /* ── The board's shape ─────────────────────────────────────────────────────────────────
     One column on a phone, two from 640, three from 1024. Read here rather than left to CSS
     because the chessboard offset needs to know which column a card is in, and a grid does not
     tell its children that. */
  const [cols, setCols] = useState(1);
  useEffect(() => {
    const two = window.matchMedia('(min-width: 640px)');
    const three = window.matchMedia('(min-width: 1024px)');
    const read = () => setCols(three.matches ? 3 : two.matches ? 2 : 1);
    read();
    two.addEventListener('change', read);
    three.addEventListener('change', read);
    return () => {
      two.removeEventListener('change', read);
      three.removeEventListener('change', read);
    };
  }, []);

  const isMobile = cols === 1;
  const headerH = isMobile ? HEADER_H_MOBILE : HEADER_H_DESKTOP;
  const bodyH = isMobile ? BODY_H_MOBILE : BODY_H_DESKTOP;

  /**
   * The chessboard drop for the square at this index.
   *
   * Column parity alone gives a zigzag — every other COLUMN sits low, and the same three shapes
   * repeat down the page. Adding the row is what makes it a board: a square is dropped when its
   * column and its row disagree, so each row is the inverse of the one above it and the low squares
   * interlock with the high ones instead of stacking into stripes.
   *
   * Zero at one column, where there is nothing to interlock with and the offset would only be a gap
   * at the top of every other card.
   */
  const offsetFor = (index: number) =>
    cols > 1 && (((index % cols) + Math.floor(index / cols)) % 2 === 1) ? STAGGER : 0;

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
  const [foldBox, setFoldBox] = useState<{ top: number; left: number; width: number } | null>(null);

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

    // The page's box, taken now, before a pixel has moved.
    const card = foldingCardRef.current;
    const grid = gridRef.current;
    if (card && grid) {
      const c = card.getBoundingClientRect();
      const g = grid.getBoundingClientRect();
      setFoldBox({ top: c.top - g.top + headerH, left: c.left - g.left, width: c.width });
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
  }, [foldingId, expandedId, reduced, headerH]);

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

  // Points the way the page reads. In Arabic "onward" is leftward, and an arrow that ignores
  // that is an arrow pointing back out of the card it is inviting you into.
  const Forward = currentLang === 'ar' ? ChevronLeft : ChevronRight;

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

        {/* Templates coverflow — clicking any off-centre card brings it to
            focus (same "click to bring to front" idea as a music-app cover carousel) instead
            of firing its buttons; only the centred card is actually interactive, enforced via
            the pointerEvents toggle below rather than guessing which inner element was
            clicked. */}
        {/* The two arrows that used to flank the track live in the pager below it now — see
            the note there. Nothing else was in this row, so it is just the track. */}
        {/* ── The row ────────────────────────────────────────────────────────────────────
            Two layers, and they cannot be one element: the light has to SPILL past the bottom of
            the cards onto the ground under them, and the track has to CLIP its own row so the
            outermost cards run off both edges. Overflow cannot be visible and hidden at once. */}
        <div className="relative mt-8 sm:mt-10">
          {/* Reaches past the row at top and bottom, because a pool that stopped exactly where
              the cards do would be a rectangle of light with a straight edge — which is the one
              thing light does not have. */}
          <div
            style={{ height: trackOpen + GLOW_BLEED }}
            className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none"
          >
            <TemplateGlow lights={glowLights} ground={PERIWINKLE} />
          </div>

          <div className="relative flex items-center justify-center">
          <div
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            onClickCapture={(e) => {
              // Swallow the single, purely synthetic click that follows a real drag's release
              // (see suppressClickRef). Capture phase + stopPropagation so neither the card's
              // "center me" handler nor its "open preview" handler ever sees it. A genuine tap
              // leaves suppressClickRef false (no movement) and sails through untouched.
              if (suppressClickRef.current) {
                e.preventDefault();
                e.stopPropagation();
                suppressClickRef.current = false;
              }
            }}
            style={{ height: `calc(${trackShut}px + ${bodyH}px * var(--nq-track, 0))` }}
            // Sized to hold a card at full stretch plus the chevron under it, and fixed there. No
            // perspective on this element: the row itself is flat, and the one thing on the page
            // that does need a camera brings its own (see BookFold).
            className="relative w-full max-w-7xl overflow-hidden touch-pan-y cursor-grab active:cursor-grabbing select-none"
          >
            {/* The page, over the cards rather than behind them — it is falling ONTO the body
                panel, so it has to be in front of it. Inside the track, so it shares the track's
                pixel grid and can be told where the hinge is in the same numbers the ladder above
                lays the cards out in, without measuring anything. */}
            {/* The page's box, laid exactly over the area the body panel will occupy — hinged
                along the bottom edge of the picture, the width of the card, the height of the
                panel, plus slack on three sides for the bow. Positioned in DOM terms, so the
                canvas inside it needs no idea where anything else on the page is. */}
            <div
              style={{
                top: headerH - PAGE_MARGIN,
                height: bodyH + PAGE_MARGIN * 2,
                width: (isMobile ? 260 : 330) + PAGE_MARGIN * 2,
              }}
              className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none"
            >
              <BookFold margin={PAGE_MARGIN} progressRef={foldRef} onReady={onFoldReady} />
            </div>
          {/* Drag layer — one translate carrying the whole rack past a fixed camera. The cards
              keep their own angles through the gesture and the rack slides bodily, which is
              what a coverflow does: the viewer is panning along a shelf, not turning it. It
              also keeps the gesture to a single composited transform instead of recomputing
              five cards' angles from a fractional position every frame. Suppressed mid-gesture
              so the rack tracks the pointer 1:1, then glides home on release with the cards'
              own 0.9s curve. */}
          <div
            className="absolute inset-0"
            style={{
              transform: 'translateX(var(--drag-x, 0px))',
              transition: isDragging ? 'none' : 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
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
            // No --drag-x term in either branch: the drag translates the whole strip on the
            // layer above, so a card's place within the rack never changes mid-gesture.
            // Sign split out from magnitude, because the ladder is indexed by distance while
            // every term has to mirror about the middle: step out to the side, then drop onto
            // the shared baseline. Two translations and nothing else — the scale that goes with
            // them lives one level in, so it can keep its own transition while this one is
            // switched off mid-drag (see the note there).
            const dir = Math.sign(clampedOffset);
            const d = Math.min(Math.abs(clampedOffset), 3);
            // translateX(-50%) and NOT translate(-50%, -50%). The card hung from `top: 50%` in the
            // centred layout this grew out of, and the second half of that translate was what put
            // its middle on the line. It hangs from `top: 0` now, and the leftover -50% was
            // lifting every card by half its own height — which is invisible while all the cards
            // are the same height and immediately obvious the moment one of them grows, because
            // it lifts by half of whatever it has just become.
            const transform =
              `translateX(-50%) translateX(${dir * focusX[d]}px) translateY(${dropFor(d)}px)`;
            const wash = washFor(template.category);

            const displayDescription = translateText(template.description, currentLang);
            const displayLong = translateText(template.longDescription, currentLang);

            return (
              <div
                key={template.id}
                onClick={() => {
                  if (!isActive) setActiveIndex(index);
                }}
                style={{
                  transform,
                  willChange: isMoving ? 'transform, opacity' : undefined,
                  opacity: FOCUS_OPACITY[cappedDistance],
                  zIndex: 10 - cappedDistance,
                  transition: isDragging
                    ? 'opacity 0.3s ease'
                    : 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease',
                  pointerEvents: isVisible ? undefined : 'none',
                }}
                className={`absolute top-0 left-1/2 w-[260px] sm:w-[330px] ${
                  isActive ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                {/* Scale one level in from the position, so it can keep its own transition while
                    that one is switched off mid-drag. About the TOP edge, which is what puts every
                    card in the row on one top line and leaves the bottom free to grow. */}
                <div
                  style={{
                    transform: `scale(${FOCUS_SCALE[cappedDistance]})`,
                    transformOrigin: '50% 0',
                    willChange: isMoving ? 'transform' : undefined,
                    transition: 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  <article
                    ref={
                      isActive
                        ? (el) => {
                            activeCardRef.current = el;
                            // The properties are written by an rAF loop that has no idea a
                            // different element just became the active card, so they are seeded
                            // here — otherwise the card that takes the middle inherits nothing and
                            // renders at its default shut height for one frame regardless of what
                            // the fold is actually at.
                            if (el) {
                              el.style.setProperty(
                                '--nq-fold',
                                String(Math.sin((foldRef.current * Math.PI) / 2)),
                              );
                              el.style.setProperty('--nq-open', String(foldRef.current));
                            }
                          }
                        : undefined
                    }
                    style={{
                      // The card's height IS the fold. HEADER is always there; BODY arrives in
                      // proportion to how much of the page is currently projected onto the screen,
                      // which is what --nq-fold holds. The page falling and the card growing are
                      // therefore not two animations that have to be kept in step — they are one
                      // number read twice.
                      height: `calc(${headerH}px + ${bodyH}px * var(--nq-fold, 0))`,
                      pointerEvents: isActive ? 'auto' : 'none',
                      boxShadow: isActive
                        ? '0 32px 64px -28px rgba(8, 10, 26, 0.62)'
                        : '0 18px 44px -26px rgba(8, 10, 26, 0.45)',
                      transition: 'box-shadow 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
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
                      // Safari drops border-radius clipping on an element under a transformed
                      // ancestor. A mask-image forces it onto the path that works; both stops the
                      // same white so the mask itself does nothing but exist.
                      // eslint-disable-next-line
                    >
                      <img
                        src={template.previewImage}
                        alt={displayTitle}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      {/* The scrim, in the category's own colour. Solid where the name sits and
                          gone by half way up, so the photograph is a photograph and the colour is
                          still the thing that says which kind of template this is. */}
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
                          tabIndex={isActive ? 0 : -1}
                          aria-hidden={isActive ? undefined : true}
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

                    {/* ── The page, once it has fallen ─────────────────────────────────────────
                        Held at nothing until the fold is all but finished, then brought up across
                        the last of it — which is the same window the paper above is fading out
                        over, so one becomes the other instead of the two overlapping. */}
                    <div
                      style={{
                        top: headerH,
                        height: bodyH,
                        color: INK,
                        opacity: 'clamp(0, calc((var(--nq-open, 0) - 0.86) / 0.14), 1)',
                      }}
                      // overflow-hidden as a floor, not as the plan. The heights above are sized
                      // to the content and the clamps below keep it there, but a translation is a
                      // string somebody else writes: this is what guarantees a long one is cut off
                      // rather than spilling out through the bottom of the card.
                      className="absolute inset-x-0 px-4 sm:px-5 py-4 flex flex-col overflow-hidden"
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
                        {/* Three equal columns put the price — the only value here that can run
                            to eleven characters — in the same width as a one-digit week count, and
                            it came out as "...00,000". A flex row with the price on flex-1 gives
                            the long one the slack and the two short ones exactly what they need. */}
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
                                  s.grow
                                    ? 'text-[0.74rem] sm:text-[0.8rem]'
                                    : 'text-[0.82rem] sm:text-[0.9rem]'
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
                      Only on the card in focus: the others cannot be opened — clicking one brings
                      it to the middle instead — and a control that does nothing is worse than no
                      control at all. */}
                  {isActive && (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpanded((v) => !v);
                          cosmicAudio.playPing();
                        }}
                        aria-expanded={expanded}
                        aria-label={
                          expanded
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
                          className={`w-5 h-5 transition-transform duration-500 ${
                            expanded ? 'rotate-180' : ''
                          }`}
                          strokeWidth={2.4}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
          </div>
          </div>
        </div>

        {/* Pager — arrows flanking a run of page numbers, in one pill. Replaces the row of
            dots this used to be: ten identical dots said which slot was active but not which
            template, and gave no way to tell how far along the catalogue you were. Numbers
            carry both. The two arrows moved in here from either side of the carousel, so the
            whole control reads as one object rather than three scattered ones. */}
        {filteredTemplates.length > 1 && (() => {
          // A window of at most five numbers that slides with the active card, rather than
          // every number at once — ten of them would make the pill wider than the card it
          // sits under. Clamped at both ends so the window stays full near the start/end
          // instead of shrinking, which would make the pill visibly change width.
          const total = filteredTemplates.length;
          const windowSize = Math.min(5, total);
          const start = Math.max(0, Math.min(activeIndex - Math.floor(windowSize / 2), total - windowSize));
          const pages = Array.from({ length: windowSize }, (_, k) => start + k);

          return (
            // Sits midway between the lowest card and the wordmark below, which needs a
            // different margin per breakpoint rather than one value: the track is a fixed
            // height and the cards do not fill it the same way at both sizes — desktop's arc
            // dips the outer cards nearly to the track's bottom edge, while mobile's flat
            // row leaves them centred with real space underneath. One margin therefore lands
            // the pager tight to the cards on desktop and marooned below them on mobile,
            // which is what it was doing.
            <div className="relative z-10 flex items-center justify-center gap-1.5 mt-7 sm:mt-6">
              {/* dir="ltr" on the whole pill, in both languages. The page is right-to-left, so
                  this flex row inherited that and laid the numbers out 5 4 3 2 1 while putting
                  the first-written button on the right — correct for Arabic *text*, but these
                  are numerals, and a numeric sequence reads left-to-right in every language.
                  Pinning the direction here fixes the ordering and, just as importantly, makes
                  written order equal visual order: the previous arrow is written first and is
                  therefore ALWAYS the left-hand one, in Arabic and English alike.
                  That is what the earlier `ltr:rotate-180` on each chevron was trying to paper
                  over, and could not: it flipped the glyphs for English but not the flex order,
                  so the English build ended up with a left arrow that advanced and a right one
                  that went back — the exact opposite of what it should be. With direction fixed
                  here, each chevron simply points the way its button goes and no per-language
                  rotation is needed at all. */}
              <div dir="ltr" className="flex items-center gap-1 p-1 rounded-full bg-zinc-950/80 border border-zinc-800">
                {/* Both arrows wear the toolbar's Filter pill (.filter-pill-btn +
                    .filter-pill-beam), same as every other primary control on this page:
                    white surface, inverting to black on hover, with the rotating beam. The
                    chevrons take text-current so they flip with the body rather than staying
                    white on a white circle. */}
                <button
                  type="button"
                  onClick={() => goToOffset(-1)}
                  aria-label={currentLang === 'ar' ? 'السابق' : 'Previous'}
                  className="filter-pill-btn relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                >
                  <span className="filter-pill-beam" aria-hidden="true" />
                  <ChevronLeft className="w-4 h-4 text-current" />
                </button>

                <div className="flex items-center gap-0.5 px-1.5">
                  {pages.map((i) => (
                    <button
                      key={filteredTemplates[i].id}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      aria-label={translateText(filteredTemplates[i].title, currentLang)}
                      aria-current={i === activeIndex ? 'true' : undefined}
                      // Fixed width per number so the row never reflows as the active one
                      // goes bold, or as the window slides from single into double digits.
                      className={`w-6 text-center text-xs font-mono cursor-pointer transition-colors ${
                        i === activeIndex ? 'text-white font-bold' : 'text-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {/* Always the right-hand arrow, in either language — see the note on the pill
                    above for why written order is visual order here. */}
                <button
                  type="button"
                  onClick={() => goToOffset(1)}
                  aria-label={currentLang === 'ar' ? 'التالي' : 'Next'}
                  className="filter-pill-btn relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                >
                  <span className="filter-pill-beam" aria-hidden="true" />
                  <ChevronRight className="w-4 h-4 text-current" />
                </button>
              </div>
            </div>
          );
        })()}

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

