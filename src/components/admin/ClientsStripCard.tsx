// قسم "أعمالنا" في الإعدادات: تشغيله، عنوانه، سرعته، وعناصره (اسم أو شعار مرفوع).
import React, { useEffect, useRef, useState } from 'react';
import { MOTIFS, MOTIF_IDS, safeMotif, type WorkMotifId } from '../../lib/workMotifs';
import { compressLogoFile, STRIP_LOGO_MAX_WIDTH } from '../../lib/logoFile';
import { Save, Loader2, Building2, Plus, Trash2, ImageUp, ImageOff, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react';
import {
  useClientsStrip,
  saveClientsStrip,
  estimateStripBytes,
  safeUrl,
  CLIENTS_DOC_BUDGET_BYTES,
  MAX_APP_SHOTS,
  type ClientsStrip,
  type ClientItem,
  type ClientKind,
} from '../../lib/clientsStrip';
import { cosmicAudio } from '../../lib/audio';
import { showToast } from '../../lib/toast';

/* الضغط والتصغير انتقلا إلى lib/logoFile.ts حين احتاجهما العقد أيضاً — نفس الدالة، سقفان
   مختلفان للعرض حسب أين يُطبع الشعار. */
const compressImage = (file: File) => compressLogoFile(file, STRIP_LOGO_MAX_WIDTH);

const newId = () => `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const FIELD =
  'px-3 py-2 rounded-xl bg-white border border-ink/15 text-xs font-bold text-ink outline-none focus:border-ink/40';

/**
 * سطر لقطة واحدة: معاينة مصغّرة، وحقل الرابط، وزرّ حذف.
 *
 * مكوّن مستقلّ من أجل المعاينة وحدها. المعاينة `<img src>` يتبدّل مع كلّ حرف، و"https://a"
 * رابطٌ صالح في نظر المتصفّح — أي أنّ لصق عنوان طويل كان سيطلق عشرات الطلبات المهجورة في
 * أثناء الكتابة. فالرابط المعروض متأخّر 400ms عن الحقل، ولا يُطلَب إلّا ما استقرّ. والهوكات
 * لا تُستدعى داخل حلقة، فلا سبيل إلى ذلك إلّا بمكوّن.
 */
const ShotRow: React.FC<{
  value: string;
  index: number;
  isAr: boolean;
  onChange: (next: string) => void;
  onRemove: () => void;
}> = ({ value, index, isAr, onChange, onRemove }) => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setSettled(value), 400);
    return () => clearTimeout(t);
  }, [value]);

  const preview = safeUrl(settled);
  /* الفارغ ليس خطأً — هو سطر لم يُملأ بعد. الخطأ أن يُكتب شيء لا يمرّ بـ`safeUrl`، وحينها
     يُقال الآن لا بعد الحفظ: القراءة تُسقط ما لا يمرّ بصمت، فيبقى الأدمن يظنّ اللقطة محفوظة. */
  const invalid = value.trim().length > 0 && !safeUrl(value);

  return (
    <div className="flex items-center gap-2">
      <span className="w-9 h-12 shrink-0 rounded-lg bg-white border border-ink/10 grid place-items-center overflow-hidden">
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <ImageOff className="w-3.5 h-3.5 text-ink/25" />
        )}
      </span>
      <input
        dir="ltr"
        type="url"
        inputMode="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`https://… — ${isAr ? `لقطة ${index + 1}` : `screenshot ${index + 1}`}`}
        className={`flex-1 min-w-0 ${FIELD} ${invalid ? 'border-red-500/70' : ''}`}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={isAr ? `حذف اللقطة ${index + 1}` : `Remove screenshot ${index + 1}`}
        className="shrink-0 w-9 h-9 grid place-items-center rounded-xl text-red-600/70 hover:text-red-600 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export function ClientsStripCard({ isAr }: { isAr: boolean }) {
  const saved = useClientsStrip();
  const [draft, setDraft] = useState<ClientsStrip>(saved);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  /* الحذف بخطوتين: أول ضغطة تطلب التأكيد، والثانية تحذف فعلاً. شركة بشعار مرفوع تُفقَد بضغطة
     واحدة خاطئة بلا أي طريق للرجوع (الصورة نفسها ذهبت مع الحذف)، وnافذة confirm للمتصفح تقطع
     الشاشة كلها لأجل سطر واحد. */
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  /* المزامنة من Firestore تتوقف بمجرد أن يلمس الأدمن أي حقل.
   *
   * `useClientsStrip` يعيد كائناً جديداً مع كل لقطة (snapshot) — أولها من الذاكرة المحلية ثم
   * أخرى من الخادم بعدها بأجزاء من الثانية، ومثلها كلما حُفظ القسم من أي تبويب آخر. بدون هذا
   * الحارس كانت كل لقطة تعيد كتابة المسوّدة فوق ما يكتبه الأدمن الآن: يبدأ بكتابة اسم شركة،
   * تصل لقطة، فيختفي ما كتبه بلا سبب ظاهر — وهو تحديداً شكل "لا يحفظ كل شيء".
   *
   * يُرفع الحارس بعد حفظ ناجح، فتعود اللقطات مصدرَ الحقيقة من جديد. */
  const dirty = useRef(false);

  useEffect(() => {
    if (dirty.current) return;
    setDraft(saved);
  }, [saved]);

  const patch = (next: Partial<ClientsStrip>) => {
    dirty.current = true;
    setDraft((prev) => ({ ...prev, ...next }));
  };
  const patchItem = (id: string, next: Partial<ClientItem>) => {
    dirty.current = true;
    setDraft((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, ...next } : i)) }));
  };

  const addItem = () => patch({ items: [...draft.items, { id: newId(), name: '' }] });
  const removeItem = (id: string) => {
    patch({ items: draft.items.filter((i) => i.id !== id) });
    setPendingDelete(null);
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = draft.items.findIndex((i) => i.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= draft.items.length) return;
    const items = [...draft.items];
    [items[idx], items[target]] = [items[target], items[idx]];
    patch({ items });
  };

  const pickLogo = async (id: string, file: File | undefined) => {
    if (!file) return;
    setBusyItem(id);
    try {
      patchItem(id, { logoDataUrl: await compressImage(file) });
    } catch {
      showToast(isAr ? 'تعذّرت قراءة الصورة — جرّب صيغة أخرى' : 'Could not read that image — try another format', 'error');
    } finally {
      setBusyItem(null);
    }
  };

  const bytes = estimateStripBytes(draft);
  const overBudget = bytes > CLIENTS_DOC_BUDGET_BYTES;

  const handleSave = async () => {
    if (isSaving) return;
    if (overBudget) {
      // يُمنع قبل المحاولة لا بعدها: Firestore يرفض المستند كاملاً فوق ميغابايت، فتضيع كل
      // التعديلات في نداء واحد فاشل ويظن الأدمن أن الحفظ "لا يعمل".
      showToast(
        isAr ? 'حجم الشعارات كبير — احذف شعاراً أو استبدله بصورة أصغر' : 'Logos are too large — remove one or use a smaller image',
        'error'
      );
      return;
    }
    setIsSaving(true);
    try {
      /* اللقطات تُنقّى هنا لا عند القراءة وحدها.
         السطر الفارغ الذي أُضيف ولم يُملأ، والرابط الذي لا يمرّ بـ`safeUrl`، كلاهما كان
         سيُكتب ثمّ تُسقطه القراءة — أي مستندٌ فيه ما لا يُعرَض أبداً، وعدّادٌ في اللوحة يقول
         خمس لقطات والزائر يرى ثلاثاً. ويختفيان من اللوحة فور الحفظ، وقد سبق التحذير بالأحمر. */
      const cleaned = {
        ...draft,
        items: draft.items
          .filter((i) => i.name.trim() || i.logoDataUrl)
          .map((i) => {
            const shots = (i.shots || []).map(safeUrl).filter(Boolean) as string[];
            const next: ClientItem = { ...i };
            if (shots.length) next.shots = shots;
            else delete next.shots;
            return next;
          }),
      };
      await saveClientsStrip(cleaned);
      // بعد نجاح الكتابة فقط: لو فشلت، تبقى المسوّدة "متسخة" فلا تمسحها لقطة قادمة قبل أن
      // يحاول الأدمن الحفظ مجدداً.
      dirty.current = false;
      setDraft(cleaned);
      cosmicAudio.playPing();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      /* السبب يُطبع ويُذكر في الرسالة، لا "حاول مجدداً" وحدها: الفشل هنا له سببان مختلفان
         تماماً وعلاجهما مختلف — رفض من قواعد Firestore (الحساب ليس أدمن، أو القواعد لم
         تُنشَر)، أو مستند تجاوز الحد. رسالة واحدة عامة تجعل الاثنين يبدوان عطلاً مبهماً. */
      console.error('Failed to save the clients strip:', e);
      const code = (e as { code?: string })?.code || '';
      const denied = code.includes('permission-denied');
      showToast(
        denied
          ? isAr
            ? 'الحفظ مرفوض من قاعدة البيانات — تأكد أن حسابك ضمن المشرفين وأن قواعد Firestore منشورة'
            : 'The database refused the write — check that your account is an admin and the Firestore rules are published'
          : isAr
            ? `تعذر الحفظ${code ? ` (${code})` : ''}، حاول مجدداً`
            : `Could not save${code ? ` (${code})` : ''} — please try again`,
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-ink flex items-center gap-2">
          <Building2 className="w-4 h-4 text-ink/60" />
          <span>{isAr ? 'شريط «أعمالنا» — الشركات التي عملنا معها' : 'The "Our Work" client strip'}</span>
        </h3>
        <p className="text-xs text-ink/60 leading-relaxed">
          {isAr
            ? 'يظهر تحت القسم الأول في الصفحة الرئيسية كحزام متحرك. ارفع شعاراً ليظهر الشعار، أو اكتب الاسم وحده ليظهر نصاً.'
            : 'Shows under the hero on the home page as a moving belt. Upload a logo to show the logo, or type a name alone to show it as text.'}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-paper border border-ink/10 space-y-4">
        {/* مفتاح تشغيل حقيقي، لا مربّع صح: هذه ليست موافقة على شرط بل حالة تشغيل/إيقاف لقسم
            كامل يراه الزوار، والمفتاح يقول ذلك بشكله وبموضع الزرّ فيه. `role="switch"` مع
            `aria-checked` حتى يقرأه قارئ الشاشة مفتاحاً أيضاً لا مربّع اختيار. */}
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-[12px] font-bold text-ink">
              {isAr ? 'إظهار القسم للزوار' : 'Show the section to visitors'}
            </span>
            <span className="block text-[10.5px] font-bold text-ink/50 mt-0.5">
              {draft.enabled
                ? (isAr ? 'يعمل — القسم ظاهر في الصفحة الرئيسية' : 'On — the section is live on the home page')
                : (isAr ? 'متوقف — لا يظهر شيء للزوار' : 'Off — visitors see nothing')}
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={draft.enabled}
            aria-label={isAr ? 'إظهار القسم للزوار' : 'Show the section to visitors'}
            onClick={() => patch({ enabled: !draft.enabled })}
            className={`relative shrink-0 w-14 h-8 rounded-full border transition-colors cursor-pointer ${
              draft.enabled ? 'bg-ink border-ink' : 'bg-white border-ink/25'
            }`}
          >
            <span
              className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-sm transition-all ${
                draft.enabled ? 'start-auto end-1 bg-paper' : 'start-1 end-auto bg-ink/30'
              }`}
            />
          </button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-ink/75">
            {isAr ? 'النص المكتوب فوق الشريط' : 'Heading above the strip'}
          </span>
          <input
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder={isAr ? 'أعمالنا' : 'Our work'}
            className="w-full px-3 py-2.5 rounded-xl bg-white border border-ink/15 text-xs font-bold text-ink outline-none focus:border-ink/40"
          />
        </label>
      </div>

      <div className="space-y-2.5">
        {draft.items.map((item, idx) => (
          <div key={item.id} className="p-3 rounded-2xl bg-paper border border-ink/10">
            <div className="flex items-center gap-2.5">
            <span className="flex flex-col shrink-0">
              <button
                type="button"
                onClick={() => move(item.id, -1)}
                disabled={idx === 0}
                aria-label={isAr ? 'تحريك لأعلى' : 'Move up'}
                className="text-ink/40 hover:text-ink disabled:opacity-30 cursor-pointer disabled:cursor-default"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(item.id, 1)}
                disabled={idx === draft.items.length - 1}
                aria-label={isAr ? 'تحريك لأسفل' : 'Move down'}
                className="text-ink/40 hover:text-ink disabled:opacity-30 cursor-pointer disabled:cursor-default"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </span>

            <span className="w-16 h-11 shrink-0 rounded-xl bg-white border border-ink/10 grid place-items-center overflow-hidden">
              {busyItem === item.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-ink/40" />
              ) : item.logoDataUrl ? (
                <img src={item.logoDataUrl} alt="" className="max-h-9 max-w-[56px] object-contain" />
              ) : (
                <span className="text-[10px] font-bold text-ink/35">{isAr ? 'نص' : 'Text'}</span>
              )}
            </span>

            <input
              value={item.name}
              onChange={(e) => patchItem(item.id, { name: e.target.value })}
              placeholder={isAr ? 'اسم الشركة' : 'Company name'}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-ink/15 text-xs font-bold text-ink outline-none focus:border-ink/40"
            />

            <input
              ref={(el) => {
                fileInputs.current[item.id] = el;
              }}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                pickLogo(item.id, e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputs.current[item.id]?.click()}
              title={isAr ? 'رفع شعار' : 'Upload a logo'}
              className="shrink-0 w-9 h-9 grid place-items-center rounded-xl bg-white border border-ink/15 text-ink/60 hover:text-ink cursor-pointer"
            >
              <ImageUp className="w-4 h-4" />
            </button>

            {item.logoDataUrl && (
              <button
                type="button"
                onClick={() => patchItem(item.id, { logoDataUrl: undefined })}
                title={isAr ? 'إزالة الشعار وإظهار الاسم نصاً' : 'Remove the logo and show the name as text'}
                className="shrink-0 text-[10px] font-bold text-ink/50 hover:text-ink cursor-pointer"
              >
                {isAr ? 'نص' : 'Text'}
              </button>
            )}

            {pendingDelete === item.id ? (
              <span className="shrink-0 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="px-2.5 h-9 rounded-xl bg-red-600 text-white text-[11px] font-bold cursor-pointer"
                >
                  {isAr ? 'تأكيد الحذف' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  className="px-2.5 h-9 rounded-xl bg-white border border-ink/15 text-ink/70 text-[11px] font-bold cursor-pointer"
                >
                  {isAr ? 'تراجع' : 'Cancel'}
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setPendingDelete(item.id)}
                aria-label={isAr ? 'حذف' : 'Delete'}
                title={isAr ? 'حذف الشركة' : 'Delete company'}
                className="shrink-0 w-9 h-9 grid place-items-center rounded-xl text-red-600/70 hover:text-red-600 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            </div>

            {/* الرابط ورابط الصورة والوصف، وكلّها اختيارية.

                الرابط فارغاً يعني أن زر زيارة الموقع لا يظهر على بطاقة هذا العميل — لا زر
                مُعطّل ولا رابط مخمّن. وكلا الرابطين يُفحص عند القراءة (انظر safeUrl في
                clientsStrip.ts): ما ليس http أو https يُسقط، فلا تصل قيمة مثل javascript:
                إلى href أو src أبداً.

                dir="ltr" على حقلَي الرابط وحدهما: عنوان لاتيني داخل واجهة عربية يُعرَض
                مقلوب الترتيب بدونها — والأدمن يحتاج يقرأ ما لصقه. */}
            {/* نوع العمل، وهو الذي يقرّر ما يفعله زرّ البطاقة عند الزائر: الموقع يُزار في
                تبويب جديد، والتطبيق تُشاهَد لقطاته في عارض داخل الصفحة.

                قائمة لا مفتاحان، تماماً كقائمة الحركة تحتها: هذا اختيارٌ بين شيئين مسمّيين لا
                تشغيل/إيقاف، والقائمة تأتي بتنقّل الكيبورد وقارئ الشاشة جاهزَين بلا كود. */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <label className="text-[11px] font-black text-ink/70">
                {isAr ? 'نوع العمل' : 'Kind of work'}
              </label>
              <select
                value={item.kind === 'app' ? 'app' : 'site'}
                onChange={(e) => patchItem(item.id, { kind: e.target.value as ClientKind })}
                className={`${FIELD} cursor-pointer`}
              >
                <option value="site">{isAr ? 'موقع إلكتروني' : 'Website'}</option>
                <option value="app">{isAr ? 'تطبيق هاتف' : 'Mobile app'}</option>
              </select>
              <span className="text-[11px] font-bold text-ink/45">
                {item.kind === 'app'
                  ? isAr
                    ? 'الزرّ يصير «مشاهدة التطبيق» ويفتح اللقطات في الصفحة.'
                    : 'The button becomes “View app” and opens the screenshots in place.'
                  : isAr
                    ? 'الزرّ «زيارة الموقع» ويفتح الرابط في تبويب جديد.'
                    : 'The button reads “Visit site” and opens the link in a new tab.'}
              </span>
            </div>

            <div className="mt-2.5 flex flex-col sm:flex-row gap-2">
              {/* رابط الموقع لا يُعرَض للتطبيق لأنّه لا يعنيه — لكنّه لا يُمحى أيضاً: من بدّل
                  النوع ذهاباً وإياباً يجد ما كتبه كما تركه (انظر مسار الحفظ في clientsStrip.ts). */}
              {item.kind !== 'app' && (
                <input
                  dir="ltr"
                  type="url"
                  inputMode="url"
                  value={item.url || ''}
                  onChange={(e) => patchItem(item.id, { url: e.target.value })}
                  placeholder={isAr ? 'https://example.com — رابط الموقع (اختياري)' : 'https://example.com — site link (optional)'}
                  className={`sm:w-[15rem] shrink-0 ${FIELD}`}
                />
              )}
              <input
                dir="ltr"
                type="url"
                inputMode="url"
                value={item.previewImageUrl || ''}
                onChange={(e) => patchItem(item.id, { previewImageUrl: e.target.value })}
                placeholder={isAr ? 'رابط صورة (لقطة شاشة، اختياري)' : 'Screenshot image link (optional)'}
                className="sm:w-[15rem] shrink-0 px-3 py-2 rounded-xl bg-white border border-ink/15 text-xs font-bold text-ink outline-none focus:border-ink/40"
              />
              <input
                value={item.blurb || ''}
                onChange={(e) => patchItem(item.id, { blurb: e.target.value })}
                placeholder={isAr ? 'سطر عمّا أنجزناه لهذا العميل (اختياري)' : 'A line on what was built for them (optional)'}
                className={`flex-1 min-w-0 ${FIELD}`}
              />
            </div>

            {/* لقطات التطبيق.

                روابط لا رفعاً، بخلاف الشعار فوق: الشعار يُصغَّر في المتصفّح إلى عشرات
                الكيلوبايت، واللقطة الواحدة من هاتف حديث تتجاوز الميغابايت — وسقف المستند كلّه
                700KB، فأربع لقطات مرفوعة كانت ستمنع حفظ القسم كلّه لا حفظ اللقطات وحدها.
                ارفعها إلى أيّ مستضيف صور وألصق الرابط. */}
            {item.kind === 'app' && (
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-black text-ink/70">
                    {isAr ? 'لقطات التطبيق — بالترتيب الذي تُعرَض به' : 'App screenshots — in the order they appear'}
                  </label>
                  <span className="text-[10.5px] font-bold text-ink/45 font-mono">
                    {(item.shots || []).length} / {MAX_APP_SHOTS}
                  </span>
                </div>

                {(item.shots || []).map((shot, si) => (
                  <ShotRow
                    key={si}
                    value={shot}
                    index={si}
                    isAr={isAr}
                    onChange={(next) => {
                      const shots = [...(item.shots || [])];
                      shots[si] = next;
                      patchItem(item.id, { shots });
                    }}
                    onRemove={() => patchItem(item.id, { shots: (item.shots || []).filter((_, i) => i !== si) })}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => patchItem(item.id, { shots: [...(item.shots || []), ''] })}
                  disabled={(item.shots || []).length >= MAX_APP_SHOTS}
                  className="w-full py-2 rounded-xl border border-dashed border-ink/25 text-[11px] font-bold text-ink/60 hover:text-ink hover:border-ink/40 cursor-pointer disabled:opacity-40 disabled:cursor-default flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAr ? 'إضافة لقطة' : 'Add a screenshot'}
                </button>

                <p className="text-[10.5px] font-bold text-ink/45 leading-relaxed">
                  {(item.shots || []).length === 0
                    ? isAr
                      ? 'بلا لقطات، زرّ «مشاهدة التطبيق» يظهر معطّلاً — يعمل أوّل ما تُضاف واحدة.'
                      : 'With no screenshots the “View app” button shows disabled — it works as soon as one is added.'
                    : isAr
                      ? 'الروابط التي لا تبدأ بـ http أو https لا تُحفَظ — المحدَّدة بالأحمر لن تظهر.'
                      : 'Links that do not start with http or https are not saved — the ones outlined in red will not appear.'}
                </p>
              </div>
            )}

            {/* حركة الخلفية. تُختار ولا تُستنتَج من الاسم: "أكواد" خلف شركة تقول إنّها شركة
                برمجيات، و"أقمشة" تقول إنّها تبيع ملابس — وهذه أوصاف لشركات حقيقية لا زخارف،
                فمن يعرفها يختارها. والافتراضي محايد لا يقول شيئاً. */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <label className="text-[11px] font-black text-ink/70">
                {isAr ? 'حركة الخلفية' : 'Background motion'}
              </label>
              <select
                value={safeMotif(item.motif)}
                onChange={(e) => patchItem(item.id, { motif: e.target.value as WorkMotifId })}
                className="px-3 py-2 rounded-xl bg-white border border-ink/15 text-xs font-bold text-ink outline-none focus:border-ink/40 cursor-pointer"
              >
                {MOTIF_IDS.map((id) => (
                  <option key={id} value={id}>
                    {isAr ? MOTIFS[id].labelAr : MOTIFS[id].labelEn}
                  </option>
                ))}
              </select>
              <span className="text-[11px] font-bold text-ink/45">
                {safeMotif(item.motif) === 'none'
                  ? isAr
                    ? 'الصورة أعلاه هي ما يظهر خلف الشعار.'
                    : 'The image above is what shows behind the logo.'
                  : isAr
                    ? 'الحركة تحلّ محلّ صورة اللقطة — اختر "بلا حركة" لعرض الصورة.'
                    : 'Motion replaces the screenshot — pick “No motion” to show the image.'}
              </span>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="w-full py-2.5 rounded-2xl border border-dashed border-ink/25 text-xs font-bold text-ink/60 hover:text-ink hover:border-ink/40 cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {isAr ? 'إضافة شركة' : 'Add a company'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className={`text-[10.5px] font-bold ${overBudget ? 'text-red-600' : 'text-ink/45'}`}>
          {isAr ? 'حجم البيانات:' : 'Data size:'} {(bytes / 1024).toFixed(0)}KB / {(CLIENTS_DOC_BUDGET_BYTES / 1024).toFixed(0)}KB
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2.5 rounded-xl bg-ink text-paper text-xs font-bold cursor-pointer flex items-center gap-2 disabled:opacity-60"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : justSaved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {justSaved ? (isAr ? 'تم الحفظ' : 'Saved') : isAr ? 'حفظ القسم' : 'Save section'}
        </button>
      </div>
    </div>
  );
}
