// The dashboard landing tab: status/template breakdown bars, financial position, and the
// newest contracts.
import { ContractData } from '../../types';
import { Language, translateText } from '../../lib/i18n';
import { formatPrice, Currency } from '../../lib/currency';
import { STATUS_FLOW, PAYMENT_STATUS_FLOW, BarRow, statusArabic, paymentStatusArabic, AdminStats } from './shared';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { OBSIDIAN, ORANGE, PAPER_DEEP, STEEL_LIGHT, SUCCESS_ON_LIGHT, ERROR_ON_LIGHT } from '../../lib/homePalette';

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
      {/* التكلفة والربح — أُعيد بناؤها.
          كانت بطاقتين بلون PAPER داخل بطاقة بلون PAPER: ثلاث طبقات بنفس اللون بلا أي تدرّج،
          فلا شيء يبدو أمام شيء. وكان الرقمان يستعملان `text-red-600` و`text-emerald-700` —
          لونين من لوحة Tailwind الجاهزة لا وجود لهما في هوية الموقع.

          الآن: سطح واحد أغمق درجة (PAPER_DEEP) داخل البطاقة، وفاصل بينهما بدل حدّين، وكل لون
          مأخوذ من homePalette حصراً. التكلفة بلون الحبر لا بالأحمر — التكلفة ليست خطأً لتُصبَغ
          بلون الخطر؛ الأحمر محجوز للربح حين يكون سالباً، وهو الحالة الوحيدة التي تستحق تنبيهاً.
          والشريط أسفلهما يقول نسبة التكلفة من القيمة المتعاقد عليها: رقمان بلا نسبة لا يقولان
          إن كانت 12% أم 80%. */}
      <div className="p-5 rounded-2xl bg-paper border border-ink/10 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: OBSIDIAN }}>
          <span className="h-1.5 w-6 rounded-full" style={{ background: ORANGE }} aria-hidden="true" />
          {isAr ? 'التكلفة والربح المتوقع' : 'Cost & Projected Profit'}
        </h3>

        <div
          className="rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse"
          style={{ background: PAPER_DEEP, borderColor: `${OBSIDIAN}1a`, ['--tw-divide-opacity' as string]: '1' }}
        >
          <div className="p-4 space-y-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: STEEL_LIGHT }}>
              <TrendingDown className="w-3.5 h-3.5" />
              {isAr ? 'إجمالي التكلفة' : 'Total cost'}
            </span>
            <div className="text-lg lg:text-xl font-extrabold font-mono leading-tight wrap-break-word" style={{ color: OBSIDIAN }}>
              {formatPrice(stats.totalCostIQD, language, currency)}
            </div>
          </div>

          <div className="p-4 space-y-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: STEEL_LIGHT }}>
              <TrendingUp className="w-3.5 h-3.5" />
              {isAr ? 'الربح لو تحصّل كل المستحق' : 'Profit if all outstanding is collected'}
            </span>
            <div
              className="text-lg lg:text-xl font-extrabold font-mono leading-tight wrap-break-word"
              style={{ color: stats.projectedProfitIQD >= 0 ? SUCCESS_ON_LIGHT : ERROR_ON_LIGHT }}
            >
              {formatPrice(stats.projectedProfitIQD, language, currency)}
            </div>
          </div>
        </div>

        {stats.totalIQD > 0 && (
          <div className="space-y-1.5">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: `${OBSIDIAN}14` }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.round((stats.totalCostIQD / stats.totalIQD) * 100))}%`,
                  background: ORANGE,
                }}
              />
            </div>
            <p className="text-[11px] font-bold" style={{ color: STEEL_LIGHT }}>
              {isAr
                ? `التكلفة تعادل ${Math.round((stats.totalCostIQD / stats.totalIQD) * 100)}% من قيمة العقود المتعاقد عليها`
                : `Cost is ${Math.round((stats.totalCostIQD / stats.totalIQD) * 100)}% of the total agreed contract value`}
            </p>
          </div>
        )}
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
