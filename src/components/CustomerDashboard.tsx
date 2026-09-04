import React, { useEffect, useRef, useState } from 'react';
import { LogOut, FileCheck, Download, Clock, CheckCircle2, Wallet, Home, ExternalLink, XCircle, Loader2, FileText, ChevronDown, ArrowRight, ArrowLeft, AlertCircle, RotateCcw, PenLine } from 'lucide-react';
import type { AppUser as User } from '../lib/auth';
import { ContractData } from '../types';
import { Language, translateText } from '../lib/i18n';
import { formatPrice, Currency } from '../lib/currency';
import { subscribeToMyContracts, requestContractCancellation, signPendingContract, classifyWriteFailure } from '../lib/db';
import { fetchContractSnapshot } from '../lib/contractSnapshot';
import { logoutAccount } from '../lib/auth';
import { generateContractPDF } from '../lib/pdfGenerator';
import { ConnectedContractPrintDocument } from './ContractPrintDocument';
import { ContractDetailsPanel } from './ContractDetailsPanel';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import { showToast } from '../lib/toast';
import { ERROR_ON_LIGHT, SUCCESS_ON_LIGHT } from '../lib/homePalette';
import { sumPayments } from '../lib/payments';
import { useDocumentFlag } from '../lib/useDocumentFlag';
import { contractTerms } from '../data/contractTerms';
import { useSignaturePad } from '../lib/useSignaturePad';
import { STAGE_COLORS } from '../lib/statusColors';
import { contractProgress, safeExternalUrl } from '../lib/contractProgress';
import { NqButton } from './ui/NqButton';

interface CustomerDashboardProps {
  language: Language;
  currency?: Currency;
  user: User;
  /** Leaves the account page for the public site — this page has no Navbar above it or Footer
   *  below it (see the `activePage !== 'orders'` guards in App.tsx), so without this the only
   *  way back was the browser's own back button. */
  onBackToSite: () => void;
}

const STATUS_LABEL_AR: Record<ContractData['status'], string> = {
  draft: 'مسودة',
  submitted: 'تم تقديم العقد',
  under_review: 'قيد المراجعة الفنية',
  in_development: 'قيد التطوير والتنفيذ',
  completed: 'مكتمل ومسلم',
  cancelled: 'ملغي',
};

// The visible order of a contract's stages, used by the progress rail below. `draft` is
// excluded on purpose: a draft is not a stage on the customer's journey, it is a state
// only the admin ever sees. Every other status has exactly one step in this rail.
const STATUS_STEPS: ContractData['status'][] = ['submitted', 'under_review', 'in_development', 'completed'];

function formatDate(iso: string | undefined, isAr: boolean): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(isAr ? 'ar-IQ' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * نسبة الإنجاز ورابط المعاينة — إجابة العميل على سؤال "وين وصل مشروعي؟" بلا أن يسأل أحداً.
 *
 * النسبة محسوبة لا مكتوبة: تبدأ بالزحف من لحظة وضع العقد في "قيد التنفيذ"، بحسب مدة التسليم
 * المتفق عليها في العقد نفسه (انظر lib/contractProgress.ts). المؤقّت أدناه ليس تجميلاً: تبويب
 * يبقى مفتوحاً ساعات كان سيُظهر نسبة لحظة الفتح إلى الأبد.
 */
function ProgressPanel({ contract, isAr }: { contract: ContractData; isAr: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const { percent, isLive } = contractProgress(contract, now);
  const preview = safeExternalUrl(contract.previewUrl);
  const color = STAGE_COLORS[contract.status].fill;

  return (
    <div className="p-3 rounded-xl bg-white/70 border border-ink/10 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-ink/75">
          {isAr ? 'نسبة الإنجاز' : 'Progress'}
        </span>
        {/* أكبر ثلاث خطوات: هذا الرقم هو أول ما يبحث عنه العميل كل مرّة يفتح فيها حسابه، وكان
            مكتوباً بنفس حجم تسمية "نسبة الإنجاز" بجانبه — أي أن التسمية والخبر متساويان. */}
        <strong className="text-lg font-mono font-black text-ink tabular-nums" dir="ltr">{percent}%</strong>
      </div>

      <div className="h-2.5 rounded-full bg-ink/15 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%`, background: color }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <p className="text-[11px] text-ink/70 leading-relaxed">
        {contract.status === 'completed'
          ? (isAr ? 'اكتمل المشروع وسُلِّم بالكامل.' : 'The project is complete and fully delivered.')
          : isLive
          ? (isAr
              ? 'المشروع قيد التنفيذ الآن، والنسبة تتقدّم تلقائياً مع مدة التسليم المتفق عليها. آخر 10% تُسجَّل عند التسليم النهائي.'
              : 'Development is underway; the percentage advances automatically along the agreed delivery window. The final 10% is recorded on delivery.')
          : (isAr
              ? 'ستبدأ النسبة بالتقدّم تلقائياً فور دخول المشروع مرحلة التنفيذ.'
              : 'The percentage starts advancing automatically once the project enters development.')}
      </p>

      {/* رابط المعاينة: rel="noopener" ضروري — بدونه تحصل الصفحة المفتوحة على window.opener
          وتقدر توجّه تبويب حساب العميل إلى أي مكان. */}
      {preview ? (
        <a
          href={preview}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-ink text-paper text-xs font-bold hover:opacity-90 transition-opacity"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>{isAr ? 'شاهد موقعك قيد التنفيذ' : 'View your site in progress'}</span>
        </a>
      ) : (
        contract.status === 'in_development' && (
          <p className="text-[11px] text-ink/80">
            {isAr
              ? 'سيظهر هنا رابط معاينة موقعك بمجرد أن نرفعه لك.'
              : 'A preview link for your site will appear here as soon as we publish one.'}
          </p>
        )
      )}
    </div>
  );
}

// The four stages a contract passes through, as a rail. The step the contract has reached is
// filled; everything before it is filled too (you have passed it), everything after is dimmed.
function StatusRail({ status, isAr }: { status: ContractData['status']; isAr: boolean }) {
  const currentIndex = STATUS_STEPS.indexOf(status);
  // A `completed` contract fills the whole rail. Anything before `submitted` (a draft) fills
  // nothing, which is correct: a draft has not entered the process.
  const reached = currentIndex >= 0 ? currentIndex : -1;
  const labels: Record<ContractData['status'], { ar: string; en: string }> = {
    draft: { ar: 'مسودة', en: 'Draft' },
    submitted: { ar: 'قُدِّم', en: 'Submitted' },
    under_review: { ar: 'قيد المراجعة', en: 'Under review' },
    in_development: { ar: 'قيد التطوير', en: 'In development' },
    completed: { ar: 'مكتمل', en: 'Completed' },
    // لا تظهر في الشريط أصلاً (ليست مرحلة في المسار)، لكن النوع يطلبها ولا يجوز أن تبقى فارغة.
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
  };
return (
    <div className="pt-4">
      {/* صفّان منفصلان لا صفّ واحد: النقاط والخطوط الواصلة أعلى، وتسميات الخطوات أسفل. كانا معاً
          من قبل — كل نقطة وتسميتها في عمود واحد بعرضه الطبيعي (shrink-0) — وهذا ينهار على شاشة
          هاتف ضيقة: تسمية طويلة مثل "قيد المراجعة" أعرض من المسافة الفعلية بين نقطتين متجاورتين،
          فيمتد نصّها أفقياً (whitespace-nowrap لا يسمح لها بالنزول سطراً) ويتداخل بصرياً مع تسمية
          الخطوة المجاورة. الحل: صفّ التسميات الآن grid-cols-4 منفصل، فكل خطوة تأخذ ربع العرض
          بالضبط مهما طال نصّها، ويُسمح للنص بالالتفاف على سطرين بدل التمدد جانبياً. */}
      <div className="flex items-center px-1.5">
        {STATUS_STEPS.map((step, i) => {
          const filled = reached >= i;
          const color = STAGE_COLORS[step].fill;
          return (
            <React.Fragment key={step}>
              {i > 0 && (
                <div
                  className="h-0.5 flex-1 rounded-full transition-colors"
                  /* رمادي مقروء لا شبح. كانت 0.15 من حبر قديم (07111F) لم يعد من اللوحة
                     أصلاً: خطّ بالكاد يُرى، فيبدو المسار مقطوعاً بين النقاط بدل أن يبدو مساراً
                     لم يُقطع بعد. والقيمة الآن من OBSIDIAN، حبر اللوحة الفعلي. */
                  style={{ background: filled ? color : 'rgba(8, 10, 13, 0.25)' }}
                  aria-hidden="true"
                />
              )}
              <span
                className="w-3 h-3 rounded-full border transition-all shrink-0"
                style={
                  filled
                    ? { background: color, borderColor: color, boxShadow: `0 0 0 3px ${color}33` }
                    : { background: 'transparent', borderColor: 'rgba(8, 10, 13, 0.45)' }
                }
                aria-hidden="true"
              />
            </React.Fragment>
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-1 mt-1.5">
        {STATUS_STEPS.map((step) => {
          const i = STATUS_STEPS.indexOf(step);
          const filled = reached >= i;
          return (
            <span
              key={step}
              className={`text-[11px] sm:text-[11px] font-bold text-center leading-tight ${
                filled ? 'text-ink' : 'text-ink/80'
              }`}
            >
              {isAr ? labels[step].ar : labels[step].en}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// What a logged-in customer sees at ?page=orders — only contracts matching their own
// account. Ownership is decided by `uid` first (the account Firestore security rules key on),
// then falls back to the email the contract carries, so a contract still shows even when the
// email typed in the form differs from the Google account's. Admins never see this:
// AdminPage routes them to AdminDashboard instead, before this component is ever rendered.
export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ language, currency = 'IQD', user, onBackToSite }) => {
  const isAr = language === 'ar';
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Same reasoning as the admin panel: a customer reading their own contracts and payment
  // figures is here to read, and the drifting background is composited under that the whole
  // time for no benefit. See `html[data-flat]` in index.css.
  useDocumentFlag('flat');
  // Switches the whole page to the home palette (paper ground, ink text) — see
  // `html[data-account]` in index.css. The customer profile is a light page now, not a dark
  // one with light cards pasted on it.
  useDocumentFlag('account');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    // Live subscription scoped to this account's own documents (uid first, email fallback).
    // Because it queries `where(uid == …)` — the exact shape Firestore rules allow a customer
    // to run — every admin save (status, NUVAIQ's signature, agreed notes) lands here in
    // real time, without a refresh, exactly as it appears in the admin panel.
    return subscribeToMyContracts(user.uid, user.email || undefined, setContracts);
  }, [user.email, user.uid]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-2 pb-12 space-y-6">
      {showLogoutConfirm && (
        <LogoutConfirmDialog
          isAr={isAr}
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={() => logoutAccount()}
        />
      )}
      {/* شريط الرأس: زرّان فقط، واحد في كل جهة.
          حُذف منه العنوان والأيقونة والبريد: الصفحة كلّها عقود صاحب الحساب، فعنوان يقول
          "عقودي المحفوظة" يكرّر ما تقوله الصفحة بوجودها، والبريد مكانه داخل العقد نفسه
          (وهو الآن معروض فيه) لا في شريط يعلوه. وما بقي هو ما يُفعَل لا ما يُقرأ.

          نفس زرّي لوحة التحكم حرفياً: دائريان بحجم 44/48 بكسل — الحدّ الأدنى الموصى به
          لمساحة اللمس — بخلفية معتمة وحدّ وظلّ، وأيقونة وحدها بلا كلمات. */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-ink/10">
        <button
          onClick={onBackToSite}
          aria-label={isAr ? 'العودة للموقع' : 'Back to site'}
          title={isAr ? 'العودة للموقع' : 'Back to site'}
          className="w-11 h-11 sm:w-12 sm:h-12 grid place-items-center rounded-full bg-white/90 backdrop-blur-md border border-ink/15 text-ink/70 hover:text-ink hover:bg-white shadow-lg shadow-ink/10 transition-colors cursor-pointer"
        >
          {/* سهم رجوع يتبع اتجاه اللغة: في العربية يشير يميناً (جهة "الخلف" في تخطيط rtl)
              وفي الإنجليزية يساراً. سهم ثابت الاتجاه يعني في إحدى اللغتين سهماً يشير إلى
              الأمام على زرّ يعود للخلف. */}
          {isAr ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </button>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          aria-label={isAr ? 'تسجيل الخروج' : 'Sign out'}
          title={isAr ? 'تسجيل الخروج' : 'Sign out'}
          className="w-11 h-11 sm:w-12 sm:h-12 grid place-items-center rounded-full bg-white/90 backdrop-blur-md border hover:bg-white shadow-lg shadow-ink/10 transition-colors cursor-pointer"
          style={{ borderColor: `${ERROR_ON_LIGHT}40`, color: ERROR_ON_LIGHT }}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className="py-16 text-center text-ink/75 text-xs border border-dashed border-ink/10 rounded-2xl space-y-2">
          <p>
            {isAr
              ? 'لا توجد عقود مرتبطة بهذا البريد الإلكتروني بعد.'
              : 'No contracts linked to this email yet.'}
          </p>
          <p className="text-ink/75">
            {isAr
              ? 'عند إنشاء عقد جديد بنفس البريد الإلكتروني، سيظهر هنا تلقائياً.'
              : 'Create a new contract with this same email and it will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <CustomerContractRow
              key={c.id || c.contractNumber}
              contract={c}
              isAr={isAr}
              language={language}
              currency={currency}
              uid={user.uid}
              expanded={expandedId === (c.id || c.contractNumber)}
              onToggle={() => setExpandedId((prev) => (prev === (c.id || c.contractNumber) ? null : c.id || c.contractNumber || null))}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function CustomerContractRow({
  contract,
  isAr,
  language,
  currency,
  uid,
  expanded,
  onToggle,
}: {
  contract: ContractData;
  isAr: boolean;
  language: Language;
  currency: Currency;
  /** حساب صاحب الحساب — يُكتب على العقد لحظة التوقيع فقط إن لم يكن مكتوباً عليه أصلاً
   *  (انظر handleSignPending أدناه وsupabase/02_policies.sql: customerSignsPendingContract). */
  uid: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  /* بنود العقد كما كانت يوم الاعتماد.
     تُجلب مرة واحدة لكل عقد يحمل بصمة لقطة، وتُمرَّر إلى الوثيقة المطبوعة فتُطبع هي بدل البنود
     الحالية. بدون هذا يكون تجميد المضمون بلا أثر: نحفظ اللقطة ثم نطبع من كود اليوم. */
  const [frozenTerms, setFrozenTerms] = useState<string[] | undefined>(undefined);
  /* البنود مطويّة افتراضياً هنا أيضاً، كما في نموذج الإنشاء: بطاقة العقد تعرض حالته وسعره
     ومدّته ودفعاته، وقائمة بنود مفتوحة فوق ذلك كله كانت تدفن كل ما عداها. تبقى في مكانها
     بزرّها، فيفتحها صاحبها متى شاء. */
  const [termsOpen, setTermsOpen] = useState(false);

  /* عقد أنشأه الأدمن نيابةً عن هذا الزبون ('draft'، بلا توقيع — انظر ContractBuilder.tsx
   * وContractsTab.tsx: adminCreatingForClient). هنا، وهنا فقط، تصير قراءة البنود والتوقيع
   * فعلاً تفاعليَّين بدل عرض للقراءة وحدها — بنفس قوانين نموذج الإنشاء العادي بالضبط، بلا أي
   * تخطٍّ: لا موافقة قبل فتح البنود، ولا حفظ قبل توقيع حقيقي. الفرق الوحيد أن صاحب هذا العقد
   * يوقّعه من حسابه هو لا من نموذج إنشاء جديد. */
  /* "بانتظار توقيعك" تعني **بلا توقيع**، لا مجرّد حالة 'draft'.
     الحالة وحدها كانت كافية لعرض لوحة توقيع فوق عقد موقَّع أصلاً لو عاد إلى 'draft' لأي سبب —
     ولوحة لا يمكن أن تنجح إطلاقاً، لأن القاعدة تقفل التوقيع بعد أول كتابة له
     (signatureIsLocked في supabase/02_policies.sql). زرّ يَعِد بما يرفضه الخادم أسوأ من غيابه. */
  const isPendingSignature = contract.status === 'draft' && !contract.signatureDataUrl;
  const [pendingTermsViewedAt, setPendingTermsViewedAt] = useState<string | null>(null);
  const [pendingAgreedToTerms, setPendingAgreedToTerms] = useState(false);
  const [signatureMissing, setSignatureMissing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const {
    canvasRef: signatureCanvasRef,
    hasSignature,
    startDrawing,
    draw,
    stopDrawing,
    clear: clearSignature,
    getDataUrl: getSignatureDataUrl,
  } = useSignaturePad({ onStrokeStart: () => setSignatureMissing(false) });

  const openPendingTerms = () => {
    setTermsOpen(true);
    if (!pendingTermsViewedAt) setPendingTermsViewedAt(new Date().toISOString());
  };

  const handleSignPending = async () => {
    if (isSigning) return;
    if (!pendingTermsViewedAt || !pendingAgreedToTerms) {
      openPendingTerms();
      showToast(
        isAr ? 'افتح البنود واقرأها ووافق عليها أولاً' : 'Open the terms, read them, and agree first',
        'error'
      );
      return;
    }
    const signatureDataUrl = getSignatureDataUrl();
    if (!signatureDataUrl) {
      setSignatureMissing(true);
      showToast(isAr ? 'التوقيع مطلوب' : 'A signature is required', 'error');
      return;
    }
    setIsSigning(true);
    try {
      await signPendingContract(contract, signatureDataUrl, uid);
      showToast(isAr ? 'تم توقيع العقد بنجاح' : 'Contract signed successfully', 'success');
      // لا حاجة لتحديث محلّي: onSnapshot في CustomerDashboard يوصل حالة 'submitted' الجديدة
      // تلقائياً، فتختفي لوحة التوقيع هذه من تلقاء نفسها لأن isPendingSignature تصير false.
    } catch (e) {
      console.error('Failed to sign pending contract:', e);
      /* لكل سبب رسالته: "تحقّق من الإنترنت" على رفضٍ من الخادم كانت تُرسل صاحب العقد يفحص
         شبكته بينما الشبكة سليمة والرفض في مكان لا يراه. */
      const reason = classifyWriteFailure(e);
      showToast(
        reason === 'denied'
          ? isAr
            ? 'رفض الخادم حفظ التوقيع. حدِّث الصفحة وحاول مجدداً، وإن تكرّر فأبلغنا — العقد بحاجة إلى مراجعة صلاحياته.'
            : 'The server refused to save the signature. Refresh and try again; if it repeats, tell us — the contract needs its permissions reviewed.'
          : reason === 'offline'
            ? isAr
              ? 'تعذّر الوصول إلى الخادم. تحقّق من الإنترنت وحاول مجدداً.'
              : 'Could not reach the server. Check your connection and try again.'
            : isAr
              ? 'تعذّر حفظ التوقيع. حاول مجدداً.'
              : 'Could not save the signature. Please try again.',
        'error'
      );
    } finally {
      setIsSigning(false);
    }
  };

  useEffect(() => {
    if (!contract.snapshotHash) return;
    let cancelled = false;
    fetchContractSnapshot(contract.contractNumber).then((snapshot) => {
      if (cancelled || !snapshot) return;
      setFrozenTerms(language === 'en' ? snapshot.terms.en : snapshot.terms.ar);
    });
    return () => {
      cancelled = true;
    };
  }, [contract.snapshotHash, contract.contractNumber, language]);
  const printRef = useRef<HTMLDivElement>(null);

  // Read-only for the client — never editable here, only in the admin dashboard. Showing it
  // at all (not just cost/profit, which stay admin-only) is deliberate: both sides can see
  // exactly what's been paid and what's left, instead of only NUVAIQ having a record of it.
  const paidAmountIQD = contract.payments ? sumPayments(contract.payments) : contract.paidAmountIQD || 0;
  const remainingIQD = Math.max((contract.totalPriceIQD || 0) - paidAmountIQD, 0);
  /** عقد بقيمة صفر = لم يُسعَّر بعد. نفس الاشتقاق المستعمل في الوثيقة المطبوعة. */
  const hasAgreedPrice = (contract.totalPriceIQD || 0) > 0;
  const installmentsPlanned = contract.installmentsPlanned || 0;

  /* طلب إلغاء العقد — من العميل، وقبل أول دفعة فقط.
   *
   * الشرط ليس تجميلاً: بعد استلام أول دفعة يكون العمل قد بدأ فعلاً وصُرف عليه، والإلغاء عندها
   * لم يعد قراراً من طرف واحد بل بند تعاقدي (يسدّد العميل قيمة ما أُنجز). فيختفي الزرّ تماماً
   * بدل أن يبقى ظاهراً ويُرفض عند الضغط — زر يَعِد بما لا يملكه أسوأ من غيابه.
   *
   * ونفس الشرط مكتوب في قاعدة Firestore، لأن إخفاء زرّ ليس منعاً. */
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSending, setCancelSending] = useState(false);
  const alreadyRequested = !!contract.cancellationRequestedAt;
  const isCancelled = contract.status === 'cancelled';
  // 'draft' مستثناة أيضاً: عقد لم يُوقَّع بعد لا معنى لطلب "إلغائه" — الفعل المتاح لصاحبه هو
  // ببساطة ألّا يوقّعه، لا أن يطلب إلغاء التزام لم يلتزم به أصلاً.
  const canRequestCancellation =
    !alreadyRequested && !isCancelled && !isPendingSignature && paidAmountIQD <= 0 && contract.status !== 'completed';

  const submitCancellation = async () => {
    if (cancelSending) return;
    setCancelSending(true);
    try {
      await requestContractCancellation(contract, cancelReason);
      setCancelOpen(false);
      setCancelReason('');
      showToast(
        isAr
          ? 'وصلنا طلبك. سنتواصل معك قبل اتخاذ أي إجراء.'
          : 'We received your request. We will contact you before taking any action.',
        'success'
      );
    } catch (e) {
      console.error('Cancellation request failed:', e);
      showToast(
        isAr ? 'تعذّر إرسال الطلب، حاول مجدداً أو تواصل معنا مباشرة' : 'Could not send the request — try again or contact us directly',
        'error'
      );
    } finally {
      setCancelSending(false);
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
    <div
      className="rounded-3xl bg-paper border border-ink/10 overflow-hidden"
      style={{ borderInlineStartWidth: '4px', borderInlineStartColor: STAGE_COLORS[contract.status].fill }}
    >
      {expanded && (
        <ConnectedContractPrintDocument ref={printRef} contract={contract} language={language} frozenTerms={frozenTerms} />
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-sand-light/80 transition-colors"
      >
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-bold text-ink truncate">{translateText(contract.templateTitle, language)}</div>
          <div className="text-[11px] text-ink/75 font-mono truncate">{contract.contractNumber}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-mono font-bold text-ink hidden sm:inline">
            {hasAgreedPrice ? formatPrice(contract.totalPriceIQD || 0, language, currency) : (isAr ? 'بانتظار التسعير' : 'Awaiting quote')}
          </span>
          {/* النسبة في السطر المطوي أيضاً: أهم رقم يبحث عنه العميل، ولا يجب أن يضطر لفتح
              البطاقة ليراه. تظهر أثناء التنفيذ فقط — قبله هي رقم مرحلة ثابت لا خبر فيه. */}
          {contract.status === 'in_development' && (
            <span className="text-xs font-mono font-bold text-ink tabular-nums" dir="ltr">
              {contractProgress(contract).percent}%
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${STAGE_COLORS[contract.status].badge}`}>
            {translateText(STATUS_LABEL_AR[contract.status], language)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-ink/10 animate-fade-in">
          {/* أهم سطر في هذه البطاقة لعقد كهذا — قبل تاريخ الإنشاء وقبل شريط المراحل. عقد
              أنشأه الأدمن نيابةً عن هذا الزبون، ولا قيمة قانونية له قبل أن يوقّعه صاحبه؛
              الشارة الرمادية "مسودة" أعلى البطاقة لا تكفي وحدها لتوصيل هذا، فالسطر يقوله
              صراحة ويشير إلى مكان الفعل (لوحة البنود والتوقيع أسفل الصفحة). */}
          {isPendingSignature && (
            <div className="p-3 rounded-xl border text-xs" style={{ background: `${ERROR_ON_LIGHT}0d`, borderColor: `${ERROR_ON_LIGHT}40` }}>
              <span className="font-bold flex items-center gap-1.5 mb-1" style={{ color: ERROR_ON_LIGHT }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {isAr ? 'هذا العقد بانتظار توقيعك' : 'This contract is awaiting your signature'}
              </span>
              <p className="text-ink/75 leading-relaxed">
                {isAr
                  ? 'راجع تفاصيل عقدك أدناه، ثم افتح البنود واقرأها ووقّع في الأسفل — عقدك لا يصبح سارياً قبل ذلك.'
                  : "Review your contract details below, then open the terms, read them, and sign further down — your contract isn't in force until you do."}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-4">
            <div className="flex items-center gap-1.5 text-ink/80">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? 'أُنشئ:' : 'Created:'} <span className="text-ink">{formatDate(contract.createdAt, isAr)}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-ink/80">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? 'آخر تحديث:' : 'Last Updated:'} <span className="text-ink">{formatDate(contract.updatedAt, isAr)}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-ink/80">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? 'اكتمل:' : 'Completed:'} <span className="text-ink">{contract.completedAt ? formatDate(contract.completedAt, isAr) : (isAr ? 'لم يكتمل بعد' : 'Not yet')}</span></span>
            </div>
          </div>

          {/* The four stages at a glance — where this contract sits in the process right now,
              kept above every detail so the answer to "what's the status" never requires
              reading the badge in the header. */}
          <StatusRail status={contract.status} isAr={isAr} />

          <ProgressPanel contract={contract} isAr={isAr} />

          {/* The contract itself — everything the customer entered and agreed to, exactly as
              printed: the price, the payment plan, the delivery window, and the details they
              typed into the form. Nothing here is admin-only; it is the customer's own order. */}
          <ContractDetailsPanel contract={contract} language={language} currency={currency} />

          {/* طلب إلغاء العقد.
              مكانه هنا لا في أعلى البطاقة: لا يُعرض على العميل كخيار أول، بل بعد أن يكون قد
              قرأ سعره ومواصفاته وحالة العمل. وطلب الإلغاء ليس إلغاءً — النص يقول ذلك صراحةً،
              لأن زرّاً يُفهم منه أنه ألغى العقد فوراً يجعل العميل يظنّ الأمر منتهياً ويتوقف عن
              الرد، وهو عكس الغرض: أن نتحدّث معه قبل أن نخسر المشروع. */}
          {/* عقد ملغي: إعلان صريح يسبق كل شيء آخر، ولا طلب إلغاء بعده. الحالة معروضة في شارة
              العقد أصلاً، لكن شارة صغيرة لا تكفي لواقعة بهذا الحجم. */}
          {isCancelled ? (
            <div className="p-3 rounded-xl border text-xs" style={{ background: '#F4F4F3', borderColor: 'rgba(107,113,121,0.35)' }}>
              <span className="font-bold block mb-1 text-ink">{isAr ? 'هذا العقد ملغي' : 'This contract is cancelled'}</span>
              <p className="text-ink/70 leading-relaxed">
                {isAr
                  ? 'أُلغي هذا العقد ولم يعد سارياً. تبقى نسخته ومحتواه محفوظين هنا للرجوع إليهما، ويمكنك بدء عقد جديد في أي وقت.'
                  : 'This contract was cancelled and is no longer in force. Its copy and contents stay here for reference, and you can start a new contract at any time.'}
              </p>
            </div>
          ) : alreadyRequested ? (
            <div className="p-3 rounded-xl border text-xs" style={{ background: '#FFF7F2', borderColor: `${ERROR_ON_LIGHT}33` }}>
              <span className="font-bold block mb-1" style={{ color: ERROR_ON_LIGHT }}>
                {isAr ? 'طلب إلغاء قيد المراجعة' : 'Cancellation request under review'}
              </span>
              <p className="text-ink/70 leading-relaxed">
                {isAr
                  ? 'وصلنا طلبك بإلغاء هذا العقد وسنتواصل معك. العقد يبقى قائماً حتى نتفق على الخطوة التالية.'
                  : 'We received your request to cancel this contract and will contact you. The contract stands until we agree on the next step.'}
              </p>
              {contract.cancellationReason && (
                <p className="mt-2 text-ink/80 whitespace-pre-line">"{contract.cancellationReason}"</p>
              )}
            </div>
          ) : canRequestCancellation ? (
            <div className="p-3 rounded-xl bg-white/70 border border-ink/10 text-xs">
              {!cancelOpen ? (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="flex items-center gap-2 font-bold cursor-pointer hover:underline"
                  style={{ color: ERROR_ON_LIGHT }}
                >
                  <XCircle className="w-4 h-4" />
                  {isAr ? 'تقديم طلب إلغاء العقد' : 'Request to cancel this contract'}
                </button>
              ) : (
                <div className="space-y-2.5">
                  <span className="font-bold block" style={{ color: ERROR_ON_LIGHT }}>
                    {isAr ? 'تأكيد طلب الإلغاء' : 'Confirm the cancellation request'}
                  </span>
                  <p className="text-ink/70 leading-relaxed">
                    {isAr
                      ? 'هذا الطلب لا يلغي العقد فوراً: يصلنا إشعار به، ونتواصل معك لفهم المشكلة — فإن كان بالإمكان حلّها نكمل، وإلا أنهينا العقد باتفاق الطرفين.'
                      : 'This request does not cancel the contract immediately: it notifies us, and we contact you to understand the problem — if it can be solved we continue, otherwise we end the contract by mutual agreement.'}
                  </p>
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder={isAr ? 'سبب الطلب (اختياري، لكنه يساعدنا على حلّ المشكلة)' : 'Reason (optional, but it helps us solve the problem)'}
                    className="w-full p-2.5 rounded-lg bg-white border border-ink/15 text-ink text-xs leading-relaxed outline-none focus:border-ink/40"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={submitCancellation}
                      disabled={cancelSending}
                      className="px-3 py-2 rounded-lg text-white text-xs font-bold cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                      style={{ background: ERROR_ON_LIGHT }}
                    >
                      {cancelSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      {isAr ? 'تأكيد إرسال الطلب' : 'Confirm and send'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelOpen(false)}
                      className="px-3 py-2 rounded-lg bg-white border border-ink/15 text-ink/70 text-xs font-bold cursor-pointer"
                    >
                      {isAr ? 'تراجع' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* البنود التي يلتزم بها العميل فعلاً — نفس القائمة المرقّمة المطبوعة في الوثيقة
              والمعروضة فوق لوحة التوقيع لحظة الإنشاء، حرفياً، فيراجع ما وافق عليه دون فتح ملف.

              ومصدرها اللقطة المجمَّدة متى وُجدت لا بنود اليوم: كانت هذه القائمة تُبنى من كود
              اليوم بينما الوثيقة المطبوعة تُبنى من اللقطة، فكان عميل وقّع قبل تعديل أي بند يقرأ
              على الشاشة نصاً وفي ملفه نصاً آخر — والملف هو الذي وقّعه. الآن الاثنان مصدر واحد. */}
          {(() => {
            const shownTerms =
              frozenTerms && frozenTerms.length > 0
                ? frozenTerms
                : contractTerms(language, contract.deliveryTimelineWeeks || 0);
            const isFrozen = Boolean(frozenTerms && frozenTerms.length > 0);
            return (
              <div className="rounded-xl bg-white/70 border border-ink/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => (isPendingSignature ? (termsOpen ? setTermsOpen(false) : openPendingTerms()) : setTermsOpen((open) => !open))}
                  aria-expanded={termsOpen}
                  className="w-full flex items-center justify-between gap-3 p-3 text-start cursor-pointer hover:bg-white/50 transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-ink/80 shrink-0" />
                    <span className="text-[11px] font-bold text-ink/70">
                      {isAr ? `بنود العقد (${shownTerms.length})` : `Contract Clauses (${shownTerms.length})`}
                    </span>
                    {isFrozen && (
                      <span className="text-[11px] text-ink/75 truncate">
                        {isAr ? '— كما جُمِّدت يوم الاعتماد' : '— frozen on approval'}
                      </span>
                    )}
                    {isPendingSignature && (
                      pendingTermsViewedAt ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: SUCCESS_ON_LIGHT }} />
                      ) : (
                        <span className="text-[11px] font-bold shrink-0" style={{ color: ERROR_ON_LIGHT }}>
                          {isAr ? '— اقرأها لتوقّع' : '— read to sign'}
                        </span>
                      )
                    )}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-ink/80 shrink-0 transition-transform duration-200 ${termsOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {termsOpen && (
                  <>
                    <ol className="px-3 pb-3 space-y-2.5 list-decimal list-inside text-xs">
                      {shownTerms.map((term, i) => (
                        <li key={i} className="text-ink/90 leading-relaxed">
                          {term}
                        </li>
                      ))}
                    </ol>

                    {/* الموافقة معطَّلة قبل فتح البنود — نفس قاعدة نموذج الإنشاء بالضبط
                        (ContractBuilder.tsx)، وهنا محقَّقة أصلاً لأن هذا الصندوق كله لا يُرسم
                        قبل termsOpen، والذي لا يصير true بدون openPendingTerms(). */}
                    {isPendingSignature && (
                      <label className="flex items-center gap-2 px-3 pb-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pendingAgreedToTerms}
                          onChange={(e) => setPendingAgreedToTerms(e.target.checked)}
                          className="w-4 h-4 rounded border-ink/30 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-ink">
                          {isAr ? 'أوافق على بنود العقد أعلاه' : 'I agree to the contract terms above'}
                        </span>
                      </label>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* لوحة توقيع الزبون — تظهر فقط لعقد أنشأه الأدمن نيابةً عنه وما زال بلا توقيع.
              نفس لوحة الرسم ونفس منطق الحبر الداكن المستعملَين في نموذج الإنشاء
              (lib/useSignaturePad.ts)، فتوقيعه هنا يُطبع في وثيقته بلا أي فرق. */}
          {isPendingSignature && (
            <div className="p-3 rounded-xl bg-white/70 border border-ink/10 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-ink/75">{isAr ? 'توقيعك' : 'Your signature'}</span>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="flex items-center gap-1 text-[11px] text-ink/60 hover:text-ink cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isAr ? 'مسح' : 'Clear'}</span>
                </button>
              </div>

              <div
                className={`relative rounded-xl overflow-hidden border-2 border-dashed bg-white transition-colors ${
                  signatureMissing ? 'ring-2' : ''
                }`}
                style={{ borderColor: signatureMissing ? ERROR_ON_LIGHT : 'rgba(0,0,0,0.15)' }}
              >
                <canvas
                  ref={signatureCanvasRef}
                  width={700}
                  height={140}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-32 cursor-crosshair touch-none"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-ink/40 text-xs font-semibold">
                    {isAr ? '[ ارسم توقيعك هنا ]' : '[ Draw your signature here ]'}
                  </div>
                )}
              </div>

              {hasSignature ? (
                <p className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: SUCCESS_ON_LIGHT }}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{isAr ? 'تم التوقيع' : 'Signed'}</span>
                </p>
              ) : (
                <p className="text-[11px] text-ink/60 flex items-center gap-1.5">
                  <PenLine className="w-3.5 h-3.5 shrink-0" />
                  <span>{isAr ? 'التوقيع مطلوب لإتمام العقد.' : 'A signature is required to complete the contract.'}</span>
                </p>
              )}

              <button
                type="button"
                onClick={handleSignPending}
                disabled={isSigning}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-ink text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isSigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                {isSigning ? (isAr ? 'جارِ الحفظ...' : 'Saving...') : (isAr ? 'توقيع وتأكيد العقد' : 'Sign and confirm the contract')}
              </button>
            </div>
          )}

          {contract.adminNotes && (
            <div className="p-3 rounded-xl bg-amber-100/80 border border-amber-300/40 text-xs">
              <span className="text-amber-700 font-bold block mb-1">{isAr ? 'الشروط المتفق عليها بعد المراجعة:' : 'Agreed Terms After Review:'}</span>
              <p className="text-ink/90">{contract.adminNotes}</p>
            </div>
          )}

          {/* Signatures — the customer's own on the right (as drawn when the contract was
              created), NUVAIQ's on the left (added by the admin on approval). Showing the
              customer their own signature confirms it was actually stored; showing NUVAIQ's
              confirms the countersign landed. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contract.signatureDataUrl ? (
              <div className="p-3 rounded-xl bg-white/70 border border-ink/10 text-xs">
                <span className="text-[11px] font-bold text-ink/80 block mb-2">
                  {isAr ? 'توقيعك' : 'Your Signature'}
                </span>
                <div className="bg-white rounded-lg h-16 flex items-center px-2">
                  <img
                    src={contract.signatureDataUrl}
                    alt={isAr ? 'توقيعك' : 'Your signature'}
                    className="max-h-full max-w-full object-contain"
                    /* القلب للتواقيع القديمة ذات الحبر الأبيض فقط — الجديدة داكنة أصلاً
                       (انظر signatureInk في types.ts). */
                    style={{ filter: contract.signatureInk === 'dark' ? undefined : 'invert(1)' }}
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/70 border border-ink/10 text-xs">
                <span className="text-[11px] font-bold text-ink/80 block">
                  {isAr ? 'توقيعك' : 'Your Signature'}
                </span>
                <p className="mt-2 text-ink/75">{isAr ? 'لا يوجد توقيع مخزن لهذا العقد.' : 'No signature stored for this contract.'}</p>
              </div>
            )}

            {contract.companySignatureDataUrl ? (
              <div className="p-3 rounded-xl bg-emerald-100/80 border border-emerald-300/40 text-xs">
                <span className="text-[11px] font-bold text-emerald-700 block mb-2">
                  {isAr ? 'توقيع NUVAIQ' : 'NUVAIQ Signature'}
                </span>
                <div className="bg-white rounded-lg h-16 flex items-center px-2">
                  <img
                    src={contract.companySignatureDataUrl}
                    alt={isAr ? 'توقيع NUVAIQ' : 'NUVAIQ signature'}
                    className="max-h-full max-w-full object-contain"
                    style={{ filter: contract.companySignatureInk === 'dark' ? undefined : 'invert(1)' }}
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/70 border border-ink/10 text-xs">
                <span className="text-[11px] font-bold text-ink/80 block">
                  {isAr ? 'توقيع NUVAIQ' : 'NUVAIQ Signature'}
                </span>
                <p className="mt-2 text-ink/75">
                  {isAr ? 'بانتظار مراجعة الفريق وتوقيعه.' : 'Awaiting the team’s review and sign-off.'}
                </p>
              </div>
            )}
          </div>

          {(paidAmountIQD > 0 || (contract.payments && contract.payments.length > 0)) && (
            <div className="p-3 rounded-xl bg-white/70 border border-ink/10 space-y-2.5">
              <span className="text-[11px] font-bold text-ink flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-ink/80" />
                {isAr ? 'سجل المدفوعات' : 'Payment History'}
              </span>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                {/* الألوان من لوحة الموقع لا من ألوان Tailwind الجاهزة: SUCCESS_ON_LIGHT
                    و WARNING_ON_LIGHT، وكلاهما مقيس فوق 4.5:1 على بطاقة فاتحة — بخلاف
                    emerald-700/amber-700 اللذين كانا هنا ولا ينتميان إلى أي لوحة نملكها. */}
                <div>
                  <span className="text-ink/70 block mb-0.5">{isAr ? 'المدفوع' : 'Paid'}</span>
                  <strong className="text-[#198241] font-mono text-sm font-bold wrap-break-word">{formatPrice(paidAmountIQD, language, currency)}</strong>
                </div>
                <div>
                  <span className="text-ink/70 block mb-0.5">{isAr ? 'المتبقي' : 'Remaining'}</span>
                  <strong className={`font-mono text-sm font-bold wrap-break-word ${remainingIQD > 0 ? 'text-[#8B6C0A]' : 'text-ink/70'}`}>
                    {formatPrice(remainingIQD, language, currency)}
                  </strong>
                </div>
              </div>
              {installmentsPlanned > 0 && (
                <p className="text-[11px] text-ink/80">
                  {isAr
                    ? `${(contract.payments || []).length} من ${installmentsPlanned} دفعة`
                    : `${(contract.payments || []).length} of ${installmentsPlanned} installments`}
                </p>
              )}
              {contract.payments && contract.payments.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-ink/10">
                  {contract.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-ink/70 font-mono shrink-0" dir="ltr">{p.date}</span>
                      {p.note && <span className="text-ink/75 truncate flex-1 text-center">{p.note}</span>}
                      <strong className="text-ink/90 font-mono shrink-0">{formatPrice(p.amountIQD, language, currency)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <NqButton
              tone="white"
              variant="solid"
              size="sm"
              radius="xl"
              loading={isDownloading}
              onClick={handleDownload}
              icon={<Download className="w-4 h-4" />}
            >
              {isAr ? 'تنزيل العقد PDF' : 'Download Contract PDF'}
            </NqButton>
          </div>
        </div>
      )}
    </div>
  );
}
