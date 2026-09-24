/**
 * قلب إضاءة لونٍ مع إبقاء صبغته وتشبّعه: `L* → 100 − L*` في فضاء CIELAB.
 *
 * ## لماذا يوجد هذا، ولماذا ليس في CSS
 *
 * السِمة الليليّة في index.css هي هذه العمليّة بالضبط، مطبَّقةً مسبقاً على رموز اللوحة (انظر
 * `html[data-theme='dark']` هناك). وذلك يكفي كلّ ما يُرسَم بالـCSS. ولا يكفي WebGL:
 * `THREE.Color` لا تقبل `var()`، وألوان الحقل ليست رموز اللوحة أصلاً بل مشتقّاتٌ منها —
 * `shadeColor(WHITE, -0.14)` ليست لوناً له رمز يُقلَب، فلا سبيل إلى قلبها إلّا بحسابها.
 *
 * وهذا سليمٌ لا حيلة: السِمة الليليّة كلّها معرَّفةٌ بأنّها هذا القلب، فتطبيقه على مشتقٍّ
 * يعطي ما كان سيعطيه لو أنّ المشتقّ نفسه كان رمزاً في اللوحة. المصدر واحد والنتيجة واحدة.
 *
 * ## ولماذا CIELAB لا `255 − قناة`
 *
 * القلب القنويّ يقلب الصبغة معها: الأبيض الدافئ `#F7F7F5` يخرج منه أسودٌ مزرقٌّ بارد، وهو
 * بالضبط ما يجعل القلب الساذج يُقرأ «خطأً» دون أن يُعرف السبب. القلب في الإضاءة وحدها
 * يُبقي الهويّة — نفس الصبغة، نفس التشبّع، إضاءةٌ معكوسة.
 *
 * ## النتيجة مخزَّنة
 *
 * الحقل يستدعيها لستّة ألوان × أربعة أحزمة عند كلّ تبديل سِمة، والحساب ثابتٌ لكلّ مدخل —
 * فالخريطة هنا تكفي، ولا تنمو لأنّ عدد الألوان في الموقع محدود.
 */

const cache = new Map<string, string>();

const toLinear = (c: number): number => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const toSrgb = (c: number): number => {
  const v = Math.max(0, Math.min(1, c));
  return Math.round((v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255);
};

// sRGB ⇄ XYZ عند D65، ونقطة البياض نفسها.
const M = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.715_1522, 0.072_175],
  [0.0193339, 0.119_192, 0.9503041],
];
const MI = [
  [3.2404542, -1.5371385, -0.4985314],
  [-0.969266, 1.8760108, 0.041556],
  [0.0556434, -0.2040259, 1.0572252],
];
const WP = [0.95047, 1.0, 1.08883];

const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
const fInv = (t: number): number => (t ** 3 > 216 / 24389 ? t ** 3 : ((t - 4 / 29) * 108) / 841);

/** يقبل `#RGB` و`#RRGGBB`؛ ويعيد ما أُعطي كما هو إن لم يكن أيّاً منهما. */
export function invertLightness(input: string): string {
  const raw = input.trim();
  const cached = cache.get(raw);
  if (cached) return cached;

  let hex = raw.startsWith('#') ? raw.slice(1) : '';
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return raw;

  const rgb = [0, 2, 4].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16)));
  const xyz = M.map((row) => row.reduce((acc, m, i) => acc + m * rgb[i], 0));
  const [fx, fy, fz] = xyz.map((v, i) => f(v / WP[i]));

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  const fy2 = (100 - L + 16) / 116;
  const back = [fInv(fy2 + a / 500) * WP[0], fInv(fy2) * WP[1], fInv(fy2 - b / 200) * WP[2]];
  const out =
    '#' +
    MI.map((row) => toSrgb(row.reduce((acc, m, i) => acc + m * back[i], 0)))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

  cache.set(raw, out);
  return out;
}
