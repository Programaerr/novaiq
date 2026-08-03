import React, { useEffect } from 'react';
import { ContractData } from '../types';
import { generateContractPDF } from '../lib/pdfGenerator';
import { saveContractToFirebase } from '../lib/firebase';
import {
  Download,
  ShieldCheck,
  X
} from 'lucide-react';

interface ContractPDFPreviewProps {
  contract: ContractData;
  onClose: () => void;
  onSavedSuccess: () => void;
}

export const ContractPDFPreview: React.FC<ContractPDFPreviewProps> = ({
  contract,
  onClose,
  onSavedSuccess,
}) => {
  // Seamlessly auto-save to Firebase in the background on mount
  useEffect(() => {
    let isMounted = true;
    const autoSave = async () => {
      try {
        await saveContractToFirebase(contract);
        if (isMounted) {
          onSavedSuccess();
        }
      } catch (e) {
        console.error('Auto save to Firebase failed silently:', e);
      }
    };
    autoSave();
    return () => {
      isMounted = false;
    };
  }, [contract]);

  const handleDownloadPDF = () => {
    generateContractPDF(contract);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/94 overflow-y-auto">
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
                <span className="text-xs text-zinc-300 font-bold">عقد إلكتروني معتمد</span>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-white font-['Cairo'] mt-0.5">
                سند عقد شركة {contract.companyName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Contract Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-zinc-200 bg-black">
          
          {/* Document Header Box */}
          <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-2xl font-black text-white tracking-widest font-['Cairo'] block">NOVAIQ</span>
              <span className="text-xs text-zinc-400">منصة القوالب البرمجية والعقود الإلكترونية الذكية</span>
            </div>
            <div className="text-right sm:text-left text-xs font-mono text-zinc-400">
              <div>تاريخ الإصدار: {new Date(contract.createdAt).toLocaleDateString('ar-SA')}</div>
              <div>حالة العقد: <span className="text-white font-bold">موثق ومعتمد</span></div>
            </div>
          </div>

          {/* Section 1: Company Info */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
            <h4 className="font-bold text-white text-sm border-b border-zinc-800 pb-2">
              1. بيانات الشركة والممثل القانوني:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>اسم الشركة: <strong className="text-white">{contract.companyName}</strong></div>
              <div>رقم السجل التجاري: <strong className="text-white font-mono">{contract.crNumber || 'N/A'}</strong></div>
              <div>الممثل المخول: <strong className="text-white">{contract.repName}</strong></div>
              <div>البريد الإلكتروني: <strong className="text-white font-mono">{contract.email}</strong></div>
              <div>الهاتف / الجوال: <strong className="text-white font-mono">{contract.phone}</strong></div>
              <div>المقر والمدينة: <strong className="text-white">{contract.city}, {contract.country}</strong></div>
            </div>
          </div>

          {/* Section 2: Template Specs */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
            <h4 className="font-bold text-white text-sm border-b border-zinc-800 pb-2">
              2. القالب المختار والمواصفات الفنية:
            </h4>
            <div className="space-y-2">
              <div>القالب المعتمد: <strong className="text-white text-sm font-bold">{contract.templateTitle}</strong></div>
              <div>المواصفات والإضافات المختارة:
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {contract.selectedSpecs.length > 0 ? (
                    contract.selectedSpecs.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-200 border border-zinc-800 text-[11px]">
                        ✓ {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-400">مواصفات القالب القياسية</span>
                  )}
                </div>
              </div>
              {contract.customFeaturesText && (
                <div className="pt-2 text-zinc-300">
                  ملاحظات الشركة الخاصة: <p className="text-zinc-400 text-[11px] bg-black p-2.5 rounded-lg border border-zinc-800 mt-1">{contract.customFeaturesText}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Financial Structure */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
            <h4 className="font-bold text-white text-sm border-b border-zinc-800 pb-2">
              3. القيمة المالية ومدة التسليم:
            </h4>
            <div className="flex justify-between items-center font-mono text-sm pt-1">
              <span>الإجمالي الكلي المعتمد للعقد:</span>
              <strong className="text-xl text-white font-extrabold">
                {(contract.totalPriceIQD || 0).toLocaleString()} د.ع
              </strong>
            </div>
            <div className="text-[11px] text-zinc-400">
              خطة التسليم المضمنة: <strong>{contract.deliveryTimelineWeeks} أسابيع</strong> | آلية السداد: <strong>{contract.paymentPlan === '50_50' ? '50% مقدم / 50% عند التسليم' : contract.paymentPlan}</strong>
            </div>
          </div>

          {/* Signature Preview & Stamp */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs space-y-2 text-center sm:text-right">
              <span className="font-bold text-zinc-300 block">توقيع الممثل القانوني:</span>
              {contract.signatureDataUrl ? (
                <img
                  src={contract.signatureDataUrl}
                  alt="التوقيع الرقمي"
                  className="h-14 max-w-[200px] object-contain border border-zinc-800 rounded-lg p-1 bg-black"
                />
              ) : (
                <div className="text-zinc-500 italic">[تم التوقيع إلكترونياً]</div>
              )}
              <div className="text-[10px] text-zinc-400">{contract.repName}</div>
            </div>

            {/* NOVAIQ Stamp Seal */}
            <div className="p-3 rounded-2xl border border-zinc-700 bg-zinc-900 text-center space-y-1 w-48">
              <ShieldCheck className="w-5 h-5 text-white mx-auto" />
              <div className="text-xs font-black text-white font-mono">ختم NOVAIQ الرسمي</div>
              <div className="text-[9px] text-zinc-400">VERIFIED CONTRACT</div>
            </div>
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-6 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 font-mono hidden sm:block">
            سيتم طباعة سند العقد الرسمي الموثق
          </div>

          <button
            onClick={handleDownloadPDF}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-sm font-extrabold shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-white"
          >
            <Download className="w-5 h-5" />
            <span>تنزيل العقد PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
};
