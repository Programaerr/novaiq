/**
 * سِمة الموقع: نهاريّة، ليليّة، أو تابعة لنظام الجهاز.
 *
 * ## ثلاث حالات لا اثنتان، والمحفوظ هو الاختيار لا نتيجته
 *
 * الفرق بين «ليليّ» و«حسب النظام» لا يظهر لحظة الاختيار — يظهر عند غروب الشمس. من اختار
 * النهاريّ صراحةً يجب أن يبقى نهاريّاً وإن قلب هاتفه نفسه إلى الليليّ؛ ومن اختار «حسب
 * النظام» يتبعه. ولذلك المحفوظ في `localStorage` هو ما اختاره المستخدم (`light` | `dark` |
 * `system`)، و`resolveMode` تشتقّ منه ما يُرسَم. لو حُفظت النتيجة بدلاً من الاختيار لضاع
 * «حسب النظام» عند أوّل إعادة تحميل: يعود الموقع مثبَّتاً على ما صادف أن كان النظام عليه.
 *
 * ## ما يجب أن يتبع السِمة، وليس اللون وحده
 *
 * `applyMode` تكتب ثلاثة أشياء لا واحداً، وكلٌّ منها يُرى إن نُسي:
 *
 *   · `data-theme` على `<html>` — وهو ما تقرؤه الأنماط في index.css.
 *   · `color-scheme` — يخبر المتصفّح بالسِمة بدل أن يريه إيّاها. عليه يعتمد كلّ ما لا
 *     يرسمه الموقع بنفسه: أشرطة التمرير الأصليّة، وعناصر النماذج، وخلفيّة الإكمال
 *     التلقائيّ في الحقول، وقوائم `<select>`. بدونه تبقى هذه فاتحةً فوق صفحة داكنة —
 *     وهو نفس السبب المكتوب في index.css لتثبيته على `light` هناك، مقلوباً.
 *   · `<meta name="theme-color">` — شريط عنوان أندرويد. التعليق في index.html ينصّ على
 *     أنّ قيمةً مخالفةً قليلاً تُرى درزةً بين متصفّح وصفحة؛ ومخالفةٌ كلّيّاً تُرى شريطاً
 *     أبيض فوق موقع أسود.
 *
 * ## والتبديل يُعبَر لا يُقطَع
 *
 * انظر `setTheme` أدناه: الانتقال بطيء متعمَّد، وله مساران — واحد للمتصفّحات التي تملك
 * View Transitions وآخر لمن لا يملكها — ويُلغى كلاهما لمن طلب حركةً أقلّ.
 */

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ThemeMode = 'light' | 'dark';

/** على نسق `nuvaiq_language` — نفس البادئة ونفس أسلوب التسمية. */
export const THEME_KEY = 'nuvaiq_theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** ألوان `--nq-ground` في الحالتين. مكرَّرة هنا عمداً — انظر `applyMode`. */
const GROUND: Record<ThemeMode, string> = {
  light: '#F7F7F5',
  dark: '#080A0D',
};

export function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === 'light' || v === 'dark' || v === 'system';
}

/** الاختيار المحفوظ، أو «حسب النظام» — وهي الحالة الابتدائيّة الصحيحة لزائرٍ لم يختر بعد. */
export function readStoredChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return isThemeChoice(saved) ? saved : 'system';
  } catch {
    // التخزين غير متاح (تصفّح خاصّ) — الاختيار لن يدوم، والموقع يتبع النظام.
    return 'system';
  }
}

export function systemMode(): ThemeMode {
  try {
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function resolveMode(choice: ThemeChoice): ThemeMode {
  return choice === 'system' ? systemMode() : choice;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * يكتب السِمة على المستند. مُفرَدة عن `setTheme` لأنّ سكربت الإقلاع في index.html يفعل
 * نفس الشيء قبل أن يُحمَّل أيّ JavaScript من التطبيق — ولا انتقال هناك، فأوّل رسم ليس
 * تبديلاً من شيء إلى شيء.
 *
 * ولون `--nq-ground` مكتوبٌ هنا مباشرةً على `<html>` لا متروكاً للـCSS: الوسم
 * `theme-color` يحتاج القيمة نصّاً على أيّ حال، ومصدرٌ واحد لها أضمن من رقمٍ في ملفّ
 * وتوأمٍ له في آخر.
 */
export function applyMode(mode: ThemeMode): void {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', GROUND[mode]);
}

/**
 * التبديل نفسه — وهو المطلوب أن يكون «سلو موشن مو مفاجأة».
 *
 * صفحةٌ كاملة تقلب ألوانها في إطارٍ واحد تُقرأ وميضاً، لا تبديلاً. والعبور بينهما له
 * طريقان، ولا ثالث يعمل على الجميع:
 *
 *   1. **View Transitions** حيث توجد: المتصفّح يلتقط الصفحة كما هي، يطبّق التغيير، ثمّ
 *      يمزج اللقطة القديمة في الجديدة. لقطتان تتلاشيان — أي عنصران يتحرّكان مهما كان
 *      في الصفحة — فالثمن ثابت لا يتبع عدد العناصر. ومدّتها من CSS (انظر
 *      `::view-transition-*` في index.css)، فالبطء مكتوبٌ مع بقيّة الحركة لا هنا.
 *
 *   2. **وإلاّ**: `data-theme-fade` على `<html>` يفرض انتقالاً على الألوان لكلّ عنصر،
 *      ويُرفَع بعد انتهائه. مؤقّت لا دائم عمداً: تركُه مفروضاً يعني أنّ كلّ تغيير لونٍ
 *      في الموقع — كلّ hover، كلّ ضغطة — يصير بطيئاً بعد أوّل تبديل سِمة.
 *
 * ومن طلب تقليل الحركة لا يحصل على أيّ منهما: التبديل فوريّ. «بطيء» هنا تحسينٌ لمن
 * يريد الحركة، لا شرطٌ على من لا يريدها — والانتظار ثلاثة أرباع الثانية أمام صفحةٍ
 * تتلاشى هو بالضبط ما يطلب هؤلاء تفاديه.
 */
export function setTheme(choice: ThemeChoice): ThemeMode {
  const mode = resolveMode(choice);
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // كما في اللغة: الاختيار يعمل الآن ولا يدوم.
  }

  const root = document.documentElement;
  const write = () => applyMode(mode);

  if (prefersReducedMotion()) {
    write();
    return mode;
  }

  type WithVT = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  const doc = document as WithVT;
  if (typeof doc.startViewTransition === 'function') {
    /* السمة على `<html>` وليست شرطاً في CSS للحركة نفسها، بل لقصرها على تبديل السِمة:
       بدونها تبطؤ كلّ view transition أخرى قد تُضاف إلى الموقع لاحقاً بنفس الرقم. */
    root.dataset.themeVt = '';
    const vt = doc.startViewTransition(write);
    vt.finished.finally(() => {
      delete root.dataset.themeVt;
    });
    return mode;
  }

  root.dataset.themeFade = '';
  write();
  /* 760ms = مدّة الانتقال في index.css زائد هامش. لو رُفعت السمة قبل انتهائه لانقطع
     التلاشي في منتصفه — وهو أسوأ من عدمه. */
  window.setTimeout(() => {
    delete root.dataset.themeFade;
  }, 760);
  return mode;
}

/** يشترك في تغيّر سِمة النظام. يُستدعى دائماً؛ والمستدعي هو من يقرّر إن كان يعنيه. */
export function watchSystemMode(onChange: (mode: ThemeMode) => void): () => void {
  let mq: MediaQueryList;
  try {
    mq = window.matchMedia(DARK_QUERY);
  } catch {
    return () => {};
  }
  const handler = () => onChange(mq.matches ? 'dark' : 'light');
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
