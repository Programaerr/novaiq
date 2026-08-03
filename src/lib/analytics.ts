import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { isTrackingAllowed } from './consent';

// Anonymous, consent-gated usage logging. Nothing is written unless the visitor
// explicitly accepted the cookie/tracking banner — if they reject or haven't
// decided yet, these calls are a no-op.
export function trackEvent(eventName: string, payload: Record<string, unknown> = {}) {
  if (!isTrackingAllowed()) return;
  try {
    addDoc(collection(db, 'analytics_events'), {
      event: eventName,
      ...payload,
      path: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
      createdAt: serverTimestamp(),
    }).catch(() => {
      // Non-critical: analytics failures must never affect the user experience.
    });
  } catch {
    // ignore
  }
}

export function trackPageView(page: string) {
  trackEvent('page_view', { page });
}
