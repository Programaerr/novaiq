import React, { useRef, useState } from 'react';
import { OBSIDIAN } from '../lib/homePalette';
import { ContractData } from '../types';
import { generateContractPDF } from '../lib/pdfGenerator';
import { Language, translateText } from '../lib/i18n';
import { formatPrice, Currency } from '../lib/currency';
import { ContractPrintDocument } from './ContractPrintDocument';
import { showToast } from '../lib/toast';
import {
  Download,
  ShieldCheck,
  X,
  CheckCircle2
} from 'lucide-react';
import { NqButton } from './ui/NqButton';

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

  /* نصّ العميل وملاحظات الأدمن يُعرضان كما كُتبا حرفياً.
     كانا يمرّان على خدمة ترجمة آلية وقت العرض؛ أُلغيت الخدمة بالكامل، وهذا هو الصواب هنا
     تحديداً لا مجرد نتيجة للإلغاء: ما وقّع عليه العميل هو النص الذي كتبه، وإعادة صياغته آلياً
     في وثيقة تعاقدية تغيّر معناه بلا أن يوافق أحد على الصياغة الجديدة. */
  const customNotes = contract.customFeaturesText;
  const translatedAdminNotes = contract.adminNotes;
  const templateTitle = translateText(contract.templateTitle, language);
  const city = translateText(contract.city, language);

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

  // `nq-scroll-dark` because this overlay and the document inside it are the two black surfaces
  // left on the site, and the page's ink scrollbar is invisible on black.
  return (
    <div data-lenis-prevent className="nq-scroll-dark fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/94 overflow-y-auto">
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
                <span className="text-xs text-white/90 font-bold">
                  {isAr ? 'عقد إلكتروني بين الطرفين' : 'E-contract between the parties'}
                </span>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-white font-['Cairo'] mt-0.5">
                {isAr ? `سند عقد شركة ${contract.companyName}` : `Contract Deed — ${contract.companyName}`}
              </h3>
            </div>
          </div>

          {/* Icon-only, so it needs a name in words — it had none, which made the only way out
              of this dialog an unlabelled button to a screen reader. */}
          <NqButton
            tone="chrome"
            variant="quiet"
            size="sm"
            radius="xl"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className="w-11 px-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </NqButton>
        </div>

        {/* On-screen contract preview */}
        {/* المعاينة هي الوثيقة نفسها، لا نسخة ثانية منها.
            كان هنا بناء موازٍ داكن يعيد كتابة العقد بيده — وقد افترق عن المطبوع فعلاً: يعلن
            "موقّع من الطرفين" دائماً ولو كان بانتظار الاعتماد، ويطبع "0 د.ع" و"0 أسابيع"
            لمشروع لم يُسعَّر بعد، ولا يعرف حالة العقد ولا جدول الدفعات. أي أن العميل كان يقرأ
            شيئاً وينزّل شيئاً آخر.

            الآن تُعرض `ContractPrintDocument` نفسها بوضع inline: نفس المكوّن ونفس البيانات
            التي يلتقطها مولّد الـPDF — فالمعاينة والملف لا يمكن أن يفترقا، والتوقيع يظهر على
            الورق الأبيض كما سيُطبع بالضبط لا على أرضية داكنة تبتلعه. */}
        <div
          data-lenis-prevent
          className="nq-scroll-dark overflow-y-auto p-4 sm:p-6"
          style={{ background: OBSIDIAN }}
        >
          <div className="mx-auto shadow-2xl" style={{ maxWidth: 794 }}>
            <ContractPrintDocument
              inline
              contract={contract}
              language={language}
              translatedNotes={customNotes}
              translatedAdminNotes={translatedAdminNotes}
              templateTitle={templateTitle}
              city={city}
            />
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-white/75 font-mono hidden sm:block">
            {isAr ? 'سيتم طباعة سند العقد الرسمي الموثق' : 'The official verified contract deed will be printed'}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            {/* Downloading is the action; "Download Complete" only dismisses. They were two
                identical solid buttons, which asked the reader to work out which one was the
                point of the screen. */}
            <NqButton
              tone="chrome"
              variant="solid"
              size="lg"
              radius="xl"
              loading={isGeneratingPdf}
              onClick={handleDownloadPDF}
              className="w-full sm:w-auto"
              icon={<Download className="w-5 h-5" />}
            >
              {isGeneratingPdf
                ? isAr ? 'جارِ التجهيز...' : 'Preparing...'
                : isAr ? 'تنزيل العقد PDF' : 'Download Contract PDF'}
            </NqButton>

            <NqButton
              tone="chrome"
              variant="quiet"
              size="lg"
              radius="xl"
              onClick={onFinish}
              className="w-full sm:w-auto"
              icon={<CheckCircle2 className="w-5 h-5" />}
            >
              {isAr ? 'تم التنزيل' : 'Download Complete'}
            </NqButton>
          </div>
        </div>

      </div>
    </div>
  );
};
