import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpLeft, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Language } from '../lib/i18n';
import { useClientsStrip, type ClientItem } from '../lib/clientsStrip';
import { useSeen } from '../lib/useSeen';
import { NqLink } from './ui/NqLink';
import { WorkMotif } from './WorkMotif';
import { safeMotif } from '../lib/workMotifs';
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

/** نفس حدّ `@media (max-width: 640px)` في الـCSS حرفاً بحرف، ليقلبا معاً لا واحداً بعد الآخر. */
const NARROW = '(max-width: 640px)';

/**
 * هل الشاشة ضيّقة؟
 *
 * قياسٌ مرّة واحدة عند التحميل لا يكفي هنا كما كفى في `HOVER_CAPABLE`: ذاك يصف الجهاز فلا
 * يتغيّر، وهذا يصف عرض النافذة — يقلبه دوران الهاتف وحده. فاشتراك حقيقيّ يعيد العرض عند العبور.
 */
function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia(NARROW).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return narrow;
}

interface WorkPanelProps {
  item: ClientItem;
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
  isAr: boolean;
  narrow: boolean;
  /** موضع اللوح في الصفّ وعدد الألواح فيه — يصيران تأخير حركة التبديل. انظر أدناه. */
  index: number;
  count: number;
}

/**
 * لوح واحد.
 *
 * مكوّن مستقلّ لأنّ `wasActive` حالة تخصّ لوحاً بعينه، والهوكات لا تُستدعى داخل حلقة.
 */
const WorkPanel: React.FC<WorkPanelProps> = ({
  item,
  active,
  onOpen,
  onClose,
  isAr,
  narrow,
  index,
  count,
}) => {
  /* حالة اللوح قبل أن تبدأ اللمسة، لا بعدها.

     الضغط على زرّ يُعطيه التركيز، والتركيز يفتح اللوح — فحين تصل `click` يكون اللوح
     مفتوحاً أصلاً، فتقرأه القاعدة "ضغطة على مفتوح = إغلاق" وتقفله في نفس اللمسة.
     مقيسة على منفذ لمس: الضغطة كانت تترك `data-open` عند "false". */
  const wasActive = useRef(false);


  return (
    <li
      className="nq-work-panel"
      data-active={active ? 'true' : 'false'}
      style={{
        /* رقمان لا واحد: أيّ البطاقات تتحرّك أوّلاً يعتمد على جهة السير — والأماميّة في
           تلك الجهة تسبق — وهذا المكوّن لا يعرف الجهة. فيمرّر الترتيب ومعكوسه، وتختار
           القاعدة في index.css بينهما بحسب `data-swap-dir`. */
        ['--nq-swap-i' as string]: String(index),
        ['--nq-swap-j' as string]: String(count - 1 - index),
      }}
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
        /* اللمس يفتح من هنا، لا من `click`.

           مقيس على مسار iOS: 201ms من نزول الإصبع إلى بدء الفتح، مقابل صفر على الماوس
           (`pointerenter`). والفارق كلّه اصطناعي: `click` آخر حدث في الإيماءة — بعد رفع
           الإصبع، ثمّ بعد فجوة المتصفّح، ثمّ بعد محاكاة الفأرة. و`pointerup` يُطلَق لحظة
           رفع الإصبع نفسها، قبل ذلك كلّه.

           ولم يظهر العطل في محاكاة Chromium أبداً: Chromium يمنح الزرّ تركيزاً عند اللمس،
           فيفتح `onFocus` اللوحَ خلال أربعة ميلي ثانية ولا يصل الأمر إلى `click`. وSafari
           على iOS لا يمنح الأزرار تركيزاً باللمس — حقول الإدخال وحدها — فمسار التركيز غائب
           هناك ويسقط الفتح كلّه على `click`. ولذلك قيس بأحداث خام بلا تركيز، لا بنقرة
           المحاكاة.

           ولماذا `pointerup` لا `pointerdown` وهو الأبكر؟ لأنّ ليس كلّ نزول إصبع لمسةً —
           التمرير يبدأ بنزول إصبع أيضاً. جُرِّب `pointerdown` أوّلاً ومعه `pointercancel`
           للتراجع، ومقيس أنّ اللوح كان يُفتح فعلاً أثناء إيماءة أُلغيت: أي أنّ كلّ تمرير
           يبدأ فوق لوح يجعله يتمدّد ثمّ يرتدّ. و`pointerup` لا يُطلَق أصلاً في إيماءة صارت
           تمريراً، فالخطر يزول بلا حارس يحرسه.

           والباقي بعده زمنُ ضغط الإصبع نفسه، وهو فعل المستخدم لا انتظار النظام: ما يُقاس
           استجابةً هو ما بين الرفع والاستجابة. */
        onPointerUp={(e) => {
          if (e.pointerType !== 'touch') return;
          if (wasActive.current) onClose();
          else onOpen();
        }}
        /* و`click` يبقى للكيبورد وللفأرة. وعلى اللمس صار مكرّراً لا ضارّاً — يُعيد نداء ما
           نُفِّذ في `pointerup`، وكلا النداءين لا يفعل شيئاً إن كان اللوح في حالته أصلاً —
           إلّا أن يكون `pointerup` لم يقع (إيماءة أُلغيت)، وحينها لا يقع `click` أيضاً. */
        onClick={() => {
          if (!wasActive.current) onOpen();
          else if (!HOVER_CAPABLE) onClose();
        }}
        className="nq-work-face"
        aria-expanded={active}
        aria-label={item.name}
      >
        {/* صورة ثابتة خلف الشعار — لا نافذة حيّة. جُرِّب `<iframe>` لموقع العميل الفعلي أولاً
            وتراجع عنه: مواقع كثيرة ترفض التضمين في إطار من نطاق آخر (CSP الخاص بها)، ومنها
            أي موقع بُني بنفس قالب نوفايك نفسه، فكانت تظهر فارغة عند أكثر العملاء — بينما صورة
            تعمل دائماً. زخرفية بحتة (`pointer-events: none` في الـCSS)؛ التصفّح الوحيد
            الممكن يبقى زرّ "زيارة الموقع" خارج هذا الزرّ. */}
        {/* الصورة والحركة خلفيّتان لنفس المكان، فواحدة منهما فقط تُرسَم. والحركة تفوز إلّا
            أن يُختار "بلا حركة" صراحةً من اللوحة — وهذا هو الطريق إلى الصورة، ومكتوب تحت
            المُختار هناك حتى لا يُفاجأ من لصق صورة فلم يرها. */}
        {item.previewImageUrl && safeMotif(item.motif) === 'none' && (
          <div className="nq-work-preview" aria-hidden="true">
            <img src={item.previewImageUrl} alt="" loading="lazy" decoding="async" />
          </div>
        )}

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
        /* درجة أصغر على الهاتف، من سلّم SIZES نفسه لا بأرقام مضبوطة باليد.

           مقيس على 390px: اللوح المفتوح 156px والحبّة 128×52 — أي 82% من عرض اللوح، بينما
           هي 51% منه على 1280. والدرجة `sm` تحمل الحشو والخطّ والفجوة والقرص متّسقة معاً،
           وتبقى فوق أرضية 44px اللمسية كما ينصّ تعليق SIZES. */
        size={narrow ? 'sm' : 'md'}
        /* `badge` لا `icon`: القرص الداكن في طرف الزرّ، كما في المرجع. */
        badge={<ArrowUpLeft className="w-3.5 h-3.5" strokeWidth={2.6} />}
        /* ستّة روابط نصّها واحد لا تقول لقارئ الشاشة موقع مَن يفتح. */
        aria-label={isAr ? `زيارة موقع ${item.name}` : `Visit ${item.name}`}
      >
        {/* الكلمة كاملة على كلّ عرض. جُرّب اختصارها إلى "زيارة" على الهاتف فوفّر 40px،
            لكنّ التصغير المطلوب تصغير الزرّ لا حذفٌ من نصّه — فالتوفير كلّه انتقل إلى
            الصندوق: درجة أصغر من SIZES، وخطّ وحشو وفجوة أضيق في الـCSS. */}
        {isAr ? 'زيارة الموقع' : 'Visit site'}
      </NqLink>
    </li>
  );
};

interface ClientsAccordionProps {
  language?: Language;
}

/** ثلاثة ألواح في الصفّ، ثم سهمان للمجموعة التالية — بدل صفّ واحد يضيق أكثر مع كل عميل جديد. */
const PAGE_SIZE = 3;

/**
 * زمنا نصفَي التبديل بالميلي ثانية، مضبوطان مع `nq-work-card-out/in` في index.css.
 *
 * الخروج ينتهي فعلياً عند 320ms (‏230 للحركة + تأخيرين × 45) ويُقطَع هنا عند 300: البطاقة
 * الأخيرة تُنزَع قبل عشرين ميلي ثانية من نهايتها وهي عند شفافيّة تقارب الصفر، فلا يُرى
 * القطع ولا يُنتظَر. والمجموع نحو ثمانية أعشار الثانية — تبديلٌ يُرى لا وميضٌ يُخمَّن.
 */
const SWAP_OUT_MS = 300;
const SWAP_IN_MS = 510;

export const ClientsAccordion: React.FC<ClientsAccordionProps> = ({ language = 'ar' }) => {
  const strip = useClientsStrip();
  const isAr = language !== 'en';
  const { ref, seen } = useSeen<HTMLElement>();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const narrow = useNarrowViewport();

  /* الحركة حالةٌ لا أثر: `phase` تقول أيّ نصفَي التبديل يجري الآن، و`dir` جهته الفيزيائية.
     ترتفعان إلى الصفّ كسمتَي `data-` ليقرأهما الـCSS — الحركة كلّها هناك، وليس هنا إلا
     التوقيت واللحظة التي تتبدّل فيها القائمة. */
  const [swap, setSwap] = useState<{ dir: 1 | -1; phase: 'out' | 'in' } | null>(null);
  const timers = useRef<number[]>([]);
  /* آخر ضغطة وصلت والحركة جارية، تُنفَّذ بعد انتهائها. تجاهلها كان سيجعل السهم يبدو ميتاً
     ثمانية أعشار الثانية، وتنفيذها فوراً كان سيقطع الحركة في منتصفها. وواحدة تُحفَظ لا
     طابور: خمس ضغطات سريعة لا تصير خمس حركات متتالية، بل تصل إلى حيث انتهت الأخيرة. */
  const queued = useRef<number | null>(null);
  /* إلى أين تتّجه آخر ضغطة، ما دام هناك تبديل جارٍ — وهو الأساس الذي تُحسَب منه الخطوة
     التالية، لا الصفحة المعروضة.

     الفرق يظهر في ضغطتين متعاكستين: العين ترى الانتقال إلى المجموعة التالية قد بدأ، فـ"السابق"
     بعده يعني الرجوع منها. وحسابها من `safePage` — وهي لا تتبدّل إلاّ في منتصف التبديل — كان
     يجعل الضغطة المعاكسة تساوي الصفحة الحالية فتُلغى بصمت، فيبقى الزائر حيث لا يريد. */
  const aim = useRef<number | null>(null);

  /* المؤقّتان يعيشان أطول من الصفحة لو غادرها الزائر في منتصف التبديل، و`setState` على
     مكوّن مُفكَّك تحذيرٌ في الكونسول لا أكثر — لكنّه تحذير عن خطأ حقيقي: عمل مجدول لا
     صاحب له. */
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /* التفعيل يدويّ بالكامل — القسم لا يظهر للزوّار حتى يُشغّله الأدمن من تبويب الإعدادات، وهي
     نفس قاعدة `clientsStrip.ts` منذ أوّل نسخة. وقائمة فارغة تعني لا شيء يُعرض حتى لو فُعّل. */
  if (!strip.enabled || strip.items.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(strip.items.length / PAGE_SIZE));
  /* مشتقّة لا مخزَّنة: لو حذف الأدمن عملاء فصار `page` المحفوظ خارج الحدود، هذه تُصحّحه فوراً
     عند الرسم القادم بلا حاجة لمراقبة طول المصفوفة في useEffect منفصل. */
  const safePage = Math.min(page, totalPages - 1);
  const visibleItems = strip.items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  /* يُبحث في المعروض لا في الكلّ: تبديل الصفحة يُبقي `activeId` لعميل لم يعد على الشاشة،
     وقراءة نمطه كانت ستُشغّل حركةً خلف صفّ لا يحوي صاحبها. */
  const activeItem = visibleItems.find((i) => i.id === activeId) ?? null;
  const canGoPrev = safePage > 0;
  const canGoNext = safePage < totalPages - 1;

  /**
   * التبديل نفسه: البطاقات تخرج، ثمّ تتبدّل القائمة، ثمّ تدخل البطاقات الجديدة.
   *
   * `from` مُمرَّرة لا مقروءة من الحالة: النداء الثاني — الضغطة المؤجَّلة — يقع داخل مؤقّت
   * أُنشئ قبل أن تتبدّل الصفحة، فقراءة `safePage` من إغلاقه كانت ستعطي الصفحة القديمة
   * وتحسب الجهة عكسها.
   */
  const runSwap = (from: number, target: number) => {
    /* يُسأل عند كلّ ضغطة لا مرّة واحدة عند التحميل: التفضيل يُقلَب والصفحة مفتوحة (على
       عكس `HOVER_CAPABLE` الذي يصف الجهاز)، وهذا أرخص سؤال يُسأل مرّة كلّ تبديل. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      aim.current = null;
      setActiveId(null);
      setPage(target);
      return;
    }

    /* السهم الأيسر يعني السير يميناً في اللغتين: "التالي" في العربية إلى اليسار،
       و"السابق" في الإنجليزية إلى اليسار، وكلاهما يجرّ الشريط يميناً ليكشف ما وراءه.
       فالجهة الفيزيائية واحدة والمعنى هو الذي ينقلب. */
    const forward = target > from;
    const dir: 1 | -1 = forward === isAr ? 1 : -1;

    aim.current = target;
    /* يُغلق أي لوح مفتوح: لوح العميل القديم لن يبقى مرسوماً، لكنّ الصفّ كان يبقى
       `data-open="true"` بلا لوح نشط بداخله لولا هذا التصفير. */
    setActiveId(null);
    setSwap({ dir, phase: 'out' });

    timers.current.forEach(clearTimeout);
    timers.current = [
      window.setTimeout(() => {
        setPage(target);
        setSwap({ dir, phase: 'in' });
      }, SWAP_OUT_MS),
      window.setTimeout(() => {
        setSwap(null);
        const next = queued.current;
        queued.current = null;
        if (next !== null && next !== target) runSwap(target, next);
        else aim.current = null;
      }, SWAP_OUT_MS + SWAP_IN_MS),
    ];
  };

  /** خطوة واحدة عن الوجهة الحالية: ‎+1 إلى مجموعة أبعد في القائمة، ‎−1 إلى أقرب. */
  const stepPage = (delta: number) => {
    const base = aim.current ?? safePage;
    const target = Math.max(0, Math.min(totalPages - 1, base + delta));
    if (target === base) return;
    aim.current = target;
    if (swap) {
      queued.current = target;
      return;
    }
    runSwap(safePage, target);
  };

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

      {/* المسرح: الحركة تحت، والصفّ فوقها.

          الحركة ليست ابنةً للوح المفتوح ولا تتبعه: كانفاس واحد ثابت خلف الصفّ كلّه، والألواح
          فوقه بأرضيّة معتمة يشفّ منها المفتوح وحده. فالنافذة هي صندوق اللوح نفسه وتتّسع مع
          تمدّده بلا سطر يزامنهما — والبديل (كانفاس ينتقل بين الألواح) كان يعني قراءة التخطيط
          كلّ إطار، وهو ما تتجنّبه هذه الشاشة أصلاً.

          والغلاف موجود لأنّ `<ul>` لا يحمل إلا `<li>`؛ الكانفاس شقيقٌ للقائمة لا ابنٌ فيها. */}
      <div className="nq-work-stage nq-rise" style={{ ['--nq-rise-delay' as string]: '90ms' }}>
        <WorkMotif seen={seen} motif={activeItem ? safeMotif(activeItem.motif) : null} />

        <ul
          className="nq-work-row"
          data-open={activeId ? 'true' : 'false'}
          /* سمتان لا واحدة: الأولى تقول أيّ نصف يجري، والثانية جهته — وفصلهما يعني أنّ
             حركتَي الخروج والدخول تشتركان في نفس تعريف الجهة بدل أربع حالات. وحذفهما
             بـ`undefined` لا بـ`''`: `[data-swap]` في الـCSS تنطبق على قيمة فارغة أيضاً. */
          data-swap={swap ? swap.phase : undefined}
          data-swap-dir={swap ? String(swap.dir) : undefined}
        >
          {visibleItems.map((item, index) => (
            <WorkPanel
              key={item.id}
              item={item}
              isAr={isAr}
              narrow={narrow}
              index={index}
              count={visibleItems.length}
              active={activeId === item.id}
              onOpen={() => setActiveId(item.id)}
              /* يُغلق فقط إن كان هو المفتوح: مغادرة لوح بعد دخول جاره تصل متأخّرة أحياناً،
                 وبدون هذا الشرط تمسح مغادرةُ القديم فتحَ الجديد فينطفئ الصفّ بين لوحين. */
              onClose={() => setActiveId((current) => (current === item.id ? null : current))}
            />
          ))}
        </ul>
      </div>

      {/* السهمان يظهران فقط حين توجد أكثر من صفحة فعلاً — عميلان أو ثلاثة لا يستحقّان سهماً
          يقودان إلى لا شيء.

          `dir="ltr"` على الغلاف تثبيت للجهتين الفيزيائيتين بصرف النظر عن لغة الصفحة — نفس
          حلّ Navbar تماماً — فيبقى ترتيب الزرّين في الشيفرة والوصول (Tab) واحداً دائماً،
          ويتغيّر معنى كل جهة (سابق/تالي) لا شكلها. والاتجاه معكوس عمداً في العربية: أول لوح
          يبدأ من اليمين (انظر تعليق `.nq-work-row` في index.css)، فـ"التالي" يواصل يساراً. */}
      {totalPages > 1 && (
        <div className="nq-work-pager" dir="ltr">
          <button
            type="button"
            onClick={() => stepPage(isAr ? 1 : -1)}
            disabled={isAr ? !canGoNext : !canGoPrev}
            aria-label={isAr ? 'المجموعة التالية' : 'Previous group'}
            className="nq-work-pager-btn"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={() => stepPage(isAr ? -1 : 1)}
            disabled={isAr ? !canGoPrev : !canGoNext}
            aria-label={isAr ? 'المجموعة السابقة' : 'Next group'}
            className="nq-work-pager-btn"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.4} />
          </button>
        </div>
      )}
    </section>
  );
};

export default ClientsAccordion;
