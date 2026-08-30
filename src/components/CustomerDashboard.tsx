import React, { useEffect, useRef, useState } from 'react';
import { LogOut, FileCheck, Download, Clock, CheckCircle2, Wallet } from 'lucide-react';
import type { User } from 'firebase/auth';
import { ContractData } from '../types';
import { Language, translateText } from '../lib/i18n';
import { formatPrice, Currency } from '../lib/currency';
import { subscribeToMyContracts } from '../lib/firebase';
import { logoutAccount } from '../lib/auth';
import { generateContractPDF } from '../lib/pdfGenerator';
import { ConnectedContractPrintDocument } from './ContractPrintDocument';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import { showToast } from '../lib/toast';
import { sumPayments } from '../lib/payments';
import { useDocumentFlag } from '../lib/useDocumentFlag';
import { contractTerms } from '../data/contractTerms';
import { STAGE_COLORS } from '../lib/statusColors';
import { NqButton } from './ui/NqButton';

interface CustomerDashboardProps {
  language: Language;
  currency?: Currency;
  user: User;
}

const STATUS_LABEL_AR: Record<ContractData['status'], string> = {
  draft: 'مسودة',
  submitted: 'تم تقديم العقد',
  under_review: 'قيد المراجعة الفنية',
  in_development: 'قيد التطوير والتنفيذ',
  completed: 'مكتمل ومسلم',
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
                  style={{ background: filled ? color : 'rgba(7, 17, 31, 0.15)' }}
                  aria-hidden="true"
                />
              )}
              <span
                className="w-3 h-3 rounded-full border transition-all shrink-0"
                style={
                  filled
                    ? { background: color, borderColor: color, boxShadow: `0 0 0 3px ${color}33` }
                    : { background: 'transparent', borderColor: 'rgba(7, 17, 31, 0.3)' }
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
              className={`text-[9px] sm:text-[10px] font-bold text-center leading-tight ${
                filled ? 'text-ink' : 'text-ink/40'
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
export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ language, currency = 'IQD', user }) => {
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
    // to run — every admin save (status, NOVAIQ's signature, agreed notes) lands here in
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
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-ink/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/70 border border-ink/10 flex items-center justify-center text-ink shadow-md">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">
              {isAr ? 'عقودي المحفوظة' : 'My Saved Contracts'}
            </h1>
            <p className="text-xs text-ink/60 font-mono" dir="ltr">{user.email}</p>
          </div>
        </div>
        {/* `sand`, which is the ground this dashboard is painted on — it was carrying the dark
            chrome's `.nq-btn` on a light page. Signing out is not the primary action here, so it
            is the quiet weight; the label hides on a narrow screen and `aria-label` keeps the
            name at every width. */}
        <NqButton
          tone="white"
          variant="quiet"
          size="sm"
          radius="xl"
          onClick={() => setShowLogoutConfirm(true)}
          aria-label={isAr ? 'تسجيل الخروج' : 'Sign Out'}
          className="shrink-0"
          icon={<LogOut className="w-4 h-4" />}
        >
          <span className="hidden sm:inline">{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </NqButton>
      </div>

      {contracts.length === 0 ? (
        <div className="py-16 text-center text-ink/50 text-xs border border-dashed border-ink/10 rounded-2xl space-y-2">
          <p>
            {isAr
              ? 'لا توجد عقود مرتبطة بهذا البريد الإلكتروني بعد.'
              : 'No contracts linked to this email yet.'}
          </p>
          <p className="text-ink/45">
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
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Read-only for the client — never editable here, only in the admin dashboard. Showing it
  // at all (not just cost/profit, which stay admin-only) is deliberate: both sides can see
  // exactly what's been paid and what's left, instead of only NOVAIQ having a record of it.
  const paidAmountIQD = contract.payments ? sumPayments(contract.payments) : contract.paidAmountIQD || 0;
  const remainingIQD = Math.max((contract.totalPriceIQD || 0) - paidAmountIQD, 0);
  const installmentsPlanned = contract.installmentsPlanned || 0;

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
    <div className="rounded-2xl bg-paper border border-ink/10 overflow-hidden">
      {expanded && <ConnectedContractPrintDocument ref={printRef} contract={contract} language={language} />}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-sand-light/80 transition-colors"
      >
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-bold text-ink truncate">{translateText(contract.templateTitle, language)}</div>
          <div className="text-[10px] text-ink/50 font-mono truncate">{contract.contractNumber}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono text-ink/75 hidden sm:inline">{formatPrice(contract.totalPriceIQD || 0, language, currency)}</span>
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STAGE_COLORS[contract.status].badge}`}>
            {translateText(STATUS_LABEL_AR[contract.status], language)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-ink/10 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-4">
            <div className="flex items-center gap-1.5 text-ink/60">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? 'أُنشئ:' : 'Created:'} <span className="text-ink">{formatDate(contract.createdAt, isAr)}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-ink/60">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? 'آخر تحديث:' : 'Last Updated:'} <span className="text-ink">{formatDate(contract.updatedAt, isAr)}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-ink/60">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? 'اكتمل:' : 'Completed:'} <span className="text-ink">{contract.completedAt ? formatDate(contract.completedAt, isAr) : (isAr ? 'لم يكتمل بعد' : 'Not yet')}</span></span>
            </div>
          </div>

          {/* The four stages at a glance — where this contract sits in the process right now,
              kept above every detail so the answer to "what's the status" never requires
              reading the badge in the header. */}
          <StatusRail status={contract.status} isAr={isAr} />

          {/* The contract itself — everything the customer entered and agreed to, exactly as
              printed: the price, the payment plan, the delivery window, and the details they
              typed into the form. Nothing here is admin-only; it is the customer's own order. */}
          <div className="p-3 rounded-xl bg-white/70 border border-ink/10 text-xs">
            <span className="text-[11px] font-bold text-ink/60 block mb-3">
              {isAr ? 'تفاصيل العقد' : 'Contract Details'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
              <div>
                <span className="text-ink/50 block">{isAr ? 'إجمالي السعر' : 'Total Price'}</span>
                <strong className="text-ink font-mono text-sm">{formatPrice(contract.totalPriceIQD || 0, language, currency)}</strong>
              </div>
              <div>
                <span className="text-ink/50 block">{isAr ? 'خطة الدفع' : 'Payment Plan'}</span>
                <strong className="text-ink/90">
                  {contract.paymentPlan === '100_upfront'
                    ? (isAr ? 'دفعة واحدة عند التوقيع' : '100% Upfront')
                    : contract.paymentPlan === '3_milestones'
                    ? (isAr ? '3 دفعات مرتبطة بالمراحل' : '3 Milestones')
                    : (isAr ? '50% عند التوقيع و50% عند التسليم' : '50% / 50%')}
                </strong>
              </div>
              <div>
                <span className="text-ink/50 block">{isAr ? 'مدة التسليم' : 'Delivery'}</span>
                <strong className="text-ink/90">
                  {isAr ? `${contract.deliveryTimelineWeeks || 0} أسبوع` : `${contract.deliveryTimelineWeeks || 0} weeks`}
                </strong>
              </div>
              <div>
                <span className="text-ink/50 block">{isAr ? 'قالب المشروع' : 'Project Template'}</span>
                <strong className="text-ink/90">{translateText(contract.templateTitle, language)}</strong>
              </div>
              <div>
                <span className="text-ink/50 block">{isAr ? 'اسم الشركة' : 'Company Name'}</span>
                <strong className="text-ink/90">{contract.companyName}</strong>
              </div>
              <div>
                <span className="text-ink/50 block">{isAr ? 'اسم الممثل' : 'Representative'}</span>
                <strong className="text-ink/90">{contract.repName}</strong>
              </div>
              <div>
                <span className="text-ink/50 block">{isAr ? 'الهاتف' : 'Phone'}</span>
                <strong className="text-ink/90 font-mono" dir="ltr">{contract.phone}</strong>
              </div>
              <div>
                <span className="text-ink/50 block">{isAr ? 'الموقع' : 'Location'}</span>
                <strong className="text-ink/90">{contract.city}</strong>
              </div>
            </div>

            {contract.customFeaturesText && (
              <div className="mt-3 pt-3 border-t border-ink/10">
                <span className="text-ink/50 block mb-1">{isAr ? 'ما طلبته إضافياً:' : 'What you requested:'}</span>
                <p className="text-ink/90 leading-relaxed whitespace-pre-line">{contract.customFeaturesText}</p>
              </div>
            )}
          </div>

          {/* The clauses the customer is actually bound by — the same numbered list printed in
              the PDF and shown above the pad at signing. Showing them here, verbatim, means
              the customer can re-read exactly what they agreed to without hunting through a
              downloaded file, and it can never disagree with the printed copy. */}
          <div className="p-3 rounded-xl bg-white/70 border border-ink/10 text-xs">
            <span className="text-[11px] font-bold text-ink/60 block mb-3">
              {isAr ? `بنود العقد (${contractTerms(language, contract.deliveryTimelineWeeks || 0).length})` : `Contract Clauses (${contractTerms(language, contract.deliveryTimelineWeeks || 0).length})`}
            </span>
            <ol className="space-y-2.5 list-decimal list-inside">
              {contractTerms(language, contract.deliveryTimelineWeeks || 0).map((term, i) => (
                <li key={i} className="text-ink/90 leading-relaxed">
                  {term}
                </li>
              ))}
            </ol>
          </div>

          {contract.adminNotes && (
            <div className="p-3 rounded-xl bg-amber-100/80 border border-amber-300/40 text-xs">
              <span className="text-amber-700 font-bold block mb-1">{isAr ? 'الشروط المتفق عليها بعد المراجعة:' : 'Agreed Terms After Review:'}</span>
              <p className="text-ink/90">{contract.adminNotes}</p>
            </div>
          )}

          {/* Signatures — the customer's own on the right (as drawn when the contract was
              created), NOVAIQ's on the left (added by the admin on approval). Showing the
              customer their own signature confirms it was actually stored; showing NOVAIQ's
              confirms the countersign landed. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contract.signatureDataUrl ? (
              <div className="p-3 rounded-xl bg-white/70 border border-ink/10 text-xs">
                <span className="text-[11px] font-bold text-ink/60 block mb-2">
                  {isAr ? 'توقيعك' : 'Your Signature'}
                </span>
                <div className="bg-white rounded-lg h-16 flex items-center px-2">
                  <img
                    src={contract.signatureDataUrl}
                    alt={isAr ? 'توقيعك' : 'Your signature'}
                    className="max-h-full max-w-full object-contain"
                    style={{ filter: 'invert(1)' }}
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/70 border border-ink/10 text-xs">
                <span className="text-[11px] font-bold text-ink/60 block">
                  {isAr ? 'توقيعك' : 'Your Signature'}
                </span>
                <p className="mt-2 text-ink/50">{isAr ? 'لا يوجد توقيع مخزن لهذا العقد.' : 'No signature stored for this contract.'}</p>
              </div>
            )}

            {contract.companySignatureDataUrl ? (
              <div className="p-3 rounded-xl bg-emerald-100/80 border border-emerald-300/40 text-xs">
                <span className="text-[11px] font-bold text-emerald-700 block mb-2">
                  {isAr ? 'توقيع NOVAIQ' : 'NOVAIQ Signature'}
                </span>
                <div className="bg-white rounded-lg h-16 flex items-center px-2">
                  <img
                    src={contract.companySignatureDataUrl}
                    alt={isAr ? 'توقيع NOVAIQ' : 'NOVAIQ signature'}
                    className="max-h-full max-w-full object-contain"
                    style={{ filter: 'invert(1)' }}
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/70 border border-ink/10 text-xs">
                <span className="text-[11px] font-bold text-ink/60 block">
                  {isAr ? 'توقيع NOVAIQ' : 'NOVAIQ Signature'}
                </span>
                <p className="mt-2 text-ink/50">
                  {isAr ? 'بانتظار مراجعة الفريق وتوقيعه.' : 'Awaiting the team’s review and sign-off.'}
                </p>
              </div>
            )}
          </div>

          {(paidAmountIQD > 0 || (contract.payments && contract.payments.length > 0)) && (
            <div className="p-3 rounded-xl bg-white/70 border border-ink/10 space-y-2.5">
              <span className="text-[11px] font-bold text-ink flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-ink/60" />
                {isAr ? 'سجل المدفوعات' : 'Payment History'}
              </span>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-ink/50 block mb-0.5">{isAr ? 'المدفوع' : 'Paid'}</span>
                  <strong className="text-emerald-700 font-mono wrap-break-word">{formatPrice(paidAmountIQD, language, currency)}</strong>
                </div>
                <div>
                  <span className="text-ink/50 block mb-0.5">{isAr ? 'المتبقي' : 'Remaining'}</span>
                  <strong className={`font-mono wrap-break-word ${remainingIQD > 0 ? 'text-amber-700' : 'text-ink/60'}`}>
                    {formatPrice(remainingIQD, language, currency)}
                  </strong>
                </div>
              </div>
              {installmentsPlanned > 0 && (
                <p className="text-[11px] text-ink/60">
                  {isAr
                    ? `${(contract.payments || []).length} من ${installmentsPlanned} دفعة`
                    : `${(contract.payments || []).length} of ${installmentsPlanned} installments`}
                </p>
              )}
              {contract.payments && contract.payments.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-ink/10">
                  {contract.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-ink/50 font-mono shrink-0" dir="ltr">{p.date}</span>
                      {p.note && <span className="text-ink/60 truncate flex-1 text-center">{p.note}</span>}
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
