import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth, type UpdateRequest } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ---------------------------------------------------------------------------
// Firebase Admin SDK — powers the "Subscribers" panel (list/disable/delete any
// registered account). The client SDK can only ever act on the currently signed-in
// user, so listing or deleting OTHER people's accounts has to happen here, with a real
// service account key that never reaches the browser. Initialization is optional: if no
// key is present, the /api/admin/users routes below respond with a clear 503 instead of
// crashing the whole server (translation/PDF/contract features don't depend on this).
let adminSdkReady = false;
try {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'service-account.json');
  if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
    initializeApp({ credential: cert(serviceAccount) });
    adminSdkReady = true;
    console.log('Firebase Admin SDK initialized (subscriber management enabled).');
  } else {
    console.warn(`Firebase Admin SDK not initialized — no service account key found at ${keyPath}. The Subscribers panel will be unavailable until one is added.`);
  }
} catch (e) {
  console.error('Failed to initialize Firebase Admin SDK:', e);
}

// Verifies the request carries a valid Firebase ID token AND that its email is in the
// admins Firestore collection — the same allowlist the client already trusts elsewhere.
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!adminSdkReady) {
    return res.status(503).json({ error: 'Firebase Admin SDK not configured on the server' });
  }
  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'Missing auth token' });

    const decoded = await getAuth().verifyIdToken(idToken);
    const email = (decoded.email || '').trim().toLowerCase();
    if (!email) return res.status(403).json({ error: 'No email on token' });

    const adminDoc = await getFirestore().collection('admins').doc(email).get();
    if (!adminDoc.exists) return res.status(403).json({ error: 'Not an admin' });

    (req as any).adminUid = decoded.uid;
    next();
  } catch (e) {
    console.error('Admin auth check failed:', e);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Find the machine's LAN IP so the server can also be reached from other devices on the same network
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
// ---------------------------------------------------------------------------
function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const entry = hits.get(key);

    if (!entry || now >= entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      // Sweep expired keys once the map is large enough to be worth sweeping, so a long
      // uptime cannot grow it without bound. Only runs on a window rollover, so it is not
      // on the hot path.
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (now >= v.resetAt) hits.delete(k);
      }
      return next();
    }

    if (entry.count >= max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests' });
    }

    entry.count += 1;
    return next();
  };
}

// A ceiling on the whole API, generous enough that no real visitor meets it.
app.use('/api', rateLimit({ windowMs: 60_000, max: 120 }));
// Translation is tighter: every miss is an outbound call to Google's endpoint and a new entry
// in the on-disk cache, so it is the one route where a script costs us something real.
const translateLimit = rateLimit({ windowMs: 60_000, max: 20 });

// نفس الروابط النظيفة التي يضبطها netlify.toml، حتى يتصرّف التشغيل المحلي/الذاتي مثل
// الاستضافة تماماً: /privacy و/terms هما الرابطان المُسلَّمان لشاشة موافقة Google، ويجب
// ألا يعملا في مكان دون آخر.
app.get(['/privacy', '/terms'], (req, res) => {
  res.redirect(301, `/?page=${req.path === '/terms' ? 'terms' : 'privacy'}`);
});

// API Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'NUVAIQ Cosmic Engine' });
});

// ---------------------------------------------------------------------------
// Auto-Translation (Arabic -> English) for dynamic/free-text content that isn't part of
// the static UI dictionary — a client's custom feature notes, a template's add-on spec
// labels, or any section added later.
//
// Deliberately NOT AI-based: it proxies the free public Google Translate endpoint, so it
// needs no API key and no billing account and runs on any plain Node host.
//
// Results are cached to disk and shared by every visitor. Without this, each browser
// re-translated the entire site on its first visit; now the first request for a given
// string is the only one that ever hits the network, and the cache survives restarts.
// ---------------------------------------------------------------------------

const TRANSLATION_CACHE_FILE = path.join(process.cwd(), '.translation-cache.json');

function loadTranslationCache(): Record<string, string> {
  try {
    if (fs.existsSync(TRANSLATION_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(TRANSLATION_CACHE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Could not read translation cache, starting empty:', e);
  }
  return {};
}

const translationCache: Record<string, string> = loadTranslationCache();
let cacheWriteTimer: NodeJS.Timeout | null = null;

// Debounced so a burst of new strings results in one disk write, not one per string.
function persistTranslationCache() {
  if (cacheWriteTimer) clearTimeout(cacheWriteTimer);
  cacheWriteTimer = setTimeout(() => {
    try {
      fs.writeFileSync(TRANSLATION_CACHE_FILE, JSON.stringify(translationCache, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not persist translation cache:', e);
    }
  }, 1000);
}

/* رمز اللغة يُركَّب داخل رابط الطلب الخارج (sl=/tl= أدناه)، فقبوله كما يصل من المتصفح كان
   يعني السماح بحقن معاملات إضافية في ذلك الرابط عبر قيمة مثل "ar&x=y" — لا يغيّر الوجهة (اسم
   المضيف ثابت في الكود) لكنه يعبث بالطلب وبمفتاح الكاش. رمزان أو رمزان-وبلد، لا أكثر. */
const LANG_CODE = /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/;
/** أطول نص واحد يُقبل للترجمة — أطول من أي نص واجهة، ويغطّي وصف مشروع كاملاً في عقد. */
const MAX_TEXT_LEN = 5000;
/** أكبر دفعة: صفحة كاملة تُترجَم دفعة واحدة، لكن ليس عدداً غير محدود يولّده سكربت. */
const MAX_BATCH = 500;

async function translateOne(text: string, source: string, target: string): Promise<string> {
  const cacheKey = `${source}:${target}:${text}`;
  if (translationCache[cacheKey]) return translationCache[cacheKey];

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translate service responded with ${response.status}`);
  }

  const data = await response.json();
  // Response shape: [[[translatedChunk, originalChunk, ...], ...], ...] — Google splits
  // long input into sentence chunks; join them back into one string.
  const translated = ((data[0] || []) as any[]).map((segment) => segment[0]).join('');

  if (translated) {
    translationCache[cacheKey] = translated;
    persistTranslationCache();
  }
  return translated;
}

app.post('/api/translate', translateLimit, async (req, res) => {
  try {
    const { text, texts, source = 'ar', target = 'en' } = req.body;

    if (
      typeof source !== 'string' || typeof target !== 'string' ||
      !LANG_CODE.test(source) || !LANG_CODE.test(target)
    ) {
      return res.status(400).json({ error: 'Invalid language code' });
    }

    // Batch form — one request for a whole page's worth of strings instead of N.
    if (Array.isArray(texts)) {
      if (texts.length > MAX_BATCH) {
        return res.status(413).json({ error: `Too many items (max ${MAX_BATCH})` });
      }
      const results = await Promise.all(
        texts.map(async (item: unknown) => {
          if (typeof item !== 'string' || !item.trim() || item.length > MAX_TEXT_LEN) return '';
          try {
            return await translateOne(item.trim(), source, target);
          } catch {
            return '';
          }
        })
      );
      return res.json({ translations: results });
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text or texts is required' });
    }
    if (text.length > MAX_TEXT_LEN) {
      return res.status(413).json({ error: `Text too long (max ${MAX_TEXT_LEN})` });
    }

    const translated = await translateOne(text.trim(), source, target);
    return res.json({ translated });
  } catch (error: any) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: error.message || 'Translation failed' });
  }
});

// ---------------------------------------------------------------------------
// Subscriber management — list every registered account and let an admin disable or
// permanently delete one. All three routes are gated by requireAdmin above.
// ---------------------------------------------------------------------------

app.get('/api/admin/users', requireAdmin, async (_req, res) => {
  try {
    // 1000 is the max a single listUsers() page can return; this business is nowhere
    // near that yet, so pagination isn't wired up — trivial to add via .pageToken later.
    const result = await getAuth().listUsers(1000);
    const users = result.users.map((u) => ({
      uid: u.uid,
      email: u.email || '',
      displayName: u.displayName || '',
      photoURL: u.photoURL || '',
      disabled: u.disabled,
      createdAt: u.metadata.creationTime,
      lastSignInAt: u.metadata.lastSignInTime,
    }));
    res.json({ users });
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({ error: error.message || 'Failed to list users' });
  }
});

app.patch('/api/admin/users/:uid', requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { disabled, displayName } = req.body;
    const update: UpdateRequest = {};
    if (typeof disabled === 'boolean') update.disabled = disabled;
    // سقف الطول: لا سبب لاسم عرض أطول من هذا، وبدونه يُكتب أي حجم يرسله الطلب في سجلّ حساب.
    if (typeof displayName === 'string' && displayName.length <= 200) update.displayName = displayName;
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const updated = await getAuth().updateUser(uid, update);

    // Keep the client-readable `users` mirror (src/lib/auth.ts) in sync — the Subscribers/
    // Team panels list from that collection directly now, not from this route.
    if (typeof disabled === 'boolean') {
      await getFirestore().collection('users').doc(uid).set({ disabled }, { merge: true }).catch(() => {});
    }

    res.json({
      user: {
        uid: updated.uid,
        email: updated.email || '',
        displayName: updated.displayName || '',
        disabled: updated.disabled,
      },
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:uid', requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    if ((req as any).adminUid === uid) {
      return res.status(400).json({ error: 'Cannot delete your own account from this panel' });
    }
    await getAuth().deleteUser(uid);
    await getFirestore().collection('users').doc(uid).delete().catch(() => {});
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// ---------------------------------------------------------------------------
// Team roster — the admins Firestore collection only stores email + addedAt (its
// `list` operation is denied to clients, so even a signed-in admin can't scan it
// themselves; see isAdminEmail in src/lib/auth.ts). Cross-referencing it against Auth
// records here is what lets the dashboard show each teammate's real name/photo instead
// of just a bare email string.
// ---------------------------------------------------------------------------

app.get('/api/admin/team', requireAdmin, async (_req, res) => {
  try {
    const adminsSnap = await getFirestore().collection('admins').get();
    const team = await Promise.all(
      adminsSnap.docs.map(async (docSnap) => {
        const email = docSnap.id;
        const addedAt = docSnap.data().addedAt || null;
        try {
          const userRecord = await getAuth().getUserByEmail(email);
          return {
            email,
            addedAt,
            hasAccount: true,
            uid: userRecord.uid,
            displayName: userRecord.displayName || '',
            photoURL: userRecord.photoURL || '',
          };
        } catch {
          // Added as an admin but hasn't signed up with this email yet.
          return { email, addedAt, hasAccount: false, uid: '', displayName: '', photoURL: '' };
        }
      })
    );
    team.sort((a, b) => new Date(a.addedAt || 0).getTime() - new Date(b.addedAt || 0).getTime());
    res.json({ team });
  } catch (error: any) {
    console.error('List team error:', error);
    res.status(500).json({ error: error.message || 'Failed to list team' });
  }
});

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
