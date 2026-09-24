import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, Moon, MonitorSmartphone, Sun } from 'lucide-react';
import { NqButton } from './ui/NqButton';
import { useTheme } from '../lib/useTheme';
import type { ThemeChoice } from '../lib/theme';

/**
 * اختيار سِمة الموقع من الشريط العلويّ: نهاريّ، ليليّ، أو تبعاً للجهاز.
 *
 * ## قائمة لا زرّ يدور
 *
 * زرٌّ واحد يدور على الثلاثة أصغر، لكنّه يخفي أنّ الثالث موجود: من يريد «حسب النظام» لا
 * سبيل له إلى معرفة أنّها خيارٌ إلّا بالضغط مرّتين ورؤيتها تمرّ. والخيارات الثلاثة مطلوبة
 * صراحةً، فهي معروضة صراحةً.
 *
 * ## ولماذا ثلاثة لا اثنان
 *
 * «حسب النظام» ليست غياب اختيار — هي اختيار. الفرق بينها وبين «نهاريّ» لا يظهر الآن، بل
 * حين يقلب الهاتف نفسه عند الغروب: الأولى تتبعه والثانية تثبت. انظر theme.ts.
 *
 * ## ما يعرضه الزرّ
 *
 * أيقونة ما يُرسَم فعلاً (شمس/قمر)، لا أيقونة الاختيار — فـ«حسب النظام» ليلاً تعني قمراً.
 * والعلامة داخل القائمة هي التي تقول أيّ الثلاثة مختار. وبهذا يجيب الزرّ عن «ما أنا فيه
 * الآن؟» وتجيب القائمة عن «ما الذي اخترته؟»، وهما سؤالان مختلفان.
 *
 * ## الشريط مقفول على dir="ltr"
 *
 * (انظر التعليق في Navbar.tsx) فالمواضع هنا فيزيائيّة: القائمة تتدلّى من الحافّة اليمنى
 * للزرّ في اللغتين، كما يفعل كلّ شيء آخر في الشريط.
 */

type Option = { value: ThemeChoice; ar: string; en: string; Icon: typeof Sun };

const OPTIONS: Option[] = [
  { value: 'light', ar: 'نهاريّ', en: 'Light', Icon: Sun },
  { value: 'dark', ar: 'ليليّ', en: 'Dark', Icon: Moon },
  { value: 'system', ar: 'حسب الجهاز', en: 'System', Icon: MonitorSmartphone },
];

export const ThemeMenu: React.FC<{ isAr: boolean }> = ({ isAr }) => {
  const { choice, mode, setChoice } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  /* الإغلاق بالضغط خارجها وبـEscape. و`pointerdown` لا `click`: الضغط على زرٍّ آخر في
     الشريط يجب أن يُغلق هذه قبل أن يعمل ذاك، لا بعده. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(true);
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const Current = choice === 'system' ? (mode === 'dark' ? Moon : Sun) : mode === 'dark' ? Moon : Sun;
  const currentLabel = OPTIONS.find((o) => o.value === choice)!;
  const triggerLabel = isAr
    ? `سِمة الموقع — ${currentLabel.ar}`
    : `Site theme — ${currentLabel.en}`;

  return (
    <span className="nq-theme-slot" ref={wrapRef}>
      <NqButton
        ref={buttonRef}
        tone="chrome"
        variant="ghost"
        size="sm"
        tiles={false}
        className="px-3"
        onClick={() => setOpen((v) => !v)}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        {/* الأيقونة ابنٌ لا `icon`: خانة الأيقونة في NqContent تترك فجوةً بينها وبين خانة
            النصّ، وهذا زرٌّ بلا نصّ — فتصير الفجوة حشواً زائداً على جهةٍ واحدة. */}
        <Current className="nq-theme-glyph w-4 h-4" aria-hidden="true" />
      </NqButton>

      {/* `role="menu"` وأبناؤه `menuitemradio`: ثلاثة خيارات يُنتقى منها واحد، وهو ما
          يصفه هذا الدور بالضبط — لا `menuitem` الذي يعني أمراً يُنفَّذ. */}
      <span
        id={menuId}
        role="menu"
        aria-label={isAr ? 'سِمة الموقع' : 'Site theme'}
        /* الشريط حوله مقفول على `dir="ltr"` بحكم تخطيطه، وهذا نصٌّ يُقرأ — فيستعيد
           اتّجاه اللغة هنا، كما يفعل درج القائمة. بدونه تُحاذى الكلمات العربيّة يساراً
           وتسبق الأيقونةُ الكلمةَ في لغةٍ تُقرأ من اليمين. */
        dir={isAr ? 'rtl' : 'ltr'}
        className="nq-theme-menu"
        data-open={open ? 'true' : 'false'}
        /* مخفيّة عن القارئ وعن Tab معاً حين تكون مغلقة. `opacity: 0` وحدها كانت ستُبقي
           ثلاثة أزرار غير مرئيّة في ترتيب التنقّل — نفس علّة زرّ الزيارة في بطاقة العميل. */
        aria-hidden={!open}
      >
        {OPTIONS.map(({ value, ar, en, Icon }) => {
          const selected = choice === value;
          return (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={selected}
              tabIndex={open ? 0 : -1}
              className="nq-theme-item"
              onClick={() => {
                setChoice(value);
                close(true);
              }}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="nq-theme-item-text">{isAr ? ar : en}</span>
              {/* العلامة مرسومة دائماً وتُخفى بالشفافيّة، فلا يتغيّر عرض السطر بين
                  المختار وغيره — وإلاّ قفزت الكلمات حين ينتقل الاختيار. */}
              <Check className="w-3.5 h-3.5 shrink-0 nq-theme-check" aria-hidden="true" />
            </button>
          );
        })}
      </span>
    </span>
  );
};
