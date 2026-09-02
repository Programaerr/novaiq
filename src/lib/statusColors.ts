import { ContractData } from '../types';

/**
 * One distinct colour per contract stage, shared by the customer profile and the admin panel.
 *
 * The home palette supplies the page (warm white ground, paper cards, Obsidian text, Orange
 * accent); the stages need to be distinguishable from one another AT A GLANCE, which is a
 * different job than the page's own palette — so each stage gets its own hue, chosen to sit
 * comfortably on the paper cards while staying clearly different from the two beside it:
 *
 *   submitted      → orange      (the site's own accent — the contract has just entered)
 *   under_review   → gold/amber  (attention: someone is examining it)
 *   in_development → teal        (work is underway)
 *   completed      → green       (delivered)
 *   draft          → grey        (not in the process yet)
 *
 * Each stage exports three values:
 *   fill    — the solid colour for dots, active segments and filled rails
 *   badge   — the Tailwind classes for a small status pill on a light card
 *   softBg  — a translucent tint of the hue for a "soft" filled surface
 *
 * Kept in one module so the customer's StatusRail, the customer's status badge and the admin's
 * status pill can never drift apart — a stage that stops meaning the same thing in two places
 * is exactly the kind of mismatch a customer would notice.
 */
export interface StageColor {
  fill: string;
  badge: string;
  softBg: string;
}

export const STAGE_COLORS: Record<ContractData['status'], StageColor> = {
  /* ملغي — أحمر، بقرار المالك.
     كان رمادياً داكناً بحجّة أن الإلغاء نهاية علاقة لا حادث خطأ، وأن الأحمر في لوحة تُقرأ
     يومياً يجذب العين إلى عقود انتهت بدل عقود تحتاج عملاً. الحجّة صحيحة للوحة التحكم، لكنها
     تخسر أمام ما هو أهم: العميل يجب أن يرى فوراً وبلا لبس أن عقده ملغي، ورمادي داكن بين
     رماديات أخرى لا يقول ذلك — كان يُقرأ كحالة خاملة لا كنهاية.
     ERROR_ON_LIGHT لا ERROR: كل ما يعرض هذه الحالة يجلس على بطاقة فاتحة. */
  cancelled: {
    fill: '#CA3B3B',
    badge: 'bg-[#CA3B3B]/12 border-[#CA3B3B] text-[#CA3B3B]',
    softBg: 'rgba(202, 59, 59, 0.18)',
  },
  /* مسودة — الرمادي الفولاذي المقيس (STEEL_LIGHT)، لا رمادي أفتح منه.
     كان #9AA0A6، وهو 2.6:1 على بطاقة فاتحة — نقطة وشارة تكادان لا تُريان، وهذا هو "اللون
     الرصاصي غير الواضح". صار #6B7179، وهو 4.59:1 على الأبيض الدافئ، أي مقروء فعلاً. صار
     متاحاً لأن الملغي غادر إلى الأحمر أعلاه. */
  draft: {
    fill: '#6B7179',
    badge: 'bg-white/70 border-ink/35 text-ink/75',
    softBg: 'rgba(107, 113, 121, 0.20)',
  },
  submitted: {
    fill: '#FF8E3D',
    // `border-periwinkle`/`bg-periwinkle` are Tailwind's own OLD token names, aliased in @theme
    // onto `orange-on-light` now (see index.css) — they resolve correctly without being renamed
    // here, and safely: plain Signal Orange is 2.13:1 on white, under even the 3:1 a border
    // needs, which is exactly why that alias points at the darkened variant rather than the raw
    // accent. `text-[#A14605]` is a literal, so it has to be re-derived directly: darkened from
    // plain Orange until it clears 6.19:1 on white, matching the safety margin earlier stages on
    // this badge have carried.
    badge: 'bg-periwinkle/20 border-periwinkle text-[#A14605]',
    softBg: 'rgba(255, 142, 61, 0.22)',
  },
  under_review: {
    fill: '#D9A441',
    badge: 'bg-amber-100 border-amber-500 text-amber-700',
    softBg: 'rgba(217, 164, 65, 0.22)',
  },
  in_development: {
    fill: '#3E8F8B',
    badge: 'bg-teal-100 border-teal-600 text-teal-700',
    softBg: 'rgba(62, 143, 139, 0.22)',
  },
  completed: {
    fill: '#3E8F5F',
    badge: 'bg-emerald-100 border-emerald-600 text-emerald-700',
    softBg: 'rgba(62, 143, 95, 0.22)',
  },
};
