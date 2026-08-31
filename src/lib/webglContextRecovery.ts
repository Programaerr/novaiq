import type { WebGLRenderer } from 'three';

/**
 * يجعل فقدان سياق WebGL قابلاً للاستعادة تلقائياً بدل أن يكون دائماً حتى إعادة تحميل الصفحة.
 *
 * ## لماذا preventDefault() هي الجزء الجوهري هنا
 * بحسب مواصفة WebGL نفسها: عند فقدان السياق (ذاكرة GPU ممتلئة، تعارض مع نافذة أخرى مثل نافذة
 * تسجيل الدخول المنبثقة، تعطّل تعريف الرسوميات...)، المتصفح لا يحاول استعادته إطلاقاً إلا لو
 * استدعى المستمع `event.preventDefault()` صراحة على حدث `webglcontextlost` — بدونها يفترض
 * المتصفح أن التطبيق لا يهتم بالاستعادة، فيبقى السياق ميتاً للأبد. هذا كان الثغرة الفعلية: كل
 * حالة "Context Lost" سابقة كانت نهائية، حتى لو كان سببها عابراً بحتة (نافذة منبثقة، ضغط GPU
 * لحظي)، لأن لا شيء بالكود كان يستدعي preventDefault() على الإطلاق.
 *
 * `TileField` تحديداً يبقى مُثبَّتاً طوال الجلسة (canvas واحد مشترك بين كل الصفحات — انظر
 * تعليقه)، فاستعادته تلقائياً هنا تعني عودة الحقل بصرياً بمجرد أن يستعيد المتصفح السياق، بدل أن
 * يبقى الحقل ميتاً في كل صفحة في الموقع حتى يُحدِّث الزائر الصفحة يدوياً.
 */
export function attachWebGLContextRecovery(renderer: WebGLRenderer): () => void {
  const canvas = renderer.domElement;

  const onLost = (event: Event) => {
    event.preventDefault();
    console.warn('WebGL context lost — the browser will attempt to restore it automatically.');
  };

  const onRestored = () => {
    console.info('WebGL context restored.');
  };

  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);

  return () => {
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
  };
}
