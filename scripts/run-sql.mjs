import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

/**
 * ينفّذ ملف SQL مباشرة على قاعدة Supabase — بديل نسخ محتوى الملف يدوياً إلى SQL Editor.
 *
 * الاستعمال:
 *   node scripts/run-sql.mjs                     ← بلا ملف: فحص اتصال فقط، لا يعدّل شيئاً
 *   node scripts/run-sql.mjs supabase/01_schema.sql
 *   npm run db:run -- supabase/01_schema.sql
 *
 * لماذا استعلام واحد لا تقسيم الملف إلى جمل: `pg` يرسل النصّ الخام كما هو عبر "simple query
 * protocol" حين لا توجد قيم مُعامَلة ($1، $2...)، والخادم نفسه يفهم الفواصل المنقوطة داخل
 * أجسام الدوالّ (`$$ ... $$`) تماماً كما يفهمها عند اللصق في SQL Editor أو التشغيل بـ psql —
 * فتقسيم الملف يدوياً هنا كان سيكسر كل دالّة بجسم متعدد الجمل.
 *
 * والرابط يُقرأ من `.env` المحلي وحده عبر `dotenv` — لا يُطبع ولا يُكتب في أي ملف آخر.
 */

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('✗ SUPABASE_DB_URL غير موجود في .env — راجع .env.example لمعرفة الاسم المطلوب.');
  process.exit(1);
}

const filePath = process.argv[2];

const client = new Client({
  connectionString: dbUrl,
  // Supabase يفرض SSL دائماً، وشهادتها تُتحقَّق كاملة هنا (لا rejectUnauthorized: false) —
  // تعطيل التحقّق يفتح الباب لهجوم وسيط لو تلاعب أحد بالـDNS نحو هذا العنوان تحديداً.
  ssl: true,
});

try {
  await client.connect();

  if (!filePath) {
    const res = await client.query('select current_database() as db, now() as time');
    console.log('✓ الاتصال ناجح —', res.rows[0]);
  } else {
    const sql = readFileSync(filePath, 'utf8');
    console.log(`▶ تنفيذ ${filePath} ...`);
    await client.query(sql);
    console.log('✓ تم التنفيذ بنجاح');
  }
} catch (err) {
  console.error('✗ فشل:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
