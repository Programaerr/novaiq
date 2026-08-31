import { useEffect, useState } from 'react';

// A single settings document (not per-template like pricing_overrides) — there's only ever
// one set of company social accounts, so one doc keyed by a fixed ID is simpler than a
// collection of one.
const SETTINGS_DOC = 'settings/social';

// Same reasoning as OVERRIDES_CACHE_KEY in pricingOverrides.ts: without a local cache, a
// fresh page load shows no social links at all until the async Firestore listener responds,
// which reads as "links disappear on reload" even though it self-corrects a moment later.
const LINKS_CACHE_KEY = 'nuvaiq_social_links_cache';

function readCachedLinks(): SocialLinks {
  try {
    const raw = localStorage.getItem(LINKS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCachedLinks(links: SocialLinks) {
  try {
    localStorage.setItem(LINKS_CACHE_KEY, JSON.stringify(links));
  } catch {
    // Storage unavailable (private browsing, quota) — the cache just won't persist.
  }
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  /** A phone number (any format) — the wa.me link is built from it at render time, not
   *  stored, so the admin never has to know or paste the exact wa.me URL format. */
  whatsapp?: string;
}

export function subscribeToSocialLinks(callback: (links: SocialLinks) => void) {
  // Deferred Firebase load — the Footer already renders from localStorage cache first, so
  // visitors never touching Firestore don't pull the SDK into the eager home bundle.
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  import('firebase/firestore')
    .then(async ({ doc, onSnapshot }) => {
      if (cancelled) return;
      const { db } = await import('./firebase');
      if (cancelled) return;
      unsubscribe = onSnapshot(
        doc(db, SETTINGS_DOC),
        (snap) => callback((snap.data() as SocialLinks) || {}),
        // See the identical note in pricingOverrides.ts: never wipe already-loaded data on a
        // transient listener error, or a brief hiccup would flash the footer's social links
        // back to hidden until the next successful snapshot.
        (error) => console.error('social links subscription error:', error)
      );
    })
    .catch((error) => console.error('social links subscription error:', error));

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function saveSocialLinks(links: SocialLinks): Promise<void> {
  const [{ doc, setDoc }, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('./firebase'),
  ]);
  await setDoc(doc(db, SETTINGS_DOC), links, { merge: true });
}

/** The single hook every social-links consumer (currently just the Footer) should use. */
export function useSocialLinks(): SocialLinks {
  const [links, setLinks] = useState<SocialLinks>(readCachedLinks);
  useEffect(() => subscribeToSocialLinks((next) => {
    writeCachedLinks(next);
    setLinks(next);
  }), []);
  return links;
}

/** Digits only — accepts whatever format the admin typed (spaces, +, dashes) and builds a
 *  working wa.me link regardless. */
export function whatsappLink(rawNumber: string): string {
  return `https://wa.me/${rawNumber.replace(/[^\d]/g, '')}`;
}
