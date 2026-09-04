-- ═══════════════════════════════════════════════════════════════════════════════════════
--  NUVAIQ — سياسات RLS، مترجَمة سطراً بسطر عن firestore.rules.
--
--  هذا هو الملف الخطر في الترحيل كلّه. قواعد Firestore الحالية نتاج جلسات متتابعة من إغلاق
--  ثغرات محدَّدة، وكل شرط فيها كُتب بعد حادثة أو تحليل — لا كاحتياط عام. فالترجمة هنا حرفية
--  في المعنى، لا إعادة تصميم: أي شرط سقط سهواً هو ثغرة، لا "تبسيط".
--
--  فرق جوهري لصالحنا: في Firestore كان الرفض كلّاً لا يتجزأ — من يقرأ مستنداً يقرأ كل حقوله،
--  ولهذا فُصلت التكلفة في مجموعة مستقلة. هنا RLS تعمل على مستوى الصف، ويمكن حجب أعمدة
--  بالمناظر (views). أبقيتُ الفصل على أي حال (انظر contract_finance) لأن سياسة واحدة خاطئة
--  على جدول واحد أهون من عمود مكشوف داخل جدول يقرأه الجميع.
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
-- نظير isAdmin() في firestore.rules، بشرطيه معاً:
--  · البريد في قائمة `admins`.
--  · والبريد **موثَّق**. الشرط الثاني ليس زخرفة: القائمة مفتاحها البريد، فمن يقدر ينشئ حساباً
--    ببريد أدمن دون إثبات ملكيته يصبح أدمن. مزوّد Google يوثّق دائماً، لكن لحظة تفعيل الدخول
--    بكلمة مرور يتحوّل هذا الشرط من احتياط إلى الفارق بين نظام آمن ونظام مخترَق.
--
-- `security definer` ضرورية: الدالّة تقرأ `admins` وهو جدول تمنع سياساته السرد — بدونها
-- تفشل السياسات التي تستدعيها بدل أن تُقيَّم.
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
-- نظير ownsContract(): المُعرِّف حين يوجد، وإلا البريد. البريد ليس تنازلاً أمنياً — هو
-- `auth.jwt() ->> 'email'` أي بريد الحساب الموثَّق نفسه، لا نصّ يكتبه أحد.
create or replace function public.owns_contract(row_user_id uuid, row_email text)
returns boolean language sql stable as $$
  select auth.uid() is not null and (
    row_user_id = auth.uid()
    or (row_user_id is null and row_email = lower(btrim(coalesce(auth.jwt() ->> 'email', ''))))
  );
$$;

-- ═══ contracts ════════════════════════════════════════════════════════════════════════

create policy contracts_read on public.contracts
  for select using (public.is_admin() or public.owns_contract(user_id, email));

-- الإنشاء: الأدمن بحرّية (ينشئ نيابةً عن زبون، فيترك user_id فارغاً ويكتب بريد الزبون)،
-- والعميل لنفسه فقط وبعقد نظيف.
--
-- نظير customerCreateIsClean(): كل حقل يكتبه الأدمن وحده ممنوع هنا. في Firestore كان المنع
-- بقائمة `!('field' in d)` طويلة لأن الإنشاء هناك كلٌّ لا يتجزأ؛ هنا القيم الافتراضية في
-- الجدول تتكفّل بأكثرها، ويبقى ما يستطيع العميل ضبطه صراحةً.
create policy contracts_insert_admin on public.contracts
  for insert with check (public.is_admin());

create policy contracts_insert_own on public.contracts
  for insert with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
    -- الحالة الأولية المشروعة الوحيدة للعميل: مُرسَل وموقَّع. 'draft' حكر على الأدمن.
    and status = 'submitted'
    and length(signature_data_url) > 0
    and agreed_to_terms
    -- حقول الأدمن وحده: لا يكتبها العميل ولو من الكونسول.
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

-- التعديل: ثلاثة أبواب، كما في firestore.rules تماماً.
--
-- Postgres لا يملك نظير `affectedKeys().hasOnly(...)` — لا يقول لك أي الأعمدة تغيّرت. البديل
-- الصحيح: مقارنة العمود بنفسه بين OLD وNEW. أي عمود لا يُذكر هنا يعني "يجوز تغييره"، فقائمة
-- المساواة أدناه هي القفل، وغيابُ عمود منها ثغرة لا تبسيط.
create policy contracts_update_admin on public.contracts
  for update using (public.is_admin()) with check (
    public.is_admin()
    -- قفل التوقيع: مرّة يُكتب توقيع حقيقي يبقى كما هو إلى الأبد — ولا حتى الأدمن يكتب فوقه.
    and (old.signature_data_url = '' or new.signature_data_url = old.signature_data_url)
    -- عقد 'draft' لا يخرج منها إلا بتوقيع حقيقي معه في نفس الكتابة.
    and (old.status <> 'draft' or new.status = 'draft' or length(new.signature_data_url) > 0)
    -- و'draft' حالة دخول لا يُعاد إليها: العودة تُسقط نسبة الزبون وتعيد له لوحة توقيع
    -- فوق عقد موقَّع، ولوحة لا يمكن أن تنجح لأن التوقيع مقفل.
    and (new.status <> 'draft' or old.status = 'draft')
  );

-- العميل يطلب الإلغاء — ولا شيء آخر.
create policy contracts_update_cancellation on public.contracts
  for update using (
    public.owns_contract(user_id, email)
    and status not in ('completed', 'cancelled')
    and paid_amount_iqd = 0
  ) with check (
    public.owns_contract(user_id, email)
    and new.cancellation_requested_at is not null
    -- كل شيء آخر كما هو. هذه هي `hasOnly` مكتوبةً بالمساواة.
    and new.status = old.status
    and new.total_price_iqd = old.total_price_iqd
    and new.signature_data_url = old.signature_data_url
    and new.company_signature_data_url is not distinct from old.company_signature_data_url
    and new.admin_notes is not distinct from old.admin_notes
    and new.preview_url is not distinct from old.preview_url
    and new.email = old.email
    and new.user_id is not distinct from old.user_id
    and new.paid_amount_iqd = old.paid_amount_iqd
  );

-- العميل يوقّع عقداً أنشأه له الأدمن — الباب الثالث، وأضيقها.
create policy contracts_update_sign on public.contracts
  for update using (
    public.owns_contract(user_id, email)
    and status = 'draft'
    and signature_data_url = ''   -- لا كتابة فوق توقيع موجود، ولو بقي العقد 'draft'
  ) with check (
    public.owns_contract(user_id, email)
    and new.status = 'submitted'
    and new.agreed_to_terms
    and length(new.signature_data_url) > 0
    and new.terms_viewed_at is not null
    -- يربط العقد بحسابه أول مرّة، ولا يقدر ادّعاء عقد بربطه بحساب آخر.
    and (new.user_id = auth.uid() or new.user_id is not distinct from old.user_id)
    -- ولا شيء غير التوقيع: لا سعر، ولا وصف، ولا مدّة.
    and new.total_price_iqd = old.total_price_iqd
    and new.company_name = old.company_name
    and new.custom_features_text = old.custom_features_text
    and new.delivery_timeline_weeks = old.delivery_timeline_weeks
    and new.email = old.email
    and new.admin_notes is not distinct from old.admin_notes
    and new.company_signature_data_url is not distinct from old.company_signature_data_url
  );

create policy contracts_delete_admin on public.contracts
  for delete using (public.is_admin());

-- ═══ contract_payments ════════════════════════════════════════════════════════════════
-- دفتر داخلي بالكامل: العميل يرى المجموع على عقده (paid_amount_iqd)، لا الأسطر.
create policy payments_admin_all on public.contract_payments
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══ contract_snapshots ═══════════════════════════════════════════════════════════════
-- إضافة فقط. لا update ولا delete لأحد — ولا للأدمن: لقطة يمكن تعديلها لا تُثبت شيئاً،
-- وكل قيمتها في أنها لا تتغيّر بعد كتابتها.
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
-- إضافة فقط كذلك، والكاتب يجب أن يكون الحساب الموقَّع نفسه — فلا ينسب أدمن تعديله لزميله.
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
-- لا سرد إطلاقاً — القائمة نفسها معلومة حسّاسة. والمستخدم العادي يسأل عن بريده هو فقط،
-- فلا تُكتشف العضوية بالتخمين. والأدمن وحده يضيف أدمن؛ الأول يُنشأ يدوياً مرّة واحدة.
create policy admins_read_self_or_admin on public.admins
  for select using (
    public.is_admin()
    or email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
  );

create policy admins_write_admin on public.admins
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══ profiles ═════════════════════════════════════════════════════════════════════════
-- لا كتابة من أحد إطلاقاً: يملؤه مشغّل على auth.users. في Firestore كان الحساب يكتب صفّه
-- بنفسه (لغياب بديل)، أي أنه كان يقدر يكتب بريداً أو تاريخ إنشاء غير صحيحين.
create policy profiles_read on public.profiles
  for select using (public.is_admin() or id = auth.uid());

-- ═══ customer_notes ═══════════════════════════════════════════════════════════════════
-- ملاحظات الأدمن عن الشخص — لا يقرؤها صاحبها.
create policy customer_notes_admin_all on public.customer_notes
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══ contact_messages ═════════════════════════════════════════════════════════════════
-- النموذج عام عمداً (لا تسجيل دخول لإرسال رسالة)، فالإدخال مفتوح — والقيود على الشكل في
-- الجدول نفسه (01_schema.sql) لا هنا. القراءة للأدمن: رسائل عملاء محتملين لا يقرؤها زائر.
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
