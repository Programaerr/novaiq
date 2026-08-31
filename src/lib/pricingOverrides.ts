import { useEffect, useMemo, useState } from 'react';
import { templatesData } from '../data/templatesData';
import { Template, TemplateVariant } from '../types';

// معرّفات القوالب الثابتة (المكتوبة يدوياً في templatesData.ts) — أي مستند في
// pricing_overrides بمعرّف غير موجود هنا هو قالب أضافه الأدمن بنفسه من لوحة التحكم،
// لا تعديل على قالب قديم. نفس المجموعة (Set) تُستعمل في مكانين: بناء القوالب الجديدة
// في useLiveTemplates أدناه، وتحديد أي صف في PricingTab قابل للحذف.
export const STATIC_TEMPLATE_IDS = new Set(templatesData.map((t) => t.id));

// Template prices are authored as static data (templatesData.ts) because they rarely
// change and shouldn't need a database round trip to render the catalogue. But the admin
// dashboard needs to actually change them without a code deploy — this is that seam: an
// override, keyed by template id, stored in Firestore and merged over the static data at
// render time everywhere a price is shown or calculated.
const OVERRIDES_COLLECTION = 'pricing_overrides';

// A fresh page load has no overrides yet — the Firestore listener is async, so without a
// local cache the very first paint shows templatesData.ts's hardcoded default price, then
// snaps to the real (overridden) price a moment later once the listener responds. That
// flash reads as "reloading reverts to the old price" even though it self-corrects. Caching
// the last-known overrides means the first paint on any repeat visit already has the
// correct value, same bridge pattern already used for language/currency in this app.
const OVERRIDES_CACHE_KEY = 'novaiq_pricing_overrides_cache';

function readCachedOverrides(): Record<string, PricingOverride> {
  try {
    const raw = localStorage.getItem(OVERRIDES_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCachedOverrides(overrides: Record<string, PricingOverride>) {
  try {
    localStorage.setItem(OVERRIDES_CACHE_KEY, JSON.stringify(overrides));
  } catch {
    // Storage unavailable (private browsing, quota) — the cache just won't persist.
  }
}

/** تعديل جزئي على متغيّر تسليم واحد (موقع أو تطبيق) — أي حقل غائب يبقى على قيمته
 *  الافتراضية (سعر القالب العام / نص الاختيار الموحّد)، انظر resolveVariant. */
export interface VariantOverride {
  priceIQD?: number;
  priceUSD?: number;
  description?: string;
}

export interface PricingOverride {
  title?: string;
  previewImage?: string;
  demoUrl?: string;
  basePriceIQD?: number;
  basePriceUSD?: number;
  variants?: {
    website?: VariantOverride;
    app?: VariantOverride;
  };
  // الحقول التالية مقروءة فقط لبناء قالب جديد بالكامل (معرّف غير موجود في templatesData.ts
  // — انظر buildTemplateFromOverride) — على قالب ثابت موجود أصلاً تبقى بلا أثر لأن كل
  // حقوله الأخرى (longDescription, tags, features...) تأتي من الملف الثابت نفسه.
  categoryLabel?: string;
  description?: string;
}

export function subscribeToPricingOverrides(callback: (overrides: Record<string, PricingOverride>) => void) {
  // Firebase (and its ~120KB gzipped footprint) is deferred until this is actually called —
  // the home page already renders the live Overrided prices from the localStorage cache below,
  // so a visitor who never reaches a page that needs Firestore doesn't pay for the SDK at all.
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  import('firebase/firestore')
    .then(async ({ collection, onSnapshot }) => {
      if (cancelled) return;
      const { db } = await import('./firebase');
      if (cancelled) return;
      unsubscribe = onSnapshot(
        collection(db, OVERRIDES_COLLECTION),
        (snapshot) => {
          const result: Record<string, PricingOverride> = {};
          snapshot.forEach((docSnap) => {
            result[docSnap.id] = docSnap.data() as PricingOverride;
          });
          callback(result);
        },
        // Deliberately does NOT call callback({}) here. A transient listener error (a brief
        // network blip, the token refreshing, the listener being re-negotiated) firing *after*
        // real overrides already loaded would otherwise wipe every live price/name/link back to
        // the static defaults — exactly the "shows Saved, then reverts to the old price" bug.
        // Logged so a genuine, persistent failure (e.g. unpublished Firestore rules) is still
        // visible in the console instead of failing completely silently.
        (error) => console.error('pricing_overrides subscription error:', error)
      );
    })
    .catch((error) => console.error('pricing_overrides subscription error:', error));

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function savePricingOverride(templateId: string, override: PricingOverride): Promise<void> {
  const [{ doc, setDoc }, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('./firebase'),
  ]);
  await setDoc(doc(db, OVERRIDES_COLLECTION, templateId), override, { merge: true });
}

/** يحذف قالباً أضافه الأدمن بنفسه بالكامل. لا يُستعمل أبداً على معرّف قالب ثابت (موجود في
 *  templatesData.ts) — حذف مستند override هناك يعيده لقيمه الافتراضية فقط، لا يحذف البطاقة
 *  نفسها؛ PricingTab يُظهر زر الحذف فقط للقوالب التي ليست في STATIC_TEMPLATE_IDS أصلاً. */
export async function deleteCustomTemplate(templateId: string): Promise<void> {
  const [{ doc, deleteDoc }, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('./firebase'),
  ]);
  await deleteDoc(doc(db, OVERRIDES_COLLECTION, templateId));
}

/** معرّف صالح لقالب جديد من اسمه — حروف/أرقام لاتينية وشرطات فقط (الاسم المعروض نفسه يبقى
 *  عربياً كاملاً في title، هذا فقط مفتاح المستند)، مع لاحقة زمنية قصيرة تمنع تصادم اسمين
 *  متشابهين. */
export function slugifyTemplateId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = Date.now().toString(36).slice(-5);
  return `custom-${base || 'template'}-${suffix}`;
}

/** يحل متغيّر تسليم واحد (موقع/تطبيق) لقالب: يرجّع override الخاص به إن وُجد، وإلا يبني
 *  واحداً افتراضياً من سعر القالب العام + الوصف الموحّد المُمرَّر (نصوص CHOICES في
 *  TemplateGrid حالياً) — فكل قالب قديم يستمر يعمل بلا أي تعديل حتى يُخصَّص صراحة. */
export function resolveVariant(
  template: Template,
  kind: 'website' | 'app',
  fallbackDescription: string
): TemplateVariant {
  const v = template.variants?.[kind];
  return {
    priceIQD: v?.priceIQD ?? template.basePriceIQD,
    priceUSD: v?.priceUSD ?? template.basePriceUSD,
    description: v?.description || fallbackDescription,
  };
}

/** يبني Template كاملاً من override لمعرّف غير موجود في templatesData.ts — أي قالب أضافه
 *  الأدمن من الصفر. الحقول التي لا واجهة لها في نموذج الإضافة (tags, techStack, mockScreens...)
 *  تُملأ بقيم فارغة آمنة بدل ما تكسر أي مكان يتوقع شكل Template كاملاً.
 *  `hasInteractiveDemo: false` دائماً — المعاينة التفاعلية الحقيقية مبنية يدوياً لقالب سَكَن
 *  فقط، قالب مُضاف من نموذج إداري بسيط لا يملك واحدة، فتُخفى زر "معاينة حية" عنه في الواجهة. */
function buildTemplateFromOverride(id: string, o: PricingOverride): Template {
  const websiteDefault: TemplateVariant = {
    priceIQD: o.variants?.website?.priceIQD ?? o.basePriceIQD ?? 0,
    priceUSD: o.variants?.website?.priceUSD ?? o.basePriceUSD ?? 0,
    description: o.variants?.website?.description || o.description || '',
  };
  const appDefault: TemplateVariant = {
    priceIQD: o.variants?.app?.priceIQD ?? o.basePriceIQD ?? 0,
    priceUSD: o.variants?.app?.priceUSD ?? o.basePriceUSD ?? 0,
    description: o.variants?.app?.description || o.description || '',
  };
  return {
    id,
    title: readable(o.title, id),
    subtitle: o.categoryLabel || '',
    category: 'corporate',
    categoryLabel: o.categoryLabel || (o.title ? '' : 'قالب مخصص'),
    description: o.description || '',
    longDescription: o.description || '',
    previewImage: o.previewImage || '',
    demoUrl: o.demoUrl,
    basePriceIQD: o.basePriceIQD ?? websiteDefault.priceIQD,
    basePriceUSD: o.basePriceUSD ?? websiteDefault.priceUSD,
    deliveryWeeks: 4,
    tags: [],
    features: [],
    techStack: [],
    mockScreens: [],
    variants: { website: websiteDefault, app: appDefault },
    hasInteractiveDemo: false,
  };
}

/**
 * An Arabic letter immediately followed by a Latin-1 or punctuation character.
 *
 * That never happens in Arabic and always happens in the particular wreckage a UTF-8 string leaves
 * when it has been read back through a single-byte codepage: every letter comes apart into two
 * characters, the first of which lands in the Arabic block. It is the exact signature of the
 * corruption that went through templatesData.ts, and the titles saved into Firestore while the file
 * was broken carry it too — an admin copying a name out of the catalogue copied the damage with it.
 */
const MOJIBAKE = /[؀-ۿ][-˿ -⃿]/;

/**
 * An override string, unless it is unreadable.
 *
 * The static catalogue has been repaired; the overrides sitting on top of it have not, and an
 * override wins by design. Without this, fixing the file changes nothing anyone can see — the six
 * templates an admin has ever re-titled keep serving the broken copy forever, because nothing in
 * the system can tell that a saved value was never the value anyone meant to save.
 *
 * Narrow on purpose: it does not sanitise, normalise or transform anything. It answers one
 * question — is this string the wreckage of an encoding — and falls back to the catalogue when the
 * answer is yes. Re-saving the title from the admin panel replaces it and this stops applying.
 */
const readable = (value: string | undefined, fallback: string): string =>
  value && !MOJIBAKE.test(value) ? value : fallback;

/** Applies overrides over the static catalogue — the single merge point every consumer should use. */
export function applyPricingOverrides(
  templates: Template[],
  overrides: Record<string, PricingOverride>
): Template[] {
  if (Object.keys(overrides).length === 0) return templates;

  return templates.map((t) => {
    const o = overrides[t.id];
    if (!o) return t;
    return {
      ...t,
      title: readable(o.title, t.title),
      previewImage: o.previewImage ?? t.previewImage,
      demoUrl: o.demoUrl ?? t.demoUrl,
      basePriceIQD: o.basePriceIQD ?? t.basePriceIQD,
      basePriceUSD: o.basePriceUSD ?? t.basePriceUSD,
      // دمج جزئي مقصود: لو الأدمن عدّل سعر "الموقع" فقط، متغيّر "التطبيق" (سواء الثابت
      // الأصلي في t.variants أو undefined) يبقى كما هو بلا مسّ — كل متغيّر مستقل فعلاً.
      variants: o.variants
        ? {
            website: { ...t.variants?.website, ...o.variants.website } as TemplateVariant,
            app: { ...t.variants?.app, ...o.variants.app } as TemplateVariant,
          }
        : t.variants,
    };
  });
}

/** The single hook every template-price consumer (grid, contract builder, standalone
 *  preview) should use instead of importing templatesData directly — keeps admin price
 *  edits reflected everywhere without each component needing its own Firestore listener. */
export function useLiveTemplates(): Template[] {
  const [overrides, setOverrides] = useState<Record<string, PricingOverride>>(readCachedOverrides);

  useEffect(() => {
    return subscribeToPricingOverrides((next) => {
      writeCachedOverrides(next);
      setOverrides(next);
    });
  }, []);

  // Memoised on `overrides`, and this is load-bearing rather than a micro-optimisation.
  //
  // applyPricingOverrides returns the static array untouched while there are no overrides,
  // but the moment even one exists it maps into a brand-new array of brand-new template
  // objects — and it ran on every render, so callers received a different array identity each
  // time. ContractBuilder keeps its selected template in sync through an effect that depends
  // on this array and setStates whenever the matching entry is not reference-equal to the one
  // it holds. Against a fresh array that condition was permanently true: set state, re-render,
  // build another new array, set state again, until React gave up with "Maximum update depth
  // exceeded". The runaway loop then starved the main thread badly enough to cost the hero's
  // WebGL context ("THREE.WebGLRenderer: Context Lost").
  //
  // That is why it only started biting after prices were edited in the admin panel: with no
  // overrides saved, the early return kept the reference stable and hid the whole problem.
  return useMemo(() => applyPricingOverrides(templatesData, overrides), [overrides]);
}
