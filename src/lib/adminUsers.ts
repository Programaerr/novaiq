import { collection, getDocs, getDoc, doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface ManagedUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  lastSignInAt: string;
}

// Reads the `users` mirror (see src/lib/auth.ts) straight from Firestore — no Admin SDK /
// service account key needed. Firestore's own rules restrict `list` on this collection to
// admins only (see firestore.rules), so a regular customer can never enumerate it even by
// calling this same function.
export async function listAllUsers(): Promise<ManagedUser[]> {
  if (!auth.currentUser) throw new Error('Not signed in');
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      uid: d.id,
      email: (data.email as string) || '',
      displayName: (data.displayName as string) || '',
      photoURL: (data.photoURL as string) || '',
      createdAt: (data.createdAt as string) || '',
      lastSignInAt: (data.lastSignInAt as string) || '',
    };
  });
}

// Same source as listAllUsers(), minus anyone in the admins allowlist — the Subscribers
// panel is meant to show real customers, not the team managing them. Checks each user's own
// email individually against `admins/{email}` (a `get` by known ID, allowed for any signed-in
// user — see listTeamMembers below for why a direct `list` on that collection isn't possible).
export async function listRegularSubscribers(): Promise<ManagedUser[]> {
  const users = await listAllUsers();
  const adminFlags = await Promise.all(
    users.map((u) => (u.email ? getDoc(doc(db, 'admins', u.email.toLowerCase())) : null))
  );
  return users.filter((_, i) => !adminFlags[i]?.exists());
}

/* تعطيل حساب أو حذفه نهائياً لم يعودا هنا.
   كلاهما يتطلّب Firebase Admin SDK — مفتاح حساب خدمة لا يجوز أن يصل المتصفح أبداً — أي دالّة
   سحابية على Netlify. وتلك الدالّة كانت تُستهلك من حصّتها بطلبات لا يرسلها أحد منّا (كل مسار
   معلَن يُجَسّ من الشبكة)، بينما المهمّتان تُنفَّذان في ثوانٍ من Firebase Console وتُستعملان
   مرّة كل بضعة أشهر. فحُذفت الدالّة كلها؛ ولوحة الأعضاء تقول الآن أين تُنفَّذان بدل أن تعرض
   زرّين لا يملكان ما ينفّذهما. */

// ما يعرفه الأدمن عن هذا الشخص نفسه (لا عن عقد واحد بذاته) — يبقى معه عبر كل عقوده الحالية
// والمستقبلية، مخزّن في مجموعة `customer_notes` منفصلة تماماً عن `users` (انظر
// firestore.rules لسبب الفصل)، ومقروء/مكتوب فقط من ملف العميل الشخصي في لوحة التحكم.
//
// `phone`/`city` هنا اختياريان عمداً: القيمة المعروضة افتراضياً في الملف الشخصي تُقرأ من أحدث
// عقد لهذا الشخص (انظر CustomerProfileSheet.tsx)، وهذان الحقلان لا يُكتبان إلا إذا عدّل الأدمن
// رقم الهاتف أو المدينة بنفسه من الملف الشخصي — عندها تصبح "المعلومة الحالية المعتمَدة" بمعزل عن
// العقود، والعقود القديمة تبقى كما وُقِّعت بالضبط، سجلاً تاريخياً لا يُعاد كتابته بأثر رجعي.
export interface CustomerProfileNote {
  note: string;
  phone?: string;
  city?: string;
}

export async function getCustomerProfileNote(uid: string): Promise<CustomerProfileNote> {
  const snap = await getDoc(doc(db, 'customer_notes', uid));
  if (!snap.exists()) return { note: '' };
  const d = snap.data();
  return { note: (d.note as string) || '', phone: (d.phone as string) || undefined, city: (d.city as string) || undefined };
}

export async function saveCustomerProfileNote(uid: string, profile: CustomerProfileNote): Promise<void> {
  // كل حقل صراحة (لا `undefined`) — Firestore يرفض قيمة حقل `undefined` صراحة، وحقل فارغ
  // يعني "لا يوجد تجاوز، اعتمد على أحدث عقد" لا "احذف القيمة القديمة بصمت".
  await setDoc(doc(db, 'customer_notes', uid), {
    note: profile.note,
    phone: profile.phone || '',
    city: profile.city || '',
    updatedAt: new Date().toISOString(),
  });
}

export interface TeamMember {
  email: string;
  addedAt: string | null;
  hasAccount: boolean;
  uid: string;
  displayName: string;
  photoURL: string;
}

// Cross-references the `users` mirror against the `admins` allowlist entirely client-side.
// The `admins` collection itself can never be listed (firestore.rules denies it on purpose,
// so admin emails aren't enumerable), but any signed-in user MAY `get` a single admin doc
// by its known ID — so checking each registered user's own email individually stays inside
// that rule without needing the Admin SDK at all.
export async function listTeamMembers(): Promise<TeamMember[]> {
  const users = await listAllUsers();
  const results = await Promise.all(
    users.map(async (u): Promise<TeamMember | null> => {
      if (!u.email) return null;
      const adminSnap = await getDoc(doc(db, 'admins', u.email.toLowerCase()));
      if (!adminSnap.exists()) return null;
      const data = adminSnap.data() as Record<string, unknown>;
      return {
        email: u.email,
        addedAt: (data?.addedAt as string) || null,
        hasAccount: true,
        uid: u.uid,
        displayName: u.displayName,
        photoURL: u.photoURL,
      };
    })
  );
  return results.filter((x): x is TeamMember => x !== null);
}
