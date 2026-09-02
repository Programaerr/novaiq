import type { ContractData } from '../types';

/**
 * نسبة إنجاز العقد كما يراها العميل في حسابه.
 *
 * ## لماذا محسوبة لا مكتوبة يدوياً
 * أي رقم يكتبه الأدمن بيده يصبح كذبة بعد يومين — لأنه لا أحد يفتح لوحة التحكم كل صباح
 * ليزحزح نسبة. هنا النسبة دالة في شيئين موجودين أصلاً: حالة العقد، والزمن المنقضي منذ
 * دخوله "قيد التنفيذ" مقارنةً بمدة التسليم المتفق عليها في العقد نفسه. فبمجرد أن يضع
 * الأدمن العقد في "قيد التنفيذ" تبدأ النسبة بالتقدّم وحدها يوماً بيوم.
 *
 * ## لماذا تتوقف عند 90%
 * آخر 10% ليست زمناً، بل حدثاً: التسليم. لو أكملت النسبة إلى 100% بالزمن وحده لرأى العميل
 * "100% مكتمل" ولا شيء بيده — وهذا أسوأ من رقم متحفّظ. الوصول إلى 100% يحدث فقط حين يضع
 * الأدمن الحالة "مكتمل" فعلاً.
 *
 * ## ولماذا لا تعود للوراء أبداً
 * الأساس هو `developmentStartedAt` (يُضبط مرة واحدة، انظر lib/firebase.ts) لا `updatedAt`:
 * لو حُسبت من آخر تعديل، لكان كل حفظ يقوم به الأدمن يعيد النسبة إلى نقطة البداية أمام
 * العميل.
 */

/** النسب الثابتة لكل مرحلة قبل بدء التنفيذ، و"مكتمل" في نهايتها. */
const STAGE_FLOOR: Record<ContractData['status'], number> = {
  draft: 3,
  submitted: 10,
  under_review: 20,
  in_development: 35,
  completed: 100,
  /* ملغي = صفر، لا آخر نسبة بلغها.
     شريط تقدّم عند 60% على عقد ملغي يقول للعميل إن العمل ما زال جارياً، وهو أسوأ من ألا يقول
     شيئاً. الإلغاء خروج من المسار، فالنسبة فيه بلا معنى وتُعرض كصفر (والواجهة تُخفي الشريط
     أصلاً وتعرض إعلان الإلغاء مكانه). */
  cancelled: 0,
};

/** سقف ما يقدر الزمن وحده أن يبلغه — الباقي للتسليم الفعلي. */
const TIME_CEILING = 90;

export interface ContractProgress {
  percent: number;
  /** true حين تكون النسبة زاحفة بالزمن، لا رقماً ثابتاً لمرحلة. */
  isLive: boolean;
}

export function contractProgress(contract: ContractData, now: number = Date.now()): ContractProgress {
  const floor = STAGE_FLOOR[contract.status] ?? 0;
  if (contract.status !== 'in_development') {
    return { percent: floor, isLive: false };
  }

  const startedAt = contract.developmentStartedAt || contract.updatedAt || contract.createdAt;
  const started = startedAt ? new Date(startedAt).getTime() : NaN;
  const weeks = contract.deliveryTimelineWeeks || 0;
  // بلا تاريخ بداية صالح أو بلا مدة متفق عليها لا يوجد ما يُقاس عليه — تُعرض نسبة المرحلة
  // الثابتة بدل اختراع تقدّم من لا شيء.
  if (!Number.isFinite(started) || weeks <= 0) {
    return { percent: floor, isLive: false };
  }

  const totalMs = weeks * 7 * 24 * 60 * 60 * 1000;
  const ratio = Math.min(Math.max((now - started) / totalMs, 0), 1);
  const percent = Math.min(Math.round(floor + (TIME_CEILING - floor) * ratio), TIME_CEILING);
  return { percent, isLive: true };
}

/**
 * رابط خارجي صالح للعرض كزر، أو null.
 *
 * أي رابط يصل من قاعدة البيانات ويُوضع في href هو مدخل غير موثوق: `javascript:` في href
 * ينفّذ كوداً في متصفح العميل بضغطة واحدة، و`data:` يقدر يقدّم صفحة كاملة تنتحل الموقع.
 * لذلك قائمة سماح لا قائمة منع: http و https فقط.
 */
export function safeExternalUrl(url: string | undefined | null): string | null {
  const raw = (url || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}
