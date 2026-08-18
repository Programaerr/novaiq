import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, ShieldCheck, BarChart3, FileCheck, Tag, Users, UserCheck, Settings } from 'lucide-react';
import { ContractData } from '../types';
import { Language } from '../lib/i18n';
import { Currency, formatPrice } from '../lib/currency';
import { subscribeToContracts } from '../lib/firebase';
import { logoutAccount } from '../lib/auth';
import { useDocumentFlag } from '../lib/useDocumentFlag';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import { TabButton, KpiCell } from './admin/shared';
import { OverviewTab } from './admin/OverviewTab';
import { ContractsTab } from './admin/ContractsTab';
import { PricingTab } from './admin/PricingTab';
import { TeamTab } from './admin/TeamTab';
import { MembersTab } from './admin/MembersTab';
import { SettingsTab } from './admin/SettingsTab';

// The shell only: it owns the live contract subscription, derives the stats every tab reads,
// and switches between them. Each tab's own markup and logic lives in ./admin/.

interface AdminDashboardProps {
  language: Language;
  currency?: Currency;
}

type Tab = 'overview' | 'contracts' | 'pricing' | 'team' | 'members' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ language, currency = 'IQD' }) => {
  const isAr = language === 'ar';
  const [tab, setTab] = useState<Tab>('overview');
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // No starfield behind the control panel. This is a working tool, not a showcase: dense
  // tables that scroll, live-updating figures and forms, used for long stretches at a time.
  // The background's drifting layers are composited underneath all of it for the entire
  // session while adding nothing to a page whose job is legibility, so the panel takes them
  // out of rendering and keeps the flat black the page already sits on.
  useDocumentFlag('flat');
  // The whole panel sits on the home palette (paper ground, ink text) — see
  // `html[data-account]` in index.css.
  useDocumentFlag('account');

  useEffect(() => {
    const unsub = subscribeToContracts(setContracts);
    return unsub;
  }, []);

  const stats = useMemo(() => {
    const totalIQD = contracts.reduce((s, c) => s + (c.totalPriceIQD || 0), 0);
    const byStatus: Record<string, number> = {};
    const byTemplate: Record<string, number> = {};
    const byPaymentPlan: Record<string, number> = {};
    const byPaymentStatus: Record<string, number> = {};
    let totalCostIQD = 0;
    let totalCollectedIQD = 0;
    contracts.forEach((c) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byTemplate[c.templateTitle] = (byTemplate[c.templateTitle] || 0) + 1;
      byPaymentPlan[c.paymentPlan] = (byPaymentPlan[c.paymentPlan] || 0) + 1;
      byPaymentStatus[c.paymentStatus || 'unpaid'] = (byPaymentStatus[c.paymentStatus || 'unpaid'] || 0) + 1;
      totalCostIQD += c.costIQD || 0;
      totalCollectedIQD += c.paidAmountIQD || 0;
    });
    const topTemplates = Object.entries(byTemplate).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      totalIQD,
      count: contracts.length,
      byStatus,
      byPaymentPlan,
      topTemplates,
      avgIQD: contracts.length ? Math.round(totalIQD / contracts.length) : 0,
      byPaymentStatus,
      totalCostIQD,
      totalCollectedIQD,
      totalOutstandingIQD: totalIQD - totalCollectedIQD,
      netProfitIQD: totalCollectedIQD - totalCostIQD,
      projectedProfitIQD: totalIQD - totalCostIQD,
    };
  }, [contracts]);

  // Grouped, not a flat list of six. "Contracts, Pricing, Team, Subscribers, Social Links" in one
  // column gives every destination the same weight and makes the reader scan all six to find the
  // one they came for. Money, people and configuration are three different jobs, visited at three
  // different rhythms, and saying so in the nav is most of what makes a panel this size navigable.
  const groups: { heading: string; items: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
    {
      heading: isAr ? 'الأعمال' : 'Business',
      items: [
        { id: 'overview', label: isAr ? 'نظرة عامة' : 'Overview', icon: BarChart3 },
        { id: 'contracts', label: isAr ? 'العقود' : 'Contracts', icon: FileCheck },
        { id: 'pricing', label: isAr ? 'الأسعار' : 'Pricing', icon: Tag },
      ],
    },
    {
      heading: isAr ? 'الأشخاص' : 'People',
      items: [
        { id: 'team', label: isAr ? 'الفريق' : 'Team', icon: Users },
        { id: 'members', label: isAr ? 'المشتركون' : 'Subscribers', icon: UserCheck },
      ],
    },
    {
      heading: isAr ? 'الإعداد' : 'Configuration',
      items: [
        { id: 'settings', label: isAr ? 'التواصل الاجتماعي' : 'Social Links', icon: Settings },
      ],
    },
  ];
  const tabs = groups.flatMap((g) => g.items);
  const activeLabel = tabs.find((t) => t.id === tab)?.label ?? '';

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12">
      {showLogoutConfirm && (
        <LogoutConfirmDialog
          isAr={isAr}
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={() => logoutAccount()}
        />
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-ink/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/80 border border-ink/15 flex items-center justify-center text-ink shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">
              {isAr ? 'لوحة تحكم NOVAIQ' : 'NOVAIQ Control Panel'}
            </h1>
            <p className="text-xs text-ink/55">
              {isAr ? 'كل شيء عن أعمالك في مكان واحد' : 'Everything about your business, in one place'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="px-4 py-2 rounded-xl bg-white/80 hover:bg-sand-light border border-ink/15 text-ink/75 hover:text-ink text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </button>
      </div>

      {/* The money, above everything, on every screen.
          These four figures used to live inside the Overview tab, which meant the answer to "how
          is the business doing" was only visible on the one screen nobody works on — you left it
          the moment you went to edit a contract or a price. Kept here they are simply always true
          and always in view, and Overview is free to be analysis rather than a scoreboard. */}
      <div className="mb-6 rounded-2xl bg-paper border border-ink/15 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-ink/15 rtl:divide-x-reverse overflow-hidden">
        <KpiCell
          label={isAr ? 'العقود' : 'Contracts'}
          value={String(stats.count)}
          hint={isAr ? `${stats.byStatus['completed'] || 0} مكتمل` : `${stats.byStatus['completed'] || 0} completed`}
        />
        <KpiCell label={isAr ? 'القيمة المتعاقدة' : 'Contracted value'} value={formatPrice(stats.totalIQD, language, currency)} />
        <KpiCell
          label={isAr ? 'المحصّل' : 'Collected'}
          value={formatPrice(stats.totalCollectedIQD, language, currency)}
          accent="text-emerald-700"
          hint={isAr ? `${formatPrice(stats.totalOutstandingIQD, language, currency)} متبقٍّ` : `${formatPrice(stats.totalOutstandingIQD, language, currency)} outstanding`}
        />
        <KpiCell
          label={isAr ? 'الربح المحقق' : 'Realized profit'}
          value={formatPrice(stats.netProfitIQD, language, currency)}
          accent={stats.netProfitIQD >= 0 ? 'text-emerald-700' : 'text-red-600'}
        />
      </div>

      <div className="lg:flex lg:items-start lg:gap-6">
        {/* Desktop sidebar nav — a horizontal wrapping pill row was the only layout at any
            width before, which left most of a wide monitor as empty background next to a
            narrow content column. A persistent sidebar reclaims that width for content and
            scales far better past tablet size. */}
        <nav className="hidden lg:flex lg:flex-col lg:w-56 xl:w-64 shrink-0 gap-5 sticky lg:top-28 self-start">
          {groups.map((g) => (
            <div key={g.heading} className="space-y-1.5">
              <span className="px-2 text-[10px] uppercase tracking-wider font-bold text-ink/40 block">{g.heading}</span>
              {g.items.map((t) => (
                <TabButton key={t.id} tabItem={t} active={tab === t.id} onClick={() => setTab(t.id)} full />
              ))}
            </div>
          ))}
        </nav>

        {/* Mobile/tablet: one scrolling row rather than a wrapping block. Six pills wrapping to
            three lines pushed the actual content off a phone screen before it started. */}
        <div className="lg:hidden -mx-4 px-4 mb-6 overflow-x-auto">
          <div className="flex gap-2 w-max pb-1">
            {tabs.map((t) => (
              <TabButton key={t.id} tabItem={t} active={tab === t.id} onClick={() => setTab(t.id)} />
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-6">
          {/* Names the screen you are on. With the nav grouped and the mobile row scrolling, the
              active pill is not always visible — the heading is. */}
          <h2 className="text-sm font-bold text-ink/55 border-b border-ink/10 pb-2">{activeLabel}</h2>
          {tab === 'overview' && (
            <OverviewTab isAr={isAr} stats={stats} contracts={contracts} language={language} currency={currency} />
          )}
          {tab === 'contracts' && <ContractsTab isAr={isAr} language={language} currency={currency} contracts={contracts} stats={stats} />}
          {tab === 'pricing' && <PricingTab isAr={isAr} language={language} currency={currency} />}
          {tab === 'team' && <TeamTab isAr={isAr} />}
          {tab === 'members' && <MembersTab isAr={isAr} />}
          {tab === 'settings' && <SettingsTab isAr={isAr} />}
        </div>
      </div>
    </div>
  );
};
