import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BatteryFull,
  Bath,
  Bed,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Heart,
  Layers,
  MapPin,
  Maximize2,
  Minus,
  Plus,
  Search,
  Signal,
  Sparkles,
  Star,
  Ticket,
  User,
  Wifi,
  Wrench,
  X,
} from 'lucide-react';
import { cosmicAudio } from '../../../lib/audio';
import {
  AMENITY_LABEL_AR,
  RENTAL_UNITS,
  SAKAN_IDENTITY,
  TOWER_FLOORS,
  floorHasVacancy,
  quoteFor,
  type RentalUnit,
} from '../../../data/rentalDemoData';
import { AMENITY_ICON, type IconComponent, type RentalCtx } from './rentalContext';
import { BuildingModel } from './BuildingModel';

/**
 * Sakan, as a phone app.
 *
 * Written against ONE width — 390px, the frame it lives in — with no responsive classes at all.
 * That constraint is what makes it read as an app rather than as a narrow website: nothing here
 * reflows, so every measurement is a decision instead of a fallback. The tab bar is 80px because
 * a thumb needs it, not because `sm:` stopped applying.
 *
 * It shares `ctx.bookings` with the website. Book a unit here, switch the preview to "الموقع",
 * open the account, and the booking is already there — one list, two front doors.
 */

const ACCENT_TEXT = '#0b0f17';

type Tab = 'explore' | 'building' | 'bookings' | 'account';

const TABS: Array<{ id: Tab; label: string; icon: IconComponent }> = [
  { id: 'explore', label: 'استكشف', icon: Search },
  { id: 'building', label: 'البناية', icon: Building2 },
  { id: 'bookings', label: 'حجوزاتي', icon: Ticket },
  { id: 'account', label: 'حسابي', icon: User },
];

const FILTERS: Array<{ id: string; label: string; test: (u: RentalUnit) => boolean }> = [
  { id: 'all', label: 'الكل', test: () => true },
  { id: 'furnished', label: 'مفروشة', test: (u) => u.furnished },
  { id: 'daily', label: 'إيجار يومي', test: (u) => u.dailyIQD > 0 && u.available },
  { id: 'two', label: 'غرفتين فأكثر', test: (u) => u.rooms >= 2 },
  { id: 'high', label: 'طوابق عليا', test: (u) => u.floor >= 8 },
];

export const RentalApp: React.FC<{ ctx: RentalCtx }> = ({ ctx }) => {
  const { price, accentHex, bookings, book } = ctx;

  const [tab, setTab] = useState<Tab>('explore');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [saved, setSaved] = useState<string[]>([]);
  const [floor, setFloor] = useState<number | null>(null);

  const [detail, setDetail] = useState<RentalUnit | null>(null);
  const [shot, setShot] = useState(0);
  const [booking, setBooking] = useState<RentalUnit | null>(null);
  const [term, setTerm] = useState<'monthly' | 'daily'>('monthly');
  const [duration, setDuration] = useState(6);
  const [startDate, setStartDate] = useState('2026-09-01');
  const [done, setDone] = useState<{ unit: RentalUnit; total: number } | null>(null);

  const vacancy = useMemo(
    () => Array.from({ length: TOWER_FLOORS }, (_, i) => floorHasVacancy(i + 1)),
    []
  );

  const list = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter) ?? FILTERS[0];
    const q = query.trim();
    return RENTAL_UNITS.filter(
      (u) =>
        f.test(u) &&
        (!q || u.title.includes(q) || u.code.includes(q) || u.district.includes(q) || String(u.floor) === q)
    );
  }, [filter, query]);

  const floorUnits = useMemo(
    () => (floor === null ? [] : RENTAL_UNITS.filter((u) => u.floor === floor)),
    [floor]
  );

  const openUnit = (u: RentalUnit) => {
    setDetail(u);
    setShot(0);
    cosmicAudio.playTick();
  };

  const startBooking = (u: RentalUnit) => {
    setBooking(u);
    setTerm('monthly');
    setDuration(6);
    cosmicAudio.playPing();
  };

  const confirm = () => {
    if (!booking) return;
    const q = quoteFor(booking, term, duration);
    book({
      unitId: booking.id,
      unitTitle: booking.title,
      unitCode: booking.code,
      term,
      duration,
      startDate,
      totalIQD: q.total,
      status: 'confirmed',
      source: 'app',
    });
    setDone({ unit: booking, total: q.total });
    setBooking(null);
    cosmicAudio.playWarp();
  };

  const toggleSave = (id: string) => {
    setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    cosmicAudio.playTick();
  };

  /* ── pieces ───────────────────────────────────────────────────────────────────────────── */

  const UnitRow: React.FC<{ u: RentalUnit }> = ({ u }) => (
    <button
      onClick={() => openUnit(u)}
      className="w-full text-right flex gap-3 rounded-2xl bg-white/[0.04] border border-white/8 p-2.5 cursor-pointer active:scale-[0.985] transition-transform"
    >
      <span className="relative w-[104px] h-[86px] rounded-xl overflow-hidden shrink-0 bg-black/40">
        <img src={u.images[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
        {!u.available && (
          <span className="absolute inset-0 grid place-items-center bg-black/65 text-[10px] font-black text-white/85">
            مؤجّرة
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
        <span className="block">
          <span className="flex items-center gap-1.5">
            <span className="text-[13px] font-black text-white truncate">{u.title}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
            <MapPin className="w-3 h-3 shrink-0" />
            {u.district} · الطابق {u.floor}
          </span>
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-black font-mono" style={{ color: accentHex }}>
            {price(u.monthlyIQD)}
            <span className="text-[9px] font-bold text-slate-500"> / شهر</span>
          </span>
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-300">
            <Star className="w-3 h-3 fill-current" />
            {u.rating}
          </span>
        </span>
      </span>
    </button>
  );

  const Spec: React.FC<{ icon: IconComponent; label: string }> = ({
    icon: Icon,
    label,
  }) => (
    <span className="flex items-center gap-1.5 rounded-xl bg-white/[0.05] px-2.5 py-2 text-[11px] font-bold text-slate-200">
      <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
      {label}
    </span>
  );

  /* ── screens ──────────────────────────────────────────────────────────────────────────── */

  const explore = (
    <div className="px-4 pb-6 space-y-4">
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-400">مساء الخير</p>
          <h1 className="text-[22px] font-black text-white leading-tight">لكيت شقتك؟</h1>
        </div>
        <span
          className="w-10 h-10 rounded-2xl grid place-items-center text-[13px] font-black shrink-0"
          style={{ background: accentHex, color: ACCENT_TEXT }}
        >
          {(ctx.account?.name ?? 'ض').charAt(0)}
        </span>
      </div>

      <label className="flex items-center gap-2.5 rounded-2xl bg-white/[0.06] border border-white/10 px-3.5 h-12">
        <Search className="w-4 h-4 shrink-0 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث برقم الشقة أو الطابق"
          className="flex-1 min-w-0 bg-transparent text-[13px] font-bold text-white placeholder:text-slate-500 outline-none"
        />
      </label>

      {/* Filters as a scrolling rail, which is the phone answer to a filter panel — the desktop
          site's sidebar does not exist here and pretending it does is how apps end up with a
          modal nobody opens. */}
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setFilter(f.id);
              cosmicAudio.playTick();
            }}
            style={filter === f.id ? { background: accentHex, color: ACCENT_TEXT } : undefined}
            className={`shrink-0 h-9 px-3.5 rounded-full text-[11px] font-black cursor-pointer transition-colors ${
              filter === f.id ? '' : 'bg-white/[0.06] text-slate-300 border border-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-black text-white">مميزة هذا الشهر</h2>
          <button
            onClick={() => setTab('building')}
            className="text-[11px] font-bold cursor-pointer"
            style={{ color: accentHex }}
          >
            شوف البناية
          </button>
        </div>
        <div className="mt-2.5 -mx-4 px-4 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {RENTAL_UNITS.filter((u) => u.available && u.rating >= 4.6).map((u) => (
            <button
              key={u.id}
              onClick={() => openUnit(u)}
              className="snap-start shrink-0 w-[236px] text-right rounded-3xl overflow-hidden bg-white/[0.04] border border-white/8 cursor-pointer active:scale-[0.985] transition-transform"
            >
              <span className="relative block h-[142px]">
                <img src={u.images[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/85 to-transparent" />
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSave(u.id);
                  }}
                  className="absolute top-2.5 left-2.5 w-8 h-8 grid place-items-center rounded-full bg-black/55 backdrop-blur-sm cursor-pointer"
                >
                  <Heart
                    className={`w-4 h-4 ${saved.includes(u.id) ? 'fill-rose-400 text-rose-400' : 'text-white'}`}
                  />
                </span>
                <span className="absolute bottom-2 right-3 text-[12px] font-black text-white">
                  الطابق {u.floor}
                </span>
              </span>
              <span className="block p-3">
                <span className="block text-[12.5px] font-black text-white truncate">{u.title}</span>
                <span className="mt-1.5 flex items-center justify-between">
                  <span className="text-[12px] font-black font-mono" style={{ color: accentHex }}>
                    {price(u.monthlyIQD)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{u.area}م² · {u.rooms} غرف</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <h2 className="text-[13px] font-black text-white">كل الوحدات ({list.length})</h2>
        {list.length === 0 ? (
          <p className="rounded-2xl bg-white/[0.04] p-5 text-center text-[11px] font-bold text-slate-400">
            ماكو نتائج تطابق بحثك.
          </p>
        ) : (
          list.map((u) => <UnitRow key={u.id} u={u} />)
        )}
      </div>
    </div>
  );

  const building = (
    <div className="pb-6">
      <div className="px-4 pt-1">
        <h1 className="text-[20px] font-black text-white leading-tight">{SAKAN_IDENTITY.buildingName}</h1>
        <p className="mt-1 text-[11px] font-bold text-slate-400">
          اضغط على الطابق لتشوف وحداته — المضيّة بيها شقق شاغرة.
        </p>
      </div>

      <BuildingModel
        accent={accentHex}
        selectedFloor={floor}
        onSelectFloor={(f) => {
          setFloor(f);
          cosmicAudio.playTick();
        }}
        vacancy={vacancy}
        className="h-[300px] w-full"
      />

      {/* The floor list, as a rail. It is the same control as the model and deliberately so:
          the model is the pleasure, this is the guarantee — one of them works with a thumb in
          a moving car, and one of them does not. */}
      <div className="-mx-0 px-4 flex gap-1.5 overflow-x-auto no-scrollbar" dir="ltr">
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
              style={on ? { background: accentHex, color: ACCENT_TEXT } : undefined}
              className={`shrink-0 w-11 h-11 rounded-2xl text-[12px] font-black cursor-pointer transition-colors ${
                on ? '' : free ? 'bg-white/[0.07] text-white' : 'bg-white/[0.03] text-slate-600'
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      <div className="px-4 mt-4 space-y-2.5">
        {floor === null ? (
          <p className="rounded-2xl bg-white/[0.04] p-5 text-center text-[11px] font-bold text-slate-400">
            اختر طابقاً من البناية أو من الشريط فوك.
          </p>
        ) : floorUnits.length === 0 ? (
          <p className="rounded-2xl bg-white/[0.04] p-5 text-center text-[11px] font-bold text-slate-400">
            ماكو وحدات معروضة بهذا الطابق حالياً.
          </p>
        ) : (
          floorUnits.map((u) => <UnitRow key={u.id} u={u} />)
        )}
      </div>
    </div>
  );

  const bookingsScreen = (
    <div className="px-4 pb-6 space-y-3">
      <h1 className="text-[20px] font-black text-white pt-1">حجوزاتي</h1>
      {bookings.length === 0 ? (
        <div className="rounded-3xl bg-white/[0.04] border border-white/8 p-6 text-center space-y-2">
          <Ticket className="w-8 h-8 mx-auto text-slate-500" />
          <p className="text-[12px] font-black text-white">لسه ماكو حجز</p>
          <p className="text-[11px] font-bold text-slate-400">اختر شقة من "استكشف" واحجزها بثلاث ضغطات.</p>
          <button
            onClick={() => setTab('explore')}
            style={{ background: accentHex, color: ACCENT_TEXT }}
            className="mt-1 h-11 px-5 rounded-2xl text-[12px] font-black cursor-pointer"
          >
            تصفّح الشقق
          </button>
        </div>
      ) : (
        bookings.map((b) => (
          <div key={b.id} className="rounded-2xl bg-white/[0.04] border border-white/8 p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-black text-white truncate">{b.unitTitle}</p>
                <p className="text-[10px] font-bold text-slate-400 font-mono" dir="ltr">
                  {b.unitCode} · {b.id}
                </p>
              </div>
              <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[9px] font-black text-emerald-300">
                <CheckCircle2 className="w-3 h-3" />
                مؤكد
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <span className="rounded-xl bg-black/25 py-2">
                <span className="block text-[10px] font-bold text-slate-500">المدة</span>
                <span className="block text-[11px] font-black text-white">
                  {b.duration} {b.term === 'monthly' ? 'شهر' : 'ليلة'}
                </span>
              </span>
              <span className="rounded-xl bg-black/25 py-2">
                <span className="block text-[10px] font-bold text-slate-500">البداية</span>
                <span className="block text-[11px] font-black text-white font-mono" dir="ltr">
                  {b.startDate}
                </span>
              </span>
              <span className="rounded-xl bg-black/25 py-2">
                <span className="block text-[10px] font-bold text-slate-500">الإجمالي</span>
                <span className="block text-[11px] font-black font-mono" style={{ color: accentHex }}>
                  {price(b.totalIQD)}
                </span>
              </span>
            </div>
            {/* Where it was made. The one line in the demo that states its own thesis. */}
            <p className="text-[9.5px] font-bold text-slate-500">
              أُنشئ من {b.source === 'app' ? 'التطبيق' : 'الموقع'} — ويظهر بالاثنين.
            </p>
          </div>
        ))
      )}
    </div>
  );

  const account = (
    <div className="px-4 pb-6 space-y-4">
      <h1 className="text-[20px] font-black text-white pt-1">حسابي</h1>

      <div className="rounded-3xl bg-white/[0.04] border border-white/8 p-4 flex items-center gap-3">
        <span
          className="w-12 h-12 rounded-2xl grid place-items-center text-[16px] font-black shrink-0"
          style={{ background: accentHex, color: ACCENT_TEXT }}
        >
          {(ctx.account?.name ?? 'ضيف').charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-black text-white truncate">
            {ctx.account?.name ?? 'زائر'}
          </span>
          <span className="block text-[10px] font-bold text-slate-400 truncate" dir="ltr">
            {ctx.account?.email ?? 'سجّل دخولك لحفظ حجوزاتك'}
          </span>
        </span>
        <button
          onClick={ctx.openAccount}
          className="shrink-0 h-9 px-3 rounded-xl bg-white/10 text-[11px] font-black text-white cursor-pointer"
        >
          {ctx.account ? 'إدارة' : 'دخول'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {[
          { icon: FileText, label: 'عقودي', value: `${bookings.length}` },
          { icon: Heart, label: 'المحفوظة', value: `${saved.length}` },
          { icon: Wrench, label: 'طلبات الصيانة', value: '0' },
          { icon: CalendarDays, label: 'الدفعة القادمة', value: '01/09' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl bg-white/[0.04] border border-white/8 p-3.5">
            <Icon className="w-4 h-4 text-slate-400" />
            <p className="mt-2 text-[16px] font-black text-white font-mono">{value}</p>
            <p className="text-[10px] font-bold text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white/[0.04] border border-white/8 divide-y divide-white/8">
        {['بياناتي الشخصية', 'طرق الدفع', 'الإشعارات', 'الدعم والمساعدة'].map((row) => (
          <button
            key={row}
            className="w-full flex items-center justify-between px-4 h-12 text-[12px] font-bold text-slate-200 cursor-pointer"
          >
            {row}
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
        ))}
      </div>

      <p className="text-center text-[10px] font-bold text-slate-600">
        {SAKAN_IDENTITY.name} — إصدار تجريبي 1.0
      </p>
    </div>
  );

  /* ── shell ────────────────────────────────────────────────────────────────────────────── */

  return (
    <div className="absolute inset-0 bg-[#0b0f17] text-slate-100 overflow-hidden" dir="rtl">
      {/* Status bar. Fake, obviously — but an app screenshot without one reads as a web page,
          and the whole point of this half of the demo is that it does not. */}
      <div className="absolute inset-x-0 top-0 h-[52px] z-20 flex items-end justify-between px-6 pb-1.5 pointer-events-none">
        <span className="text-[13px] font-black text-white font-mono" dir="ltr">
          9:41
        </span>
        <span className="flex items-center gap-1.5 text-white">
          <Signal className="w-3.5 h-3.5" />
          <Wifi className="w-3.5 h-3.5" />
          <BatteryFull className="w-5 h-5" />
        </span>
      </div>

      <div
        data-lenis-prevent
        className="absolute inset-0 pt-[56px] pb-[84px] overflow-y-auto overflow-x-hidden no-scrollbar"
      >
        {tab === 'explore' && explore}
        {tab === 'building' && building}
        {tab === 'bookings' && bookingsScreen}
        {tab === 'account' && account}
      </div>

      {/* Tab bar */}
      <div className="absolute inset-x-0 bottom-0 h-[84px] z-20 bg-[#0b0f17]/95 backdrop-blur-xl border-t border-white/8 px-3 pt-2">
        <div className="flex items-start justify-around">
          {TABS.map(({ id, label, icon: Icon }) => {
            const on = tab === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  cosmicAudio.playTick();
                }}
                className="flex-1 flex flex-col items-center gap-1 py-1.5 cursor-pointer"
              >
                <Icon
                  className="w-[22px] h-[22px] transition-colors"
                  style={{ color: on ? accentHex : '#64748b' }}
                />
                <span
                  className="text-[10px] font-black transition-colors"
                  style={{ color: on ? accentHex : '#64748b' }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Home indicator */}
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-[134px] rounded-full bg-white/30" />
      </div>

      {/* ── Unit detail, as a full-screen push ────────────────────────────────────────────── */}
      {detail && (
        <div className="absolute inset-0 z-30 bg-[#0b0f17] animate-fade-in flex flex-col">
          <div data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            <div className="relative h-[300px] shrink-0">
              <img src={detail.images[shot]} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b0f17] to-transparent" />
              <button
                onClick={() => setDetail(null)}
                aria-label="رجوع"
                className="absolute top-[60px] right-4 w-10 h-10 grid place-items-center rounded-full bg-black/55 backdrop-blur-sm text-white cursor-pointer"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => toggleSave(detail.id)}
                aria-label="حفظ"
                className="absolute top-[60px] left-4 w-10 h-10 grid place-items-center rounded-full bg-black/55 backdrop-blur-sm cursor-pointer"
              >
                <Heart
                  className={`w-5 h-5 ${saved.includes(detail.id) ? 'fill-rose-400 text-rose-400' : 'text-white'}`}
                />
              </button>
              {detail.images.length > 1 && (
                <>
                  <button
                    onClick={() => setShot((s) => (s + 1) % detail.images.length)}
                    aria-label="الصورة التالية"
                    className="absolute top-1/2 -translate-y-1/2 left-3 w-9 h-9 grid place-items-center rounded-full bg-black/50 text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShot((s) => (s - 1 + detail.images.length) % detail.images.length)}
                    aria-label="الصورة السابقة"
                    className="absolute top-1/2 -translate-y-1/2 right-3 w-9 h-9 grid place-items-center rounded-full bg-black/50 text-white cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {detail.images.map((_, i) => (
                      <span
                        key={i}
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: i === shot ? 16 : 6,
                          background: i === shot ? accentHex : 'rgba(255,255,255,0.45)',
                        }}
                      />
                    ))}
                  </span>
                </>
              )}
            </div>

            <div className="px-4 pb-8 -mt-6 space-y-4">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[19px] font-black text-white leading-tight">{detail.title}</h2>
                  <span className="shrink-0 flex items-center gap-1 text-[11px] font-black text-amber-300">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {detail.rating}
                    <span className="text-slate-500 font-bold">({detail.reviews})</span>
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {detail.district} · الطابق {detail.floor} · {detail.view}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Spec icon={Bed} label={`${detail.rooms} غرف نوم`} />
                <Spec icon={Bath} label={`${detail.baths} حمّام`} />
                <Spec icon={Maximize2} label={`${detail.area} م²`} />
                <Spec icon={Layers} label={detail.furnished ? 'مفروشة' : 'غير مفروشة'} />
              </div>

              <div>
                <h3 className="text-[12px] font-black text-white">الخدمات</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {detail.amenities.map((a) => {
                    const Icon = AMENITY_ICON[a];
                    return (
                      <span key={a} className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: accentHex }} />
                        {AMENITY_LABEL_AR[a]}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>الإيجار الشهري</span>
                  <span className="font-mono font-black text-white">{price(detail.monthlyIQD)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>الإيجار اليومي</span>
                  <span className="font-mono font-black text-white">{price(detail.dailyIQD)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>التأمين المسترد</span>
                  <span className="font-mono font-black text-white">{price(detail.depositIQD)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>أجور الخدمات / شهر</span>
                  <span className="font-mono font-black text-white">{price(detail.serviceIQD)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* The action bar. Pinned, because a price you have to scroll back up to find is a
              price the app is hiding. */}
          <div className="shrink-0 h-[84px] px-4 pt-3 border-t border-white/8 bg-[#0b0f17] flex items-center gap-3">
            <span className="min-w-0">
              <span className="block text-[15px] font-black font-mono text-white truncate">
                {price(detail.monthlyIQD)}
              </span>
              <span className="block text-[10px] font-bold text-slate-500">شهرياً</span>
            </span>
            <button
              disabled={!detail.available}
              onClick={() => startBooking(detail)}
              style={detail.available ? { background: accentHex, color: ACCENT_TEXT } : undefined}
              className={`flex-1 h-12 rounded-2xl text-[13px] font-black transition-transform active:scale-[0.98] ${
                detail.available ? 'cursor-pointer' : 'bg-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              {detail.available ? 'احجز الآن' : 'مؤجّرة حالياً'}
            </button>
          </div>
        </div>
      )}

      {/* ── Booking sheet ─────────────────────────────────────────────────────────────────── */}
      {booking && (
        <div className="absolute inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/65" onClick={() => setBooking(null)} />
          <div className="relative rounded-t-[28px] bg-[#121722] border-t border-white/10 p-5 pb-7 space-y-4 animate-fade-in">
            <span className="block mx-auto h-1 w-10 rounded-full bg-white/25" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] font-black text-white truncate">{booking.title}</h3>
                <p className="text-[10px] font-bold text-slate-400 font-mono" dir="ltr">
                  {booking.code}
                </p>
              </div>
              <button
                onClick={() => setBooking(null)}
                aria-label="إغلاق"
                className="w-8 h-8 grid place-items-center rounded-full bg-white/8 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['monthly', 'daily'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTerm(t);
                    setDuration(t === 'monthly' ? 6 : 3);
                    cosmicAudio.playTick();
                  }}
                  style={term === t ? { background: accentHex, color: ACCENT_TEXT } : undefined}
                  className={`h-11 rounded-2xl text-[12px] font-black cursor-pointer transition-colors ${
                    term === t ? '' : 'bg-white/[0.06] text-slate-300'
                  }`}
                >
                  {t === 'monthly' ? 'إيجار شهري' : 'إيجار يومي'}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 h-14">
              <span className="text-[12px] font-bold text-slate-300">
                {term === 'monthly' ? 'عدد الأشهر' : 'عدد الليالي'}
              </span>
              <span className="flex items-center gap-3">
                <button
                  onClick={() => setDuration((d) => Math.max(1, d - 1))}
                  aria-label="أقل"
                  className="w-9 h-9 grid place-items-center rounded-xl bg-white/10 text-white cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center text-[15px] font-black text-white font-mono">{duration}</span>
                <button
                  onClick={() => setDuration((d) => Math.min(term === 'monthly' ? 24 : 30, d + 1))}
                  aria-label="أكثر"
                  className="w-9 h-9 grid place-items-center rounded-xl bg-white/10 text-white cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </span>
            </div>

            <label className="flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 h-14">
              <span className="text-[12px] font-bold text-slate-300">تاريخ البداية</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-[12px] font-black text-white outline-none cursor-pointer"
                dir="ltr"
              />
            </label>

            {(() => {
              const q = quoteFor(booking, term, duration);
              return (
                <div className="rounded-2xl bg-black/30 p-4 space-y-1.5">
                  <Line label={`الإيجار (${duration} ${term === 'monthly' ? 'شهر' : 'ليلة'})`} value={price(q.rent)} />
                  {q.service > 0 && <Line label="أجور الخدمات" value={price(q.service)} />}
                  <Line label="التأمين (يُسترد)" value={price(q.deposit)} />
                  <div className="pt-2 mt-1 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[12px] font-black text-white">الإجمالي المستحق</span>
                    <span className="text-[15px] font-black font-mono" style={{ color: accentHex }}>
                      {price(q.total)}
                    </span>
                  </div>
                </div>
              );
            })()}

            <button
              onClick={confirm}
              style={{ background: accentHex, color: ACCENT_TEXT }}
              className="w-full h-[52px] rounded-2xl text-[13px] font-black cursor-pointer active:scale-[0.98] transition-transform"
            >
              تأكيد الحجز
            </button>
          </div>
        </div>
      )}

      {/* ── Confirmation ──────────────────────────────────────────────────────────────────── */}
      {done && (
        <div className="absolute inset-0 z-50 bg-[#0b0f17] flex flex-col items-center justify-center gap-4 px-8 text-center animate-fade-in">
          <span
            className="w-20 h-20 rounded-full grid place-items-center"
            style={{ background: `${accentHex}22` }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: accentHex }} />
          </span>
          <h3 className="text-[19px] font-black text-white">انحجزت!</h3>
          <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
            {done.unit.title} — الإجمالي {price(done.total)}. راح توصلك رسالة تأكيد وعقد إلكتروني
            على حسابك.
          </p>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <Sparkles className="w-3.5 h-3.5" />
            نفس الحجز راح يظهر بالموقع بحسابك
          </div>
          <button
            onClick={() => {
              setDone(null);
              setDetail(null);
              setTab('bookings');
            }}
            style={{ background: accentHex, color: ACCENT_TEXT }}
            className="mt-1 h-12 px-6 rounded-2xl text-[13px] font-black cursor-pointer"
          >
            شوف حجوزاتي
          </button>
        </div>
      )}
    </div>
  );
};

const Line: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
    <span>{label}</span>
    <span className="font-mono text-white">{value}</span>
  </div>
);
