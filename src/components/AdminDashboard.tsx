import React, { useState, useEffect, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  LogOut,
  TrendingUp,
  FileCheck,
  Eye,
  DollarSign,
  RefreshCw,
  Download,
  Trash2,
  Save,
  Pencil,
  ShieldCheck,
  Search,
  Loader2,
  BarChart3,
  Tag,
  Users,
  UserPlus,
  RotateCcw,
} from 'lucide-react';
import { ContractData } from '../types';
import { Language, translateText } from '../lib/i18n';
import { formatPrice, toUSD } from '../lib/currency';
import { subscribeToContracts, deleteContractFromFirebase, updateContractFields } from '../lib/firebase';
import { subscribeToAnalyticsEvents, AnalyticsEvent } from '../lib/analytics';
import { logoutAccount, addAdminEmail, authErrorMessage } from '../lib/auth';
import { useLiveTemplates, subscribeToPricingOverrides, savePricingOverride, PricingOverride } from '../lib/pricingOverrides';
import { generateContractPDF } from '../lib/pdfGenerator';
import { ConnectedContractPrintDocument } from './ContractPrintDocument';
import { cosmicAudio } from '../lib/audio';

interface AdminDashboardProps {
  language: Language;
}

type Tab = 'overview' | 'contracts' | 'pricing' | 'team';

const STATUS_FLOW: ContractData['status'][] = ['submitted', 'under_review', 'in_development', 'completed'];

function StatTile({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent?: string }) {
  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
      <div className="space-y-1 min-w-0">
        <span className="text-[11px] text-zinc-400 block font-medium truncate">{label}</span>
        <div className={`text-xl font-extrabold font-mono truncate ${accent || 'text-white'}`}>{value}</div>
      </div>
      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

function BarRow({ label, count, total, isAr }: { label: string; count: number; total: number; isAr: boolean }) {
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

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ language }) => {
  const isAr = language === 'ar';
  const [tab, setTab] = useState<Tab>('overview');
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);

  useEffect(() => {
    const unsub = subscribeToContracts((data) => {
      setContracts(data);
      setLoadingContracts(false);
    });
    return unsub;
  }, []);

  useEffect(() => subscribeToAnalyticsEvents(setEvents), []);

  const stats = useMemo(() => {
    const totalIQD = contracts.reduce((s, c) => s + (c.totalPriceIQD || 0), 0);
    const byStatus: Record<string, number> = {};
    const byTemplate: Record<string, number> = {};
    const byPaymentPlan: Record<string, number> = {};
    contracts.forEach((c) => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byTemplate[c.templateTitle] = (byTemplate[c.templateTitle] || 0) + 1;
      byPaymentPlan[c.paymentPlan] = (byPaymentPlan[c.paymentPlan] || 0) + 1;
    });
    const topTemplates = Object.entries(byTemplate).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      totalIQD,
      count: contracts.length,
      byStatus,
      byPaymentPlan,
      topTemplates,
      avgIQD: contracts.length ? Math.round(totalIQD / contracts.length) : 0,
    };
  }, [contracts]);

  const analyticsStats = useMemo(() => {
    const pageViews = events.filter((e) => e.event === 'page_view');
    const byPage: Record<string, number> = {};
    pageViews.forEach((e) => {
      const p = e.page || 'unknown';
      byPage[p] = (byPage[p] || 0) + 1;
    });
    const topPages = Object.entries(byPage).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { totalViews: pageViews.length, topPages };
  }, [events]);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: isAr ? 'نظرة عامة' : 'Overview', icon: BarChart3 },
    { id: 'contracts', label: isAr ? 'إدارة العقود' : 'Contracts', icon: FileCheck },
    { id: 'pricing', label: isAr ? 'الأسعار' : 'Pricing', icon: Tag },
    { id: 'team', label: isAr ? 'الفريق' : 'Team', icon: Users },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-12 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
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
          onClick={() => logoutAccount()}
          className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all border ${
                tab === t.id
                  ? 'bg-zinc-800 border-white text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {loadingContracts ? (
        <div className="py-24 text-center text-zinc-400 text-xs">
          <RefreshCw className="w-6 h-6 text-white mx-auto mb-2 animate-spin" />
          {isAr ? 'جارِ تحميل بيانات الشركة...' : 'Loading business data...'}
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <OverviewTab isAr={isAr} stats={stats} analyticsStats={analyticsStats} contracts={contracts} language={language} />
          )}
          {tab === 'contracts' && <ContractsTab isAr={isAr} language={language} contracts={contracts} />}
          {tab === 'pricing' && <PricingTab isAr={isAr} language={language} />}
          {tab === 'team' && <TeamTab isAr={isAr} />}
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function OverviewTab({
  isAr,
  stats,
  analyticsStats,
  contracts,
  language,
}: {
  isAr: boolean;
  stats: ReturnType<typeof useOverviewStatsType>;
  analyticsStats: { totalViews: number; topPages: [string, number][] };
  contracts: ContractData[];
  language: Language;
}) {
  const recent = contracts.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={FileCheck} label={isAr ? 'إجمالي العقود' : 'Total Contracts'} value={String(stats.count)} />
        <StatTile
          icon={DollarSign}
          label={isAr ? 'إجمالي القيمة' : 'Total Value'}
          value={formatPrice(stats.totalIQD, language)}
          accent="text-emerald-400"
        />
        <StatTile
          icon={TrendingUp}
          label={isAr ? 'متوسط قيمة العقد' : 'Avg. Contract Value'}
          value={formatPrice(stats.avgIQD, language)}
        />
        <StatTile icon={Eye} label={isAr ? 'إجمالي المشاهدات' : 'Total Page Views'} value={String(analyticsStats.totalViews)} accent="text-cyan-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
          <h3 className="text-sm font-bold text-white">{isAr ? 'حالة العقود' : 'Contracts by Status'}</h3>
          <div className="space-y-2.5">
            {STATUS_FLOW.map((status) => (
              <BarRow key={status} isAr={isAr} label={translateText(statusArabic(status), language)} count={stats.byStatus[status] || 0} total={stats.count} />
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
          <h3 className="text-sm font-bold text-white">{isAr ? 'القوالب الأكثر طلباً' : 'Most Requested Templates'}</h3>
          {stats.topTemplates.length === 0 ? (
            <p className="text-xs text-zinc-500">{isAr ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
          ) : (
            <div className="space-y-2.5">
              {stats.topTemplates.map(([title, count]) => (
                <BarRow key={title} isAr={isAr} label={translateText(title, language)} count={count} total={stats.count} />
              ))}
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
          <h3 className="text-sm font-bold text-white">{isAr ? 'أكثر الصفحات زيارة' : 'Most Visited Pages'}</h3>
          {analyticsStats.topPages.length === 0 ? (
            <p className="text-xs text-zinc-500">{isAr ? 'لا توجد بيانات زيارات بعد (تتطلب موافقة الزوار على التتبع)' : 'No visit data yet (requires visitor tracking consent)'}</p>
          ) : (
            <div className="space-y-2.5">
              {analyticsStats.topPages.map(([page, count]) => (
                <BarRow key={page} isAr={isAr} label={page} count={count} total={analyticsStats.totalViews} />
              ))}
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
          <h3 className="text-sm font-bold text-white">{isAr ? 'أحدث العقود' : 'Recent Contracts'}</h3>
          {recent.length === 0 ? (
            <p className="text-xs text-zinc-500">{isAr ? 'لا توجد عقود بعد' : 'No contracts yet'}</p>
          ) : (
            <div className="space-y-2">
              {recent.map((c) => (
                <div key={c.id || c.contractNumber} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                  <div className="min-w-0">
                    <div className="text-white font-bold truncate">{c.companyName}</div>
                    <div className="text-zinc-500 text-[10px] truncate">{translateText(c.templateTitle, language)}</div>
                  </div>
                  <span className="text-zinc-300 font-mono shrink-0">{formatPrice(c.totalPriceIQD || 0, language)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Dummy type-only helper so OverviewTab's prop type stays in sync with the computed stats
// shape above without duplicating the whole structure by hand.
function useOverviewStatsType() {
  return {
    totalIQD: 0,
    count: 0,
    byStatus: {} as Record<string, number>,
    byPaymentPlan: {} as Record<string, number>,
    topTemplates: [] as [string, number][],
    avgIQD: 0,
  };
}

function statusArabic(status: ContractData['status']): string {
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

// ---------------------------------------------------------------------------
// Contracts management
// ---------------------------------------------------------------------------

function ContractsTab({ isAr, language, contracts }: { isAr: boolean; language: Language; contracts: ContractData[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContractData['status']>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = contracts.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.companyName?.toLowerCase().includes(q) ||
      c.repName?.toLowerCase().includes(q) ||
      c.contractNumber?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? 'ابحث بالاسم، رقم العقد، أو الهاتف...' : 'Search by name, contract #, or phone...'}
            className={`w-full ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-bold cursor-pointer"
        >
          <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
          {STATUS_FLOW.map((s) => (
            <option key={s} value={s}>
              {translateText(statusArabic(s), language)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl">
          {isAr ? 'لا توجد عقود مطابقة' : 'No matching contracts'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <ContractRow
              key={c.id || c.contractNumber}
              contract={c}
              isAr={isAr}
              language={language}
              expanded={expandedId === (c.id || c.contractNumber)}
              onToggle={() => setExpandedId((prev) => (prev === (c.id || c.contractNumber) ? null : c.id || c.contractNumber || null))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company signature pad — NOVAIQ's own sign-off on a negotiated contract
// ---------------------------------------------------------------------------

interface CompanySignatureHandle {
  getDataUrl: () => string;
}

const CompanySignaturePad = forwardRef<
  CompanySignatureHandle,
  { isAr: boolean; initialDataUrl?: string; onDirtyChange: (dirty: boolean) => void }
>(({ isAr, initialDataUrl, onDirtyChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialDataUrl);

  // Draws the existing saved signature (if any) onto the canvas once it mounts, so
  // re-opening a contract shows what was already signed instead of a blank pad.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(!!initialDataUrl);
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = initialDataUrl;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDataUrl]);

  useImperativeHandle(ref, () => ({
    getDataUrl: () => (hasSignature ? canvasRef.current?.toDataURL('image/png') || '' : ''),
  }));

  const getCanvasPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if ('touches' in e) e.preventDefault();

    setIsDrawing(true);
    setHasSignature(true);
    onDirtyChange(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const point = getCanvasPoint(canvas, clientX, clientY);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ('touches' in e) e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const point = getCanvasPoint(canvas, clientX, clientY);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f4f4f5';
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onDirtyChange(true);
  };

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-zinc-700 bg-zinc-900">
        <canvas
          ref={canvasRef}
          width={500}
          height={120}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={() => setIsDrawing(false)}
          onMouseLeave={() => setIsDrawing(false)}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={() => setIsDrawing(false)}
          className="w-full h-28 cursor-crosshair touch-none"
        />
        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-zinc-500 text-xs font-semibold">
            {isAr ? '[ ارسم توقيع الاعتماد هنا ]' : '[ Draw the sign-off here ]'}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>{isAr ? 'مسح التوقيع' : 'Clear Signature'}</span>
      </button>
    </div>
  );
});

CompanySignaturePad.displayName = 'CompanySignaturePad';

function ContractRow({
  contract,
  isAr,
  language,
  expanded,
  onToggle,
}: {
  contract: ContractData;
  isAr: boolean;
  language: Language;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [status, setStatus] = useState(contract.status);
  const [totalPrice, setTotalPrice] = useState(String(contract.totalPriceIQD || 0));
  const [adminNotes, setAdminNotes] = useState(contract.adminNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const signatureRef = useRef<CompanySignatureHandle>(null);
  const [signatureDirty, setSignatureDirty] = useState(false);

  useEffect(() => {
    setStatus(contract.status);
    setTotalPrice(String(contract.totalPriceIQD || 0));
    setAdminNotes(contract.adminNotes || '');
    setSignatureDirty(false);
  }, [contract.status, contract.totalPriceIQD, contract.adminNotes, contract.companySignatureDataUrl]);

  const dirty =
    status !== contract.status ||
    Number(totalPrice) !== (contract.totalPriceIQD || 0) ||
    adminNotes !== (contract.adminNotes || '') ||
    signatureDirty;

  const handleSave = async () => {
    if (!contract.id || isSaving) return;
    setIsSaving(true);
    try {
      const companySignatureDataUrl = signatureDirty ? signatureRef.current?.getDataUrl() : undefined;
      await updateContractFields(contract.id, {
        status,
        totalPriceIQD: Number(totalPrice) || 0,
        adminNotes: adminNotes.trim(),
        ...(companySignatureDataUrl !== undefined ? { companySignatureDataUrl } : {}),
      });
      cosmicAudio.playPing();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    const confirmMsg = isAr
      ? `هل تريد حذف عقد "${contract.companyName}" نهائياً؟`
      : `Permanently delete the contract for "${contract.companyName}"?`;
    if (!window.confirm(confirmMsg)) return;
    setIsDeleting(true);
    try {
      await deleteContractFromFirebase(contract.id, contract.contractNumber);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!printRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      await generateContractPDF(printRef.current, contract);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
      {expanded && <ConnectedContractPrintDocument ref={printRef} contract={contract} language={language} />}

      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-zinc-900/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Pencil className="w-4 h-4 text-zinc-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-white truncate">{contract.companyName}</div>
            <div className="text-[10px] text-zinc-500 font-mono truncate">
              {contract.contractNumber} · {translateText(contract.templateTitle, language)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono text-zinc-300 hidden sm:inline">{formatPrice(contract.totalPriceIQD || 0, language)}</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-zinc-200">
            {translateText(statusArabic(contract.status), language)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-zinc-800 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-4">
            <div className="text-zinc-400">{isAr ? 'الممثل:' : 'Representative:'} <span className="text-white">{contract.repName}</span></div>
            <div className="text-zinc-400">{isAr ? 'الهاتف:' : 'Phone:'} <span className="text-white font-mono" dir="ltr">{contract.phone}</span></div>
            <div className="text-zinc-400">{isAr ? 'البريد:' : 'Email:'} <span className="text-white font-mono" dir="ltr">{contract.email}</span></div>
            <div className="text-zinc-400">{isAr ? 'المدينة:' : 'City:'} <span className="text-white">{translateText(contract.city, language)}</span></div>
          </div>

          {contract.customFeaturesText && (
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
              <span className="text-zinc-400 block mb-1">{isAr ? 'طلب العميل الأصلي:' : "Client's Original Request:"}</span>
              <p className="text-zinc-200">{contract.customFeaturesText}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">{isAr ? 'حالة العقد' : 'Contract Status'}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContractData['status'])}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-bold cursor-pointer"
              >
                {STATUS_FLOW.map((s) => (
                  <option key={s} value={s}>
                    {translateText(statusArabic(s), language)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                {isAr ? 'السعر النهائي المتفق عليه (د.ع)' : 'Final Agreed Price (IQD)'}
              </label>
              <input
                type="number"
                min={0}
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono"
                dir="ltr"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                ≈ ${toUSD(Number(totalPrice) || 0).toLocaleString()} USD
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
              {isAr ? 'الشروط المتفق عليها بعد المراجعة (تظهر على العقد المطبوع)' : 'Agreed Terms After Review (shown on the printed contract)'}
            </label>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={isAr ? 'مثال: تم الاتفاق على تخفيض السعر مقابل الدفع الكامل مسبقاً...' : 'e.g. Agreed on a reduced price in exchange for full upfront payment...'}
              className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
              {isAr ? 'توقيع واعتماد NOVAIQ (يظهر على العقد المطبوع بجانب توقيع العميل)' : "NOVAIQ's Sign-off (shown on the printed contract next to the client's signature)"}
            </label>
            <CompanySignaturePad
              ref={signatureRef}
              isAr={isAr}
              initialDataUrl={contract.companySignatureDataUrl}
              onDirtyChange={setSignatureDirty}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 disabled:opacity-60 text-red-200 border border-red-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isAr ? 'حذف' : 'Delete'}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white border border-zinc-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isAr ? 'تنزيل PDF' : 'Download PDF'}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty || isSaving}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all border border-white"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isAr ? 'حفظ التغييرات' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

function PricingTab({ isAr, language }: { isAr: boolean; language: Language }) {
  const templates = useLiveTemplates();
  const [overrides, setOverrides] = useState<Record<string, PricingOverride>>({});

  useEffect(() => subscribeToPricingOverrides(setOverrides), []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">
        {isAr
          ? 'أي تعديل هنا ينعكس فوراً على معرض القوالب وحاسبة العقد للزوار — بدون الحاجة لأي تحديث برمجي.'
          : 'Any change here reflects immediately on the public template gallery and contract builder — no code deploy needed.'}
      </p>
      <div className="space-y-2.5">
        {templates.map((t) => (
          <PricingRow key={t.id} template={t} isAr={isAr} language={language} savedOverride={overrides[t.id]} />
        ))}
      </div>
    </div>
  );
}

function PricingRow({
  template,
  isAr,
  language,
  savedOverride,
}: {
  template: ReturnType<typeof useLiveTemplates>[number];
  isAr: boolean;
  language: Language;
  savedOverride?: PricingOverride;
}) {
  const [expanded, setExpanded] = useState(false);
  const [basePriceIQD, setBasePriceIQD] = useState(String(template.basePriceIQD));
  const [specPrices, setSpecPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(template.specificationsOptions.map((s) => [s.id, String(s.priceIQD)]))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setBasePriceIQD(String(template.basePriceIQD));
    setSpecPrices(Object.fromEntries(template.specificationsOptions.map((s) => [s.id, String(s.priceIQD)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.basePriceIQD, template.specificationsOptions.map((s) => s.priceIQD).join(',')]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await savePricingOverride(template.id, {
        basePriceIQD: Number(basePriceIQD) || 0,
        basePriceUSD: toUSD(Number(basePriceIQD) || 0),
        specPriceIQD: Object.fromEntries(Object.entries(specPrices).map(([id, v]) => [id, Number(v) || 0])),
      });
      setJustSaved(true);
      cosmicAudio.playPing();
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-zinc-900/50 transition-colors"
      >
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-bold text-white truncate">{translateText(template.title, language)}</div>
          <div className="text-[10px] text-zinc-500 truncate">{translateText(template.categoryLabel, language)}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {savedOverride && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-800">
              {isAr ? 'سعر معدّل' : 'Custom price'}
            </span>
          )}
          <span className="text-xs font-mono text-zinc-300">{formatPrice(template.basePriceIQD, language)}</span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-3 border-t border-zinc-800 animate-fade-in">
          <div className="pt-4">
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
              {isAr ? 'السعر الأساسي للقالب (د.ع)' : 'Template Base Price (IQD)'}
            </label>
            <input
              type="number"
              min={0}
              value={basePriceIQD}
              onChange={(e) => setBasePriceIQD(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono"
              dir="ltr"
            />
          </div>

          {template.specificationsOptions.length > 0 && (
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-zinc-400">
                {isAr ? 'أسعار الإضافات' : 'Add-on Prices'}
              </label>
              {template.specificationsOptions.map((spec) => (
                <div key={spec.id} className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-300 flex-1 truncate">{translateText(spec.label, language)}</span>
                  <input
                    type="number"
                    min={0}
                    value={specPrices[spec.id] ?? ''}
                    onChange={(e) => setSpecPrices((prev) => ({ ...prev, [spec.id]: e.target.value }))}
                    className="w-28 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs font-mono shrink-0"
                    dir="ltr"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-60 text-black text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all border border-white"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{justSaved ? (isAr ? 'تم الحفظ ✓' : 'Saved ✓') : isAr ? 'حفظ السعر' : 'Save Price'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team (admin allowlist)
// ---------------------------------------------------------------------------

function TeamTab({ isAr }: { isAr: boolean }) {
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await addAdminEmail(trimmed);
      setMessage({
        type: 'success',
        text: isAr
          ? `تمت إضافة ${trimmed} كمسؤول. عليه إنشاء حساب عادي (اشتراك) بنفس هذا البريد إن لم يفعل بعد.`
          : `${trimmed} added as an admin. They should sign up normally with this same email if they haven't already.`,
      });
      setEmail('');
    } catch (err) {
      setMessage({ type: 'error', text: authErrorMessage(err, isAr) });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-xs text-zinc-400">
        {isAr
          ? 'أضف بريد شريكك هنا ليصبح مسؤولاً (أدمن) بنفس صلاحياتك الكاملة. عليه بعدها إنشاء حساب عادي بنفس البريد من زر "اشتراك" — بمجرد تسجيل دخوله، سيدخل تلقائياً إلى لوحة التحكم هذه بدلاً من صفحة العقود الخاصة بالزبائن.'
          : "Add your partner's email here to make them a full admin. They then just sign up normally with this same email via the \"Sign Up\" button — once logged in, they'll automatically land in this control panel instead of the customer contracts view."}
      </p>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="partner@email.com"
          dir="ltr"
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs font-mono"
        />
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-60 text-black text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all border border-white shrink-0"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          <span>{isAr ? 'إضافة' : 'Add'}</span>
        </button>
      </form>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs border ${
            message.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-300'
              : 'bg-red-950/40 border-red-900/60 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
