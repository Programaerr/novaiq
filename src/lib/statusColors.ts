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
  /* ملغي — رمادي داكن لا أحمر صارخ.
     الإلغاء نهاية للعلاقة لا حادث خطأ، والأحمر في لوحة تُقرأ يومياً يجذب العين إلى العقود
     المنتهية بدل العقود التي تحتاج عملاً. الرمادي الداكن يقول "خارج المسار" بوضوح وبلا إنذار. */
  cancelled: {
    fill: '#6B7179',
    badge: 'bg-ink/10 border-ink/30 text-ink/70',
    softBg: 'rgba(107, 113, 121, 0.18)',
  },
  draft: {
    fill: '#9AA0A6',
    badge: 'bg-white/70 border-ink/20 text-ink/60',
    softBg: 'rgba(154, 160, 166, 0.18)',
  },
  submitted: {
    fill: '#FF6A00',
    // `border-periwinkle`/`bg-periwinkle` are Tailwind's own OLD token names, aliased in @theme
    // onto `orange-on-light` now (see index.css) — they resolve correctly without being renamed
    // here, and safely: plain Signal Orange is 2.68:1 on white, under even the 3:1 a border
    // needs, which is exactly why that alias points at the darkened variant rather than the raw
    // accent. `text-[#A14605]` is a literal, so it has to be re-derived directly: darkened from
    // plain Orange until it clears 6.19:1 on white, matching the safety margin earlier stages on
    // this badge have carried.
    badge: 'bg-periwinkle/20 border-periwinkle text-[#A14605]',
    softBg: 'rgba(255, 106, 0, 0.22)',
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
