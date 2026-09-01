import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useClientsStrip } from '../lib/clientsStrip';
import { OBSIDIAN, PAPER, ORANGE_ON_LIGHT } from '../lib/homePalette';
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
export const ClientsStrip: React.FC<{ language?: Language }> = ({ language = 'ar' }) => {
  const strip = useClientsStrip();
  const isAr = language === 'ar';

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const laneRef = useRef<HTMLUListElement | null>(null);
  const [repeats, setRepeats] = useState(1);

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
  }, [repeats]);

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
          className="h-9 sm:h-11 w-auto max-w-[160px] object-contain opacity-80 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
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
      <h2
        className="nq-container text-center text-[0.7rem] sm:text-xs font-black tracking-[0.28em] uppercase mb-6"
        style={{ color: ORANGE_ON_LIGHT }}
      >
        {strip.title}
      </h2>

      {/* تلاشٍ عند الطرفين: بدونه تُقصّ الشعارات بحدّ حادّ عند حافة الشاشة فتبدو الحركة وكأنها
          تصطدم بجدار. القناع يجعلها تدخل وتخرج من العدم. */}
      <div
        ref={viewportRef}
        className="relative"
        style={{
          maskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)',
        }}
      >
        <div
          className="nq-marquee flex w-max"
          style={{ ['--nq-marquee-duration' as string]: `${strip.speedSeconds}s` }}
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
