import type { Config, Context } from '@netlify/functions';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * مسارات /api/admin/* في الإنتاج.
 *
 * Netlify يستضيف ملفات ثابتة ولا يشغّل خادم Express (server.ts)، فكانت هذه المسارات غير
 * موجودة أصلاً على الموقع المنشور: تبويبا "الفريق" و"المشتركون" في لوحة التحكم يطلبانها
 * فيحصلان على صفحة HTML بدل JSON. هذه الدالة تنفّذ نفس المسارات كدالة Netlify واحدة.
 *
 * ## لماذا دالة واحدة لا ثلاث
 * ثلاث دوال = ثلاث نسخ من تهيئة Firebase Admin وثلاث بدايات باردة مستقلة. المسارات هنا قليلة
 * ومترابطة، فمُوجِّه صغير داخل دالة واحدة أسرع وأسهل صيانة.
 *
 * ## المفتاح
 * يُقرأ من متغيّر البيئة `FIREBASE_SERVICE_ACCOUNT` (محتوى ملف JSON كاملاً) — لا يُرفع الملف
 * إلى المستودع أبداً. بدونه تردّ الدالة 503 برسالة واضحة بدل أن تنهار.
 */

let cachedApp: App | null = null;

function adminApp(): App | null {
  if (cachedApp) return cachedApp;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const serviceAccount = JSON.parse(raw);
    cachedApp = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
    return cachedApp;
  } catch (error) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT:', error);
    return null;
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** نفس فحص requireAdmin في server.ts: رمز دخول صالح + بريد موجود في مجموعة admins. */
async function requireAdmin(req: Request): Promise<{ uid: string } | Response> {
  const app = adminApp();
  if (!app) return json({ error: 'Firebase Admin is not configured on this deploy' }, 503);

  const header = req.headers.get('authorization') || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) return json({ error: 'Missing auth token' }, 401);

  try {
    const decoded = await getAuth(app).verifyIdToken(idToken);
    const email = (decoded.email || '').trim().toLowerCase();
    if (!email || decoded.email_verified !== true) return json({ error: 'Unverified account' }, 403);

    const adminDoc = await getFirestore(app).collection('admins').doc(email).get();
    if (!adminDoc.exists) return json({ error: 'Not an admin' }, 403);

    return { uid: decoded.uid };
  } catch (error) {
    console.error('Admin auth check failed:', error);
    return json({ error: 'Invalid or expired token' }, 401);
  }
}

export default async (req: Request, context: Context) => {
  const app = adminApp();
  const path = new URL(req.url).pathname;

  if (path === '/api/health') {
    return json({ status: 'ok', app: 'NUVAIQ', adminConfigured: !!app });
  }

  const gate = await requireAdmin(req);
  if (gate instanceof Response) return gate;
  const auth = getAuth(app as App);
  const db = getFirestore(app as App);

  // GET /api/admin/users
  if (path === '/api/admin/users' && req.method === 'GET') {
    const result = await auth.listUsers(1000);
    return json({
      users: result.users.map((u) => ({
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || '',
        photoURL: u.photoURL || '',
        disabled: u.disabled,
        createdAt: u.metadata.creationTime,
        lastSignInAt: u.metadata.lastSignInTime,
      })),
    });
  }

  // PATCH / DELETE /api/admin/users/:uid
  const userMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userMatch) {
    const uid = decodeURIComponent(userMatch[1]);

    if (req.method === 'PATCH') {
      const body = (await req.json().catch(() => ({}))) as { disabled?: boolean; displayName?: string };
      const update: { disabled?: boolean; displayName?: string } = {};
      if (typeof body.disabled === 'boolean') update.disabled = body.disabled;
      if (typeof body.displayName === 'string') update.displayName = body.displayName;
      const updated = await auth.updateUser(uid, update);
      if (typeof body.disabled === 'boolean') {
        await db.collection('users').doc(uid).set({ disabled: body.disabled }, { merge: true }).catch(() => {});
      }
      return json({
        user: {
          uid: updated.uid,
          email: updated.email || '',
          displayName: updated.displayName || '',
          disabled: updated.disabled,
        },
      });
    }

    if (req.method === 'DELETE') {
      // نفس الحماية الموجودة في server.ts: أدمن لا يحذف حسابه من هذه الشاشة، وإلا خسر وصوله
      // إليها في نفس اللحظة بلا طريق للرجوع.
      if (gate.uid === uid) return json({ error: 'Cannot delete your own account from this panel' }, 400);
      await auth.deleteUser(uid);
      await db.collection('users').doc(uid).delete().catch(() => {});
      return json({ success: true });
    }
  }

  // GET /api/admin/team
  if (path === '/api/admin/team' && req.method === 'GET') {
    const adminsSnap = await db.collection('admins').get();
    const team = await Promise.all(
      adminsSnap.docs.map(async (docSnap) => {
        const email = docSnap.id;
        const addedAt = docSnap.data().addedAt || null;
        try {
          const userRecord = await auth.getUserByEmail(email);
          return {
            email,
            addedAt,
            hasAccount: true,
            uid: userRecord.uid,
            displayName: userRecord.displayName || '',
            photoURL: userRecord.photoURL || '',
          };
        } catch {
          return { email, addedAt, hasAccount: false, uid: '', displayName: '', photoURL: '' };
        }
      })
    );
    team.sort((a, b) => new Date(a.addedAt || 0).getTime() - new Date(b.addedAt || 0).getTime());
    return json({ team });
  }

  return json({ error: 'Not found' }, 404);
};

export const config: Config = {
  path: ['/api/health', '/api/admin/users', '/api/admin/users/:uid', '/api/admin/team'],
};
