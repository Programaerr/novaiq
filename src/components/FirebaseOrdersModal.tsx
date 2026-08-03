import React, { useState, useEffect, useRef } from 'react';
import {
  FileCheck,
  Search,
  Download,
  Trash2,
  X,
  RefreshCw,
  FileText,
  Coins,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { ContractData } from '../types';
import { deleteContractFromFirebase, subscribeToContracts } from '../lib/firebase';
import { generateContractPDF } from '../lib/pdfGenerator';
import { cosmicAudio } from '../lib/audio';
import { Language } from '../lib/i18n';
import { formatPrice } from '../lib/currency';

interface FirebaseOrdersModalProps {
  onClose: () => void;
  onNewContract: () => void;
  language?: Language;
}

export const FirebaseOrdersModal: React.FC<FirebaseOrdersModalProps> = ({
  onClose,
  onNewContract,
  language = 'ar',
}) => {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);
  const [contractToDelete, setContractToDelete] = useState<ContractData | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  // Shared between the standalone-page and modal layouts below — only one of the two
  // ever mounts at a time, so a single ref safely tracks whichever is on screen.
  const contractSummaryRef = useRef<HTMLDivElement>(null);

  const isStandalone = typeof window !== 'undefined' && 
    (new URLSearchParams(window.location.search).get('page') === 'orders' || 
     new URLSearchParams(window.location.search).get('page') === 'contracts');

  const totalValue = contracts.reduce((acc, curr) => acc + (curr.totalPriceIQD || 0), 0);
  const totalContracts = contracts.length;

  const handleClose = () => {
    if (isStandalone) {
      window.history.pushState({}, '', window.location.pathname);
      window.dispatchEvent(new Event('popstate'));
    }
    onClose();
  };

  const handleNewContract = () => {
    if (isStandalone) {
      window.history.pushState({}, '', '?page=custom-request');
      window.dispatchEvent(new Event('popstate'));
    }
    onNewContract();
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToContracts((data) => {
      setContracts(data);
      if (data.length > 0) {
        setSelectedContract((prev) => {
          if (prev && data.some((c) => c.contractNumber === prev.contractNumber)) {
            return data.find((c) => c.contractNumber === prev.contractNumber) || prev;
          }
          return data[0];
        });
      } else {
        setSelectedContract(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredContracts = contracts.filter((c) => {
    const val = searchTerm.toLowerCase();
    return (
      c.companyName?.toLowerCase().includes(val) ||
      c.repName?.toLowerCase().includes(val) ||
      c.clientName?.toLowerCase().includes(val) ||
      c.contractNumber?.toLowerCase().includes(val) ||
      c.phone?.toLowerCase().includes(val) ||
      c.clientPhone?.toLowerCase().includes(val)
    );
  });

  const handleDeleteContract = (contract: ContractData, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setContractToDelete(contract);
  };

  const executeDeleteContract = async () => {
    if (!contractToDelete || isDeleting) return;
    setIsDeleting(true);

    const targetNum = contractToDelete.contractNumber;
    const targetId = contractToDelete.id;

    // 1. Instant local optimistic state removal for immediate UI feedback
    const updated = contracts.filter((item) => {
      if (targetId && item.id === targetId) return false;
      if (targetNum && item.contractNumber === targetNum) return false;
      return true;
    });

    setContracts(updated);
    if (selectedContract?.contractNumber === targetNum || selectedContract?.id === targetId) {
      setSelectedContract(updated[0] || null);
    }
    setContractToDelete(null);

    // 2. Perform Firestore & LocalStorage deletion in background
    try {
      await deleteContractFromFirebase(targetId, targetNum);
      cosmicAudio.playPing();
    } catch (err) {
      console.error('Error deleting contract:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const isAr = language === 'ar';

  const renderDeleteModal = () => {
    if (!contractToDelete) return null;
    return (
      <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[99999]">
        <div className="w-full max-w-md bg-zinc-950 border border-red-900/60 rounded-3xl p-6 space-y-6 text-right shadow-2xl animate-fadeIn">
          <div className="flex items-center gap-3 text-red-400 border-b border-zinc-800 pb-3">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <h4 className="text-base font-bold text-white">
              {isAr ? 'تأكيد حذف المستند الرقمي نهائياً' : 'Confirm Permanent Contract Deletion'}
            </h4>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-zinc-300 leading-relaxed">
              {isAr 
                ? 'هل أنت متأكد من رغبتك في حذف هذا العقد بشكل كامل ونهائي؟ سيتم مسح كافة بيانات العقد ولا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to permanently delete this contract? All record data will be removed and this action cannot be undone.'}
            </p>
            <div className="p-3 bg-black rounded-xl border border-zinc-800 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>{isAr ? 'رقم العقد:' : 'Contract #:'}</span>
                <span className="text-red-400 font-bold">{contractToDelete.contractNumber}</span>
              </div>
              <div className="flex justify-between text-zinc-400 mt-1">
                <span>{isAr ? 'اسم الشركة:' : 'Company:'}</span>
                <span className="text-zinc-200">{contractToDelete.companyName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setContractToDelete(null)}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {isAr ? 'إلغاء الأمر' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={executeDeleteContract}
              className="px-5 py-2.5 bg-red-950 hover:bg-red-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-red-700 transition-all cursor-pointer shadow-lg"
            >
              <Trash2 className="w-4 h-4 text-red-300" />
              <span>{isDeleting ? (isAr ? 'جاري الحذف...' : 'Deleting...') : (isAr ? 'تأكيد حذف العقد' : 'Confirm Delete')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isStandalone) {
    return (
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Page Title Header */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-800 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-md">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {isAr ? 'سجل وإدارة العقود الرقمية المبرمة' : 'Digital Contracts & Orders Management'}
              </h1>
              <p className="text-xs text-zinc-400">
                {isAr ? 'استعراض العقود والاتفاقيات الموثقة مع إمكانية التحميل والحذف المباشر.' : 'Manage verified contracts, download PDF documents, or delete entries.'}
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Metrics Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] text-zinc-400 block font-medium">
                {isAr ? 'إجمالي العقود الموثقة' : 'Total Verified Contracts'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-white font-mono">{totalContracts}</span>
                <span className="text-xs text-zinc-300">{isAr ? 'عقد مبرم' : 'contracts'}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] text-zinc-400 block font-medium">
                {isAr ? 'إجمالي قيمة المشاريع' : 'Total Projects Value'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-white font-mono">{formatPrice(totalValue, language)}</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] text-zinc-400 block font-medium">
                {isAr ? 'الجدول الزمني والدعم' : 'Delivery & Support'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-zinc-300">
                  {isAr ? 'تطوير كامل (حسب الاتفاق)' : 'Full Stack (Per Agreement)'}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Dynamic Dual-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Contracts List - 4 columns */}
          <div className="lg:col-span-4 bg-black border border-zinc-800 rounded-2xl flex flex-col overflow-hidden max-h-[80vh]">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950">
              <div className="relative">
                <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isAr ? 'بحث برقم العقد أو الشركة...' : 'Search by contract # or company...'}
                  className={`w-full ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 rounded-xl bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none text-white text-xs placeholder-zinc-500 transition-all`}
                />
              </div>
            </div>

            <div className="overflow-y-auto p-3 space-y-2 max-h-[calc(80vh-76px)]">
              {loading ? (
                <div className="text-center py-12 text-zinc-400 text-xs">
                  <RefreshCw className="w-6 h-6 text-white mx-auto mb-2 animate-spin" />
                  <span>{isAr ? 'جاري تحميل العقود الموثقة...' : 'Loading contracts...'}</span>
                </div>
              ) : filteredContracts.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl space-y-3 p-4 bg-zinc-950">
                  <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">{isAr ? 'لا توجد عقود محفوظة حالياً.' : 'No contracts found.'}</p>
                  <button
                    onClick={handleNewContract}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl cursor-pointer border border-zinc-700"
                  >
                    {isAr ? 'إنشاء عقد جديد' : 'Create New Contract'}
                  </button>
                </div>
              ) : (
                filteredContracts.map((ctr) => {
                  const isSelected = selectedContract?.contractNumber === ctr.contractNumber;
                  return (
                    <div
                      key={ctr.id || ctr.contractNumber}
                      onClick={() => {
                        setSelectedContract(ctr);
                        cosmicAudio.playPing();
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected 
                          ? 'bg-zinc-900 border-zinc-700 shadow-lg' 
                          : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-900/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-zinc-200">
                          {ctr.contractNumber}
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-200 font-bold">
                          {isAr ? 'معتمد وموثق' : 'Verified'}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                        {ctr.companyName || (isAr ? 'شركة غير محددة' : 'Unspecified Company')}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800">
                        <span className="font-mono text-zinc-300 text-xs font-bold">
                          {formatPrice(ctr.totalPriceIQD || 0, language)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteContract(ctr, e)}
                          className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 text-[11px] font-bold flex items-center gap-1 shadow-md cursor-pointer transition-transform hover:scale-105 shrink-0 z-10"
                          title={isAr ? 'حذف العقد' : 'Delete Contract'}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          <span>{isAr ? 'حذف' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detailed Contract Review - 8 columns */}
          <div className="lg:col-span-8">
            {selectedContract ? (
              <div className="bg-black border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
                <div ref={contractSummaryRef} className="space-y-6">

                {/* Visual Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
                  <div>
                    <span className="text-xs font-mono text-zinc-400 block mb-1">
                      {isAr ? 'رقم العقد المعتمد للمشروع' : 'Approved Contract Number'}
                    </span>
                    <h4 className="text-xl sm:text-2xl font-bold text-white font-mono">{selectedContract.contractNumber}</h4>
                  </div>
                  <div className="sm:text-left">
                    <span className="text-xs font-mono text-zinc-400 block mb-1">
                      {isAr ? 'تاريخ التوثيق والتسجيل' : 'Registration Date'}
                    </span>
                    <span className="text-xs sm:text-sm font-mono text-zinc-200">
                      {selectedContract.createdAt ? new Date(selectedContract.createdAt).toLocaleDateString(isAr ? 'ar-IQ' : 'en-US') : 'Today'}
                    </span>
                  </div>
                </div>

                {/* Info Blocks Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm">
                  <div className="space-y-1">
                    <span className="text-zinc-400">{isAr ? 'اسم الشركة / الطرف الثاني:' : 'Company / Client Name:'}</span>
                    <div className="font-bold text-white text-base">{selectedContract.companyName || '-'}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-400">{isAr ? 'الممثل المخول بالتوقيع:' : 'Authorized Representative:'}</span>
                    <div className="font-bold text-white text-base">{selectedContract.repName || selectedContract.clientName || '-'}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-400">{isAr ? 'البريد الإلكتروني:' : 'Official Email:'}</span>
                    <div className="font-mono text-zinc-300">{selectedContract.email || selectedContract.clientEmail || '-'}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-zinc-400">{isAr ? 'رقم الهاتف للتواصل:' : 'Phone Number:'}</span>
                    <div className="font-mono text-zinc-300">{selectedContract.phone || selectedContract.clientPhone || '-'}</div>
                  </div>
                </div>

                {/* Service Details Card */}
                <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-zinc-400 block">{isAr ? 'المواصفات / القالب المختار:' : 'Selected Template Specs:'}</span>
                      <span className="text-xs sm:text-sm text-zinc-200 font-bold">{selectedContract.templateTitle}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-zinc-300">{isAr ? 'القيمة الكلية الموثقة بالعقد:' : 'Total Contract Value:'}</span>
                    <div className="text-left">
                      <span className="text-base sm:text-xl font-bold text-white font-mono">
                        {formatPrice(selectedContract.totalPriceIQD || 0, language)}
                      </span>
                    </div>
                  </div>
                </div>
                </div>

                {/* Prominent Action Buttons - NON-OVERLAPPING */}
                <div className="pt-4 flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={(e) => handleDeleteContract(selectedContract, e)}
                    className="px-5 py-3 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-[1.02] shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>{isAr ? 'حذف هذا العقد' : 'Delete This Contract'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isGeneratingPdf}
                    onClick={async () => {
                      if (!contractSummaryRef.current || isGeneratingPdf) return;
                      setIsGeneratingPdf(true);
                      try {
                        await generateContractPDF(contractSummaryRef.current, selectedContract);
                        cosmicAudio.playPing();
                      } finally {
                        setIsGeneratingPdf(false);
                      }
                    }}
                    className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-wait text-white border border-zinc-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all hover:scale-[1.02] shrink-0"
                  >
                    <Download className="w-4 h-4 text-zinc-300" />
                    <span>{isGeneratingPdf ? (isAr ? 'جارِ التجهيز...' : 'Preparing...') : (isAr ? 'تحميل العقد PDF' : 'Download Contract PDF')}</span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="bg-black border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
                <FileCheck className="w-12 h-12 text-zinc-600 mx-auto" />
                <h4 className="text-base font-bold text-white">
                  {isAr ? 'اختر عقداً من القائمة الجانبية لمعاينته' : 'Select a contract to review details'}
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {isAr ? 'يمكنك استعراض تفاصيل المشروع، تنزيل النسخة المعتمدة، أو حذف العقد.' : 'Review project specifications, download PDF copies, or remove contract entries.'}
                </p>
              </div>
            )}
          </div>

        </div>

        {renderDeleteModal()}
      </div>
    );
  }

  // Modal Mode
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/92 animate-fadeIn">
      <div className="w-full max-w-5xl h-[85vh] bg-black border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {isAr ? 'سجل العقود والطلبات المحفوظة' : 'Saved Digital Contracts Log'}
              </h3>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Sidebar: List */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-l border-zinc-800 flex flex-col bg-zinc-950">
            <div className="p-3 border-b border-zinc-800">
              <div className="relative">
                <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-2.5 w-4 h-4 text-zinc-500`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isAr ? 'بحث في العقود...' : 'Search contracts...'}
                  className={`w-full ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 rounded-xl bg-black border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loading ? (
                <div className="text-center py-12 text-zinc-400 text-xs">
                  <RefreshCw className="w-6 h-6 text-white mx-auto mb-2 animate-spin" />
                  <span>{isAr ? 'جاري تحميل العقود الموثقة...' : 'Loading contracts...'}</span>
                </div>
              ) : filteredContracts.length === 0 ? (
                <div className="text-center py-12 bg-black rounded-2xl border border-zinc-800 space-y-3 p-4">
                  <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">{isAr ? 'لا توجد عقود محفوظة.' : 'No contracts.'}</p>
                  <button
                    onClick={handleNewContract}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg cursor-pointer border border-zinc-700"
                  >
                    {isAr ? 'إنشاء عقد جديد' : 'New Contract'}
                  </button>
                </div>
              ) : (
                filteredContracts.map((ctr) => {
                  const isSelected = selectedContract?.contractNumber === ctr.contractNumber;
                  return (
                    <div
                      key={ctr.id || ctr.contractNumber}
                      onClick={() => {
                        setSelectedContract(ctr);
                        cosmicAudio.playPing();
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                        isSelected 
                          ? 'bg-zinc-900 border-zinc-700 shadow-lg' 
                          : 'bg-black border-zinc-800 hover:bg-zinc-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-zinc-200">
                          {ctr.contractNumber}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-200 font-bold">
                          {isAr ? 'معتمد' : 'Verified'}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white line-clamp-1">
                        {ctr.companyName || (isAr ? 'شركة غير محددة' : 'Unspecified Company')}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                        <span className="font-mono text-zinc-300 text-xs font-bold">
                          {formatPrice(ctr.totalPriceIQD || 0, language)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteContract(ctr, e)}
                          className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/80 text-[11px] font-bold flex items-center gap-1 shadow-md cursor-pointer shrink-0 transition-transform hover:scale-105 z-10"
                          title={isAr ? 'حذف العقد' : 'Delete Contract'}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          <span>{isAr ? 'حذف' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Preview Panel */}
          <div className="flex-1 flex flex-col bg-black p-6 overflow-y-auto">
            {selectedContract ? (
              <div className="space-y-6 max-w-2xl mx-auto w-full">
                <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4">
                  <div ref={contractSummaryRef} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div>
                      <span className="text-xs font-mono text-zinc-400 block mb-1">
                        {isAr ? 'رقم العقد الموثق' : 'Verified Contract #'}
                      </span>
                      <h4 className="text-lg font-bold text-white font-mono">{selectedContract.contractNumber}</h4>
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-mono text-zinc-400 block mb-1">
                        {isAr ? 'تاريخ الإصدار' : 'Issue Date'}
                      </span>
                      <span className="text-xs font-mono text-zinc-200">
                        {selectedContract.createdAt ? new Date(selectedContract.createdAt).toLocaleDateString(isAr ? 'ar-IQ' : 'en-US') : 'Today'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-zinc-400">{isAr ? 'اسم الشركة / المؤسسة:' : 'Company Name:'}</span>
                      <div className="font-bold text-white text-sm">{selectedContract.companyName || '-'}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-zinc-400">{isAr ? 'الممثل المخول:' : 'Representative:'}</span>
                      <div className="font-bold text-white text-sm">{selectedContract.repName || selectedContract.clientName || '-'}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-zinc-400">{isAr ? 'البريد الإلكتروني:' : 'Email:'}</span>
                      <div className="font-mono text-zinc-300">{selectedContract.email || selectedContract.clientEmail || '-'}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-zinc-400">{isAr ? 'رقم الهاتف:' : 'Phone:'}</span>
                      <div className="font-mono text-zinc-300">{selectedContract.phone || selectedContract.clientPhone || '-'}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-black border border-zinc-800 space-y-2">
                    <span className="text-xs font-bold text-zinc-300">{isAr ? 'الباقة والمواصفات المختارة:' : 'Selected Template Package:'}</span>
                    <div className="text-xs text-zinc-200 font-bold">{selectedContract.templateTitle}</div>
                    <div className="text-xs font-mono text-white font-bold pt-1">
                      {isAr ? 'الإجمالي:' : 'Total:'} {formatPrice(selectedContract.totalPriceIQD || 0, language)}
                    </div>
                  </div>
                  </div>

                  {/* Red Delete Button & Download PDF Button */}
                  <div className="pt-4 flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteContract(selectedContract, e)}
                      className="px-5 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 text-xs font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-[1.02] shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span>{isAr ? 'حذف العقد' : 'Delete Contract'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingPdf}
                      onClick={async () => {
                        if (!contractSummaryRef.current || isGeneratingPdf) return;
                        setIsGeneratingPdf(true);
                        try {
                          await generateContractPDF(contractSummaryRef.current, selectedContract);
                          cosmicAudio.playPing();
                        } finally {
                          setIsGeneratingPdf(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-wait text-white border border-zinc-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shrink-0 transition-all hover:scale-[1.02]"
                    >
                      <Download className="w-4 h-4 text-zinc-300" />
                      <span>{isGeneratingPdf ? (isAr ? 'جارِ التجهيز...' : 'Preparing...') : (isAr ? 'تحميل العقد PDF' : 'Download Contract PDF')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 text-zinc-500">
                <FileCheck className="w-12 h-12 text-zinc-700" />
                <p className="text-xs">{isAr ? 'اختر عقداً من القائمة الجانبية لاستعراض تفاصيله.' : 'Select a contract from the sidebar.'}</p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Prominent Red Deletion Dialog */}
      {renderDeleteModal()}

    </div>
  );
};
