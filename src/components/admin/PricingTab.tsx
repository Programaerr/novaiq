// Live catalogue editing: per-template name, image, price and demo-link overrides that the
// public template grid picks up over Firestore without a redeploy.
import { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  Layers,
} from 'lucide-react';
import { Language, translateText } from '../../lib/i18n';
import { formatPrice, toUSD, Currency } from '../../lib/currency';
import { useLiveTemplates, savePricingOverride } from '../../lib/pricingOverrides';
import { cosmicAudio } from '../../lib/audio';
import { showToast } from '../../lib/toast';
import { PriceInput } from '../PriceInput';
import { StatTile } from './shared';

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
  const [basePriceIQD, setBasePriceIQD] = useState(String(template.basePriceIQD));
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setTitle(template.title);
    setPreviewImage(template.previewImage);
    setDemoUrl(template.demoUrl || '');
    setBasePriceIQD(String(template.basePriceIQD));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.title, template.previewImage, template.demoUrl, template.basePriceIQD]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await savePricingOverride(template.id, {
        title: title.trim() || template.title,
        previewImage: previewImage.trim() || template.previewImage,
        demoUrl: demoUrl.trim(),
        basePriceIQD: Number(basePriceIQD) || 0,
        basePriceUSD: toUSD(Number(basePriceIQD) || 0),
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
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-ink/75">{formatPrice(template.basePriceIQD, language, currency)}</span>
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

          <div>
            <label className="block text-[11px] font-semibold text-ink/60 mb-1.5">
              {isAr ? 'السعر الأساسي للقالب (د.ع)' : 'Template Base Price (IQD)'}
            </label>
            <PriceInput
              value={basePriceIQD}
              onChange={setBasePriceIQD}
              className="w-full px-3 py-2.5 rounded-xl bg-white/70 border border-ink/10 text-ink text-xs font-mono"
            />
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
