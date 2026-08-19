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

// Focus-row geometry. Cards stand in a straight line, square to the viewer: the middle one at
// full size, each one beside it stepped out, scaled down, and dropped so the whole row shares a
// baseline. No turn, no recession, no perspective — that was the coverflow rack this replaced,
// and every one of those three is what made the outer cards read as edge-on slivers rather than
// as pictures you could still see.
//
// Given as a ladder by distance-from-centre rather than as a formula, for the same reason the
// rack was: the steps are not uniform. The first neighbour has to clear the centre card with a
// visible gap; the second only has to clear the first; the third is off-frame entirely and is
// purely the parking position for cards cycling out of range.
//
// The X values are solved against the card's own width so that no two cards ever touch. With a
// 330px card:
//     centre   330 wide, half-width 165
//     step 1   284 wide at 0.86, centred 320 out → inner edge 178, a 13px gap
//     step 2   247 wide at 0.75, centred 600 out → inner edge 476, a 14px gap
// Total reach is 724px either side, which is deliberately WIDER than the track. The outermost
// cards are meant to run off both edges — that crop is what says the row continues past the
// frame, and it is why nothing here is scaled to fit: there is nothing to fit.
const FOCUS_X_DESKTOP = [0, 320, 600, 820];
const FOCUS_X_MOBILE = [0, 196, 352, 470];
const FOCUS_SCALE = [1, 0.86, 0.75, 0.7];
// Depth used to do most of the ranking — the side cards were turned and set back, so they read
// as further away on their own. On a flat row there is no depth left to do it, so opacity has to
// carry the whole job and drops harder than the rack's 0.7/0.4 did.
const FOCUS_OPACITY = [1, 0.84, 0.52, 0];

// The card has two heights now, and it is only ever at one of them or on its way between.
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

// The track, at both of the card's heights, plus room under it for the chevron and the shadow.
//
// It grows with the card rather than standing permanently at its open height. Standing tall was
// tried first, on the reasoning that a fixed container never shifts what is below it — and what it
// actually produced was four hundred pixels of empty ground under a shut row, every time, to avoid
// a shift that only happens when somebody deliberately opens something. An accordion moving what is
// under it is not layout shift; it is the accordion.
const TRACK_PAD = 96;
const TRACK_SHUT_DESKTOP = HEADER_H_DESKTOP + TRACK_PAD;
const TRACK_SHUT_MOBILE = HEADER_H_MOBILE + TRACK_PAD;
const TRACK_OPEN_DESKTOP = TRACK_SHUT_DESKTOP + BODY_H_DESKTOP;
const TRACK_OPEN_MOBILE = TRACK_SHUT_MOBILE + BODY_H_MOBILE;

// How long the page takes to fall. Slower than the 150-300ms a state change normally gets,
// deliberately: this is not a control changing state, it is an object moving through space, and
// the eye reads the arc rather than the endpoints. Short enough that it never feels like waiting.
const FOLD_MS = 720;

// How far the light spills below the row. The canvas starts flush with the row's top edge and runs
// this much past its bottom, so the pools have floor to fall on — and, more usefully, so the one
// number that converts a position in the row into a position on the canvas is a constant instead of
// a measurement. Get this wrong and the light sits somewhere the cards are not.
const GLOW_BLEED = 96;

// Slack around the folding page, on every side. See BookFold: the page bows toward the viewer and
// perspective turns that into magnification, so the canvas has to be bigger than the page or the
// bulge is clipped exactly when it is at its largest.
const PAGE_MARGIN = 56;

// The drop each card takes below the row's top edge.
//
// It used to be a compensation: cards scaled about their centres and this added back the half a
// card's height that scaling stole, so the row stood on one baseline. That is gone — the cards
// scale about their TOP edge now (transformOrigin '50% 0'), which lands them on a common top line
// for free, and a common top line is the one the reference uses and the only one an expanding
// card can work with. A card that opens has to grow DOWNWARD; hang the row off its feet and every
// card in it moves every time one is opened.
//
// So this is now only the reference's own rag — the few pixels each step sits lower than the one
// inside it, which is all that is left saying "further back" once the turn and the recession from
// the old rack are gone.
const FOCUS_EXTRA_DROP = [0, 14, 24, 30];

// one card's travel is the first step of the ladder, which is the only spacing a drag can be
// measured against, since the ladder is deliberately not uniform.

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
  // True while the rack is actually moving — a drag, or the glide that follows an index
  // change — and false once it has settled. It exists only to decide when the cards are worth
  // promoting to their own compositor layers.
  //
  // They used to be promoted permanently. That is correct for smoothness and wrong for memory:
  // `will-change` holds a texture allocated for as long as it is set, so ten cards plus ten
  // scale wrappers at 330x480 pinned roughly 13MB of GPU memory for a rack that spends almost
  // all of its life perfectly still. Gating it on something that changes DURING a gesture was
  // tried and was worse than either — layers were built and destroyed on every step commit,
  // and building one forces the card, image and all, to be rasterized synchronously mid-drag.
  // Motion is the right boundary: it flips twice per interaction, never inside one, so the
  // layers exist for exactly as long as they earn their keep and the memory is returned after.
  const [isMoving, setIsMoving] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);
  // Set when a pointerup ends a gesture that actually travelled (a drag, not a tap). The
  // browser then synthesizes a `click` on whatever card the pointer released over — which is
  // frequently the card that just became active after the drag's own commit, and that click
  // fires the card's "open preview" handler and yanks the whole grid away before the rotation
  // has visibly settled. The track's onClickCapture below swallows exactly that one click.
  const suppressClickRef = useRef(false);
  // The live drag offset is published as a CSS variable on the track and read by every
  // card's own transform, rather than held in React state. State would re-render all ten
  // card subtrees on every pointermove — the exact per-frame main-thread work that shows
  // up as stutter on a weak device. One custom property write on one element instead, and
  // the cards' transforms update straight from it.
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef(0);
  // Publishes the gesture offset to the track as one CSS variable, read by the strip's own
  // transform. One variable and one transform now, where the cylinder needed a second angular
  // one: the whole rack now translates past a fixed camera as one rigid strip, which is both
  // cheaper and the honest answer for a coverflow — the viewer pans along a shelf rather than
  // spinning it, so there is no angle to publish.
  //
  // Published raw, one pixel here for one pixel on screen. There used to be a division by a
  // shrink-to-fit scale here, because the rack sat inside a layer that shrank the whole fan to
  // fit narrow tracks; the row this replaced it with is meant to run off both edges instead, so
  // there is no scale between this value and the screen for it to be converted through.
  const setDragOffset = (px: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.setProperty('--drag-x', `${px}px`);
  };

  // The breakpoint picks the ladder's spacing and the card's size — nothing else. There is one
  // geometry now, the same flat row on a phone and on a television, where there used to be two
  // (a perspective rack on desktop and a 2D strip on phones) that had to be kept describing the
  // same carousel. A phone simply gets a narrower step, because a 390px screen cannot hold a
  // 330px card and two 13px gaps and still show its neighbours.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const focusX = isMobile ? FOCUS_X_MOBILE : FOCUS_X_DESKTOP;
  const headerH = isMobile ? HEADER_H_MOBILE : HEADER_H_DESKTOP;
  const bodyH = isMobile ? BODY_H_MOBILE : BODY_H_DESKTOP;
  const trackShut = isMobile ? TRACK_SHUT_MOBILE : TRACK_SHUT_DESKTOP;
  const trackOpen = isMobile ? TRACK_OPEN_MOBILE : TRACK_OPEN_DESKTOP;
  const stepPx = focusX[1];

  /** Where a card at this distance from the centre sits, vertically. See FOCUS_EXTRA_DROP. */
  const dropFor = (d: number) => FOCUS_EXTRA_DROP[d];

  /* ── Opening and shutting ────────────────────────────────────────────────────────────────
     Only the card in focus can be open, and only one can be open at a time — which between them
     mean this is a boolean rather than an id. Anything that changes which card is in the middle
     shuts it: a card that stayed open while the row moved would be a body panel belonging to a
     template that is no longer under it. */
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [activeIndex]);

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  /* The fold, and why an rAF loop rather than a CSS transition or the render loop of the canvas
     that draws the page.

     Not CSS, because two things have to move off ONE number — the card's height and the page
     falling into it — and the page lives in a WebGL scene that cannot read a CSS transition's
     interpolated value.

     Not the canvas either, and that is the important half: the card has to open on a machine with
     no working GL context just as well as on one with. So the number lives here, in ordinary
     JavaScript, written out to the DOM as two custom properties and handed to the canvas as a ref.
     Lose the canvas and the card still opens; it simply opens without the paper. */
  const activeCardRef = useRef<HTMLElement | null>(null);
  const foldRef = useRef(0);
  // The canvas's own request-a-frame, handed up once it exists. See BookFold's onReady.
  const foldInvalidate = useRef<(() => void) | null>(null);
  const onFoldReady = React.useCallback((fn: () => void) => {
    foldInvalidate.current = fn;
  }, []);

  const writeFold = (p: number) => {
    foldRef.current = p;
    // The projected fraction, which is the cosine of the angle the page still has to fall through.
    const projected = String(Math.sin((p * Math.PI) / 2));
    // The track grows by exactly the same pixels the card does, so the gap under the card never
    // changes — but under its OWN property name, and that is not tidiness. Custom properties
    // inherit. Writing --nq-fold on the track handed it to all eleven cards inside it, every one of
    // which reads --nq-fold for its height, and the whole row opened together: five cards standing
    // in a line each growing a blank white panel out of its bottom edge.
    if (trackRef.current) trackRef.current.style.setProperty('--nq-track', projected);
    const el = activeCardRef.current;
    if (!el) return;
    // Two properties, because they are two different questions. --nq-fold is how much of the body
    // is PROJECTED on screen, which is the cosine of the angle the page still has to fall through
    // and therefore exactly the card's height; --nq-open is the raw progress, which is what the
    // content's own fade-in is timed against.
    el.style.setProperty('--nq-fold', projected);
    el.style.setProperty('--nq-open', String(p));
    // And one frame of paper to go with the pixels the DOM just moved.
    foldInvalidate.current?.();
  };

  useEffect(() => {
    const to = expanded ? 1 : 0;
    const from = foldRef.current;
    if (from === to) {
      writeFold(to);
      return;
    }
    if (reduced) {
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
  }, [expanded, reduced, activeIndex]);

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
    dragRef.current = { startX: e.clientX, startY: e.clientY };
    // A fresh gesture is a fresh intent: clear any un-consumed suppression so a genuine tap
    // (released without moving) is never swallowed by a stale flag from the previous drag.
    suppressClickRef.current = false;
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
  // The index moves *during* the drag, not on release. The pointer's signed travel decides
  // which card owns the middle, and the strip hands over the moment the appropriate card has
  // been pulled a good chunk of the way toward center (see the snap fraction used inside).
  // Committing the index mid-gesture is what makes the centered card genuinely the selected
  // one — letting go anywhere keeps whatever is in the middle, instead of the whole strip
  // springing back to where the drag began — and the residual offset then just glides home
  // on release. The travel stays anchored to the original pointerdown so the commit
  // direction always follows the finger; see the note inside on why that anchor matters.
  //
  // Card counts are computed symmetrically: the bare Math.round() this used to be was
  // asymmetric (Math.round(-0.5) === -0), so dragging *left* silently needed ~75% of a step
  // while dragging right switched at 50% — one direction always lagged where the eye saw the
  // second card already sitting. Magnitude-then-sign makes both directions switch at the
  // same completion fraction, and sharing the helper between the live drag and the release
  // snap keeps the two thresholds honest.
  useEffect(() => {
    if (!isDragging) return;
    // The distance a card visibly travels on screen, which is now simply the ladder's first
    // step — nothing scales the row between here and the display.
    const step = stepPx;
    const n = filteredTemplates.length;
    let frame = 0;
    // `travel` is the pointer's full signed displacement since the gesture started, NEVER
    // rebased. `committed` is how many whole cards the strip has handed over so far (signed,
    // so it grows in the direction the pointer is actually travelling). The visible offset
    // is always `travel - committed * step`.
    //
    // The old model advanced `drag.startX` by a full step at every commit, which silently
    // INVERTED the residual: continue dragging the same direction and the very next
    // pointermove read a reversed, now-positive offset, crossed the commit threshold again,
    // and walked the commit BACKWARD — a just-activated card flipping back out mid-gesture.
    // That is the "second card popped up but the rotation never completes" failure: the
    // strip commits, then un-commits one pointer event later, and with no further movement
    // the release settles onto the original card. Anchoring everything to monotonic travel
    // makes the commit direction follow the finger, never the residual's sign.
    let travel = 0;
    let committed = 0;
    let offset = 0;

    const stepsFor = (px: number, snap: number) =>
      n > 1 ? Math.sign(px) * Math.floor(Math.abs(px) / step + snap) : 0;

    const apply = () => {
      frame = 0;
      const drag = dragRef.current;
      if (!drag) return;
      // The whole-card target is the travel-based count; the diff vs `committed` is what to
      // add now. Because `stepsFor` is monotonic in travel, forward drags only ever add
      // commits (and a genuine reverse drag subtracts) — never a flip in mid-direction.
      const target = stepsFor(travel, 0.6);
      const steps = target - committed;
      if (steps !== 0) {
        committed = target;
        offset = travel - committed * step;
        dragOffsetRef.current = offset;
        // Deliberately does NOT publish --drag-x here. Changing the index is a React state
        // update that lands on a later frame, while a style write lands immediately — so
        // pushing the rebased residual now would draw every card against positions still
        // computed from the *old* index, a full card's step out of place, until React caught
        // up. That one-frame mismatch is exactly the previous card flashing into view before
        // the new one takes the middle. The layout effect below publishes it in the same
        // commit as the index instead, so the two are always painted together.
        setActiveIndex((i) => (((i - steps) % n) + n) % n);
        return;
      }
      offset = travel - committed * step;
      dragOffsetRef.current = offset;
      setDragOffset(offset);
    };

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      travel = e.clientX - drag.startX;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onUp = (e: PointerEvent) => {
      // A pointer that moved more than a few pixels is a drag, not a tap — and a drag whose
      // release lands on a card synthesizes a click there (see suppressClickRef above), which
      // would fire that card's own buttons and tear the grid away mid-settle. The capture
      // handler on the track eats exactly one such post-drag click.
      const drag = dragRef.current;
      suppressClickRef.current =
        drag !== null && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 6;
      dragRef.current = null;
      setIsDragging(false);
      // Catch a short pull that revealed the neighbour without committing, and complete any
      // commit the drag itself was one unit short of. Same monotonic formula as apply, so a
      // release can never reverse a commit that already happened — it can only round the
      // gesture up to the card it was actually aiming at (or leave it, for a sub-20% nudge).
      const target = stepsFor(travel, 0.8);
      const steps = target - committed;
      if (steps !== 0) {
        committed = target;
        offset = travel - committed * step;
        dragOffsetRef.current = offset;
        setActiveIndex((i) => (((i - steps) % n) + n) % n);
      }
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
  }, [isDragging, stepPx, filteredTemplates.length]);

  // The other half of the pact above: publishes whatever offset the gesture is currently at,
  // after every render and synchronously before the browser paints. That timing is the whole
  // point — a committed index and the residual that belongs with it reach the screen in one
  // frame, so the strip never draws itself in a position neither of them describes.
  useLayoutEffect(() => {
    if (!isDragging) return;
    setDragOffset(dragOffsetRef.current);
  });

  // Raises `isMoving` for the whole of any motion and lowers it once everything has come to
  // rest. Dragging holds it up directly; an index change (a tap, an arrow, the autoplay) holds
  // it for the length of the 0.9s glide that follows, with a margin so the layers outlive the
  // transition rather than being dropped in its last frame. Re-running on every index change
  // restarts the timer, so a fast sequence of taps stays one continuous promoted stretch
  // instead of thrashing layers between them.
  useEffect(() => {
    setIsMoving(true);
    if (isDragging) return;
    const id = window.setTimeout(() => setIsMoving(false), 1100);
    return () => window.clearTimeout(id);
  }, [activeIndex, isDragging]);

  // Settling the residual offset home, once the drag is over. Deliberately not done inside
  // onUp: that runs while the cards still carry the drag's own transition rules (isDragging
  // is only flipped in the same call, and React has not re-rendered yet), so zeroing it
  // there would snap rather than glide. A frame later the re-render has restored the
  // transform transition, and the same write animates instead.
  useEffect(() => {
    if (isDragging) return;
    if (!trackRef.current) return;
    const id = requestAnimationFrame(() => {
      dragOffsetRef.current = 0;
      setDragOffset(0);
    });
    return () => cancelAnimationFrame(id);
  }, [isDragging]);

  // Auto-advance one card every 8s (see the 0.9s transition below) — loops
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

  // One pool of light per visible card, from the same ladder that places the cards — so the
  // light cannot drift out of agreement with what it is supposed to be coming from. Five at
  // most: the centre and two either side, which is everything the row ever shows.
  //
  // Wrapping with the modulo rather than clamping, exactly as the cards do, so the pools keep
  // the same circular order the strip does when it wraps past either end of the catalogue.
  const glowLights: GlowLight[] = useMemo(() => {
    const n = filteredTemplates.length;
    if (!n) return [];
    const out: GlowLight[] = [];
    for (let offset = -2; offset <= 2; offset++) {
      const template = filteredTemplates[(((activeIndex + offset) % n) + n) % n];
      if (!template) continue;
      const d = Math.abs(offset);
      out.push({
        x: Math.sign(offset) * focusX[d],
        // Under the picture, not under the card, and measured from the CANVAS centre rather than
        // the row's. The card's height is no longer a fixed thing — it doubles when it opens — so a
        // pool tied to it would slide down the page every time anything was expanded. The header is
        // the part that never moves and the part the colour belongs to, so the light sits low in it
        // and stays there.
        y: headerH * 0.86 - (trackOpen + GLOW_BLEED) / 2,
        radius: (isMobile ? 260 : 400) * FOCUS_SCALE[d],
        // The focused card is not simply brighter, it is the only one that is bright. Two pools
        // at similar strength read as two centres of attention, and the whole point of the
        // arrangement is that there is one.
        amp: d === 0 ? 1 : d === 1 ? 0.34 : 0.12,
        color: hueFor(template.category),
      });
    }
    return out;
  }, [filteredTemplates, activeIndex, focusX, headerH, trackOpen, isMobile]);

  // A filter or a search that changes the result set shuts whatever was open along with it. The
  // effect above catches the ordinary case by watching activeIndex, and misses exactly one: a new
  // set whose first card is also index 0, where the index does not change but the template under
  // it does. This is that case, and it lives here because filteredTemplates is only defined by now.
  useEffect(() => setExpanded(false), [filteredTemplates.length, selectedCategory, searchQuery, sortBy]);

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

