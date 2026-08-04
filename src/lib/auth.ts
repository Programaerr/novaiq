import { useEffect, useState } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const googleProvider = new GoogleAuthProvider();

// Everyone — customers and the owner/partner alike — signs in through the exact same
// Google popup. There's no separate "admin sign-up": signing in here only ever grants a
// normal customer view (their own contracts). Admin access is a completely separate
// allowlist (see isAdminEmail/addAdminEmail below), checked after login — the app decides
// where to route someone once it knows who they are, not at account-creation time.
export function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function logoutAccount() {
  return signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// `undefined` while the initial auth check is in flight, `null` once resolved to "signed
// out". Any component needing "who's logged in, if anyone" (e.g. gating a page behind
// login) can use this instead of wiring its own subscribeToAuthState effect.
export function useCurrentUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => subscribeToAuthState(setUser), []);
  return user;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Mirrors every signed-in account into a client-queryable `users/{uid}` Firestore doc.
// Enumerating Firebase Auth accounts directly needs the Admin SDK (server-only, requires a
// service account key), which most local setups don't have configured yet — this mirror is
// what lets the Subscribers/Team panels list real accounts without that dependency.
// Registered once here (not inside subscribeToAuthState) so it fires exactly once per real
// auth change no matter how many components subscribe.
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  try {
    const ref = doc(db, 'users', user.uid);
    const existing = await getDoc(ref);
    await setDoc(
      ref,
      {
        email: normalizeEmail(user.email || ''),
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        lastSignInAt: new Date().toISOString(),
        ...(existing.exists() ? {} : { createdAt: new Date().toISOString() }),
      },
      { merge: true }
    );
  } catch {
    // Best-effort mirror — a failed write here must never block sign-in itself.
  }
});

// The admin allowlist: document ID is the admin's email. A document existing (its content
// doesn't matter) means that email is an admin. `get`-by-exact-ID is allowed for anyone
// signed in (so the app can check "am I an admin?"), but `list` is denied — the set of
// admin emails can't be discovered by scanning the collection. The very first admin has to
// be added once, manually, in the Firebase Console; after that, an existing admin can add
// more from the dashboard itself.
export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  try {
    const snap = await getDoc(doc(db, 'admins', normalizeEmail(email)));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function addAdminEmail(email: string): Promise<void> {
  await setDoc(doc(db, 'admins', normalizeEmail(email)), { addedAt: new Date().toISOString() });
}

export function authErrorMessage(error: unknown, isAr: boolean): string {
  const code = (error as { code?: string })?.code || '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return isAr ? 'تم إغلاق نافذة تسجيل الدخول قبل الإكمال' : 'The sign-in window was closed before finishing';
    case 'auth/popup-blocked':
      return isAr ? 'المتصفح منع النافذة المنبثقة، اسمح بها وحاول مجدداً' : 'Your browser blocked the popup — allow it and try again';
    case 'auth/too-many-requests':
      return isAr ? 'محاولات كثيرة جداً، يرجى المحاولة لاحقاً' : 'Too many attempts — please try again later';
    case 'auth/network-request-failed':
      return isAr ? 'تعذر الاتصال بالخادم، تحقق من الإنترنت' : 'Network error — check your connection';
    default:
      return isAr ? 'حدث خطأ، يرجى المحاولة مجدداً' : 'Something went wrong — please try again';
  }
}
