import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { attachWebGLContextRecovery } from '../lib/webglContextRecovery';
import { queueWebGLBuild } from '../lib/webglBuildQueue';
import { ORANGE } from '../lib/homePalette';

/**
 * طبقة الأشكال خلف شريط "أعمالنا": صفّ يمشي مع الشريط، كل شكل يدخل مثلثاً ثم ينفتح مربعاً.
 *
 * ## التحوّل مربوط بالموضع لا بالزمن
 *
 * الطريقة البديهية هي مؤقّت لكل شكل: يبدأ مثلثاً ثم يتحوّل بعد كذا ثانية. وهي خاطئة هنا لأنها
 * تجعل التحوّل يقع في مكان مختلف من الشريط عند كل زائر — يعتمد على لحظة تركيب المكوّن لا على
 * الشريط نفسه. المقياس هنا هو المسافة المقطوعة من الحافة التي تدخل منها الأشكال: شكل عند الحافة
 * تماماً مثلث، وبعد `uMorphRun` بكسل يكون مربعاً كاملاً. النتيجة أن التحوّل يقع دائماً في نفس
 * الموضع البصري من الشريط، ويراه الزائر مهما كانت لحظة وصوله.
 *
 * ## نفس السرعة، لأن حركتين مستقلتين في شريط واحد تُقرأ كخلل لا كتصميم
 *
 * الشعارات تمشي بحركة CSS (`.nq-marquee`) وهذه الطبقة تمشي داخل shader. لو اختلفت السرعتان
 * لصار في نفس الـ56 بكسل جسمان يتزحلقان أحدهما فوق الآخر — وهو بالضبط ما تسمّيه إرشادات الحركة
 * "حركة زائدة": أكثر من عنصر متحرك يتنافس على نفس المساحة. لذلك تصل السرعة من `ClientsStrip`
 * بالبكسل/ثانية، محسوبة من نفس عرض المسار ونفس مدّة الدورة التي تُغذّي حركة CSS، فيمشي الاثنان
 * كجسم واحد وتُقرأ الأشكال كخانات تركبها الشعارات.
 *
 * ## استدعاء رسم واحد، ولا مصفوفات تُكتب كل إطار
 *
 * الأشكال نُسخ (instances) من مستوٍ واحد، ولا تُكتب لها مصفوفة نسخة واحدة إطلاقاً: موضع كل شكل
 * يُحسب داخل vertex shader من رقمه (`aIndex`) ومن `uTime`. أي أن كل ما يفعله المعالج في الإطار
 * هو تحديث رقم عشري واحد — نفس المبدأ الذي يقوم عليه `TileField`.
 *
 * ## اللون: ظلّ على الورقة، لا عنصر ثانٍ ينافس الشعارات
 *
 * `ORANGE` (وهو الأردوازي `#273036`) عند شفافية 0.13 فوق أرضية الشريط `PAPER` يعطي `#D0CFCD`.
 * الرقم ليس ذوقاً: الشعارات والأسماء تقف فوق هذه الطبقة مباشرة، واسم العميل (أوبسيديان عند
 * 0.72) يقيس 7.43:1 على الورقة العارية و**6.56:1** فوق الشكل — أي أن الطبقة تكلّف أقل من درجة
 * واحدة وتبقى بعيدة جداً عن حدّ 4.5:1. الأشكال نفسها زخرفة لا تحمل معلومة، فلا حدّ تباين عليها
 * هي، والحدّ الوحيد الذي يهم هو ما تفعله بما فوقها.
 *
 * ## لا توجد علامة backtick واحدة داخل نصوص الـshader أدناه
 *
 * وهذه ليست ملاحظة أسلوب: النصّان قالبان نصّيان (template literals)، وأي backtick بداخلهما —
 * حتى داخل تعليق نثري — يُغلق النصّ في منتصف الـshader. وقع هذا فعلاً في هذا المشروع من قبل،
 * والنتيجة كانت ملفاً لا يُترجم أصلاً.
 */

/* ── المقاسات، كلها بالبكسل ──────────────────────────────────────────────────────────────── */

/** ضلع المربع. الشريط نفسه بحدود 56 بكسل ارتفاعاً، فهذا يترك هامشاً أعلى وأسفل الشكل. */
const SHAPE_PX = 26;

/** المسافة بين شكل وشكل. تسعة أشكال تقريباً على شاشة 1200، وهو ما في الرسم. */
const PITCH_PX = 132;

/** أقصى مسافة يكتمل خلالها التحوّل من مثلث إلى مربع. */
const MORPH_RUN_MAX_PX = 240;

/** شفافية الشكل فوق أرضية الشريط. انظر فقرة اللون أعلاه لسبب هذا الرقم تحديداً. */
const SHAPE_ALPHA = 0.13;

/**
 * سقف كثافة البكسل. نفس قيمة `TileField` وللسبب نفسه: الجهاز اللمسي يدفع ثمن كل بكسل إضافي
 * مرّتين — مساحة أكبر على GPU أضعف — وهذه طبقة زخرفية لا تستحق ذلك الثمن على أي جهاز.
 */
const MAX_DPR: number =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? 1 : 1.25;

/* ── الـshader ───────────────────────────────────────────────────────────────────────────── */

const VERTEX_SHADER = `
attribute float aIndex;

uniform float uTime;
uniform float uSpeed;
uniform float uPitch;
uniform float uSpan;
uniform float uHalfWidth;
uniform float uMorphRun;
uniform float uSize;
uniform float uFreeze;

void main() {
  /* موضع الشكل أفقياً. الالتفاف بـmod على uSpan، وuSpan أوسع من الشاشة بخطوتين كاملتين، فلحظة
     عودة الشكل من الطرف الأيسر إلى الطرف الأيمن تقع خارج الإطار المرئي ولا تُرى قفزة. */
  float x = mod(aIndex * uPitch - uTime * uSpeed, uSpan) - uSpan * 0.5;

  /* المسافة المقطوعة من الحافة اليمنى، وهي الحافة التي تدخل منها الأشكال: المسار كله يمشي
     يساراً (انظر nq-marquee-slide). صفر عند الحافة تماماً، وواحد بعد uMorphRun بكسل. */
  float m = clamp((uHalfWidth - x) / uMorphRun, 0.0, 1.0);

  /* uFreeze يرفع الجميع إلى مربع كامل حين يطلب الزائر تقليل الحركة. التجميد على القيمة الحالية
     كان سيترك الأشكال القريبة من الحافة مثلثات دائمة — وشكل نصف متحوّل بلا حركة تشرحه يُقرأ
     خطأً في الرسم لا قراراً. */
  m = mix(m, 1.0, uFreeze);

  /* الهندسة مستوٍ بوحدة واحدة مركزه الأصل، أي أركان عند (0.5±, 0.5±).
     الركنان الأيسران وحدهما ينطبقان على y = صفر عند m = صفر، فيصير الشكل مثلثاً رأسه إلى اليسار
     — جهة السير — ثم ينفتحان تدريجياً حتى المربع الكامل عند m = واحد. عند الانطباق يصير أحد
     المثلثين المكوّنين للمستوي عديم المساحة فلا يُرسم أصلاً، وهو ما يجعل المثلث مثلثاً نظيفاً بلا
     أي حيلة إضافية.

     ولجعل الرأس إلى الأعلى بدل اليسار: يُستبدل السطران بـ
       float isTop = step(0.001, position.y);  p.x *= mix(1.0, m, isTop);
     ولا شيء آخر في الملف يتغيّر. */
  float isLeading = step(position.x, -0.001);
  vec3 p = position;
  p.y *= mix(1.0, m, isLeading);

  p *= uSize;
  p.x += x;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uAlpha;

void main() {
  gl_FragColor = vec4(uColor, uAlpha);

  /* تحويل فضاء اللون عند المخرج، وهو ليس تفصيلاً تجميلياً.
     ShaderMaterial الخام لا تحوّل مخرجها: القيمة الخطّية تُكتب كما هي في مخزن sRGB فتصل الشاشة
     أغمق بكثير مما هو مقصود. اللون هنا أردوازي داكن أصلاً، وبدون هذا السطر يهبط إلى ما يشبه
     الأسود فوق ورقة فاتحة — أي عكس "ظلّ خفيف" تماماً. */
  #include <colorspace_fragment>
}
`;

function makeBandMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    // شفافة بلا كتابة عمق: طبقة مسطّحة واحدة لا يوجد فيها ما يحجب ما خلفه.
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: 0 },
      uPitch: { value: PITCH_PX },
      uSpan: { value: PITCH_PX * 4 },
      uHalfWidth: { value: 0 },
      uMorphRun: { value: MORPH_RUN_MAX_PX },
      uSize: { value: SHAPE_PX },
      uFreeze: { value: 0 },
      // THREE.Color تحوّل sRGB إلى خطّي عند الإدخال، فما يصل الـshader خطّي كما يجب.
      uColor: { value: new THREE.Color(ORANGE) },
      uAlpha: { value: SHAPE_ALPHA },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
}

/* ── الأشكال ─────────────────────────────────────────────────────────────────────────────── */

const Shapes: React.FC<{ speedPxPerSecond: number; reduced: boolean }> = ({
  speedPxPerSecond,
  reduced,
}) => {
  const { size, invalidate } = useThree();
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const material = useMemo(makeBandMaterial, []);
  const clock = useRef(0);

  /* خطوتان زائدتان عن ملء الشاشة: واحدة تنتظر خارج الحافة اليمنى وواحدة لم تغادر اليسرى بعد،
     وهما ما يجعل الحلقة متصلة. والحدّ الأدنى ثلاثة يمنع أي حالة يصبح فيها uSpan أضيق من الشاشة
     فيظهر نفس الشكل مرّتين. */
  const count = Math.max(3, Math.ceil(size.width / PITCH_PX) + 2);

  const indices = useMemo(() => {
    const a = new Float32Array(count);
    for (let i = 0; i < count; i++) a[i] = i;
    return a;
  }, [count]);

  useLayoutEffect(() => {
    geometry.setAttribute('aIndex', new THREE.InstancedBufferAttribute(indices, 1));
  }, [geometry, indices]);

  useLayoutEffect(() => {
    const u = material.uniforms;
    u.uSpan.value = count * PITCH_PX;
    u.uHalfWidth.value = size.width / 2;
    /* المسافة التي يكتمل خلالها التحوّل تتبع عرض الشاشة ولا تبقى رقماً ثابتاً: 240 بكسل على شاشة
       1200 هي خُمس العرض — يُرى التحوّل ويُفهم — وعلى هاتف 390 كانت ستكون ثلثي الشريط، أي أن
       أغلب ما يراه صاحب الهاتف أشكال نصف مفتوحة لا مربعات. */
    u.uMorphRun.value = Math.max(90, Math.min(MORPH_RUN_MAX_PX, size.width * 0.28));
    u.uSpeed.value = speedPxPerSecond;
    u.uFreeze.value = reduced ? 1 : 0;
    invalidate();
  }, [count, size.width, speedPxPerSecond, reduced, material, invalidate]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    if (reduced) return;
    // مقيَّدة: الحلقة تتوقف خارج الشاشة، وخطوة غير مقيَّدة كانت ستدمج فترة التوقف كلها في إطار
    // واحد فتقفز الأشكال بمقدار الغياب دفعة واحدة عند العودة.
    clock.current += Math.min(delta, 0.05);
    material.uniforms.uTime.value = clock.current;
  });

  return (
    <instancedMesh
      // مفتاح على العدد: عدد النُسخ يُثبَّت عند الإنشاء، فتغيّر عرض النافذة يحتاج بناءً جديداً.
      key={count}
      args={[geometry, material, count]}
      // الـshader يحرّك رؤوساً لا تعرفها الكرة المحيطة، وهي مشتقّة من مصفوفات نسخ لم تُكتب أصلاً.
      // الحجب ضدّها قد يُسقط الطبقة كلها، ولا شيء يوفّره وجسم واحد في المشهد.
      frustumCulled={false}
    />
  );
};

const ContextRecovery: React.FC = () => {
  const gl = useThree((s) => s.gl);
  useEffect(() => attachWebGLContextRecovery(gl), [gl]);
  return null;
};

/* ── المُضيف ──────────────────────────────────────────────────────────────────────────────── */

export interface ClientsShapeBandProps {
  /**
   * سرعة الشريط بالبكسل في الثانية، من `ClientsStrip`.
   *
   * تصل من هناك لا تُحسب هنا لأن مصدرها واحد: عرض المسار الواحد مقسوماً على مدّة الدورة — وهما
   * بالضبط ما يُغذّي حركة CSS. أي حساب مستقل هنا كان سينحرف عنها بمرور الوقت.
   */
  speedPxPerSecond: number;
}

const ClientsShapeBandHost: React.FC<ClientsShapeBandProps> = ({ speedPxPerSecond }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [everActive, setEverActive] = useState(false);
  const [active, setActive] = useState(false);
  const [idle, setIdle] = useState(false);
  const [reduced, setReduced] = useState(false);

  // الحلقة تعمل فقط والشريط على الشاشة. خارجها يبقى الكانفاس مركوناً على frameloop='never' بدل
  // أن يُهدَم: هدم السياق وإعادة بنائه يكلّفان ترجمة shader جديدة على الخيط الرئيسي.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setActive(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: '150px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [everActive]);

  /* الإنشاء يأخذ دوره في طابور WebGL الموحّد بدل أن يقع في نفس الإطار مع أي سياق آخر على
     الصفحة. إنشاء السياق وترجمة الـshader عمل متزامن بعشرات الميلي‑ثانية، وهذا الشريط يقع تحت
     الهيرو مباشرة — أي في نفس اللحظة التي يبني فيها حقل المكعبات نفسه. */
  useEffect(() => {
    if (everActive) return;
    return queueWebGLBuild(() => setEverActive(true));
  }, [everActive]);

  // نفس علَم `data-idle` الذي يوقف كل حركة CSS في الموقع حين تُنقل التبويب للخلفية.
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIdle(root.hasAttribute('data-idle'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['data-idle'] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {everActive && (
        <Canvas
          /* متعامدة بتكبير 1: وحدة العالم الواحدة تساوي بكسلاً واحداً، وهذا ما يجعل كل المقاسات
             أعلاه تُكتب بالبكسل مباشرة بلا أي تحويل. */
          orthographic
          camera={{ zoom: 1, position: [0, 0, 10], near: 0.1, far: 100 }}
          frameloop={reduced ? 'demand' : active && !idle ? 'always' : 'never'}
          dpr={[1, MAX_DPR]}
          /* alpha حتى تظهر أرضية القسم خلف الأشكال — الطبقة ظلّ على الورقة لا أرضية ثانية.
             antialias مطلوبة: حافة المثلث المائلة هي الحافة الوحيدة في المشهد، وبدونها تتسنّن
             وهي تتحوّل. */
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        >
          <ContextRecovery />
          <Shapes speedPxPerSecond={speedPxPerSecond} reduced={reduced} />
        </Canvas>
      )}
    </div>
  );
};

/* memo لأن المستهلك يعيد العرض عند كل قياس (ResizeObserver) وعند كل تحديث للإعدادات، ولا شيء
   من ذلك يخصّ هذه الطبقة إلا رقم السرعة وحده. */
export const ClientsShapeBand = React.memo(ClientsShapeBandHost);
