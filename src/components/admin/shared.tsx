// Small pieces every admin tab reuses: the status ordering, presentational primitives, the
// mobile bottom tab bar + its overflow sheet, and the shape of the stats the shell computes
// once and hands down. Split out of AdminDashboard.tsx so each tab file imports what it needs
// instead of all of them living in one module.

import React from 'react';
import { createPortal } from 'react-dom';
import { ContractData } from '../../types';

export const STATUS_FLOW: ContractData['status'][] = ['submitted', 'under_review', 'in_development', 'completed'];

export const PAYMENT_STATUS_FLOW: NonNullable<ContractData['paymentStatus']>[] = ['unpaid', 'partial', 'paid'];

// Icons are typed as "a component accepting className" rather than React.ElementType — the
// one prop actually passed at every call site, named explicitly instead of accepting anything
// renderable.
export function StatTile({ icon: Icon, label, value, accent, tint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: string; tint?: string }) {
  // Financial figures (profit/loss, totals) can run to 8+ digits — a fixed text-xl with
  // `truncate` silently clipped those behind an ellipsis, hiding the actual number. A smaller,
  // responsive size plus wrapping instead of truncating means a big number is always fully
  // readable (on up to two lines if it has to), never cut off.
  //
  // `tint` colour-codes the icon chip per metric (money = Orange, cost = a warm red-tint, etc.)
  // instead of every tile wearing the same neutral white chip — a glance at the icon column now
  // tells you which KIND of number you're looking at before you've read the label.
  return (
    <div className="p-4 rounded-3xl bg-paper border border-ink/10 flex items-center justify-between gap-3">
      <div className="space-y-1 min-w-0 flex-1">
        <span className="text-[11px] text-ink/60 block font-medium truncate">{label}</span>
        <div className={`text-base sm:text-lg lg:text-xl font-extrabold font-mono leading-tight wrap-break-word ${accent || 'text-ink'}`}>{value}</div>
      </div>
      <div
        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${tint ? '' : 'bg-white/70 border border-ink/10 text-ink'}`}
        style={tint ? { background: `${tint}1a`, color: tint } : undefined}
      >
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

/**
 * One figure, as a small pill — for the horizontally-scrolling strip across the top of the
 * mobile shell. Four figures in a static 2-column grid on a phone meant two full rows before any
 * actual tab content; a scrolling strip of chips is the same information at a fraction of the
 * height, and it is the pattern a phone user already knows from every native app's own metrics
 * carousel — swipe sideways past what you don't need right now instead of scrolling past it.
 */
export function StatChip({ icon: Icon, label, value, tint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tint: string }) {
  return (
    <div className="shrink-0 min-w-[9.5rem] p-3 rounded-2xl bg-paper border border-ink/10 flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${tint}1a`, color: tint }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <span className="text-[9px] text-ink/55 block font-semibold truncate">{label}</span>
        <span className="text-xs font-extrabold font-mono text-ink block leading-tight truncate">{value}</span>
      </div>
    </div>
  );
}

export function TabButton({
  tabItem,
  active,
  onClick,
  full,
}: {
  tabItem: { id: string; label: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
  onClick: () => void;
  full?: boolean;
}) {
  const Icon = tabItem.icon;
  return (
    <button
      onClick={onClick}
      className={`${full ? 'w-full' : ''} px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all border ${
        active
          ? 'bg-white/90 border-white text-ink'
          : 'bg-paper border-ink/10 text-ink/60 hover:text-ink'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{tabItem.label}</span>
    </button>
  );
}

/**
 * A figure with its label, for the strip that runs across the top of every admin tab.
 *
 * Deliberately not StatTile: that carries an icon and a heavy bordered card, which is right for a
 * grid of six on the overview page and far too loud repeated above every screen. This is the same
 * information with the chrome removed — the numbers are the point, the boxes were never.
 */
export function KpiCell({ label, value, accent, hint }: { label: string; value: string; accent?: string; hint?: string }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <span className="text-[10px] uppercase tracking-wide text-ink/50 block font-semibold truncate">{label}</span>
      <div className={`text-sm sm:text-base font-extrabold font-mono leading-tight wrap-break-word mt-0.5 ${accent || 'text-ink'}`}>
        {value}
      </div>
      {hint && <span className="text-[10px] text-ink/50 block mt-0.5 truncate">{hint}</span>}
    </div>
  );
}

/**
 * How much of an agreed amount has actually been collected, as a bar.
 *
 * A "collected" figure and a "remaining" figure sitting side by side state the same fact twice and
 * still leave the reader doing the division. One bar answers "where does this contract stand"
 * before any number is read, which is the question the panel exists to answer.
 */
export function CollectionBar({ collected, total, isAr }: { collected: number; total: number; isAr: boolean }) {
  const pct = total > 0 ? Math.min(100, Math.round((collected / total) * 100)) : 0;
  const done = pct >= 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-semibold">
        <span className="text-ink/50">{isAr ? 'نسبة التحصيل' : 'Collected'}</span>
        <span className={`font-mono ${done ? 'text-emerald-700' : pct > 0 ? 'text-amber-700' : 'text-ink/50'}`}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-paper border border-ink/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${done ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${pct}%`, [isAr ? 'marginLeft' : 'marginRight']: 'auto' }}
        />
      </div>
    </div>
  );
}

export function BarRow({ label, count, total, isAr }: { label: string; count: number; total: number; isAr: boolean }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink/75 truncate">{label}</span>
        <span className="text-ink/60 font-mono shrink-0">{count} ({pct}%)</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/70 overflow-hidden">
        <div className={`h-full bg-white/70 rounded-full`} style={{ width: `${pct}%`, [isAr ? 'marginLeft' : 'marginRight']: 'auto' }} />
      </div>
    </div>
  );
}

export interface TabGroup {
  heading: string;
  items: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

/**
 * The mobile shell's real navigation now — a fixed bottom bar, the pattern every native app
 * already trained the admin to reach for with a thumb, replacing the horizontally-scrolling row
 * of pills. The row worked but never felt like an app: it read as a strip of desktop tab buttons
 * that happened to overflow, not as a destination picker. Four slots — the three tabs actually
 * opened every day (Overview/Contracts/Pricing), and "More" for the rest.
 *
 * Portaled to `<body>`, same reason as `LogoutConfirmDialog`: both dashboards mount inside the
 * page's `.page-in` entrance-animation wrapper, and a non-`none` `transform` left on that
 * wrapper after the animation finishes makes it the containing block for anything `fixed`
 * inside it — a bar built without the portal sizes and positions itself against that tall
 * content div instead of the real viewport.
 */
export function BottomTabBar({
  primary,
  active,
  onSelect,
  onMore,
  moreActive,
  isAr,
}: {
  primary: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  active: string;
  onSelect: (id: string) => void;
  onMore: () => void;
  moreActive: boolean;
  isAr: boolean;
}) {
  return createPortal(
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/85 backdrop-blur-xl border-t border-ink/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid gap-1 px-1 py-1.5" style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}>
        {primary.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id && !moreActive;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl cursor-pointer transition-colors"
            >
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-periwinkle/15 text-periwinkle' : 'text-ink/50'}`}>
                <Icon className="w-4.5 h-4.5" />
              </span>
              <span className={`text-[9px] font-bold truncate max-w-full ${isActive ? 'text-ink' : 'text-ink/50'}`}>{t.label}</span>
            </button>
          );
        })}
        <button
          onClick={onMore}
          className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl cursor-pointer transition-colors"
        >
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${moreActive ? 'bg-periwinkle/15 text-periwinkle' : 'text-ink/50'}`}>
            <MoreDotsIcon className="w-4.5 h-4.5" />
          </span>
          <span className={`text-[9px] font-bold ${moreActive ? 'text-ink' : 'text-ink/50'}`}>{isAr ? 'المزيد' : 'More'}</span>
        </button>
      </div>
    </nav>,
    document.body
  );
}

function MoreDotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

/**
 * Where the bottom bar's "More" button opens: a sheet sliding up from the bottom, holding every
 * tab that isn't one of the bar's own three primaries — grouped exactly like the desktop
 * sidebar's own groups, so the two navigations describe the same map of the panel rather than
 * two different ones that happen to reach the same screens.
 */
export function MoreSheet({
  groups,
  active,
  onSelect,
  onClose,
  isAr,
}: {
  groups: TabGroup[];
  active: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  isAr: boolean;
}) {
  return createPortal(
    <div
      className="lg:hidden fixed inset-0 z-100 flex items-end bg-ink/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[75svh] overflow-y-auto bg-paper rounded-t-3xl border-t border-ink/10 shadow-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] space-y-5 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-ink/15 mx-auto" aria-hidden="true" />
        {groups.map((g) => (
          <div key={g.heading} className="space-y-1.5">
            <span className="px-1 text-[10px] uppercase tracking-wider font-bold text-ink/40 block">{g.heading}</span>
            <div className="grid grid-cols-2 gap-2">
              {g.items.map((t) => {
                const Icon = t.icon;
                const isActive = active === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelect(t.id);
                      onClose();
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-start cursor-pointer transition-colors ${
                      isActive ? 'bg-white/90 border-periwinkle/50 text-ink' : 'bg-white/60 border-ink/10 text-ink/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-periwinkle' : 'text-ink/50'}`} />
                    <span className="text-xs font-bold truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-white/70 border border-ink/10 text-ink/70 text-xs font-bold cursor-pointer"
        >
          {isAr ? 'إغلاق' : 'Close'}
        </button>
      </div>
    </div>,
    document.body
  );
}

export function paymentStatusArabic(status: ContractData['paymentStatus']): string {
  switch (status) {
    case 'paid':
      return 'مدفوع بالكامل';
    case 'partial':
      return 'دفعة جزئية';
    default:
      return 'غير مدفوع';
  }
}

export function statusArabic(status: ContractData['status']): string {
  // translateText() looks entries up by their Arabic literal — these mirror the ones the
  // rest of the app already stores in ContractData.status.
  switch (status) {
    case 'submitted':
      return 'تم تقديم العقد';
    case 'under_review':
      return 'قيد المراجعة الفنية';
    case 'in_development':
      return 'قيد التطوير والتنفيذ';
    case 'completed':
      return 'مكتمل ومسلم';
    default:
      return 'مسودة';
  }
}

/** The aggregate the shell computes from the live contract list and passes to the tabs. */
export interface AdminStats {
  totalIQD: number;
  count: number;
  byStatus: Record<string, number>;
  byPaymentPlan: Record<string, number>;
  topTemplates: [string, number][];
  avgIQD: number;

  // Financial position — see the field comments on ContractData for why "profit" is computed
  // from money actually collected rather than the full agreed price.
  byPaymentStatus: Record<string, number>;
  /** Sum of costIQD across every contract. */
  totalCostIQD: number;
  /** Sum of paidAmountIQD — cash that has actually landed. */
  totalCollectedIQD: number;
  /** totalIQD - totalCollectedIQD: agreed money not yet in hand. */
  totalOutstandingIQD: number;
  /** Realized profit: totalCollectedIQD - totalCostIQD. */
  netProfitIQD: number;
  /** Best case if every outstanding balance were collected: totalIQD - totalCostIQD. */
  projectedProfitIQD: number;
}
