-- ═══════════════════════════════════════════════════════════════════════════════════════
--  NUVAIQ — مخطّط Postgres، مترجَماً عن مجموعات Firestore الإحدى عشرة.
--
--  يُنفَّذ مرّة واحدة على مشروع Supabase جديد، قبل أي ترحيل بيانات.
--  الترتيب مقصود: الأنواع، ثم الجداول، ثم الفهارس، ثم المشغّلات. والسياسات في 02_policies.sql.
--
--  ── ثلاثة قرارات تستحق مراجعتك قبل التنفيذ ─────────────────────────────────────────────
--
--  ١) `contract_number` هو المفتاح الأساسي للعقود، لا uuid جديد.
--     في Firestore كان مُعرِّف المستند هو رقم العقد نفسه (NVQ-YYYYMMDD-XXXXX)، وكل شيء آخر
--     يشير إليه بهذا الرقم: اللقطات مفتاحها الرقم، وسجلّ التدقيق يحمله، والعميل يقرأه على
--     وثيقته المطبوعة. إدخال uuid ثانٍ يعني مُعرِّفين لنفس الشيء وترجمةً بينهما في كل استعلام.
--
--  ٢) الدفعات صارت جدولاً مستقلاً لا مصفوفة JSON.
--     كانت `payments[]` داخل مستند العقد، فكان أي مجموع مالي يُحسب في المتصفح بعد جلب كل
--     العقود. الجدول يجعل `SUM()` تعمل على الخادم — وهو أحد أسباب الانتقال أصلاً. الثمن:
--     الكود الذي يقرأ/يكتب المصفوفة يُعاد كتابته (وهو محصور في ContractsTab وlib/payments).
--
--  ٣) `user_id` قد يكون فارغاً، والبريد هو الرابط الدائم.
--     ليس لتوافق مع نظام قديم — لا بيانات تُرحَّل أصلاً — بل لأن الأدمن ينشئ عقداً لزبون لم
--     يفتح حساباً بعد. العقد يعيش بلا `user_id` حتى يسجّل صاحبه دخوله أوّل مرّة، فيربطه به
--     المشغّل أدناه بالبريد. ولهذا `email` إلزامي ومطبَّع: هو المُعرِّف الوحيد المضمون.
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- ── أنواع محصورة، بدل نصوص حرّة ─────────────────────────────────────────────────────────
-- في Firestore كانت هذه سلاسل نصّية تحرسها قاعدة أمان. هنا يحرسها النوع نفسه: قيمة خارج
-- القائمة تُرفض عند الكتابة، لا عند المراجعة.
do $$ begin
  if not exists (select 1 from pg_type where typname = 'contract_status') then
    create type contract_status as enum ('draft', 'submitted', 'under_review', 'in_development', 'completed', 'cancelled');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'payment_plan') then
    create type payment_plan as enum ('50_50', '100_upfront', '3_milestones');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('unpaid', 'partial', 'paid');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'project_type') then
    create type project_type as enum ('website', 'app');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'theme_preference') then
    create type theme_preference as enum ('dark', 'light', 'both');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'language_support') then
    create type language_support as enum ('ar', 'en', 'ar_en');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'signature_ink') then
    create type signature_ink as enum ('dark');
  end if;
end $$;

-- ═══ العقود ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.contracts (
  contract_number      text primary key,

  -- الملكية: uuid الحساب حين يكون معروفاً، والبريد دائماً.
  -- البريد ليس احتياطاً فحسب — عقد ينشئه الأدمن نيابةً عن زبون لم يسجّل دخوله بعد لا يملك
  -- user_id إطلاقاً، ويُطابَق ببريده حين يدخل أول مرّة. ولهذا هو NOT NULL ومطبَّع دائماً.
  user_id              uuid references auth.users(id) on delete set null,
  email                text not null check (email = lower(btrim(email))),

  company_name         text not null check (length(company_name) between 1 and 300),
  cr_number            text not null default '',
  rep_name             text not null check (length(rep_name) between 1 and 300),
  phone                text not null check (length(phone) between 1 and 40),
  city                 text not null default '',

  template_id          text not null,
  template_title       text not null default '',
  project_type         project_type,
  custom_features_text text not null default '',

  primary_color        text not null default '',
  second_color         text,
  third_color          text,
  theme_preference     theme_preference not null default 'dark',
  language_support     language_support not null default 'ar',
  -- شعار العميل كـdata URL داخل الصف نفسه، كما كان داخل المستند: لا خدمة ملفات في هذا
  -- المشروع عمداً. السقف مفروض هنا أيضاً لا في الواجهة وحدها.
  client_logo_data_url text check (client_logo_data_url is null or length(client_logo_data_url) < 400000),

  base_price_iqd       bigint not null default 0,
  total_price_iqd      bigint not null default 0,
  payment_plan         payment_plan not null default '50_50',
  delivery_timeline_text  text,
  delivery_timeline_weeks integer not null default 0,

  -- توقيع العميل. فارغ = لم يوقّع بعد (عقد أنشأه الأدمن نيابةً عنه).
  signature_data_url   text not null default '' check (length(signature_data_url) < 200000),
  signature_ink        signature_ink,
  agreed_to_terms      boolean not null default false,
  terms_viewed_at      timestamptz,

  -- اعتماد NUVAIQ المضاد.
  company_signature_data_url text check (company_signature_data_url is null or length(company_signature_data_url) < 200000),
  company_signature_ink      signature_ink,

  status               contract_status not null default 'draft',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  completed_at         timestamptz,
  development_started_at timestamptz,
  preview_url          text,

  -- مُعرِّف الموضوع (Forum Topic) الذي أنشأه البوت لهذا العقد في مجموعة العمل.
  -- يُكتب مرّة واحدة من دالّة الإشعار بعد إنشاء الموضوع، وهو ما يجعل كل رسالة لاحقة عن هذا
  -- العقد تذهب إلى خيطه هو لا إلى قاع المجموعة.
  telegram_topic_id    bigint,

  snapshot_hash        text,
  snapshot_at          timestamptz,
  cancellation_requested_at timestamptz,
  cancellation_reason  text check (cancellation_reason is null or length(cancellation_reason) < 2000),
  admin_notes          text,

  -- ملخّص الدفعات. يُحسب من جدول `contract_payments` بمشغّل أدناه، لا يُكتب يدوياً —
  -- في Firestore كان الكود يعيد حسابه عند كل حفظة ويأمل أن يبقى متّسقاً.
  paid_amount_iqd      bigint not null default 0,
  payment_status       payment_status not null default 'unpaid',
  installments_planned integer not null default 0,

  -- عقد "مُرسَل" يعني موقَّعاً فعلاً. كانت هذه قاعدة أمان في Firestore، وهنا قيد في الجدول:
  -- لا يمكن أن يوجد صفّ يناقضها أصلاً، مهما كان الطريق الذي كُتب منه.
  constraint submitted_contracts_are_signed check (
    status = 'draft' or (length(signature_data_url) > 0 and agreed_to_terms)
  )
);

comment on column public.contracts.email is
  'مطبَّع دائماً (صغير ومشذَّب) — هو ما يربط العقد بصاحبه قبل أن يسجّل دخوله، والقيد أعلاه يفرض ذلك في القاعدة لا في الواجهة.';

create index if not exists contracts_user_id_idx  on public.contracts (user_id);
create index if not exists contracts_email_idx    on public.contracts (email);
create index if not exists contracts_status_idx   on public.contracts (status);
create index if not exists contracts_created_idx  on public.contracts (created_at desc);

-- ═══ دفعات العقد ══════════════════════════════════════════════════════════════════════
create table if not exists public.contract_payments (
  id              uuid primary key default gen_random_uuid(),
  contract_number text not null references public.contracts(contract_number) on delete cascade,
  amount_iqd      bigint not null check (amount_iqd > 0),
  paid_on         date not null,
  note            text,
  created_at      timestamptz not null default now()
);

create index if not exists contract_payments_contract_idx on public.contract_payments (contract_number);

-- ═══ لقطة العقد المعتمَد ═══════════════════════════════════════════════════════════════
-- تُكتب مرّة ولا تُعدَّل ولا تُحذف أبداً (السياسات تمنع update/delete تماماً، كما في Firestore).
-- كل قيمتها في أنها لا تتغيّر: ما يُطبع للعميل بعد سنة هو نصّ البنود كما كان يوم وقّع.
create table if not exists public.contract_snapshots (
  contract_number text primary key references public.contracts(contract_number) on delete cascade,
  snapshot_at     timestamptz not null default now(),
  approved_by     text not null,
  terms           jsonb not null,   -- { ar: string[], en: string[] }
  values          jsonb not null,   -- القيم التعاقدية المجمَّدة
  hash            text not null
);

-- ═══ سجلّ التدقيق ═════════════════════════════════════════════════════════════════════
-- إضافة فقط. سجل يمكن تعديله أو حذفه ليس سجلاً.
create table if not exists public.contract_audit (
  id              uuid primary key default gen_random_uuid(),
  contract_number text not null,
  actor_email     text not null check (actor_email = lower(btrim(actor_email))),
  at              timestamptz not null default now(),
  changes         jsonb not null
);

create index if not exists contract_audit_contract_idx on public.contract_audit (contract_number, at desc);

-- ═══ تكلفتنا الداخلية ═════════════════════════════════════════════════════════════════
-- جدول مستقل لا عمود في `contracts`، لنفس السبب الذي فصلها في Firestore: القراءة هناك كانت
-- كلاً لا يتجزأ، فأي حقل داخل العقد يقرأه صاحبه مهما أخفته الواجهة — أي أن كل زبون كان
-- سيعرف هامش ربحنا من مشروعه. هنا RLS تقدر تفصل بالعمود، لكن الفصل يبقى أوضح وأقل عرضة
-- لخطأ سياسة واحد.
create table if not exists public.contract_finance (
  contract_number text primary key references public.contracts(contract_number) on delete cascade,
  cost_iqd        bigint not null default 0,
  updated_at      timestamptz not null default now()
);

-- ═══ المشرفون ═════════════════════════════════════════════════════════════════════════
-- مفتاحه البريد كما كان. القائمة نفسها لا تُسرد أبداً (السياسات) حتى لا تُكتشف بالتخمين.
create table if not exists public.admins (
  email    text primary key check (email = lower(btrim(email))),
  added_at timestamptz not null default now()
);

-- ═══ مرآة الحسابات ════════════════════════════════════════════════════════════════════
-- في Firestore كان الحساب نفسه يكتب صفّه عند كل دخول لأن سرد حسابات Auth كان يتطلّب Admin
-- SDK. هنا يُملأ تلقائياً بمشغّل على auth.users — لا كتابة من المتصفح إطلاقاً، فلا يقدر أحد
-- تزوير بريد أو تاريخ إنشاء.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null check (email = lower(btrim(email))),
  display_name  text not null default '',
  photo_url     text not null default '',
  created_at    timestamptz not null default now(),
  last_sign_in_at timestamptz
);

create index if not exists profiles_email_idx on public.profiles (email);

-- ═══ ملاحظات الأدمن عن الشخص (لا عن عقد) ══════════════════════════════════════════════
create table if not exists public.customer_notes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text not null default '',
  phone      text not null default '',
  city       text not null default '',
  updated_at timestamptz not null default now()
);

-- ═══ رسائل نموذج التواصل ══════════════════════════════════════════════════════════════
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(name) between 1 and 200),
  phone      text not null check (length(phone) between 1 and 40),
  message    text not null check (length(message) between 1 and 5000),
  language   text not null default 'ar',
  created_at timestamptz not null default now()
);

-- ═══ تجاوزات الأسعار وإعدادات الموقع ══════════════════════════════════════════════════
-- الاثنان يقرأهما كل زائر ويكتبهما الأدمن وحده — نفس ما كان.
create table if not exists public.pricing_overrides (
  template_id text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.site_settings (
  key        text primary key,          -- 'social' وحده اليوم
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- ═══ مشغّلات ══════════════════════════════════════════════════════════════════════════

-- updated_at يُضبط في القاعدة لا في الواجهة: كل عميل كان يرسل طابعه الزمني الخاص، ونسيانه
-- في مسار واحد يعني صفّاً يقول إنه لم يُعدَّل منذ إنشائه.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists contracts_touch_updated_at on public.contracts;
create trigger contracts_touch_updated_at
  before update on public.contracts
  for each row execute function public.touch_updated_at();

-- المبلغ المحصَّل وحالة السداد يُشتقّان من دفتر الدفعات، فلا يمكن أن يتناقضا معه.
create or replace function public.recompute_contract_payment_totals()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target text := coalesce(new.contract_number, old.contract_number);
  collected bigint;
  agreed bigint;
begin
  select coalesce(sum(amount_iqd), 0) into collected
    from public.contract_payments where contract_number = target;
  select total_price_iqd into agreed
    from public.contracts where contract_number = target;

  update public.contracts
     set paid_amount_iqd = collected,
         payment_status = case
           when collected <= 0 then 'unpaid'::payment_status
           when agreed > 0 and collected >= agreed then 'paid'::payment_status
           else 'partial'::payment_status
         end
   where contract_number = target;

  return null;
end;
$$;

drop trigger if exists contract_payments_recompute on public.contract_payments;
create trigger contract_payments_recompute
  after insert or update or delete on public.contract_payments
  for each row execute function public.recompute_contract_payment_totals();

-- ساعة بدء التنفيذ تُضبط مرّة واحدة، أول مرّة يصل العقد إلى "قيد التنفيذ" — وهي نقطة الصفر
-- التي تزحف منها نسبة الإنجاز في حساب العميل. إعادة ضبطها مع كل حفظة كانت ستُرجع النسبة
-- إلى الوراء أمامه.
create or replace function public.stamp_development_start()
returns trigger language plpgsql as $$
begin
  if new.status = 'in_development' and old.status is distinct from 'in_development'
     and new.development_started_at is null then
    new.development_started_at := now();
  end if;
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists contracts_stamp_milestones on public.contracts;
create trigger contracts_stamp_milestones
  before update on public.contracts
  for each row execute function public.stamp_development_start();

-- مرآة الحساب تُملأ من Auth مباشرة.
create or replace function public.sync_profile_from_auth()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, photo_url, last_sign_in_at)
  values (
    new.id,
    lower(btrim(coalesce(new.email, ''))),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', ''),
    new.last_sign_in_at
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = case when excluded.display_name <> '' then excluded.display_name else public.profiles.display_name end,
        photo_url = case when excluded.photo_url <> '' then excluded.photo_url else public.profiles.photo_url end,
        last_sign_in_at = excluded.last_sign_in_at;

  -- أول دخول لزبون أنشأ له الأدمن عقداً قبل أن يملك حساباً: يُربط العقد بحسابه الآن، بالبريد.
  update public.contracts
     set user_id = new.id
   where user_id is null
     and email = lower(btrim(coalesce(new.email, '')));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_or_updated on auth.users;
create trigger on_auth_user_created_or_updated
  after insert or update on auth.users
  for each row execute function public.sync_profile_from_auth();
