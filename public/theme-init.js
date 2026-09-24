/* السِمة قبل أوّل رسم.
 *
 * بدون هذا الملفّ يُحمَّل الموقع نهاريّاً دائماً ثمّ يقلب إلى الليليّ لحظة يصل كود React —
 * أي وميضٌ أبيض في وجه من طلب الليليّ تحديداً، في كلّ صفحة وكلّ مرّة. وهو مكتوب هنا لا
 * داخل index.html لنفس سبب gtag-init.js بالضبط: سياسة CSP على الموقع `script-src 'self'`
 * فتُحجب أيّ قصاصة داخل الصفحة بصمت. ملفٌّ من نفس النطاق يمرّ.
 *
 * ولا يمكن استيراد src/lib/theme.ts هنا: ذاك جزء من الحزمة، ولا يصل إلّا بعد أن يكون
 * الرسم الأوّل قد وقع — وهو ما يوجد هذا الملفّ ليسبقه. فالتكرار مقصود، ومحصور في ثلاثة
 * أسطر: المفتاح، والاستعلام، والقيمتان. من غيّر أيّاً منها في theme.ts يغيّرها هنا.
 *
 * `<script>` عاديّ لا `defer` ولا `async`: كلاهما يؤجّله إلى ما بعد تحليل المستند، أي بعد
 * أن يكون المتصفّح قد رسم — وهو بالضبط ما يُراد منعه.
 */
(function () {
  try {
    var saved = null;
    try {
      saved = localStorage.getItem('nuvaiq_theme');
    } catch (e) {
      /* تصفّح خاصّ: لا اختيار محفوظ، فالنظام هو المرجع. */
    }
    var mode =
      saved === 'light' || saved === 'dark'
        ? saved
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

    var root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.style.colorScheme = mode;

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#0A0A08' : '#F7F7F5');
  } catch (e) {
    /* أيّ فشل هنا يترك الصفحة نهاريّة — وهي الحالة التي كان عليها الموقع قبل السِمات،
       فأسوأ ما يحدث هو ألّا تعمل الميزة، لا أن تنكسر الصفحة. */
  }
})();
