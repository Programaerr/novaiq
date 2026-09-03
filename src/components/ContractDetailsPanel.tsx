import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ContractData } from '../types';
import { Language, translateText } from '../lib/i18n';
import { formatPrice, Currency } from '../lib/currency';
import { SUCCESS_ON_LIGHT } from '../lib/homePalette';

interface ContractDetailsPanelProps {
  contract: ContractData;
  language: Language;
  currency: Currency;
}

/**
 * بطاقة "تفاصيل العقد" — نفس الحقول ونفس الاشتقاقات في كل مكان تظهر فيه.
 *
 * كانت مكتوبة مرّتين: مرّة داخل CustomerDashboard (حساب العميل)، ومرّة بصيغة مختلفة داخل
 * ContractPDFPreview (الشاشة التي تظهر فور إنشاء العقد) — حيث لم تكن هذه البطاقة أصلاً، بل
 * الوثيقة المطبوعة الكاملة (ContractPrintDocument) معروضة inline داخل الشاشة، فبدت الشاشة
 * وكأنها تُظهر ورقة PDF مضغوطة داخل الصفحة بدل قائمة تفاصيل مقروءة على شاشة هاتف.
 *
 * هذا المكوّن هو المصدر الوحيد الآن لكلا الشاشتين. لا نسخة ثانية تُكتب بيد أخرى: النسخة
 * السابقة من هذه الفكرة (لوحة معاينة داكنة مبنية يدوياً) كانت قد افترقت فعلاً عن العقد
 * الحقيقي — أعلنت "موقّع من الطرفين" دائماً حتى قبل اعتماد الأدمن، وطبعت "0 د.ع" و"0 أسابيع"
 * لمشروع لم يُسعَّر بعد. مكوّن واحد مستعمل في مكانين يمنع تكرار ذلك الخطأ بنيوياً، لا بحسن نية.
 */
export const ContractDetailsPanel: React.FC<ContractDetailsPanelProps> = ({ contract, language, currency }) => {
  const isAr = language === 'ar';
  /** عقد بقيمة صفر = لم يُسعَّر بعد. نفس الاشتقاق المستعمل في الوثيقة المطبوعة. */
  const hasAgreedPrice = (contract.totalPriceIQD || 0) > 0;

  return (
        <div className="p-3 rounded-xl bg-white/70 border border-ink/10 text-xs">
          <div className="flex items-start justify-between gap-3 mb-3">
            <span className="text-[11px] font-bold text-ink/75 block">
              {isAr ? 'تفاصيل العقد' : 'Contract Details'}
            </span>
            {/* شعاره كما رفعه — نفس الصورة التي تُطبع في وثيقته، معروضة هنا ليتأكّد أن ما
                وصلنا هو ما أرسله قبل أن يجدها في ملف PDF. */}
            {contract.clientLogoDataUrl && (
              <span className="w-16 h-10 rounded-lg bg-white border border-ink/10 grid place-items-center shrink-0 p-1">
                <img
                  src={contract.clientLogoDataUrl}
                  alt={contract.companyName}
                  className="max-w-full max-h-full object-contain"
                />
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
            {/* نفس قاعدة الوثيقة المطبوعة (ContractPrintDocument): لا رقم قبل أن يوجد رقم.
                المشروع مخصص، فالسعر والمدة وآلية السداد تُعتمد بعد مراجعة طلب العميل — وعرضها
                أصفاراً هنا كان يقول للعميل إن مشروعه بلا قيمة وبمدة صفر. */}
            <div>
              <span className="text-ink/75 block">{isAr ? 'إجمالي السعر' : 'Total Price'}</span>
              {hasAgreedPrice ? (
                <strong className="text-ink font-mono text-base sm:text-lg font-black wrap-break-word">{formatPrice(contract.totalPriceIQD || 0, language, currency)}</strong>
              ) : (
                <strong className="text-ink/70">{isAr ? 'يُتفق عليه حسب طلبك' : 'To be agreed on your request'}</strong>
              )}
            </div>
            <div>
              <span className="text-ink/75 block">{isAr ? 'خطة الدفع' : 'Payment Plan'}</span>
              <strong className="text-ink/90">
                {!hasAgreedPrice
                  ? (isAr ? 'تُحدَّد بالاتفاق' : 'To be agreed')
                  : contract.paymentPlan === '100_upfront'
                  ? (isAr ? 'دفعة واحدة عند التوقيع' : '100% Upfront')
                  : contract.paymentPlan === '3_milestones'
                  ? (isAr ? '3 دفعات مرتبطة بالمراحل' : '3 Milestones')
                  : (isAr ? '50% عند التوقيع و50% عند التسليم' : '50% / 50%')}
              </strong>
            </div>
            <div>
              <span className="text-ink/75 block">{isAr ? 'مدة التسليم' : 'Delivery'}</span>
              <strong className="text-ink/90">
                {contract.deliveryTimelineText?.trim()
                  ? contract.deliveryTimelineText
                  : contract.deliveryTimelineWeeks
                    ? isAr
                      ? `${contract.deliveryTimelineWeeks} أسبوع`
                      : `${contract.deliveryTimelineWeeks} weeks`
                    : isAr
                      ? 'تُحدَّد بالاتفاق'
                      : 'To be agreed'}
              </strong>
            </div>
            <div>
              <span className="text-ink/75 block">{isAr ? 'قالب المشروع' : 'Project Template'}</span>
              <strong className="text-ink/90">{translateText(contract.templateTitle, language)}</strong>
            </div>
            <div>
              <span className="text-ink/75 block">{isAr ? 'اسم الشركة' : 'Company Name'}</span>
              <strong className="text-ink/90">{contract.companyName}</strong>
            </div>
            {/* البريد ورقم السجل: كلاهما مطبوع في وثيقة الـPDF منذ البداية وغائب عن هذه
                الشاشة — أي أن العميل يقرأ عقده هنا ناقصاً ويجده كاملاً في الملف. وهذه
                الشاشة هي ما يفتحه أوّلاً، فالنقص فيها هو النقص الذي يُرى. */}
            <div>
              <span className="text-ink/75 block">{isAr ? 'البريد الإلكتروني' : 'Email'}</span>
              <strong className="text-ink/90 font-mono wrap-break-word" dir="ltr">{contract.email || '—'}</strong>
            </div>
            <div>
              <span className="text-ink/75 block">{isAr ? 'رقم السجل التجاري' : 'CR / ID Number'}</span>
              <strong className="text-ink/90 font-mono" dir="ltr">{contract.crNumber || '—'}</strong>
            </div>
            <div>
              <span className="text-ink/75 block">{isAr ? 'اسم الممثل' : 'Representative'}</span>
              <strong className="text-ink/90">{contract.repName}</strong>
            </div>
            <div>
              <span className="text-ink/75 block">{isAr ? 'الهاتف' : 'Phone'}</span>
              <strong className="text-ink/90 font-mono" dir="ltr">{contract.phone}</strong>
            </div>
            <div>
              <span className="text-ink/75 block">{isAr ? 'الموقع' : 'Location'}</span>
              <strong className="text-ink/90">{contract.city}</strong>
            </div>

            {/* الهوية البصرية التي طلبها — أربعة حقول كانت تظهر للأدمن وفي وثيقة الـPDF ولا
                تظهر لصاحبها في حسابه.

                وهي أكثر ما يريد أن يتأكّد منه: السعر والمدة يقرأهما مرّة، أمّا اللون فهو ما
                سيُبنى به موقعه فعلياً — ولو كان خطأً فالمكان الوحيد الذي كان سيكتشفه فيه هو
                ملف PDF ينزّله ويفتحه، أو الموقع بعد تسليمه. نفس التسميات ونفس الترتيب الذي
                تعرضه لوحة "العقد كما وقّعه العميل" في لوحة التحكم، فلا تقول الشاشتان شيئين. */}
            <div>
              <span className="text-ink/75 block">{isAr ? 'نوع المشروع' : 'Project type'}</span>
              <strong className="text-ink/90">
                {contract.projectType === 'app'
                  ? (isAr ? 'تطبيق هاتف' : 'Mobile app')
                  : contract.projectType === 'website'
                    ? (isAr ? 'موقع إلكتروني' : 'Website')
                    : (isAr ? 'غير محدَّد' : 'Unspecified')}
              </strong>
            </div>
            <div>
              <span className="text-ink/75 block">{isAr ? 'وضع العرض' : 'Theme'}</span>
              <strong className="text-ink/90">
                {contract.themePreference === 'light'
                  ? (isAr ? 'فاتح' : 'Light')
                  : contract.themePreference === 'both'
                    ? (isAr ? 'فاتح وداكن' : 'Light & dark')
                    : (isAr ? 'داكن' : 'Dark')}
              </strong>
            </div>
            <div>
              <span className="text-ink/75 block">{isAr ? 'اللغات' : 'Languages'}</span>
              <strong className="text-ink/90">
                {contract.languageSupport === 'ar'
                  ? (isAr ? 'عربي' : 'Arabic')
                  : contract.languageSupport === 'en'
                    ? (isAr ? 'إنجليزي' : 'English')
                    : (isAr ? 'عربي وإنجليزي' : 'Arabic & English')}
              </strong>
            </div>

            <div className="sm:col-span-2">
              <span className="text-ink/75 block">{isAr ? 'ألوان هويتك' : 'Your brand colours'}</span>
              {/* بالكود لا بالمربّع وحده: المربّع يُري اللون تقريباً، والكود هو ما يُنفَّذ به —
                  وهو ما يقدر أن ينسخه ويقارنه بما سلّمناه. dir="ltr" على الكود لأن '#' محايد
                  اتجاهياً، ففي سياق عربي يقفز إلى آخر كود يبدأ بحرف فيُطبع F59E0B#. */}
              {[contract.primaryColor, contract.secondColor, contract.thirdColor].filter(Boolean).length === 0 ? (
                <strong className="text-ink/70">{isAr ? 'لم تختر ألواناً' : 'No colours chosen'}</strong>
              ) : (
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {[contract.primaryColor, contract.secondColor, contract.thirdColor]
                    .filter(Boolean)
                    .map((hex, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5">
                        <span
                          className="w-5 h-5 rounded-md border border-ink/20 shrink-0"
                          style={{ backgroundColor: hex as string }}
                        />
                        <span className="font-mono text-[11px] text-ink/75" dir="ltr">
                          {(hex as string).toUpperCase()}
                        </span>
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>

          {contract.customFeaturesText && (
            <div className="mt-3 pt-3 border-t border-ink/10">
              <span className="text-ink/75 block mb-1">{isAr ? 'ما طلبته إضافياً:' : 'What you requested:'}</span>
              <p className="text-ink/90 leading-relaxed whitespace-pre-line">{contract.customFeaturesText}</p>
            </div>
          )}

          {/* توقيعه — دليل مرئي أنه وقّع فعلاً، لا مجرد سطر يقول ذلك. أهم ما يريد رؤيته فور
              إنشاء العقد: أن يتأكد بعينه أن التوقيع الذي رسمه هو ما التصق بالعقد فعلاً، لا أن
              يثق بكلمة الشاشة. نفس الصورة المطبوعة في القسم الخامس من وثيقة الـPDF حرفياً —
              لا نسخة ثانية منها — فما يراه هنا هو ما سيجده في ملفه المُنزَّل بالضبط. */}
          <div className="mt-3 pt-3 border-t border-ink/10">
            <span className="text-ink/75 block mb-1.5">{isAr ? 'توقيعك' : 'Your Signature'}</span>
            {contract.signatureDataUrl ? (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-white rounded-lg border border-ink/10 px-3 py-2 inline-block">
                  <img
                    src={contract.signatureDataUrl}
                    alt={isAr ? 'توقيعك' : 'Your signature'}
                    className="h-12 max-w-45 object-contain block"
                    style={{
                      // القلب للتواقيع القديمة وحدها — انظر نفس المنطق والتعليق في
                      // ContractPrintDocument.tsx (القسم الخامس).
                      filter: contract.signatureInk === 'dark' ? undefined : 'invert(1)',
                    }}
                  />
                </div>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold"
                  style={{ color: SUCCESS_ON_LIGHT }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isAr ? 'موقَّع إلكترونياً' : 'Signed electronically'}
                </span>
              </div>
            ) : (
              <strong className="text-ink/70">
                {isAr ? 'لم يُسجَّل توقيع لهذا العقد' : 'No signature recorded for this contract'}
              </strong>
            )}
          </div>
        </div>
  );
};
