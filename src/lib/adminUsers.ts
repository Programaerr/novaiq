import { supabase } from './supabase';

export interface ManagedUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  lastSignInAt: string;
}

/* يقرأ جدول `profiles` مباشرة — وهو مرآة يملؤها **مشغّل على auth.users**، لا الحساب نفسه.
   في Firestore كان كل حساب يكتب صفّه عند كل دخول (لغياب بديل بلا Admin SDK)، أي أنه كان يقدر
   يكتب بريداً أو تاريخ إنشاء غير صحيحين عن نفسه. الآن لا كتابة من المتصفح إطلاقاً، وسياسة
   RLS تقصر السرد على الأدمن. */
export async function listAllUsers(): Promise<ManagedUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, photo_url, created_at, last_sign_in_at');
  if (error) throw error;
  return ((data || []) as Record<string, unknown>[]).map((row) => ({
    uid: row.id as string,
    email: (row.email as string) || '',
    displayName: (row.display_name as string) || '',
    photoURL: (row.photo_url as string) || '',
    createdAt: (row.created_at as string) || '',
    lastSignInAt: (row.last_sign_in_at as string) || '',
  }));
}

/* المشتركون = الحسابات ناقص المشرفين. كان هذا في Firestore سؤالاً منفصلاً لكل حساب على حدة
   (N+1) لأن سرد `admins` ممنوع هناك. هنا استعلام واحد لقائمة المشرفين — والسياسة تسمح للأدمن
   بقراءتها كاملة — ثم طرحٌ في الذاكرة. */
export async function listRegularSubscribers(): Promise<ManagedUser[]> {
  const [users, { data: adminRows }] = await Promise.all([
    listAllUsers(),
    supabase.from('admins').select('email'),
  ]);
  const adminEmails = new Set(
    ((adminRows || []) as Record<string, unknown>[]).map((r) => (r.email as string).toLowerCase())
  );
  return users.filter((u) => !adminEmails.has(u.email.toLowerCase()));
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
  const { data } = await supabase
    .from('customer_notes')
    .select('note, phone, city')
    .eq('user_id', uid)
    .maybeSingle();
  if (!data) return { note: '' };
  const d = data as Record<string, unknown>;
  return {
    note: (d.note as string) || '',
    phone: (d.phone as string) || undefined,
    city: (d.city as string) || undefined,
  };
}

export async function saveCustomerProfileNote(uid: string, profile: CustomerProfileNote): Promise<void> {
  // كل حقل صراحة (لا `undefined`) — Firestore يرفض قيمة حقل `undefined` صراحة، وحقل فارغ
  // يعني "لا يوجد تجاوز، اعتمد على أحدث عقد" لا "احذف القيمة القديمة بصمت".
  const { error } = await supabase.from('customer_notes').upsert(
    {
      user_id: uid,
      note: profile.note,
      phone: profile.phone || '',
      city: profile.city || '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

export interface TeamMember {
  email: string;
  addedAt: string | null;
  hasAccount: boolean;
  uid: string;
  displayName: string;
  photoURL: string;
}

/* الفريق = تقاطع الحسابات مع قائمة المشرفين. كان هذا سؤالاً لكل حساب على حدة في Firestore،
   وصار ضمّاً في الذاكرة بعد استعلامين. */
export async function listTeamMembers(): Promise<TeamMember[]> {
  const [users, { data: adminRows }] = await Promise.all([
    listAllUsers(),
    supabase.from('admins').select('email, added_at'),
  ]);
  const admins = new Map(
    ((adminRows || []) as Record<string, unknown>[]).map((r) => [
      (r.email as string).toLowerCase(),
      (r.added_at as string) || null,
    ])
  );
  return users
    .filter((u) => admins.has(u.email.toLowerCase()))
    .map((u) => ({
      email: u.email,
      addedAt: admins.get(u.email.toLowerCase()) ?? null,
      hasAccount: true,
      uid: u.uid,
      displayName: u.displayName,
      photoURL: u.photoURL,
    }));
}
