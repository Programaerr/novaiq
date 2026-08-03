import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Everyone — customers and the owner/partner alike — signs up and logs in through the
// exact same form. There's no separate "admin sign-up": creating an account here only ever
// grants a normal customer view (their own contracts). Admin access is a completely
// separate allowlist (see isAdminEmail/addAdminEmail below), checked after login — the app
// decides where to route someone once it knows who they are, not at account-creation time.
export function loginAccount(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function registerAccount(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function logoutAccount() {
  return signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

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
    case 'auth/email-already-in-use':
      return isAr ? 'هذا البريد الإلكتروني مسجّل مسبقاً' : 'This email is already registered';
    case 'auth/weak-password':
      return isAr ? 'كلمة المرور ضعيفة جداً (6 أحرف على الأقل)' : 'Password is too weak (6+ characters)';
    case 'auth/invalid-email':
      return isAr ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Incorrect email or password';
    case 'auth/too-many-requests':
      return isAr ? 'محاولات كثيرة جداً، يرجى المحاولة لاحقاً' : 'Too many attempts — please try again later';
    case 'auth/network-request-failed':
      return isAr ? 'تعذر الاتصال بالخادم، تحقق من الإنترنت' : 'Network error — check your connection';
    default:
      return isAr ? 'حدث خطأ، يرجى المحاولة مجدداً' : 'Something went wrong — please try again';
  }
}
