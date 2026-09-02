// تحرير كتالوج القوالب مباشرة من لوحة التحكم: اسم القالب، صورته، رابط عرضه، وسعره العام، بالإضافة
// إلى سعر ووصف مستقلان لكل طريقة تسليم (موقع إلكتروني / تطبيق هاتف) — قالب واحد بخيارين، لا
// قوالب متعددة. كل شيء هنا ينعكس فوراً على معرض القوالب العام وحاسبة العقد عبر Firestore، بدون
// أي نشر برمجي جديد.
import { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  Layers,
  Globe,
  Smartphone,
} from 'lucide-react';
import { Language, translateText } from '../../lib/i18n';
import { formatPrice, toUSD, Currency } from '../../lib/currency';
import { useLiveTemplates, savePricingOverride, resolveVariant } from '../../lib/pricingOverrides';
import { cosmicAudio } from '../../lib/audio';
import { showToast } from '../../lib/toast';
import { PriceInput } from '../PriceInput';
import { StatTile } from './shared';

// النص الافتراضي المعروض للزائر لكل اختيار طالما الأدمن لم يخصّص وصفاً خاصاً به — يجب أن
// يبقى مطابقاً لـ CHOICES.descAr في TemplateGrid.tsx (لا استيراد مباشر عمداً: TemplateGrid
// يجرّ معه محرّر القوالب التفاعلي بالكامل، وهذا نصّ ثابت لا يستحق ربط لوحة التحكم بحزمة الموقع
// العام لأجله). تعديله هناك يستدعي تعديله هنا أيضاً.
const DEFAULT_WEBSITE_DESC =
  'موقع احترافي يعمل على كل المتصفحات — صفحات تعريفية، حجوزات فورية، ولوحة تحكم تدير طلباتك من مكان واحد.';
const DEFAULT_APP_DESC =
  'تطبيق جوال متكامل لنظامي iOS وأندرويد — نفس الخدمات في جيب عميلك، مع إشعارات وحجز من الهاتف مباشرة.';

export function PricingTab({ isAr, language, currency }: { isAr: boolean; language: Language; currency: Currency }) {
  const templates = useLiveTemplates();

  return (
    <div className="space-y-3">
      <div className="max-w-xs">
        <StatTile icon={Layers} label={isAr ? 'إجمالي القوالب' : 'Total Templates'} value={String(templates.length)} accent="text-amber-700" />
      </div>
      <p className="text-xs text-ink/60">
        {isAr
          ? 'أي تعديل هنا ينعكس فوراً على معرض القوالب وحاسبة العقد للزوار — بدون الحاجة لأي تحديث برمجي.'
          : 'Any change here reflects immediately on the public template gallery and contract builder — no code deploy needed.'}
      </p>
      <div className="space-y-2.5">
        {templates.map((t) => (
          <PricingRow key={t.id} template={t} isAr={isAr} language={language} currency={currency} />
        ))}
      </div>
    </div>
  );
}

/** حقلا سعر ووصف لطريقة تسليم واحدة (موقع/تطبيق) — بنفس الشكل بالضبط للاثنين حتى يبقيا
 *  متماثلين بصرياً. */
function VariantFields({
  icon: Icon,
  label,
  priceIQD,
  onPriceChange,
  description,
  onDescriptionChange,
  descPlaceholder,
  isAr,
}: {
  icon: typeof Globe;
  label: string;
  priceIQD: string;
  onPriceChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  descPlaceholder: string;
  isAr: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/60 border border-ink/10 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-ink/75">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] font-extrabold">{label}</span>
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-ink/50 mb-1">{isAr ? 'السعر (د.ع)' : 'Price (IQD)'}</label>
        <PriceInput
          value={priceIQD}
          onChange={onPriceChange}
          className="w-full px-2.5 py-2 rounded-lg bg-white border border-ink/10 text-ink text-xs font-mono"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-ink/50 mb-1">{isAr ? 'الوصف الظاهر للزائر' : 'Description shown to visitors'}</label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={descPlaceholder}
          rows={3}
          className="w-full px-2.5 py-2 rounded-lg bg-white border border-ink/10 focus:border-periwinkle focus:outline-none text-ink text-[11px] leading-relaxed resize-none"
        />
      </div>
    </div>
  );
}

function PricingRow({
  template,
  isAr,
  language,
  currency,
}: {
  template: ReturnType<typeof useLiveTemplates>[number];
  isAr: boolean;
  language: Language;
  currency: Currency;
}) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(template.title);
  const [previewImage, setPreviewImage] = useState(template.previewImage);
  const [imageBroken, setImageBroken] = useState(false);
  const [demoUrl, setDemoUrl] = useState(template.demoUrl || '');
  const [sitePriceIQD, setSitePriceIQD] = useState(String(resolveVariant(template, 'website', '').priceIQD));
  const [siteDesc, setSiteDesc] = useState(resolveVariant(template, 'website', '').description);
  const [appPriceIQD, setAppPriceIQD] = useState(String(resolveVariant(template, 'app', '').priceIQD));
  const [appDesc, setAppDesc] = useState(resolveVariant(template, 'app', '').description);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setTitle(template.title);
    setPreviewImage(template.previewImage);
    setDemoUrl(template.demoUrl || '');
    setSitePriceIQD(String(resolveVariant(template, 'website', '').priceIQD));
    setSiteDesc(resolveVariant(template, 'website', '').description);
    setAppPriceIQD(String(resolveVariant(template, 'app', '').priceIQD));
    setAppDesc(resolveVariant(template, 'app', '').description);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.title, template.previewImage, template.demoUrl, template.basePriceIQD, template.variants]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const siteIQD = Number(sitePriceIQD) || 0;
      const appIQD = Number(appPriceIQD) || 0;
      await savePricingOverride(template.id, {
        title: title.trim() || template.title,
        previewImage: previewImage.trim() || template.previewImage,
        demoUrl: demoUrl.trim(),
        // مشتقّ من سعر الموقع: قيمة احتياطية واحدة تتبع سعراً حقيقياً بدل رقم ثالث يُنسى.
        basePriceIQD: siteIQD,
        basePriceUSD: toUSD(siteIQD),
        variants: {
          website: { priceIQD: siteIQD, priceUSD: toUSD(siteIQD), description: siteDesc.trim() },
          app: { priceIQD: appIQD, priceUSD: toUSD(appIQD), description: appDesc.trim() },
        },
      });
      setJustSaved(true);
      cosmicAudio.playPing();
      setTimeout(() => setJustSaved(false), 2000);
    } catch (error) {
      // Was silent before — a permissions failure (e.g. unpublished Firestore rules) looked
      // identical to a successful save: the input kept whatever the admin typed, nothing
      // told them the write never actually reached Firestore.
      const message = (error as { code?: string })?.code === 'permission-denied'
        ? (isAr ? 'تم الرفض: تحقق من نشر قواعد Firestore وصلاحيات حسابك كأدمن' : 'Permission denied — check that Firestore rules are published and your account is an admin')
        : (isAr ? 'تعذر حفظ السعر، حاول مجدداً' : 'Failed to save the price — please try again');
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-paper border border-ink/10 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-sand-light/80 transition-colors"
      >
        {template.previewImage && !imageBroken ? (
          <img
            src={template.previewImage}
            alt=""
            onError={() => setImageBroken(true)}
            className="w-12 h-12 rounded-xl object-cover border border-ink/10 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-white/70 border border-ink/10 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-ink/50" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-bold text-ink truncate">{translateText(template.title, language)}</div>
          <div className="text-[10px] text-ink/50 truncate">{translateText(template.categoryLabel, language)}</div>
        </div>
        {/* السعران كما هما في الموقع، لا رقم ثالث. الصفّ المطوي هو أسرع مكان يُقرأ منه
            التسعير، فعرضه رقماً لا يراه أي زائر كان يعني أن أسرع قراءة هي أيضاً أقلّها صدقاً. */}
        <div className="flex items-center gap-2.5 shrink-0 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-ink/80">
            <Globe className="w-3 h-3 shrink-0" aria-hidden="true" />
            {formatPrice(resolveVariant(template, 'website', '').priceIQD, language, currency)}
          </span>
          <span className="flex items-center gap-1 text-ink/80">
            <Smartphone className="w-3 h-3 shrink-0" aria-hidden="true" />
            {formatPrice(resolveVariant(template, 'app', '').priceIQD, language, currency)}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-3 border-t border-ink/10 animate-fade-in">
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-ink/60 mb-1.5">
                  {isAr ? 'اسم القالب' : 'Template Name'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/70 border border-ink/10 focus:border-periwinkle focus:outline-none text-ink text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink/60 mb-1.5">
                  {isAr ? 'رابط صورة القالب' : 'Template Image URL'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={previewImage}
                  onChange={(e) => {
                    setPreviewImage(e.target.value);
                    setImageBroken(false);
                  }}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl bg-white/70 border border-ink/10 focus:border-periwinkle focus:outline-none text-ink text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-ink/60 mb-1.5">
                  {isAr ? 'رابط الموقع الفعلي (اختياري)' : 'Live Site URL (optional)'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl bg-white/70 border border-ink/10 focus:border-periwinkle focus:outline-none text-ink text-xs font-mono"
                />
                <p className="mt-1 text-[10px] text-ink/50">
                  {isAr
                    ? 'إذا تركته فارغاً، لن يظهر زر "زيارة الموقع" في بطاقة القالب.'
                    : 'Leave empty to hide the "Visit Site" button on the template card.'}
                </p>
              </div>
            </div>
            {previewImage && !imageBroken ? (
              <img
                src={previewImage}
                alt=""
                onError={() => setImageBroken(true)}
                className="w-full sm:w-28 h-28 rounded-xl object-cover border border-ink/10"
              />
            ) : (
              <div className="w-full sm:w-28 h-28 rounded-xl bg-white/70 border border-dashed border-ink/10 flex items-center justify-center text-ink/45 text-[10px] text-center px-2">
                {isAr ? 'رابط غير صالح' : 'Invalid URL'}
              </div>
            )}
          </div>

          {/* "السعر العام" حُذف.
              كان يُوصَف بأنه "يظهر في القوائم والبطاقات قبل الاختيار" — ولم يعد لذلك وجود: كل
              بطاقة في قسم القوالب تعرض سعر اختيارها هي (سعر الموقع على بطاقة الموقع، وسعر
              التطبيق على بطاقة التطبيق)، والعقد يستلم سعر الاختيار نفسه. فكان رقماً ثالثاً لا
              يظهر لأحد ويُطلَب تعديله مع كل تغيير سعر، وأي نسيان يجعله يناقض الاثنين.

              الحقل ما زال يُكتب في قاعدة البيانات — لكن مشتقّاً من سعر الموقع لا مكتوباً
              باليد: هو القيمة الاحتياطية في resolveVariant لأي مستهلك لم يجد نسخة، وتركه
              قديماً كان يعني رجوعاً صامتاً إلى سعر مضى. */}

          {/* التسعير الفعلي الذي يدخل العقد: "الهاتف" و"الموقع الإلكتروني" برقم ووصف مستقلين
              تماماً — تعديل أحدهما لا يمسّ الآخر. */}
          <div>
            <label className="block text-[11px] font-semibold text-ink/60 mb-1.5">
              {isAr ? 'التسعير حسب طريقة التسليم' : 'Pricing by delivery method'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <VariantFields
                icon={Globe}
                label={isAr ? 'الموقع الإلكتروني' : 'Website'}
                priceIQD={sitePriceIQD}
                onPriceChange={setSitePriceIQD}
                description={siteDesc}
                onDescriptionChange={setSiteDesc}
                descPlaceholder={DEFAULT_WEBSITE_DESC}
                isAr={isAr}
              />
              <VariantFields
                icon={Smartphone}
                label={isAr ? 'تطبيق الهاتف' : 'Mobile app'}
                priceIQD={appPriceIQD}
                onPriceChange={setAppPriceIQD}
                description={appDesc}
                onDescriptionChange={setAppDesc}
                descPlaceholder={DEFAULT_APP_DESC}
                isAr={isAr}
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-white disabled:opacity-60 text-black text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all border border-white"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{justSaved ? (isAr ? 'تم الحفظ ✓' : 'Saved ✓') : isAr ? 'حفظ التغييرات' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
