import React, { useState, useEffect, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  LogOut,
  TrendingUp,
  FileCheck,
  DollarSign,
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
  Ban,
  UserCheck,
  Layers,
} from 'lucide-react';
import { ContractData } from '../types';
import { Language, translateText } from '../lib/i18n';
import { formatPrice, toUSD, Currency } from '../lib/currency';
import { subscribeToContracts, deleteContractFromFirebase, updateContractFields } from '../lib/firebase';
import { logoutAccount, addAdminEmail, authErrorMessage } from '../lib/auth';
import { listRegularSubscribers, setUserDisabled, deleteUserAccount, ManagedUser, listTeamMembers, TeamMember } from '../lib/adminUsers';
import { useLiveTemplates, subscribeToPricingOverrides, savePricingOverride, PricingOverride } from '../lib/pricingOverrides';
import { generateContractPDF } from '../lib/pdfGenerator';
import { ConnectedContractPrintDocument } from './ContractPrintDocument';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import { cosmicAudio } from '../lib/audio';
import { showToast } from '../lib/toast';
import { PriceInput } from './PriceInput';

interface AdminDashboardProps {
  language: Language;
  currency?: Currency;
}

type Tab = 'overview' | 'contracts' | 'pricing' | 'team' | 'members';

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

function TabButton({
  tabItem,
  active,
  onClick,
  full,
}: {
  tabItem: { id: string; label: string; icon: React.ElementType };
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

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: isAr ? 'نظرة عامة' : 'Overview', icon: BarChart3 },
    { id: 'contracts', label: isAr ? 'إدارة العقود' : 'Contracts', icon: FileCheck },
    { id: 'pricing', label: isAr ? 'الأسعار' : 'Pricing', icon: Tag },
    { id: 'team', label: isAr ? 'الفريق' : 'Team', icon: Users },
    { id: 'members', label: isAr ? 'المشتركون' : 'Subscribers', icon: UserCheck },
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
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function OverviewTab({
  isAr,
  stats,
  contracts,
  language,
  currency,
}: {
  isAr: boolean;
  stats: ReturnType<typeof useOverviewStatsType>;
  contracts: ContractData[];
  language: Language;
  currency: Currency;
}) {
  const recent = contracts.slice(0, 6);

  return (
    <div className="space-y-4">
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
      </div>

      <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
        <h3 className="text-sm font-bold text-white">{isAr ? 'أحدث العقود' : 'Recent Contracts'}</h3>
        {recent.length === 0 ? (
          <p className="text-xs text-zinc-500">{isAr ? 'لا توجد عقود بعد' : 'No contracts yet'}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {recent.map((c) => (
              <div key={c.id || c.contractNumber} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                <div className="min-w-0">
                  <div className="text-white font-bold truncate">{c.companyName}</div>
                  <div className="text-zinc-500 text-[10px] truncate">{translateText(c.templateTitle, language)}</div>
                </div>
                <span className="text-zinc-300 font-mono shrink-0">{formatPrice(c.totalPriceIQD || 0, language, currency)}</span>
              </div>
            ))}
          </div>
        )}
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

function ContractsTab({
  isAr,
  language,
  currency,
  contracts,
  stats,
}: {
  isAr: boolean;
  language: Language;
  currency: Currency;
  contracts: ContractData[];
  stats: ReturnType<typeof useOverviewStatsType>;
}) {
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile icon={FileCheck} label={isAr ? 'إجمالي العقود' : 'Total Contracts'} value={String(stats.count)} />
        <StatTile
          icon={DollarSign}
          label={isAr ? 'إجمالي القيمة' : 'Total Value'}
          value={formatPrice(stats.totalIQD, language, currency)}
          accent="text-emerald-400"
        />
        <StatTile
          icon={TrendingUp}
          label={isAr ? 'متوسط قيمة العقد' : 'Avg. Contract Value'}
          value={formatPrice(stats.avgIQD, language, currency)}
        />
      </div>

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
              currency={currency}
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
  currency,
  expanded,
  onToggle,
}: {
  contract: ContractData;
  isAr: boolean;
  language: Language;
  currency: Currency;
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
      showToast(isAr ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully', 'success');
    } catch {
      showToast(isAr ? 'تعذر حفظ التعديلات، حاول مجدداً' : 'Failed to save changes — please try again', 'error');
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
      showToast(isAr ? 'تم حذف العقد' : 'Contract deleted', 'success');
    } catch {
      showToast(isAr ? 'تعذر حذف العقد، حاول مجدداً' : 'Failed to delete the contract — please try again', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!printRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      await generateContractPDF(printRef.current, contract);
    } catch {
      showToast(isAr ? 'تعذر إنشاء ملف PDF، حاول مجدداً' : 'Failed to generate the PDF — please try again', 'error');
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
          <span className="text-xs font-mono text-zinc-300 hidden sm:inline">{formatPrice(contract.totalPriceIQD || 0, language, currency)}</span>
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
              <PriceInput
                value={totalPrice}
                onChange={setTotalPrice}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono"
              />
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

function PricingTab({ isAr, language, currency }: { isAr: boolean; language: Language; currency: Currency }) {
  const templates = useLiveTemplates();
  const [overrides, setOverrides] = useState<Record<string, PricingOverride>>({});

  useEffect(() => subscribeToPricingOverrides(setOverrides), []);

  return (
    <div className="space-y-3">
      <div className="max-w-xs">
        <StatTile icon={Layers} label={isAr ? 'إجمالي القوالب' : 'Total Templates'} value={String(templates.length)} accent="text-amber-400" />
      </div>
      <p className="text-xs text-zinc-400">
        {isAr
          ? 'أي تعديل هنا ينعكس فوراً على معرض القوالب وحاسبة العقد للزوار — بدون الحاجة لأي تحديث برمجي.'
          : 'Any change here reflects immediately on the public template gallery and contract builder — no code deploy needed.'}
      </p>
      <div className="space-y-2.5">
        {templates.map((t) => (
          <PricingRow key={t.id} template={t} isAr={isAr} language={language} currency={currency} savedOverride={overrides[t.id]} />
        ))}
      </div>
    </div>
  );
}

function PricingRow({
  template,
  isAr,
  language,
  currency,
  savedOverride,
}: {
  template: ReturnType<typeof useLiveTemplates>[number];
  isAr: boolean;
  language: Language;
  currency: Currency;
  savedOverride?: PricingOverride;
}) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(template.title);
  const [previewImage, setPreviewImage] = useState(template.previewImage);
  const [imageBroken, setImageBroken] = useState(false);
  const [basePriceIQD, setBasePriceIQD] = useState(String(template.basePriceIQD));
  const [specPrices, setSpecPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(template.specificationsOptions.map((s) => [s.id, String(s.priceIQD)]))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setTitle(template.title);
    setPreviewImage(template.previewImage);
    setBasePriceIQD(String(template.basePriceIQD));
    setSpecPrices(Object.fromEntries(template.specificationsOptions.map((s) => [s.id, String(s.priceIQD)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.title, template.previewImage, template.basePriceIQD, template.specificationsOptions.map((s) => s.priceIQD).join(',')]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await savePricingOverride(template.id, {
        title: title.trim() || template.title,
        previewImage: previewImage.trim() || template.previewImage,
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
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-zinc-900/50 transition-colors"
      >
        {template.previewImage && !imageBroken ? (
          <img
            src={template.previewImage}
            alt=""
            onError={() => setImageBroken(true)}
            className="w-12 h-12 rounded-xl object-cover border border-zinc-800 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-zinc-500" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-bold text-white truncate">{translateText(template.title, language)}</div>
          <div className="text-[10px] text-zinc-500 truncate">{translateText(template.categoryLabel, language)}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {savedOverride && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-800">
              {isAr ? 'معدّل' : 'Edited'}
            </span>
          )}
          <span className="text-xs font-mono text-zinc-300">{formatPrice(template.basePriceIQD, language, currency)}</span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-3 border-t border-zinc-800 animate-fade-in">
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                  {isAr ? 'اسم القالب' : 'Template Name'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                  {isAr ? 'رابط صورة القالب' : 'Template Image URL'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={previewImage}
                  onChange={(e) => {
                    setPreviewImage(e.target.value);
                    setImageBroken(false);
                  }}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs font-mono"
                />
              </div>
            </div>
            {previewImage && !imageBroken ? (
              <img
                src={previewImage}
                alt=""
                onError={() => setImageBroken(true)}
                className="w-full sm:w-28 h-28 rounded-xl object-cover border border-zinc-800"
              />
            ) : (
              <div className="w-full sm:w-28 h-28 rounded-xl bg-zinc-900 border border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 text-[10px] text-center px-2">
                {isAr ? 'رابط غير صالح' : 'Invalid URL'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
              {isAr ? 'السعر الأساسي للقالب (د.ع)' : 'Template Base Price (IQD)'}
            </label>
            <PriceInput
              value={basePriceIQD}
              onChange={setBasePriceIQD}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono"
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
                  <PriceInput
                    value={specPrices[spec.id] ?? ''}
                    onChange={(v) => setSpecPrices((prev) => ({ ...prev, [spec.id]: v }))}
                    className="w-28 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs font-mono shrink-0"
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
              <span>{justSaved ? (isAr ? 'تم الحفظ ✓' : 'Saved ✓') : isAr ? 'حفظ التغييرات' : 'Save Changes'}</span>
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

  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setMembers(await listTeamMembers());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(isAr ? 'ar-IQ' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
      load();
    } catch (err) {
      setMessage({ type: 'error', text: authErrorMessage(err, isAr) });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
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

      <div className="space-y-3 pt-2 border-t border-zinc-800">
        <div className="flex items-center justify-between pt-3">
          <h4 className="text-xs font-bold text-white">{isAr ? 'أعضاء الفريق الحاليون' : 'Current Team Members'}</h4>
          <button
            onClick={load}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            <span>{isAr ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>

        {loadError && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 text-xs">
            {loadError}
          </div>
        )}

        {isLoading && !members ? (
          <div className="py-10 text-center text-zinc-400 text-xs">
            <Loader2 className="w-5 h-5 text-white mx-auto mb-2 animate-spin" />
          </div>
        ) : members && members.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-2.5">
            {members.map((m) => (
              <div key={m.email} className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center gap-3">
                {m.photoURL ? (
                  <img src={m.photoURL} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">{m.displayName || m.email}</span>
                    {!m.hasAccount && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-900/60 text-amber-300 text-[10px] font-bold shrink-0">
                        {isAr ? 'بانتظار التسجيل' : 'Pending sign-up'}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono truncate" dir="ltr">{m.email}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">
                    {isAr ? 'أُضيف:' : 'Added:'} {formatDate(m.addedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loadError && (
            <div className="py-10 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl">
              {isAr ? 'لا يوجد أعضاء فريق بعد' : 'No team members yet'}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function MembersTab({ isAr }: { isAr: boolean }) {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await listRegularSubscribers();
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = (users || []).filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
  });

  const formatDate = (iso: string | undefined) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(isAr ? 'ar-IQ' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleToggleDisabled = async (u: ManagedUser) => {
    if (busyUid) return;
    setBusyUid(u.uid);
    try {
      await setUserDisabled(u.uid, !u.disabled);
      setUsers((prev) => prev && prev.map((x) => (x.uid === u.uid ? { ...x, disabled: !u.disabled } : x)));
      showToast(
        !u.disabled ? (isAr ? 'تم تعطيل الحساب' : 'Account disabled') : (isAr ? 'تم إعادة تفعيل الحساب' : 'Account re-enabled'),
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : (isAr ? 'فشلت العملية' : 'Action failed'), 'error');
    } finally {
      setBusyUid(null);
    }
  };

  const handleDelete = async (u: ManagedUser) => {
    if (busyUid) return;
    const confirmMsg = isAr
      ? `هل تريد حذف حساب "${u.email}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Permanently delete the account for "${u.email}"? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    setBusyUid(u.uid);
    try {
      await deleteUserAccount(u.uid);
      setUsers((prev) => prev && prev.filter((x) => x.uid !== u.uid));
      showToast(isAr ? 'تم حذف الحساب' : 'Account deleted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : (isAr ? 'فشل الحذف' : 'Delete failed'), 'error');
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <StatTile
          icon={UserCheck}
          label={isAr ? 'إجمالي المشتركين' : 'Total Subscribers'}
          value={users === null ? '—' : String(users.length)}
          accent="text-indigo-400"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <p className="text-xs text-zinc-400 max-w-lg">
          {isAr
            ? 'حسابات الزبائن العاديين فقط (المسؤولون يُدارون من تبويب الفريق). عطّل حساباً لمنعه من الدخول مؤقتاً، أو احذفه نهائياً.'
            : "Regular customer accounts only (admins are managed from the Team tab). Disable to temporarily block sign-in, or delete permanently."}
        </p>
        <button
          onClick={load}
          disabled={isLoading}
          className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shrink-0 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          <span>{isAr ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isAr ? 'ابحث بالبريد أو الاسم...' : 'Search by email or name...'}
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs"
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 text-xs">
          {error}
        </div>
      )}

      {isLoading && !users ? (
        <div className="py-16 text-center text-zinc-400 text-xs">
          <Loader2 className="w-6 h-6 text-white mx-auto mb-2 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl">
          {isAr ? 'لا يوجد حسابات مطابقة' : 'No matching accounts'}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-2.5">
          {filtered.map((u) => (
            <div
              key={u.uid}
              className={`p-3.5 rounded-2xl bg-zinc-950 border flex items-center justify-between gap-3 ${
                u.disabled ? 'border-red-900/50' : 'border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {u.photoURL ? (
                  <img src={u.photoURL} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">{u.displayName || u.email}</span>
                    {u.disabled && (
                      <span className="px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/60 text-red-300 text-[10px] font-bold shrink-0">
                        {isAr ? 'معطّل' : 'Disabled'}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono truncate" dir="ltr">{u.email}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">
                    {isAr ? 'انضم:' : 'Joined:'} {formatDate(u.createdAt)} · {isAr ? 'آخر دخول:' : 'Last seen:'} {formatDate(u.lastSignInAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleToggleDisabled(u)}
                  disabled={busyUid === u.uid}
                  title={u.disabled ? (isAr ? 'إعادة تفعيل' : 'Re-enable') : (isAr ? 'تعطيل' : 'Disable')}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {busyUid === u.uid ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : u.disabled ? (
                    <UserCheck className="w-3.5 h-3.5" />
                  ) : (
                    <Ban className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  disabled={busyUid === u.uid}
                  title={isAr ? 'حذف نهائي' : 'Delete permanently'}
                  className="p-2 rounded-lg bg-red-950/30 hover:bg-red-950/50 border border-red-900/50 text-red-300 hover:text-red-200 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
