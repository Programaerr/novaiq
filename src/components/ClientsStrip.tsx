import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useClientsStrip } from '../lib/clientsStrip';
import { OBSIDIAN, PAPER, WHITE } from '../lib/homePalette';
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
/* ضلع البطاقة والفراغ حولها، بالبكسل ولمقاسين فقط.

   مكتوبة هنا لا في الأصناف (classes) لأن حساب الطور أدناه يحتاج الخطوة الواحدة رقماً:
   مركز البطاقة رقم i هو i × الخطوة + نصف الخطوة. لو كان المقاس في الأصناف والحساب هنا
   لصار للشيء الواحد مصدران، وأي تعديل على أحدهما يُزيح التحوّل عن حافة الشريط بصمت. */
const TILE = { sm: 96, lg: 120 };
const GAP = { sm: 20, lg: 28 };

export const ClientsStrip: React.FC<{ language?: Language }> = ({ language = 'ar' }) => {
  const strip = useClientsStrip();
  const isAr = language === 'ar';

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const laneRef = useRef<HTMLUListElement | null>(null);
  const [repeats, setRepeats] = useState(1);
  /* مدة الدورة محسوبة لا مأخوذة كما هي من الإعدادات.
     `speedSeconds` معناه "ثوانٍ لعبور عرض شاشة واحد"، والمسافة الفعلية للدورة هي عرض المسار
     الذي يتغيّر بعدد الشعارات وبعرض الجهاز. لو استُعملت القيمة مدةً مباشرة لصار الشريط أسرع
     كلما زادت الشعارات وأبطأ على الشاشة الصغيرة — أي سرعة مختلفة عند كل زائر. */
  const [durationSeconds, setDurationSeconds] = useState(strip.speedSeconds);
  /* عرض المسار وعرض النافذة، محفوظان لا مقروءان عند العرض: منهما وحدهما يُحسب طور كل
     بطاقة أدناه، وقراءتهما من DOM أثناء العرض كانت ستجبر تخطيطاً متزامناً في كل إطار. */
  const [metrics, setMetrics] = useState({ laneWidth: 0, viewportWidth: 0 });

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

    // عتبة بكسل واحد، مثل عتبة الربع ثانية أعلاه: ResizeObserver يُطلق على كسور البكسل
    // في أثناء التخطيط، وحالة جديدة عند كل كسر تعني إعادة عرض لا يراها أحد.
    setMetrics((prev) =>
      Math.abs(prev.laneWidth - laneWidth) > 1 || Math.abs(prev.viewportWidth - viewportWidth) > 1
        ? { laneWidth, viewportWidth }
        : prev,
    );
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

  const wide = metrics.viewportWidth >= 640;
  const side = wide ? TILE.lg : TILE.sm;
  const pitch = side + (wide ? GAP.lg : GAP.sm);

  /* طور البطاقة: كم مضى من دورة الشريط لحظة عبورها الحافة اليمنى، بالسالب.

     التحوّل يجب أن يقع حيث **تدخل** البطاقة الشريط، لا عند نقطة ما من دورتها هي، وإلا رآه
     كل زائر في مكان مختلف من الشريط حسب لحظة فتحه الصفحة. والحركتان تتقاسمان ساعة واحدة
     أصلاً — دورة الشريط — فلا تحتاج البطاقة أن تعرف أكثر من إزاحتها داخل تلك الدورة.

     بطاقة على الشاشة الآن تأخذ تأخيراً سالباً يساوي الزمن المنقضي منذ دخولها، فتُرسم
     مفتوحة كما يجب. وبطاقة لم تصل الحافة بعد يقع كيفريمها الصفري على لحظة عبورها إياها. */
  const delayFor = (index: number): string => {
    if (metrics.laneWidth <= 0) return '0s';
    const centre = index * pitch + pitch / 2;
    /* البطاقة تعبر الحافة اليمنى بعد (المركز − عرض النافذة) ÷ السرعة، والسرعة هي عرض المسار
       ÷ المدّة — فالتأخير هو هذا الفرق نفسه مقيساً بالدورة. بلا باقي قسمة: المركز يقع بين
       صفر وعرض المسار، فالناتج بين −(مدّة × عرض النافذة ÷ عرض المسار) و+المدّة، وحركة لا
       نهائية تقبل المدى كله.

       والإشارتان تُقرآن كما هما: السالب بطاقة دخلت فعلاً وهذا هو الزمن المنقضي منذ دخولها،
       فتُرسم عند النقطة التي بلغتها من الانفتاح؛ والموجب بطاقة لم تصل بعد، وملء backwards
       يُبقيها على الكيفريم الصفري — المثلث — إلى أن تصل. */
    const seconds = (durationSeconds * (centre - metrics.viewportWidth)) / metrics.laneWidth;
    return `${seconds.toFixed(3)}s`;
  };

  const Item: React.FC<{ item: (typeof strip.items)[number]; index: number }> = ({ item, index }) => (
    <li
      /* nq-tile هي القصّ نفسه — انظر الكيفريمات في index.css. البطاقة مربّعة بضلع ثابت لأن
         المضلّع نسبيّ (100%)، وضلع متغيّر كان سيجعل ميل المثلث يختلف من بطاقة لأخرى. */
      className="nq-tile shrink-0 grid place-items-center overflow-hidden"
      style={{
        width: side,
        height: side,
        marginInline: (wide ? GAP.lg : GAP.sm) / 2,
        background: WHITE,
        /* حدّ شعري لا ظلّ: البطاقة تُقصّ، والظلّ يُقصّ معها فيتحوّل إلى حافة سوداء حادة على
           ضلع المثلث المائل. الحدّ يُقصّ أيضاً لكنه يبقى حدّاً. */
        border: `1px solid ${OBSIDIAN}1F`,
        ['--nq-tile-delay' as string]: delayFor(index),
      }}
    >
      {item.logoDataUrl ? (
        <img
          src={item.logoDataUrl}
          alt={item.name}
          /* لا loading="lazy" هنا: الصورة data URL موجودة في المستند أصلاً، فالتأجيل لا يوفّر
             تنزيلاً — كل ما يفعله هو تأخير معرفة عرضها، وهو ما يجعل قياس المسار أعلاه يبدأ
             من عرض خاطئ فتظهر فجوة حتى يُعاد القياس. */
          decoding="async"
          /* داخل مربّع الآن، فالمقاس صار نسبة من ضلعه لا ارتفاعاً ثابتاً. object-contain يحفظ
             نسبة كل شعار، و64% تترك هامشاً يبقى داخل المثلث فترة أطول أثناء الانفتاح.
             التدرّج الرمادي يجعل شعارات بألوان متضاربة تُقرأ كصفّ واحد لا لافتات متنافسة. */
          className="max-w-[64%] max-h-[64%] w-auto h-auto object-contain opacity-85 grayscale"
        />
      ) : (
        /* بلا whitespace-nowrap: الاسم صار داخل مربّع لا في سطر مفتوح، فمنع الالتفاف كان
           سيدفعه خارج البطاقة. ثلاثة أسطر كحدّ، وما زاد يُقصّ بنقاط. */
        <span
          className="px-2 text-center text-[0.8rem] sm:text-[0.9rem] font-black leading-snug line-clamp-3"
          style={{ color: OBSIDIAN, opacity: 0.72 }}
        >
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
              <Item key={`a-${item.id}-${i}`} item={item} index={i} />
            ))}
          </ul>
          {/* النسخة الثانية مطابقة تماماً و`aria-hidden`: هي ما يقع تحت العين لحظة إرجاع
              المسار إلى الصفر، فلا تُرى قفزة. ليست محتوى إضافياً لقارئ الشاشة. */}
          <ul className="flex items-center" aria-hidden="true">
            {lane.map((item, i) => (
              <Item key={`b-${item.id}-${i}`} item={item} index={i} />
            ))}
          </ul>
        </div>
      </div>

      <span className="sr-only">{isAr ? 'شركات عملنا معها' : 'Companies we have worked with'}</span>
    </section>
  );
};
