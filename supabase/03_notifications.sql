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
  fn_key text;
begin
  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'notify_url'  limit 1;
  select decrypted_secret into fn_key from vault.decrypted_secrets where name = 'service_role_key' limit 1;

  -- غياب الإعداد ليس خطأً: قاعدة لم تُضبط فيها الأسرار بعد يجب أن تعمل كاملةً بلا إشعارات.
  if fn_url is null or fn_key is null then
    return;
  end if;

  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || fn_key
               ),
    body    := jsonb_build_object('type', kind, 'record', record),
    timeout_milliseconds := 5000
  );
exception when others then
  raise warning 'send_internal_notification failed (%): %', kind, sqlerrm;
end;
$$;

-- ═══ ضبط أسرار Vault، بلا خطأ عند الإعادة ═════════════════════════════════════════════
-- `vault.create_secret` ترمي إن كان الاسم موجوداً، فإعادة تشغيل خطوة الإعداد تفشل بخطأ
-- "duplicate key". هذه تُنشئ أو تُحدِّث، فتُنفَّذ مرّة أو عشراً بلا فرق — والسرّ يبقى في Vault
-- لا في هذا الملف.
create or replace function public.set_vault_secret(secret_name text, secret_value text)
returns void
language plpgsql
security definer
set search_path = vault, public
as $$
declare
  existing uuid;
begin
  select id into existing from vault.secrets where name = secret_name limit 1;
  if existing is null then
    perform vault.create_secret(secret_value, secret_name);
  else
    perform vault.update_secret(existing, secret_value);
  end if;
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
--  الأسرار — من محرّر SQL، ولا تُحفظ في أي ملف. تُعاد كما تشاء:
--
--    select public.set_vault_secret(
--      'notify_url', 'https://<PROJECT_REF>.supabase.co/functions/v1/notify');
--
--    select public.set_vault_secret('service_role_key', '<مفتاح service_role من Settings ← API>');
--
--  لا سرّ يُخترع: الدالّة تقرأ دور الرمز الوارد وتشترط `service_role`، والمنصّة تكون قد تحقّقت
--  من توقيعه قبلها — فيلزم إبقاء `Verify JWT` **مُفعَّلاً** في إعدادات الدالّة.
--  ولا تُقارَن النصوص: مفتاح البيئة المحقون يتجمّد لحظة النشر، فتدويرُ المفتاح بعده يجعل
--  مفتاحين صحيحين لا يتطابقان حرفياً — وتُردّ نداءات القاعدة كلها بـ403 بلا سبب ظاهر.
--
--  وأسرار الدالّة نفسها بوتان منفصلان لا بوت واحد (انظر تعليق أعلى functions/notify/index.ts
--  لسبب ذلك): TELEGRAM_CONTRACT_BOT_TOKEN وTELEGRAM_CONTRACT_CHAT_ID للعقود، وTELEGRAM_SUBSCRIBER_BOT_TOKEN
--  وTELEGRAM_ADMIN_CHAT_ID للمشتركين — تُضبط من لوحة Edge Functions ← Secrets لا من هنا.
-- ═══════════════════════════════════════════════════════════════════════════════════════
