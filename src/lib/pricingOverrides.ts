import { useEffect, useState } from 'react';
import { templatesData } from '../data/templatesData';
import { Template } from '../types';

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

export interface PricingOverride {
  title?: string;
  previewImage?: string;
  demoUrl?: string;
  basePriceIQD?: number;
  basePriceUSD?: number;
  specPriceIQD?: Record<string, number>;
}

export function subscribeToPricingOverrides(callback: (overrides: Record<string, PricingOverride>) => void) {
  return onSnapshot(
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
}

export async function savePricingOverride(templateId: string, override: PricingOverride): Promise<void> {
  await setDoc(doc(db, OVERRIDES_COLLECTION, templateId), override, { merge: true });
}

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
      title: o.title ?? t.title,
      previewImage: o.previewImage ?? t.previewImage,
      demoUrl: o.demoUrl ?? t.demoUrl,
      basePriceIQD: o.basePriceIQD ?? t.basePriceIQD,
      basePriceUSD: o.basePriceUSD ?? t.basePriceUSD,
      specificationsOptions: t.specificationsOptions.map((spec) => ({
        ...spec,
        priceIQD: o.specPriceIQD?.[spec.id] ?? spec.priceIQD,
      })),
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

  return applyPricingOverrides(templatesData, overrides);
}
