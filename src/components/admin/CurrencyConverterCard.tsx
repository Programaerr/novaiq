import { useState } from 'react';
import { RefreshCw, ArrowLeftRight } from 'lucide-react';
import { useLiveUsdIqdRate } from '../../lib/liveExchangeRate';
import { PriceInput } from '../PriceInput';

/**
 * A quick, on-demand IQD → USD calculator using a live market rate — separate from the fixed
 * `IQD_PER_USD` constant the storefront prices templates with. Iraq effectively has two rates
 * (the official/interbank peg this feed reports, and the informal market rate businesses
 * commonly quote), so this is deliberately a side reference tool for fast mental math, not
 * something wired into the site's own pricing.
 */
export function CurrencyConverterCard({ isAr }: { isAr: boolean }) {
  const { rate, loading, error, updatedAt, refresh } = useLiveUsdIqdRate();
  const [iqd, setIqd] = useState('');

  const usdValue = rate && iqd ? Number(iqd) / rate : null;

  return (
    <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-zinc-400" />
          {isAr ? 'محول العملات (سعر السوق المباشر)' : 'Currency Converter (Live Market Rate)'}
        </h3>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 cursor-pointer transition-colors"
          title={isAr ? 'تحديث السعر' : 'Refresh rate'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <p className="text-xs text-red-400">
          {isAr ? 'تعذر جلب سعر الصرف الحالي — تحقق من الاتصال وحاول مجدداً' : 'Failed to fetch the current rate — check your connection and try again'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1.5">
                {isAr ? 'المبلغ بالدينار العراقي' : 'Amount in IQD'}
              </label>
              <PriceInput
                value={iqd}
                onChange={setIqd}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1.5">
                {isAr ? 'ما يعادله بالدولار' : 'Equivalent in USD'}
              </label>
              <div className="w-full px-3 py-2.5 rounded-xl bg-black border border-zinc-800 text-emerald-400 text-sm font-mono font-bold" dir="ltr">
                {usdValue !== null ? `$${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500">
            {loading
              ? (isAr ? 'جارِ جلب سعر الصرف...' : 'Fetching exchange rate...')
              : rate
              ? isAr
                ? `السعر الحالي: 1$ = ${rate.toLocaleString(undefined, { maximumFractionDigits: 2 })} د.ع — هذا سعر السوق الرسمي وقد يختلف عن سعر التسعير الثابت المعتمد في المنصة`
                : `Current rate: $1 = ${rate.toLocaleString(undefined, { maximumFractionDigits: 2 })} IQD — this is the official market rate and may differ from the platform's own fixed pricing rate`
              : ''}
          </p>
          {updatedAt && (
            <p className="text-[10px] text-zinc-600" dir="ltr">
              {isAr ? `آخر تحديث للسعر: ${updatedAt}` : `Rate last updated: ${updatedAt}`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
