import React from 'react';
import { useClientsStrip } from '../lib/clientsStrip';
import { OBSIDIAN, WHITE, ORANGE_ON_LIGHT } from '../lib/homePalette';
import { Language } from '../lib/i18n';

/**
 * شريط "أعمالنا" — أسماء وشعارات الشركات التي عملنا معها، يمرّ تحت الهيرو بلا توقّف.
 *
 * ## لماذا CSS خالص ولا إطار جافاسكربت واحد
 * حزام متحرك مبنيّ على `requestAnimationFrame` يعني عملاً في الخيط الرئيسي طوال بقاء القسم
 * على الشاشة، وأي انشغال لحظي (تحميل صورة، فك ضغط، إعادة تخطيط) يظهر كتقطيع في الحركة.
 * الحركة هنا `transform` واحد على المسار كله: تعمل على مركّب الطبقات (compositor)، أي خارج
 * الخيط الرئيسي تماماً، فتبقى ناعمة حتى على جهاز ضعيف مشغول بشيء آخر — وهذا هو الفرق بين
 * "متحرك" و"متحرك بشكل مثالي".
 *
 * ## لماذا النسخة مكرّرة مرتين
 * الالتفاف اللانهائي بلا قفزة يحتاج مساراً طوله ضعف المحتوى: يتحرك بمقدار -50% ثم يعود إلى
 * الصفر، وفي تلك اللحظة يكون ما تحت العين هو النسخة الثانية المطابقة تماماً — فلا يرى أحد
 * لحظة الإرجاع. النسخة الثانية `aria-hidden` لأنها تكرار بصري لا محتوى إضافي.
 *
 * السرعة تأتي من لوحة التحكم كمتغيّر CSS، لا كصنف Tailwind: القيمة رقم يختاره الأدمن بحرية
 * ولا يمكن لماسح Tailwind أن يولّد صنفاً لكل قيمة ممكنة.
 */
export const ClientsStrip: React.FC<{ language?: Language }> = ({ language = 'ar' }) => {
  const strip = useClientsStrip();
  const isAr = language === 'ar';

  // التفعيل يدوي: لا يظهر شيء حتى يشغّله الأدمن ويضيف عنصراً واحداً على الأقل.
  if (!strip.enabled || strip.items.length === 0) return null;

  // بأقل من أربعة عناصر يصير المسار أقصر من الشاشة على الشاشات العريضة فتظهر فجوة تمشي مع
  // الحزام. التكرار حتى تمتلئ الدورة يعالجها بلا أن يضطر الأدمن لإضافة شعارات وهمية.
  const minimumForFullTrack = 8;
  const repeats = Math.max(1, Math.ceil(minimumForFullTrack / strip.items.length));
  const lane = Array.from({ length: repeats }, () => strip.items).flat();

  const Item: React.FC<{ item: (typeof strip.items)[number] }> = ({ item }) => (
    <li className="shrink-0 px-6 sm:px-9 flex items-center">
      {item.logoDataUrl ? (
        <img
          src={item.logoDataUrl}
          alt={item.name}
          loading="lazy"
          decoding="async"
          /* ارتفاع موحّد وعرض حر: الشعارات تصل بنسب مختلفة، وتثبيت الاثنين يشوّهها.
             grayscale مع رفعها عند المرور هو ما يجعل عشرة شعارات بألوان متضاربة تُقرأ كصفّ
             واحد مرتّب بدل لافتات متنافسة فوق قسم واحد. */
          className="h-9 sm:h-11 w-auto max-w-[160px] object-contain opacity-80 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
        />
      ) : (
        <span
          className="text-base sm:text-xl font-black whitespace-nowrap"
          style={{ color: OBSIDIAN, opacity: 0.72 }}
        >
          {item.name}
        </span>
      )}
    </li>
  );

  return (
    <section
      aria-label={strip.title}
      className="relative overflow-hidden py-8 sm:py-10"
      style={{ background: WHITE }}
    >
      <h2
        className="nq-container text-center text-[0.7rem] sm:text-xs font-black tracking-[0.28em] uppercase mb-6"
        style={{ color: ORANGE_ON_LIGHT }}
      >
        {strip.title}
      </h2>

      {/* تلاشٍ عند الطرفين: بدونه تُقصّ الشعارات بحدّ حادّ عند حافة الشاشة فتبدو الحركة وكأنها
          تصطدم بجدار. القناع يجعلها تدخل وتخرج من العدم. */}
      <div
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
          <ul className="flex items-center">
            {lane.map((item, i) => (
              <Item key={`a-${item.id}-${i}`} item={item} />
            ))}
          </ul>
          <ul className="flex items-center" aria-hidden="true">
            {lane.map((item, i) => (
              <Item key={`b-${item.id}-${i}`} item={item} />
            ))}
          </ul>
        </div>
      </div>

      <span className="sr-only">
        {isAr ? 'شركات عملنا معها' : 'Companies we have worked with'}
      </span>
    </section>
  );
};
