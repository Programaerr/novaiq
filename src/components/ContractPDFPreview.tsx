import React, { useRef, useState } from 'react';
import { ContractData } from '../types';
import { generateContractPDF } from '../lib/pdfGenerator';
import { Language, translateText } from '../lib/i18n';
import { useAutoTranslate, useAutoTranslateList } from '../lib/autoTranslate';
import { formatPrice, Currency } from '../lib/currency';
import { ContractPrintDocument } from './ContractPrintDocument';
import { showToast } from '../lib/toast';
import {
  Download,
  ShieldCheck,
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface ContractPDFPreviewProps {
  contract: ContractData;
  language: Language;
  currency?: Currency;
  onClose: () => void;
  /** "تم التنزيل" — the customer explicitly wrapping up, distinct from the X button (which
   *  just dismisses without going anywhere). Sends them back to the template they ordered, or
   *  home for a fully custom project — see App.tsx's handleFinishContractDownload. */
  onFinish: () => void;
}

export const ContractPDFPreview: React.FC<ContractPDFPreviewProps> = ({
  contract,
  language,
  currency = 'IQD',
  onClose,
  onFinish,
}) => {
  const isAr = language === 'ar';
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Spec labels and the client's free-text notes come straight from template data / user
  // input and have no static dictionary entry, so they resolve through the translation
  // service and are cached after the first lookup.
  const customNotes = useAutoTranslate(contract.customFeaturesText, language);
  const translatedAdminNotes = useAutoTranslate(contract.adminNotes, language);
  const templateTitle = translateText(contract.templateTitle, language);
  const city = translateText(contract.city, language);
  const country = translateText(contract.country, language);

  // This component no longer saves anything. It used to auto-save on mount, which meant the
  // contract was only written once this lazily-loaded chunk (jsPDF + html2canvas, ~900KB)
  // had finished downloading — so a stalled chunk meant a signed contract that was never
  // created, behind a loader that never resolved. The save now happens in App's
  // handleContractGenerated before this modal is ever mounted, and by the time it renders the
  // contract already exists. Its job is what it was always named for: showing that contract
  // and turning it into a PDF.

  const handleDownloadPDF = async () => {
    if (!printRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      await generateContractPDF(printRef.current, contract);
    } catch {
      showToast(isAr ? 'تعذر إنشاء ملف PDF، حاول مجدداً' : 'Failed to generate the PDF — please try again', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const paymentPlanLabel = (() => {
    switch (contract.paymentPlan) {
      case '50_50':
        return isAr ? '50% مقدم / 50% عند التسليم' : '50% Upfront / 50% On Delivery';
      case '100_upfront':
        return isAr ? '100% دفعة كاملة مسبقة (خصم 5%)' : '100% Upfront Payment (5% Discount)';
      case '3_milestones':
        return isAr ? '3 دفعات حسب مراحل الإنجاز' : '3 Installments by Milestone';
      default:
        return contract.paymentPlan;
    }
  })();

  return (
    <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/94 overflow-y-auto">
      {/* Off-screen print-ready document — this, not the dark preview below, is what the
          PDF captures, so the downloaded file is a clean white formal contract. */}
      <ContractPrintDocument
        ref={printRef}
        contract={contract}
        language={language}
        translatedNotes={customNotes}
        translatedAdminNotes={translatedAdminNotes}
        templateTitle={templateTitle}
        city={city}
        country={country}
      />

      <div className="bg-black border border-zinc-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[92vh]">

        {/* Modal Top Banner */}
        <div className="p-4 sm:p-6 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-white text-[10px] font-bold font-mono">
                  {contract.contractNumber}
                </span>
                <span className="text-xs text-zinc-300 font-bold">
                  {isAr ? 'عقد إلكتروني معتمد' : 'Verified Electronic Contract'}
                </span>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-white font-['Cairo'] mt-0.5">
                {isAr ? `سند عقد شركة ${contract.companyName}` : `Contract Deed — ${contract.companyName}`}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="nq-btn nq-btn--solid p-2 rounded-xl cursor-pointer"
          >
            <span className="nq-btn-beam" aria-hidden="true" />
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* On-screen contract preview */}
        <div data-lenis-prevent className="p-6 sm:p-8 overflow-y-auto space-y-6 text-zinc-200 bg-black">

          {/* Document Header Box */}
          <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-2xl font-black text-white tracking-widest font-['Cairo'] block">NOVAIQ</span>
              <span className="text-xs text-zinc-400">
                {isAr ? 'منصة القوالب البرمجية والعقود الإلكترونية الذكية' : 'Smart Software Templates & Electronic Contracts Platform'}
              </span>
            </div>
            <div className={`text-xs font-mono text-zinc-400 ${isAr ? 'text-right sm:text-left' : 'text-left sm:text-right'}`}>
              <div>{isAr ? 'تاريخ الإصدار:' : 'Issue Date:'} {new Date(contract.createdAt).toLocaleDateString(isAr ? 'ar-IQ' : 'en-GB')}</div>
              <div>{isAr ? 'حالة العقد:' : 'Contract Status:'} <span className="text-white font-bold">{isAr ? 'موثق ومعتمد' : 'Verified & Approved'}</span></div>
            </div>
          </div>

          {/* Section 1: Company Info */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
            <h4 className="font-bold text-white text-sm border-b border-zinc-800 pb-2">
              {isAr ? '1. بيانات الشركة والممثل القانوني:' : '1. Company & Legal Representative Information:'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>{isAr ? 'اسم الشركة:' : 'Company Name:'} <strong className="text-white">{contract.companyName}</strong></div>
              <div>{isAr ? 'رقم السجل التجاري:' : 'CR / ID Number:'} <strong className="text-white font-mono">{contract.crNumber || 'N/A'}</strong></div>
              <div>{isAr ? 'الممثل المخول:' : 'Authorized Representative:'} <strong className="text-white">{contract.repName}</strong></div>
              <div>{isAr ? 'البريد الإلكتروني:' : 'Email:'} <strong className="text-white font-mono">{contract.email}</strong></div>
              <div>{isAr ? 'الهاتف / الجوال:' : 'Phone / Mobile:'} <strong className="text-white font-mono">{contract.phone}</strong></div>
              <div>{isAr ? 'المقر والمدينة:' : 'City, Country:'} <strong className="text-white">{city}, {country}</strong></div>
            </div>
          </div>

          {/* Section 2: Template Specs */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
            <h4 className="font-bold text-white text-sm border-b border-zinc-800 pb-2">
              {isAr ? '2. القالب المختار والمواصفات الفنية:' : '2. Selected Template & Technical Specifications:'}
            </h4>
            <div className="space-y-2">
              <div>{isAr ? 'القالب المعتمد:' : 'Approved Template:'} <strong className="text-white text-sm font-bold">{templateTitle}</strong></div>
              <div>{isAr ? 'المواصفات والإضافات المختارة:' : 'Selected Specifications & Add-ons:'}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {translatedSpecs.length > 0 ? (
                    translatedSpecs.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-200 border border-zinc-800 text-[11px]">
                        ✓ {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-400">{isAr ? 'مواصفات القالب القياسية' : 'Standard Template Specifications'}</span>
                  )}
                </div>
              </div>
              {contract.customFeaturesText && (
                <div className="pt-2 text-zinc-300">
                  {isAr ? 'ملاحظات الشركة الخاصة:' : "Company's Custom Notes:"} <p className="text-zinc-400 text-[11px] bg-black p-2.5 rounded-lg border border-zinc-800 mt-1">{customNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Financial Structure */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
            <h4 className="font-bold text-white text-sm border-b border-zinc-800 pb-2">
              {isAr ? '3. القيمة المالية ومدة التسليم:' : '3. Financial Value & Delivery Timeline:'}
            </h4>
            <div className="flex justify-between items-center font-mono text-sm pt-1">
              <span>{isAr ? 'الإجمالي الكلي المعتمد للعقد:' : 'Total Approved Contract Value:'}</span>
              <strong className="text-xl text-white font-extrabold">
                {formatPrice(contract.totalPriceIQD || 0, language, currency)}
              </strong>
            </div>
            <div className="text-[11px] text-zinc-400">
              {isAr ? 'خطة التسليم المضمنة:' : 'Included Delivery Plan:'} <strong>{contract.deliveryTimelineWeeks} {isAr ? 'أسابيع' : 'weeks'}</strong> | {isAr ? 'آلية السداد:' : 'Payment Method:'} <strong>{paymentPlanLabel}</strong>
            </div>
          </div>

          {/* Signature Preview & Stamp */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className={`text-xs space-y-2 text-center ${isAr ? 'sm:text-right' : 'sm:text-left'}`}>
              <span className="font-bold text-zinc-300 block">{isAr ? 'توقيع الممثل القانوني:' : 'Legal Representative Signature:'}</span>
              {contract.signatureDataUrl ? (
                <img
                  src={contract.signatureDataUrl}
                  alt={isAr ? 'التوقيع الرقمي' : 'Digital Signature'}
                  className="h-14 max-w-[200px] object-contain border border-zinc-800 rounded-lg p-1 bg-black"
                />
              ) : (
                <div className="text-zinc-500 italic">{isAr ? '[تم التوقيع إلكترونياً]' : '[Signed Electronically]'}</div>
              )}
              <div className="text-[10px] text-zinc-400">{contract.repName}</div>
            </div>

            {/* NOVAIQ Stamp Seal */}
            <div className="p-3 rounded-2xl border border-zinc-700 bg-zinc-900 text-center space-y-1 w-48">
              <ShieldCheck className="w-5 h-5 text-white mx-auto" />
              <div className="text-xs font-black text-white font-mono">{isAr ? 'ختم NOVAIQ الرسمي' : 'NOVAIQ Official Seal'}</div>
              <div className="text-[9px] text-zinc-400">VERIFIED CONTRACT</div>
            </div>
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-6 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 font-mono hidden sm:block">
            {isAr ? 'سيتم طباعة سند العقد الرسمي الموثق' : 'The official verified contract deed will be printed'}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="nq-btn nq-btn--solid w-full sm:w-auto px-8 py-3 rounded-xl disabled:opacity-60 disabled:cursor-wait text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="nq-btn-beam" aria-hidden="true" />
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isAr ? 'جارِ التجهيز...' : 'Preparing...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>{isAr ? 'تنزيل العقد PDF' : 'Download Contract PDF'}</span>
                </>
              )}
            </button>

            <button
              onClick={onFinish}
              className="nq-btn nq-btn--solid w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="nq-btn-beam" aria-hidden="true" />
              <CheckCircle2 className="w-5 h-5" />
              <span>{isAr ? 'تم التنزيل' : 'Download Complete'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
