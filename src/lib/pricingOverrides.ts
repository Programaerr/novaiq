import { useEffect, useMemo, useState } from 'react';
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
