import React, { useEffect, useRef, useState } from 'react';
import { LogOut, FileCheck, Download, Loader2, Clock, CheckCircle2, Wallet } from 'lucide-react';
import type { User } from 'firebase/auth';
import { ContractData } from '../types';
import { Language, translateText } from '../lib/i18n';
import { formatPrice, Currency } from '../lib/currency';
import { subscribeToContracts } from '../lib/firebase';
import { logoutAccount } from '../lib/auth';
import { generateContractPDF } from '../lib/pdfGenerator';
import { ConnectedContractPrintDocument } from './ContractPrintDocument';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';
import { showToast } from '../lib/toast';
import { sumPayments } from '../lib/payments';

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

function formatDate(iso: string | undefined, isAr: boolean): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(isAr ? 'ar-IQ' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// What a logged-in customer sees at ?page=orders — only contracts matching their own
// account email, each showing exactly when it was created, last updated, and (once
// reached) completed. Admins never see this: AdminPage routes them to AdminDashboard
// instead, before this component is ever rendered.
export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ language, currency = 'IQD', user }) => {
  const isAr = language === 'ar';
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const unsub = subscribeToContracts((all) => {
      const mine = all.filter((c) => (c.email || '').trim().toLowerCase() === (user.email || '').trim().toLowerCase());
      setContracts(mine);
    });
    return unsub;
  }, [user.email]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-2 pb-12 space-y-6">
      {showLogoutConfirm && (
        <LogoutConfirmDialog
          isAr={isAr}
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={() => logoutAccount()}
        />
      )}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-md">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {isAr ? 'عقودي المحفوظة' : 'My Saved Contracts'}
            </h1>
            <p className="text-xs text-zinc-400 font-mono" dir="ltr">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="nq-btn nq-btn--solid px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span className="nq-btn-beam" aria-hidden="true" />
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl space-y-2">
          <p>
            {isAr
              ? 'لا توجد عقود مرتبطة بهذا البريد الإلكتروني بعد.'
              : 'No contracts linked to this email yet.'}
          </p>
          <p className="text-zinc-600">
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
    <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
      {expanded && <ConnectedContractPrintDocument ref={printRef} contract={contract} language={language} />}

      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-zinc-900/50 transition-colors"
      >
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-bold text-white truncate">{translateText(contract.templateTitle, language)}</div>
          <div className="text-[10px] text-zinc-500 font-mono truncate">{contract.contractNumber}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono text-zinc-300 hidden sm:inline">{formatPrice(contract.totalPriceIQD || 0, language, currency)}</span>
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
            contract.status === 'completed'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-800'
              : 'bg-zinc-900 border-zinc-700 text-zinc-200'
          }`}>
            {translateText(STATUS_LABEL_AR[contract.status], language)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-zinc-800 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-4">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? 'أُنشئ:' : 'Created:'} <span className="text-white">{formatDate(contract.createdAt, isAr)}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? 'آخر تحديث:' : 'Last Updated:'} <span className="text-white">{formatDate(contract.updatedAt, isAr)}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? 'اكتمل:' : 'Completed:'} <span className="text-white">{contract.completedAt ? formatDate(contract.completedAt, isAr) : (isAr ? 'لم يكتمل بعد' : 'Not yet')}</span></span>
            </div>
          </div>

          {contract.companySignatureDataUrl && (
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-300 font-bold">
                {isAr ? 'وقّعت NOVAIQ واعتمدت هذا العقد' : 'NOVAIQ has signed off on and approved this contract'}
              </span>
            </div>
          )}

          {contract.adminNotes && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-xs">
              <span className="text-amber-400 font-bold block mb-1">{isAr ? 'الشروط المتفق عليها بعد المراجعة:' : 'Agreed Terms After Review:'}</span>
              <p className="text-zinc-200">{contract.adminNotes}</p>
            </div>
          )}

          {(paidAmountIQD > 0 || (contract.payments && contract.payments.length > 0)) && (
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-zinc-400" />
                {isAr ? 'سجل المدفوعات' : 'Payment History'}
              </span>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-zinc-500 block mb-0.5">{isAr ? 'المدفوع' : 'Paid'}</span>
                  <strong className="text-emerald-400 font-mono wrap-break-word">{formatPrice(paidAmountIQD, language, currency)}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5">{isAr ? 'المتبقي' : 'Remaining'}</span>
                  <strong className={`font-mono wrap-break-word ${remainingIQD > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
                    {formatPrice(remainingIQD, language, currency)}
                  </strong>
                </div>
              </div>
              {installmentsPlanned > 0 && (
                <p className="text-[11px] text-zinc-400">
                  {isAr
                    ? `${(contract.payments || []).length} من ${installmentsPlanned} دفعة`
                    : `${(contract.payments || []).length} of ${installmentsPlanned} installments`}
                </p>
              )}
              {contract.payments && contract.payments.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-zinc-800">
                  {contract.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-zinc-500 font-mono shrink-0" dir="ltr">{p.date}</span>
                      {p.note && <span className="text-zinc-400 truncate flex-1 text-center">{p.note}</span>}
                      <strong className="text-zinc-200 font-mono shrink-0">{formatPrice(p.amountIQD, language, currency)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="nq-btn nq-btn--solid px-5 py-2.5 rounded-xl disabled:opacity-60 text-xs font-extrabold flex items-center gap-2 cursor-pointer"
            >
              <span className="nq-btn-beam" aria-hidden="true" />
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isAr ? 'تنزيل العقد PDF' : 'Download Contract PDF'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
