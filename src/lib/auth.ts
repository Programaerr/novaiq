import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

// Single-admin login (owner-only control panel — there is no public sign-up flow). The
// admin account itself is created once, manually, in the Firebase Console under
// Authentication > Users, not through any UI in this app.
export function loginAdmin(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logoutAdmin() {
  return signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function authErrorMessage(error: unknown, isAr: boolean): string {
  const code = (error as { code?: string })?.code || '';
  switch (code) {
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
      return isAr ? 'تعذر تسجيل الدخول، يرجى المحاولة مجدداً' : 'Login failed — please try again';
  }
}
