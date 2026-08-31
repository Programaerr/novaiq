/* Google tag (gtag.js) — نفس القصاصة الرسمية حرفياً، في ملف مستقل بدل inline داخل
   index.html لأن CSP الموقع تمنع السكربتات المكتوبة داخل الصفحة (راجع التعليق في index.html).

   يعمل قبل تحميل gtag.js نفسه (المحمَّل async بعده): dataLayer يُنشأ هنا، وgtag.js حين يصل
   يقرأ ما تراكم فيه — وهذا ما يجعل أول مشاهدة صفحة تُسجَّل حتى لو تأخّرت شبكة الزائر. */
window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag('js', new Date());
gtag('config', 'G-H8YZB6DK8Q');
