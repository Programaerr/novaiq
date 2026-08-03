import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export function loginAdmin(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Sign-up is gated by an invite code instead of being open to anyone — this is a control
// panel with real business data (contracts, prices), not a public account system. The code
// is a Firestore document ID under admin_invites; only someone who already knows the exact
// code can read it (Firestore rules allow `get` by ID but not `list`, so the set of valid
// codes can't be discovered by scanning). The very first code has to be created once,
// manually, in the Firebase Console — after that, the owner can share it with a partner, or
// add more codes the same way, entirely without touching code again.
export async function registerAdmin(inviteCode: string, email: string, password: string) {
  const trimmedCode = inviteCode.trim();
  if (!trimmedCode) {
    throw { code: 'auth/invalid-invite' };
  }

  const inviteSnap = await getDoc(doc(db, 'admin_invites', trimmedCode));
  if (!inviteSnap.exists()) {
    throw { code: 'auth/invalid-invite' };
  }

  return createUserWithEmailAndPassword(auth, email, password);
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
    case 'auth/invalid-invite':
      return isAr ? 'رمز الدعوة غير صحيح' : 'Invalid invite code';
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
