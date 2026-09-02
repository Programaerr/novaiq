// Contract administration: the searchable list, the per-contract editor row, and the
// company-signature pad the admin signs with.
import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  FileCheck,
  DollarSign,
  Download,
  Trash2,
  Save,
  History,
  Pencil,
  Search,
  Loader2,
  RotateCcw,
  Plus,
  X,
  IdCard,
  AlertTriangle,
} from 'lucide-react';
import { ContractData, PaymentRecord } from '../../types';
import { Language, translateText } from '../../lib/i18n';
import { formatPrice, Currency } from '../../lib/currency';
import {
  deleteContractFromFirebase,
  updateContractFields,
  fetchContractAudit,
  fetchSuppressedContracts,
  restoreSuppressedContract,
  auth,
} from '../../lib/firebase';
import { generateContractPDF } from '../../lib/pdfGenerator';
import { ConnectedContractPrintDocument } from '../ContractPrintDocument';
import { cosmicAudio } from '../../lib/audio';
import { showToast } from '../../lib/toast';
import { ERROR_ON_LIGHT } from '../../lib/homePalette';
import { createContractSnapshot } from '../../lib/contractSnapshot';
import { useSignaturePad } from '../../lib/useSignaturePad';
import { sumPayments, derivePaymentStatus, newPaymentId, todayIsoDate } from '../../lib/payments';
import { PriceInput } from '../PriceInput';
import { STATUS_FLOW, statusArabic, paymentStatusArabic, CollectionBar } from './shared';
import { STAGE_COLORS } from '../../lib/statusColors';
import { CustomerProfileSheet } from './CustomerProfileSheet';

export function ContractsTab({
  isAr,
  language,
  currency,
  contracts,
}: {
  isAr: boolean;
  language: Language;
  currency: Currency;
  contracts: ContractData[];
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
      <SuppressedContractsPanel isAr={isAr} language={language} />

      {/* شبكة الإحصاءات حُذفت من هنا: نفس الأرقام معروضة أصلاً في أعلى لوحة التحكم
          (تبويب النظرة العامة). عرضها مرّتين لا يضيف معلومة، ويضيف موضعاً ثانياً يجب أن يبقى
          متوافقاً مع الأوّل عند كل تغيير في طريقة الحساب. */}

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
// Company signature pad — NUVAIQ's own sign-off on a negotiated contract
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
  /* المدة وآلية السداد صارتا تُعتمدان من هنا لا من الباني.
     المشروع مخصص، فلا الباني يعرف مدته (كان يكتب 8 أسابيع لكل مشروع مهما كان حجمه) ولا العميل
     اختار خطة سداد (كانت مثبَّتة على 50/50 بلا أن تُعرَض عليه). كلاهما الآن يُترك فارغاً في
     الوثيقة حتى تعتمده أنت مع السعر، فيظهر للعميل عندها. */
  const [deliveryText, setDeliveryText] = useState(
    contract.deliveryTimelineText || (contract.deliveryTimelineWeeks ? String(contract.deliveryTimelineWeeks) + ' أسابيع' : '')
  );
  const [paymentPlan, setPaymentPlan] = useState<ContractData['paymentPlan']>(contract.paymentPlan || '50_50');
  /** رابط المعاينة الخاص الذي يتابع منه العميل موقعه أثناء التنفيذ. */
  const [previewUrl, setPreviewUrl] = useState(contract.previewUrl || '');
  /* سجل التدقيق يُجلَب عند الطلب لا مع كل عقد.
     قائمة العقود قد تحمل عشرات الصفوف، وجلب سجل كل صف مسبقاً يعني عشرات القراءات لبيانات لا
     يفتحها أحد في الغالب. الزرّ هو الإشارة الوحيدة الموثوقة بأن أحداً يريد رؤيتها الآن. */
  const [auditRows, setAuditRows] = useState<
    { actorEmail: string; at: string; changes: Record<string, { from: unknown; to: unknown }> }[] | null
  >(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadAudit = async () => {
    if (auditLoading) return;
    setAuditLoading(true);
    try {
      setAuditRows(await fetchContractAudit(contract.contractNumber));
    } catch (e) {
      console.error('Failed to load the audit trail:', e);
      showToast(isAr ? 'تعذّر جلب سجل الحركات' : 'Could not load the activity log', 'error');
    } finally {
      setAuditLoading(false);
    }
  };

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
    setDeliveryText(
      contract.deliveryTimelineText || (contract.deliveryTimelineWeeks ? String(contract.deliveryTimelineWeeks) + ' أسابيع' : '')
    );
    setPaymentPlan(contract.paymentPlan || '50_50');
    setPreviewUrl(contract.previewUrl || '');
    setSignatureDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.status, contract.totalPriceIQD, contract.costIQD, contract.payments, contract.paidAmountIQD, contract.installmentsPlanned, contract.adminNotes, contract.previewUrl, contract.companySignatureDataUrl]);

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
    deliveryText.trim() !== (contract.deliveryTimelineText || '') ||
    paymentPlan !== (contract.paymentPlan || '50_50') ||
    previewUrl.trim() !== (contract.previewUrl || '') ||
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
        deliveryTimelineText: deliveryText.trim(),
        paymentPlan,
        previewUrl: previewUrl.trim(),
        // علامة الحبر الداكن تُكتب مع التوقيع نفسه وفي نفس الحفظ — لو كُتبت لاحقاً لظهر
        // التوقيع مقلوباً (أبيض على أبيض) في الفترة بينهما.
        ...(companySignatureDataUrl !== undefined
          ? { companySignatureDataUrl, companySignatureInk: 'dark' as const }
          : {}),
      });
      cosmicAudio.playPing();
      showToast(isAr ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully', 'success');

      /* تجميد المضمون لحظة الاعتماد فقط: توقيع NUVAIQ موجود + سعر معتمَد + لا لقطة بعد.
         هذه هي اللحظة التي تصبح فيها الوثيقة نهائية؛ تجميدها قبلها يحفظ مسوّدة، وبعد كل حفظة
         يعني محاولة تغيير ما وقّع عليه الطرفان (والقاعدة ترفضها أصلاً).

         خارج نجاح الحفظ الأساسي عمداً: فشل التجميد لا يجوز أن يظهر كفشل حفظ — الحفظ نجح. */
      const nowSigned = companySignatureDataUrl || contract.companySignatureDataUrl;
      const priced = (Number(totalPrice) || 0) > 0;
      if (nowSigned && priced && !contract.snapshotHash) {
        try {
          const approvedBy = (auth.currentUser?.email || '').trim().toLowerCase();
          const hash = await createContractSnapshot(
            {
              ...contract,
              totalPriceIQD: Number(totalPrice) || 0,
              deliveryTimelineText: deliveryText.trim(),
              paymentPlan,
              adminNotes: adminNotes.trim(),
            },
            approvedBy
          );
          await updateContractFields(contract, { snapshotHash: hash, snapshotAt: new Date().toISOString() });
          showToast(isAr ? 'تم تجميد نسخة العقد المعتمدة' : 'The approved contract copy was frozen', 'success');
        } catch (snapshotError) {
          console.error('Contract snapshot failed:', snapshotError);
          showToast(
            isAr
              ? 'حُفظ الاعتماد، لكن تعذّر تجميد نسخة العقد — تأكد من نشر قواعد Firestore'
              : 'Approval saved, but freezing the contract copy failed — check that the Firestore rules are published',
            'error'
          );
        }
      }
    } catch (e) {
      // Logged as well as toasted: "حاول مجدداً" is all the admin needs, but when a save keeps
      // failing the actual Firestore error (permissions, offline, bad field) is the only thing
      // that says why, and it was previously swallowed by a bare `catch {}`.
      console.error('Failed to save contract changes:', e);
      /* الرمز يُذكر في الرسالة: "حاول مجدداً" تجعل رفضاً من القواعد (لم تُنشر بعد، أو الحساب
         ليس ضمن المشرفين) يبدو عطلاً عابراً، فيعيد الأدمن المحاولة عشر مرات بلا فائدة. */
      const code = (e as { code?: string })?.code || '';
      const denied = code.includes('permission-denied');
      showToast(
        denied
          ? isAr
            ? 'الحفظ مرفوض من قاعدة البيانات — انشر قواعد Firestore من الكونسول وتأكد أن حسابك ضمن المشرفين'
            : 'The database refused the write — publish the Firestore rules and check that your account is an admin'
          : isAr
            ? `تعذر حفظ التعديلات${code ? ` (${code})` : ''}، حاول مجدداً`
            : `Failed to save changes${code ? ` (${code})` : ''} — please try again`,
        'error'
      );
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
    } catch (error) {
      /* الرسالة تسمّي الخطأ لا تخفيه: أشهر أسباب الفشل هنا هو رفض القواعد (permission-denied)
         حين لا تكون firestore.rules منشورة أو لا يُقيَّم الحساب أدمناً — ورسالة عامة كانت
         تُقرأ كعُطل عابر يُعاد المحاولة بعده، فيُعاد إلى ما لا نهاية. */
      const code = (error as { code?: string })?.code || '';
      showToast(
        isAr
          ? `تعذر حذف العقد من الخادم${code ? ` (${code})` : ''} — العقد ما زال ظاهراً لدى العميل.`
          : `The server refused to delete the contract${code ? ` (${code})` : ''} — it is still visible to the client.`,
        'error',
      );
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
          <span className="text-sm font-mono font-bold text-ink hidden sm:inline">{formatPrice(contract.totalPriceIQD || 0, language, currency)}</span>
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

          {/* الوثيقة كما وقّعها العميل — نفس ما يراه هو في حسابه.
              كانت هذه اللوحة تعرض بيانات الاتصال والنص الحر فقط، فيُفتح العقد هنا بلا نوعه ولا
              ألوانه ولا لغاته ولا حتى توقيع صاحبه — أي أن الطرف الذي ينفّذ المشروع كان يراه أقل
              مما يراه الطرف الذي طلبه. */}
          <div className="p-3 rounded-xl bg-white/70 border border-ink/10 text-xs space-y-3">
            <span className="text-[11px] font-bold text-ink/60 block">
              {isAr ? 'العقد كما وقّعه العميل' : 'The contract as the client signed it'}
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2.5">
              <div className="min-w-0">
                <span className="text-ink/50 block">{isAr ? 'المشروع' : 'Project'}</span>
                <strong className="text-ink block truncate">{translateText(contract.templateTitle, language)}</strong>
              </div>
              <div>
                <span className="text-ink/50 block">{isAr ? 'نوع المشروع' : 'Project type'}</span>
                <strong className="text-ink">
                  {contract.projectType === 'app'
                    ? (isAr ? 'تطبيق هاتف' : 'Mobile app')
                    : contract.projectType === 'website'
                      ? (isAr ? 'موقع إلكتروني' : 'Website')
                      : (isAr ? 'غير محدَّد' : 'Unspecified')}
                </strong>
              </div>
              <div>
                <span className="text-ink/50 block">{isAr ? 'الوضع' : 'Theme'}</span>
                <strong className="text-ink">
                  {contract.themePreference === 'light'
                    ? (isAr ? 'فاتح' : 'Light')
                    : contract.themePreference === 'both'
                      ? (isAr ? 'ثنائي' : 'Both')
                      : (isAr ? 'داكن' : 'Dark')}
                </strong>
              </div>
              <div>
                <span className="text-ink/50 block">{isAr ? 'اللغات' : 'Languages'}</span>
                <strong className="text-ink">
                  {contract.languageSupport === 'ar'
                    ? (isAr ? 'عربي' : 'Arabic')
                    : contract.languageSupport === 'en'
                      ? (isAr ? 'إنجليزي' : 'English')
                      : (isAr ? 'ثنائي' : 'Both')}
                </strong>
              </div>
              <div>
                <span className="text-ink/50 block">{isAr ? 'تاريخ التوقيع' : 'Signed on'}</span>
                <strong className="text-ink" dir="ltr">
                  {contract.createdAt ? new Date(contract.createdAt).toLocaleString(isAr ? 'ar-IQ' : 'en-GB') : '—'}
                </strong>
              </div>
              <div>
                {/* متى عُرضت عليه البنود قبل توقيعه. البنود خلف زرّ الآن، فهذا هو ما يجيب على
                    "هل قرأها؟" بدل الاكتفاء بأنه أشّر على مربّع. عقد قديم لا يحمل الحقل لأن
                    بنوده كانت مفتوحة أمامه طوال الخطوة. */}
                <span className="text-ink/50 block">{isAr ? 'اطّلع على البنود' : 'Terms opened'}</span>
                <strong className="text-ink" dir="ltr">
                  {contract.termsViewedAt
                    ? new Date(contract.termsViewedAt).toLocaleString(isAr ? 'ar-IQ' : 'en-GB')
                    : (isAr ? 'عقد سابق — كانت معروضة' : 'Legacy — shown inline')}
                </strong>
              </div>
              <div>
                <span className="text-ink/50 block">{isAr ? 'رقم السجل' : 'CR / ID'}</span>
                <strong className="text-ink font-mono" dir="ltr">{contract.crNumber || '—'}</strong>
              </div>
              <div>
                {/* شعاره، كما رفعه ــ نفس الصورة التي تُطبع في وثيقته. الغرض من هذه اللوحة أن
                    نرى ما يراه هو بالضبط، وشعاره جزء منه: بدونه كنا نعتمد عقداً دون أن نرى
                    العلامة التي سنبني بها. */}
                <span className="text-ink/50 block">{isAr ? 'شعار العميل' : 'Client logo'}</span>
                {contract.clientLogoDataUrl ? (
                  <span className="mt-1 w-20 h-12 rounded-lg bg-white border border-ink/15 grid place-items-center p-1">
                    <img
                      src={contract.clientLogoDataUrl}
                      alt={contract.companyName}
                      className="max-w-full max-h-full object-contain"
                    />
                  </span>
                ) : (
                  <strong className="text-ink/60">{isAr ? 'لم يرفع شعاراً' : 'None uploaded'}</strong>
                )}
              </div>
              <div className="col-span-2">
                <span className="text-ink/50 block">{isAr ? 'ألوان الهوية' : 'Brand colours'}</span>
                {/* بالكود لا بالمربّع وحده: المربّع يُري اللون تقريباً، والكود هو ما يُنفَّذ به. */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {[contract.primaryColor, contract.secondColor, contract.thirdColor]
                    .filter(Boolean)
                    .map((hex, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-md border border-ink/20 shrink-0"
                          style={{ backgroundColor: hex as string }}
                        />
                        <span className="font-mono text-[10.5px] text-ink/70" dir="ltr">
                          {(hex as string).toUpperCase()}
                        </span>
                      </span>
                    ))}
                  {![contract.primaryColor, contract.secondColor, contract.thirdColor].some(Boolean) && (
                    <span className="text-ink/50">{isAr ? 'لم تُختَر ألوان' : 'No colours chosen'}</span>
                  )}
                </div>
              </div>
            </div>

            {contract.customFeaturesText && (
              <div className="pt-2.5 border-t border-ink/10">
                <span className="text-ink/50 block mb-1">
                  {isAr ? 'ما كتبه العميل عن مشروعه' : 'What the client wrote about their project'}
                </span>
                <p className="text-ink/90 leading-relaxed whitespace-pre-line">{contract.customFeaturesText}</p>
              </div>
            )}

            {/* التوقيعان جنباً إلى جنب — "كيف وقّع وأين التوقيع" لا يُعرف إلا برؤيته.
                فلتر القلب يُطبَّق فقط على التواقيع القديمة المرسومة بحبر أبيض (signatureInk في
                types.ts)؛ الجديدة داكنة أصلاً وقلبها كان سيُخفيها. */}
            <div className="pt-2.5 border-t border-ink/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-ink/50 block mb-1.5">{isAr ? 'توقيع العميل' : 'Client signature'}</span>
                {contract.signatureDataUrl ? (
                  <div className="bg-white rounded-lg border border-ink/10 h-16 flex items-center px-2">
                    <img
                      src={contract.signatureDataUrl}
                      alt={isAr ? 'توقيع العميل' : 'Client signature'}
                      className="max-h-full max-w-full object-contain"
                      style={{ filter: contract.signatureInk === 'dark' ? undefined : 'invert(1)' }}
                    />
                  </div>
                ) : (
                  <p className="text-ink/50">{isAr ? 'لا يوجد توقيع مخزَّن' : 'No signature stored'}</p>
                )}
              </div>
              <div>
                <span className="text-ink/50 block mb-1.5">{isAr ? 'اعتماد NUVAIQ' : 'NUVAIQ sign-off'}</span>
                {contract.companySignatureDataUrl ? (
                  <div className="bg-white rounded-lg border border-ink/10 h-16 flex items-center px-2">
                    <img
                      src={contract.companySignatureDataUrl}
                      alt={isAr ? 'اعتماد NUVAIQ' : 'NUVAIQ sign-off'}
                      className="max-h-full max-w-full object-contain"
                      style={{ filter: contract.companySignatureInk === 'dark' ? undefined : 'invert(1)' }}
                    />
                  </div>
                ) : (
                  <p className="text-ink/50">{isAr ? 'لم يُعتمد بعد' : 'Not approved yet'}</p>
                )}
              </div>
            </div>
          </div>

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
                {/* خارج STATUS_FLOW عمداً: الإلغاء ليس مرحلة في مسار التنفيذ بل خروج منه، فلا
                    يجوز أن يظهر في شريط المراحل ولا في إحصاءات التقدّم. لكنه حالة كاملة تُختار
                    هنا — والعقد يبقى في السجل بتواقيعه ومحتواه، لأن حذفه كان سيمحو دليل ما جرى. */}
                <option value="cancelled">{isAr ? 'ملغي' : 'Cancelled'}</option>
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
                {/* نفس ألوان حساب العميل بالضبط، ومن اللوحة نفسها: رقم يعني "محصّل" لدينا
                    يجب أن يكون بنفس اللون الذي يراه صاحبه، وإلا فالشاشتان تحكيان روايتين. */}
                <div className="min-w-0">
                  <span className="text-ink/70 block mb-0.5">{isAr ? 'قيمة العقد' : 'Contract value'}</span>
                  <strong className="text-ink font-mono text-sm font-bold wrap-break-word">{formatPrice(Number(totalPrice) || 0, language, currency)}</strong>
                </div>
                <div className="min-w-0">
                  <span className="text-ink/70 block mb-0.5">{isAr ? 'المحصّل' : 'Collected'}</span>
                  <strong className="text-[#198241] font-mono text-sm font-bold wrap-break-word">{formatPrice(paidAmountIQD, language, currency)}</strong>
                </div>
                <div className="min-w-0">
                  <span className="text-ink/70 block mb-0.5">{isAr ? 'المتبقي' : 'Remaining'}</span>
                  <strong className={`font-mono text-sm font-bold wrap-break-word ${remainingIQD > 0 ? 'text-[#8B6C0A]' : 'text-ink/70'}`}>
                    {formatPrice(Math.max(remainingIQD, 0), language, currency)}
                  </strong>
                </div>
              </div>
            </div>

            {/* طلب إلغاء من العميل — أول ما يُرى في العقد، قبل الأرقام.
                الغرض من هذا الطلب أن نتحدّث مع صاحبه قبل أن نخسر المشروع، وطلبٌ يظهر في آخر
                البطاقة يُقرأ بعد فوات الأوان. يبقى ظاهراً حتى تضغط "تم الحل" — أي حتى يقرّر
                إنسان أن الموضوع انتهى، لا حتى يمرّ الوقت. */}
            {contract.cancellationRequestedAt && (
              <div className="p-3.5 border-b border-ink/10" style={{ background: '#FFF3EC' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-black block" style={{ color: ERROR_ON_LIGHT }}>
                      {isAr ? 'العميل طلب إلغاء هذا العقد' : 'The client requested to cancel this contract'}
                    </span>
                    <span className="text-[11px] text-ink/60 block mt-0.5">
                      {new Date(contract.cancellationRequestedAt).toLocaleString(isAr ? 'ar-IQ' : 'en-GB')}
                    </span>
                    {contract.cancellationReason && (
                      <p className="text-[11.5px] text-ink/80 mt-1.5 leading-relaxed whitespace-pre-line">
                        {contract.cancellationReason}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateContractFields(contract, { cancellationRequestedAt: '', cancellationReason: '' });
                          showToast(isAr ? 'تم إغلاق طلب الإلغاء' : 'Cancellation request cleared', 'success');
                        } catch {
                          showToast(isAr ? 'تعذّر إغلاق الطلب' : 'Could not clear the request', 'error');
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-ink/15 text-ink/75 text-[11px] font-bold cursor-pointer"
                    >
                      {isAr ? 'تم الحل — إغلاق الطلب' : 'Resolved — clear'}
                    </button>
                    {/* الطريق الثاني: لم يوجد حل. تأكيد صريح لأن هذه حالة نهائية يراها العميل
                        فوراً في حسابه ولا يُتراجع عنها بضغطة. */}
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = window.confirm(
                          isAr
                            ? 'إلغاء هذا العقد نهائياً؟ ستظهر حالته "ملغي" في حساب العميل فوراً.'
                            : 'Cancel this contract for good? Its status will show as "Cancelled" in the client account immediately.'
                        );
                        if (!ok) return;
                        try {
                          await updateContractFields(contract, { status: 'cancelled' });
                          showToast(isAr ? 'أُلغي العقد' : 'The contract was cancelled', 'success');
                        } catch {
                          showToast(isAr ? 'تعذّر إلغاء العقد' : 'Could not cancel the contract', 'error');
                        }
                      }}
                      className="px-3 py-2 rounded-xl text-white text-[11px] font-bold cursor-pointer"
                      style={{ background: ERROR_ON_LIGHT }}
                    >
                      {isAr ? 'إلغاء العقد' : 'Cancel the contract'}
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                {/* نصّ حر لا رقم أسابيع: المشاريع لا تُقاس بوحدة واحدة، ومدة مثل "شهر ونصف"
                    أو "قبل رمضان" كانت تُجبَر على التقريب إلى رقم أسابيع فتفقد دقّتها. يُعرض
                    للعميل حرفياً كما تكتبه. */}
                <label className="block text-[11px] text-ink/50 mb-1">{isAr ? 'مدة التنفيذ' : 'Delivery time'}</label>
                <input
                  type="text"
                  value={deliveryText}
                  onChange={(e) => setDeliveryText(e.target.value)}
                  placeholder={isAr ? 'مثال: 3 أسابيع · شهر ونصف · 20 يوم عمل' : 'e.g. 3 weeks · 6 weeks · 20 working days'}
                  className="w-full px-2.5 py-2 rounded-lg bg-paper border border-ink/10 text-ink text-xs"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[11px] text-ink/50 mb-1">{isAr ? 'آلية السداد' : 'Payment plan'}</label>
                <select
                  value={paymentPlan}
                  onChange={(e) => setPaymentPlan(e.target.value as ContractData['paymentPlan'])}
                  className="w-full px-2.5 py-2 rounded-lg bg-paper border border-ink/10 text-ink text-xs font-bold cursor-pointer"
                >
                  <option value="50_50">{isAr ? '50% عند التعاقد و50% عند التسليم' : '50% on signing, 50% on delivery'}</option>
                  <option value="100_upfront">{isAr ? 'دفعة كاملة مسبقة' : 'Full upfront'}</option>
                  <option value="3_milestones">{isAr ? '3 دفعات على مراحل' : '3 milestones'}</option>
                </select>
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

          {/* رابط المعاينة الخاص — المكان الذي يرفع فيه الأدمن رابط نسخة العميل الجارية
              (Netlify preview / staging) ليتابع منه تعديلات موقعه لحظة بلحظة. يظهر في حساب
              العميل فقط عند وجوده، ولا يُعرض إلا إن كان http/https (safeExternalUrl). */}
          <div>
            <label className="block text-[11px] font-semibold text-ink/60 mb-1.5">
              {isAr
                ? 'رابط معاينة المشروع (يظهر في حساب العميل ليتابع التعديلات)'
                : "Project preview link (shown in the client's account to follow progress)"}
            </label>
            <input
              type="url"
              dir="ltr"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="https://preview.example.com"
              className="w-full p-3 rounded-xl bg-white/70 border border-ink/10 text-ink text-xs font-mono"
            />
            <p className="mt-1.5 text-[10px] text-ink/50">
              {isAr
                ? 'اتركه فارغاً لإخفاء زر المعاينة من حساب العميل. يجب أن يبدأ بـ https://'
                : 'Leave empty to hide the preview button from the client. Must start with https://'}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink/60 mb-1.5">
              {isAr ? 'توقيع واعتماد NUVAIQ (يظهر على العقد المطبوع بجانب توقيع العميل)' : "NUVAIQ's Sign-off (shown on the printed contract next to the client's signature)"}
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
            {/* سجل الحركات — بجوار زر الحفظ لأنه سجلّ ما حُفظ. */}
            <button
              onClick={() => (auditRows ? setAuditRows(null) : loadAudit())}
              disabled={auditLoading}
              className="px-4 py-2.5 rounded-xl bg-white/70 hover:bg-sand-light disabled:opacity-60 text-ink border border-ink/15 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              {auditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
              <span>{isAr ? 'سجل الحركات' : 'Activity log'}</span>
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

          {auditRows && (
            <div className="mt-3 p-3 rounded-2xl bg-paper border border-ink/10 space-y-2">
              <span className="text-[11px] font-bold text-ink/60 block">
                {isAr ? 'سجل الحركات' : 'Activity log'}
              </span>
              {auditRows.length === 0 ? (
                <p className="text-[11px] text-ink/50">
                  {isAr ? 'لا توجد تعديلات مسجّلة على هذا العقد بعد.' : 'No recorded changes on this contract yet.'}
                </p>
              ) : (
                auditRows.map((row, i) => (
                  <div key={`${row.at}-${i}`} className="p-2.5 rounded-xl bg-white/70 border border-ink/10">
                    <div className="flex items-center justify-between gap-2 text-[10.5px] text-ink/55">
                      <span className="font-bold text-ink/75 truncate" dir="ltr">{row.actorEmail}</span>
                      <span dir="ltr">{new Date(row.at).toLocaleString(isAr ? 'ar-IQ' : 'en-GB')}</span>
                    </div>
                    <ul className="mt-1.5 space-y-0.5">
                      {Object.entries(row.changes).map(([field, change]) => (
                        <li key={field} className="text-[11px] text-ink/80" dir="ltr">
                          <span className="font-mono font-bold">{field}</span>
                          {': '}
                          <span className="text-ink/50">{String(change.from ?? '—')}</span>
                          {' → '}
                          <span className="text-ink">{String(change.to ?? '—')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}
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

/**
 * عقود حيّة على الخادم ومخفيّة في هذا المتصفح وحده.
 *
 * حصيلة عطل قديم في ترتيب الحذف: كان المُعرِّف يُسجَّل في سجلّ المحذوفات المحلّي قبل محاولة
 * الحذف على الخادم، والفشل يُبتلع بصمت. فيختفي العقد من لوحة التحكم ويبقى في حساب العميل —
 * ولا يظهر في أي قائمة عندنا لنعرف بوجوده أصلاً.
 *
 * الترتيب صار صحيحاً (انظر deleteContractFromFirebase)، لكن ما وقع قبله لا يُصلح نفسه:
 * السجلّ ما زال يحمل تلك المُعرِّفات. هذه اللوحة تُحضرها من Firestore متجاوزةً السجلّ، وتترك
 * القرار: إظهاره من جديد، أو محاولة حذفه فعلاً هذه المرّة.
 *
 * لا تظهر إطلاقاً حين لا يوجد شيء — لوحة فارغة دائمة تعلّم القارئ تجاهل مكانها.
 */
function SuppressedContractsPanel({ isAr, language }: { isAr: boolean; language: Language }) {
  const [items, setItems] = useState<ContractData[]>([]);
  const [busy, setBusy] = useState('');

  const reload = useCallback(() => {
    fetchSuppressedContracts()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  useEffect(reload, [reload]);

  if (items.length === 0) return null;

  return (
    <div className="p-3.5 rounded-2xl border" style={{ background: 'rgba(202,59,59,0.06)', borderColor: 'rgba(202,59,59,0.35)' }}>
      <span className="flex items-center gap-2 text-xs font-bold" style={{ color: ERROR_ON_LIGHT }}>
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {isAr
          ? `${items.length} عقد مخفيّ عندك وما زال ظاهراً لدى صاحبه`
          : `${items.length} contract(s) hidden here but still visible to their owner`}
      </span>
      <p className="text-[11px] text-ink/75 leading-relaxed mt-1.5">
        {isAr
          ? 'حُذفت من لوحتك ولم تُحذف من الخادم — الأرجح أن قواعد Firestore لم تكن منشورة وقت الحذف. أظهرها لتعود إلى القائمة، أو احذفها الآن حذفاً حقيقياً.'
          : 'They were hidden in your panel but never deleted on the server — most likely the Firestore rules were unpublished at the time. Restore them to the list, or delete them for real now.'}
      </p>

      <ul className="mt-2.5 space-y-1.5">
        {items.map((c) => (
          <li
            key={c.id || c.contractNumber}
            className="flex items-center justify-between gap-2 flex-wrap p-2 rounded-xl bg-white/70 border border-ink/10"
          >
            <span className="min-w-0">
              <strong className="text-xs text-ink block truncate">{translateText(c.companyName, language)}</strong>
              <span className="text-[10px] text-ink/70 font-mono block truncate" dir="ltr">
                {c.contractNumber}
              </span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  restoreSuppressedContract(c.id, c.contractNumber);
                  reload();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-ink/15 text-ink/80 hover:text-ink text-[11px] font-bold cursor-pointer"
              >
                {isAr ? 'إظهاره' : 'Restore'}
              </button>
              <button
                type="button"
                disabled={busy === (c.id || c.contractNumber)}
                onClick={async () => {
                  setBusy(c.id || c.contractNumber || '');
                  try {
                    await deleteContractFromFirebase(c.id, c.contractNumber);
                    showToast(isAr ? 'حُذف العقد من الخادم' : 'Deleted on the server', 'success');
                    reload();
                  } catch (error) {
                    const code = (error as { code?: string })?.code || '';
                    showToast(
                      isAr
                        ? `ما زال الخادم يرفض الحذف${code ? ` (${code})` : ''} — انشر firestore.rules ثم أعد المحاولة.`
                        : `The server still refuses${code ? ` (${code})` : ''} — publish firestore.rules and retry.`,
                      'error',
                    );
                  } finally {
                    setBusy('');
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
                style={{ background: ERROR_ON_LIGHT }}
              >
                {isAr ? 'حذف حقيقي' : 'Delete for real'}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
