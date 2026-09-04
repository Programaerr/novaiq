import { useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { trackEvent } from './analytics';

/**
 * شكل الحساب كما يراه هذا التطبيق — لا كما يراه المزوّد.
 *
 * الحقول المستعملة فعلاً في الموقع كله هي `uid` و`email` لا غير. وترجمتها هنا، في مكان واحد،
 * هي ما يجعل تبديل مزوّد الهوية تعديلاً في ملف بدل تعديل في كل مكوّن: Firebase كان يسمّيه
 * `uid` وSupabase تسمّيه `id`، والاسم الذي يعرفه التطبيق يبقى واحداً.
 */
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string;
  /** حساب Google يصل موثَّقاً دائماً — وهذا ما تشترطه دالّة is_admin() في القاعدة. */
  emailVerified: boolean;
}

function toAppUser(user: SupabaseUser | null | undefined): AppUser | null {
  if (!user) return null;
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: (meta.full_name as string) || (meta.name as string) || '',
    photoURL: (meta.avatar_url as string) || (meta.picture as string) || '',
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

/* نسخة حاضرة من الجلسة، تُحدَّث من الاشتراك أدناه.
   السبب أن `getSession()` في Supabase غير متزامنة، بينما `hasActiveSession()` تُستدعى من
   مسار يحتاج جواباً فورياً (انظر تعليقها). فبدل تحويل نصف الواجهة إلى async لأجل سؤال واحد،
   تُحفظ آخر حالة معروفة هنا. */
let cachedSession: Session | null = null;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * دخول Google — **بإعادة توجيه، لا بنافذة منبثقة**.
 *
 * هذا فرق جوهري عن Firebase وله أثران في الواجهة:
 *  · الصفحة تغادر فوراً، فأي كود بعد هذا الاستدعاء لا يعمل — ولهذا يُسجَّل حدث الدخول في
 *    الاشتراك أدناه لا هنا، وإلا لما سُجّل أبداً.
 *  · لا توجد نافذة تُغلق، فلا معنى لـ"أُغلقت النافذة بلا دخول". من يتراجع عند Google يعود
 *    إلى الصفحة نفسها بلا جلسة، وهذا كل ما يظهر.
 *
 * `prompt=select_account` يبقى للسبب نفسه الذي وُضع له أصلاً: تسجيل الخروج عندنا ينهي جلسة
 * الموقع فقط، وجلسة Google في المتصفح تبقى ملكها لا ملكنا — فبدونه يُعاد المستخدم بالحساب
 * الأخير فوراً بلا سؤال، ولا سبيل له للدخول بحساب آخر.
 */
export function loginWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // العودة إلى نفس الصفحة التي انطلق منها — لا إلى الجذر، فيبقى سياقه كما تركه.
      redirectTo: window.location.href,
      queryParams: { prompt: 'select_account' },
    },
  });
}

/**
 * هل توجد جلسة قائمة الآن؟
 *
 * جواب فوري من آخر حالة معروفة، لا رحلة شبكة. تُستعمل في شاشة الدخول للتفريق بين "لم يدخل"
 * و"دخل ولم تصل الإشارة بعد" — والفرق بينهما هو الفرق بين رسالة صحيحة ورسالة تكذّب ما حدث.
 */
export function hasActiveSession(): boolean {
  return cachedSession !== null;
}

export function logoutAccount() {
  return supabase.auth.signOut();
}

export function subscribeToAuthState(callback: (user: AppUser | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    cachedSession = session;
    callback(toAppUser(session?.user));

    /* حدث الدخول يُسجَّل هنا لا في loginWithGoogle: الصفحة تغادر عند إعادة التوجيه فلا يعمل
       أي كود بعدها. و`SIGNED_IN` وحده — لا `INITIAL_SESSION` — وإلا حُسب كل فتح للموقع بجلسة
       قائمة دخولاً جديداً وتضخّم الرقم. بلا أي بيانات عن الحساب (انظر lib/analytics.ts). */
    if (event === 'SIGNED_IN') trackEvent('login', { method: 'google' });
  });

  return () => data.subscription.unsubscribe();
}

// `undefined` أثناء الفحص الأول، و`null` بعده حين لا يوجد حساب. أي مكوّن يحتاج "من الداخل
// الآن، إن وُجد" يستعملها بدل أن يبني اشتراكه بنفسه.
export function useCurrentUser(): AppUser | null | undefined {
  const [user, setUser] = useState<AppUser | null | undefined>(undefined);
  useEffect(() => subscribeToAuthState(setUser), []);
  return user;
}

/**
 * قائمة المشرفين: صفّ في جدول `admins` مفتاحه البريد. وجوده يعني أن هذا البريد أدمن.
 *
 * السياسة تسمح لأي حساب بقراءة صفّه هو فقط (أو للأدمن بقراءة الجميع)، والسرد ممنوع تماماً —
 * فلا تُكتشف عضوية القائمة بالتخمين. الأدمن الأول يُدخَل مرّة واحدة يدوياً من محرّر SQL.
 */
export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const { data, error } = await supabase
    .from('admins')
    .select('email')
    .eq('email', normalizeEmail(email))
    .maybeSingle();
  return !error && !!data;
}

/**
 * "هل الحساب الموقّع حالياً أدمن؟" — الفحص الوحيد الذي يجوز للواجهة أن تعتمد عليه.
 *
 *  · البريد يُقرأ من الجلسة الموقَّعة نفسها، لا من خاصية أو تخزين محلي يقدر أحد تعديله.
 *  · يتحقق من توثيق البريد أولاً، بنفس شرط `is_admin()` في القاعدة — فلا تُظهر الواجهة
 *    صلاحية سيرفضها الخادم بعد لحظة.
 *  · مع `forceServerCheck` تُسأل الخوادم مباشرة (`getUser`) بدل الجلسة المحفوظة: حساب حُذف أو
 *    سُحبت جلسته يفشل هنا فوراً بدل أن يبقى رمزه صالحاً في المتصفح حتى ينتهي وحده. تُمرَّر في
 *    إعادة التحقق الدورية فقط — الفحص الأول لا يحتاجها لأن القاعدة تتحقق من الرمز على أي حال.
 *  · أي خطأ = ليس أدمن. الفشل يُغلق الباب لا يفتحه.
 *
 * ويبقى الأهم: هذه الدالّة تقرّر ما يُرسَم على الشاشة فقط. الحاجز الحقيقي هو سياسات RLS —
 * من يعدّل جافاسكربت في متصفحه ليجبر ظهور اللوحة يحصل على هيكل فارغ، لأن كل قراءة وكتابة
 * تُقيَّم على الخادم الذي لا يسأل المتصفح من هو.
 */
export async function isCurrentUserAdmin(forceServerCheck = false): Promise<boolean> {
  try {
    const user = forceServerCheck
      ? (await supabase.auth.getUser()).data.user
      : cachedSession?.user ?? (await supabase.auth.getSession()).data.session?.user ?? null;

    if (!user?.email || !user.email_confirmed_at) return false;
    return await isAdminEmail(user.email);
  } catch {
    return false;
  }
}

export async function addAdminEmail(email: string): Promise<void> {
  const { error } = await supabase
    .from('admins')
    .upsert({ email: normalizeEmail(email) }, { onConflict: 'email' });
  if (error) throw error;
}

export function authErrorMessage(error: unknown, isAr: boolean): string {
  const err = error as { message?: string; status?: number } | null;
  const message = (err?.message || '').toLowerCase();
  const status = err?.status;

  /* رموز Firebase (`auth/popup-closed-by-user` وأخواتها) لم يعد لها وجود: لا نافذة منبثقة في
     تدفّق إعادة التوجيه أصلاً. والتصنيف هنا بحسب ما يمكن أن يقع فعلاً في هذا التدفّق. */
  if (status === 429 || message.includes('rate limit')) {
    return isAr ? 'محاولات كثيرة جداً، حاول بعد قليل' : 'Too many attempts — please try again shortly';
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return isAr ? 'تعذّر الاتصال بالخادم، تحقّق من الإنترنت' : 'Network error — check your connection';
  }
  if (status === 403 || message.includes('not allowed') || message.includes('redirect')) {
    // يقع حين لا يكون رابط العودة ضمن قائمة Redirect URLs في إعدادات Supabase — وهو خطأ
    // إعداد لا خطأ مستخدم، فالرسالة تقوله لمن يقرأ السجلّ بدل "حدث خطأ ما".
    return isAr
      ? 'تعذّر إكمال الدخول — إعداد روابط العودة غير مكتمل'
      : 'Sign-in could not complete — the redirect URL configuration is incomplete';
  }
  return isAr ? 'حدث خطأ، يرجى المحاولة مجدداً' : 'Something went wrong — please try again';
}
