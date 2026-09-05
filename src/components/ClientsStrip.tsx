import React, { useState } from 'react';
import { ArrowUpLeft, ArrowUpRight, ChevronDown } from 'lucide-react';
import { useClientsStrip } from '../lib/clientsStrip';
import { OBSIDIAN, ORANGE, PAPER, WHITE } from '../lib/homePalette';
import { Language } from '../lib/i18n';
import { useSeen } from '../lib/useSeen';

/**
 * "أعمالنا" — رزمة بطاقات، بطاقة لكل شركة عملنا معها. تُرفع بالمرور وتُفتح بالضغط.
 *
 * ## لماذا انتهى الحزام المتحرك
 *
 * كان هذا القسم شريطاً يمشي بلا توقف، وكان صحيحاً لما كان يحمله: شعارات ولا شيء غيرها. الآن كل
 * بطاقة تحمل وصفاً وزر زيارة، وكلاهما شيء يُقرأ ويُضغط — ولا يُقرأ ولا يُضغط ما ينزلق من تحت
 * المؤشر. فالحركة الدائمة والمحتوى التفاعلي لا يجتمعان، وما ذهب هو الحركة.
 *
 * ## الضغط أولاً، والمرور زيادة
 *
 * الرفع عند المرور هو ما طُلب، لكنه لا يعمل على أي جهاز لمس — وهو أغلب الزوار. لذلك كل ما يفتح
 * البطاقة مربوط بالضغط، والمرور يضيف الرفع فقط. أي أن الهاتف لا يفقد شيئاً من المحتوى، وهذا هو
 * فرق "تأثير المرور لا يعمل باللمس" بين أن يكون ملاحظة وأن يكون نصف القسم مفقوداً.
 *
 * ## البطاقات كلها فاتحة، والنشطة لا تنقلب داكنة
 *
 * الطريقة البديهية لإبراز البطاقة المفتوحة هي ملؤها بلون العلامة الداكن. وهي خاطئة هنا لسبب لا
 * علاقة له بالذوق: ما داخل البطاقة شعار شركة، والشعارات تصل بألوان لا نتحكم بها، وأغلبها داكن —
 * فسطح داكن يبتلع نصفها. الحالة النشطة تُقال بالحدّ والظل والرفع وبعودة الشعار إلى ألوانه من
 * التدرّج الرمادي، والسطح يبقى فاتحاً في كل الحالات.
 *
 * ## الرابط والوصف اختياريان، وغيابهما ليس نقصاً يُملأ
 *
 * بطاقة بلا رابط لا تعرض زر زيارة — لا زراً معطّلاً ولا رابطاً مخمّناً — وبطاقة بلا وصف ولا رابط
 * لا تُفتح أصلاً، فتُعرض بطاقةً ساكنة بلا `aria-expanded` ولا زر. هذه شركات حقيقية، واختراع عنوان
 * أو جملة لإحداها خطأ يقع على طرف ثالث لا على الموقع.
 */

/** كم تختفي كل بطاقة تحت التي فوقها. صغير عمداً: يكفي ليُقرأ الصفّ رزمةً، ولا يخفي شعاراً. */
const OVERLAP_REM = 1;

export const ClientsStrip: React.FC<{ language?: Language }> = ({ language = 'ar' }) => {
  const strip = useClientsStrip();
  const isAr = language === 'ar';
  const { ref: sectionRef, seen } = useSeen<HTMLElement>();

  /* واحدة مفتوحة في كل مرة. رزمة بطاقات مفتوحة كلها ليست رزمة، هي قائمة طويلة — والرسم الذي
     طُلب منه هذا القسم رزمة. */
  const [openId, setOpenId] = useState<string | null>(null);

  // التفعيل يدوي: لا يظهر شيء حتى يشغّله الأدمن ويضيف عنصراً واحداً على الأقل.
  if (!strip.enabled || strip.items.length === 0) return null;

  /* السهم يشير إلى خارج الصفحة، وجهة الخارج تختلف باختلاف اتجاه القراءة. أيقونتان لا واحدة
     مقلوبة بـ`scale-x-[-1]`: القلب يعكس رأس السهم وذيله معاً فيخرج شكل لا معنى له. */
  const ExternalArrow = isAr ? ArrowUpLeft : ArrowUpRight;

  /* عمود الشعار يُقرّر مرة واحدة للقائمة كلها لا لكل بطاقة.
     مع الشعارات لازم يكون موجوداً وبعرض ثابت، وإلا بدأت الأسماء من موضع مختلف في كل
     بطاقة وتوقّفت الرزمة عن أن تُقرأ رزمة. وبلا أي شعار يصير مجرد فراغ يُقرأ إزاحة خاطئة. */
  const hasAnyLogo = strip.items.some((i) => Boolean(i.logoDataUrl));

  return (
    <section
      ref={sectionRef}
      data-seen={seen ? 'true' : 'false'}
      aria-label={strip.title}
      className="relative py-16 sm:py-24"
      style={{ background: PAPER }}
    >
      <div className="nq-container grid gap-10 lg:gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-center">
        {/* العنوان أولاً في المصدر، فيقع يميناً في العربية ويساراً في الإنجليزية بلا أي عكس
            يدوي — الشبكة تأخذ اتجاهها من المستند. */}
        <header className="text-center">
          <h2
            className={`nq-rise text-[1.75rem] sm:text-[2.4rem] lg:text-[3rem] font-black leading-[1.2] ${
              isAr ? '' : 'tracking-tight'
            }`}
            style={{ color: OBSIDIAN, ['--nq-rise-delay' as string]: '60ms' }}
          >
            {strip.title}
          </h2>
          <p
            className="nq-rise mt-4 mx-auto max-w-[26rem] text-[1rem] font-bold leading-[1.9]"
            style={{ color: OBSIDIAN, opacity: 0.72, ['--nq-rise-delay' as string]: '120ms' }}
          >
            {isAr
              ? 'شركات اشتغلنا وياها. اضغط على أي بطاقة لتقرأ ما بنيناه لها.'
              : 'Companies we have worked with. Open any card to read what we built for them.'}
          </p>
        </header>

        {/* محدود العرض عمداً: رزمة تمتد على عرض القسم تتوقف عن أن تُقرأ رزمة
            وتصير قائمة صفوف. وعلى الهاتف السقف أوسع من الحاوية أصلاً، فلا أثر له هناك
            وتبقى البطاقات بعرض الشاشة. */}
        <ul className="relative w-full max-w-[330px] mx-auto">
          {strip.items.map((item, index) => {
            /* بطاقة بلا وصف وبلا رابط ليس تحتها ما يُفتح، فلا تُقدَّم كشيء يُفتح. */
            const expandable = Boolean(item.blurb || item.url);
            const isOpen = expandable && openId === item.id;
            const panelId = `nq-work-panel-${item.id}`;
            const labelId = `nq-work-label-${item.id}`;

            const head = (
              <span className="flex items-center gap-4 w-full">
                {hasAnyLogo && (
                <span className="grid place-items-center w-[4.5rem] h-12 shrink-0">
                  {item.logoDataUrl ? (
                    <img
                      src={item.logoDataUrl}
                      alt=""
                      /* alt فارغ: الاسم مكتوب بجانبه نصاً، وقراءة الاثنين تعني سماع الاسم مرتين.
                         لا loading="lazy": الصورة data URL موجودة في المستند أصلاً، فالتأجيل لا
                         يوفّر تنزيلاً. */
                      decoding="async"
                      className="nq-work-logo max-h-12 max-w-full object-contain rounded-lg"
                    />
                  ) : null}
                </span>
                )}

                <span className="min-w-0 flex-1 text-start">
                  <span id={labelId} className="block text-[1.05rem] font-black" style={{ color: OBSIDIAN }}>
                    {item.name}
                  </span>
                </span>

                {expandable && (
                  <ChevronDown
                    className="nq-work-chevron w-5 h-5 shrink-0"
                    strokeWidth={2.4}
                    style={{ color: OBSIDIAN, opacity: 0.45 }}
                    aria-hidden="true"
                  />
                )}
              </span>
            );

            return (
              <li
                key={item.id}
                className="nq-work-item nq-rise relative"
                style={{
                  marginTop: index === 0 ? 0 : `-${OVERLAP_REM}rem`,
                  /* الترتيب يتصاعد مع الرزمة، والبطاقة المفتوحة تقفز فوق الجميع حتى لا يقصّ
                     ظلَّها ما تحتها. */
                  zIndex: isOpen ? strip.items.length + 1 : index + 1,
                  ['--nq-rise-delay' as string]: `${160 + index * 70}ms`,
                }}
              >
                <div
                  className="nq-work-card rounded-2xl overflow-hidden"
                  data-open={isOpen ? 'true' : 'false'}
                  style={{
                    background: WHITE,
                    border: `1px solid ${isOpen ? ORANGE : `${OBSIDIAN}14`}`,
                  }}
                >
                  {expandable ? (
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className="nq-work-head w-full min-h-11 px-4 sm:px-5 py-4 flex items-center cursor-pointer outline-none"
                    >
                      {head}
                    </button>
                  ) : (
                    <div className="min-h-11 px-4 sm:px-5 py-4 flex items-center">{head}</div>
                  )}

                  {/* الشبكة من 0fr إلى 1fr هي ما يفتح اللوحة.
                      وهي خاصية تخطيط تُعيد الحساب في كل إطار، خلافاً لقاعدة "حرّك transform
                      وopacity فقط" — والاستثناء مقصود ومحدود: بطاقة واحدة تتحرك في المرّة،
                      و220ms، وأكورديون بلا حركة ارتفاع يقفز بدل أن ينفتح. البدائل الأخرى أسوأ:
                      max-height ثابت يقصّ وصفاً طويلاً، وموضع مطلق يُخرج اللوحة من التدفّق
                      فتغطّي البطاقة التالية بدل أن تدفعها. */}
                  <div className="nq-work-panel" id={panelId} role="region" aria-labelledby={labelId}>
                    <div className="overflow-hidden">
                      <div className="px-4 sm:px-5 pb-4 pt-1">
                        <span
                          aria-hidden="true"
                          className="block h-px w-full mb-4"
                          style={{ background: `${OBSIDIAN}14` }}
                        />
                        {item.blurb && (
                          <p className="text-[0.95rem] font-bold leading-[1.9]" style={{ color: OBSIDIAN, opacity: 0.75 }}>
                            {item.blurb}
                          </p>
                        )}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            /* noopener مطلوب أمنياً مع target="_blank": بدونه تحصل الصفحة
                               المفتوحة على window.opener وتستطيع تحويل تبويبنا إلى أي عنوان.
                               والرابط نفسه مفحوص عند القراءة (safeUrl في clientsStrip.ts)،
                               فلا يصل إلى هنا إلا http أو https. */
                            rel="noopener noreferrer"
                            className={`nq-work-visit ${item.blurb ? 'mt-4' : ''} inline-flex items-center gap-2 min-h-11 px-4 rounded-xl text-[0.9rem] font-black outline-none`}
                            style={{ background: ORANGE, color: WHITE }}
                          >
                            {isAr ? 'زيارة الموقع' : 'Visit the site'}
                            <ExternalArrow className="w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
                            {/* يُقرأ ولا يُرى: فتح تبويب جديد بلا إنذار يفقد المستخدم موضعه،
                                والسهم وحده لا يُنطق. */}
                            <span className="sr-only">{isAr ? '(يفتح في تبويب جديد)' : '(opens in a new tab)'}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
