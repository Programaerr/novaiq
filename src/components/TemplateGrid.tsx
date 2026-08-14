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

// Perspective coverflow geometry. Cards stand in a rack under a single camera: the middle one
// square to the viewer at full size, each one beside it stepped sideways, set slightly back,
// and turned so its OUTER edge swings toward the eye. That last part is the whole design —
// turn them the other way and the rack folds shut away from you, which is the ordinary
// album-cover carousel this deliberately is not.
//
// Given as an explicit ladder by distance-from-centre rather than as a formula, because the
// reference's own angles are not a formula: it opens ~44° for the first step and only ~68°
// for the second, where a cylinder (a constant angle per step) would demand 88° and stand
// the outer card edge-on. Only three positions are ever visible, so a table of three states
// exactly what is drawn, and index 3 is the parked position for cards cycling out of range.
//
// The numbers were solved against the card's own size and the perspective below, and solved
// PER EDGE — which is the part that is easy to get wrong. A perspective divide happens at each
// vertex, not once per element, so a turned card's near half is magnified while its far half
// shrinks, and its projected width is materially wider than "card width × cos(angle) × the
// card's own depth scale" predicts. Estimating it that way here first gave 227px for a row
// that actually renders 273px, which is a third of the intended foreshortening simply missing.
//
// With a 330×480 card at 1400px perspective, the ladder below projects to:
//     centre  330 wide, 480 tall
//     step 1  227 wide, 478 tall, centred 310px out  → a ~32px gap beside the centre card
//     step 2  158 wide, 436 tall, centred 469px out  → just touching its neighbour
// which is the reference's read: a square, dominant middle card, its neighbours clearly turned
// and barely touching it, the outermost a narrow slice. Total reach ~1095px, inside the track.
//
// Every Z is negative, deliberately. It is what keeps the whole rack behind the screen plane,
// so no card ever projects LARGER than the centre one — with a shallower recession the turned
// cards swing their near edge in front of the camera plane and come out taller than the card
// they are supposed to be deferring to.
const COVERFLOW_X = [0, 330, 560, 760];
const COVERFLOW_Z = [0, -140, -300, -430];
const COVERFLOW_ROT_DEG = [0, 55, 75, 82];
// One card's travel, in the rack's own units — the first step, which is the only spacing a
// drag can be measured against (the ladder is deliberately not uniform). At z=0 the projection
// is 1:1, so a pointer moving this far moves the centre card exactly as far.
const COVERFLOW_STEP_PX = COVERFLOW_X[1];
const FLAT_STEP_PX_MOBILE = 156;
const FLAT_STEP_PX_DESKTOP = 230;

// Full width the rack occupies at scale 1, outer edge to outer edge: the projected centre of
// the outermost card plus its own projected half-width, doubled. When the track is narrower
// than this the whole rack is scaled down to fit rather than being clipped, which is what
// left "half a card missing" on anything under a wide desktop.
const FAN_NATURAL_WIDTH = 1110;

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
  // Divided by the render scale, not published raw. The strip sits *inside* the shrink-to-fit
  // layer, so whatever this writes is multiplied by that scale before it reaches the screen —
  // publish the pointer's travel unchanged and the row moves at ~87% of the finger, and worse,
  // drifts: at each commit the cards step by a full (scaled) card while the rebased residual
  // only unwinds that same distance scaled a second time, so the strip visibly jumps by the
  // difference. Pre-dividing makes one px here land as one px on screen, which is the only
  // form in which the residual and the card step describe the same distance.
  const setDragOffset = (px: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.setProperty('--drag-x', `${px / fanScaleRef.current}px`);
  };

  // Drives the flat strip's per-card translateX step — narrower on phones so the smaller card
  // doesn't overlap its neighbours (a fixed desktop-sized offset would).
  const [isMobile, setIsMobile] = useState(false);
  // Only the breakpoint decides the geometry now — the device-tier hook that used to also
  // force the flat strip onto weak desktops is gone. The cost it was avoiding turned out to be
  // dominated by two other things (a permanently-promoted layer instead of one rebuilt
  // mid-drag, and a wide invisible shadow), both fixed below, and gating on the tier meant a
  // late downgrade swapped the whole carousel's geometry out from under a visitor mid-session.
  // Phones still take the flat strip, where the reason is layout rather than horsepower.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const flatGeometry = isMobile;
  const flatStepPx = isMobile ? FLAT_STEP_PX_MOBILE : FLAT_STEP_PX_DESKTOP;
  const stepPx = flatGeometry ? flatStepPx : COVERFLOW_STEP_PX;

  // How much the fan has to shrink to fit the track it is actually in. Measured from the
  // element rather than inferred from a breakpoint: the track is `w-full` under a max-width,
  // so the same viewport gives it a different width depending on the page's own padding, and
  // guessing that is exactly how the outer cards ended up clipped. Never scales above 1 —
  // a wide desktop shows the fan at its designed size, narrower ones shrink it to fit.
  const [trackWidth, setTrackWidth] = useState(0);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setTrackWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setTrackWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // The 3D rack only, and deliberately so. The flat strip is *meant* to run past both edges —
  // its step is far narrower than its card, so the neighbours are half-tucked behind the
  // middle one by design, and fitting that whole row into a phone's track would shrink it to
  // under half size to solve a problem it does not have.
  const fanScale = flatGeometry || !trackWidth ? 1 : Math.min(1, trackWidth / FAN_NATURAL_WIDTH);
  // setDragOffset runs from a pointermove closure that outlives this render, so it reads the
  // scale from a ref rather than capturing the value — otherwise a resize mid-gesture would
  // leave the drag converting against a stale scale.
  const fanScaleRef = useRef(1);
  fanScaleRef.current = fanScale;

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
    // Scaled with the row: the threshold has to be the distance a card visibly travels on
    // screen, which shrinks when the row is shrunk to fit a narrower track.
    const step = stepPx * fanScale;
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
  }, [isDragging, stepPx, fanScale, filteredTemplates.length]);

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

  return (
    <section id="templates-section" className="py-4 sm:py-6 relative">
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
        <div className="flex items-center justify-center mt-8 sm:mt-10">
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
            style={{
              // The camera. Every card's translateZ and rotateY below is meaningless without
              // it — with no perspective the rack projects orthographically and simply looks
              // like a row of squashed rectangles. Scoped to the capable-desktop branch only;
              // phones and low-end machines take the pure-2D strip and never pay for it.
              ...(flatGeometry ? {} : { perspective: '1400px', perspectiveOrigin: '50% 50%' }),
            }}
            // The whole rack sits behind the screen plane (every Z in the ladder is negative),
            // so the centre card at its full 480px is the tallest thing drawn and nothing has
            // to be left over for a card projecting larger than itself.
            className="relative w-full max-w-7xl h-[440px] sm:h-[500px] overflow-hidden touch-pan-y cursor-grab active:cursor-grabbing select-none"
          >
          {/* Shrink-to-fit layer. Every card is positioned against the rack's natural size, and
              this one transform brings the whole shape down to whatever width the track really
              has — so the outermost card is never clipped, at any viewport, without a single
              per-card measurement. preserve-3d so the rack below survives this wrapper rather
              than being flattened into a picture of itself. */}
          <div
            className="absolute inset-0"
            style={{
              transformStyle: flatGeometry ? undefined : 'preserve-3d',
              ...(fanScale === 1 ? {} : { transform: `scale(${fanScale})`, transformOrigin: '50% 50%' }),
            }}
          >
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
              transformStyle: flatGeometry ? undefined : 'preserve-3d',
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
            let transform: string;
            if (flatGeometry) {
              // Pure 2D on phones AND on low-end desktops. A 2D translateX cannot z-recede,
              // blink, or drop frames; the capable-desktop rack is handled below.
              transform = `translate(-50%, -50%) translateX(${clampedOffset * flatStepPx}px)`;
            } else {
              // The rack. Sign is split out from magnitude because the ladder is indexed by
              // distance, while every term has to mirror about the middle: step out to the
              // side, sit back from the camera, and turn.
              //
              // The rotation is NEGATED against the side the card is on, and that single minus
              // is the whole look. CSS rotateY(+θ) swings the card's +X side away into the
              // screen — so a card on the right rotated positively folds its outer edge away
              // and the rack closes like a book. Negated, the outer edge comes toward the eye
              // and the rack opens outward at the viewer, which is what the reference shows:
              // the outer edge of each side card is the *taller* one, because it is nearer.
              const dir = Math.sign(clampedOffset);
              const d = Math.min(Math.abs(clampedOffset), 3);
              transform =
                `translate(-50%, -50%) translateX(${dir * COVERFLOW_X[d]}px) ` +
                `translateZ(${COVERFLOW_Z[d]}px) rotateY(${-dir * COVERFLOW_ROT_DEG[d]}deg)`;
            }

            return (
              <div
                key={template.id}
                onClick={() => { if (!isActive) setActiveIndex(index); }}
                style={{
                  transform,
                  // Promotes the card to its own compositor layer so its render — masked,
                  // shadowed, image-filled — is rasterized once and then simply moved.
                  // Without the hint the browser re-rasterizes every card inside the rotating
                  // track on each drag frame (the track itself is deliberately NOT promoted:
                  // its children change opacity constantly, and a promoted parent would
                  // re-bake the whole fan into one texture per change). Same lesson the
                  // milestone-card ring learned: promote the moving leaf, not the animated
                  // parent. Two transitions fight on this element, transform (0.9s) and
                  // opacity (0.3s), so both properties are named.
                  //
                  // Constant for the whole life of the card — deliberately NOT gated on
                  // anything that changes as cards move, which was tried both ways (on
                  // isVisible, and on the device tier) and made the drag far worse. Those flags
                  // flip on the very step commits a drag is made of, and changing will-change
                  // is what creates and destroys the compositor layer. Destroying one throws
                  // its texture away; creating one forces the card — image, 28px-rounded mask,
                  // border — to be rasterized again, synchronously, mid-gesture. Several of
                  // those in the same frame is a stall long enough to swallow the animation
                  // whole and leave the card appearing to teleport. Holding a texture that is
                  // never looked at is cheap; building one during a gesture is not.
                  willChange: isMoving ? 'transform, opacity' : undefined,
                  // Depth already does most of the ranking in the rack — the side cards are
                  // turned and set back, so they read as further away without help. Opacity
                  // only has to finish the job, hence 0.7/0.4 rather than the harder 0.55/0.28
                  // fade this carried under the old flat geometry, where nothing but opacity
                  // separated the cards: the reference's own side cards are dimmer than its
                  // centre one but still fully legible pictures, not ghosts.
                  opacity: isActive ? 1 : cappedDistance === 1 ? 0.7 : cappedDistance === 2 ? 0.4 : 0,
                  zIndex: 10 - cappedDistance,
                  // 0.9s for the glide, matched to the scale transition on the wrapper below —
                  // slow enough to read as a deliberate motion instead of the instant-feeling
                  // 0.55s this used to run at. Opacity is deliberately much shorter (0.3s) and
                  // NOT matched to it: sampled frame-by-frame, a 0.55s opacity fade running
                  // alongside a 0.9s slide put the outgoing and incoming card at similar
                  // high-ish opacity (both ~0.7–0.85) for a good third of the transition —
                  // two overlapping cards that are each mostly-but-not-fully visible reads as
                  // a muddy double exposure, which is worse the longer that window lasts.
                  // Cutting opacity down to 0.3s means each card reaches its resting opacity
                  // well before the slide is even half done, so for the back half of the
                  // glide the incoming card is already fully opaque and simply sliding over
                  // the outgoing one — a clean overlap instead of a translucent one. Position
                  // and size still arrive together — see the note on the scale transition
                  // below for why that part hasn't changed.
                  //
                  // The transform half is suspended while dragging so the offset tracks the
                  // finger/mouse 1:1 rather than chasing it on an easing; opacity keeps its
                  // transition throughout, since a card that takes the middle mid-drag
                  // should still brighten smoothly rather than pop.
                  transition: isDragging
                    ? 'opacity 0.3s ease'
                    : 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease',
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
                    // Only the flat strip needs a scale ladder. In the rack the perspective
                    // already sizes each card — the side ones are set back from the camera and
                    // project smaller on their own — so scaling them again would double the
                    // recession and shrink them well past what the reference shows, where a
                    // neighbour stands within a few percent of the centre card's height and
                    // only its *width* collapses, from the turn.
                    transform: flatGeometry
                      ? `scale(${isActive ? 1 : cappedDistance === 1 ? 0.82 : 0.68})`
                      : 'none',
                    // Same 0.9s and same curve as the positional transform above — see the
                    // note there on why the two must agree. Also on its own layer, like the
                    // card holding it: it animates its own scale for 0.9s on every commit,
                    // and without the hint that glide would re-rasterize the image inside
                    // the card's layer texture on every frame of the animation. Constant for
                    // the same reason as the card above: a will-change that flips mid-drag
                    // rebuilds the layer instead of reusing it.
                    willChange: isMoving ? 'transform' : undefined,
                    transition: 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  className="h-full"
                >
                {/* One full-bleed frame: the photo fills the whole card and everything the card
                    needs to say floats over it in a single glass strip. Price, features and
                    tech stack aren't gone — they're one tap away in the full preview this card
                    opens, so nothing is actually lost. */}
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
                  // Surface styling here is deliberately NOT conditional on isActive, and
                  // carries no backdrop-blur. Both of those were tried and both flicker: a
                  // background that changes the instant a card becomes active is a hard swap
                  // mid-motion, and toggling backdrop-filter on/off makes the browser build
                  // and tear down a compositor layer at that same moment — the card visibly
                  // blanks and re-appears. Constant styling means the layer is created once
                  // and simply moves, which is also why the earlier five-simultaneous-blurs
                  // stutter on real phones doesn't come back. transition-[border-color], not
                  // transition-colors, for the same family of reason: only the hover border
                  // is meant to fade, and a broader transition would animate the surface too.
                  // No shadow-2xl here any more. It is `0 25px 50px -12px rgb(0 0 0/0.25)` —
                  // a 50px-radius blur of a 25%-opaque *black* shadow, cast onto a near-black
                  // cosmic background, so what it actually contributes on screen is nothing
                  // anyone can see. What it cost was real: a blur that wide has to be
                  // re-rasterized around the full 330x480 card every time the card's layer is
                  // re-baked, which is on every scale change — i.e. several cards at once, on
                  // every step of a drag. That is the single most expensive thing this card
                  // was asking for, in exchange for invisible output.
                  className="relative h-full rounded-[28px] bg-white/5 border border-white/10 hover:border-white/30 transition-[border-color] duration-300 cursor-pointer group p-2 sm:p-2.5"
                >
                  {/* The photo sits inset inside the frame's own padding — a bezel margin all
                      round, like a phone case holding its screen — rather than bleeding to the
                      card's own edges. */}
                  <div
                    className="relative w-full h-full rounded-[20px] overflow-hidden"
                    // Safari drops border-radius + overflow-hidden clipping on an element
                    // sitting under a 3D-transformed ancestor (this card's own rotateY /
                    // translateZ / the track's perspective) — it never shows up in Chrome
                    // devtools or headless screenshots, only on a real iPhone, which is why
                    // the bottom panel could overflow past this frame there and nowhere else.
                    // Forcing Safari onto its mask-based clip path instead of the broken
                    // overflow-hidden path is the standard fix — but the textbook version of
                    // it, -webkit-radial-gradient(white, black), is an actual gradient: on a
                    // tall narrow card like this one its default farthest-corner sizing fades
                    // to black along the side edges well before it reaches the corners, which
                    // is a real, visible dark band down both sides, not a rendering glitch.
                    // Both stops white makes it a true no-op gradient — still a mask-image, so
                    // Safari still takes the fixed code path, but nothing in it actually fades.
                    style={{ WebkitMaskImage: '-webkit-radial-gradient(white, white)' }}
                  >
                    <img
                      src={template.previewImage}
                      alt={displayTitle}
                      loading="lazy"
                      decoding="async"
                      // An <img> is natively draggable. Press on a card's photo — far and away
                      // the largest target in the strip, and the obvious place to grab — and
                      // the browser starts its own drag-and-drop of the image file: it takes
                      // over the gesture, so the pointermove/pointerup this carousel is
                      // listening for simply never arrive and the strip sits dead under a
                      // translucent ghost of the picture. select-none on the track fixed the
                      // same class of hijack for text selection; this is the image half of it.
                      draggable={false}
                      className="tpl-cover-img absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/40" />

                    {/* Category badge — flat translucent, same on every card. See the note on
                        the bezel above for why nothing here keys off isActive or blurs. */}
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 max-w-[75%] truncate px-2.5 py-1 sm:px-3 rounded-full bg-black/70 border border-white/10 text-white text-[10px] sm:text-[11px] font-bold">
                      {displayCategory}
                    </div>

                    {/* Bottom panel — name, one-line pitch and the single action this card
                        needs. Dark and translucent rather than frosted: the photo still reads
                        through it, but without a backdrop-filter that would have to be built
                        per card. */}
                    <div className="absolute inset-x-2.5 bottom-2.5 sm:inset-x-4 sm:bottom-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-950/80 border border-white/15 shadow-xl">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-white font-bold text-sm sm:text-lg line-clamp-1">{displayTitle}</h3>
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                      </div>
                      <p className="text-zinc-300 text-[10px] sm:text-xs leading-snug sm:leading-relaxed line-clamp-2 mt-0.5 sm:mt-1">
                        {displaySubtitle}
                      </p>

                      {/* Meta above, action below — stacked at every width, not just on phones.
                          Weeks, price and button sharing one row left each too little space to
                          hold together, so "3 أسابيع" and the price's currency suffix each
                          broke onto their own line mid-phrase. Desktop is no better off than
                          mobile here despite its wider card: measured against the panel's own
                          inner width, that row needs ~270px and only has ~246px. Stacking
                          gives each its full width; whitespace-nowrap then guarantees neither
                          value can split again regardless of how long a price gets. */}
                      <div className="flex flex-col gap-2 mt-2 sm:mt-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 text-[9px] sm:text-[11px] text-zinc-300 font-semibold">
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                            {template.deliveryWeeks} {translateText('أسابيع', currentLang)}
                          </span>
                          <span className="font-mono font-bold text-white whitespace-nowrap">
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
                          className="filter-pill-btn relative shrink-0 w-full px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <span className="filter-pill-beam" aria-hidden="true" />
                          <FileSignature className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-current shrink-0" />
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
            <div className="flex items-center justify-center gap-1.5 mt-7 sm:mt-6">
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
          <span className="tpl-lightstage__beam tpl-lightstage__beam--l" aria-hidden="true" />
          <span className="tpl-lightstage__beam tpl-lightstage__beam--r" aria-hidden="true" />
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

          {/* Brand mark — sized to actually fill the empty stretch between the carousel and
              the footer, not just sit as a small centered icon within it. Brighter than the 22%
              it used to be: it is standing in the light now, and a mark the beams fall on that
              stays as faint as one in the dark reads as a texture the light is passing through
              rather than an object the light is hitting. */}
          <div className="relative z-10 flex justify-center mt-16 sm:mt-24 mb-8 sm:mb-14 opacity-60">
            <NovaiqLogo size={60} showText={true} className="scale-150 sm:scale-[2.25] lg:scale-[3]" />
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

