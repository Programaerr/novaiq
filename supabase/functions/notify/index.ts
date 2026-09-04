/**
 * NUVAIQ — إشعارات العمل الداخلي على تيليجرام.
 *
 * تُستدعى من القاعدة نفسها لا من المتصفح: مشغّل على الجدول يطلقها بعد أن يُكتب الصفّ فعلاً
 * (انظر supabase/03_notifications.sql). وهذا الفرق ليس تفصيلاً:
 *
 *  · لا شيء يضيع. لو أغلق الزبون التبويب بعد الحفظ مباشرة، الصفّ مكتوب والإشعار انطلق.
 *  · لا أحد يقدر تزوير إشعار. المتصفح لا يملك عنوان هذه الدالّة ولا سرّها.
 *  · يقع بعد مرور الصفّ من كل سياسات RLS والقيود — فما يصلك إشعارٌ عنه موجود فعلاً.
 *
 * ## بوتان منفصلان لا بوت واحد بمواضيع
 * جُرِّب نظام "Forum Topic" لكل عقد وتعثّر بإعداد تيليجرام نفسه (has_topics_enabled يرفض
 * التفعيل رغم كل صلاحيات المجموعة). فبدل ملاحقة إعداد خارج يدنا، بوتان بسيطان بلا أي شرط
 * على نوع المحادثة:
 *
 *  · **بوت العقود** — رسالة واحدة كاملة التفاصيل إلى محادثة العمل (مجموعة عادية أو خاصة، لا
 *    يهم نوعها إطلاقاً).
 *  · **بوت المشتركين** — إلى محادثات الأدمن الخاصة فقط، كما كان بالضبط.
 */

/** الوجهة واحدة لكلا البوتين: أنت وشريكك، بمعرّفَي محادثتيكما الخاصّتين (أرقام موجبة)
 *  مفصولةً بفاصلة. سرّ واحد لا اثنان — البوتان مختلفان (توكنان)، لكنهما يراسلان نفس
 *  الشخصين، فلا داعي لضبط نفس القائمة مرّتين باسمين مختلفين. */
const ADMIN_CHAT_IDS = (Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

/** بوت العقود: يرسل تفاصيل كل عقد جديد. */
const CONTRACT_BOT_TOKEN = Deno.env.get('TELEGRAM_CONTRACT_BOT_TOKEN') ?? '';

/** بوت المشتركين: يرسل تنبيه كل مشترك جديد. */
const SUBSCRIBER_BOT_TOKEN = Deno.env.get('TELEGRAM_SUBSCRIBER_BOT_TOKEN') ?? '';

/** رابط لوحة العقود، لفتح العقد مباشرة من الرسالة بلا بحث. */
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://nuvaiq.com';

type Payload = { type: 'new_contract' | 'new_subscriber'; record: Record<string, unknown> };

/**
 * يقرأ دعوى `role` من حمولة الرمز — بلا تحقّق من التوقيع، لأن التحقّق ليس مهمّة هذه الدالّة:
 * تكفّلت به المنصّة قبل أن يصل الطلب أصلاً (إعداد Verify JWT مُفعَّل).
 *
 * ولماذا لا نقارن الرمز حرفاً بحرف بـ`SUPABASE_SERVICE_ROLE_KEY`: قيمة ذلك المتغيّر تُحقَن في
 * الدالّة لحظة نشرها وتتجمّد عندها. فلو دُوِّر المفتاح — أو نُسخ إلى Vault مفتاحٌ أحدث من آخر
 * نشرة — صار عندك مفتاحان صحيحان لا يتطابقان نصّاً، فتُرفض نداءات القاعدة كلها بـ403 وهي تحمل
 * صلاحية كاملة. الدور لا يشيخ، والنصّ يشيخ.
 */
function jwtRole(token: string): string {
  try {
    const part = token.split('.')[1];
    if (!part) return '';
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    return String(claims?.role ?? '');
  } catch {
    return '';
  }
}

const api = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`;

/** HTML الذي يقبله تيليجرام محدود جداً، وأي `<` غير مهروب يُفشل الرسالة كلها. */
const esc = (v: unknown) =>
  String(v ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function tg(token: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(api(token, method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!json?.ok) throw new Error(`telegram ${method} failed: ${JSON.stringify(json)}`);
  return json.result;
}

const line = (label: string, value: unknown) => `<b>${esc(label)}:</b> ${esc(value)}`;

const projectTypeAr = (t: unknown) =>
  t === 'app' ? 'تطبيق هاتف' : t === 'website' ? 'موقع إلكتروني' : '—';

const planAr = (p: unknown) =>
  p === '100_upfront' ? 'دفعة واحدة عند التوقيع'
  : p === '3_milestones' ? '3 دفعات مرتبطة بالمراحل'
  : '50% عند التوقيع و50% عند التسليم';

/** كل ما يلزم لمعرفة العقد بلا فتح اللوحة، وفي آخره رابط لفتحه فعلاً عند الحاجة لمراجعة PDF. */
function contractBody(r: Record<string, unknown>) {
  const signed = String(r.status) !== 'draft';
  const priced = Number(r.total_price_iqd ?? 0) > 0;
  const colors = [r.primary_color, r.second_color, r.third_color].filter(Boolean).join(' · ');

  const parts = [
    signed ? '🟢 <b>عقد جديد — موقَّع من العميل</b>' : '🟡 <b>عقد جديد — بانتظار توقيع الزبون</b>',
    '',
    line('رقم العقد', r.contract_number),
    line('الشركة', r.company_name),
    line('المخوَّل بالتوقيع', r.rep_name),
    line('الهاتف', r.phone),
    line('البريد', r.email),
    line('المدينة', r.city),
    '',
    line('المشروع', r.template_title),
    line('النوع', projectTypeAr(r.project_type)),
    line('السعر', priced ? `${Number(r.total_price_iqd).toLocaleString('en-US')} د.ع` : 'يُتفق عليه'),
    line('آلية السداد', planAr(r.payment_plan)),
    line('مدّة التنفيذ', r.delivery_timeline_text || (Number(r.delivery_timeline_weeks) || '—')),
    line('السجل التجاري', r.cr_number || '—'),
  ];

  if (colors) parts.push(line('ألوان الهوية', colors));

  const notes = String(r.custom_features_text ?? '').trim();
  if (notes) parts.push('', '<b>ما طلبه الزبون:</b>', esc(notes));

  /* لا نولّد PDF هنا: هذه دالّة Deno بلا متصفح ولا Canvas، والعقد يُرسم فعلياً بـ html2canvas
     من المتصفح وحده. فبدل ملف مرفق، رابط للوحة العقود — يفتحها الأدمن ويبحث برقم العقد أعلاه
     ليطّلع على تفاصيله ويولّد PDF منه كما يعمل الآن تماماً. */
  parts.push('', `🔗 <a href="${esc(SITE_URL)}/?page=orders">فتح لوحة العقود</a>`);

  return parts.join('\n');
}

function subscriberBody(r: Record<string, unknown>) {
  return [
    '👤 <b>مشترك جديد</b>',
    '',
    line('البريد', r.email),
    line('الاسم', r.display_name || '—'),
  ].join('\n');
}

Deno.serve(async (req) => {
  /* من يُسمح له بمناداة هذه الدالّة: القاعدة وحدها.
   *
   * عنوان الدالّة ليس سرّاً — مُعرِّف المشروع مكتوب في حزمة الموقع التي ينزّلها كل زائر،
   * والمسار مُخمَّن. فبلا فحص هنا يقدر أي شخص إغراق محادثتنا برسائل عن عقود لا وجود لها.
   *
   * والحراسة طبقتان، كلٌّ تسدّ ما تتركه الأخرى:
   *  · **المنصّة** تتحقّق من توقيع الرمز (Verify JWT مُفعَّل) — فلا يمرّ رمز مُلفَّق.
   *  · **هنا** نتحقّق من الدور — لأن Verify JWT وحده يقبل **أي** رمز صادر عن المشروع، ومنه
   *    مفتاح `anon` المنشور للعالم في حزمة الموقع نفسها. والدور `service_role` لا يحمله إلا
   *    من يكتب في القاعدة، وهو ما ترسله pg_net.
   *
   * وإن ظهر 401 بدل 403 فالمعنى مختلف تماماً: التوقيع لم يُقبل — أي أن ما في Vault مفتاحٌ من
   * سرّ JWT آخر (بعد تدوير مثلاً)، وعلاجه نسخ مفتاح service_role الحالي إلى Vault. */
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const role = jwtRole(bearer);
  if (role !== 'service_role') {
    console.error('notify: نداء مرفوض — الدور:', role || '(بلا رمز صالح)');
    return new Response('forbidden', { status: 403 });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }

  const r = payload.record || {};

  try {
    if (payload.type === 'new_contract') {
      if (!CONTRACT_BOT_TOKEN || !ADMIN_CHAT_IDS.length) {
        console.error('notify: missing TELEGRAM_CONTRACT_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID');
        return new Response('not configured', { status: 500 });
      }

      // كل مُستلِم على حدة، وفشلُ أحدهم (لم يضغط Start بعد مثلاً) لا يمنع وصولها للباقين.
      const text = contractBody(r);
      const results = await Promise.allSettled(
        ADMIN_CHAT_IDS.map((chat_id) =>
          tg(CONTRACT_BOT_TOKEN, 'sendMessage', {
            chat_id,
            parse_mode: 'HTML',
            text,
            link_preview_options: { is_disabled: true },
          })
        )
      );

      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.error(`notify: تعذّر إبلاغ ${ADMIN_CHAT_IDS[i]} بالعقد —`, result.reason);
        }
      });

      if (results.every((result) => result.status === 'rejected')) {
        throw new Error('contract notice reached nobody');
      }
    } else if (payload.type === 'new_subscriber') {
      if (!SUBSCRIBER_BOT_TOKEN) {
        console.error('notify: missing TELEGRAM_SUBSCRIBER_BOT_TOKEN');
        return new Response('not configured', { status: 500 });
      }
      if (!ADMIN_CHAT_IDS.length) {
        // لا وجهة مضبوطة: نتوقف بصمت بدل الرمي — إعداد ناقص لا يجوز أن يعطّل حفظ الحساب.
        console.warn('notify: TELEGRAM_ADMIN_CHAT_ID غير مضبوط — تم تجاوز تنبيه المشترك');
        return new Response('ok');
      }

      /* كل مُستلِم على حدة، وفشلُ أحدهم لا يمنع الباقين.
         الحالة الواقعية: شريك لم يضغط Start على البوت بعد — تيليجرام يرفض مراسلته وحده
         ("chat not found")، ولو كانت الإرسالة واحدة لسقط التنبيه عن الجميع بسببه. */
      const results = await Promise.allSettled(
        ADMIN_CHAT_IDS.map((chat_id) =>
          tg(SUBSCRIBER_BOT_TOKEN, 'sendMessage', {
            chat_id,
            parse_mode: 'HTML',
            text: subscriberBody(r),
            link_preview_options: { is_disabled: true },
          })
        )
      );

      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.error(`notify: تعذّر إبلاغ ${ADMIN_CHAT_IDS[i]} —`, result.reason);
        }
      });

      // يفشل الطلب فقط إن لم يصل أحداً إطلاقاً. وصولُه إلى واحد وصولٌ.
      if (results.every((result) => result.status === 'rejected')) {
        throw new Error('subscriber notice reached nobody');
      }
    } else {
      return new Response('unknown type', { status: 400 });
    }
  } catch (error) {
    console.error('notify failed:', error);
    return new Response('send failed', { status: 502 });
  }

  return new Response('ok');
});
