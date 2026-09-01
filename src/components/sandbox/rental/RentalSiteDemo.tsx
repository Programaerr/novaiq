import React, { useMemo, useState } from 'react';
import {
  Bath,
  Bed,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  Layers,
  MapPin,
  Maximize2,
  Minus,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { cosmicAudio } from '../../../lib/audio';
import {
  AMENITY_LABEL_AR,
  POPULAR_SEARCHES,
  RENTAL_UNITS,
  ROOM_OPTIONS,
  SAKAN_IDENTITY,
  SAKAN_STATS,
  TOWER_FLOORS,
  floorHasVacancy,
  quoteFor,
  type RentalUnit,
} from '../../../data/rentalDemoData';
import { AMENITY_ICON, type RentalCtx } from './rentalContext';
import { BuildingModel } from './BuildingModel';
import { PhoneFrame } from './PhoneFrame';
import { RentalApp } from './RentalApp';
import {
  RentalFaqSection,
  RentalOwnerPage,
  RentalReviewsSection,
  RentalTrustSection,
} from './RentalSiteSections';

/**
 * Sakan, as a website.
 *
 * The half that answers "how does this look on a laptop". It is the same product as the app
 * next door and shares its bookings through `ctx`; what differs is what each shape is *for*.
 * The site can afford a filter panel, a wide gallery and a 3D building at 480px tall. The app
 * can afford a thumb.
 */

/**
 * The site's destinations, in nav order.
 *
 * `cta: true` marks the one that is an *action* rather than a place the visitor is browsing —
 * it renders as a filled button pinned to the end of the bar instead of another pill. A rental
 * marketplace has two customers, and the one who supplies the units will not find their page in
 * a row of tenant links; the pattern for this product type puts "list your property" in the
 * navbar for exactly that reason.
 *
 * The mobile drawer and the current-page label in the shell both read this same array, so a
 * destination added here appears in all three places without touching any of them.
 */
export const SITE_TABS: { id: string; label: string; cta?: boolean }[] = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'units', label: 'الشقق المتاحة' },
  { id: 'building', label: 'استكشف البناية' },
  { id: 'app', label: 'التطبيق' },
  { id: 'owner', label: 'أضف عقارك', cta: true },
];

interface RentalSiteDemoProps {
  ctx: RentalCtx;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  renderTopBar: () => React.ReactNode;
  /** The shared header's search box. One box drives the listing here and nothing else. */
  search: string;
  /** Writes back into that same box, so the hero field and the header field are one control
   *  rather than two that can disagree about what is being searched. */
  setSearch: (value: string) => void;
}

export const RentalSiteDemo: React.FC<RentalSiteDemoProps> = ({
  ctx,
  activeTab,
  setActiveTab,
  renderTopBar,
  search,
  setSearch,
}) => {
  const { price, accentHex, theme, isNarrow, book } = ctx;

  const tab = SITE_TABS.some((t) => t.id === activeTab) ? activeTab : 'home';

  const [rooms, setRooms] = useState(0);
  const [furnishedOnly, setFurnishedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [maxMonthly, setMaxMonthly] = useState(2400000);
  const [floor, setFloor] = useState<number | null>(null);

  const [detail, setDetail] = useState<RentalUnit | null>(null);
  const [shot, setShot] = useState(0);
  const [term, setTerm] = useState<'monthly' | 'daily'>('monthly');
  const [duration, setDuration] = useState(6);
  const [startDate, setStartDate] = useState('2026-09-01');
  const [done, setDone] = useState<{ unit: RentalUnit; total: number } | null>(null);

  const vacancy = useMemo(
    () => Array.from({ length: TOWER_FLOORS }, (_, i) => floorHasVacancy(i + 1)),
    []
  );

  const q = search.trim();
  const filtered = useMemo(
    () =>
      RENTAL_UNITS.filter(
        (u) =>
          (!availableOnly || u.available) &&
          (!furnishedOnly || u.furnished) &&
          (rooms === 0 || (rooms === 4 ? u.rooms >= 4 : u.rooms === rooms)) &&
          u.monthlyIQD <= maxMonthly &&
          (!q || u.title.includes(q) || u.code.includes(q) || u.district.includes(q) || String(u.floor) === q)
      ),
    [availableOnly, furnishedOnly, rooms, maxMonthly, q]
  );

  const floorUnits = useMemo(
    () => (floor === null ? [] : RENTAL_UNITS.filter((u) => u.floor === floor)),
    [floor]
  );

  const open = (u: RentalUnit) => {
    setDetail(u);
    setShot(0);
    setTerm('monthly');
    setDuration(6);
    cosmicAudio.playTick();
  };

  const confirm = () => {
    if (!detail) return;
    const quote = quoteFor(detail, term, duration);
    book({
      unitId: detail.id,
      unitTitle: detail.title,
      unitCode: detail.code,
      term,
      duration,
      startDate,
      totalIQD: quote.total,
      status: 'confirmed',
      source: 'site',
    });
    setDone({ unit: detail, total: quote.total });
    setDetail(null);
    cosmicAudio.playWarp();
  };

  /* ── shared pieces ────────────────────────────────────────────────────────────────────── */

  const UnitCard: React.FC<{ u: RentalUnit }> = ({ u }) => (
    <article className="group rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col">
      <button
        onClick={() => open(u)}
        className="relative block h-44 sm:h-48 overflow-hidden cursor-pointer text-right"
      >
        <img
          src={u.images[0]}
          alt={u.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900 to-transparent" />
        <span className="absolute top-3 right-3 flex gap-1.5">
          <span
            className="rounded-lg px-2 py-1 text-[10px] font-black"
            style={{ background: accentHex, color: '#0b0f17' }}
          >
            الطابق {u.floor}
          </span>
          {u.furnished && (
            <span className="rounded-lg bg-black/65 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
              مفروشة
            </span>
          )}
        </span>
        {!u.available && (
          <span className="absolute inset-0 grid place-items-center bg-black/65 text-xs font-black text-white/90">
            مؤجّرة حالياً
          </span>
        )}
      </button>

      <div className="p-4 flex-1 flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-black text-white leading-snug">{u.title}</h4>
          <span className="shrink-0 flex items-center gap-1 text-[11px] font-black text-amber-300">
            <Star className="w-3.5 h-3.5 fill-current" />
            {u.rating}
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {u.district} · {u.view}
        </p>
        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-300">
          <span className="rounded-lg bg-white/5 px-2 py-1">{u.rooms} غرف</span>
          <span className="rounded-lg bg-white/5 px-2 py-1">{u.baths} حمّام</span>
          <span className="rounded-lg bg-white/5 px-2 py-1">{u.area} م²</span>
        </div>
        <div className="mt-auto pt-2 flex items-end justify-between gap-2 border-t border-slate-800">
          <span className="pt-2">
            <span className="block text-[15px] font-black font-mono" style={{ color: accentHex }}>
              {price(u.monthlyIQD)}
            </span>
            <span className="block text-[10px] font-bold text-slate-500">شهرياً · أو {price(u.dailyIQD)} / ليلة</span>
          </span>
          <button
            onClick={() => open(u)}
            className={`shrink-0 min-h-11 px-4 rounded-xl text-[11px] font-black cursor-pointer transition-[filter] hover:brightness-110 ${theme.primaryBg} ${theme.onPrimary}`}
          >
            التفاصيل
          </button>
        </div>
      </div>
    </article>
  );

  const floorStrip = (
    // A fixed six-column grid rather than a wrapping row: wrapping put floors 12–3 on the first
    // line and 2–1 alone on the second, which reads as a broken list instead of a building.
    <div className="grid grid-cols-6 gap-1.5" dir="ltr">
      {Array.from({ length: TOWER_FLOORS }, (_, i) => TOWER_FLOORS - i).map((f) => {
        const free = vacancy[f - 1];
        const on = floor === f;
        return (
          <button
            key={f}
            onClick={() => {
              setFloor(on ? null : f);
              cosmicAudio.playTick();
            }}
            title={free ? `الطابق ${f} — فيه وحدات شاغرة` : `الطابق ${f} — مؤجّر بالكامل`}
            style={on ? { background: accentHex, color: '#0b0f17' } : undefined}
            className={`w-full h-10 rounded-xl text-xs font-black cursor-pointer transition-colors ${
              on ? '' : free ? 'bg-white/8 text-white hover:bg-white/15' : 'bg-white/[0.03] text-slate-600'
            }`}
          >
            {f}
          </button>
        );
      })}
    </div>
  );

  /* ── sections ─────────────────────────────────────────────────────────────────────────── */

  const home = (
    <div className="space-y-8 sm:space-y-12 animate-fade-in">
      <section className={`grid gap-6 ${isNarrow ? '' : 'lg:grid-cols-[1.05fr_1fr] lg:items-center'}`}>
        <div className="space-y-5">
          <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-black ${theme.badgeBg}`}>
            {SAKAN_IDENTITY.badge}
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-[1.12] tracking-tight">
            شقة جاهزة،
            <br />
            <span style={{ color: accentHex }}>وعقد يخلص اليوم.</span>
          </h2>
          <p className="max-w-md text-sm text-slate-300 leading-relaxed font-semibold">
            {SAKAN_IDENTITY.tagline} اختر الطابق من البناية نفسها، شوف الوحدات الشاغرة، واحجز
            بالشهر أو باليوم — من المتصفح أو من التطبيق، بنفس الحساب.
          </p>

          {/* حقل البحث الذي كان هنا حُذف: نفس الحقل موجود في ترويسة الموقع ويكتب في نفس
              الحالة — أي مربّعا بحث على شاشة واحدة يفعلان الشيء ذاته. ما بقي هو الاختصارات
              وحدها، وهي ليست تكراراً لشيء: تحوّل حقلاً فارغاً إلى ضغطة واحدة، وتقول للزائر ما
              الذي يمكن البحث عنه أصلاً. */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500">الأكثر بحثاً:</span>
            {POPULAR_SEARCHES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setSearch(p);
                  setActiveTab('units');
                  cosmicAudio.playTick();
                }}
                className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-300 cursor-pointer hover:bg-white/10 hover:text-white transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                setActiveTab('building');
                cosmicAudio.playTick();
              }}
              className="min-h-11 px-5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-black cursor-pointer hover:border-slate-600 transition-colors"
            >
              استكشف البناية ثلاثي الأبعاد
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            {SAKAN_STATS.map((s) => (
              <div key={s.label} className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
                <div className="text-lg font-black font-mono" style={{ color: accentHex }}>
                  {s.value}
                </div>
                <div className="text-[10px] font-bold text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* The building, as the hero image — and it is the filter. Clicking a floor here lands
            the visitor on that floor's units instead of scrolling them past a photograph. */}
        <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
          <BuildingModel
            accent={accentHex}
            selectedFloor={floor}
            onSelectFloor={(f) => {
              setFloor(f);
              if (f !== null) setActiveTab('building');
              cosmicAudio.playTick();
            }}
            vacancy={vacancy}
            className="h-[320px] sm:h-[420px] w-full"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white">وحدات شاغرة الآن</h3>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              {RENTAL_UNITS.filter((u) => u.available).length} وحدة جاهزة للاستلام خلال 48 ساعة
            </p>
          </div>
          <button
            onClick={() => setActiveTab('units')}
            className="shrink-0 text-[11px] font-black cursor-pointer"
            style={{ color: accentHex }}
          >
            كل الوحدات ←
          </button>
        </div>
        <div className={`grid gap-4 ${isNarrow ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {RENTAL_UNITS.filter((u) => u.available)
            .slice(0, 3)
            .map((u) => (
              <UnitCard key={u.id} u={u} />
            ))}
        </div>
      </section>

      {/* Trust before mechanics. The visitor who has just seen three units and a price is at the
          exact point where the question turns from "which one" to "is this real" — answering it
          after the how-it-works strip answers it a section too late. */}
      <RentalTrustSection ctx={ctx} />

      <section className="space-y-4">
        <h3 className="text-lg font-black text-white">كيف يشتغل</h3>
        <div className={`grid gap-3 ${isNarrow ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
          {[
            { n: '01', t: 'اختر الطابق', d: 'دور البناية واضغط الطابق — تطلع لك وحداته الشاغرة بس.' },
            { n: '02', t: 'حدد المدة', d: 'شهري أو يومي، والحساب يبيّن الإيجار والتأمين والخدمات قبل التوقيع.' },
            { n: '03', t: 'وقّع واستلم', d: 'عقد إلكتروني على حسابك، ومفتاح خلال 48 ساعة.' },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-2">
              <span className="text-2xl font-black font-mono" style={{ color: accentHex }}>
                {s.n}
              </span>
              <h4 className="text-sm font-black text-white">{s.t}</h4>
              <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className={`rounded-3xl border p-6 sm:p-8 grid gap-6 items-center ${theme.primaryBorder} bg-gradient-to-r ${theme.gradient} ${
          isNarrow ? '' : 'lg:grid-cols-[1fr_auto]'
        }`}
      >
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-[11px] font-black text-white">
            <Smartphone className="w-3.5 h-3.5" />
            نفس المنصة، بجيبك
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white leading-snug">
            التطبيق مو نسخة ثانية من الموقع — هو نفس الحساب ونفس الحجوزات.
          </h3>
          <ul className="space-y-2 text-[12px] font-semibold text-slate-200">
            {[
              'احجز من التطبيق، والحجز يظهر بحسابك على الموقع فوراً.',
              'إشعار قبل موعد الدفعة، وطلب صيانة بضغطة.',
              'نفس البناية ثلاثية الأبعاد داخل التطبيق.',
            ].map((l) => (
              <li key={l} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accentHex }} />
                {l}
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              setActiveTab('app');
              cosmicAudio.playPing();
            }}
            className="min-h-11 px-5 rounded-xl bg-white text-black text-xs font-black cursor-pointer hover:bg-slate-200 transition-colors"
          >
            جرّب التطبيق الآن
          </button>
        </div>

        {!isNarrow && (
          <PhoneFrame maxScale={0.42} className="h-[400px] w-[220px]">
            <RentalApp ctx={ctx} />
          </PhoneFrame>
        )}
      </section>

      <RentalReviewsSection ctx={ctx} />

      <RentalFaqSection ctx={ctx} />

      {/* The closing CTA, and the one aimed at the *other* customer. A visitor who has read this
          far and is not renting is very often the person with an empty unit. */}
      <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 flex flex-wrap items-center justify-between gap-5">
        <div className="space-y-1.5 min-w-0">
          <h3 className="text-lg sm:text-xl font-black text-white leading-snug">عندك شقة تريد تأجّرها؟</h3>
          <p className="text-[12px] font-semibold text-slate-400 leading-relaxed max-w-md">
            نعاين ونصوّر وننشر ونتولّى العقد والتحصيل — وأنت تحدد السعر.
          </p>
        </div>
        <button
          onClick={() => {
            setActiveTab('owner');
            cosmicAudio.playPing();
          }}
          className={`shrink-0 min-h-11 px-6 rounded-xl text-xs font-black cursor-pointer transition-[filter] hover:brightness-110 ${theme.primaryBg} ${theme.onPrimary}`}
        >
          سجّل وحدتك
        </button>
      </section>
    </div>
  );

  const units = (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-white">الشقق المتاحة</h3>
          <p className="text-[11px] font-bold text-slate-400 mt-0.5">
            {filtered.length} من {RENTAL_UNITS.length} وحدة
          </p>
        </div>
      </div>

      {/* The filter panel — the thing the site has room for and the app deliberately does not. */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1.5">
          <span className="block text-[10px] font-black text-slate-400">عدد الغرف</span>
          <select
            value={rooms}
            onChange={(e) => setRooms(Number(e.target.value))}
            className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-xs font-bold text-white cursor-pointer outline-none focus:border-slate-600"
          >
            {ROOM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="block text-[10px] font-black text-slate-400">
            أعلى إيجار شهري — {price(maxMonthly)}
          </span>
          <input
            type="range"
            min={500000}
            max={2400000}
            step={50000}
            value={maxMonthly}
            onChange={(e) => setMaxMonthly(Number(e.target.value))}
            className="w-full h-11 cursor-pointer"
            style={{ accentColor: accentHex }}
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-950 border border-slate-800 px-3 h-11 cursor-pointer">
          <span className="text-xs font-bold text-slate-200">مفروشة فقط</span>
          <input
            type="checkbox"
            checked={furnishedOnly}
            onChange={(e) => setFurnishedOnly(e.target.checked)}
            className="w-4 h-4 cursor-pointer"
            style={{ accentColor: accentHex }}
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-950 border border-slate-800 px-3 h-11 cursor-pointer">
          <span className="text-xs font-bold text-slate-200">الشاغرة فقط</span>
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="w-4 h-4 cursor-pointer"
            style={{ accentColor: accentHex }}
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-10 text-center space-y-2">
          <Search className="w-7 h-7 mx-auto text-slate-600" />
          <p className="text-sm font-black text-white">ماكو وحدة تطابق هذي الفلاتر</p>
          <p className="text-[11px] font-bold text-slate-400">جرّب ترفع سقف الإيجار أو تشيل شرط الفرش.</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${isNarrow ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {filtered.map((u) => (
            <UnitCard key={u.id} u={u} />
          ))}
        </div>
      )}
    </div>
  );

  const building = (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="text-lg font-black text-white">{SAKAN_IDENTITY.buildingName}</h3>
        <p className="text-[11px] font-bold text-slate-400 mt-0.5">
          اسحب لتدوير البناية، واضغط أي طابق لتشوف وحداته. الطوابق المضيّة بيها شقق شاغرة.
        </p>
      </div>

      <div className={`grid gap-5 ${isNarrow ? '' : 'lg:grid-cols-[1.25fr_1fr]'}`}>
        <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
          <BuildingModel
            accent={accentHex}
            selectedFloor={floor}
            onSelectFloor={setFloor}
            vacancy={vacancy}
            className="h-[360px] sm:h-[480px] w-full"
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <h4 className="text-xs font-black text-white">الطوابق</h4>
            {floorStrip}
            <div className="flex items-center gap-4 pt-1 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: accentHex }} />
                فيه شاغر
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-700" />
                مؤجّر بالكامل
              </span>
            </div>
          </div>

          {floor === null ? (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-2">
              <Building2 className="w-7 h-7 mx-auto text-slate-600" />
              <p className="text-xs font-black text-white">اختر طابقاً</p>
              <p className="text-[11px] font-bold text-slate-400">
                من البناية نفسها أو من شريط الطوابق فوك.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-black text-white">
                الطابق {floor} — {floorUnits.length} وحدة
              </p>
              {floorUnits.map((u) => (
                <button
                  key={u.id}
                  onClick={() => open(u)}
                  className="w-full text-right flex gap-3 rounded-2xl bg-slate-900 border border-slate-800 p-2.5 cursor-pointer hover:border-slate-700 transition-colors"
                >
                  <span className="w-24 h-20 rounded-xl overflow-hidden shrink-0 bg-black/40">
                    <img src={u.images[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </span>
                  <span className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <span className="block">
                      <span className="block text-xs font-black text-white truncate">{u.title}</span>
                      <span className="block text-[10px] font-bold text-slate-400 mt-0.5">
                        {u.rooms} غرف · {u.area} م² · {u.furnished ? 'مفروشة' : 'غير مفروشة'}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-black font-mono" style={{ color: accentHex }}>
                        {price(u.monthlyIQD)}
                      </span>
                      <span
                        className={`text-[10px] font-black ${u.available ? 'text-emerald-300' : 'text-slate-500'}`}
                      >
                        {u.available ? 'شاغرة' : 'مؤجّرة'}
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const app = (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h3 className="text-lg font-black text-white">التطبيق</h3>
        <p className="text-[11px] font-bold text-slate-400 mt-0.5">
          تطبيق شغّال فعلاً — جرّبه هنا داخل الجهاز، مو صورة.
        </p>
      </div>

      <div className={`grid gap-6 items-start ${isNarrow ? '' : 'lg:grid-cols-[auto_1fr]'}`}>
        <PhoneFrame maxScale={isNarrow ? 0.78 : 0.86} className="h-[560px] sm:h-[720px] w-full lg:w-[420px]">
          <RentalApp ctx={ctx} />
        </PhoneFrame>

        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h4 className="text-sm font-black text-white">شنو يفرق عن الموقع</h4>
            <ul className="space-y-2.5 text-[12px] font-semibold text-slate-300">
              {[
                'التنقل بالإبهام: شريط سفلي بأربعة أقسام بدل قائمة علوية.',
                'الحجز بثلاث ضغطات — بدون صفحة فلاتر منفصلة.',
                'إشعارات الدفعات ومواعيد انتهاء العقد.',
                'يشتغل على عرض واحد ثابت (390px) — مو موقع مضغوط.',
              ].map((l) => (
                <li key={l} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accentHex }} />
                  {l}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <h4 className="text-sm font-black text-white">شنو مشترك بينهم</h4>
            <ul className="space-y-2.5 text-[12px] font-semibold text-slate-300">
              {[
                'حساب واحد وحجوزات واحدة — احجز من هنا وافتح الموقع، الحجز موجود.',
                'نفس البناية ثلاثية الأبعاد ونفس بيانات الوحدات.',
                'نفس لون الهوية — بدّله من شريط المعاينة وشوفهم يتغيرون سوا.',
              ].map((l) => (
                <li key={l} className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accentHex }} />
                  {l}
                </li>
              ))}
            </ul>
          </div>

          <p className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-[11px] font-bold text-slate-400 leading-relaxed">
            التطبيق ضمن الباقة يُسلَّم لنظامي أندرويد و iOS، وينشر بحساب المتجر الخاص بالعميل.
          </p>
        </div>
      </div>
    </div>
  );

  /* ── the booking dialogue ─────────────────────────────────────────────────────────────── */

  const quote = detail ? quoteFor(detail, term, duration) : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      {renderTopBar()}

      {/* شريط تنقّل أفقي كان مكرَّراً هنا فوق نفس أقسام الموقع (SITE_TABS) — القائمة الجانبية
          (الدرج المفتوح من زر الهامبرغر في renderTopBar) تغطي نفس الوجهات بالضبط بلا أي
          استثناء (بما فيها زر المالك)، وظاهرة دائماً بلا أي شرط عرض شاشة — إزالته أزالت
          تكراراً كان يسبب تداخلاً مع باقي عناصر الصفحة. */}

      {tab === 'home' && home}
      {tab === 'units' && units}
      {tab === 'building' && building}
      {tab === 'app' && app}
      {tab === 'owner' && <RentalOwnerPage ctx={ctx} />}

      {detail && quote && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setDetail(null)} />
          <div
            data-lenis-prevent
            className="relative w-full sm:max-w-4xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl animate-fade-in"
          >
            <button
              onClick={() => setDetail(null)}
              aria-label="إغلاق"
              className="absolute top-4 left-4 z-10 w-10 h-10 grid place-items-center rounded-full bg-black/60 backdrop-blur-sm text-white cursor-pointer hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative h-56 sm:h-72">
              <img src={detail.images[shot]} alt={detail.title} className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent" />
              {detail.images.length > 1 && (
                <>
                  <button
                    onClick={() => setShot((s) => (s + 1) % detail.images.length)}
                    aria-label="الصورة التالية"
                    className="absolute top-1/2 -translate-y-1/2 left-3 w-10 h-10 grid place-items-center rounded-full bg-black/55 text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShot((s) => (s - 1 + detail.images.length) % detail.images.length)}
                    aria-label="الصورة السابقة"
                    className="absolute top-1/2 -translate-y-1/2 right-3 w-10 h-10 grid place-items-center rounded-full bg-black/55 text-white cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <div className={`p-5 sm:p-7 grid gap-6 ${isNarrow ? '' : 'lg:grid-cols-[1.4fr_1fr]'}`}>
              <div className="space-y-4 min-w-0">
                <div>
                  <h3 className="text-xl font-black text-white leading-snug">{detail.title}</h3>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <MapPin className="w-4 h-4 shrink-0" />
                    {detail.district} · الطابق {detail.floor} · {detail.view}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { icon: Bed, label: `${detail.rooms} غرف` },
                    { icon: Bath, label: `${detail.baths} حمّام` },
                    { icon: Maximize2, label: `${detail.area} م²` },
                    { icon: Layers, label: detail.furnished ? 'مفروشة' : 'غير مفروشة' },
                  ].map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2.5 text-[11px] font-bold text-slate-200"
                    >
                      <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                      {label}
                    </span>
                  ))}
                </div>

                <div>
                  <h4 className="text-xs font-black text-white">الخدمات المتوفرة</h4>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {detail.amenities.map((a) => {
                      const Icon = AMENITY_ICON[a];
                      return (
                        <span key={a} className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                          <Icon className="w-4 h-4 shrink-0" style={{ color: accentHex }} />
                          {AMENITY_LABEL_AR[a]}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* The quote. Every line of it before signing — deposit and service charge are the
                  two numbers a tenant is usually told about last, so they are told first here. */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 h-fit">
                <div className="grid grid-cols-2 gap-2">
                  {(['monthly', 'daily'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTerm(t);
                        setDuration(t === 'monthly' ? 6 : 3);
                        cosmicAudio.playTick();
                      }}
                      style={term === t ? { background: accentHex, color: '#0b0f17' } : undefined}
                      className={`min-h-11 rounded-xl text-[11px] font-black cursor-pointer transition-colors ${
                        term === t ? '' : 'bg-slate-950 border border-slate-800 text-slate-300'
                      }`}
                    >
                      {t === 'monthly' ? 'شهري' : 'يومي'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 px-3 h-12">
                  <span className="text-[11px] font-bold text-slate-300">
                    {term === 'monthly' ? 'عدد الأشهر' : 'عدد الليالي'}
                  </span>
                  <span className="flex items-center gap-2" dir="ltr">
                    <button
                      onClick={() => setDuration((d) => Math.max(1, d - 1))}
                      aria-label="أقل"
                      className="w-9 h-9 grid place-items-center rounded-lg bg-white/8 text-white cursor-pointer hover:bg-white/15 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-7 text-center text-sm font-black text-white font-mono">{duration}</span>
                    <button
                      onClick={() => setDuration((d) => Math.min(term === 'monthly' ? 24 : 30, d + 1))}
                      aria-label="أكثر"
                      className="w-9 h-9 grid place-items-center rounded-lg bg-white/8 text-white cursor-pointer hover:bg-white/15 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </span>
                </div>

                <label className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 px-3 h-12 focus-within:ring-2 focus-within:ring-white/30">
                  <span className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                    <CalendarDays className="w-4 h-4 shrink-0" />
                    تاريخ البداية
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    dir="ltr"
                    className="bg-transparent text-[11px] font-black text-white outline-none cursor-pointer"
                  />
                </label>

                <div className="space-y-1.5 pt-1">
                  <Row label={`الإيجار (${duration} ${term === 'monthly' ? 'شهر' : 'ليلة'})`} value={price(quote.rent)} />
                  {quote.service > 0 && <Row label="أجور الخدمات" value={price(quote.service)} />}
                  <Row label="التأمين (يُسترد)" value={price(quote.deposit)} />
                  <div className="pt-2.5 mt-1 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-black text-white">الإجمالي المستحق</span>
                    <span className="text-base font-black font-mono" style={{ color: accentHex }}>
                      {price(quote.total)}
                    </span>
                  </div>
                </div>

                <button
                  disabled={!detail.available}
                  onClick={confirm}
                  style={detail.available ? { background: accentHex, color: '#0b0f17' } : undefined}
                  className={`w-full min-h-12 rounded-xl text-xs font-black transition-[filter] ${
                    detail.available
                      ? 'cursor-pointer hover:brightness-110'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {detail.available ? 'تأكيد الحجز' : 'مؤجّرة حالياً'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {done && (
        <div className="fixed inset-0 z-[71] grid place-items-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDone(null)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-950 border border-slate-800 p-7 text-center space-y-3.5 animate-fade-in">
            <span
              className="w-16 h-16 mx-auto rounded-full grid place-items-center"
              style={{ background: `${accentHex}22` }}
            >
              <CheckCircle2 className="w-8 h-8" style={{ color: accentHex }} />
            </span>
            <h3 className="text-lg font-black text-white">تم تأكيد الحجز</h3>
            <p className="text-xs font-semibold text-slate-400 leading-relaxed">
              {done.unit.title} — الإجمالي {price(done.total)}. العقد الإلكتروني صار بحسابك، وتلكاه
              بالتطبيق بنفس اللحظة.
            </p>
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setDone(null)}
                className="flex-1 min-h-11 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-slate-200 cursor-pointer"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  setDone(null);
                  ctx.openAccount();
                }}
                style={{ background: accentHex, color: '#0b0f17' }}
                className="flex-1 min-h-11 rounded-xl text-xs font-black cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileSignature className="w-4 h-4" />
                حسابي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
    <span>{label}</span>
    <span className="font-mono text-white">{value}</span>
  </div>
);
