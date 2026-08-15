// Small pieces every admin tab reuses: the status ordering, three presentational primitives,
// and the shape of the stats the shell computes once and hands down. Split out of
// AdminDashboard.tsx so each tab file imports what it needs instead of all of them living in
// one module.

import React from 'react';
import { ContractData } from '../../types';

export const STATUS_FLOW: ContractData['status'][] = ['submitted', 'under_review', 'in_development', 'completed'];

export const PAYMENT_STATUS_FLOW: NonNullable<ContractData['paymentStatus']>[] = ['unpaid', 'partial', 'paid'];

// Icons are typed as "a component accepting className" rather than React.ElementType — the
// one prop actually passed at every call site, named explicitly instead of accepting anything
// renderable.
export function StatTile({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: string }) {
  // Financial figures (profit/loss, totals) can run to 8+ digits — a fixed text-xl with
  // `truncate` silently clipped those behind an ellipsis, hiding the actual number. A smaller,
  // responsive size plus wrapping instead of truncating means a big number is always fully
  // readable (on up to two lines if it has to), never cut off.
  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
      <div className="space-y-1 min-w-0 flex-1">
        <span className="text-[11px] text-zinc-400 block font-medium truncate">{label}</span>
        <div className={`text-base sm:text-lg lg:text-xl font-extrabold font-mono leading-tight wrap-break-word ${accent || 'text-white'}`}>{value}</div>
      </div>
      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0">
        <Icon className="w-5 h-5" />
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
          ? 'bg-zinc-800 border-white text-white'
          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
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
      <span className="text-[10px] uppercase tracking-wide text-zinc-500 block font-semibold truncate">{label}</span>
      <div className={`text-sm sm:text-base font-extrabold font-mono leading-tight wrap-break-word mt-0.5 ${accent || 'text-white'}`}>
        {value}
      </div>
      {hint && <span className="text-[10px] text-zinc-500 block mt-0.5 truncate">{hint}</span>}
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
        <span className="text-zinc-500">{isAr ? 'نسبة التحصيل' : 'Collected'}</span>
        <span className={`font-mono ${done ? 'text-emerald-400' : pct > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-black border border-zinc-800 overflow-hidden">
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
        <span className="text-zinc-300 truncate">{label}</span>
        <span className="text-zinc-400 font-mono shrink-0">{count} ({pct}%)</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden">
        <div className={`h-full bg-white/70 rounded-full`} style={{ width: `${pct}%`, [isAr ? 'marginLeft' : 'marginRight']: 'auto' }} />
      </div>
    </div>
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
