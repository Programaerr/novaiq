import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shadeLinear } from '../../lib/tone';
import { attachWebGLContextRecovery } from '../../lib/webglContextRecovery';
import { queueWebGLBuild } from '../../lib/webglBuildQueue';

/**
 * A panel's flat fill, made liquid — the same colour, moving.
 *
 * ## It is the same water as the cube field, rendered smooth instead of quantised
 *
 * `swell()` below is character-for-character the one in TileField.tsx: the same three sines, the
 * same frequencies, the same drift speeds. That is the entire point of copying it rather than
 * inventing a second wave. The hero has a cube field on one side and this panel on the other, and
 * two DIFFERENT waves side by side read as two effects that happen to both be moving. One wave,
 * sampled coarsely into cubes on the right and smoothly on the left, reads as one body of water
 * with a slab lying in it.
 *
 * (If that wave is ever retuned, the two have to be retuned together. The alternative — importing
 * it — would mean exporting a shader fragment across a module boundary, and a GLSL string that
 * two files can edit is a worse problem than two strings that have to agree.)
 *
 * ## The colour has to average back to the panel, and that is not automatic
 *
 * The brief was "make it watery, but the same colour as the card". The second half is the harder
 * one, because the obvious construction quietly breaks it: `shadeColor(panel, ±x)` is symmetric
 * in sRGB, and the shader mixes in LINEAR light — three converts every `THREE.Color` uniform on
 * the way in. Measured, a ±0.30/+0.26 sRGB pair averages to `#474D51`, which is 1.57:1 away from
 * `#273036`: a visibly lighter and greyer slab than the one it replaced.
 *
 * So the pair is built with `shadeLinear` instead, one amplitude either side of the panel's own
 * linear value. Their midpoint is the panel colour by construction, and the mix parameter below is
 * built to have a mean of exactly 0.5 so that midpoint is what the eye actually averages.
 *
 * ## Two inks sit on this, so the amplitude is a contrast decision
 *
 *   trough `#081C25`              wordmark 16.27:1   tagline 8.88:1
 *   panel  `#273036` (the mean)   wordmark 12.53:1   tagline 7.28:1
 *   crest  `#373E42`              wordmark 10.14:1   tagline 6.15:1
 *   crest + full glint `#4B5053`  wordmark  7.61:1   tagline 4.87:1
 *
 * The last row is the worst pixel this surface can produce, landing directly under the smaller
 * and dimmer of the two inks. It is what set the glint: at 0.05 that row reads 4.46:1 and is the
 * one thing on the panel that would have gone under the 4.5 floor, so the glint is 0.035. The
 * wordmark was never anywhere near the limit; the tagline decided every number here.
 */

/* ── الشكل ────────────────────────────────────────────────────────────────────────────────── */

/** لون البطاقة نفسه. القاع والقمة يُشتقّان منه، ومتوسطهما يرجع إليه بالضبط. */
const PANEL = '#273036';

/**
 * نصف السعة، بوحدات الضوء الخطّي.
 *
 * `#273036` يقع عند حوالي 0.03 فقط من مدى الضوء الخطّي، فـ0.018 هنا موجة سخية لا خافتة — وهي
 * أكبر قيمة تُبقي القاع فوق الصفر في كل القنوات. عند 0.022 تُقصَّ القناة الحمراء عند الصفر،
 * فينحرف المتوسط إلى `#283036` بدل `#273036`: أي أن البطاقة تتوقف عن أن تكون لونها.
 */
const SWELL = 0.018;

const DEEP = shadeLinear(PANEL, -SWELL);
const CREST = shadeLinear(PANEL, SWELL);

/** بريق الضوء على الماء. أبيض الموقع، لا أبيض خالص — لا شيء في هذه اللوحة يصل `#FFFFFF`. */
const GLINT = '#F7F7F5';
/**
 * كم يضيف البريق في أشدّ لمعة، بوحدات الضوء الخطّي.
 *
 * مقاسة لا مُقدَّرة: 0.05 تضع أسوأ بكسل عند 4.46:1 تحت السطر الثانوي — أي تحت أرضية 4.5 — و0.035
 * تضعه عند 4.87:1. هذا الرقم وحده هو ما تحدّده قراءة النص، لا شكل الماء.
 */
const GLINT_AMT = 0.035;

/**
 * طول الموجة، بالبكسل لكل وحدة من وحدات `swell`.
 *
 * حقل المكعبات يقيس خلاياه بين 46 و78 بكسل ويمرّر موضع الخلية إلى `swell` مباشرة، فتقع أطوال
 * موجته في هذا المدى مضروبة بترددات الجيوب. 62 هو منتصف ذلك المدى: يعطي اللوحة موجة أو موجتين
 * عبر عرضها، وهو ما يجعل الماء هنا وهناك يبدوان بنفس المقياس بدل أن يكون أحدهما تكبيراً للآخر.
 */
const WAVE_PX = 62;

/** نفس اتجاه الضوء الذي يضيء حقل المكعبات. مصدر واحد للمشهد كله. */
const LIGHT = new THREE.Vector3(-0.42, 0.5, 0.76).normalize();

/**
 * كم تُضخَّم ميلة السطح قبل أن تُقرأ كإضاءة.
 *
 * مشتقّات مجموع الجيوب صغيرة، وبلا هذا يتحرك اللون في جزء ضئيل من المدى بين القاع والقمة فيبدو
 * السطح ساكناً بلون واحد. القصّ عند ±1 متماثل، فلا يزيح المتوسط عن 0.5 مهما ارتفعت القيمة.
 */
const SLOPE_GAIN = 2.6;

/* ── الشيدر ───────────────────────────────────────────────────────────────────────────────── */

function makeWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: false,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: new THREE.Vector2(1, 1) },
      uDeep: { value: new THREE.Color(DEEP) },
      uCrest: { value: new THREE.Color(CREST) },
      uGlint: { value: new THREE.Color(GLINT) },
      uGlintAmt: { value: GLINT_AMT },
      uLight: { value: LIGHT.clone() },
    },
    // إسقاط مباشر إلى فضاء القصّ (clip space): هذا مستطيل يملأ الكانفاس بالكامل ولا شيء آخر في
    // المشهد، فالكاميرا والمصفوفات ليس لها ما تقرره هنا.
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    // ملاحظة: لا توجد علامة backtick واحدة داخل هذا النص، ولا حتى في التعليقات — فهو قالب نصي،
    // وأي علامة تُغلقه في منتصف الـshader فيصير خطأ صياغة GLSL يظهر كلوحة سوداء.
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uSize;
      uniform vec3 uDeep;
      uniform vec3 uCrest;
      uniform vec3 uGlint;
      uniform float uGlintAmt;
      uniform vec3 uLight;

      varying vec2 vUv;

      // نفس موجة حقل المكعبات حرفاً بحرف. انظر شرح الملف: موجة واحدة تُقرأ كجسم ماء واحد، وموجتان
      // مختلفتان جنب بعضهما تُقرآن كأثرين منفصلين صدف أن كليهما يتحرك.
      float swell(vec2 p) {
        float a = sin(p.x * 1.35 - uTime * 0.85);
        float b = sin((p.x * 0.72 + p.y * 1.05) - uTime * 0.55 + 1.7);
        float c = sin((p.y * 0.9 - p.x * 0.35) * 1.4 + uTime * 0.4);
        return a * 0.45 + b * 0.35 + c * 0.2;
      }

      void main() {
        vec2 p = vUv * uSize / ${WAVE_PX.toFixed(1)};

        // الميلة تُؤخذ بالفروق لا بالاشتقاق التحليلي: ثلاث جيوب مشتقّة يدوياً هي ثلاثة أماكن
        // إضافية يمكن أن تفترق فيها هذه الموجة عن موجة الحقل، والفرق هنا يكلّف تقييمين.
        float e = 0.35;
        float h = swell(p);
        float dx = swell(p + vec2(e, 0.0)) - h;
        float dy = swell(p + vec2(0.0, e)) - h;

        // ميلة السطح نحو الضوء. متماثلة حول الصفر لأن مشتقّات مجموع الجيوب كذلك — وهذا بالضبط ما
        // يجعل متوسط 'lit' صفراً، ومتوسط المزج 0.5، ومتوسط اللون هو لون البطاقة نفسه. أي صيغة
        // إضاءة أخرى (dot(n, L) الاعتيادية مثلاً) متوسطها ليس صفراً، وكانت ستنقل اللوحة كلها نحو
        // القمة بلا أن يظهر ذلك كخطأ في أي مكان سوى أن اللون صار أفتح.
        float lit = clamp((-dx * uLight.x - dy * uLight.y) * ${SLOPE_GAIN.toFixed(1)}, -1.0, 1.0);

        vec3 col = mix(uDeep, uCrest, lit * 0.5 + 0.5);

        // البريق على أشدّ المنحدرات المواجهة للضوء فقط: شريط ضيق يتحرك مع الموجة بدل غسلة عامة.
        // هذا هو ما يُقرأ كماء أكثر من السعة نفسها — العين تصدّق الحركة قبل أن تصدّق التدرّج.
        float glint = smoothstep(0.62, 1.0, lit);
        col += uGlint * (glint * glint * uGlintAmt);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/* ── المشهد ───────────────────────────────────────────────────────────────────────────────── */

const ContextRecovery: React.FC = () => {
  const gl = useThree((state) => state.gl);
  useEffect(() => attachWebGLContextRecovery(gl), [gl]);
  return null;
};

const Surface: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const material = useMemo(makeWaterMaterial, []);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  // ساكنة على 12 ثانية عند تقليل الحركة: لحظة من الموجة بدل بدايتها، حيث الجيوب الثلاثة عند
  // الصفر معاً وتكون اللوحة مسطّحة تماماً — أي أن "بلا حركة" كانت ستعني "بلا ماء".
  const clock = useRef(reduced ? 12 : 0);

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    material.uniforms.uSize.value.set(size.width, size.height);
    invalidate();
  }, [material, size.width, size.height, invalidate]);

  useFrame((_, delta) => {
    if (reduced) return;
    // مقيَّدة مثل حقل المكعبات: خطوة غير مقيَّدة بعد توقّف الحلقة خارج الشاشة تدمج الفجوة كلها في
    // إطار واحد فتقفز الموجة.
    clock.current += Math.min(delta, 0.05);
    material.uniforms.uTime.value = clock.current;
  });

  return (
    <mesh material={material} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
};

/* ── المُضيف ──────────────────────────────────────────────────────────────────────────────── */

/**
 * يملأ أقرب أب `relative`. الأب يحتفظ بلونه المسطّح خلفه — انظر HomeHero — فما قبل أول رسم، وفي
 * أي متصفح بلا WebGL، تبقى البطاقة لونها بالضبط بدل أن تومض فارغة.
 */
export const WaterFill: React.FC = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [built, setBuilt] = useState(false);
  const [active, setActive] = useState(true);
  const [idle, setIdle] = useState(false);
  const [reduced, setReduced] = useState(false);

  // يأخذ دوره في نفس طابور بقية أسطح WebGL. اللوحة هذه هي السياق الرابع على الصفحة الرئيسية،
  // وترجمتها في نفس إطار ترجمة أحد الحقول هي بالضبط الاصطدام الذي وُجد الطابور من أجله.
  useEffect(() => {
    if (built) return;
    return queueWebGLBuild(() => setBuilt(true));
  }, [built]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: '150px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [built]);

  // نفس علَم `data-idle` الذي يوقف كل حركة في الموقع حين لا يكون هناك من يشاهد.
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
    <div ref={hostRef} aria-hidden="true" className="absolute inset-0">
      {built && (
        <Canvas
          frameloop={reduced ? 'demand' : active && !idle ? 'always' : 'never'}
          // سقف 1: هذا سطح متدرّج بلا حافة واحدة حادة، ومضاعفة عدد بكسلاته تشتري نعومة لا وجود
          // لها أصلاً. حقل المكعبات يدفع 1.25 لأن له صور ظلّ حقيقية تتسنّن.
          dpr={1}
          // بلا شفافية: هذا هو سطح البطاقة نفسه، لا طبقة فوقه.
          gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
        >
          <ContextRecovery />
          <Surface reduced={reduced} />
        </Canvas>
      )}
    </div>
  );
};

export default WaterFill;
