import React, { useRef, useState } from 'react';
import { ArrowUpLeft, Building2 } from 'lucide-react';
import { Language } from '../lib/i18n';
import { useClientsStrip, type ClientItem } from '../lib/clientsStrip';
import { useSeen } from '../lib/useSeen';
import { NqLink } from './ui/NqLink';
import { OBSIDIAN } from '../lib/homePalette';

/**
 * "أعمالنا" — صفّ ألواح عمودية، اللوح الذي تحته المؤشّر ينفتح ويتّسع.
 *
 * ## لماذا الصفّ لا يكبر، مع أنّ الرسم يوريه يكبر
 *
 * في الرسم يبقى طرف الصفّ الأيمن ثابتاً ويمتدّ طرفه الأيسر لمّا ينفتح لوح — أي أنّ عرض الصفّ
 * كلّه يزيد بعرض لوح كامل. المنفَّذ هنا يوزّع العرض بدل أن يزيده: اللوح المفتوح يأخذ من جيرانه
 * والمجموع لا يتغيّر. الفرق غير مرئي (لوح واحد عريض وبقيّتهم ضيّقون، تماماً كالرسم)، لكن
 * الصفّ المتمدّد كان سيتجاوز `.nq-container` على الشاشات المتوسّطة ويدفع الصفحة أفقياً — وهذا
 * ليس خياراً هنا، الموقع كلّه مبنيّ على ألّا يوجد تمرير أفقي.
 *
 * ## ولماذا المربّع الداكن في الرسم صار فاتحاً
 *
 * ملاحظة الرسم نفسها تقول "راح يكون اماكن مالته icons اهنا" — أي أنّ المربّع علامة مكان لا
 * لون نهائي. وشعارات العملاء المرفوعة صور حقيقية بألوانها، وأغلبها داكن على خلفية شفّافة:
 * وضعها على مربّع أسود يخفيها. فالمساحة نفسها كما رُسمت — مربّع في وسط اللوح، بحوافّ دائرية
 * كما طُلب — لكن أرضيّتها بيضاء ليُقرأ عليها أيّ شعار مهما كان لونه.
 *
 * ## اللمس والكيبورد ليسا حالتين استثنائيتين
 *
 * الانفتاح على المرور بالماوس وحده يعني أنّ نصف الزوّار — كلّ من على هاتف — لن يفتح لوحاً
 * أبداً. فكلّ لوح زرّ `aria-expanded` حقيقيّ: المرور يفتحه على الماوس، والضغط يفتحه ويغلقه
 * على اللمس، والانتقال بالكيبورد يفتحه أيضاً. والاسم موجود دائماً كاسم للزرّ حتى وهو مخفيّ
 * بصرياً، فقارئ الشاشة يعرف أيّ شركة هذه قبل أن يفتح شيئاً.
 */

/**
 * هل للجهاز مؤشّر يمرّ فعلاً؟
 *
 * يُقاس مرّة واحدة عند التحميل مثل `COARSE` في ButtonTiles. الغرض الوحيد منه أن الضغط على
 * لوح مفتوح بالماوس لا يغلقه — فهو مفتوح لأنّ المؤشّر فوقه، وإغلاقه ثم بقاء المؤشّر مكانه
 * يترك اللوح مغلقاً تحت مؤشّر يفترض أنه يفتحه.
 */
const HOVER_CAPABLE: boolean =
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

interface WorkPanelProps {
  item: ClientItem;
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
  isAr: boolean;
}

/**
 * لوح واحد.
 *
 * مكوّن مستقلّ لأنّ `wasActive` حالة تخصّ لوحاً بعينه، والهوكات لا تُستدعى داخل حلقة.
 */
const WorkPanel: React.FC<WorkPanelProps> = ({ item, active, onOpen, onClose, isAr }) => {
  /* حالة اللوح قبل أن تبدأ اللمسة، لا بعدها.

     الضغط على زرّ يُعطيه التركيز، والتركيز يفتح اللوح — فحين تصل `click` يكون اللوح
     مفتوحاً أصلاً، فتقرأه القاعدة "ضغطة على مفتوح = إغلاق" وتقفله في نفس اللمسة.
     مقيسة على منفذ لمس: الضغطة كانت تترك `data-open` عند "false". */
  const wasActive = useRef(false);

  return (
    <li
      className="nq-work-panel"
      data-active={active ? 'true' : 'false'}
      /* الفتح والإغلاق على الغلاف لا على الزرّ، منذ صار في اللوح عنصران تفاعليّان.
         على الزرّ وحده كان `pointerleave` يُطلَق لحظة يعبر المؤشّر إلى زرّ الزيارة، فيغلق
         اللوح تحت الشيء الذي يمدّ يده إليه. والحدثان لا يُطلَقان عند التنقّل بين أبناء
         العنصر، فعلى الغلاف معناهما "غادر المؤشّر هذا اللوح" — وهو السؤال المقصود. */
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') onOpen();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch') onClose();
      }}
      onFocus={() => onOpen()}
      /* و`focusout` يُطلَق فعلاً عند الانتقال من الزرّ إلى الرابط، فلولا هذا الشرط لأغلق
         اللوح وأخفى الرابط في منتصف الـ Tab. `relatedTarget` يقول إلى أين ذهب التركيز. */
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onClose();
      }}
    >
      <button
        type="button"
        onPointerDown={() => {
          wasActive.current = active;
        }}
        onClick={() => {
          if (!wasActive.current) onOpen();
          else if (!HOVER_CAPABLE) onClose();
        }}
        className="nq-work-face"
        aria-expanded={active}
        aria-label={item.name}
      >
        {/* بلا بطاقة تحته: الشعارات المرفوعة مربّعات لها أرضيّتها أصلاً، فالمربّع الأبيض
            كان صندوقاً حول صندوق. و`alt=""` لأنّ الزرّ يحمل الاسم في `aria-label` — بدونها
            يُنطَق اسم الشركة مرّتين في كلّ لوح. */}
        {item.logoDataUrl ? (
          <img src={item.logoDataUrl} alt="" className="nq-work-logo" loading="lazy" decoding="async" />
        ) : (
          <Building2 className="nq-work-fallback" style={{ color: OBSIDIAN }} aria-hidden="true" strokeWidth={1.4} />
        )}

        {/* `aria-hidden` على النصّ المرئي: اسم الزرّ يأتي من `aria-label`، وتركه معلناً يعني
            سماعه مرّتين. إخفاؤه بصرياً بـ opacity لا بـ display حتى يبقى قابلاً للانتقال. */}
        <span className="nq-work-copy" aria-hidden="true">
          <span className="nq-work-name">{item.name}</span>
          {item.blurb ? <span className="nq-work-blurb">{item.blurb}</span> : null}
        </span>
      </button>

      {/* خارج الزرّ لا داخله: `<a>` جوّة `<button>` غير صالح، واللوح زرّ `aria-expanded`
          حقيقي.

          ويُرسم على كلّ لوح، لكنّ من لا عنوان له بعد يُرسم `disabled`: وهي كلمة NqLink نفسها لهذه
          الحالة — تُسقِط `href` بدل أن توجّهه إلى "#"، وتخرجه من ترتيب الـ Tab، وتبتلع الضغطة.
          فالزرّ موجود وظاهر أنّه لا يؤدّي إلى شيء بعد، وأوّل ما يُلصَق عنوان في لوحة الأدمن يصير
          رابطاً عاملاً بلا تغيير كود. وما يصير أبداً: رابط حيّ إلى عنوان مخمّن، وهذه شركات
          حقيقية. والعنوان حين يوجد مفلتر أصلاً في `safeUrl` (clientsStrip.ts): http/https فقط. */}
      <NqLink
        /* نفس معالجة زرّ "اطلب مشروعك" في Footer.tsx بالضبط — منقولة لا مُقرّبة.
           `mt-4` وحدها لم تأتِ: هي مسافة تكديس تخصّ الفوتر، وهذا الزرّ موضوع مطلقاً. */
        className="nq-work-visit nq-label whitespace-nowrap tracking-[0.12em] uppercase sm:text-base uw:text-lg"
        href={item.url ?? '#'}
        disabled={!item.url}
        target="_blank"
        rel="noopener noreferrer"
        /* معكوس عن زرّ الفوتر: اللون الداكن ينتقل من القرص إلى الحبّة نفسها، والقرص
           يصير أبيض. وهذا نغمة موجودة لا ألوان مختارة باليد: `white` هي حرفيّاً معكوس `footer`. */
        tone="white"
        variant="solid"
        size="md"
        /* `badge` لا `icon`: القرص الداكن في طرف الزرّ، كما في المرجع. */
        badge={<ArrowUpLeft className="w-3.5 h-3.5" strokeWidth={2.6} />}
        /* ستّة روابط نصّها واحد لا تقول لقارئ الشاشة موقع مَن يفتح. */
        aria-label={isAr ? `زيارة موقع ${item.name}` : `Visit ${item.name}`}
      >
        {isAr ? 'زيارة الموقع' : 'Visit site'}
      </NqLink>
    </li>
  );
};

interface ClientsAccordionProps {
  language?: Language;
}

export const ClientsAccordion: React.FC<ClientsAccordionProps> = ({ language = 'ar' }) => {
  const strip = useClientsStrip();
  const isAr = language !== 'en';
  const { ref, seen } = useSeen<HTMLElement>();
  const [activeId, setActiveId] = useState<string | null>(null);

  /* التفعيل يدويّ بالكامل — القسم لا يظهر للزوّار حتى يُشغّله الأدمن من تبويب الإعدادات، وهي
     نفس قاعدة `clientsStrip.ts` منذ أوّل نسخة. وقائمة فارغة تعني لا شيء يُعرض حتى لو فُعّل. */
  if (!strip.enabled || strip.items.length === 0) return null;

  return (
    <section
      ref={ref as React.Ref<HTMLElement>}
      data-seen={seen ? 'true' : 'false'}
      aria-labelledby="nq-work-heading"
      /* المسافة تحته ملكه هو لا ملك البطاقتين بعده: القسم يُطفأ من لوحة الأدمن،
         وفسحة موضوعة على البطاقات كانت ستبقى بعد إطفائه بلا سبب يفسّرها. */
      className="mt-4 sm:mt-6 mb-10 sm:mb-14"
    >
      <h2
        id="nq-work-heading"
        /* مقاس عناوين الأقسام نفسه المستعمل في PhasesSection وContactSection — ولا `.nq-label`
           بعد اليوم: ذاك أصغر خطّ في الموقع وأخفتُه، وهو معنى "لافتة فوق عنصر" لا معنى
           "اسم قسم". والتوسيط في الـ CSS مع المسافة، حتى يبقيا معاً. */
        className="nq-work-heading nq-rise text-[1.55rem] sm:text-[2.1rem] uw:text-[2.6rem] font-black leading-none tracking-tight"
        style={{ color: OBSIDIAN }}
      >
        {strip.title}
      </h2>

      {/* `data-open` على الصفّ لا على اللوح: قاعدة الاتّساع تحتاج أن تعرف أنّ أحدهم مفتوح
          أصلاً، وإلا فاللوح النشط الوحيد في صفّ ساكن يتّسع بلا سبب عند أوّل رسم. */}
      <ul
        className="nq-work-row nq-rise"
        style={{ ['--nq-rise-delay' as string]: '90ms' }}
        data-open={activeId ? 'true' : 'false'}
      >
        {strip.items.map((item) => (
          <WorkPanel
            key={item.id}
            item={item}
            isAr={isAr}
            active={activeId === item.id}
            onOpen={() => setActiveId(item.id)}
            /* يُغلق فقط إن كان هو المفتوح: مغادرة لوح بعد دخول جاره تصل متأخّرة أحياناً،
               وبدون هذا الشرط تمسح مغادرةُ القديم فتحَ الجديد فينطفئ الصفّ بين لوحين. */
            onClose={() => setActiveId((current) => (current === item.id ? null : current))}
          />
        ))}
      </ul>
    </section>
  );
};

export default ClientsAccordion;
