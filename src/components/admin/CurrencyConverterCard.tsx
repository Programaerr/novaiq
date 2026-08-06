import { useState } from 'react';
import { RefreshCw, ArrowLeftRight, SlidersHorizontal } from 'lucide-react';
import { useLiveUsdIqdRate } from '../../lib/liveExchangeRate';
import { PriceInput } from '../PriceInput';

/**
 * A quick, on-demand IQD ⇄ USD calculator using a live market rate — separate from the fixed
 * `IQD_PER_USD` constant the storefront prices templates with. Iraq effectively has two rates
 * (the official/interbank peg this feed reports, and the informal market rate businesses
 * commonly quote), so this is deliberately a side reference tool for fast mental math, not
 * something wired into the site's own pricing. A manual rate override is offered for the same
 * reason: the admin may want to price against a specific rate they negotiated or heard quoted,
 * not necessarily either of the above.
 */
export function CurrencyConverterCard({ isAr }: { isAr: boolean }) {
  const { rate: liveRate, loading, error, updatedAt, refresh } = useLiveUsdIqdRate();
  const [direction, setDirection] = useState<'iqd_to_usd' | 'usd_to_iqd'>('iqd_to_usd');
  const [amount, setAmount] = useState('');
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customRate, setCustomRate] = useState('');

  const effectiveRate = useCustomRate ? Number(customRate) || null : liveRate;

  const amountNum = Number(amount) || 0;
  const result =
    effectiveRate && amount
      ? direction === 'iqd_to_usd'
        ? amountNum / effectiveRate
        : amountNum * effectiveRate
      : null;

  const fromLabel = direction === 'iqd_to_usd' ? (isAr ? 'المبلغ بالدينار العراقي' : 'Amount in IQD') : (isAr ? 'المبلغ بالدولار' : 'Amount in USD');
  const toLabel = direction === 'iqd_to_usd' ? (isAr ? 'ما يعادله بالدولار' : 'Equivalent in USD') : (isAr ? 'ما يعادله بالدينار العراقي' : 'Equivalent in IQD');
  const resultText =
    result !== null
      ? direction === 'iqd_to_usd'
        ? `$${result.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
        : `${Math.round(result).toLocaleString()} ${isAr ? 'د.ع' : 'IQD'}`
      : '—';

  return (
    <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-zinc-400" />
          {isAr ? 'محول العملات (سعر السوق المباشر)' : 'Currency Converter (Live Market Rate)'}
        </h3>
        <button
          onClick={refresh}
          disabled={loading || useCustomRate}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 cursor-pointer transition-colors"
          title={isAr ? 'تحديث السعر' : 'Refresh rate'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && !useCustomRate ? (
        <p className="text-xs text-red-400">
          {isAr ? 'تعذر جلب سعر الصرف الحالي — تحقق من الاتصال وحاول مجدداً، أو استخدم سعراً يدوياً' : 'Failed to fetch the current rate — check your connection and try again, or use a manual rate'}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-zinc-500 mb-1.5">{fromLabel}</label>
          <PriceInput
            value={amount}
            onChange={setAmount}
            placeholder="0"
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm font-mono"
          />
        </div>
        <button
          onClick={() => setDirection((d) => (d === 'iqd_to_usd' ? 'usd_to_iqd' : 'iqd_to_usd'))}
          title={isAr ? 'عكس الاتجاه' : 'Swap direction'}
          className="mt-5 shrink-0 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition-colors"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <label className="block text-[11px] font-semibold text-zinc-500 mb-1.5">{toLabel}</label>
          <div className="w-full px-3 py-2.5 rounded-xl bg-black border border-zinc-800 text-emerald-400 text-sm font-mono font-bold truncate" dir="ltr">
            {resultText}
          </div>
        </div>
      </div>

      <div className="pt-1 border-t border-zinc-900 space-y-2">
        <label className="flex items-center gap-2 text-[11px] font-semibold text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useCustomRate}
            onChange={(e) => setUseCustomRate(e.target.checked)}
            className="w-3.5 h-3.5 accent-white cursor-pointer"
          />
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
          {isAr ? 'استخدام سعر صرف مخصص بدل السعر المباشر' : 'Use a custom rate instead of the live rate'}
        </label>
        {useCustomRate && (
          <PriceInput
            value={customRate}
            onChange={setCustomRate}
            placeholder={isAr ? 'مثال: 1450' : 'e.g. 1450'}
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm font-mono"
          />
        )}
      </div>

      <p className="text-[11px] text-zinc-500">
        {useCustomRate
          ? customRate
            ? isAr
              ? `تستخدم سعراً مخصصاً: 1$ = ${Number(customRate).toLocaleString()} د.ع`
              : `Using a custom rate: $1 = ${Number(customRate).toLocaleString()} IQD`
            : isAr
            ? 'أدخل السعر المخصص الذي تريده أعلاه'
            : 'Enter the custom rate you want above'
          : loading
          ? isAr
            ? 'جارِ جلب سعر الصرف...'
            : 'Fetching exchange rate...'
          : liveRate
          ? isAr
            ? `السعر الحالي: 1$ = ${liveRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} د.ع — هذا سعر السوق الرسمي وقد يختلف عن سعر التسعير الثابت المعتمد في المنصة`
            : `Current rate: $1 = ${liveRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} IQD — this is the official market rate and may differ from the platform's own fixed pricing rate`
          : ''}
      </p>
      {!useCustomRate && updatedAt && (
        <p className="text-[10px] text-zinc-600" dir="ltr">
          {isAr ? `آخر تحديث للسعر: ${updatedAt}` : `Rate last updated: ${updatedAt}`}
        </p>
      )}
    </div>
  );
}
