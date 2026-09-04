import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * حارس النشر: لا يُرفع إلى Netlify إلا ما يحتاجه الموقع فعلاً.
 *
 * ## لماذا حارس لا مجرّد ثقة
 * Netlify ينشر مجلّد `dist` كما هو. وVite يبنيه من مصدرين: ملفاتنا المترجَمة، و**كل ما في
 * `public/` يُنسَخ حرفياً بلا سؤال**. فأي ملف يُترك هناك يوماً — نسخة احتياطية، مفتاح، ملاحظة،
 * لقطة شاشة — يُنشر على الإنترنت العام بلا أن ينتبه أحد، ويبقى منشوراً حتى يلاحظه أحد صدفةً.
 *
 * لهذا القائمة أدناه **قائمة سماح لا قائمة منع**: كل ما لا يُذكر فيها يوقف النشر. منع
 * `*.env` وحده كان سيمرّر `config.backup.json`؛ أمّا السماح بما نعرفه فيمسك كل ما لا نعرفه.
 *
 * يُشغَّل بعد البناء مباشرة (انظر `command` في netlify.toml)، ففشله يعني نشراً لم يقع — لا
 * نشراً وقع ثم اكتُشف.
 */

const DIST = 'dist';

/** ما يُسمح بنشره، ولماذا. أي إضافة هنا قرار واعٍ لا سهو. */
const ALLOWED = [
  { test: /^index\.html$/, why: 'الصفحة نفسها' },
  { test: /^assets\/[A-Za-z0-9_-]+\.(js|css)$/, why: 'حزم التطبيق (أسماؤها بصمات محتوى)' },
  { test: /^assets\/vendor(-[a-z]+)?-[A-Za-z0-9_-]+\.js$/, why: 'حزم المكتبات' },
  { test: /^assets\/[A-Za-z0-9_-]+\.(webp|png|jpg|svg|woff2)$/, why: 'أصول مستورَدة من الكود' },
  { test: /^fonts\/[a-z0-9-]+\.woff2$/, why: 'خطوط مستضافة ذاتياً' },
  { test: /^icons\/(favicon|icon-192|icon-512)\.png$/, why: 'أيقونات المتصفح والتثبيت' },
  { test: /^og-image\.png$/, why: 'صورة معاينة الرابط' },
  { test: /^manifest\.webmanifest$/, why: 'بيان تطبيق الويب' },
  { test: /^sw\.js$/, why: 'عامل الخدمة' },
  { test: /^gtag-init\.js$/, why: 'قصاصة التحليلات (خارج HTML بسبب CSP)' },
];

/** ما لا يجوز أن يظهر أبداً — يُفحَص أوّلاً ليعطي رسالة أوضح من "غير مسموح". */
const NEVER = [
  { test: /\.env/i, what: 'ملف بيئة' },
  { test: /\.sql$/i, what: 'مخطّط أو سياسات قاعدة' },
  { test: /\.map$/i, what: 'خريطة مصدر (تكشف الكود الأصلي كاملاً)' },
  { test: /service-account|credential|secret|private[-_]?key/i, what: 'ملف اعتماد' },
  { test: /\.(pem|key|p12|pfx)$/i, what: 'مفتاح' },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(relative(DIST, full).split(sep).join('/'));
  }
  return out;
}

let files;
try {
  files = walk(DIST);
} catch {
  console.error(`✗ لا يوجد مجلّد ${DIST}/ — البناء لم يقع.`);
  process.exit(1);
}

const forbidden = [];
const unknown = [];

for (const file of files) {
  const banned = NEVER.find((rule) => rule.test.test(file));
  if (banned) {
    forbidden.push(`${file}  ← ${banned.what}`);
    continue;
  }
  if (!ALLOWED.some((rule) => rule.test.test(file))) unknown.push(file);
}

if (forbidden.length || unknown.length) {
  console.error('\n✗ النشر متوقّف: مجلّد dist يحوي ما لا يجوز نشره.\n');
  if (forbidden.length) {
    console.error('  ملفات ممنوعة قطعاً:');
    for (const f of forbidden) console.error('   ·', f);
  }
  if (unknown.length) {
    console.error('\n  ملفات غير معروفة (ليست في قائمة السماح):');
    for (const f of unknown) console.error('   ·', f);
    console.error('\n  إن كان أحدها مطلوباً فعلاً، أضِفه إلى ALLOWED في scripts/check-dist.mjs');
    console.error('  مع سبب وجوده — لا تُوسَّع القائمة لإسكات الفحص.');
  }
  console.error('');
  process.exit(1);
}

console.log(`✓ dist نظيف — ${files.length} ملفاً، كلها مطلوبة للموقع.`);
