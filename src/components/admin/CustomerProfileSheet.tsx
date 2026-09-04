// ملف العميل الشخصي: كل ما يخص شخصاً واحداً في مكان واحد — رقم هاتفه، بريده، كل عقوده، ومجموع
// ما تعاقد عليه ودفعه — بدل أن تبقى هذه المعلومات مبعثرة عقداً بعقد. رقم الهاتف والمدينة
// والملاحظة قابلة للتعديل والحفظ من هنا مباشرة (customer_notes)، منفصلة تماماً عن العقود نفسها:
// تعديلها لا يغيّر أي عقد قديم — تلك تبقى سجلاً تاريخياً لما وُقِّع عليه فعلاً بالضبط.
import { useEffect, useState } from 'react';
import { IRAQI_PHONE_LENGTH, IRAQI_PHONE_RULE, sanitizeIraqiPhone } from '../../lib/iraqiPhone';
import { createPortal } from 'react-dom';
import { X, Phone, Mail, MapPin, Calendar, FileCheck, Loader2, Save, StickyNote, Home, RefreshCw } from 'lucide-react';
import { ContractData } from '../../types';
import { Language, translateText } from '../../lib/i18n';
import { formatPrice, Currency } from '../../lib/currency';
import { sumPayments } from '../../lib/payments';
import { getCustomerProfileNote, saveCustomerProfileNote } from '../../lib/adminUsers';
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
  contracts,
  onClose,
}: CustomerProfileSheetProps) {
  // نفس منطق الملكية المستخدم في supabase/02_policies.sql وCustomerDashboard: uid أولاً، والبريد
  // احتياطاً لعقد أقدم من وجود هذا الحقل.
  const own = contracts
    .filter((c) => c.uid === uid || (!c.uid && c.email?.toLowerCase() === email.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const latest = own[0];
  const totalIQD = own.reduce((s, c) => s + (c.totalPriceIQD || 0), 0);
  const totalCollectedIQD = own.reduce((s, c) => s + (c.payments ? sumPayments(c.payments) : c.paidAmountIQD || 0), 0);

  const [note, setNote] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  /* المعلومات تُقرأ، لا تُكتب — إلا عند الطلب.
     كانت تُعرَض دائماً كحقول إدخال فارغة الشكل، فتبدو كنموذج مطلوب تعبئته بينما هي أصلاً
     معلومات كتبها العميل بنفسه في عقده ووصلتنا كاملة. الحقل يظهر الآن كقيمة مقروءة، والتعديل
     زرّ يُضغط عند الحاجة إليه فعلاً — وهي حالة نادرة (رقم تغيّر، مدينة صُحّحت). */
  const [editingInfo, setEditingInfo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProfileLoaded(false);
    getCustomerProfileNote(uid)
      .then((p) => {
        if (cancelled) return;
        setNote(p.note);
        // لا تجاوز محفوظ بعد — القيمة الافتراضية هي ما تحمله أحدث عقد لهذا الشخص، حتى تفتح
        // الحقول بقيمة حقيقية دائماً بدل أن تبدأ فارغة كل مرة لعميل لم يُعدَّل ملفه من قبل.
        setPhone(p.phone || latest?.phone || '');
        setCity(p.city || latest?.city || '');
      })
      .finally(() => {
        if (!cancelled) setProfileLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveCustomerProfileNote(uid, { note: note.trim(), phone: phone.trim(), city: city.trim() });
      showToast(isAr ? 'تم حفظ معلومات العميل' : 'Customer info saved', 'success');
    } catch {
      showToast(isAr ? 'تعذر الحفظ، حاول مجدداً' : 'Failed to save — please try again', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        /* `data-lenis-prevent` هي سبب عمل التمرير هنا أصلاً.
           الموقع يمرّر بـLenis (تمرير ناعم يعترض عجلة الفأرة على مستوى النافذة)، وبدون هذه
           العلامة تلتقط Lenis العجلة فوق هذه الورقة وتحرّك الصفحة خلفها بدلاً منها — فيبدو
           للمستخدم أن التمرير "لا يعمل" بينما هو يعمل على العنصر الخطأ. نفس العلامة موجودة
           على كل صندوق يمرّر داخلياً في الموقع (بنود العقد، معاينة الوثيقة).

           `no-scrollbar` يُخفي الشريط بلا أن يُلغي التمرير — الورقة مؤطَّرة كبطاقة، وشريط
           تمرير عبر حافتها المستديرة يكسر الشكل. */
        data-lenis-prevent
        className="w-full sm:max-w-lg max-h-[90svh] overflow-y-auto no-scrollbar overscroll-contain bg-paper rounded-t-3xl sm:rounded-3xl border border-ink/10 shadow-2xl animate-fade-in"
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
            </div>
            <span className="text-[11px] text-ink/50 font-mono truncate block" dir="ltr">{email}</span>
          </div>
          {/* زرّ "العودة للموقع" حُذف: نفس الزرّ موجود في رأس لوحة التحكم خلف هذه الورقة،
              وورقة تُفتح فوق شاشة تحمل الزرّ نفسه لا تحتاج نسخة ثانية منه — الإغلاق يكشفه. */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/70 hover:bg-sand-light border border-ink/10 text-ink/60 hover:text-ink cursor-pointer transition-colors shrink-0"
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* البريد وتاريخ الانضمام يبقيان للعرض فقط — البريد هو هوية الحساب نفسه (لا معنى
              لتعديله من هنا، وتعديله لن يغيّر حساب Google الحقيقي)، وتاريخ الانضمام حقيقة من
              Firebase Auth. الهاتف والمدينة تحتهما قابلان للتعديل والحفظ. */}
          <div className="p-3.5 rounded-2xl bg-white/70 border border-ink/10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-ink/75 min-w-0">
              <Mail className="w-3.5 h-3.5 text-ink/45 shrink-0" />
              <span className="font-mono truncate" dir="ltr">{email}</span>
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

          {/* معلومات العميل — قابلة للتعديل والحفظ من هنا مباشرة، بمعزل تام عن العقود: تعديل
              الهاتف أو المدينة هنا لا يغيّر أي عقد قديم بأثر رجعي، فقط "المعلومة الحالية
              المعتمَدة" لهذا الشخص. الملاحظة تبقى معه عبر كل عقوده الحالية والمستقبلية، بخلاف
              ملاحظة عقد واحد بذاته (adminNotes، في تبويب العقود). */}
          <div className="p-3.5 rounded-2xl bg-white/70 border border-ink/10 space-y-3">
            <span className="text-[11px] font-bold text-ink/75 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-ink/50" />
              {isAr ? 'معلومات العميل' : 'Customer info'}
            </span>
            {!profileLoaded ? (
              <div className="py-4 text-center"><Loader2 className="w-4 h-4 text-ink/50 mx-auto animate-spin" /></div>
            ) : (
              <>
                {editingInfo ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] font-semibold text-ink/75 mb-1">
                        <Phone className="w-3 h-3" />
                        {isAr ? 'رقم الهاتف' : 'Phone'}
                      </label>
                      {/* نفس قانون رقم الهاتف في كل الموقع — هذا الحقل يحمل رقم نفس العميل الذي
                          أدخله بنفسه في النموذج، فقاعدة أوسع هنا كانت تسمح لنا بأن نحفظ عنه رقماً
                          ما كان ليقدر هو أن يكتبه. */}
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(sanitizeIraqiPhone(e.target.value))}
                        inputMode="numeric"
                        maxLength={IRAQI_PHONE_LENGTH}
                        dir="ltr"
                        title={isAr ? IRAQI_PHONE_RULE.ar : IRAQI_PHONE_RULE.en}
                        placeholder={isAr ? 'مثال: 07701234567' : 'e.g. 07701234567'}
                        className="w-full px-2.5 py-2 rounded-lg bg-paper border border-ink/10 focus:border-periwinkle focus:outline-none text-ink text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] font-semibold text-ink/75 mb-1">
                        <MapPin className="w-3 h-3" />
                        {isAr ? 'المدينة' : 'City'}
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder={isAr ? 'مثال: بغداد' : 'e.g. Baghdad'}
                        className="w-full px-2.5 py-2 rounded-lg bg-paper border border-ink/10 focus:border-periwinkle focus:outline-none text-ink text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  /* القراءة هي الوضع الطبيعي: هذه معلومات وصلتنا من العميل، لا خانات ننتظر
                     أن نملأها. "—" حين لا يوجد شيء أصلاً، لا خانة فارغة توحي بأن أحداً نسي. */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-ink/75 mb-1">
                        <Phone className="w-3 h-3" />
                        {isAr ? 'رقم الهاتف' : 'Phone'}
                      </span>
                      <strong className="block text-ink text-xs font-mono" dir="ltr">{phone || '—'}</strong>
                    </div>
                    <div>
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-ink/75 mb-1">
                        <MapPin className="w-3 h-3" />
                        {isAr ? 'المدينة' : 'City'}
                      </span>
                      <strong className="block text-ink text-xs">{city || '—'}</strong>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-semibold text-ink/55 mb-1">
                    {isAr ? 'ملاحظة دائمة عن هذا العميل' : 'Ongoing note about this customer'}
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={isAr ? 'مثال: يفضّل التواصل عبر واتساب، عميل دائم...' : 'e.g. Prefers WhatsApp contact, repeat customer...'}
                    className="w-full p-2.5 rounded-xl bg-paper border border-ink/10 text-ink text-xs"
                  />
                </div>
                <div className="flex justify-end items-center gap-2">
                  {/* التعديل فعل يُطلَب، لا حالة افتراضية. */}
                  <button
                    type="button"
                    onClick={() => setEditingInfo((open) => !open)}
                    className="px-3 py-2 rounded-xl text-[11px] font-bold text-ink/75 hover:text-ink cursor-pointer transition-colors"
                  >
                    {editingInfo
                      ? (isAr ? 'إلغاء التعديل' : 'Cancel editing')
                      : (isAr ? 'تعديل الهاتف والمدينة' : 'Edit phone & city')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-white disabled:opacity-60 text-black text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all border border-white"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{isAr ? 'حفظ' : 'Save'}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* كل عقوده — الأحدث أولاً. للاطلاع فقط: التعديل يبقى في تبويب العقود، حيث تعيش
              أدوات الحالة/السعر/الدفعات الكاملة أصلاً، بدل تكرارها هنا.

              `contracts` القادمة من AdminDashboard مشتركة لحظياً بـ Firestore (subscribeToContracts)
              — أي تعديل حالة أو سعر أو دفعة يحفظه الأدمن في تبويب العقود ينعكس هنا فوراً بلا
              أي تحديث للصفحة، بما فيها وقت `آخر تحديث` تحت كل عقد. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-ink/60">
                {isAr ? `عقود هذا العميل (${own.length})` : `This customer's contracts (${own.length})`}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-ink/45">
                <RefreshCw className="w-3 h-3" />
                {isAr ? 'تحديث مباشر' : 'Live'}
              </span>
            </div>
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
                    <div className="text-[10px] text-ink/50 font-mono truncate">
                      {c.contractNumber} · {formatDate(c.createdAt, isAr)}
                      {c.updatedAt && ` · ${isAr ? 'آخر تحديث' : 'Updated'}: ${formatDate(c.updatedAt, isAr)}`}
                    </div>
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
