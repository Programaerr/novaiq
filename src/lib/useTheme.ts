import { useCallback, useEffect, useState } from 'react';
import {
  ThemeChoice,
  ThemeMode,
  applyMode,
  readStoredChoice,
  resolveMode,
  setTheme,
  watchSystemMode,
} from './theme';

/**
 * حالة السِمة لواجهة المستخدم: ما اختاره، وما يُرسَم فعلاً.
 *
 * الاثنان مطلوبان معاً ولا يُغني أحدهما عن الآخر: الزرّ يعرض الاختيار (فـ«حسب النظام»
 * يجب أن تبقى مُعلَّمة كذلك، لا أن تظهر «ليليّ» لأنّ النظام ليليّ الآن)، والأنماط تتبع
 * المُشتقّ.
 *
 * والاشتراك في تغيّر سِمة النظام قائمٌ دائماً لا عند «حسب النظام» وحدها: إلغاؤه وإعادته
 * مع كلّ تغيير اختيار عملٌ أكثر بلا مقابل، والمُنصِت نفسه يتجاهل الحدث حين لا يعنيه.
 *
 * ولا شيء هنا يكتب السِمة عند أوّل رسم: سكربت الإقلاع في index.html كتبها قبل أن يصل
 * React أصلاً — وهذا هو الغرض منه. الكتابة هنا مرّةً أخرى كانت ستُلغي فائدته وتجعل
 * أوّل إطار وميضاً.
 */
export function useTheme(): {
  choice: ThemeChoice;
  mode: ThemeMode;
  setChoice: (next: ThemeChoice) => void;
} {
  const [choice, setChoiceState] = useState<ThemeChoice>(() => readStoredChoice());
  const [mode, setMode] = useState<ThemeMode>(() => resolveMode(readStoredChoice()));

  useEffect(
    () =>
      watchSystemMode((next) => {
        /* يُقرأ المحفوظ لا `choice` من الإغلاق: المُنصِت مُسجَّل مرّةً واحدة، فلو اعتمد على
           القيمة التي رآها عند التسجيل لبقي يحكم بها بعد تغيّرها. */
        if (readStoredChoice() !== 'system') return;
        setMode(next);
        applyMode(next);
      }),
    [],
  );

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    setMode(setTheme(next));
  }, []);

  return { choice, mode, setChoice };
}
