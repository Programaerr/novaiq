import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, ShieldCheck, BarChart3, FileCheck, Tag, Users, UserCheck, Settings } from 'lucide-react';
import { ContractData } from '../types';
import { Language } from '../lib/i18n';
import { Currency } from '../lib/currency';
import { subscribeToContracts } from '../lib/firebase';
import { logoutAccount } from '../lib/auth';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import { TabButton } from './admin/shared';
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

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: isAr ? 'نظرة عامة' : 'Overview', icon: BarChart3 },
    { id: 'contracts', label: isAr ? 'إدارة العقود' : 'Contracts', icon: FileCheck },
    { id: 'pricing', label: isAr ? 'الأسعار' : 'Pricing', icon: Tag },
    { id: 'team', label: isAr ? 'الفريق' : 'Team', icon: Users },
    { id: 'members', label: isAr ? 'المشتركون' : 'Subscribers', icon: UserCheck },
    { id: 'settings', label: isAr ? 'التواصل الاجتماعي' : 'Social Links', icon: Settings },
  ];

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {isAr ? 'لوحة تحكم NOVAIQ' : 'NOVAIQ Control Panel'}
            </h1>
            <p className="text-xs text-zinc-400">
              {isAr ? 'كل شيء عن أعمالك في مكان واحد' : 'Everything about your business, in one place'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </button>
      </div>

      <div className="lg:flex lg:items-start lg:gap-6">
        {/* Desktop sidebar nav — a horizontal wrapping pill row was the only layout at any
            width before, which left most of a wide monitor as empty background next to a
            narrow content column. A persistent sidebar reclaims that width for content and
            scales far better past tablet size. */}
        <nav className="hidden lg:flex lg:flex-col lg:w-56 xl:w-64 shrink-0 gap-1.5 sticky lg:top-28 self-start">
          {tabs.map((t) => (
            <TabButton key={t.id} tabItem={t} active={tab === t.id} onClick={() => setTab(t.id)} full />
          ))}
        </nav>

        {/* Mobile/tablet: the original horizontal wrapping pill row */}
        <div className="flex lg:hidden flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <TabButton key={t.id} tabItem={t} active={tab === t.id} onClick={() => setTab(t.id)} />
          ))}
        </div>

        <div className="flex-1 min-w-0 space-y-6">
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
