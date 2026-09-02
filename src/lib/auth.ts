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
import { trackEvent } from './analytics';

const googleProvider = new GoogleAuthProvider();

/* اختيار الحساب في كل مرة، لا الدخول الصامت بآخر حساب.
 *
 * تسجيل الخروج عندنا ينهي جلسة الموقع فقط؛ جلسة Google في المتصفح تبقى قائمة، وهي ملكها لا
 * ملكنا ولا نستطيع إنهاءها. فحين يضغط المستخدم "دخول بحساب Google" مرة أخرى، تجد Google جلسة
 * واحدة نشطة فتعيده بها فوراً بلا أن تسأله — فيبدو الأمر وكأن الموقع "لم يخرجه" أصلاً، ولا
 * سبيل له للدخول بحساب آخر.
 *
 * `prompt: 'select_account'` يجبر شاشة اختيار الحساب في كل محاولة دخول، حتى مع جلسة واحدة
 * نشطة. لا يغيّر شيئاً في بقاء الجلسة: من دخل يبقى داخلاً بعد تحديث الصفحة كما كان. */
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Everyone — customers and the owner/partner alike — signs in through the exact same
// Google popup. There's no separate "admin sign-up": signing in here only ever grants a
// normal customer view (their own contracts). Admin access is a completely separate
// allowlist (see isAdminEmail/addAdminEmail below), checked after login — the app decides
// where to route someone once it knows who they are, not at account-creation time.
export function loginWithGoogle() {
  // الحدث يُسجَّل بعد نجاح الدخول فقط، لا عند فتح النافذة: نافذة تُفتح ثم تُغلق ليست تسجيل
  // دخول، وحسابها كذلك كان سيضخّم الرقم. بلا أي بيانات عن الحساب نفسه (انظر lib/analytics.ts).
  return signInWithPopup(auth, googleProvider).then((result) => {
    trackEvent('login', { method: 'google' });
    return result;
  });
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
//
// Skipped entirely on `?live=` — the standalone template preview is a customer-facing demo
// site with no NUVAIQ account layer, and each device frame loads it in its own iframe. Left
// unguarded, simply opening a preview would restore auth state and re-write the signed-in
// admin's users/ document once per frame, for a page that never reads it.
const isLiveTemplateView =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('live');

if (!isLiveTemplateView) onAuthStateChanged(auth, async (user) => {
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

/**
 * "هل الحساب الموقّع حالياً أدمن؟" — الفحص الوحيد الذي يجوز لواجهة لوحة التحكم أن تعتمد عليه.
 *
 * لماذا دالة مستقلة بدل تمرير بريد إلى isAdminEmail:
 *  · البريد يُؤخذ من `auth.currentUser` مباشرة، أي من رمز الدخول الموقَّع من Firebase — لا من
 *    خاصية أو حالة أو تخزين محلي يقدر أحد يعدّلها. لا يوجد مدخل يمكن "حقنه" هنا أصلاً.
 *  · تتحقق من emailVerified أولاً، بنفس شرط قاعدة isAdmin() في firestore.rules، فلا تُظهر
 *    الواجهة صلاحية سترفضها القاعدة لاحقاً.
 *  · مع forceTokenRefresh تُجبر تحديث الرمز من خوادم Google: حساب عُطِّل أو حُذف أو سُحبت
 *    جلسته يفشل هنا فوراً بدل أن يبقى رمزه القديم صالحاً في المتصفح حتى ينتهي وحده. تُمرَّر
 *    في إعادة التحقق الدورية فقط، لا في الفحص الأول (انظر التعليق داخل الدالة).
 *  · أي خطأ = ليس أدمن. الفشل يُغلق الباب لا يفتحه.
 *
 * ويبقى الأهم: هذه الدالة تقرر ما يُرسَم على الشاشة فقط. الحاجز الحقيقي هو firestore.rules —
 * من يعدّل جافاسكربت في متصفحه ليجبر ظهور اللوحة يحصل على هيكل فارغ: كل قراءة عقود أو
 * حسابات أو كتابة سعر تُرفض من الخادم، لأن الخادم لا يسأل المتصفح من هو.
 */
export async function isCurrentUserAdmin(forceTokenRefresh = false): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !user.email) return false;
  try {
    /* تحديث الرمز إجبارياً رحلة شبكة كاملة إلى خوادم Google، وهي أبطأ خطوة في فتح اللوحة.
       الفحص الأول لا يحتاجها: قاعدة Firestore تتحقق من الرمز على الخادم مهما كان عمره، وأي
       رمز مسحوب يُرفض هناك لا هنا. تبقى إجبارية في إعادة التحقق الدورية (AdminPage)، حيث
       الهدف بالضبط هو التقاط حساب عُطِّل أو حُذف أثناء الجلسة. */
    if (forceTokenRefresh) await user.getIdToken(true);
    if (!user.emailVerified) return false;
    const snap = await getDoc(doc(db, 'admins', normalizeEmail(user.email)));
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
