import { createClient } from '@supabase/supabase-js';

/**
 * عميل Supabase — نقطة الاتصال الوحيدة بالقاعدة في هذا المشروع.
 *
 * ## لماذا مفتاح `anon` منشور في ملفات المتصفح، ولماذا هذا سليم
 * كل متغيّر يبدأ بـ`VITE_` يُحقَن داخل الحزمة التي ينزّلها كل زائر — ليس مخفيّاً ولا مشفّراً.
 * وهذا مقصود: مفتاح `anon` لا يمنح صلاحية بذاته، بل يهوّي الطلب فقط. **ما يحمي البيانات هو
 * سياسات RLS** (supabase/02_policies.sql)، وهي تُقيَّم على الخادم لكل صفّ.
 *
 * والنتيجة العملية: جدول واحد بلا RLS مفعّلة = قاعدة مفتوحة للعالم قراءةً وكتابةً، مهما كان
 * الكود هنا صحيحاً. ولهذا يُنفَّذ `02_policies.sql` قبل أن تدخل أي بيانات حقيقية.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/* فشل صريح عند الإقلاع، لا فشل غامض عند أول استعلام.
   بلا هذا يُبنى عميل بعنوان `undefined`، ويظهر العطل لاحقاً على شكل طلب شبكة فاشل في مكان
   بعيد عن سببه — والسبب الحقيقي (متغيّر بيئة ناقص في النشر) لا يُذكر في أي رسالة. */
if (!url || !anonKey) {
  throw new Error(
    'Supabase is not configured: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set at build time.'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    /* الجلسة تُحفظ وتُجدَّد تلقائياً: العميل يفتح حسابه بعد أيام فيجده مفتوحاً، ولا تنقطع
       جلسته في منتصف توقيع عقد لأن الرمز انتهى. */
    persistSession: true,
    autoRefreshToken: true,
    /* الدخول يتم بإعادة توجيه (لا نافذة منبثقة كما كان مع Firebase)، فالعودة تحمل الرمز في
       الرابط ويجب أن يلتقطه العميل ويمسحه من شريط العنوان. */
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

/**
 * اسم قناة لحظية فريد لكل نداء اشتراك — لا اسم ثابت مشترك بين كل المستهلكين.
 *
 * `supabase.channel('x')` يُعيد **نفس** كائن القناة لو نودي بنفس الاسم مرّتين (Supabase يبحث
 * عن قناة بهذا الموضوع في سجلّه الداخلي قبل إنشاء واحدة جديدة). فحين يستهلك أكثر من مكوّن
 * مستقلّ نفس الاسم الثابت (مثل `useLiveTemplates` المُستدعى من `App.tsx` و`TemplateGrid.tsx`
 * معاً على الصفحة نفسها)، يصطدم ثانيهما بقناة أوّلهما وهي مشترِكة فعلاً، ويرمي المتصفح:
 * "cannot add postgres_changes callbacks ... after subscribe()". كل استدعاء اشتراك مستقلّ
 * يحتاج قناته الخاصة، بصرف النظر عن تكرار الموضوع نفسه بين مستهلكين مختلفين.
 */
export function uniqueChannelName(topic: string): string {
  return `${topic}-${crypto.randomUUID()}`;
}
