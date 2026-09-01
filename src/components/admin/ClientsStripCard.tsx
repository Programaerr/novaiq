// قسم "أعمالنا" في الإعدادات: تشغيله، عنوانه، سرعته، وعناصره (اسم أو شعار مرفوع).
import React, { useEffect, useRef, useState } from 'react';
import { Save, Loader2, Building2, Plus, Trash2, ImageUp, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react';
import {
  useClientsStrip,
  saveClientsStrip,
  estimateStripBytes,
  CLIENTS_DOC_BUDGET_BYTES,
  type ClientsStrip,
  type ClientItem,
} from '../../lib/clientsStrip';
import { cosmicAudio } from '../../lib/audio';
import { showToast } from '../../lib/toast';

/**
 * يُصغَّر الشعار ويُضغَط في المتصفح قبل حفظه.
 *
 * شعار يُرفع من هاتف قد يكون 4 ميغابايت و4000 بكسل عرضاً، بينما يُعرَض بارتفاع 44 بكسل. رفعه
 * كما هو يفجّر سقف مستند Firestore ويجبر كل زائر على تنزيل ميغابايتات لصورة بحجم إبهام.
 * 360 بكسل عرضاً تكفي لأعلى كثافة شاشة عند هذا الارتفاع.
 *
 * WebP أولاً مع PNG احتياطاً: WebP أصغر بكثير عند نفس الجودة، و`toDataURL` يعيد PNG صامتاً
 * لو لم يكن النوع المطلوب مدعوماً — فيُفحَص الناتج بدل افتراض نجاحه.
 */
const MAX_LOGO_WIDTH = 360;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        const scale = Math.min(1, MAX_LOGO_WIDTH / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no canvas'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const webp = canvas.toDataURL('image/webp', 0.85);
        resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

const newId = () => `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export function ClientsStripCard({ isAr }: { isAr: boolean }) {
  const saved = useClientsStrip();
  const [draft, setDraft] = useState<ClientsStrip>(saved);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [busyItem, setBusyItem] = useState<string | null>(null);
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
  const removeItem = (id: string) => patch({ items: draft.items.filter((i) => i.id !== id) });

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
      const cleaned = { ...draft, items: draft.items.filter((i) => i.name.trim() || i.logoDataUrl) };
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

        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-ink/75 flex items-center justify-between">
            <span>{isAr ? 'سرعة الحركة' : 'Motion speed'}</span>
            <span className="font-mono text-ink/50">
              {draft.speedSeconds}s {isAr ? '/ عرض شاشة' : '/ screen width'}
            </span>
          </span>
          {/* الرقم ثوانٍ لعبور عرض شاشة واحد لا للدورة كاملة: طول الدورة يتغيّر بعدد الشعارات
              وبعرض الجهاز، فلو كان الرقم للدورة لصارت السرعة المرئية مختلفة عند كل زائر ومع كل
              شعار يُضاف. بهذا المعنى تبقى السرعة كما ضبطتَها مهما تغيّر الباقي. */}
          <input
            type="range"
            min={8}
            max={120}
            step={2}
            value={draft.speedSeconds}
            onChange={(e) => patch({ speedSeconds: Number(e.target.value) })}
            className="w-full cursor-pointer"
          />
          <span className="flex justify-between text-[10px] font-bold text-ink/45">
            <span>{isAr ? 'أسرع' : 'Faster'}</span>
            <span>{isAr ? 'أبطأ' : 'Slower'}</span>
          </span>
        </label>
      </div>

      <div className="space-y-2.5">
        {draft.items.map((item, idx) => (
          <div key={item.id} className="p-3 rounded-2xl bg-paper border border-ink/10 flex items-center gap-2.5">
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

            <button
              type="button"
              onClick={() => removeItem(item.id)}
              aria-label={isAr ? 'حذف' : 'Delete'}
              className="shrink-0 w-9 h-9 grid place-items-center rounded-xl text-red-600/70 hover:text-red-600 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
