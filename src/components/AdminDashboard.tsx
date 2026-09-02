import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, ShieldCheck, BarChart3, FileCheck, Tag, Users, UserCheck, Settings, ArrowLeftRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { ContractData } from '../types';
import { Language } from '../lib/i18n';
import { Currency, formatPrice } from '../lib/currency';
import { subscribeToContracts, subscribeToContractCosts } from '../lib/firebase';
import { logoutAccount, isCurrentUserAdmin } from '../lib/auth';
import { useDocumentFlag } from '../lib/useDocumentFlag';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import { TabButton, KpiCell, StatChip, BottomTabBar, MoreSheet, TabGroup } from './admin/shared';
import { OverviewTab } from './admin/OverviewTab';
import { ContractsTab } from './admin/ContractsTab';
import { PricingTab } from './admin/PricingTab';
import { TeamTab } from './admin/TeamTab';
import { MembersTab } from './admin/MembersTab';
import { SettingsTab } from './admin/SettingsTab';
import { CurrencyConverterCard } from './admin/CurrencyConverterCard';

// The shell only: it owns the live contract subscription, derives the stats every tab reads,
// and switches between them. Each tab's own markup and logic lives in ./admin/.

interface AdminDashboardProps {
  language: Language;
  currency?: Currency;
  /** Leaves the control panel for the public site — see the note on this same prop in
   *  AdminPage.tsx for why it exists at all now. */
  onBackToSite: () => void;
}

type Tab = 'overview' | 'contracts' | 'pricing' | 'currency' | 'team' | 'members' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ language, currency = 'IQD', onBackToSite }) => {
  const isAr = language === 'ar';
  const [tab, setTab] = useState<Tab>('overview');
  const [rawContracts, setRawContracts] = useState<ContractData[]>([]);
  /** التكاليف تعيش في مجموعة أدمن-فقط منفصلة (انظر firestore.rules) وتُدمج هنا. */
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // No starfield behind the control panel. This is a working tool, not a showcase: dense
  // tables that scroll, live-updating figures and forms, used for long stretches at a time.
  // The background's drifting layers are composited underneath all of it for the entire
  // session while adding nothing to a page whose job is legibility, so the panel takes them
  // out of rendering and keeps the flat black the page already sits on.
  useDocumentFlag('flat');
  // The whole panel sits on the home palette (paper ground, ink text) — see
  // `html[data-account]` in index.css.
  useDocumentFlag('account');

  /* بوابة ثانية مستقلة عن AdminPage.
   *
   * السبب ليس تكراراً زائداً: الاشتراك بالعقود أدناه يسقط على نسخة localStorage المحلية عند
   * فشل Firestore (وهو تصميم مقصود ليعمل الأدمن دون إنترنت). فمن يجبر ظهور هذه اللوحة بتعديل
   * الجافاسكربت في متصفحه كان سيُرفض من الخادم — ثم يرى مع ذلك واجهة لوحة تحكم مملوءة بما
   * في جهازه هو. لا تسريب لبيانات غيره، لكنه شكل انتحال لا مبرر له.
   *
   * لذلك: لا اشتراك بأي بيانات قبل تحقق موقَّع من الخادم، والفشل يعني رفضاً صريحاً. الهيكل
   * نفسه يُرسَم فوراً — لا قيمة أمنية في حجب إطار فارغ، وحجبه كان يكلّف رسالة انتظار في كل
   * دخول (انظر شرط verified === false أسفل الملف). */
  const [verified, setVerified] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    isCurrentUserAdmin().then((ok) => {
      if (!cancelled) setVerified(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (verified !== true) return;
    const unsubContracts = subscribeToContracts(setRawContracts);
    const unsubCosts = subscribeToContractCosts(setCosts);
    return () => {
      unsubContracts();
      unsubCosts();
    };
  }, [verified]);

  /* الدمج يحدث هنا مرة واحدة، فيبقى كل ما تحت هذه النقطة (الإحصاءات، تبويب العقود، البطاقات)
     يقرأ `contract.costIQD` كما كان يقرؤه حين كانت التكلفة داخل مستند العقد. القيمة الجديدة
     تسبق القديمة: عقد لم يُعدَّل بعد الترحيل ما زال يحمل الحقل القديم، وعقد عُدِّل صار حقله
     ممحوّاً وقيمته هنا. */
  const contracts = useMemo(
    () => rawContracts.map((c) => ({ ...c, costIQD: costs[(c.contractNumber || '').trim()] ?? c.costIQD })),
    [rawContracts, costs]
  );

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

  // Grouped, not a flat list of six. "Contracts, Pricing, Team, Subscribers, Settings" in one
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
      heading: isAr ? 'الأدوات' : 'Tools',
      items: [
        { id: 'currency', label: isAr ? 'محول العملات' : 'Currency Converter', icon: ArrowLeftRight },
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
        { id: 'settings', label: isAr ? 'الإعدادات' : 'Settings', icon: Settings },
      ],
    },
  ];
  const tabs = groups.flatMap((g) => g.items);
  const activeLabel = tabs.find((t) => t.id === tab)?.label ?? '';

  // The bottom bar's own four slots: the "Business" group's three tabs (what actually gets
  // opened every day) plus a fourth "More" slot for everything else. Everything past that
  // slot lives in the sheet, grouped exactly like the desktop sidebar's own groups.
  /* ثلاث خانات في شريط الهاتف السفلي + خانة "المزيد".
   *
   * الثلاث هي مجموعة "الأعمال" (نظرة عامة، العقود، الأسعار) — ما يُفتح يومياً. والخانة
   * الرابعة صارت "الإعدادات" بدل "المزيد": نفس الورقة تُفتح منها، وفيها كل ما تبقّى بما فيه
   * قسم الإعدادات نفسه — اسم واحد مفهوم بدل اسم عامّ لا يقول ماذا خلفه.
   *
   * القوائم مشتقّة من `groups` لا مكتوبة يدوياً مرتين: ما يظهر في الشريط يُستبعَد من الورقة
   * تلقائياً، فلا يمكن أن يتكرّر قسم في الاثنين ولا أن يسقط قسم من الاثنين معاً — وهو ما كان
   * سيحدث مع أي قائمة ثانية تُكتب بالأسماء. */
  const mobilePrimaryIds: Tab[] = ['overview', 'contracts', 'pricing'];
  const primaryTabs = mobilePrimaryIds
    .map((id) => tabs.find((t) => t.id === id))
    .filter((t): t is (typeof tabs)[number] => !!t);
  const moreGroups: TabGroup[] = groups
    .map((g) => ({ heading: g.heading, items: g.items.filter((i) => !mobilePrimaryIds.includes(i.id)) }))
    .filter((g) => g.items.length > 0);
  const isMoreTab = !mobilePrimaryIds.includes(tab);

  /* اللوحة تُرسَم فوراً بلا انتظار جواب الخادم، والرفض يظهر متى وصل الجواب سلباً.
   *
   * الانتظار هنا كان يعني رسالة "جارٍ التحقق من الصلاحية…" في كل دخول — بينما ما يحميه
   * الانتظار لا شيء: الاشتراك بالعقود أدناه ما زال محبوساً على verified === true، وقاعدة
   * Firestore ترفض كل قراءة لغير الأدمن. أسوأ ما يراه غير المصرَّح له هو هيكل فارغ بلا رقم
   * واحد، ثم شاشة الرفض. */
  if (verified === false) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <ShieldCheck className="w-10 h-10 mx-auto text-ink/30" />
        <h2 className="text-lg font-bold text-ink">{isAr ? 'غير مصرّح' : 'Not authorized'}</h2>
        <p className="text-xs text-ink/60 leading-relaxed">
          {isAr
            ? 'هذا الحساب ليس ضمن مشرفي NUVAIQ. لوحة التحكم وبياناتها محمية على الخادم، ولا يمكن الوصول إليها من المتصفح مهما جرى تعديله.'
            : 'This account is not a NUVAIQ admin. The control panel and its data are protected on the server and cannot be reached from the browser, whatever is changed in it.'}
        </p>
        <button
          type="button"
          onClick={onBackToSite}
          className="px-4 py-2.5 rounded-xl bg-ink text-paper text-xs font-bold cursor-pointer"
        >
          {isAr ? 'العودة للموقع' : 'Back to site'}
        </button>
      </div>
    );
  }

  return (
    // pb-24 clears the fixed bottom tab bar on mobile; lg:pb-12 is the panel's own original
    // breathing room once the bar disappears at the desktop sidebar breakpoint.
    /* بلا pt هنا: الشريط العلوي ملتصق (sticky) ويحمل حشوته العلوية بنفسه. أي حشوة على هذه
       الحاوية تظهر كفراغ فوق الشريط وهو في وضع الراحة، ثم تختفي بمجرد أن يلتصق بالحافة —
       فيبدو وكأن فراغاً يظهر ويغيب مع التمرير. */
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12">
      {showLogoutConfirm && (
        <LogoutConfirmDialog
          isAr={isAr}
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={() => logoutAccount()}
        />
      )}
      {showMore && (
        <MoreSheet
          groups={moreGroups}
          active={tab}
          onSelect={(id) => setTab(id as Tab)}
          onClose={() => setShowMore(false)}
          isAr={isAr}
        />
      )}
      <BottomTabBar
        primary={primaryTabs}
        active={tab}
        onSelect={(id) => {
          setTab(id as Tab);
          setShowMore(false);
        }}
        onMore={() => setShowMore((v) => !v)}
        moreActive={isMoreTab || showMore}
        isAr={isAr}
      />
      {/* زرّان عائمان فقط، بلا شريط ولا عنوان.
          العنوان الذي كان هنا ("لوحة تحكم NUVAIQ" وسطره التعريفي) لم يكن يقول لصاحب اللوحة
          شيئاً لا يعرفه، وكان يأكل أول 80 بكسل من كل شاشة في أداة تُستعمل يومياً.
          
          لا خلفية للشريط ولا حدّ سفلي بعد أن خلا من المحتوى: الحاوية `pointer-events-none`
          فيمرّ المؤشر من خلالها إلى الجدول تحتها، وكل زرّ يعيد تفعيل الأحداث لنفسه فقط. كل
          واحد في جهة (justify-between)، فلا يزاحمان بعضهما ولا يُضغط أحدهما بدل الآخر —
          وهذا ما يجعلهما مريحين على الهاتف تحديداً، حيث الإبهام يصل الزوايا لا الوسط.
          
          دائريان بحجم 44/48 بكسل: الحد الأدنى الموصى به لمساحة اللمس، ومعهما خلفية معتمة
          وحدّ وظل — بدونها يذوب الزرّ في أي محتوى فاتح يمرّ تحته أثناء التمرير. */}
      <div className="sticky top-0 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pt-4 pb-3 mb-3 flex items-center justify-between pointer-events-none">
        <button
          onClick={onBackToSite}
          aria-label={isAr ? 'العودة للموقع' : 'Back to site'}
          title={isAr ? 'العودة للموقع' : 'Back to site'}
          className="pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 grid place-items-center rounded-full bg-white/90 backdrop-blur-md border border-ink/15 text-ink/70 hover:text-ink hover:bg-white shadow-lg shadow-ink/10 transition-colors cursor-pointer"
        >
          {/* سهم رجوع، ويتبع اتجاه اللغة: في العربية يشير يميناً (جهة "الخلف" في تخطيط rtl)
              وفي الإنجليزية يساراً. سهم ثابت الاتجاه يعني في إحدى اللغتين سهماً يشير إلى
              الأمام على زرّ يعود للخلف. */}
          {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </button>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          aria-label={isAr ? 'تسجيل الخروج' : 'Sign out'}
          title={isAr ? 'تسجيل الخروج' : 'Sign out'}
          className="pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 grid place-items-center rounded-full bg-white/90 backdrop-blur-md border border-red-600/25 text-red-600/80 hover:text-red-600 hover:bg-white shadow-lg shadow-ink/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* The money, above everything, on every screen.
          These four figures used to live inside the Overview tab, which meant the answer to "how
          is the business doing" was only visible on the one screen nobody works on — you left it
          the moment you went to edit a contract or a price. Kept here they are simply always true
          and always in view, and Overview is free to be analysis rather than a scoreboard.

          Two renderings of the same four numbers, not one hidden behind a breakpoint modifier:
          the desktop grid earns its four-way divider on a screen wide enough to show all four at
          once, but the same layout at 2-per-row on a phone was two stacked rows before any tab's
          own content started. A horizontally-scrolling strip of chips is the pattern a phone
          already knows from every native app's metrics carousel — swipe past what you don't need
          instead of scrolling past it. */}
      <div className="hidden lg:grid mb-6 rounded-3xl bg-paper border border-ink/15 grid-cols-4 divide-x divide-ink/15 rtl:divide-x-reverse overflow-hidden">
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
      <div className="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2.5 w-max pb-1">
          <StatChip icon={FileCheck} label={isAr ? 'العقود' : 'Contracts'} value={String(stats.count)} tint="#FF8E3D" />
          <StatChip icon={BarChart3} label={isAr ? 'القيمة المتعاقدة' : 'Contracted'} value={formatPrice(stats.totalIQD, language, currency)} tint="#080A0D" />
          <StatChip icon={ArrowLeftRight} label={isAr ? 'المحصّل' : 'Collected'} value={formatPrice(stats.totalCollectedIQD, language, currency)} tint="#3E8F5F" />
          <StatChip
            icon={ShieldCheck}
            label={isAr ? 'الربح المحقق' : 'Realized profit'}
            value={formatPrice(stats.netProfitIQD, language, currency)}
            tint={stats.netProfitIQD >= 0 ? '#3E8F5F' : '#D9534F'}
          />
        </div>
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

        {/* Mobile navigation is the fixed bottom bar now (rendered once, above, outside this
            flex row) — no in-flow mobile nav needed here any more. */}

        <div className="flex-1 min-w-0 space-y-6">
          {/* Names the screen you are on. The active tab's own icon is highlighted in the bottom
              bar or the sidebar, but neither is always in the same glance as the content below
              it — the heading always is. */}
          <h2 className="text-sm font-bold text-ink/55 border-b border-ink/10 pb-2">{activeLabel}</h2>
          {tab === 'overview' && (
            <OverviewTab isAr={isAr} stats={stats} contracts={contracts} language={language} currency={currency} />
          )}
          {tab === 'contracts' && <ContractsTab isAr={isAr} language={language} currency={currency} contracts={contracts} stats={stats} onBackToSite={onBackToSite} />}
          {tab === 'pricing' && <PricingTab isAr={isAr} language={language} currency={currency} />}
          {tab === 'currency' && (
            <div className="max-w-2xl">
              <CurrencyConverterCard isAr={isAr} />
            </div>
          )}
          {tab === 'team' && <TeamTab isAr={isAr} />}
          {tab === 'members' && <MembersTab isAr={isAr} language={language} currency={currency} contracts={contracts} onBackToSite={onBackToSite} />}
          {tab === 'settings' && <SettingsTab isAr={isAr} />}
        </div>
      </div>
    </div>
  );
};
