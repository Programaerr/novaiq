import { useEffect, useState } from 'react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { templatesData } from '../data/templatesData';
import { Template } from '../types';

// Template prices are authored as static data (templatesData.ts) because they rarely
// change and shouldn't need a database round trip to render the catalogue. But the admin
// dashboard needs to actually change them without a code deploy — this is that seam: an
// override, keyed by template id, stored in Firestore and merged over the static data at
// render time everywhere a price is shown or calculated.
const OVERRIDES_COLLECTION = 'pricing_overrides';

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
    () => callback({})
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
  const [overrides, setOverrides] = useState<Record<string, PricingOverride>>({});

  useEffect(() => {
    return subscribeToPricingOverrides(setOverrides);
  }, []);

  return applyPricingOverrides(templatesData, overrides);
}
