import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import { Template } from '../types';
import { useLiveTemplates } from '../lib/pricingOverrides';
import { useLowEndDevice } from '../lib/deviceQuality';
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

// Washing-line geometry. The cards hang from a wire strung across the strip: each one is
// pinned at its top edge by a clip, sits a little higher the further it is from the middle
// (the wire sags in the centre under them), and tilts to match the slope of the wire at the
// point it hangs from. That last part is what sells it — a card hanging off a sloping line
// is not vertical, and cards pinned to a curve but drawn upright read as a flat row that
// someone nudged up and down.
//
// All three quantities come from the same parabola, so they cannot disagree:
//     y(k) = -CURVE * k²         (k = whole steps from centre; negative y is up the screen)
//     slope = dy/dx = -2*CURVE*k / STEP   →   linear in k, hence a constant tilt per step.
// The wire below is drawn from that identical expression rather than a hand-drawn curve, so
// every clip lands exactly on the line no matter how the constants are retuned.
//
// This replaces the 3D cylinder that used to live here, and the replacement is pure 2D — a
// translate, a translate and a rotate. There is no perspective, no translateZ and no
// depth-sorted repaint anywhere in the strip now, which is why the geometry below is no
// longer split into a "capable desktop" and a "weak device" branch: what remains is cheap
// enough for any GPU, so phones and low-end machines run the same design rather than a
// fallback. Only the constants differ by breakpoint, and only because a phone's card is
// nearly the width of its viewport.
const HANG_STEP_PX_DESKTOP = 285;
const HANG_STEP_PX_MOBILE = 185;
// Rise of the outermost card above the centre one, per step², in px. Measured off the
// reference: its end cards sit ~45px above the middle two steps out, i.e. ~11 per k².
const HANG_CURVE_DESKTOP = 11;
const HANG_CURVE_MOBILE = 6;
// Degrees of tilt per step out. The reference's end cards read at roughly ±6°, which is two
// steps of 3 — enough to look hung rather than placed, well short of looking knocked over.
const HANG_TILT_DEG_DESKTOP = 3;
const HANG_TILT_DEG_MOBILE = 1.8;
// How far the wire is drawn beyond the visible track, so a drag never pulls a bare end into
// view. Wider on desktop, but not unboundedly — a parabola climbs as the square of distance,
// so an over-long wire would shoot off the top of the track instead of leaving the frame at
// the gentle angle the reference has.
const WIRE_WIDTH_DESKTOP = 1500;
const WIRE_WIDTH_MOBILE = 900;

// Full width the hung row occupies at scale 1, outer edge to outer edge — the two steps out
// to the last card, plus that card's own scaled half-width and the extra reach its tilt adds.
// When the track is narrower than this the whole row is scaled down to fit rather than being
// clipped, which is what left "half a card missing" on anything under a wide desktop.
// Measured on the rendered row rather than derived: a tilted card reaches further sideways
// than its own width, by its height times the sine of its tilt, and the arithmetic value
// (1370) still left 7px of the outermost card outside the track at every viewport.
const FAN_NATURAL_WIDTH = 1400;

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
  // one: the wire and the cards it holds move together as a single rigid strip, which is both
  // cheaper and the physically honest answer — clips slide along a line, they do not orbit.
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

  // Drives the strip's per-card step, sag and tilt — all tighter on phones, where the card is
  // already close to the viewport's width and a desktop-sized step would simply push its
  // neighbours off-screen.
  const [isMobile, setIsMobile] = useState(false);
  // Live tier (hardware guess at startup, runtime jank probe after load). It no longer picks
  // a different *geometry*: the strip is pure 2D for everyone now, so there is no perspective
  // or translateZ recession left for a weak GPU to choke on. What it still decides is whether
  // each card is promoted to its own compositor layer (see willChange below) — on a weak
  // machine every promoted layer is a texture that must be composited at all times, and with
  // nothing 3D left to keep crisp that trade is pure cost. A hook, not a one-shot bool, so a
  // late downgrade is picked up mid-session.
  const isLowEnd = useLowEndDevice();
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const stepPx = isMobile ? HANG_STEP_PX_MOBILE : HANG_STEP_PX_DESKTOP;
  const hangCurve = isMobile ? HANG_CURVE_MOBILE : HANG_CURVE_DESKTOP;
  const hangTiltDeg = isMobile ? HANG_TILT_DEG_MOBILE : HANG_TILT_DEG_DESKTOP;
  const wireWidth = isMobile ? WIRE_WIDTH_MOBILE : WIRE_WIDTH_DESKTOP;
  // Where the wire's lowest point sits inside the track, and how far it climbs by the time it
  // leaves the drawn span. The climb is the parabola evaluated at the wire's own half-width,
  // so the SVG below is exactly tall enough to hold the curve and the track needs exactly
  // this much headroom above the centre clip — no guessed padding either side.
  const wireRise = hangCurve * Math.pow(wireWidth / 2 / stepPx, 2);
  const wireTopY = isMobile ? 52 : 84;

  // The wire itself, as a path through the same parabola the cards hang on. Sampled rather
  // than drawn as a single quadratic Bézier: a Bézier through the end points is *not* this
  // parabola once the span runs several steps wide, and any disagreement shows up as clips
  // floating off the line at the ends — the one flaw that would give the whole illusion away.
  const wirePath = useMemo(() => {
    const half = wireWidth / 2;
    const pts: string[] = [];
    for (let x = -half; x <= half; x += 25) {
      const k = x / stepPx;
      pts.push(`${(x + half).toFixed(1)},${(wireRise - hangCurve * k * k).toFixed(1)}`);
    }
    return `M${pts.join(' L')}`;
  }, [wireWidth, stepPx, hangCurve, wireRise]);

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
  // Desktop only, and deliberately so. A phone's row is *meant* to run past both edges — its
  // step is far narrower than its card, so the neighbours are half-tucked behind the middle
  // one by design, and fitting that whole row into a 360px track would shrink it to under
  // half size to solve a problem it does not have.
  const fanScale = isMobile || !trackWidth ? 1 : Math.min(1, trackWidth / FAN_NATURAL_WIDTH);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
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

        {/* Templates strip — cards pegged to a wire, clicking any off-centre one brings it to
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
            // Heights are sized from the strip itself, not guessed: the wire's lowest point
            // plus the tallest card that hangs from it, plus a little air underneath. Cards
            // are anchored by their *tops* to the wire (they hang), so nothing here has to
            // leave symmetric room above and below the way a vertically-centred row did.
            className="relative w-full max-w-7xl h-[350px] sm:h-[400px] overflow-hidden touch-pan-y cursor-grab active:cursor-grabbing select-none"
          >
          {/* Shrink-to-fit layer. Every card is positioned against the row's natural size, and
              this one transform brings the whole shape down to whatever width the track really
              has — so the outermost card is never clipped, at any viewport, without a single
              per-card measurement. Anchored at the top edge, not the middle: the wire is near
              the top of the track and scaling about the centre would drag it downward as the
              viewport narrowed. */}
          <div
            className="absolute inset-0"
            style={fanScale === 1 ? undefined : { transform: `scale(${fanScale})`, transformOrigin: '50% 0' }}
          >
          {/* Drag layer — one translate carrying the wire and everything pinned to it. The
              cards do NOT slide along a stationary wire: a clip is fixed to the card it holds,
              so pulling the row has to pull the line with it, exactly as a real washing line
              swings when you tug one garment along it. It also keeps the whole gesture to a
              single composited transform rather than recomputing each card's sag and tilt from
              a fractional position every frame. Suppressed mid-gesture so the strip tracks the
              pointer 1:1, then glides home on release with the cards' own 0.9s curve. */}
          <div
            className="absolute inset-0"
            style={{
              transform: 'translateX(var(--drag-x, 0px))',
              transition: isDragging ? 'none' : 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
          {/* The wire. Sits under every card (they carry z-index 7–10) so each clip covers the
              short stretch of line it is pinned to, which is what makes the clip read as
              gripping the wire rather than floating beside it. aria-hidden and no pointer
              events: it is scenery, and it must never eat a drag that starts on it. */}
          <svg
            aria-hidden="true"
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ top: wireTopY - wireRise, width: wireWidth, height: wireRise + 1 }}
            width={wireWidth}
            height={wireRise + 1}
            viewBox={`0 0 ${wireWidth} ${wireRise + 1}`}
            fill="none"
          >
            <path d={wirePath} stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
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
            // Where this card hangs on the wire. Three terms, all from the one parabola in the
            // constants block: the step out along the line, the height the line has climbed by
            // that point (negative — away from the sag in the middle), and the tilt matching
            // the line's slope there. The tilt is negated because the screen's y runs downward
            // while the slope was derived in ordinary maths orientation: without that sign the
            // cards would lean *into* the sag instead of away from it, which looks like they
            // are sliding toward the middle rather than hanging still.
            //
            // No --drag-x term: the drag translates the whole strip on the layer above, wire
            // included, so a card's position relative to its own clip never changes mid-gesture.
            const cardX = clampedOffset * stepPx;
            const cardY = -hangCurve * clampedOffset * clampedOffset;
            const cardTilt = -hangTiltDeg * clampedOffset;
            const transform = `translate(-50%, 0) translateX(${cardX}px) translateY(${cardY}px) rotate(${cardTilt}deg)`;

            return (
              <div
                key={template.id}
                onClick={() => { if (!isActive) setActiveIndex(index); }}
                style={{
                  transform,
                  // Promotes each card to its own compositor layer, permanently, so the
                  // card's render — masked, shadowed, image-filled — is rasterized once and
                  // then moved. Without the hint the browser re-rasterizes every card inside
                  // the rotating track on each drag frame (the track itself is deliberately
                  // NOT promoted: its children change opacity constantly, and a promoted
                  // parent would re-bake the whole fan into one texture per change). This is
                  // the same lesson the milestone-card ring learned: promote the moving leaf,
                  // not the animated parent. Two transitions fight on this element, transform
                  // (0.9s) and opacity (0.3s), so both properties are named.
                  //
                  // Not on low-end devices: there every promoted layer is a texture the weak
                  // GPU must composite at all times — the trade flips to pure cost. Two
                  // transitions fight on this element, transform (0.9s) and opacity (0.3s),
                  // so both are named.
                  willChange: isLowEnd ? undefined : 'transform, opacity',
                  // The clip is the pivot. Every transform on this card — the step out, the
                  // sag, the tilt, and the scale one level down — turns about the point where
                  // it is pinned to the wire, because that is the only point on a hanging
                  // object that does not move. Scaling about the centre (the default) would
                  // pull the smaller outer cards up off the line entirely.
                  transformOrigin: '50% 0',
                  top: wireTopY,
                  // Raised from 0.55/0.28. Those values were set when the cards were dark
                  // glass, where dimming a neighbour just sank it into the page; on white
                  // paper the same numbers turn it grey, and a row of five prints on one line
                  // should read as five prints, not one white and four grey. Still short of
                  // full opacity so the middle card is unmistakably the one in focus — and
                  // still low enough at distance 2 that the heavy overlap on a phone doesn't
                  // stack three near-solid cards on top of each other.
                  opacity: isActive ? 1 : cappedDistance === 1 ? 0.8 : cappedDistance === 2 ? 0.45 : 0,
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
                className={`absolute left-1/2 w-[228px] sm:w-[270px] h-[286px] sm:h-[344px] ${isActive ? 'cursor-default' : 'cursor-pointer'}`}
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
                    transform: `scale(${isActive ? 1 : cappedDistance === 1 ? 0.86 : 0.72})`,
                    // Same pivot as the card above it, for the same reason: a card that
                    // shrinks has to stay pinned to the wire at its clip, not float away
                    // from it.
                    transformOrigin: '50% 0',
                    // Same 0.9s and same curve as the positional transform above — see the
                    // note there on why the two must agree. Also on its own layer, like the
                    // card holding it: it animates its own scale for 0.9s on every commit,
                    // and without the hint that glide would re-rasterize the image inside
                    // the card's layer texture on every frame of the animation. Skipped on
                    // low-end devices, where every promoted layer is pure cost.
                    willChange: isLowEnd ? undefined : 'transform',
                    transition: 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  className="h-full"
                >
                {/* Photo above, words below — a print pegged to a line, which is what the
                    reference is. The previous card floated everything over a full-bleed photo
                    in a dark glass strip; that reads as a poster, and a poster does not hang.
                    The surface is white here rather than the site's dark glass for the same
                    reason: on a near-black page a white card is what makes the strip look like
                    paper on a wire instead of five more panels. */}
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
                  // stutter on real phones doesn't come back.
                  className="relative h-full rounded-[18px] sm:rounded-[22px] bg-white shadow-2xl cursor-pointer group p-2 sm:p-2.5 flex flex-col"
                >
                  {/* The clip that pins this card to the wire. Pushed up past the card's own
                      top edge so it straddles the line — half gripping the paper, half over
                      the wire — and it paints above the wire because the card carries a
                      z-index and the wire does not. Metal grey, not the reference's green:
                      this page has no accent colour anywhere, and one saturated green object
                      among ten monochrome ones would read as a mistake rather than a detail.
                      It does have to be grey rather than white, though — a white clip on
                      white paper vanishes the moment it crosses onto the card, leaving a tab
                      that looks stuck to the wire rather than gripping the print. */}
                  <div
                    aria-hidden="true"
                    className="absolute left-1/2 -translate-x-1/2 -top-3 sm:-top-3.5 w-[15px] h-[26px] sm:w-[17px] sm:h-[30px] rounded-[5px] bg-gradient-to-b from-zinc-300 to-zinc-500 shadow-md ring-1 ring-black/10"
                  >
                    {/* The hole the wire passes through — the one detail that separates a
                        clip from a plain tab stuck on the card. */}
                    <span className="absolute left-1/2 -translate-x-1/2 top-[5px] w-[5px] h-[5px] rounded-full bg-zinc-700/80" />
                  </div>

                  {/* The print. Fixed height rather than an aspect ratio so every card's text
                      block starts at the same distance below the wire — with the cards tilted
                      at different angles, a ragged internal baseline is far more visible than
                      it would be in a straight row. */}
                  <div
                    className="relative w-full h-[152px] sm:h-[184px] shrink-0 rounded-[12px] sm:rounded-[16px] overflow-hidden bg-zinc-100"
                    // Safari drops border-radius + overflow-hidden clipping on an element
                    // sitting under a transformed ancestor (this card's own rotate, the
                    // strip's translate) — it never shows up in Chrome devtools or headless
                    // screenshots, only on a real iPhone, which is why the photo could
                    // overflow past this frame there and nowhere else. Forcing Safari onto
                    // its mask-based clip path instead of the broken overflow-hidden path is
                    // the standard fix — but the textbook version of it,
                    // -webkit-radial-gradient(white, black), is an actual gradient: its
                    // default farthest-corner sizing fades to black along the edges well
                    // before it reaches the corners, which is a real, visible dark band, not
                    // a rendering glitch. Both stops white makes it a true no-op gradient —
                    // still a mask-image, so Safari still takes the fixed code path, but
                    // nothing in it actually fades.
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

                    {/* Category badge — flat translucent, same on every card. See the note on
                        the surface above for why nothing here keys off isActive or blurs. The
                        photo's own gradient scrim is gone with the overlaid text panel: with
                        nothing but this badge sitting on the image, darkening the whole photo
                        to serve one pill was cost without a reason. The badge carries its own
                        opaque fill instead. */}
                    <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 max-w-[80%] truncate px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-black/75 text-white text-[9px] sm:text-[10px] font-bold">
                      {displayCategory}
                    </div>
                  </div>

                  {/* Caption block — title, one-line pitch, then the delivery/price line and
                      the single action, in the reference's own order of importance. Price,
                      features and tech stack aren't gone: they're one tap away in the full
                      preview this card opens. */}
                  <div className="flex flex-col flex-1 min-h-0 px-1 pt-2 sm:pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-zinc-900 font-bold text-[13px] sm:text-[15px] leading-tight line-clamp-1">
                        {displayTitle}
                      </h3>
                      <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-900 shrink-0" />
                    </div>
                    <p className="text-zinc-500 text-[10px] sm:text-[11px] leading-snug line-clamp-2 mt-0.5">
                      {displaySubtitle}
                    </p>

                    {/* mt-auto pins the action to the card's bottom edge regardless of whether
                        the pitch above it wrapped to one line or two — otherwise the buttons
                        sit at different heights across the row, which the tilt makes obvious. */}
                    <div className="flex items-center justify-between gap-2 mt-auto pt-1.5 text-[9px] sm:text-[10px] text-zinc-500 font-semibold">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                        {template.deliveryWeeks} {translateText('أسابيع', currentLang)}
                      </span>
                      <span className="font-mono font-bold text-zinc-900 whitespace-nowrap">
                        {formatPrice(template.basePriceIQD, currentLang, currency)}
                      </span>
                    </div>

                    {/* Solid near-black, not the toolbar's white .filter-pill-btn: that pill
                        is a white surface that inverts to black on hover, and on a white card
                        it has nothing to sit against — it would read as a bare label until
                        someone happened to hover it. This is the same pill inverted from the
                        start, which is also the reference's own treatment: one solid, filled
                        button as the card's only action. Stops the click from bubbling to the
                        card's own onClick above it, since the two sit nested. */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplateForContract(template);
                        cosmicAudio.playWarp();
                      }}
                      className="mt-1.5 w-full px-3 py-1.5 sm:py-2 rounded-full bg-zinc-900 hover:bg-zinc-700 transition-colors text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <FileSignature className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                      <span>{getTranslation('selectForContract', currentLang)}</span>
                    </button>
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
              <div className="flex items-center gap-1 p-1 rounded-full bg-zinc-950/80 border border-zinc-800">
                {/* Both arrows wear the toolbar's Filter pill (.filter-pill-btn +
                    .filter-pill-beam), same as every other primary control on this page:
                    white surface, inverting to black on hover, with the rotating beam. The
                    chevrons take text-current so they flip with the body rather than staying
                    white on a white circle. */}
                <button
                  type="button"
                  onClick={() => goToOffset(1)}
                  aria-label={currentLang === 'ar' ? 'التالي' : 'Next'}
                  className="filter-pill-btn relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                >
                  <span className="filter-pill-beam" aria-hidden="true" />
                  <ChevronRight className="w-4 h-4 ltr:rotate-180 text-current" />
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

                <button
                  type="button"
                  onClick={() => goToOffset(-1)}
                  aria-label={currentLang === 'ar' ? 'السابق' : 'Previous'}
                  className="filter-pill-btn relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                >
                  <span className="filter-pill-beam" aria-hidden="true" />
                  <ChevronLeft className="w-4 h-4 ltr:rotate-180 text-current" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* Brand mark — sized to actually fill the empty stretch between the carousel and
            the footer, not just sit as a small centered icon within it. Scaled up as a whole
            (not just a bigger `size` prop) so the wordmark grows in step with the icon
            instead of staying pinned at its fixed text-xl/2xl size while the icon balloons
            past it; growing by breakpoint so it fills proportionally more on wider screens
            without overflowing narrow ones. */}
        <div className="flex justify-center mt-24 sm:mt-32 mb-8 sm:mb-14 opacity-[0.22]">
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

