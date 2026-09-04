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
/** محادثات البوت الخاصّة — هنا تصل تنبيهات المشتركين الجدد وحدها.
 *  تقبل أكثر من رقم مفصولةً بفاصلة، فتُضاف أرقام لاحقاً بلا لمس الكود. */
const ADMIN_CHAT_IDS = (Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

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

/** يحفظ رقم الموضوع على العقد، فتعرف كل رسالة لاحقة عنه أين تذهب.
 *
 *  يكتب برمز المُنادي نفسه لا بمتغيّر البيئة: هو رمز `service_role` تحقّقت المنصّة من توقيعه
 *  قبل أسطر، وهو بالضرورة أحدث من أي قيمة تجمّدت في بيئة النشر — فلا يبقى في الطريق شيء
 *  يمكن أن يشيخ. */
async function rememberTopic(contractNumber: string, threadId: number, token: string) {
  if (!SUPABASE_URL || !token) return;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/contracts?contract_number=eq.${encodeURIComponent(contractNumber)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: token,
        Authorization: `Bearer ${token}`,
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

      await rememberTopic(String(r.contract_number), topic.message_thread_id, bearer);
    } else if (payload.type === 'new_subscriber') {
      /* المشتركون إلى محادثة البوت الخاصّة لا إلى المجموعة.
       *
       * تسجيل حساب ليس حدثاً تعاقدياً — لا خيط يتبعه ولا نقاش يدور حوله، بخلاف العقد. وضعُه
       * في المجموعة يُغرق مواضيع العقود بضجيج يومي، وأول ما يُفقد في مجموعة كثيرة الرسائل هو
       * الرسالة التي تهمّ.
       *
       * والارتداد إلى المجموعة عند غياب الإعداد مقصود: إشعار في المكان الخطأ يُلاحَظ ويُصحَّح،
       * أمّا إشعار لا يصل فيبدو كأن أحداً لم يسجّل. */
      const targets = ADMIN_CHAT_IDS.length ? ADMIN_CHAT_IDS : [CHAT_ID];
      if (!ADMIN_CHAT_IDS.length) {
        console.warn('notify: TELEGRAM_ADMIN_CHAT_ID غير مضبوط — أُرسل تنبيه المشترك إلى المجموعة');
      }

      /* كل مُستلِم على حدة، وفشلُ أحدهم لا يمنع الباقين.
         الحالة الواقعية: شريك لم يضغط Start على البوت بعد — تيليجرام يرفض مراسلته وحده
         ("chat not found")، ولو كانت الإرسالة واحدة لسقط التنبيه عن الجميع بسببه. */
      const results = await Promise.allSettled(
        targets.map((chat_id) =>
          tg('sendMessage', {
            chat_id,
            parse_mode: 'HTML',
            text: subscriberBody(r),
            link_preview_options: { is_disabled: true },
          })
        )
      );

      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.error(`notify: تعذّر إبلاغ ${targets[i]} —`, result.reason);
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
