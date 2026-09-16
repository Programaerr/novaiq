import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react';

/**
 * عارض لقطات التطبيق — ما يفتحه زرّ "مشاهدة التطبيق" في قسم أعمالنا.
 *
 * ## لماذا شاشة كاملة لا صورة داخل البطاقة
 *
 * لقطة التطبيق طويلة وضيّقة (نسبة الهاتف)، والبطاقة عريضة قصيرة. عرضها داخل البطاقة يعني
 * صورة بارتفاع ثمانين بكسلاً لا يُقرأ منها شيء — والغرض من اللقطة أن تُرى. فالشاشة الكاملة
 * ليست بذخاً بل هي المكان الوحيد الذي يسع هذه النسبة.
 *
 * ## ولماذا `createPortal` إلى `body`
 *
 * ليس ترتيباً: القسم يعيش داخل `<div className="page-in">` وحركة دخولها تنتهي على
 * `transform: translate3d(0,0,0)` مع `animation-fill-mode: both` — أي أنّ التحويل يبقى
 * مطبَّقاً بعد انتهاء الحركة، وعنصرٌ ذو تحويل غير `none` يصير الكتلة الحاوية لكلّ `fixed`
 * بداخله. فبدون هذا النقل كان `inset: 0` يقيس نفسه على ذلك الغلاف الطويل لا على الشاشة،
 * فيظهر العارض مقصوصاً أسفل الصفحة. نفس العطل وُثّق في LogoutConfirmDialog.tsx.
 */

interface AppShotsViewerProps {
  name: string;
  shots: string[];
  isAr: boolean;
  onClose: () => void;
}

export const AppShotsViewer: React.FC<AppShotsViewerProps> = ({ name, shots, isAr, onClose }) => {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const many = shots.length > 1;

  const step = useCallback(
    (delta: number) => setIndex((i) => Math.min(shots.length - 1, Math.max(0, i + delta))),
    [shots.length],
  );

  /* الزرّ الأيسر يسير يميناً في اللغتين — نفس قاعدة سهمَي المجموعات في أعمالنا بالضبط:
     يتبدّل معنى الزرّ (تالية/سابقة) مع اللغة ولا تتبدّل جهته. وعليها يُبنى كلّ شيء هنا:
     مفتاح السهم الأيسر يفعل ما يفعله الزرّ الأيسر، والسحب يميناً كذلك — لأنّه يجرّ الشريط
     يميناً فيكشف ما كان يساره، وهو في العربية التالي. */
  const leftDelta = isAr ? 1 : -1;

  /* التركيز يعود من حيث جاء.
     بلا هذا يسقط التركيز إلى أوّل الصفحة عند الإغلاق، فمن فتح العارض بالكيبورد يجد نفسه
     في الترويسة لا عند الزرّ الذي ضغطه. ومنفصلٌ عن مستمع المفاتيح أدناه عمداً: ذاك يعتمد
     على `leftDelta`، ولو اجتمعا لأُعيد التركيز عند كلّ تغيّر في اللغة. */
  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => returnTo?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(leftDelta);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(-leftDelta);
        return;
      }
      /* حبس التركيز داخل العارض: هذه نافذة `aria-modal`, وTab الذي يخرج منها يترك القارئ
         يتنقّل في صفحة يغطّيها العارض ولا يراها. والقائمة تُقرأ عند كلّ ضغطة لا مرّة واحدة،
         لأنّ الأسهم تُعطَّل عند الطرفين فتدخل وتخرج من ترتيب التنقّل. */
      if (e.key !== 'Tab') return;
      const root = rootRef.current;
      if (!root) return;
      const stops = [...root.querySelectorAll<HTMLElement>('button:not(:disabled)')];
      if (stops.length < 2) {
        e.preventDefault();
        stops[0]?.focus();
        return;
      }
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, step, leftDelta]);

  /* الجارتان تُحمَّلان مسبقاً، فالضغط على السهم يُظهر صورة حاضرة لا مستطيلاً فارغاً ينتظر
     الشبكة. ولا تُحمَّل القائمة كلّها: عشر لقطات مرّة واحدة على بيانات الهاتف ثمنٌ يدفعه
     من فتح العارض ليرى واحدة. */
  useEffect(() => {
    for (const i of [index + 1, index - 1]) {
      if (i >= 0 && i < shots.length) {
        const img = new Image();
        img.src = shots[i];
      }
    }
  }, [index, shots]);

  /* إيماءة واحدة تُقرأ مرّة، على الجذر، فتصل إليها كلّ ضغطة في العارض بالفقاعة.
     منها يُعرَف أمران: هل كانت سحباً أفقياً على اللمس فتُبدَّل اللقطة، أم ضغطةً ساكنة على
     السواد فيُغلَق العارض. و`backdrop` تُقرأ عند النزول لا عند الرفع لأنّ الإصبع قد ينزل على
     السواد ويرتفع فوق الصورة. */
  const down = useRef<{ x: number; y: number; backdrop: boolean } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    const t = e.target as Node;
    down.current = {
      x: e.clientX,
      y: e.clientY,
      /* السواد وحده: الجذر نفسه أو المسرح نفسه. أمّا الصورة والشريط والأزرار فأهداف
         حقيقية — ولولا هذا التمييز لأغلق العارضَ كلُّ ضغطة على الصورة التي فُتح لأجلها. */
      backdrop: t === e.currentTarget || t === stageRef.current,
    };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const from = down.current;
    down.current = null;
    if (!from) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    /* سحبٌ أفقيّ فعليّ: 44px فأكثر، وأفقيّ أكثر منه رأسيّ. نزول إصبع وحده ليس سحباً،
       والرأسيّ في شاشة كهذه ليس انتقالاً. */
    if (e.pointerType === 'touch' && Math.abs(dx) >= 44 && Math.abs(dx) > Math.abs(dy)) {
      step(dx > 0 ? leftDelta : -leftDelta);
      return;
    }
    /* وضغطة ساكنة على السواد إغلاق. الحدّ العشري يميّزها عن سحبٍ قصير انتهى على السواد. */
    if (from.backdrop && Math.abs(dx) < 10 && Math.abs(dy) < 10) onClose();
  };

  const shot = shots[index];

  return createPortal(
    <div
      ref={rootRef}
      /* بلا `data-lenis-prevent` يلتقط التمرير الناعم حركةَ الإصبع فوق العارض ويمرّر الصفحة
         خلفه — نفس ما تفعله كل شاشة مغطّية في هذا المستودع. */
      data-lenis-prevent
      className="nq-shots"
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? `لقطات تطبيق ${name}` : `${name} app screenshots`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        down.current = null;
      }}
    >
      <div className="nq-shots-bar">
        <span className="nq-shots-name">{name}</span>
        {many && (
          /* `dir="ltr"` وإلّا قُرئ العدّاد مقلوباً.
             "1 / 3" في فقرة عربية: الرقمان قويّا الاتجاه يساراً، والشرطة بينهما محايدة تأخذ
             اتجاه الفقرة — فيُعاد ترتيب الطرفين ويظهر "3 / 1"، أي "الثالثة من واحدة". مقيس:
             الرقم 1 يقع على يمين الرقم 3 بـ22 بكسل. والنصّ في الـDOM صحيح في الحالتين، ولذلك
             لم يكشفه إلّا النظر إليه. */
          <span className="nq-shots-count" dir="ltr" aria-hidden="true">
            {index + 1} / {shots.length}
          </span>
        )}
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="nq-shots-btn"
          aria-label={isAr ? 'إغلاق' : 'Close'}
        >
          <X className="w-5 h-5" strokeWidth={2.4} />
        </button>
      </div>

      <div className="nq-shots-stage" ref={stageRef}>
        {broken[index] ? (
          /* الرابط لا يُفتح — رابط خاطئ، أو صورة حُذفت من مكانها، أو خادم يمنع التضمين.
             يُقال صراحةً بدل مستطيل فارغ يبدو عطلاً في الموقع لا في الرابط. */
          <p className="nq-shots-broken">
            <ImageOff className="w-6 h-6" aria-hidden="true" />
            <span>{isAr ? 'تعذّر تحميل هذه الصورة' : 'This image could not be loaded'}</span>
          </p>
        ) : (
          <img
            /* `key` على الرقم لا على الرابط: تكرار نفس الرابط في لقطتين متتاليتين وارد،
               وبدون المفتاح لا يُعاد تركيب العنصر فلا تُعاد حركة الظهور. */
            key={index}
            className="nq-shots-img"
            src={shot}
            alt={isAr ? `لقطة ${index + 1} من تطبيق ${name}` : `${name} app screenshot ${index + 1}`}
            onError={() => setBroken((b) => ({ ...b, [index]: true }))}
            draggable={false}
          />
        )}
      </div>

      {/* `dir="ltr"` تثبيتاً للجهتين الفيزيائيتين مهما كانت لغة الصفحة — نفس حلّ السهمين في
          أعمالنا وفي Navbar: يبقى ترتيب الزرّين في الشيفرة وفي الـTab واحداً، ويتبدّل معنى
          كلّ جهة لا شكلها. */}
      {many && (
        <div className="nq-shots-nav" dir="ltr">
          <button
            type="button"
            onClick={() => step(leftDelta)}
            disabled={leftDelta === 1 ? index === shots.length - 1 : index === 0}
            aria-label={isAr ? 'اللقطة التالية' : 'Previous screenshot'}
            className="nq-shots-btn"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => step(-leftDelta)}
            disabled={leftDelta === 1 ? index === 0 : index === shots.length - 1}
            aria-label={isAr ? 'اللقطة السابقة' : 'Next screenshot'}
            className="nq-shots-btn"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={2.2} />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
};

export default AppShotsViewer;
