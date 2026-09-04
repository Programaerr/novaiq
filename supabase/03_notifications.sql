-- ═══════════════════════════════════════════════════════════════════════════════════════
--  NUVAIQ — إشعارات العمل الداخلي، من الجدول نفسه.
--
--  يُنفَّذ بعد 01_schema.sql و02_policies.sql.
--
--  ── لماذا من القاعدة لا من المتصفح ─────────────────────────────────────────────────────
--  البديل الظاهر أسهل: بعد نجاح الحفظ، ينادي المتصفحُ دالّةً ترسل البريد. وله ثلاثة عيوب
--  قاتلة في عمل داخلي يُبنى عليه قرار:
--
--   · **يضيع بصمت.** من يغلق التبويب بعد الحفظ مباشرة — أو ينقطع خطّه — يترك عقداً مكتوباً
--     بلا إشعار. ولن تعرف أنك لم تُشعَر؛ ستظنّ أن لا عقد جديد.
--   · **يُزوَّر.** المسار مفتوح لأي شخص يقرأ شيفرة الصفحة، فيقدر يُغرق بريدك بإشعارات عن
--     عقود لا وجود لها.
--   · **يكذب.** ينطلق عند "نجاح" الحفظ كما تراه الواجهة، لا عند وجود الصفّ فعلاً.
--
--  المشغّل هنا يقع **بعد** أن يمرّ الصفّ من كل سياسات RLS وقيود الجدول ويستقرّ في القاعدة.
--  فما يصلك إشعارٌ عنه موجود فعلاً، بلا استثناء.
--
--  ── ولماذا Vault لا نصّ في هذا الملف ───────────────────────────────────────────────────
--  عنوان الدالّة وسرّها يُقرآن من `vault` لا من هنا: هذا الملف في المستودع، وأي سرّ يُكتب فيه
--  يصبح في تاريخ git إلى الأبد — لا يكفي حذفه لاحقاً.
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- pg_net: طلب HTTP من داخل Postgres، **غير متزامن**. وهذا مقصود لا تنازل: الطلب يُوضع في
-- طابور ولا تنتظره المعاملة، فبريد بطيء أو ساقط لا يؤخّر كتابة عقد ولا يُفشلها.
create extension if not exists pg_net with schema extensions;

/**
 * يُطلق إشعاراً واحداً. لا يرمي أبداً — أي فشل هنا يُسجَّل ويُترك.
 *
 * السبب أن هذه الدالّة تعمل داخل معاملة الكتابة نفسها: استثناء غير ملتقَط فيها يُلغي إدخال
 * العقد كلّه. أي أن عطلاً في البريد كان سيمنع زبوناً من توقيع عقده — وهو ثمن لا يُدفع مقابل
 * إشعار.
 */
create or replace function public.send_internal_notification(kind text, record jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  fn_url text;
  fn_secret text;
begin
  select decrypted_secret into fn_url   from vault.decrypted_secrets where name = 'notify_url'    limit 1;
  select decrypted_secret into fn_secret from vault.decrypted_secrets where name = 'notify_secret' limit 1;

  -- غياب الإعداد ليس خطأً: قاعدة لم تُضبط فيها الأسرار بعد يجب أن تعمل كاملةً بلا إشعارات.
  if fn_url is null or fn_secret is null then
    return;
  end if;

  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-notify-secret', fn_secret
               ),
    body    := jsonb_build_object('type', kind, 'record', record),
    timeout_milliseconds := 5000
  );
exception when others then
  raise warning 'send_internal_notification failed (%): %', kind, sqlerrm;
end;
$$;

-- ═══ عقد جديد ═════════════════════════════════════════════════════════════════════════
-- على الإدخال وحده: كل تعديل لاحق (سعر، حالة، دفعة) له مكانه في اللوحة ولا يستحق بريداً —
-- وإشعارٌ عن كل حفظة يصير ضجيجاً يُتجاهَل، فيضيع معه الإشعار الذي يهمّ.
create or replace function public.notify_new_contract()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.send_internal_notification('new_contract', to_jsonb(new));
  return null;
end;
$$;

drop trigger if exists contracts_notify_insert on public.contracts;
create trigger contracts_notify_insert
  after insert on public.contracts
  for each row execute function public.notify_new_contract();

-- ═══ مشترك جديد ═══════════════════════════════════════════════════════════════════════
-- على `profiles` لا على `auth.users`: الصفّ هنا يُكتب مرّة واحدة فقط لكل حساب (أوّل دخول)،
-- بينما `auth.users` يُحدَّث مع كل دخول لاحق — فالإشعار من هناك كان سيصلك كل مرّة يفتح فيها
-- زبون قديم حسابه.
create or replace function public.notify_new_subscriber()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.send_internal_notification('new_subscriber', to_jsonb(new));
  return null;
end;
$$;

drop trigger if exists profiles_notify_insert on public.profiles;
create trigger profiles_notify_insert
  after insert on public.profiles
  for each row execute function public.notify_new_subscriber();

-- ═══════════════════════════════════════════════════════════════════════════════════════
--  الأسرار — تُكتب مرّة واحدة، من محرّر SQL، ولا تُحفظ في أي ملف:
--
--    select vault.create_secret(
--      'https://<PROJECT_REF>.supabase.co/functions/v1/notify', 'notify_url');
--
--    select vault.create_secret('<سلسلة عشوائية طويلة تخترعها>', 'notify_secret');
--
--  ونفس `notify_secret` يُوضع في أسرار الدالّة (Edge Function secrets) باسم NOTIFY_SECRET،
--  ومعه TELEGRAM_BOT_TOKEN وTELEGRAM_CHAT_ID. لتغييرها لاحقاً: vault.update_secret(id, value).
--
--  ملاحظة على عمود `telegram_topic_id`: تكتبه الدالّة بمفتاح service_role بعد إنشاء الموضوع.
--  ولهذا يعرف مشغّلُ الحراسة في 02_policies.sql هذا الدور صراحةً — بدونه كانت تلك الكتابة
--  تُرفض بوصفها "تعديل عميل غير مسموح"، فيُنشأ الموضوع ولا يُربط بعقده أبداً.
-- ═══════════════════════════════════════════════════════════════════════════════════════
