// The dashboard landing tab: status/template breakdown bars, financial position, and the
// newest contracts.
import { ContractData } from '../../types';
import { Language, translateText } from '../../lib/i18n';
import { formatPrice, Currency } from '../../lib/currency';
import { STATUS_FLOW, PAYMENT_STATUS_FLOW, BarRow, StatTile, statusArabic, paymentStatusArabic, AdminStats } from './shared';
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

  // يُحسب هنا لا في AdminDashboard: لا يقرأه سوى هذه البطاقة، وحسابه ثلاث جمعات على مصفوفة
  // موجودة أصلاً — تمريره عبر AdminStats كان سيوسّع عقداً مشتركاً لأجل مستهلك واحد.
  const websiteCount = contracts.filter((c) => c.projectType === 'website').length;
  const appCount = contracts.filter((c) => c.projectType === 'app').length;
  const unspecifiedCount = contracts.length - websiteCount - appCount;
  const projectTypeTotal = contracts.length;

  return (
    <div className="space-y-4">
      {/* Only what the permanent strip above does not already carry.
          Collected, outstanding and realized profit are in view on every screen now, so repeating
          them here as four big tiles said the same thing twice on the one page where there was
          most competition for attention. What is left is the pair that genuinely belongs to
          analysis rather than to the running scoreboard: what the work cost, and what the profit
          becomes if every outstanding balance is eventually collected. */}
      <div className="p-5 rounded-2xl bg-paper border border-ink/10 space-y-3">
        <h3 className="text-sm font-bold text-ink">{isAr ? 'التكلفة والربح المتوقع' : 'Cost & Projected Profit'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatTile
            icon={TrendingDown}
            label={isAr ? 'إجمالي التكلفة' : 'Total Cost'}
            value={formatPrice(stats.totalCostIQD, language, currency)}
            accent="text-red-600"
          />
          <StatTile
            icon={TrendingUp}
            label={isAr ? 'الربح لو تحصّل كل المستحق' : 'Profit if all outstanding is collected'}
            value={formatPrice(stats.projectedProfitIQD, language, currency)}
            accent={stats.projectedProfitIQD >= 0 ? 'text-emerald-700' : 'text-red-600'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-paper border border-ink/10 space-y-3">
          <h3 className="text-sm font-bold text-ink">{isAr ? 'حالة العقود' : 'Contracts by Status'}</h3>
          <div className="space-y-2.5">
            {STATUS_FLOW.map((status) => (
              <BarRow key={status} isAr={isAr} label={translateText(statusArabic(status), language)} count={stats.byStatus[status] || 0} total={stats.count} />
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-paper border border-ink/10 space-y-3">
          <h3 className="text-sm font-bold text-ink">{isAr ? 'حالة الدفع' : 'Payment Status'}</h3>
          <div className="space-y-2.5">
            {PAYMENT_STATUS_FLOW.map((ps) => (
              <BarRow key={ps} isAr={isAr} label={translateText(paymentStatusArabic(ps), language)} count={stats.byPaymentStatus[ps] || 0} total={stats.count} />
            ))}
          </div>
        </div>
      </div>

      {/* "موقع أم تطبيق" محلّ "القوالب الأكثر طلباً".
          القائمة القديمة كانت تعدّ `templateTitle`، وهو منذ صار كل مشروع مخصصاً = اسم المشروع
          الذي يكتبه العميل بنفسه — أي قائمة أسماء فريدة كلٌّ منها بعقد واحد، لا "الأكثر طلباً"
          بشيء. أما نوع المشروع فسؤال حقيقي له جواب يفيد التسعير والتخطيط. */}
      <div className="p-5 rounded-2xl bg-paper border border-ink/10 space-y-3">
        <h3 className="text-sm font-bold text-ink">{isAr ? 'الأكثر طلباً: موقع أم تطبيق' : 'Most requested: website or app'}</h3>
        {projectTypeTotal === 0 ? (
          <p className="text-xs text-ink/50">{isAr ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
        ) : (
          <>
            <p className="text-xs font-bold text-ink/70">
              {websiteCount === appCount
                ? isAr ? 'الطلب متساوٍ بين الاثنين.' : 'Demand is even between the two.'
                : websiteCount > appCount
                  ? isAr ? 'الموقع الإلكتروني هو الأكثر طلباً.' : 'The website is the more requested one.'
                  : isAr ? 'تطبيق الهاتف هو الأكثر طلباً.' : 'The mobile app is the more requested one.'}
            </p>
            <div className="space-y-2.5">
              <BarRow isAr={isAr} label={isAr ? 'موقع إلكتروني' : 'Website'} count={websiteCount} total={projectTypeTotal} />
              <BarRow isAr={isAr} label={isAr ? 'تطبيق هاتف' : 'Mobile app'} count={appCount} total={projectTypeTotal} />
              {/* عقود أُنشئت قبل وجود هذا الحقل. تُعرَض ولا تُخفى: إخفاؤها يجعل المجموع أقل من
                  عدد العقود بلا تفسير، فيبدو الرقم خاطئاً. */}
              {unspecifiedCount > 0 && (
                <BarRow
                  isAr={isAr}
                  label={isAr ? 'غير محدَّد (عقود قديمة)' : 'Unspecified (older contracts)'}
                  count={unspecifiedCount}
                  total={projectTypeTotal}
                />
              )}
            </div>
          </>
        )}
      </div>

      <div className="p-5 rounded-2xl bg-paper border border-ink/10 space-y-3">
        <h3 className="text-sm font-bold text-ink">{isAr ? 'أحدث العقود' : 'Recent Contracts'}</h3>
        {recent.length === 0 ? (
          <p className="text-xs text-ink/50">{isAr ? 'لا توجد عقود بعد' : 'No contracts yet'}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {recent.map((c) => (
              <div key={c.id || c.contractNumber} className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 border border-ink/10 text-xs">
                <div className="min-w-0">
                  <div className="text-ink font-bold truncate">{c.companyName}</div>
                  <div className="text-ink/50 text-[10px] truncate">{translateText(c.templateTitle, language)}</div>
                </div>
                <span className="text-ink/75 font-mono shrink-0">{formatPrice(c.totalPriceIQD || 0, language, currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
