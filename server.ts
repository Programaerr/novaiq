import express from 'express';
import path from 'path';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ---------------------------------------------------------------------------
// لا Firebase Admin SDK هنا بعد اليوم.
//
// كان يشغّل ثلاثة مسارات إدارية (سرد الحسابات، تعطيلها، حذفها)، ولم يبقَ منها شيء: السرد
// انتقل إلى قراءة مجموعة `users` مباشرة من المتصفح (lib/adminUsers.ts، وقاعدة Firestore
// تقصر `list` عليها على الأدمن)، والتعطيل والحذف انتقلا إلى Firebase Console — فكلاهما
// يتطلّب مفتاح حساب خدمة، ومفتاح كهذا يعني دالّة سحابية على Netlify، وهي ما نتخلّص منه.
//
// وهذا الخادم لم يكن يُنشر أصلاً (netlify.toml يبني `npx vite build` وحده) — يعمل محلياً
// فقط عبر `npm run dev`. إبقاء مسارات ميّتة فيه كان سيجعله يقول إن الميزة موجودة.
// ---------------------------------------------------------------------------

function getLocalNetworkIP(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

// Behind a reverse proxy (nginx on the deployment box) every request arrives from the proxy's
// own address, so req.ip is identical for all of them and any per-IP limit becomes a global
// one. Trusting the first hop fixes that — but only when there genuinely is a proxy in front:
// trusting a hop that does not exist lets a direct client forge X-Forwarded-For and hand
// itself a fresh identity per request. Hence a number from the environment, defaulting to
// zero, rather than a hardcoded `true`.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 0);

// 10mb سابقاً بلا حاجة: أكبر جسم طلب حقيقي هنا هو دفعة ترجمة صفحة كاملة (نصوص قصيرة)، أما
// توقيع العقد وصوره فتذهب إلى Firestore من المتصفح مباشرة ولا تمرّ من هنا إطلاقاً. سقف أقل
// = سطح إرهاق أصغر: 120 طلباً بالدقيقة × 10mb تحليل JSON كانت طريقة رخيصة لإشغال السيرفر.
app.use(express.json({ limit: '4mb' }));

// ---------------------------------------------------------------------------
// ترويسات الأمان — نسخة مطابقة لما يضبطه netlify.toml على الاستضافة، مكرّرة هنا لأن هذا
// الخادم هو ما يعمل محلياً وعلى أي استضافة Node مستقبلاً؛ الموقع يجب أن يكون محمياً بنفس
// القدر في الحالتين لا في واحدة فقط. راجع تعليقات netlify.toml لسبب كل قيمة (خصوصاً
// same-origin-allow-popups التي بدونها يتعطّل تسجيل دخول Google).
// ---------------------------------------------------------------------------
const CSP = [
  "default-src 'self'",
  // تسجيل دخول Google ليس سكربتاً من عندنا: Firebase Auth يحمّل apis.google.com/js/api.js
  // ثم إطار الدخول من نطاق المشروع على firebaseapp.com. بدون هذه الثلاثة تمنع CSP الملف
  // فيفشل الدخول صامتاً — وهي نطاقات Google/Firebase الرسمية فقط، لا فتح عام.
  "script-src 'self' https://apis.google.com https://www.gstatic.com https://*.firebaseapp.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.firebaseio.com https://*.firebasestorage.app https://*.firebaseapp.com wss://*.firebaseio.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com",
  "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://apis.google.com https://*.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

app.use((_req, res, next) => {
  // في التطوير يحقن Vite سكربتات ووحدات inline (HMR)، فـ script-src 'self' وحدها تكسر
  // الصفحة كلياً؛ لذلك تُطبَّق CSP في الإنتاج فقط، بينما بقية الترويسات آمنة في الحالتين.
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  // اسم/إصدار Express لا يفيد أي زائر، ويفيد فقط من يبحث عن ثغرة معروفة في إصدار بعينه.
  res.removeHeader('X-Powered-By');
  next();
});
app.disable('x-powered-by');

// ---------------------------------------------------------------------------
// Rate limiting — written here rather than pulled from express-rate-limit. This is the entire
// feature in twenty lines, and a dependency taken on for twenty lines is one that has to be
// audited, updated and carried forever.
//
// Fixed window per IP. In-memory on purpose: the site runs as a single Node process, so there
// is no second instance to share counters with, and a limiter that survives a restart is not
// worth a database round-trip on every request.
// حدّ معدّل الطلبات حُذف مع مسارات /api التي كان يحرسها وحدها — لم يبقَ في هذا الخادم إلا
// ملفات ثابتة وإعادة توجيه، وهي لا تُحمى بعدّاد في الذاكرة. أمّا الموقع المنشور فخلف Netlify
// أصلاً، لا خلف هذا الملف.

app.get(['/privacy', '/terms'], (req, res) => {
  res.redirect(301, `/?page=${req.path === '/terms' ? 'terms' : 'privacy'}`);
});

// API Health Check
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const networkIP = getLocalNetworkIP();
    console.log('');
    console.log('  NUVAIQ Server is running:');
    console.log(`  ➜  Local:   http://localhost:${PORT}`);
    if (networkIP) {
      console.log(`  ➜  Network: http://${networkIP}:${PORT}`);
    }
    console.log('');
  });
}

startServer();
