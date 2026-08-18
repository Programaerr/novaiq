import { ContractData } from '../types';

/**
 * One distinct colour per contract stage, shared by the customer profile and the admin panel.
 *
 * The home palette supplies the page (sand ground, paper cards, ink text, periwinkle accent);
 * the stages need to be distinguishable from one another AT A GLANCE, which is a different job
 * than the page's own palette — so each stage gets its own hue, chosen to sit comfortably on
 * the paper cards while staying clearly different from the two beside it:
 *
 *   submitted      → periwinkle  (the site's own accent — the contract has just entered)
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
  draft: {
    fill: '#9AA0A6',
    badge: 'bg-white/70 border-ink/20 text-ink/60',
    softBg: 'rgba(154, 160, 166, 0.18)',
  },
  submitted: {
    fill: '#8295CF',
    badge: 'bg-periwinkle/20 border-periwinkle text-[#4A5DA8]',
    softBg: 'rgba(130, 149, 207, 0.22)',
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
