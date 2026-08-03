import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { isTrackingAllowed } from './consent';

export interface AnalyticsEvent {
  id: string;
  event: string;
  page?: string;
  path?: string;
  createdAt?: { toDate: () => Date } | null;
}

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

// Admin-only: reads require an authenticated user (see firestore.rules) — this is a
// write-only ingestion collection for everyone else, so this call is meaningless without
// first signing in via src/lib/auth.ts.
export function subscribeToAnalyticsEvents(callback: (events: AnalyticsEvent[]) => void) {
  const q = query(collection(db, 'analytics_events'), orderBy('createdAt', 'desc'), limit(2000));
  return onSnapshot(
    q,
    (snapshot) => {
      const events: AnalyticsEvent[] = [];
      snapshot.forEach((docSnap) => {
        events.push({ id: docSnap.id, ...docSnap.data() } as AnalyticsEvent);
      });
      callback(events);
    },
    () => callback([])
  );
}
