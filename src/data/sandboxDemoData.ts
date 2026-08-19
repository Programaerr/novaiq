// ── What the preview shell itself needs ────────────────────────────────────────────────────
//
// This file was 1,020 lines of sample doctors, phones, watches, cars, courses and menu items —
// the catalogues behind ten template demos. Those templates are retired; the one that remains
// keeps its own data in `rentalDemoData.ts`, written for it rather than shared across ten
// unrelated businesses.
//
// What survives is only the part that was never about any single template: the palette the
// customer picks the demo's identity colour from, and the shapes the shared account area is
// written against.

/** One row in the visitor's own records — a booking, an order, an appointment. The account
 *  area renders these and knows nothing about what produced them. */
export interface AccountRecord {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  status: string;
  amount?: string;
}

export interface SiteAccount {
  email: string;
  name: string;
  role: 'customer' | 'admin';
}

/** How a demo business can be reached. Shown in the site footer, the drawer and the account
 *  area, so the three cannot drift into three different phone numbers. */
export interface SiteContact {
  phone: string;
  email: string;
  address: string;
  hours: string;
}

export type ThemeColor = 'emerald' | 'purple' | 'cyan' | 'amber' | 'rose' | 'monochrome';

export const THEME_COLOR_HEX: Record<ThemeColor, string> = {
  emerald: '#10b981',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  rose: '#f43f5e',
  monochrome: '#71717a',
};

export const THEME_COLOR_LABEL_AR: Record<ThemeColor, string> = {
  emerald: 'زمردي',
  purple: 'بنفسجي',
  cyan: 'سماوي',
  amber: 'ذهبي',
  rose: 'ياقوتي',
  monochrome: 'رمادي',
};
