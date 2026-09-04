-- ═══════════════════════════════════════════════════════════════════════════════════════
--  NUVAIQ — الأمان على الخادم، مترجَماً عن firestore.rules.
--
--  هذا هو الملف الخطر في الترحيل كلّه. قواعد Firestore الحالية نتاج جلسات متتابعة من إغلاق
--  ثغرات محدَّدة؛ كل شرط فيها كُتب بعد حادثة أو تحليل، لا كاحتياط عام. فالترجمة حرفية في
--  المعنى: أي شرط يسقط سهواً هو ثغرة، لا "تبسيط".
--
--  ── لماذا طبقتان: سياسات + مشغّل ────────────────────────────────────────────────────────
--  RLS تجيب عن سؤال واحد: **أي الصفوف** يجوز لهذا الحساب أن يمسّها. `USING` ترى الصف القديم
--  و`WITH CHECK` ترى الجديد، ولا ترى أيٌّ منهما الاثنين معاً — فلا يمكن أن تُكتب فيها قاعدة
--  من نوع "السعر يجب أن يبقى كما هو". وهذا بالضبط جوهر نصف قواعدنا الحالية
--  (`affectedKeys().hasOnly(...)` في Firestore).
--
--  لذلك: **أي الصفوف** في السياسات، و**أي الأعمدة** في مشغّل `BEFORE UPDATE` — وهو وحده من
--  يرى OLD وNEW معاً. والمقارنة فيه تتم بـ`to_jsonb(old) - allowed <> to_jsonb(new) - allowed`،
--  أي نظير `hasOnly` تماماً، وأمتن منه: عمود يُضاف إلى الجدول مستقبلاً يصبح محميّاً تلقائياً
--  بلا أن يتذكّره أحد — بخلاف القائمة اليدوية في firestore.rules.
-- ═══════════════════════════════════════════════════════════════════════════════════════

alter table public.contracts          enable row level security;
alter table public.contract_payments  enable row level security;
alter table public.contract_snapshots enable row level security;
alter table public.contract_audit     enable row level security;
alter table public.contract_finance   enable row level security;
alter table public.admins             enable row level security;
alter table public.profiles           enable row level security;
alter table public.customer_notes     enable row level security;
alter table public.contact_messages   enable row level security;
alter table public.pricing_overrides  enable row level security;
alter table public.site_settings      enable row level security;

-- ── من هو الأدمن ───────────────────────────────────────────────────────────────────────
-- نظير isAdmin()، بشرطيه معاً: البريد في القائمة، **وموثَّق**. الثاني ليس زخرفة — القائمة
-- مفتاحها البريد، فمن يقدر ينشئ حساباً ببريد أدمن دون إثبات ملكيته يصبح أدمن. Google يوثّق
-- دائماً، لكن لحظة تفعيل الدخول بكلمة مرور يصير هذا الشرط الفارق بين نظام آمن ومخترَق.
--
-- `security definer` ضرورية: تقرأ `admins` وهو جدول تمنع سياساته السرد.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1
      from auth.users u
      join public.admins a on a.email = lower(btrim(u.email))
     where u.id = auth.uid()
       and u.email_confirmed_at is not null
  );
$$;

-- ── ملكية العقد ────────────────────────────────────────────────────────────────────────
-- نظير ownsContract(): المُعرِّف حين يوجد، وإلا البريد. والبريد هنا ليس تنازلاً أمنياً — هو
-- بريد الحساب الموثَّق من الرمز نفسه، لا نصّ يكتبه أحد.
create or replace function public.owns_contract(row_user_id uuid, row_email text)
returns boolean language sql stable as $$
  select auth.uid() is not null and (
    row_user_id = auth.uid()
    or (row_user_id is null and row_email = lower(btrim(coalesce(auth.jwt() ->> 'email', ''))))
  );
$$;

-- ═══ contracts — أي الصفوف ════════════════════════════════════════════════════════════

create policy contracts_read on public.contracts
  for select using (public.is_admin() or public.owns_contract(user_id, email));

-- الأدمن ينشئ نيابةً عن زبون: يترك user_id فارغاً ويكتب بريد الزبون، فيُربط العقد بحسابه
-- تلقائياً أول مرّة يسجّل دخوله (المشغّل في 01_schema.sql).
create policy contracts_insert_admin on public.contracts
  for insert with check (public.is_admin());

-- والعميل لنفسه فقط، بعقد نظيف — نظير customerCreateIsClean().
create policy contracts_insert_own on public.contracts
  for insert with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
    -- الحالة الأولية المشروعة الوحيدة للعميل: مُرسَل وموقَّع. 'draft' حكر على الأدمن.
    and status = 'submitted'
    and length(signature_data_url) > 0
    and agreed_to_terms
    -- حقول يكتبها الأدمن وحده: لا يضعها العميل في مستنده ولو كتب من الكونسول.
    and company_signature_data_url is null
    and completed_at is null
    and development_started_at is null
    and preview_url is null
    and admin_notes is null
    and cancellation_requested_at is null
    and delivery_timeline_text is null
    and paid_amount_iqd = 0
    and installments_planned = 0
    and payment_status = 'unpaid'
  );

-- التعديل: الصفّ مسموح للأدمن، أو لصاحب العقد. **وأي الأعمدة** يقرّرها المشغّل أدناه.
create policy contracts_update_admin on public.contracts
  for update using (public.is_admin()) with check (public.is_admin());

create policy contracts_update_own on public.contracts
  for update using (public.owns_contract(user_id, email))
             with check (public.owns_contract(user_id, email));

create policy contracts_delete_admin on public.contracts
  for delete using (public.is_admin());

-- ═══ contracts — أي الأعمدة ═══════════════════════════════════════════════════════════
create or replace function public.guard_contract_update()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  /* الأدمن، أو خادمنا نفسه (service_role).
     الثاني ضروري: دالّة الإشعار تكتب `telegram_topic_id` على العقد بعد إنشاء موضوعه، وهي
     تعمل بلا مستخدم — فـ`auth.uid()` فارغ و`is_admin()` تعطي false، فكانت تسقط في فرع
     "العميل" أدناه وتُرفض. ولاحظ ما لا يشمله هذا الإعفاء: قفل التوقيع وقاعدة المسودّة
     يُفحصان **قبله** ويسريان على الجميع بلا استثناء. */
  is_privileged boolean := public.is_admin() or auth.role() = 'service_role';
  -- ما يجوز أن يتغيّر في كل شكل من أشكال كتابة العميل. أي عمود خارج القائمة = رفض.
  sign_keys text[] := array[
    'signature_data_url', 'signature_ink', 'agreed_to_terms',
    'terms_viewed_at', 'status', 'user_id', 'updated_at'
  ];
  cancel_keys text[] := array['cancellation_requested_at', 'cancellation_reason', 'updated_at'];
  allowed text[];
begin
  -- ── قواعد تسري على الجميع، الأدمن أوّلهم ────────────────────────────────────────────
  -- قفل التوقيع: مرّة يُكتب توقيع حقيقي يبقى كما هو إلى الأبد. لا فحص "من يكتب" هنا، بل على
  -- القيمة نفسها — فلا يقدر حتى حساب الأدمن الكتابة فوقه، بالخطأ أو بالتلاعب.
  if old.signature_data_url <> '' and new.signature_data_url is distinct from old.signature_data_url then
    raise exception 'signature is locked once signed' using errcode = 'check_violation';
  end if;

  -- 'draft' حالة دخول لا يُعاد إليها أبداً. العودة إليها تُسقط نسبة إنجاز الزبون وتعيد له
  -- لوحة "بانتظار توقيعك" فوق عقد موقَّع — ولوحة لا يمكن أن تنجح لأن التوقيع مقفل أعلاه.
  if new.status = 'draft' and old.status <> 'draft' then
    raise exception 'a contract never returns to draft' using errcode = 'check_violation';
  end if;

  if is_privileged then
    -- مسودّة لا تُرقّى إلى حالة حقيقية إلا بتوقيع يرافقها في نفس الكتابة (الزبون حاضر ووقّع).
    -- بدون هذا تسمح قائمة "حالة العقد" بترقية عقد لم يوقّعه أحد بضغطة واحدة.
    if old.status = 'draft' and new.status <> 'draft' and length(new.signature_data_url) = 0 then
      raise exception 'an unsigned draft cannot be advanced' using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- ── من هنا: صاحب العقد، لا الأدمن. بابان لا ثالث لهما ───────────────────────────────
  if old.status = 'draft' and old.signature_data_url = '' then
    -- الباب الأول: يوقّع عقداً أنشأه له الأدمن.
    if new.status <> 'submitted'
       or not new.agreed_to_terms
       or length(new.signature_data_url) = 0
       or new.terms_viewed_at is null then
      raise exception 'invalid signing update' using errcode = 'check_violation';
    end if;
    -- يربط العقد بحسابه أوّل مرّة، ولا يقدر ادّعاء عقد بربطه بحساب آخر.
    if new.user_id is distinct from old.user_id and new.user_id is distinct from auth.uid() then
      raise exception 'cannot claim a contract for another account' using errcode = 'check_violation';
    end if;
    allowed := sign_keys;
  else
    -- الباب الثاني: يطلب الإلغاء — إشعار لنا لا إلغاء، ولا يُفتح بعد أول دفعة.
    if new.cancellation_requested_at is null then
      raise exception 'customers may only request cancellation here' using errcode = 'check_violation';
    end if;
    if old.paid_amount_iqd > 0 or old.status in ('completed', 'cancelled') then
      raise exception 'cancellation is no longer available on this contract' using errcode = 'check_violation';
    end if;
    allowed := cancel_keys;
  end if;

  -- نظير `affectedKeys().hasOnly(...)`: كل ما عدا الأعمدة المسموح بها يجب أن يبقى حرفياً كما
  -- هو. وهي أمتن من نظيرتها في Firestore: عمود يُضاف إلى الجدول لاحقاً يصير محميّاً تلقائياً
  -- بلا أن يتذكّره أحد.
  if (to_jsonb(old) - allowed) is distinct from (to_jsonb(new) - allowed) then
    raise exception 'this update touches columns you may not change' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger contracts_guard_update
  before update on public.contracts
  for each row execute function public.guard_contract_update();

-- ═══ contract_payments ════════════════════════════════════════════════════════════════
-- دفتر داخلي بالكامل: العميل يرى المجموع على عقده (paid_amount_iqd)، لا الأسطر.
create policy payments_admin_all on public.contract_payments
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══ contract_snapshots ═══════════════════════════════════════════════════════════════
-- إضافة فقط. لا update ولا delete لأحد — ولا للأدمن: لقطة يمكن تعديلها لا تُثبت شيئاً، وكل
-- قيمتها في أنها لا تتغيّر. (غياب سياسة update/delete = منعٌ تام تحت RLS.)
create policy snapshots_read on public.contract_snapshots
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.contracts c
       where c.contract_number = contract_snapshots.contract_number
         and public.owns_contract(c.user_id, c.email)
    )
  );

create policy snapshots_insert_admin on public.contract_snapshots
  for insert with check (public.is_admin());

-- ═══ contract_audit ═══════════════════════════════════════════════════════════════════
-- إضافة فقط كذلك، والكاتب هو الحساب الموقَّع نفسه — فلا ينسب أدمن تعديله إلى زميله.
create policy audit_read_admin on public.contract_audit
  for select using (public.is_admin());

create policy audit_insert_admin on public.contract_audit
  for insert with check (
    public.is_admin()
    and actor_email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
  );

-- ═══ contract_finance ═════════════════════════════════════════════════════════════════
create policy finance_admin_all on public.contract_finance
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══ admins ═══════════════════════════════════════════════════════════════════════════
-- لا سرد إطلاقاً — القائمة نفسها معلومة حسّاسة. والمستخدم العادي يسأل عن بريده هو فقط، فلا
-- تُكتشف العضوية بالتخمين. والأدمن وحده يضيف أدمن؛ الأول يُنشأ يدوياً مرّة واحدة.
create policy admins_read_self_or_admin on public.admins
  for select using (
    public.is_admin()
    or email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
  );

create policy admins_write_admin on public.admins
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══ profiles ═════════════════════════════════════════════════════════════════════════
-- لا كتابة من أحد إطلاقاً: يملؤه مشغّل على auth.users. في Firestore كان الحساب يكتب صفّه
-- بنفسه لغياب بديل — أي أنه كان يقدر يكتب بريداً أو تاريخ إنشاء غير صحيحين.
create policy profiles_read on public.profiles
  for select using (public.is_admin() or id = auth.uid());

-- ═══ customer_notes ═══════════════════════════════════════════════════════════════════
-- ملاحظات الأدمن عن الشخص — لا يقرؤها صاحبها.
create policy customer_notes_admin_all on public.customer_notes
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══ contact_messages ═════════════════════════════════════════════════════════════════
-- النموذج عام عمداً (لا تسجيل دخول لإرسال رسالة)، فالإدخال مفتوح — وقيود الشكل في الجدول
-- نفسه (01_schema.sql). القراءة للأدمن: رسائل عملاء محتملين لا يقرؤها زائر.
create policy contact_insert_anyone on public.contact_messages
  for insert with check (true);

create policy contact_read_admin on public.contact_messages
  for select using (public.is_admin());

-- ═══ pricing_overrides / site_settings ════════════════════════════════════════════════
-- قراءة عامة (صفحة كل زائر تعرضها)، كتابة للأدمن وحده.
create policy pricing_read_all on public.pricing_overrides
  for select using (true);
create policy pricing_write_admin on public.pricing_overrides
  for all using (public.is_admin()) with check (public.is_admin());

create policy settings_read_all on public.site_settings
  for select using (true);
create policy settings_write_admin on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());
