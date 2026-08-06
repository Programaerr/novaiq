// Contract administration: the searchable list, the per-contract editor row, and the
// company-signature pad the admin signs with.
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  TrendingUp,
  FileCheck,
  DollarSign,
  Download,
  Trash2,
  Save,
  Pencil,
  Search,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { ContractData } from '../../types';
import { Language, translateText } from '../../lib/i18n';
import { formatPrice, Currency } from '../../lib/currency';
import { deleteContractFromFirebase, updateContractFields } from '../../lib/firebase';
import { generateContractPDF } from '../../lib/pdfGenerator';
import { ConnectedContractPrintDocument } from '../ContractPrintDocument';
import { cosmicAudio } from '../../lib/audio';
import { showToast } from '../../lib/toast';
import { useSignaturePad } from '../../lib/useSignaturePad';
import { PriceInput } from '../PriceInput';
import { STATUS_FLOW, StatTile, statusArabic, AdminStats } from './shared';

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
  const { canvasRef, hasSignature, startDrawing, draw, stopDrawing, clear, getDataUrl } = useSignaturePad({
    initialDataUrl,
    onStrokeStart: () => onDirtyChange(true),
    onClear: () => onDirtyChange(true),
  });

  useImperativeHandle(ref, () => ({ getDataUrl }));

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-zinc-700 bg-zinc-900">
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
