/**
 * NUVAIQ — تعطيل حساب زبون مؤقتاً، أو حذفه نهائياً.
 *
 * كلتا العمليتين تُنفَّذان على `auth.users` نفسه (حظر أو حذف الحساب)، وهذا يحتاج مفتاح
 * service_role — لا يجوز أن يصل هذا المفتاح إلى المتصفح أبداً (يتجاوز كل سياسات RLS). فهذه
 * دالّة وسيطة تُستدعى من متصفح الأدمن مباشرة (بخلاف notify التي تناديها القاعدة وحدها):
 * تستقبل جلسة الأدمن، تتحقّق أنه أدمن فعلاً بنفس تلك الجلسة، ثم تنفّذ الطلب بمفتاح service_role
 * المحقون تلقائياً في بيئة كل دالّة — لا سرّ إضافي يُضبط لهذه الدالّة تحديداً.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/** حظر "دائم" لا يعرفه GoTrue حرفياً — ban_duration يقبل مدّة لا قيمة "إلى الأبد"، فهذه أطول
 *  مدّة عملية (~100 سنة). فكّ الحظر لاحقاً بإجراء "تفعيل" وحده، متاح في أي وقت. */
const PERMANENT_BAN = '876000h';

type Payload = { action: 'ban' | 'unban' | 'delete'; uid: string };

/** الأدمن يُستدعى من المتصفح مباشرة، فطلبه عابر للنطاقات (CORS) — بخلاف notify التي
 *  تناديها القاعدة سيرفراً لسيرفر ولا تحتاج هذا إطلاقاً. */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};

function respond(body: string, status: number) {
  return new Response(body, { status, headers: CORS_HEADERS });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return respond('ok', 200);
  if (req.method !== 'POST') return respond('method not allowed', 405);

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return respond('bad request', 400);
  }

  const { action, uid } = payload;
  if (!['ban', 'unban', 'delete'].includes(action) || !uid) {
    return respond('bad request', 400);
  }

  /* من يُسمح له: أدمن فعلي وحده، محقَّقاً بجلسته هو — لا بتخمين دور من حمولة الرمز.
     نداء `is_admin()` عبر PostgREST بنفس رمز المُنادي يجعل PostgREST يُقيّم auth.uid() كما
     يفعل تماماً مع أي طلب عادي من الواجهة، فالنتيجة تطابق سياسات RLS حرفياً بلا تكرار منطق
     في مكانين قد يختلفان يوماً. */
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!bearer) return respond('forbidden', 403);

  const adminCheck = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const isAdmin = await adminCheck.json().catch(() => false);
  if (adminCheck.status !== 200 || isAdmin !== true) {
    console.error('admin-users: نداء مرفوض — الحساب المستدعي ليس أدمناً');
    return respond('forbidden', 403);
  }

  /* حاجز أمان إضافي: هذه اللوحة مخصَّصة لحسابات الزبائن العاديين (الواجهة تستثني المشرفين
     من القائمة أصلاً)، لكن الدالّة تتحقّق بنفسها أيضاً — فلا يقدر طلب مباشر إلى هذه الدالّة
     (بلا مرور بالواجهة) تعطيل مشرف آخر أو حذف حسابه. */
  const targetRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=email`,
    { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } }
  );
  const targetRows = await targetRes.json().catch(() => []);
  const targetEmail = String(targetRows?.[0]?.email ?? '').toLowerCase();
  if (targetEmail) {
    const adminRowRes = await fetch(
      `${SUPABASE_URL}/rest/v1/admins?email=eq.${encodeURIComponent(targetEmail)}&select=email`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } }
    );
    const adminRows = await adminRowRes.json().catch(() => []);
    if (Array.isArray(adminRows) && adminRows.length > 0) {
      return respond('cannot manage an admin account here', 403);
    }
  }

  const authUrl = `${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(uid)}`;
  const gotrueHeaders = {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    'Content-Type': 'application/json',
  };

  const res =
    action === 'delete'
      ? await fetch(authUrl, { method: 'DELETE', headers: gotrueHeaders })
      : await fetch(authUrl, {
          method: 'PUT',
          headers: gotrueHeaders,
          body: JSON.stringify({ ban_duration: action === 'ban' ? PERMANENT_BAN : 'none' }),
        });

  if (!res.ok) {
    console.error('admin-users: فشل نداء GoTrue Admin', res.status, await res.text().catch(() => ''));
    return respond('operation failed', 502);
  }

  return respond('ok', 200);
});
