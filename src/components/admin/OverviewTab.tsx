// The dashboard landing tab: status/template breakdown bars, financial position, and the
// newest contracts.
import { ContractData } from '../../types';
import { Language, translateText } from '../../lib/i18n';
import { formatPrice, Currency } from '../../lib/currency';
import { STATUS_FLOW, PAYMENT_STATUS_FLOW, BarRow, StatTile, statusArabic, paymentStatusArabic, AdminStats } from './shared';
import { Wallet, TrendingUp, TrendingDown, Landmark } from 'lucide-react';

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
      {/* Financial position — realized profit is collected cash minus cost, never the full
          agreed price, so money a client hasn't actually paid yet is never counted as profit. */}
      <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
        <h3 className="text-sm font-bold text-white">{isAr ? 'الوضع المالي' : 'Financial Position'}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            icon={Wallet}
            label={isAr ? 'محصّل فعلياً' : 'Collected'}
            value={formatPrice(stats.totalCollectedIQD, language, currency)}
            accent="text-emerald-400"
          />
          <StatTile
            icon={Landmark}
            label={isAr ? 'مستحق (غير محصّل)' : 'Outstanding'}
            value={formatPrice(stats.totalOutstandingIQD, language, currency)}
            accent="text-amber-400"
          />
          <StatTile
            icon={TrendingDown}
            label={isAr ? 'إجمالي التكلفة' : 'Total Cost'}
            value={formatPrice(stats.totalCostIQD, language, currency)}
            accent="text-red-400"
          />
          <StatTile
            icon={TrendingUp}
            label={isAr ? 'صافي الربح (محقق)' : 'Net Profit (Realized)'}
            value={formatPrice(stats.netProfitIQD, language, currency)}
            accent={stats.netProfitIQD >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
        </div>
        <p className="text-[11px] text-zinc-500">
          {isAr
            ? `الربح المتوقع لو تحصّل كل المستحقات: ${formatPrice(stats.projectedProfitIQD, language, currency)}`
            : `Projected profit if all outstanding balances were collected: ${formatPrice(stats.projectedProfitIQD, language, currency)}`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
          <h3 className="text-sm font-bold text-white">{isAr ? 'حالة العقود' : 'Contracts by Status'}</h3>
          <div className="space-y-2.5">
            {STATUS_FLOW.map((status) => (
              <BarRow key={status} isAr={isAr} label={translateText(statusArabic(status), language)} count={stats.byStatus[status] || 0} total={stats.count} />
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
          <h3 className="text-sm font-bold text-white">{isAr ? 'حالة الدفع' : 'Payment Status'}</h3>
          <div className="space-y-2.5">
            {PAYMENT_STATUS_FLOW.map((ps) => (
              <BarRow key={ps} isAr={isAr} label={translateText(paymentStatusArabic(ps), language)} count={stats.byPaymentStatus[ps] || 0} total={stats.count} />
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
        <h3 className="text-sm font-bold text-white">{isAr ? 'القوالب الأكثر طلباً' : 'Most Requested Templates'}</h3>
        {stats.topTemplates.length === 0 ? (
          <p className="text-xs text-zinc-500">{isAr ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
        ) : (
          <div className="space-y-2.5">
            {stats.topTemplates.map(([title, count]) => (
              <BarRow key={title} isAr={isAr} label={translateText(title, language)} count={count} total={stats.count} />
            ))}
          </div>
        )}
      </div>

      <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
        <h3 className="text-sm font-bold text-white">{isAr ? 'أحدث العقود' : 'Recent Contracts'}</h3>
        {recent.length === 0 ? (
          <p className="text-xs text-zinc-500">{isAr ? 'لا توجد عقود بعد' : 'No contracts yet'}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {recent.map((c) => (
              <div key={c.id || c.contractNumber} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                <div className="min-w-0">
                  <div className="text-white font-bold truncate">{c.companyName}</div>
                  <div className="text-zinc-500 text-[10px] truncate">{translateText(c.templateTitle, language)}</div>
                </div>
                <span className="text-zinc-300 font-mono shrink-0">{formatPrice(c.totalPriceIQD || 0, language, currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
