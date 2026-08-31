import { Language } from './i18n';

// All prices in the app are authored in IQD. Templates additionally carry a curated
// basePriceUSD, but add-ons/specs and every derived total don't — hand-maintaining a USD
// figure for every one of those would need updating each time a template or add-on is
// added. This fixed rate (matching the curated basePriceUSD figures already in
// templatesData.ts, ~1450 IQD/USD) lets any IQD amount convert itself automatically.
export const IQD_PER_USD = 1450;

// The store is entirely Iraqi — switching the UI language to English must not, on its own,
// silently convert every price to US dollars. Currency is its own, separate choice (a
// settings toggle, independent of language) that only a customer explicitly making that
// choice should trigger.
export type Currency = 'IQD' | 'USD';

export const CURRENCY_STORAGE_KEY = 'nuvaiq_currency';

export function readStoredCurrency(): Currency {
  try {
    return localStorage.getItem(CURRENCY_STORAGE_KEY) === 'USD' ? 'USD' : 'IQD';
  } catch {
    return 'IQD';
  }
}

export function toUSD(amountIQD: number): number {
  return Math.round((amountIQD || 0) / IQD_PER_USD);
}

/** Formats an amount for display: IQD keeps the same figure with a language-matched unit
 *  label (د.ع / IQD), USD converts it — currency is only ever changed by explicit choice. */
export function formatPrice(amountIQD: number, lang: Language, currency: Currency = 'IQD'): string {
  if (currency === 'USD') {
    return `$${toUSD(amountIQD).toLocaleString()}`;
  }
  const amount = (amountIQD || 0).toLocaleString();
  return lang === 'ar' ? `${amount} د.ع` : `${amount} IQD`;
}
