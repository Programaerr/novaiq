/**
 * حركة الخلفية في قسم "أعمالنا" — لكلّ عميل نمطٌ يشبه شغله.
 *
 * ## لماذا جدول بيانات لا مشهد لكلّ نمط
 *
 * الطلب كان: خلفية كلّ كارت تتحرّك بما يناسب صاحبها — أكواد تنزل خلف nuvaiq، وأقمشة تطير خلف
 * VANTOR، وهكذا. والطريق المباشر إلى ذلك ستّة مشاهد three.js منفصلة، وهو الطريق الذي يقتل هذه
 * الميزة قبل أن تُشحن: كلّ مشهد سياق WebGL، والمتصفّح يحفظ نحو ستة عشر ثمّ يقتل الأقدم. وقد
 * دُفع هذا الثمن في هذا المستودع مرّة (انظر ColorWheel.tsx: ثلاث عجلات لون كانت تُسقط حقول
 * المكعّبات من الميزانية نفسها)، فلا يُدفع ثانية.
 *
 * فالأنماط هنا **بيانات لا كود**: مادّة واحدة، هندسة واحدة، سياق واحد، ونداء رسم واحد. وتبديل
 * النمط تبديلُ قيم uniforms — بلا إعادة بناء، وبلا ترجمة shader ثانية، وبلا إطار ضائع.
 *
 * ## ولماذا كلّها بلون واحد
 *
 * الهويّة هنا في **الشكل والحركة** لا في اللون: أكواد تنزل في أعمدة، أقمشة تطفو وتتمايل،
 * بطاقات تصعد. واللون يبقى Slate الموقع نفسه بشفافيّة منخفضة، لسببين: الشعار والاسم يقفان فوق
 * هذه الحركة ويجب أن يبقيا مقروءين، وستّة ألوان مخترعة كانت ستجعل القسم يبدو مستعاراً من موقع
 * آخر. النمط يُعرَف من حركته، لا من كونه أزرق.
 */

export type WorkMotifId = 'spark' | 'code' | 'fashion' | 'commerce' | 'beauty' | 'tools' | 'none';

/** أكبر عدد جزيئات تُخصَّص مرّة واحدة. الأنماط الأقلّ كثافة تُخفي الفائض بـ`uCount`. */
export const MOTIF_MAX_COUNT = 240;

/** أشكال الجزيء. أرقام لا أسماء لأنّها تعبر إلى الـshader كـuniform. */
export const SHAPE_GLYPH = 0;
export const SHAPE_CIRCLE = 1;
export const SHAPE_RECT = 2;
export const SHAPE_DIAMOND = 3;

export interface MotifSpec {
  id: WorkMotifId;
  labelAr: string;
  labelEn: string;
  /** كم جزيئاً يظهر فعلاً (≤ MOTIF_MAX_COUNT). */
  count: number;
  /** ضلع الجزيء بالبكسل — وحدات المشهد بكسلات، فالكاميرا متعامدة بتكبير 1. */
  size: number;
  /** ‎+1 ينزل، ‎−1 يصعد. */
  dirY: 1 | -1;
  /** بكسل في الثانية. */
  speed: number;
  /** سعة التمايل الجانبي بالبكسل، وعدد دوراته في العبور الواحد. */
  swayAmp: number;
  swayFreq: number;
  /** دوران الجزيء حول نفسه، لفّة/ثانية. */
  spin: number;
  shape: number;
  /** أعمدة ثابتة بدل توزيع عشوائي — للأكواد وحدها. صفر = بلا أعمدة. */
  lanes: number;
  /** خفوت مع مسافة العبور: 1 يجعل رأس العمود ساطعاً وذيله باهتاً. */
  trail: number;
  /** الشفافيّة القصوى. تحت هذه القيمة يبقى الاسم فوقها مقروءاً — مقيسة، لا مُقدَّرة. */
  alpha: number;
  /** أوّل خانة يملكها النمط في الأطلس، وكم خانة. تُقرأ في WorkMotif.tsx، وترتيبها هناك. */
  glyphBase: number;
  glyphSpan: number;
}

/**
 * الترتيب هو ترتيب القائمة في لوحة الأدمن، و`spark` أوّلها لأنّه الافتراضي.
 *
 * و`spark` محايد عن قصد: جزيئات ناعمة لا تدّعي شيئاً عن عمل الشركة. الفرق مهمّ — هؤلاء
 * عملاء حقيقيّون، ووضع "أكواد" خلف شركة لا نعرف أنّها برمجية ادّعاءٌ عنها لا زخرفة. يبقى
 * المحايد حتى يختار المالك من اللوحة.
 */
export const MOTIFS: Record<WorkMotifId, MotifSpec> = {
  spark: {
    id: 'spark', labelAr: 'جزيئات ناعمة (الافتراضي)', labelEn: 'Soft particles',
    count: 70, size: 14, dirY: -1, speed: 30, swayAmp: 26, swayFreq: 1.1,
    spin: 0, shape: SHAPE_CIRCLE, lanes: 0, trail: 0, alpha: 0.2, glyphBase: 0, glyphSpan: 32,
  },
  code: {
    id: 'code', labelAr: 'أكواد تنزل', labelEn: 'Falling code',
    count: 240, size: 20, dirY: 1, speed: 150, swayAmp: 0, swayFreq: 0,
    spin: 0, shape: SHAPE_GLYPH, lanes: 14, trail: 0.6, alpha: 0.62, glyphBase: 0, glyphSpan: 32,
  },
  fashion: {
    id: 'fashion', labelAr: 'أقمشة تتطاير', labelEn: 'Drifting fabric',
    count: 34, size: 54, dirY: -1, speed: 26, swayAmp: 46, swayFreq: 1.6,
    spin: 0.16, shape: SHAPE_GLYPH, lanes: 0, trail: 0, alpha: 0.3, glyphBase: 32, glyphSpan: 4,
  },
  commerce: {
    id: 'commerce', labelAr: 'بطاقات وطلبات', labelEn: 'Tags and orders',
    count: 56, size: 28, dirY: -1, speed: 55, swayAmp: 18, swayFreq: 1.3,
    spin: 0.22, shape: SHAPE_GLYPH, lanes: 0, trail: 0, alpha: 0.3, glyphBase: 36, glyphSpan: 4,
  },
  beauty: {
    id: 'beauty', labelAr: 'توهّج ناعم', labelEn: 'Soft glow',
    count: 26, size: 78, dirY: -1, speed: 16, swayAmp: 34, swayFreq: 0.8,
    spin: 0.05, shape: SHAPE_GLYPH, lanes: 0, trail: 0, alpha: 0.26, glyphBase: 44, glyphSpan: 4,
  },
  tools: {
    id: 'tools', labelAr: 'أدوات ومسنّنات', labelEn: 'Tools and gears',
    count: 40, size: 34, dirY: 1, speed: 22, swayAmp: 14, swayFreq: 0.9,
    spin: 0.35, shape: SHAPE_GLYPH, lanes: 0, trail: 0, alpha: 0.3, glyphBase: 40, glyphSpan: 4,
  },
  none: {
    id: 'none', labelAr: 'بلا حركة', labelEn: 'No motion',
    count: 0, size: 1, dirY: 1, speed: 1, swayAmp: 0, swayFreq: 0,
    spin: 0, shape: SHAPE_CIRCLE, lanes: 0, trail: 0, alpha: 0, glyphBase: 0, glyphSpan: 32,
  },
};

export const MOTIF_IDS = Object.keys(MOTIFS) as WorkMotifId[];

export const DEFAULT_MOTIF: WorkMotifId = 'spark';

/**
 * ما يُقرأ من قاعدة البيانات لا يُصدَّق: الحقل يُحرَّر من لوحة الأدمن ويُخزَّن JSON حرّاً،
 * فقيمة غريبة فيه تصل إلى uniform وتُخرج نمطاً لا وجود له. أيّ شيء خارج الجدول يعود
 * إلى المحايد.
 */
export function safeMotif(value: unknown): WorkMotifId {
  const v = String(value || '').trim() as WorkMotifId;
  return v in MOTIFS ? v : DEFAULT_MOTIF;
}
