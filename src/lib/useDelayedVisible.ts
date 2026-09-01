import { useEffect, useRef, useState } from 'react';

/**
 * "أظهِر شيئاً فقط إن طال الانتظار فعلاً" — منطق شاشة التحميل الذكية في مكان واحد.
 *
 * المشكلة التي يحلّها: انتظار مدته 120ms حقيقي، لكن دوّارة تظهر وتختفي خلاله أسوأ من عدم
 * إظهار شيء إطلاقاً — وميض يلفت النظر إلى بطء لم يكن ليُلاحَظ. والعكس صحيح أيضاً: انتظار
 * ثانيتين بلا أي إشارة يُقرأ كعطل.
 *
 * لذلك حدّان:
 *  · `delayMs` — لا يظهر شيء قبل مروره. أي انتظار ينتهي داخل هذه النافذة لا يُرى أبداً.
 *  · `minVisibleMs` — إن ظهر، يبقى هذا الحد الأدنى. بدونه، انتظار تجاوز العتبة بقليل يومض
 *    ويختفي فوراً، وهو بالضبط الوميض الذي وُجدت العتبة لمنعه.
 */
export function useDelayedVisible(active: boolean, delayMs = 400, minVisibleMs = 450): boolean {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      if (visible) return;
      const t = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, delayMs);
      return () => clearTimeout(t);
    }

    if (!visible) return;
    const elapsed = shownAt.current ? Date.now() - shownAt.current : minVisibleMs;
    const remaining = Math.max(0, minVisibleMs - elapsed);
    const t = setTimeout(() => {
      shownAt.current = null;
      setVisible(false);
    }, remaining);
    return () => clearTimeout(t);
  }, [active, visible, delayMs, minVisibleMs]);

  return visible;
}
