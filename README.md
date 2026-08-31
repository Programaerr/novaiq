# NUVAIQ

منصة NUVAIQ — عرض قوالب الويب الجاهزة وطلب العقود الإلكترونية للشركات والمؤسسات.

React 19 · TypeScript · Vite · Tailwind v4 · Firebase · Express

## التشغيل محلياً

**المتطلبات:** Node.js

```bash
npm install
npm run dev        # يشغّل server.ts عبر tsx (واجهة + API على نفس المنفذ)
```

## البناء والنشر

```bash
npm run build      # vite build للواجهة + esbuild للسيرفر → dist/server.cjs
npm start          # node dist/server.cjs
```

## الإعداد

لا يحتاج المشروع أي مفتاح API لكي يعمل. المتغيرات الاختيارية:

| المتغير | لماذا | بدونه |
|---|---|---|
| `PORT` | منفذ السيرفر | 3000 |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | مفتاح Firebase Admin، لازم للوحة «المشتركين» فقط | مسارات `/api/admin/*` ترد بـ503، وبقية الموقع يعمل طبيعياً (الافتراضي `./service-account.json`) |

الترجمة التلقائية (`/api/translate`) تستعمل واجهة Google Translate العامة المجانية — بلا مفتاح ولا حساب فوترة — وتخزّن النتائج في `.translation-cache.json`.

## أوامر أخرى

```bash
npm run lint          # tsc --noEmit
npm run translations  # إعادة توليد قاموس الترجمة الثابت
```
