# NUVAIQ

منصة NUVAIQ — عرض قوالب الويب الجاهزة وطلب العقود الإلكترونية للشركات والمؤسسات.

React 19 · TypeScript · Vite · Tailwind v4 · Supabase

الموقع **ثابت بالكامل** (ملفات HTML/CSS/JS فقط). لا يوجد خادم يعمل في الإنتاج: كل ما يحتاج
صلاحية خادم يمرّ عبر Supabase — قاعدة البيانات محميّة بسياسات RLS، وعمليات الأدمن الحسّاسة
في Edge Function مستقلّة (`supabase/functions/admin-users`).

---

## أولاً: الإعداد لمرّة واحدة

```bash
npm install
```

ثم أنشئ ملف `.env.local` في جذر المشروع (انسخ `.env.example`) واملأ قيمتين فقط:

```ini
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

تجدهما في لوحة Supabase: **Project Settings → API** — الأولى «Project URL» والثانية مفتاح
«anon public».

> **مهم:** بقيّة المتغيّرات في `.env.example` (`SUPABASE_SERVICE_ROLE_KEY`، `SUPABASE_DB_URL`)
> محليّة فقط ولا تدخل البناء إطلاقاً. `service_role` يتجاوز RLS بالكامل — لا يُنشر ولا يأخذ
> بادئة `VITE_`.
>
> كل متغيّر يبدأ بـ`VITE_` **يُحقن داخل ملفات المتصفح** ويقرؤه أي زائر. هذا مقصود ومقبول هنا:
> مفتاح `anon` لا يمنح صلاحية بذاته، وما يحمي البيانات هو RLS لا سرّية المفتاح.

---

## التشغيل محلياً

```bash
npm run dev          # http://localhost:3000
```

---

## البناء والرفع (Cloudflare Pages)

الرفع **يدوي**: تبني على جهازك، ثم تسحب مجلّد `dist` إلى لوحة Cloudflare. لا يوجد ربط
بـ GitHub ولا بناء تلقائي — Cloudflare لا يبني شيئاً، هو يستضيف ما ترفعه كما هو.

### 1. ابنِ محلياً

```bash
npm run build
```

ينتج مجلّد `dist/`. آخر سطر يجب أن يكون:

```text
✓ dist نظيف — 35 ملفاً، كلها مطلوبة للموقع.
```

هذا الفحص (`scripts/check-dist.mjs`) **قائمة سماح**: أي ملف غير معروف في `dist` يوقف البناء
قبل الرفع لا بعده. إن أوقفك، اقرأ الرسالة — لا تُوسّع القائمة لإسكاته.

### 2. ارفع

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → مشروع `nuvaiq`
2. **Create deployment**
3. اسحب مجلّد **`dist`** كاملاً (المجلّد نفسه، لا محتوياته المنتقاة يدوياً)
4. **Save and deploy**

### ⚠️ الخطأ الوحيد الذي يكسر الموقع

`.env.local` يجب أن يكون **مكتملاً قبل** `npm run build`، لا بعده. القيم تُحقن داخل ملفات JS
لحظة البناء، فالبناء بمفتاح ناقص يرفع موقعاً يسقط عند أوّل زائر بهذه الرسالة:

```text
Supabase is not configured: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set at build time.
```

ولا يوجد فحص يمسك هذا قبل الرفع. القاعدة: **عدّل `.env.local` → ابنِ → ارفع**، بهذا الترتيب.

### ملاحظة عن `_redirects` و `_headers`

ملفّان في `public/` ينسخهما Vite إلى جذر `dist/`، وتقرأهما Cloudflare تلقائياً:

- **`_redirects`** — `/privacy` و`/terms`، وحجب `/api/*`، واحتياط تطبيق الصفحة الواحدة.
- **`_headers`** — ترويسات الأمان (CSP وغيرها). تعديل `connect-src` فيه دون فهم يكسر تسجيل
  الدخول أو التحديث اللحظي؛ اقرأ التعليقات داخل الملف أولاً.

---

## أوامر أخرى

```bash
npm run lint          # tsc --noEmit
npm run preview       # معاينة مخرجات البناء محلياً
npm run translations  # إعادة توليد قاموس الترجمة الثابت
npm run db:run        # تنفيذ ملف SQL على القاعدة (محلي، يحتاج SUPABASE_DB_URL)
npm run clean         # حذف dist
```

---

## الدوال السحابية

`supabase/functions/admin-users` — تعطيل وحذف الحسابات (تحتاج `service_role`، فلا مكان لها في
المتصفح). تُنشر من لوحة Supabase مباشرة: **Edge Functions → Deploy a new function → Via Editor**،
أو عبر `supabase functions deploy`. لا علاقة لها بـ Cloudflare إطلاقاً — تعمل على خوادم Supabase
بغضّ النظر عن مكان استضافة الواجهة.
