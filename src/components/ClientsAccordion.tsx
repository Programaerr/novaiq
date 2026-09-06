import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { Language } from '../lib/i18n';
import { useClientsStrip, type ClientItem } from '../lib/clientsStrip';
import { useSeen } from '../lib/useSeen';
import { OBSIDIAN, ORANGE, WHITE } from '../lib/homePalette';
import { useTileField } from './ui/nqSurface';

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

/** حقل المكعّبات نفسه الذي تلبسه الأزرار (R3F/WebGL). سطح اللوح وإبرازه، لا أكثر. */
const FIELD = { enabled: true, surface: WHITE, accent: ORANGE } as const;

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
}

/**
 * لوح واحد.
 *
 * مكوّن مستقلّ لأنّ `useTileField` هوك، والهوكات لا تُستدعى داخل حلقة — فكلّ لوح يحتاج حقله
 * الخاصّ يعني أنّ اللوح يصير مكوّناً. وميزانية السياقات محفوظة رغم ذلك: `MAX_LIVE_FIELDS`
 * عدّاد واحد على مستوى الموقع كلّه، ولوح واحد فقط يكون تحت المؤشّر في أيّ لحظة.
 */
const WorkPanel: React.FC<WorkPanelProps> = ({ item, active, onOpen, onClose }) => {
  const field = useTileField(FIELD);
  const { ref: fieldRef, onPointerEnter, onPointerLeave, onFocus, onBlur, ...pass } = field.handlers;

  return (
    <li className="nq-work-panel" data-active={active ? 'true' : 'false'}>
      <button
        type="button"
        ref={fieldRef as React.Ref<HTMLButtonElement>}
        {...pass}
        /* الحقل أوّلاً ثم رأيي: ترتيب NqButton نفسه. وشرط اللمس على المرور فقط — على الهاتف
           يُطلق المتصفّح pointerenter مع الضغطة نفسها، فبدونه تفتح الضغطة اللوح ثم تغلقه. */
        onPointerEnter={(e) => {
          onPointerEnter(e);
          if (e.pointerType !== 'touch') onOpen();
        }}
        onPointerLeave={(e) => {
          onPointerLeave(e);
          if (e.pointerType !== 'touch') onClose();
        }}
        onFocus={(e) => {
          onFocus(e);
          onOpen();
        }}
        onBlur={(e) => {
          onBlur(e);
          onClose();
        }}
        onClick={() => {
          if (!active) onOpen();
          else if (!HOVER_CAPABLE) onClose();
        }}
        className="nq-work-face"
        aria-expanded={active}
        aria-label={item.name}
      >
        {field.tiles}

        <span className="nq-work-slot">
          {item.logoDataUrl ? (
            /* `alt=""` لأنّ الزرّ نفسه يحمل الاسم في `aria-label` — وبدونها يُنطَق اسم الشركة
               مرّتين في كلّ لوح. */
            <img src={item.logoDataUrl} alt="" className="nq-work-logo" loading="lazy" decoding="async" />
          ) : (
            <Building2 className="w-1/2 h-1/2" style={{ color: OBSIDIAN }} aria-hidden="true" strokeWidth={1.6} />
          )}
        </span>

        {/* `aria-hidden` على النصّ المرئي: اسم الزرّ يأتي من `aria-label`، وتركه معلناً يعني
            سماعه مرّتين. إخفاؤه بصرياً بـ opacity لا بـ display حتى يبقى قابلاً للانتقال. */}
        <span className="nq-work-copy" aria-hidden="true">
          <span className="nq-work-name">{item.name}</span>
          {item.blurb ? <span className="nq-work-blurb">{item.blurb}</span> : null}
        </span>
      </button>
    </li>
  );
};

interface ClientsAccordionProps {
  language?: Language;
}

export const ClientsAccordion: React.FC<ClientsAccordionProps> = ({ language = 'ar' }) => {
  const strip = useClientsStrip();
  const { ref, seen } = useSeen<HTMLElement>();
  const [activeId, setActiveId] = useState<string | null>(null);
  const isAr = language !== 'en';

  /* التفعيل يدويّ بالكامل — القسم لا يظهر للزوّار حتى يُشغّله الأدمن من تبويب الإعدادات، وهي
     نفس قاعدة `clientsStrip.ts` منذ أوّل نسخة. وقائمة فارغة تعني لا شيء يُعرض حتى لو فُعّل. */
  if (!strip.enabled || strip.items.length === 0) return null;

  return (
    <section
      ref={ref as React.Ref<HTMLElement>}
      data-seen={seen ? 'true' : 'false'}
      aria-labelledby="nq-work-heading"
      className="mt-4 sm:mt-6"
    >
      <h2
        id="nq-work-heading"
        className="nq-work-heading nq-rise nq-label text-[0.92rem] sm:text-[0.95rem] font-extrabold tracking-[0.14em] uppercase"
        style={{ color: OBSIDIAN, opacity: 0.72 }}
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
