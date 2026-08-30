// Contract administration: the searchable list, the per-contract editor row, and the
// company-signature pad the admin signs with.
import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  FileCheck,
  DollarSign,
  Download,
  Trash2,
  Save,
  Pencil,
  Search,
  Loader2,
  RotateCcw,
  Plus,
  X,
  IdCard,
} from 'lucide-react';
import { ContractData, PaymentRecord } from '../../types';
import { Language, translateText } from '../../lib/i18n';
import { formatPrice, Currency } from '../../lib/currency';
import { deleteContractFromFirebase, updateContractFields } from '../../lib/firebase';
import { generateContractPDF } from '../../lib/pdfGenerator';
import { ConnectedContractPrintDocument } from '../ContractPrintDocument';
import { cosmicAudio } from '../../lib/audio';
import { showToast } from '../../lib/toast';
import { useSignaturePad } from '../../lib/useSignaturePad';
import { sumPayments, derivePaymentStatus, newPaymentId, todayIsoDate } from '../../lib/payments';
import { PriceInput } from '../PriceInput';
import { STATUS_FLOW, StatTile, statusArabic, paymentStatusArabic, CollectionBar, AdminStats } from './shared';
import { STAGE_COLORS } from '../../lib/statusColors';
import { CustomerProfileSheet } from './CustomerProfileSheet';

export function ContractsTab({
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
  stats: AdminStats;
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile icon={FileCheck} label={isAr ? 'إجمالي العقود' : 'Total Contracts'} value={String(stats.count)} />
        <StatTile
          icon={DollarSign}
          label={isAr ? 'إجمالي القيمة' : 'Total Value'}
          value={formatPrice(stats.totalIQD, language, currency)}
          accent="text-emerald-700"
        />
        <StatTile
          icon={TrendingUp}
          label={isAr ? 'متوسط قيمة العقد' : 'Avg. Contract Value'}
          value={formatPrice(stats.avgIQD, language, currency)}
        />
        <StatTile
          icon={TrendingDown}
          label={isAr ? 'إجمالي التكلفة' : 'Total Cost'}
          value={formatPrice(stats.totalCostIQD, language, currency)}
          accent="text-red-600"
        />
        <StatTile
          icon={TrendingUp}
          label={isAr ? 'صافي الربح (محقق)' : 'Net Profit (Realized)'}
          value={formatPrice(stats.netProfitIQD, language, currency)}
          accent={stats.netProfitIQD >= 0 ? 'text-emerald-700' : 'text-red-600'}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-ink/50`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? 'ابحث بالاسم، رقم العقد، أو الهاتف...' : 'Search by name, contract #, or phone...'}
            className={`w-full ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 rounded-xl bg-paper border border-ink/10 focus:border-periwinkle focus:outline-none text-ink text-xs`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-4 py-2.5 rounded-xl bg-paper border border-ink/10 text-ink text-xs font-bold cursor-pointer"
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
        <div className="py-16 text-center text-ink/50 text-xs border border-dashed border-ink/10 rounded-2xl">
          {isAr ? 'لا توجد عقود مطابقة' : 'No matching contracts'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <ContractRow
              key={c.id || c.contractNumber}
              contract={c}
              allContracts={contracts}
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
  const { canvasRef, hasSignature, startDrawing, draw, stopDrawing, clear, getDataUrl } = useSignaturePad({
    initialDataUrl,
    onStrokeStart: () => onDirtyChange(true),
    onClear: () => onDirtyChange(true),
  });

  useImperativeHandle(ref, () => ({ getDataUrl }));

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-ink/15 bg-white/70">
        <canvas
          ref={canvasRef}
          width={500}
          height={120}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-28 cursor-crosshair touch-none"
        />
        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-ink/50 text-xs font-semibold">
            {isAr ? '[ ارسم توقيع الاعتماد هنا ]' : '[ Draw the sign-off here ]'}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={clear}
        className="flex items-center gap-1 text-[11px] text-ink/60 hover:text-ink cursor-pointer"
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
  allContracts,
  isAr,
  language,
  currency,
  expanded,
  onToggle,
}: {
  contract: ContractData;
  /** كل عقود الموقع (غير مُصفّاة) — تُمرَّر للملف الشخصي بحيث يقدر يجمع كل عقود نفس الشخص،
   *  لا هذا العقد وحده. */
  allContracts: ContractData[];
  isAr: boolean;
  language: Language;
  currency: Currency;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [showProfile, setShowProfile] = useState(false);
  // Legacy contracts saved before the payment ledger existed only have a lump `paidAmountIQD`
  // — seed a single migrated entry so that money isn't silently dropped from the ledger the
  // first time this contract is opened after the feature shipped. The id must be stable
  // (not random) across re-renders — this same function also computes the dirty-check
  // baseline, and a fresh random id every call would make an untouched legacy contract look
  // permanently dirty.
  const baselinePayments = (c: ContractData): PaymentRecord[] =>
    c.payments ||
    (c.paidAmountIQD
      ? [
          {
            id: `legacy_${c.id || c.contractNumber}`,
            amountIQD: c.paidAmountIQD,
            date: (c.updatedAt || c.createdAt || '').slice(0, 10) || todayIsoDate(),
            note: isAr ? 'دفعة مسجلة سابقاً' : 'Previously recorded payment',
          },
        ]
      : []);

  const [status, setStatus] = useState(contract.status);
  const [totalPrice, setTotalPrice] = useState(String(contract.totalPriceIQD || 0));
  const [cost, setCost] = useState(String(contract.costIQD || 0));
  const [payments, setPayments] = useState<PaymentRecord[]>(() => baselinePayments(contract));
  const [installmentsPlanned, setInstallmentsPlanned] = useState(contract.installmentsPlanned ? String(contract.installmentsPlanned) : '');
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
    setCost(String(contract.costIQD || 0));
    setPayments(baselinePayments(contract));
    setInstallmentsPlanned(contract.installmentsPlanned ? String(contract.installmentsPlanned) : '');
    setAdminNotes(contract.adminNotes || '');
    setSignatureDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.status, contract.totalPriceIQD, contract.costIQD, contract.payments, contract.paidAmountIQD, contract.installmentsPlanned, contract.adminNotes, contract.companySignatureDataUrl]);

  const addPayment = () => {
    setPayments((prev) => [...prev, { id: newPaymentId(), amountIQD: 0, date: todayIsoDate(), note: '' }]);
  };
  const updatePayment = (id: string, patch: Partial<PaymentRecord>) => {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };
  const removePayment = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const paidAmountIQD = sumPayments(payments);
  const paymentStatus = derivePaymentStatus(paidAmountIQD, Number(totalPrice) || 0);
  const remainingIQD = (Number(totalPrice) || 0) - paidAmountIQD;
  const installmentsPlannedNum = Number(installmentsPlanned) || 0;

  const dirty =
    status !== contract.status ||
    Number(totalPrice) !== (contract.totalPriceIQD || 0) ||
    Number(cost) !== (contract.costIQD || 0) ||
    JSON.stringify(payments) !== JSON.stringify(baselinePayments(contract)) ||
    installmentsPlannedNum !== (contract.installmentsPlanned || 0) ||
    adminNotes !== (contract.adminNotes || '') ||
    signatureDirty;

  const rowProfit = paidAmountIQD - Number(cost || 0);

  const handleSave = async () => {
    if (isSaving) return;
    // The `!contract.id` bail that used to be here returned silently: pressing "حفظ
    // التغييرات" on any contract that had not come back from a Firestore snapshot did
    // nothing at all — no save, no error, no toast, the button just looked like it had been
    // ignored. Identifying the contract is updateContractFields' job (it keys on
    // contractNumber, which is the real document ID), and if it genuinely cannot work out
    // which document to write, it throws and the catch below says so out loud.
    setIsSaving(true);
    try {
      const companySignatureDataUrl = signatureDirty ? signatureRef.current?.getDataUrl() : undefined;
      await updateContractFields(contract, {
        status,
        totalPriceIQD: Number(totalPrice) || 0,
        costIQD: Number(cost) || 0,
        payments,
        paidAmountIQD,
        paymentStatus,
        // Plain number, never `undefined` — Firestore rejects undefined field values and
        // fails the entire write. `0` is not a lossy substitute for "unset" here: every
        // reader of this field treats it as `contract.installmentsPlanned || 0` and shows the
        // installment counter only when it is `> 0`, so zero and absent already mean the same
        // thing everywhere. It also makes clearing the box actually clear the value, which
        // sending `undefined` under merge:true could not do.
        installmentsPlanned: installmentsPlannedNum,
        adminNotes: adminNotes.trim(),
        ...(companySignatureDataUrl !== undefined ? { companySignatureDataUrl } : {}),
      });
      cosmicAudio.playPing();
      showToast(isAr ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully', 'success');
    } catch (e) {
      // Logged as well as toasted: "حاول مجدداً" is all the admin needs, but when a save keeps
      // failing the actual Firestore error (permissions, offline, bad field) is the only thing
      // that says why, and it was previously swallowed by a bare `catch {}`.
      console.error('Failed to save contract changes:', e);
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
    // حافة ملوّنة بلون مرحلة العقد (STAGE_COLORS) على الجانب البدائي (inline-start) — يمين
    // في العربية، يسار في الإنجليزية تلقائياً — بحيث تُعرف حالة العقد بلمحة واحدة قبل حتى
    // قراءة الشارة، خصوصاً في قائمة طويلة يتم تمريرها بسرعة على الهاتف.
    <div
      className="rounded-3xl bg-paper border border-ink/10 overflow-hidden"
      style={{ borderInlineStartWidth: '4px', borderInlineStartColor: STAGE_COLORS[contract.status].fill }}
    >
      {expanded && <ConnectedContractPrintDocument ref={printRef} contract={contract} language={language} />}

      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-sand-light/80 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Pencil className="w-4 h-4 text-ink/50 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-ink truncate">{contract.companyName}</div>
            <div className="text-[10px] text-ink/50 font-mono truncate">
              {contract.contractNumber} · {translateText(contract.templateTitle, language)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-ink/75 hidden sm:inline">{formatPrice(contract.totalPriceIQD || 0, language, currency)}</span>
          <span
            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
              (contract.paymentStatus || 'unpaid') === 'paid'
                ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                : (contract.paymentStatus || 'unpaid') === 'partial'
                ? 'bg-amber-950/60 border-amber-300 text-amber-700'
                : 'bg-white/70 border-ink/15 text-ink/60'
            }`}
          >
            {translateText(paymentStatusArabic(contract.paymentStatus), language)}
          </span>
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STAGE_COLORS[contract.status].badge}`}>
            {translateText(statusArabic(contract.status), language)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-ink/10 animate-fade-in">
          <div className="flex items-start justify-between gap-3 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs flex-1">
              <div className="text-ink/60">{isAr ? 'الممثل:' : 'Representative:'} <span className="text-ink">{contract.repName}</span></div>
              <div className="text-ink/60">{isAr ? 'الهاتف:' : 'Phone:'} <span className="text-ink font-mono" dir="ltr">{contract.phone}</span></div>
              <div className="text-ink/60">{isAr ? 'البريد:' : 'Email:'} <span className="text-ink font-mono" dir="ltr">{contract.email}</span></div>
              <div className="text-ink/60">{isAr ? 'المدينة:' : 'City:'} <span className="text-ink">{translateText(contract.city, language)}</span></div>
            </div>
            {/* الملف الشخصي: كل عقود هذا الشخص مجمَّعة، لا هذا العقد وحده — سلاسة التعامل معه
                لا تتطلب فتح كل عقد بمفرده لمعرفة رقمه أو مجموع تعاقداته. متاح فقط لعقد يحمل
                حساباً حقيقياً (uid)، وهو كل عقد يُنشأ اليوم. */}
            {contract.uid && (
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                title={isAr ? 'الملف الشخصي للعميل' : 'Customer profile'}
                className="p-2 rounded-lg bg-white/70 hover:bg-sand-light border border-ink/10 text-ink/60 hover:text-ink cursor-pointer transition-colors shrink-0"
              >
                <IdCard className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {contract.customFeaturesText && (
            <div className="p-3 rounded-xl bg-white/70 border border-ink/10 text-xs">
              <span className="text-ink/60 block mb-1">{isAr ? 'طلب العميل الأصلي:' : "Client's Original Request:"}</span>
              <p className="text-ink/90">{contract.customFeaturesText}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-ink/60 mb-1.5">{isAr ? 'حالة العقد' : 'Contract Status'}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContractData['status'])}
                className="w-full px-3 py-2.5 rounded-xl bg-white/70 border border-ink/10 text-ink text-xs font-bold cursor-pointer"
              >
                {STATUS_FLOW.map((s) => (
                  <option key={s} value={s}>
                    {translateText(statusArabic(s), language)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink/60 mb-1.5">
                {isAr ? 'السعر النهائي المتفق عليه (د.ع)' : 'Final Agreed Price (IQD)'}
              </label>
              <PriceInput
                value={totalPrice}
                onChange={setTotalPrice}
                className="w-full px-3 py-2.5 rounded-xl bg-white/70 border border-ink/10 text-ink text-xs font-mono"
              />
            </div>
          </div>

          {/* Financial tracking — internal only, never shown on the client's printed contract.
              Payment status/collected amount are derived from the ledger below, not typed in
              directly, so they can never drift out of sync with what was actually logged.
              Profit here is collected cash minus cost, not the full agreed price minus cost,
              so an unpaid or partially-paid contract never inflates realized profit. */}
          {/* Three bands, in the order the question is actually asked: where does this contract
              stand, what did it cost us, and what was actually paid and when. The old layout put a
              cost input in the middle of a row of read-only figures, so an editable field and two
              derived ones looked identical and nothing said which numbers you could change. */}
          <div className="rounded-xl bg-white/70 border border-ink/10 overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-ink/10 flex items-center justify-between gap-2 flex-wrap bg-sand-deep/40">
              <span className="text-[11px] font-bold text-ink/75">
                {isAr ? 'التتبع المالي' : 'Financial Tracking'}
                <span className="text-ink/45 font-normal"> — {isAr ? 'داخلي، لا يظهر للعميل' : 'internal, never shown to the client'}</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                  paymentStatus === 'paid'
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : paymentStatus === 'partial'
                    ? 'bg-amber-950/60 border-amber-300 text-amber-700'
                    : 'bg-paper border-ink/15 text-ink/60'
                }`}
              >
                {translateText(paymentStatusArabic(paymentStatus), language)}
              </span>
            </div>

            {/* Band 1 — position. Derived, read-only, led by the bar. */}
            <div className="p-3.5 space-y-3 border-b border-ink/10">
              <CollectionBar collected={paidAmountIQD} total={Number(totalPrice) || 0} isAr={isAr} />
              {/* عمود واحد على شاشة هاتف ضيقة، ثلاثة أعمدة بدءاً من sm — ثلاثة مبالغ مالية
                  بخط 11px في عمود واحد ضيّق كانت تتزاحم فعلياً على هاتف بعرض 320-375px. */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="min-w-0">
                  <span className="text-ink/50 block mb-0.5">{isAr ? 'قيمة العقد' : 'Contract value'}</span>
                  <strong className="text-ink font-mono wrap-break-word">{formatPrice(Number(totalPrice) || 0, language, currency)}</strong>
                </div>
                <div className="min-w-0">
                  <span className="text-ink/50 block mb-0.5">{isAr ? 'المحصّل' : 'Collected'}</span>
                  <strong className="text-emerald-700 font-mono wrap-break-word">{formatPrice(paidAmountIQD, language, currency)}</strong>
                </div>
                <div className="min-w-0">
                  <span className="text-ink/50 block mb-0.5">{isAr ? 'المتبقي' : 'Remaining'}</span>
                  <strong className={`font-mono wrap-break-word ${remainingIQD > 0 ? 'text-amber-700' : 'text-ink/50'}`}>
                    {formatPrice(Math.max(remainingIQD, 0), language, currency)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Band 2 — the two things you type, and the one figure they produce. */}
            <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-3 items-end border-b border-ink/10 bg-sand-deep/30">
              <div className="min-w-0">
                <label className="block text-[11px] text-ink/50 mb-1">{isAr ? 'التكلفة علينا' : 'Our cost'}</label>
                <PriceInput
                  value={cost}
                  onChange={setCost}
                  className="w-full px-2.5 py-2 rounded-lg bg-paper border border-ink/10 text-ink text-xs font-mono"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] text-ink/50 mb-1">{isAr ? 'عدد الدفعات المتفق عليها' : 'Agreed installments'}</label>
                <input
                  type="number"
                  min={0}
                  value={installmentsPlanned}
                  onChange={(e) => setInstallmentsPlanned(e.target.value)}
                  placeholder={isAr ? 'اختياري' : 'optional'}
                  className="w-full px-2.5 py-2 rounded-lg bg-paper border border-ink/10 text-ink text-xs font-mono"
                />
              </div>
              <div className="min-w-0 col-span-2 sm:col-span-1">
                <span className="block text-[11px] text-ink/50 mb-1">{isAr ? 'الربح المحقق' : 'Realized profit'}</span>
                <strong className={`block text-base font-mono font-extrabold wrap-break-word ${rowProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatPrice(rowProfit, language, currency)}
                </strong>
              </div>
            </div>

            {/* Band 3 — the ledger every figure above is derived from. */}
            <div className="p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-ink/60">
                  {isAr ? 'سجل الدفعات' : 'Payment ledger'}
                  {installmentsPlannedNum > 0 && (
                    <span className="text-ink/45 font-normal font-mono">
                      {' '}— {payments.length}/{installmentsPlannedNum}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={addPayment}
                  className="flex items-center gap-1 text-[11px] font-bold text-ink bg-white/90 hover:bg-sand-light border border-ink/15 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAr ? 'إضافة دفعة' : 'Add payment'}
                </button>
              </div>

              {payments.length === 0 ? (
                <p className="text-[11px] text-ink/45 py-2 text-center rounded-lg border border-dashed border-ink/10">
                  {isAr ? 'لم تُسجَّل أي دفعة بعد' : 'No payments logged yet'}
                </p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    // صفّان واضحان على الهاتف بدل أربعة عناصر تتزاحم في صفّ واحد وتلتف بشكل
                    // عشوائي (flex-wrap القديمة): التاريخ والمبلغ جنباً إلى جنب (grid-cols-2)،
                    // ثم الملاحظة وزر الحذف جنباً إلى جنب أسفلهما. sm:contents يُلغي هذا
                    // التجميع بدءاً من sm فيعود التخطيط الأصلي (صفّ واحد بأربعة عناصر) تماماً.
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg bg-paper border border-ink/10">
                      <div className="grid grid-cols-2 sm:contents gap-2">
                        <input
                          type="date"
                          value={p.date}
                          onChange={(e) => updatePayment(p.id, { date: e.target.value })}
                          className="w-full sm:w-36 px-2 py-1.5 rounded-md bg-white/70 border border-ink/10 text-ink text-[11px] font-mono shrink-0"
                        />
                        <PriceInput
                          value={String(p.amountIQD)}
                          onChange={(v) => updatePayment(p.id, { amountIQD: Number(v) || 0 })}
                          className="w-full sm:w-32 px-2 py-1.5 rounded-md bg-white/70 border border-ink/10 text-ink text-[11px] font-mono shrink-0"
                        />
                      </div>
                      <div className="flex items-center gap-2 sm:contents">
                        <input
                          type="text"
                          value={p.note || ''}
                          onChange={(e) => updatePayment(p.id, { note: e.target.value })}
                          placeholder={isAr ? 'ملاحظة (اختياري)' : 'Note (optional)'}
                          className="flex-1 min-w-0 sm:min-w-24 px-2 py-1.5 rounded-md bg-white/70 border border-ink/10 text-ink text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={() => removePayment(p.id)}
                          title={isAr ? 'حذف الدفعة' : 'Remove payment'}
                          className="p-1.5 rounded-md bg-red-100 hover:bg-red-900 border border-red-300 text-red-700 cursor-pointer transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink/60 mb-1.5">
              {isAr ? 'الشروط المتفق عليها بعد المراجعة (تظهر على العقد المطبوع)' : 'Agreed Terms After Review (shown on the printed contract)'}
            </label>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={isAr ? 'مثال: تم الاتفاق على تخفيض السعر مقابل الدفع الكامل مسبقاً...' : 'e.g. Agreed on a reduced price in exchange for full upfront payment...'}
              className="w-full p-3 rounded-xl bg-white/70 border border-ink/10 text-ink text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink/60 mb-1.5">
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
              className="px-4 py-2.5 rounded-xl bg-red-100 hover:bg-red-900 disabled:opacity-60 text-red-700 border border-red-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isAr ? 'حذف' : 'Delete'}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-4 py-2.5 rounded-xl bg-white/70 hover:bg-sand-light disabled:opacity-60 text-ink border border-ink/15 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isAr ? 'تنزيل PDF' : 'Download PDF'}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!dirty || isSaving}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all border border-white"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isAr ? 'حفظ التغييرات' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {showProfile && contract.uid && (
        <CustomerProfileSheet
          isAr={isAr}
          language={language}
          currency={currency}
          uid={contract.uid}
          email={contract.email}
          displayName={contract.repName}
          photoURL=""
          contracts={allContracts}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
