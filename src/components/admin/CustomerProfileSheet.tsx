// ملف العميل الشخصي: كل ما يخص شخصاً واحداً في مكان واحد — رقم هاتفه، بريده، كل عقوده، ومجموع
// ما تعاقد عليه ودفعه — بدل أن تبقى هذه المعلومات مبعثرة عقداً بعقد. الملاحظات هنا مستمرة عبر كل
// عقوده (customer_notes)، بخلاف ملاحظات العقد نفسه (adminNotes) التي تبقى خاصة بعقد واحد.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, Mail, MapPin, Calendar, FileCheck, Loader2, Save, StickyNote } from 'lucide-react';
import { ContractData } from '../../types';
import { Language, translateText } from '../../lib/i18n';
import { formatPrice, Currency } from '../../lib/currency';
import { sumPayments } from '../../lib/payments';
import { getCustomerNote, saveCustomerNote } from '../../lib/adminUsers';
import { showToast } from '../../lib/toast';
import { STAGE_COLORS } from '../../lib/statusColors';
import { statusArabic } from './shared';

interface CustomerProfileSheetProps {
  isAr: boolean;
  language: Language;
  currency: Currency;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt?: string;
  lastSignInAt?: string;
  disabled?: boolean;
  /** كل العقود في الموقع — يُصفّى هنا داخلياً لعقود هذا الشخص وحده. تمريرها جاهزة (بدل
   *  استعلام Firestore جديد) لأن AdminDashboard مشترك بها أصلاً لحظياً؛ استعلام ثانٍ كان
   *  سيعني اشتراكاً حياً ثانياً على نفس البيانات لسبب واحد فقط. */
  contracts: ContractData[];
  onClose: () => void;
}

function formatDate(iso: string | undefined, isAr: boolean): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(isAr ? 'ar-IQ' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function CustomerProfileSheet({
  isAr,
  language,
  currency,
  uid,
  email,
  displayName,
  photoURL,
  createdAt,
  lastSignInAt,
  disabled,
  contracts,
  onClose,
}: CustomerProfileSheetProps) {
  // نفس منطق الملكية المستخدم في firestore.rules وCustomerDashboard: uid أولاً، والبريد
  // احتياطاً لعقد أقدم من وجود هذا الحقل.
  const own = contracts
    .filter((c) => c.uid === uid || (!c.uid && c.email?.toLowerCase() === email.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const latest = own[0];
  const totalIQD = own.reduce((s, c) => s + (c.totalPriceIQD || 0), 0);
  const totalCollectedIQD = own.reduce((s, c) => s + (c.payments ? sumPayments(c.payments) : c.paidAmountIQD || 0), 0);

  const [note, setNote] = useState('');
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCustomerNote(uid)
      .then((n) => {
        if (!cancelled) setNote(n);
      })
      .finally(() => {
        if (!cancelled) setNoteLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const handleSaveNote = async () => {
    if (isSavingNote) return;
    setIsSavingNote(true);
    try {
      await saveCustomerNote(uid, note.trim());
      showToast(isAr ? 'تم حفظ الملاحظة' : 'Note saved', 'success');
    } catch {
      showToast(isAr ? 'تعذر حفظ الملاحظة' : 'Failed to save the note', 'error');
    } finally {
      setIsSavingNote(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[90svh] overflow-y-auto bg-paper rounded-t-3xl sm:rounded-3xl border border-ink/10 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* الرأس: الصورة، الاسم، وزر الإغلاق — ثابت أعلى الورقة أثناء التمرير لبقية المحتوى. */}
        <div className="sticky top-0 bg-paper/95 backdrop-blur-xl border-b border-ink/10 p-4 flex items-center gap-3">
          <div className="w-2 h-1.5 rounded-full bg-ink/15 mx-auto absolute top-1.5 inset-x-0 sm:hidden" aria-hidden="true" />
          {photoURL ? (
            <img src={photoURL} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/70 border border-ink/10 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5 text-ink/50" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink truncate">{displayName || latest?.repName || email}</span>
              {disabled && (
                <span className="px-1.5 py-0.5 rounded bg-red-950/40 border border-red-300/60 text-red-700 text-[10px] font-bold shrink-0">
                  {isAr ? 'معطّل' : 'Disabled'}
                </span>
              )}
            </div>
            <span className="text-[11px] text-ink/50 font-mono truncate block" dir="ltr">{email}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/70 hover:bg-sand-light border border-ink/10 text-ink/60 hover:text-ink cursor-pointer transition-colors shrink-0"
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* معلومات التواصل — مأخوذة من أحدث عقد لهذا الشخص، لأن هذه الحقول (الهاتف، المدينة)
              موجودة على العقود نفسها فقط، لا على حساب المستخدم المسجَّل دخوله. */}
          <div className="p-3.5 rounded-2xl bg-white/70 border border-ink/10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-ink/75 min-w-0">
              <Phone className="w-3.5 h-3.5 text-ink/45 shrink-0" />
              <span className="font-mono truncate" dir="ltr">{latest?.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-ink/75 min-w-0">
              <Mail className="w-3.5 h-3.5 text-ink/45 shrink-0" />
              <span className="font-mono truncate" dir="ltr">{email}</span>
            </div>
            <div className="flex items-center gap-2 text-ink/75 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-ink/45 shrink-0" />
              <span className="truncate">{latest ? translateText(latest.city, language) : '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-ink/75 min-w-0">
              <Calendar className="w-3.5 h-3.5 text-ink/45 shrink-0" />
              <span className="truncate">
                {isAr ? 'انضم:' : 'Joined:'} {formatDate(createdAt, isAr)}
                {lastSignInAt && ` · ${isAr ? 'آخر دخول:' : 'Last seen:'} ${formatDate(lastSignInAt, isAr)}`}
              </span>
            </div>
          </div>

          {/* ملخص سريع: عدد العقود، مجموع القيمة، ومجموع المحصَّل — نفس الأرقام التي كانت
              تتطلب فتح كل عقد بمفرده لتُجمَع يدوياً. */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-white/70 border border-ink/10 text-center">
              <span className="text-lg font-extrabold font-mono text-ink block">{own.length}</span>
              <span className="text-[10px] text-ink/55 font-semibold">{isAr ? 'عقود' : 'Contracts'}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/70 border border-ink/10 text-center min-w-0">
              <span className="text-[13px] font-extrabold font-mono text-ink block wrap-break-word">{formatPrice(totalIQD, language, currency)}</span>
              <span className="text-[10px] text-ink/55 font-semibold">{isAr ? 'إجمالي القيمة' : 'Total value'}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/70 border border-ink/10 text-center min-w-0">
              <span className="text-[13px] font-extrabold font-mono text-emerald-700 block wrap-break-word">{formatPrice(totalCollectedIQD, language, currency)}</span>
              <span className="text-[10px] text-ink/55 font-semibold">{isAr ? 'محصَّل' : 'Collected'}</span>
            </div>
          </div>

          {/* ملاحظة دائمة عن الشخص نفسه — تبقى معه عبر كل عقوده الحالية والمستقبلية، بخلاف
              ملاحظات عقد واحد بذاته (تلك تبقى في تبويب العقود). هذا هو مكان تدوين أشياء مثل
              "يفضّل التواصل واتساب" أو "عميل دائم، يدفع دائماً بالموعد". */}
          <div className="p-3.5 rounded-2xl bg-white/70 border border-ink/10 space-y-2">
            <span className="text-[11px] font-bold text-ink/75 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-ink/50" />
              {isAr ? 'ملاحظة دائمة عن هذا العميل' : 'Ongoing note about this customer'}
            </span>
            {!noteLoaded ? (
              <div className="py-4 text-center"><Loader2 className="w-4 h-4 text-ink/50 mx-auto animate-spin" /></div>
            ) : (
              <>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={isAr ? 'مثال: يفضّل التواصل عبر واتساب، عميل دائم...' : 'e.g. Prefers WhatsApp contact, repeat customer...'}
                  className="w-full p-2.5 rounded-xl bg-paper border border-ink/10 text-ink text-xs"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNote}
                    disabled={isSavingNote}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-white disabled:opacity-60 text-black text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all border border-white"
                  >
                    {isSavingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{isAr ? 'حفظ الملاحظة' : 'Save note'}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* كل عقوده — الأحدث أولاً. للاطلاع فقط: التعديل يبقى في تبويب العقود، حيث تعيش
              أدوات الحالة/السعر/الدفعات الكاملة أصلاً، بدل تكرارها هنا. */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-ink/60 block">
              {isAr ? `عقود هذا العميل (${own.length})` : `This customer's contracts (${own.length})`}
            </span>
            {own.length === 0 ? (
              <p className="py-6 text-center text-ink/45 text-xs border border-dashed border-ink/10 rounded-2xl">
                {isAr ? 'لا يوجد عقود مرتبطة بهذا الحساب بعد.' : 'No contracts linked to this account yet.'}
              </p>
            ) : (
              own.map((c) => (
                <div
                  key={c.id || c.contractNumber}
                  className="p-3 rounded-2xl bg-white/70 border border-ink/10 flex items-center justify-between gap-3"
                  style={{ borderInlineStartWidth: '3px', borderInlineStartColor: STAGE_COLORS[c.status].fill }}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-ink truncate">{translateText(c.templateTitle, language)}</div>
                    <div className="text-[10px] text-ink/50 font-mono truncate">{c.contractNumber} · {formatDate(c.createdAt, isAr)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-ink/75">{formatPrice(c.totalPriceIQD || 0, language, currency)}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STAGE_COLORS[c.status].badge}`}>
                      {translateText(statusArabic(c.status), language)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
