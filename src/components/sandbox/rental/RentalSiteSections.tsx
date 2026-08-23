import React, { useState } from 'react';
import {
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  FileSignature,
  Send,
  ShieldCheck,
  Star,
  Wallet,
  Wrench,
} from 'lucide-react';
import { cosmicAudio } from '../../../lib/audio';
import {
  OWNER_STEPS,
  SAKAN_FAQ,
  SAKAN_IDENTITY,
  SAKAN_OWNER_BENEFITS,
  SAKAN_REVIEWS,
  SAKAN_TRUST,
} from '../../../data/rentalDemoData';
import type { RentalCtx } from './rentalContext';

/**
 * The parts of Sakan that are a *site* rather than a listings grid.
 *
 * ## Why these exist at all
 *
 * The demo could show units and stop, and for a long time it did. But a rental marketplace is not
 * bought the way a shop is: the visitor's question is not "how much" but "is this real, and what
 * happens if it goes wrong". A grid of rooms and prices cannot answer that, so a visitor who has
 * that question either phones or leaves — and a template that only handles the visitors who
 * already trust it is demonstrating the easy half of the problem.
 *
 * So: the guarantees written down (Trust), other tenants' words with a unit number attached
 * (Reviews), the objections answered in the open (FAQ), and the half of the market that supplies
 * the inventory rather than consuming it (Owner).
 *
 * ## Why they live in their own file
 *
 * RentalSiteDemo is the booking machine — filters, quotes, the 3D building, the dialogue. These
 * are static content sections that never touch that state. Keeping them apart means the file you
 * open to change a guarantee is not the file that prices a lease.
 *
 * Everything here takes its colour from `ctx` rather than hard-coding one, so the section follows
 * whichever palette the sandbox is set to, exactly as the rest of the demo does.
 */

interface SectionProps {
  ctx: RentalCtx;
}

/** Lucide marks for the four guarantees, keyed to TrustFact.key so the data stays text-only. */
const TRUST_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  verified: Camera,
  deposit: Wallet,
  contract: FileSignature,
  support: Wrench,
};

/** A section heading with a lead line under it, at the one scale every section here uses. */
const SectionHead: React.FC<{ title: string; lead: string; accentHex: string; kicker: string }> = ({
  title,
  lead,
  accentHex,
  kicker,
}) => (
  <header className="space-y-2 max-w-xl">
    <span className="text-[10px] font-black tracking-[0.22em] uppercase" style={{ color: accentHex }}>
      {kicker}
    </span>
    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">{title}</h3>
    <p className="text-[12px] sm:text-[13px] font-semibold text-slate-400 leading-relaxed">{lead}</p>
  </header>
);

/* ── Trust & Safety ─────────────────────────────────────────────────────────────────────────
   The pattern's fourth section and the one this product most needs. Four commitments, each
   phrased as something a tenant can hold the company to — a date, a number, a window — rather
   than an adjective. "التأمين مسترجع خلال 7 أيام" is checkable; "خدمة ممتازة" is not. */

export const RentalTrustSection: React.FC<SectionProps> = ({ ctx }) => {
  const { accentHex, isNarrow } = ctx;

  return (
    <section className="space-y-5" aria-labelledby="sakan-trust">
      <div id="sakan-trust">
        <SectionHead
          kicker="ضمانات"
          title="ليش تأمن على سَكَن"
          lead="كل واحدة من هذي التزام مكتوب، تگدر ترجع له إذا صار خلاف — مو وعد عام."
          accentHex={accentHex}
        />
      </div>

      <div className={`grid gap-3 ${isNarrow ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        {SAKAN_TRUST.map((t) => {
          const Icon = TRUST_ICON[t.key] ?? ShieldCheck;
          return (
            <article
              key={t.key}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3 hover:border-slate-700 transition-colors"
            >
              <span
                className="grid place-items-center w-11 h-11 rounded-xl"
                style={{ background: `${accentHex}1f`, color: accentHex }}
                aria-hidden="true"
              >
                <Icon className="w-5 h-5" />
              </span>
              <h4 className="text-sm font-black text-white leading-snug">{t.title}</h4>
              <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">{t.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
};

/* ── Reviews ────────────────────────────────────────────────────────────────────────────────
   Social proof with a unit number and a length of stay on it. The specificity is the whole
   point: "ساكنة من 8 أشهر — شقة 802" is a claim someone could check, and that is what separates
   a review a visitor believes from one they scroll past. */

export const RentalReviewsSection: React.FC<SectionProps> = ({ ctx }) => {
  const { accentHex, isNarrow } = ctx;

  return (
    <section className="space-y-5" aria-labelledby="sakan-reviews">
      <div id="sakan-reviews">
        <SectionHead
          kicker="آراء المستأجرين"
          title="شنو يگولون الساكنين"
          lead="تقييمات من مستأجرين حاليين في المجمّع، مع رقم الوحدة ومدة السكن."
          accentHex={accentHex}
        />
      </div>

      <div className={`grid gap-3 ${isNarrow ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
        {SAKAN_REVIEWS.map((r) => (
          <figure
            key={r.name}
            className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-col gap-3"
          >
            <div className="flex items-center gap-0.5" aria-label={`${r.rating} من 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-current text-amber-300' : 'text-slate-700'}`}
                  aria-hidden="true"
                />
              ))}
            </div>

            <blockquote className="flex-1 text-[12px] font-semibold text-slate-300 leading-relaxed">
              {r.body}
            </blockquote>

            <figcaption className="pt-3 border-t border-slate-800 flex items-center gap-2.5">
              <span
                className="grid place-items-center w-9 h-9 rounded-full text-[11px] font-black shrink-0"
                style={{ background: `${accentHex}22`, color: accentHex }}
                aria-hidden="true"
              >
                {r.name.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-[11px] font-black text-white">
                  {r.name}
                  <BadgeCheck className="w-3.5 h-3.5 shrink-0" style={{ color: accentHex }} aria-hidden="true" />
                </span>
                <span className="block text-[10px] font-bold text-slate-500 truncate">
                  {r.unit} · {r.stay}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};

/* ── FAQ ────────────────────────────────────────────────────────────────────────────────────
   Progressive disclosure: five questions, one open at a time, answers closed by default so the
   block reads as a list rather than a wall.

   The panel is mounted/unmounted rather than animated open. A height transition on text is a
   layout animation — it reflows every frame it runs, and on the weakest phone the demo has to
   survive that is the frame budget gone. A fade on an already-sized box is not. */

export const RentalFaqSection: React.FC<SectionProps> = ({ ctx }) => {
  const { accentHex } = ctx;
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="space-y-5" aria-labelledby="sakan-faq">
      <div id="sakan-faq">
        <SectionHead
          kicker="أسئلة متكررة"
          title="الأسئلة اللي توصلنا كل يوم"
          lead="إذا سؤالك مو هنا، اتصل بينا — الرقم بأسفل الصفحة."
          accentHex={accentHex}
        />
      </div>

      <ul className="rounded-2xl bg-slate-900 border border-slate-800 divide-y divide-slate-800 overflow-hidden">
        {SAKAN_FAQ.map((f, i) => {
          const isOpen = open === i;
          return (
            <li key={f.q}>
              <h4>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(isOpen ? null : i);
                    cosmicAudio.playTick();
                  }}
                  aria-expanded={isOpen}
                  aria-controls={`sakan-faq-panel-${i}`}
                  className="w-full min-h-12 px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-right cursor-pointer hover:bg-white/[0.03] transition-colors"
                >
                  <span className="text-[12px] sm:text-[13px] font-black text-white leading-snug">{f.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    style={{ color: isOpen ? accentHex : undefined }}
                    aria-hidden="true"
                  />
                </button>
              </h4>
              {isOpen && (
                <div id={`sakan-faq-panel-${i}`} className="px-4 sm:px-5 pb-4 -mt-1 animate-fade-in">
                  <p className="text-[11.5px] font-semibold text-slate-400 leading-relaxed max-w-2xl">{f.a}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

/* ── Owner page ─────────────────────────────────────────────────────────────────────────────
   The pattern's "become a host" destination, and the half of a marketplace a listings-only demo
   forgets: someone has to supply the units. It is a full page rather than a band on the home
   page because the person reading it wants different things — yield, paperwork, control — and
   putting that in a strip under the tenant copy serves neither.

   The form is a demo and says so on submit. It still does the things a real one must: every
   field carries a VISIBLE label rather than a placeholder standing in for one (a placeholder
   disappears the moment typing starts, which is exactly when the label is needed), and the
   success state replaces the form instead of appearing above it. */

export const RentalOwnerPage: React.FC<SectionProps> = ({ ctx }) => {
  const { accentHex, theme, isNarrow } = ctx;
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', district: '', rooms: '2', rent: '' });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const field =
    'w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-xs font-bold text-white outline-none focus:border-slate-600 transition-colors';
  const labelText = 'block text-[10px] font-black text-slate-400';

  return (
    <div className="space-y-8 sm:space-y-12 animate-fade-in">
      {/* The pitch. Oversized and short — an owner decides whether to keep reading in one line. */}
      <section
        className={`rounded-3xl border p-6 sm:p-9 grid gap-6 items-center ${theme.primaryBorder} bg-gradient-to-r ${theme.gradient} ${
          isNarrow ? '' : 'lg:grid-cols-[1.15fr_1fr]'
        }`}
      >
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-[11px] font-black text-white">
            <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
            لأصحاب العقارات
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white leading-[1.12] tracking-tight">
            عندك شقة فارغة؟
            <br />
            <span style={{ color: accentHex }}>خلّيها تأجّر نفسها.</span>
          </h2>
          <p className="max-w-md text-[13px] font-semibold text-slate-200 leading-relaxed">
            نحن نعاين ونصوّر وننشر ونتولّى العقد والتحصيل. أنت تحدد السعر، وتستلم دفعتك بموعد
            ثابت كل شهر.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {['بدون رسوم تسجيل', 'معاينة خلال 3 أيام', 'تصوير على حسابنا'].map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-lg bg-black/25 px-2.5 py-1.5 text-[11px] font-bold text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: accentHex }} aria-hidden="true" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* The three steps, stacked beside the pitch rather than under it — an owner reading this
            wants to know what the process costs them in time before they read any benefit. */}
        <ol className="space-y-2.5">
          {OWNER_STEPS.map((s) => (
            <li key={s.n} className="flex items-start gap-3 rounded-2xl bg-black/25 p-3.5">
              <span
                className="grid place-items-center w-9 h-9 rounded-xl text-[12px] font-black font-mono shrink-0"
                style={{ background: accentHex, color: '#0b0f17' }}
                aria-hidden="true"
              >
                {s.n}
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-black text-white">{s.t}</span>
                <span className="block text-[10.5px] font-semibold text-slate-300 leading-relaxed mt-0.5">
                  {s.d}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-5" aria-labelledby="sakan-owner-benefits">
        <div id="sakan-owner-benefits">
          <SectionHead
            kicker="ليش عبر سَكَن"
            title="شنو تاخذ مقابل ما تعطي"
            lead="نحن ما نشتري وحدتك ولا نسعّرها — ننشرها ونديرها، والقرار يبقى إلك."
            accentHex={accentHex}
          />
        </div>

        <div className={`grid gap-3 ${isNarrow ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
          {SAKAN_OWNER_BENEFITS.map((b) => (
            <article
              key={b.key}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-2 hover:border-slate-700 transition-colors"
            >
              <h4 className="flex items-start gap-2 text-sm font-black text-white leading-snug">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accentHex }} aria-hidden="true" />
                {b.title}
              </h4>
              <p className="text-[11px] font-semibold text-slate-400 leading-relaxed ps-6">{b.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* The form. Five fields — anything longer and an owner who is only half-decided closes it. */}
      <section className="space-y-5" aria-labelledby="sakan-owner-form">
        <div id="sakan-owner-form">
          <SectionHead
            kicker="ابدأ"
            title="سجّل وحدتك"
            lead="املأ البيانات ونتواصل وياك خلال يوم عمل واحد لترتيب المعاينة."
            accentHex={accentHex}
          />
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6">
          {sent ? (
            <div className="py-8 text-center space-y-3 animate-fade-in" role="status">
              <span
                className="mx-auto grid place-items-center w-14 h-14 rounded-full"
                style={{ background: `${accentHex}22`, color: accentHex }}
                aria-hidden="true"
              >
                <CheckCircle2 className="w-7 h-7" />
              </span>
              <h4 className="text-base font-black text-white">وصلنا طلبك</h4>
              <p className="text-[12px] font-semibold text-slate-400 max-w-sm mx-auto leading-relaxed">
                هذا نموذج تجريبي داخل القالب — ما تم إرسال أي بيانات فعلياً. بالموقع الحقيقي يوصل
                الطلب لفريق المعاينة مباشرة.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setForm({ name: '', phone: '', district: '', rooms: '2', rent: '' });
                }}
                className="min-h-11 px-5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-black cursor-pointer hover:border-slate-600 transition-colors"
              >
                إرسال طلب ثاني
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
                cosmicAudio.playWarp();
              }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <label className="space-y-1.5">
                <span className={labelText}>الاسم الكامل</span>
                <input required value={form.name} onChange={set('name')} className={field} autoComplete="name" />
              </label>

              <label className="space-y-1.5">
                <span className={labelText}>رقم الهاتف</span>
                <input
                  required
                  dir="ltr"
                  inputMode="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  className={`${field} text-right`}
                  autoComplete="tel"
                />
              </label>

              <label className="space-y-1.5">
                <span className={labelText}>المنطقة</span>
                <input required value={form.district} onChange={set('district')} className={field} />
              </label>

              <label className="space-y-1.5">
                <span className={labelText}>عدد الغرف</span>
                <select value={form.rooms} onChange={set('rooms')} className={`${field} cursor-pointer`}>
                  {['1', '2', '3', '4'].map((n) => (
                    <option key={n} value={n}>
                      {n === '4' ? '4 غرف أو أكثر' : n === '1' ? 'غرفة واحدة' : `${n} غرف`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className={labelText}>الإيجار الشهري المطلوب (دينار)</span>
                <input required inputMode="numeric" value={form.rent} onChange={set('rent')} className={field} />
                <span className="block text-[10px] font-semibold text-slate-500 pt-0.5">
                  تگدر تغيّره بعد المعاينة — هذا رقم مبدئي حتى نعرف السوق اللي تستهدفه.
                </span>
              </label>

              <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  className={`inline-flex items-center gap-2 min-h-11 px-6 rounded-xl text-xs font-black cursor-pointer transition-[filter] hover:brightness-110 ${theme.primaryBg} ${theme.onPrimary}`}
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  أرسل الطلب
                </button>
                <span className="text-[10px] font-semibold text-slate-500">
                  أو اتصل مباشرة: <span dir="ltr">{SAKAN_IDENTITY.contact.phone}</span>
                </span>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};
