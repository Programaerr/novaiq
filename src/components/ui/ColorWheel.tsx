import React from 'react';

/**
 * العلامة على خانة لون فارغة: عجلة تدرّج لوني ساكنة.
 *
 * ## لماذا لم تعد WebGL
 *
 * كانت هذه العجلة مشهد three.js كاملاً: `<Canvas>` وسياق WebGL وShaderMaterial وترجمة GLSL —
 * لرسم قرص ساكن قطره ثمانية وعشرون بكسلاً، **يُرسَم إطاراً واحداً ثم لا يتحرّك أبداً**.
 * وثمنه لم يكن نظرياً: منشئ العقود يعرض ثلاث خانات لون، أي ثلاثة سياقات WebGL حيّة في صفحة
 * واحدة. والمتصفح يسمح بنحو ستة عشر سياقاً ثم يقتل الأقدم — فكانت هذه الثلاثة تزاحم حقول
 * المكعبات على الميزانية نفسها، وتُسقطها.
 *
 * ما يرسمه `conic-gradient` أدناه هو نفس ما كان الـshader يحسبه: درجة اللون تدور حول المحيط،
 * والتشبّع يهبط نحو الأبيض في المركز. بلا سياق، بلا ترجمة، بلا إطار — قيمة CSS واحدة يرسمها
 * المتصفح مع بقيّة الصفحة.
 */

interface ColorWheelProps {
  /** Drawn square, in CSS pixels. */
  size?: number;
  className?: string;
}

/* الطيف كاملاً — ست درجات وعودة إلى الأولى حتى تُغلق الدائرة بلا خطّ قطع مرئي. هذه ليست ألوان
   العلامة التجارية ولا تُقاس عليها: هي تمثيل لـ"كل الألوان"، وهو معنى الزرّ نفسه. */
const HUE_RING =
  'conic-gradient(from 0deg, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)';

/** التشبّع يهبط نحو المركز، تماماً كما في عجلة HSV. */
const SATURATION_FALLOFF =
  'radial-gradient(circle at 50% 50%, #FFFFFF 0%, rgba(255,255,255,0.85) 12%, rgba(255,255,255,0) 62%)';

export const ColorWheel: React.FC<ColorWheelProps> = ({ size = 28, className = '' }) => (
  <span
    aria-hidden="true"
    className={`shrink-0 block rounded-full ${className}`}
    style={{
      width: size,
      height: size,
      background: `${SATURATION_FALLOFF}, ${HUE_RING}`,
    }}
  />
);

export default ColorWheel;
