// The dashboard landing tab: status/template breakdown bars, financial position, and the
// newest contracts.
import { ContractData } from '../../types';
import { Language, translateText } from '../../lib/i18n';
import { formatPrice, Currency } from '../../lib/currency';
import { STATUS_FLOW, PAYMENT_STATUS_FLOW, BarRow, StatTile, statusArabic, paymentStatusArabic, AdminStats } from './shared';
import { CurrencyConverterCard } from './CurrencyConverterCard';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function OverviewTab({
  isAr,
  stats,
  contracts,
  language,
  currency,
}: {
  isAr: boolean;
  stats: AdminStats;
  contracts: ContractData[];
  language: Language;
  currency: Currency;
}) {
  const recent = contracts.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Only what the permanent strip above does not already carry.
          Collected, outstanding and realized profit are in view on every screen now, so repeating
          them here as four big tiles said the same thing twice on the one page where there was
          most competition for attention. What is left is the pair that genuinely belongs to
          analysis rather than to the running scoreboard: what the work cost, and what the profit
          becomes if every outstanding balance is eventually collected. */}
      <div className="p-5 rounded-2xl bg-black border border-white/10 space-y-3">
        <h3 className="text-sm font-bold text-white">{isAr ? 'التكلفة والربح المتوقع' : 'Cost & Projected Profit'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatTile
            icon={TrendingDown}
            label={isAr ? 'إجمالي التكلفة' : 'Total Cost'}
            value={formatPrice(stats.totalCostIQD, language, currency)}
            accent="text-red-400"
          />
          <StatTile
            icon={TrendingUp}
            label={isAr ? 'الربح لو تحصّل كل المستحق' : 'Profit if all outstanding is collected'}
            value={formatPrice(stats.projectedProfitIQD, language, currency)}
            accent={stats.projectedProfitIQD >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
        </div>
      </div>

      <CurrencyConverterCard isAr={isAr} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-black border border-white/10 space-y-3">
          <h3 className="text-sm font-bold text-white">{isAr ? 'حالة العقود' : 'Contracts by Status'}</h3>
          <div className="space-y-2.5">
            {STATUS_FLOW.map((status) => (
              <BarRow key={status} isAr={isAr} label={translateText(statusArabic(status), language)} count={stats.byStatus[status] || 0} total={stats.count} />
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-black border border-white/10 space-y-3">
          <h3 className="text-sm font-bold text-white">{isAr ? 'حالة الدفع' : 'Payment Status'}</h3>
          <div className="space-y-2.5">
            {PAYMENT_STATUS_FLOW.map((ps) => (
              <BarRow key={ps} isAr={isAr} label={translateText(paymentStatusArabic(ps), language)} count={stats.byPaymentStatus[ps] || 0} total={stats.count} />
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-black border border-white/10 space-y-3">
        <h3 className="text-sm font-bold text-white">{isAr ? 'القوالب الأكثر طلباً' : 'Most Requested Templates'}</h3>
        {stats.topTemplates.length === 0 ? (
          <p className="text-xs text-white/40">{isAr ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
        ) : (
          <div className="space-y-2.5">
            {stats.topTemplates.map(([title, count]) => (
              <BarRow key={title} isAr={isAr} label={translateText(title, language)} count={count} total={stats.count} />
            ))}
          </div>
        )}
      </div>

      <div className="p-5 rounded-2xl bg-black border border-white/10 space-y-3">
        <h3 className="text-sm font-bold text-white">{isAr ? 'أحدث العقود' : 'Recent Contracts'}</h3>
        {recent.length === 0 ? (
          <p className="text-xs text-white/40">{isAr ? 'لا توجد عقود بعد' : 'No contracts yet'}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {recent.map((c) => (
              <div key={c.id || c.contractNumber} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                <div className="min-w-0">
                  <div className="text-white font-bold truncate">{c.companyName}</div>
                  <div className="text-white/40 text-[10px] truncate">{translateText(c.templateTitle, language)}</div>
                </div>
                <span className="text-white/70 font-mono shrink-0">{formatPrice(c.totalPriceIQD || 0, language, currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
