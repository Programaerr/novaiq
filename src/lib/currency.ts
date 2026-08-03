import { Language } from './i18n';

// All prices in the app are authored in IQD. Templates additionally carry a curated
// basePriceUSD, but add-ons/specs and every derived total don't — hand-maintaining a USD
// figure for every one of those would need updating each time a template or add-on is
// added. This fixed rate (matching the curated basePriceUSD figures already in
// templatesData.ts, ~1450 IQD/USD) lets any IQD amount convert itself automatically.
export const IQD_PER_USD = 1450;

export function toUSD(amountIQD: number): number {
  return Math.round((amountIQD || 0) / IQD_PER_USD);
}

/** Formats an IQD amount for display, converting to USD when the active language is English. */
export function formatPrice(amountIQD: number, lang: Language): string {
  if (lang === 'ar') {
    return `${(amountIQD || 0).toLocaleString()} د.ع`;
  }
  return `$${toUSD(amountIQD).toLocaleString()}`;
}
