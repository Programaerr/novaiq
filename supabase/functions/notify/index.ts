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
 * ## لماذا "موضوع" لكل عقد لا رسالة
 * كل عقد يفتح **Forum Topic** خاصاً به في مجموعة العمل، وتُنشر تفاصيله كاملة داخله. السبب
 * عملي: مجموعة تتراكم فيها الرسائل تصير سجلّاً لا يُقرأ — بينما موضوع باسم الشركة يجعل كل ما
 * يخصّ عقداً واحداً في خيط واحد يُفتح بضغطة. ورقم الموضوع يُحفظ على صفّ العقد
 * (`telegram_topic_id`)، فأي رسالة لاحقة عنه تعرف أين تذهب.
 */

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
/** مجموعة العمل — هنا تُفتح مواضيع العقود. */
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') ?? '';
/** محادثة البوت الخاصّة — هنا تصل تنبيهات المشتركين الجدد وحدها. */
const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

type Payload = { type: 'new_contract' | 'new_subscriber'; record: Record<string, unknown> };

const api = (method: string) => `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

/** HTML الذي يقبله تيليجرام محدود جداً، وأي `<` غير مهروب يُفشل الرسالة كلها. */
const esc = (v: unknown) =>
  String(v ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(api(method), {
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

/** كل ما يلزم لمعرفة العقد بلا فتح اللوحة. */
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

/** يحفظ رقم الموضوع على العقد، فتعرف كل رسالة لاحقة عنه أين تذهب. */
async function rememberTopic(contractNumber: string, threadId: number) {
  if (!SUPABASE_URL || !SERVICE_ROLE) return;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/contracts?contract_number=eq.${encodeURIComponent(contractNumber)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ telegram_topic_id: threadId }),
    }
  );
  // فشل الحفظ لا يُبطل الإشعار: الموضوع أُنشئ والتفاصيل وصلت، وما يضيع هو الربط وحده.
  if (!res.ok) console.error('rememberTopic failed', res.status, await res.text());
}

Deno.serve(async (req) => {
  /* من يُسمح له بمناداة هذه الدالّة: القاعدة وحدها.
   *
   * عنوان الدالّة ليس سرّاً — مُعرِّف المشروع مكتوب في حزمة الموقع التي ينزّلها كل زائر،
   * والمسار مُخمَّن. فبلا فحص هنا يقدر أي شخص إغراق مجموعتك بمواضيع لعقود لا وجود لها.
   *
   * والمقارنة بمفتاح `service_role` لا بسرّ مخترَع: المفتاح موجود أصلاً، وSupabase يحقنه في
   * كل دالّة تلقائياً، فلا شيء جديد يُخترع ولا يُحفظ في مكانين. وهو أضيق من `Verify JWT`
   * المدمج: ذاك يقبل **أي** رمز صادر عن المشروع — ومنه مفتاح `anon` المنشور للعالم في
   * الموقع نفسه، أي أنه لا يمنع أحداً هنا. */
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!SERVICE_ROLE || bearer !== SERVICE_ROLE) {
    return new Response('forbidden', { status: 403 });
  }
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('notify: missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID');
    return new Response('not configured', { status: 500 });
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
      /* موضوع باسم الشركة ورقم العقد: الاسم وحده يتكرّر بين عقدين لنفس الزبون، والرقم وحده
         لا يُقرأ. تيليجرام يقصّ ما تجاوز 128 حرفاً، فيُقصّ الاسم لا الرقم. */
      const company = String(r.company_name ?? 'عقد').slice(0, 90);
      const topic = await tg('createForumTopic', {
        chat_id: CHAT_ID,
        name: `${company} — ${r.contract_number}`,
      });

      await tg('sendMessage', {
        chat_id: CHAT_ID,
        message_thread_id: topic.message_thread_id,
        parse_mode: 'HTML',
        text: contractBody(r),
        link_preview_options: { is_disabled: true },
      });

      await rememberTopic(String(r.contract_number), topic.message_thread_id);
    } else if (payload.type === 'new_subscriber') {
      /* المشتركون إلى محادثة البوت الخاصّة لا إلى المجموعة.
       *
       * تسجيل حساب ليس حدثاً تعاقدياً — لا خيط يتبعه ولا نقاش يدور حوله، بخلاف العقد. وضعُه
       * في المجموعة يُغرق مواضيع العقود بضجيج يومي، وأول ما يُفقد في مجموعة كثيرة الرسائل هو
       * الرسالة التي تهمّ.
       *
       * والارتداد إلى المجموعة عند غياب الإعداد مقصود: إشعار في المكان الخطأ يُلاحَظ ويُصحَّح،
       * أمّا إشعار لا يصل فيبدو كأن أحداً لم يسجّل. */
      const target = ADMIN_CHAT_ID || CHAT_ID;
      if (!ADMIN_CHAT_ID) {
        console.warn('notify: TELEGRAM_ADMIN_CHAT_ID غير مضبوط — أُرسل تنبيه المشترك إلى المجموعة');
      }
      await tg('sendMessage', {
        chat_id: target,
        parse_mode: 'HTML',
        text: subscriberBody(r),
        link_preview_options: { is_disabled: true },
      });
    } else {
      return new Response('unknown type', { status: 400 });
    }
  } catch (error) {
    console.error('notify failed:', error);
    return new Response('send failed', { status: 502 });
  }

  return new Response('ok');
});
