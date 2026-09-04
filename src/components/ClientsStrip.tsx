import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useClientsStrip } from '../lib/clientsStrip';
import { OBSIDIAN, PAPER } from '../lib/homePalette';
import { bandClipPath, bandSvgPath } from '../lib/bandPath';
import { useSeen } from '../lib/useSeen';
import { Language } from '../lib/i18n';

/**
 * شريط "أعمالنا" — أسماء وشعارات الشركات التي عملنا معها، يمرّ تحت الهيرو بلا توقّف.
 *
 * ## اللون
 * PAPER، وهو اللون الذي ينتهي إليه تدرّج الهيرو فوقه وتبدأ به مراحل العمل تحته — أي أن هذا
 * القسم لا يُدخل أرضية جديدة إلى الصفحة، بل يقع داخل الأرضية القائمة. أي لون آخر هنا يقطع
 * العمود ويُقرأ كقسم غريب مُلصق.
 *
 * ## لماذا CSS خالص ولا إطار جافاسكربت واحد
 * حزام مبنيّ على `requestAnimationFrame` يعني عملاً في الخيط الرئيسي طوال بقاء القسم على
 * الشاشة، وأي انشغال لحظي يظهر كتقطيع. الحركة هنا `transform` واحد على المسار كله: تُنفَّذ على
 * مركّب الطبقات خارج الخيط الرئيسي، فتبقى ناعمة حتى على جهاز ضعيف مشغول بشيء آخر.
 *
 * ## لماذا يُقاس عرض المسار بدل تكراره برقم ثابت
 * الالتفاف بلا قفزة يحتاج مسارين متطابقين والانتقال بمقدار -50%. لكن ذلك يكفي فقط إذا كان
 * **المسار الواحد أعرض من الشاشة**؛ وإلا فبعد أن يخرج آخر عنصر تبقى مساحة فارغة تمشي حتى
 * تصل النسخة الثانية — وهو بالضبط "الفراغ ثم اختفاء الشعارات" الذي يظهر مع عدد قليل من
 * العناصر أو على شاشة عريضة. عدد التكرارات لا يمكن تخمينه من عدد العناصر: اسم قصير و شعار
 * عريض ليسا بنفس العرض، وعرض الصور نفسه لا يُعرف قبل فكّ ترميزها.
 *
 * لذلك يُقاس: ResizeObserver على مسار واحد وعلى الحاوية، ويُرفع التكرار حتى يتجاوز عرضُ
 * المسار عرضَ الحاوية. يعمل مع أي عدد عناصر، وأي عرض شاشة، وأي مقاس شعار، ويعيد الحساب
 * تلقائياً حين تُفك صور جديدة أو يُدار الجهاز.
 */
/**
 * ارتفاع الشريط. الشعارات 36 بكسل على الهاتف و44 على غيره، وهذا يترك لها هامشاً أعلى وأسفل
 * ويعطي الشيفرون طولاً كافياً ليُقرأ كرأس سهم لا كقصّة مائلة.
 */
const BAND_H = 116;

/**
 * اتجاه الشريط هو اتجاه **الحركة** لا اتجاه اللغة، خلافاً لقسم مسار المشروع.
 *
 * المسار مثبَّت على dir="ltr" ويترجم -50% في اللغتين معاً — التعليق أسفل يشرح لماذا — أي أنه
 * يمشي يساراً دائماً. فرأس السهم على اليسار والفتحة على اليمين، وهما بالضبط حيث تدخل الشعارات
 * وتخرج فعلياً.
 */
const FLOWS_RIGHT = false;

export const ClientsStrip: React.FC<{ language?: Language }> = ({ language = 'ar' }) => {
  const strip = useClientsStrip();
  const isAr = language === 'ar';
  const { ref: sectionRef, seen } = useSeen<HTMLElement>();

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const laneRef = useRef<HTMLUListElement | null>(null);
  const [repeats, setRepeats] = useState(1);
  /* مدة الدورة محسوبة لا مأخوذة كما هي من الإعدادات.
     `speedSeconds` معناه "ثوانٍ لعبور عرض شاشة واحد"، والمسافة الفعلية للدورة هي عرض المسار
     الذي يتغيّر بعدد الشعارات وبعرض الجهاز. لو استُعملت القيمة مدةً مباشرة لصار الشريط أسرع
     كلما زادت الشعارات وأبطأ على الشاشة الصغيرة — أي سرعة مختلفة عند كل زائر. */
  const [durationSeconds, setDurationSeconds] = useState(strip.speedSeconds);
  /* عرض الشريط بالبكسل، لرسم الحدّ. الـSVG يُرسم بالبكسل الحقيقي لا بـviewBox ممدود:
     preserveAspectRatio="none" يمدّ المحورين بنسبتين مختلفتين، فيتفلطح الشيفرون على شاشة
     عريضة ويصير حادّاً على ضيقة — وهو الشكل الوحيد هنا الذي يجب أن يحافظ على زاويته. */
  const [bandWidth, setBandWidth] = useState(0);

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const lane = laneRef.current;
    if (!viewport || !lane) return;
    const laneWidth = lane.getBoundingClientRect().width;
    const viewportWidth = viewport.getBoundingClientRect().width;
    if (laneWidth <= 0 || viewportWidth <= 0) return;

    // عرض نسخة واحدة من القائمة (بلا التكرار الحالي)، ثم كم نسخة تلزم لتغطية الشاشة ومعها
    // هامش أمان بسيط حتى لا يقع الطرف تماماً على حافة الشاشة عند القياس الكسري.
    const singleWidth = laneWidth / repeats;
    if (singleWidth <= 0) return;
    const needed = Math.ceil((viewportWidth * 1.15) / singleWidth);
    // سقف يمنع أي احتمال لحلقة لا تنتهي لو أعاد القياس صفراً أو قيمة شاذة أثناء التخطيط.
    const next = Math.min(24, Math.max(1, needed));
    if (next !== repeats) setRepeats(next);

    const seconds = Math.max(4, strip.speedSeconds * (laneWidth / viewportWidth));
    setDurationSeconds((prev) => (Math.abs(prev - seconds) > 0.25 ? seconds : prev));

    // عتبة بكسل واحد: ResizeObserver يُطلق على كسور البكسل أثناء التخطيط، وحالة جديدة عند
    // كل كسر تعني إعادة عرض لا يراها أحد.
    setBandWidth((prev) => (Math.abs(prev - viewportWidth) > 1 ? viewportWidth : prev));
  }, [repeats, strip.speedSeconds]);

  useEffect(() => {
    measure();
    const viewport = viewportRef.current;
    const lane = laneRef.current;
    if (!viewport || !lane || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(lane);
    return () => observer.disconnect();
  }, [measure, strip.items]);

  // التفعيل يدوي: لا يظهر شيء حتى يشغّله الأدمن ويضيف عنصراً واحداً على الأقل.
  if (!strip.enabled || strip.items.length === 0) return null;

  const lane = Array.from({ length: repeats }, () => strip.items).flat();

  const Item: React.FC<{ item: (typeof strip.items)[number] }> = ({ item }) => (
    <li className="shrink-0 px-6 sm:px-9 flex items-center">
      {item.logoDataUrl ? (
        <img
          src={item.logoDataUrl}
          alt={item.name}
          /* لا loading="lazy" هنا: الصورة data URL موجودة في المستند أصلاً، فالتأجيل لا يوفّر
             تنزيلاً — كل ما يفعله هو تأخير معرفة عرضها، وهو ما يجعل قياس المسار أعلاه يبدأ
             من عرض خاطئ فتظهر فجوة حتى يُعاد القياس. */
          decoding="async"
          /* ارتفاع موحّد وعرض حر: الشعارات تصل بنسب مختلفة وتثبيت الاثنين يشوّهها. التدرّج
             الرمادي يجعل شعارات بألوان متضاربة تُقرأ كصفّ واحد مرتّب لا لافتات متنافسة. */
          className="h-9 sm:h-11 w-auto max-w-[160px] object-contain opacity-85 grayscale"
        />
      ) : (
        <span className="text-base sm:text-xl font-black whitespace-nowrap" style={{ color: OBSIDIAN, opacity: 0.72 }}>
          {item.name}
        </span>
      )}
    </li>
  );

  return (
    <section aria-label={strip.title} className="relative overflow-hidden py-8 sm:py-10" style={{ background: PAPER }}>
      {/* بمقاس عناوين الأقسام في هذا الموقع (قارن PhasesSection)، لا كلمة صغيرة فوق شريط:
          كان سطراً بحجم 0.7rem بتباعد حروف واسع، وهو مقاس "لصيقة" لا مقاس عنوان قسم. */}
      <h2
        className="nq-container text-center text-[1.55rem] sm:text-[2.1rem] uw:text-[2.6rem] font-black leading-none tracking-tight mb-8 sm:mb-10"
        style={{ color: OBSIDIAN }}
      >
        {strip.title}
      </h2>

      {/* تلاشٍ عند الطرفين: بدونه تُقصّ الشعارات بحدّ حادّ عند حافة الشاشة فتبدو الحركة وكأنها
          تصطدم بجدار. القناع يجعلها تدخل وتخرج من العدم. */}
      <div
        ref={viewportRef}
        /* dir="ltr" على النافذة نفسها لا على المسار وحده — وهنا كان الخلل الباقي.
           القسم داخل صفحة عربية (rtl)، والمسار أعرض من النافذة. في التخطيط العربي يُثبَّت
           الطفل الفائض عن أبيه عند الحافة **اليمنى**، فيفيض ما زاد عنه إلى اليسار خارج
           الشاشة: أي أن ما نراه هو ذيل المسار، ثم تدفعه الحركة يساراً فيتعرّى الجانب الأيمن
           ولا شيء خلفه — وهو الفراغ في الصورة بالضبط. وضع dir على المسار وحده لم يكفِ لأن
           موضع صندوقه يقرّره أبوه لا هو.
           بـ ltr يبدأ المسار من الحافة اليسرى ويفيض يميناً، فتدخل النسخة المكرّرة من اليمين
           كلما خرجت الأصلية من اليسار: اتصال دائم بلا فراغ. */
        dir="ltr"
        className="relative"
        style={{
          maskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)',
        }}
      >
        {/* dir="ltr" على المسار، وهذا هو أصل "الفراغ الكبير ثم يظهر من العدم".
            الصفحة عربية (rtl)، فالنسختان تُصفّان من اليمين إلى اليسار: النسخة الأصلية تحتل
            النصف الأيمن والمكرّرة النصف الأيسر. والحركة `-50%` تدفع المسار يساراً — أي نحو
            النسخة التي تُغادر، بينما الجهة التي تُفرَّغ (اليمين) لا يوجد خلفها شيء. النتيجة
            بالضبط: الشعارات تخرج، يبقى فراغ بعرض المسار، ثم تعود دفعة واحدة عند إعادة الدورة.
            بترتيب ltr تقع النسخة المكرّرة خلف الأصلية في اتجاه الحركة، فما يخرج من جهة يدخل
            من الأخرى بلا أي فراغ. الشعارات والأسماء محايدة الاتجاه فلا يغيّرها هذا بصرياً.

            pointer-events-none: الحزام عرض لا عنصر تفاعلي — لا يتوقّف بالمرور عليه ولا
            يستجيب لضغطة، كما طُلب. */}
        <div
          dir="ltr"
          className="nq-marquee flex w-max pointer-events-none"
          style={{ ['--nq-marquee-duration' as string]: `${durationSeconds}s` }}
        >
          <ul ref={laneRef} className="flex items-center">
            {lane.map((item, i) => (
              <Item key={`a-${item.id}-${i}`} item={item} />
            ))}
          </ul>
          {/* النسخة الثانية مطابقة تماماً و`aria-hidden`: هي ما يقع تحت العين لحظة إرجاع
              المسار إلى الصفر، فلا تُرى قفزة. ليست محتوى إضافياً لقارئ الشاشة. */}
          <ul className="flex items-center" aria-hidden="true">
            {lane.map((item, i) => (
              <Item key={`b-${item.id}-${i}`} item={item} />
            ))}
          </ul>
        </div>
      </div>

      <span className="sr-only">{isAr ? 'شركات عملنا معها' : 'Companies we have worked with'}</span>
    </section>
  );
};
