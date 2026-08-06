// Live catalogue editing: per-template name, image, price and demo-link overrides that the
// public template grid picks up over Firestore without a redeploy.
import React, { useState, useEffect } from 'react';
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
        <StatTile icon={Layers} label={isAr ? 'إجمالي القوالب' : 'Total Templates'} value={String(templates.length)} accent="text-amber-400" />
      </div>
      <p className="text-xs text-zinc-400">
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
  const [specPrices, setSpecPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(template.specificationsOptions.map((s) => [s.id, String(s.priceIQD)]))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setTitle(template.title);
    setPreviewImage(template.previewImage);
    setDemoUrl(template.demoUrl || '');
    setBasePriceIQD(String(template.basePriceIQD));
    setSpecPrices(Object.fromEntries(template.specificationsOptions.map((s) => [s.id, String(s.priceIQD)])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.title, template.previewImage, template.demoUrl, template.basePriceIQD, template.specificationsOptions.map((s) => s.priceIQD).join(',')]);

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
        specPriceIQD: Object.fromEntries(Object.entries(specPrices).map(([id, v]) => [id, Number(v) || 0])),
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
    <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-zinc-900/50 transition-colors"
      >
        {template.previewImage && !imageBroken ? (
          <img
            src={template.previewImage}
            alt=""
            onError={() => setImageBroken(true)}
            className="w-12 h-12 rounded-xl object-cover border border-zinc-800 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-zinc-500" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-bold text-white truncate">{translateText(template.title, language)}</div>
          <div className="text-[10px] text-zinc-500 truncate">{translateText(template.categoryLabel, language)}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-zinc-300">{formatPrice(template.basePriceIQD, language, currency)}</span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-3 border-t border-zinc-800 animate-fade-in">
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                  {isAr ? 'اسم القالب' : 'Template Name'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
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
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
                  {isAr ? 'رابط الموقع الفعلي (اختياري)' : 'Live Site URL (optional)'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs font-mono"
                />
                <p className="mt-1 text-[10px] text-zinc-500">
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
                className="w-full sm:w-28 h-28 rounded-xl object-cover border border-zinc-800"
              />
            ) : (
              <div className="w-full sm:w-28 h-28 rounded-xl bg-zinc-900 border border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 text-[10px] text-center px-2">
                {isAr ? 'رابط غير صالح' : 'Invalid URL'}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">
              {isAr ? 'السعر الأساسي للقالب (د.ع)' : 'Template Base Price (IQD)'}
            </label>
            <PriceInput
              value={basePriceIQD}
              onChange={setBasePriceIQD}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono"
            />
          </div>

          {template.specificationsOptions.length > 0 && (
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-zinc-400">
                {isAr ? 'أسعار الإضافات' : 'Add-on Prices'}
              </label>
              {template.specificationsOptions.map((spec) => (
                <div key={spec.id} className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-300 flex-1 truncate">{translateText(spec.label, language)}</span>
                  <PriceInput
                    value={specPrices[spec.id] ?? ''}
                    onChange={(v) => setSpecPrices((prev) => ({ ...prev, [spec.id]: v }))}
                    className="w-28 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs font-mono shrink-0"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-60 text-black text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all border border-white"
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
