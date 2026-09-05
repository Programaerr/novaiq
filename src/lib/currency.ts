import { Language } from './i18n';

// Every price in the app is STORED in IQD — template base prices, admin overrides, contract
// totals, payments. Templates additionally carry a curated basePriceUSD, but add-ons/specs and
// every derived total don't — hand-maintaining a USD figure for every one of those would need
// updating each time a template or add-on is added. This fixed rate (matching the curated
// basePriceUSD figures already in templatesData.ts, ~1450 IQD/USD) lets any stored IQD amount
// convert itself on the way to the screen.
export const IQD_PER_USD = 1450;

export type Currency = 'IQD' | 'USD';

/** What the site quotes in. Prices are stored in dinars and read in dollars — the dinar is the
 *  storage unit, the dollar is the number a customer sees.
 *
 *  A constant, not a stored preference. It used to be read from localStorage against the day a
 *  currency toggle existed; that toggle was never built — `setCurrency` had no caller — so the
 *  key only ever held a value nobody had chosen, and a stale 'IQD' left in a returning visitor's
 *  browser would have quietly overridden this for exactly the people who visit most. When a
 *  toggle does arrive this goes back to being state; until then it must not pretend to be one. */
export const APP_CURRENCY: Currency = 'USD';

export function toUSD(amountIQD: number): number {
  return Math.round((amountIQD || 0) / IQD_PER_USD);
}

/** Formats a stored IQD amount for display. USD — the default, and what the site quotes in —
 *  converts at the fixed rate above; IQD keeps the figure with a language-matched unit label,
 *  which is still what the admin's own price INPUTS are labelled and typed in. */
export function formatPrice(amountIQD: number, lang: Language, currency: Currency = 'USD'): string {
  if (currency === 'USD') {
    return `$${toUSD(amountIQD).toLocaleString()}`;
  }
  const amount = (amountIQD || 0).toLocaleString();
  return lang === 'ar' ? `${amount} د.ع` : `${amount} IQD`;
}
