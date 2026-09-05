import React, { useState } from 'react';
import { ArrowUpLeft, ArrowUpRight, ChevronDown } from 'lucide-react';
import { useClientsStrip, type ClientItem } from '../lib/clientsStrip';
import { OBSIDIAN, ORANGE, PAPER, WHITE } from '../lib/homePalette';
import { Language } from '../lib/i18n';
import { useSeen } from '../lib/useSeen';
import { useTileField } from './ui/nqSurface';

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

/**
 * بطاقة واحدة. صارت مكوّناً لأن حقل المكعّبات hook، والـhooks لا تُستدعى داخل حلقة.
 *
 * والحقل هو نفسه الذي تحت أزرار الموقع — `useTileField` المستخرَج من nqSurface — وليس
 * نسخة ثانية منه: نفس الميزانية (حقلان حيّان في الموقع كله)، ونفس تأخير الـ120ms قبل
 * إنشاء سياق WebGL، ونفس الـ900ms بعد مغادرة المؤشر. فمرور سريع على الرزمة لا ينشئ
 * خمسة سياقات، ولا واحداً.
 *
 * والسطح الممرّر هو لون البطاقة نفسه لا لوناً قريباً منه: المكعّبات هي السطح، وما بينها
 * شفّاف يظهر منه ملء البطاقة — ولو اختلفا لقُرئ الحقل طبقة موضوعة فوقها.
 */
const WorkCard: React.FC<{
  item: ClientItem;
  index: number;
  total: number;
  open: boolean;
  onToggle: () => void;
  isAr: boolean;
  ExternalArrow: typeof ArrowUpLeft;
}> = ({ item, index, total, open, onToggle, isAr, ExternalArrow }) => {
  const field = useTileField({ enabled: true, surface: WHITE, accent: ORANGE });
  const { ref: fieldRef, ...fieldHandlers } = field.handlers;

  /* بطاقة بلا وصف وبلا رابط ليس تحتها ما يُفتح، فلا تُقدَّم كشيء يُفتح. */
  const expandable = Boolean(item.blurb || item.url);
  const isOpen = expandable && open;
  const panelId = `nq-work-panel-${item.id}`;
  const labelId = `nq-work-label-${item.id}`;

  /* المسرح شريطان: الأعلى ما يبقى ظاهراً، والأسفل ما تغطيه البطاقة التالية.
     ارتفاعه ثابت في كل الحالات: ظهور الاسم لا يغيّر ارتفاع البطاقة، وإلا قفزت
     الرزمة كلها كلما مرّ المؤشر على واحدة.

     و`reveal` هو "هل لهذه البطاقة شعار؟" ولا شيء أكثر. ربطتُه مرّةً بـ`expandable`
     أيضاً، فاختفى التصميم كله على البيانات الحقيقية: ما من عميل له رابط أو وصف
     بعد، فكانت كل بطاقة تُرسم بالنسخة البديلة. ومسألة اللمس تُحلّ في مكانها
     الصحيح: استعلام `hover` في الملف النمطي، لا شرط على حقل قد يكون فارغاً. */
  const reveal = Boolean(item.logoDataUrl);

  const head = (
    <span className="nq-work-stage relative w-full" data-reveal={reveal ? 'true' : 'false'}>
      <span className="nq-work-face absolute inset-x-0 top-0 flex flex-col items-center justify-center gap-1">
        {reveal ? (
          <img
            src={item.logoDataUrl}
            alt=""
            /* alt فارغ: الاسم موجود نصاً في الشجرة حتى حين لا يُرى، فقراءة الاثنين
               تعني سماع الاسم مرتين. ولا loading="lazy": الصورة data URL موجودة في المستند
               أصلاً، فالتأجيل لا يوفّر تنزيلاً. والارتفاع من الملف النمطي لا من صنف Tailwind:
               يختلف بين اللمس والمؤشر، والفرق جزء من هندسة مكتوبة هناك كلها. */
            decoding="async"
            className="nq-work-logo max-w-full object-contain rounded-lg"
          />
        ) : (
          /* بلا شعار ليس للاسم ما يخرج من خلفه، فهو البطاقة كلها ويبقى في وسطها. */
          <span
            id={labelId}
            title={item.name}
            className="block w-full truncate text-center text-[0.95rem] font-black"
            style={{ color: OBSIDIAN }}
          >
            {item.name}
          </span>
        )}
      </span>

      {/* الاسم. موضعه وظهوره من الملف النمطي: تحت الشعار وظاهراً حيث لا مؤشر، وفي
          الشريط المغطّى ومخفيّاً حيث يوجد. والإخفاء بـ opacity لا بـ visibility: هذا النص هو
          الاسم المُعلَن للزر وإليه يشير aria-labelledby، فيلزم بقاؤه في شجرة الوصول. */}
      {reveal && (
        <span
          id={labelId}
          title={item.name}
          className="nq-work-name truncate text-center text-[0.95rem] font-black"
          style={{ color: OBSIDIAN }}
        >
          {item.name}
        </span>
      )}

      {/* غلاف يضع وأيقونة تدور. عنصر واحد لا يحمل الاثنين: دوران الفتح يمسح إزاحة
          التوسيط، وهو نفس التصادم الذي كلّف قسم المسار إعادة بناء كاملة. وهو يتبع
          الشريط الظاهر، وإلا اختفى تحت البطاقة التالية مع الاسم. */}
      {expandable && (
        <span className="nq-work-caret absolute end-0 top-0 flex items-center" aria-hidden="true">
          <ChevronDown
            className="nq-work-chevron w-5 h-5"
            strokeWidth={2.4}
            style={{ color: OBSIDIAN, opacity: 0.45 }}
          />
        </span>
      )}
    </span>
  );

  return (
    <li
      className="nq-work-item nq-rise relative"
      style={{
        /* الترتيب يتصاعد مع الرزمة، والبطاقة المفتوحة تقفز فوق الجميع حتى لا يقصّ
           ظلَّها ما تحتها. */
        zIndex: isOpen ? total + 1 : index + 1,
        ['--nq-rise-delay' as string]: `${160 + index * 70}ms`,
      }}
    >
      {/* `isolate` يفتح سياق تراصّ خاصاً بالبطاقة، و`overflow-hidden` هو ما يقصّ لوحة المكعّبات
          على زواياها المدوّرة. وما بعدها `relative`: اللوحة مطلقة الموضع، فمحتوى غير موضّع
          كان سيُرسم تحتها. */}
      <div
        ref={fieldRef as React.Ref<HTMLDivElement>}
        {...fieldHandlers}
        className="nq-work-card relative isolate rounded-2xl overflow-hidden"
        data-open={isOpen ? 'true' : 'false'}
        style={{
          background: WHITE,
          border: `1px solid ${isOpen ? ORANGE : `${OBSIDIAN}14`}`,
        }}
      >
        {field.tiles}
        {expandable ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={panelId}
            className="nq-work-head relative w-full px-4 sm:px-5 flex items-center cursor-pointer outline-none"
          >
            {head}
          </button>
        ) : (
          <div className="relative px-4 sm:px-5 flex items-center">{head}</div>
        )}

        {/* الشبكة من 0fr إلى 1fr هي ما يفتح اللوحة.
            وهي خاصية تخطيط تُعيد الحساب في كل إطار، خلافاً لقاعدة "حرّك transform
            وopacity فقط" — والاستثناء مقصود ومحدود: بطاقة واحدة تتحرك في المرّة،
            و220ms، وأكورديون بلا حركة ارتفاع يقفز بدل أن ينفتح. البدائل الأخرى أسوأ:
            max-height ثابت يقصّ وصفاً طويلاً، وموضع مطلق يُخرج اللوحة من التدفّق
            فتغطّي البطاقة التالية بدل أن تدفعها. */}
        <div className="nq-work-panel relative" id={panelId} role="region" aria-labelledby={labelId}>
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
};

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

  /* هل يوجد فعلاً ما يُضغط؟ السطر تحت العنوان يطلب من الزائر الضغط، وما دام لا رابط
     ولا وصف لأي عميل فلا بطاقة تُفتح، فيصير السطر دعوة إلى شيء جامد. يعود وحده أول
     ما يُملأ رابط أو وصف من لوحة الأدمن. */
  const anyExpandable = strip.items.some((i) => Boolean(i.url || i.blurb));

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
              ? anyExpandable
                ? 'شركات اشتغلنا وياها. اضغط على أي بطاقة لتقرأ ما بنيناه لها.'
                : 'شركات اشتغلنا وياها.'
              : anyExpandable
                ? 'Companies we have worked with. Open any card to read what we built for them.'
                : 'Companies we have worked with.'}
          </p>
        </header>

        {/* محدود العرض عمداً: رزمة تمتد على عرض القسم تتوقف عن أن تُقرأ رزمة
            وتصير قائمة صفوف. وعلى الهاتف السقف أوسع من الحاوية أصلاً، فلا أثر له هناك
            وتبقى البطاقات بعرض الشاشة. */}
        <ul className="relative w-full max-w-[330px] mx-auto">
          {strip.items.map((item, index) => (
            <WorkCard
              key={item.id}
              item={item}
              index={index}
              total={strip.items.length}
              open={openId === item.id}
              onToggle={() => setOpenId((cur) => (cur === item.id ? null : item.id))}
              isAr={isAr}
              ExternalArrow={ExternalArrow}
            />
          ))}
        </ul>
      </div>
    </section>
  );
};
