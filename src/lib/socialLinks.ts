import { useEffect, useState } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// A single settings document (not per-template like pricing_overrides) — there's only ever
// one set of company social accounts, so one doc keyed by a fixed ID is simpler than a
// collection of one.
const SETTINGS_DOC = 'settings/social';

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  /** A phone number (any format) — the wa.me link is built from it at render time, not
   *  stored, so the admin never has to know or paste the exact wa.me URL format. */
  whatsapp?: string;
}

export function subscribeToSocialLinks(callback: (links: SocialLinks) => void) {
  return onSnapshot(
    doc(db, SETTINGS_DOC),
    (snap) => callback((snap.data() as SocialLinks) || {}),
    () => callback({})
  );
}

export async function saveSocialLinks(links: SocialLinks): Promise<void> {
  await setDoc(doc(db, SETTINGS_DOC), links, { merge: true });
}

/** The single hook every social-links consumer (currently just the Footer) should use. */
export function useSocialLinks(): SocialLinks {
  const [links, setLinks] = useState<SocialLinks>({});
  useEffect(() => subscribeToSocialLinks(setLinks), []);
  return links;
}

/** Digits only — accepts whatever format the admin typed (spaces, +, dashes) and builds a
 *  working wa.me link regardless. */
export function whatsappLink(rawNumber: string): string {
  return `https://wa.me/${rawNumber.replace(/[^\d]/g, '')}`;
}
