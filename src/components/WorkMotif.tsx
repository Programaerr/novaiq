import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { attachWebGLContextRecovery } from '../lib/webglContextRecovery';
import { SLATE } from '../lib/homePalette';
import {
  MOTIFS,
  MOTIF_MAX_COUNT,
  type MotifSpec,
  type WorkMotifId,
} from '../lib/workMotifs';

/**
 * الحركة خلف ألواح "أعمالنا".
 *
 * ## سياق WebGL واحد للقسم كلّه، لا واحدٌ لكلّ كارت
 *
 * الطلب "كلّ كارت له انميشن" يقرأ كأنّه ستّة مشاهد. وهو ليس كذلك: لا ينفتح إلا لوحٌ واحد في
 * كلّ لحظة (`activeId` في ClientsAccordion)، فما يُرى أبداً حركةٌ واحدة. فمشهد واحد يكفي،
 * ويُبدَّل نمطه بالـuniforms.
 *
 * والفرق ليس أناقة: ستّة سياقات WebGL على صفحة واحدة تزاحم حقول المكعّبات على ميزانية
 * المتصفّح نفسها (نحو ستة عشر سياقاً ثمّ يُقتَل الأقدم)، وهذا بالضبط ما حدث في هذا المستودع
 * حين كانت خانات اللون مشاهد three.js — انظر ColorWheel.tsx. سياق واحد، مادّة واحدة، نداء
 * رسم واحد.
 *
 * ## وكيف تظهر داخل اللوح المفتوح وحده
 *
 * لا بحساب موضع اللوح ولا بتحريك الكانفاس معه — كلاهما يقرأ التخطيط كلّ إطار. الكانفاس ثابت
 * خلف الصفّ كلّه، والألواح فوقه بأرضيّة معتمة؛ اللوح المفتوح وحده تشفّ أرضيّته. فالنافذة التي
 * تُرى منها الحركة هي صندوق اللوح نفسه، وتتّسع مع تمدّده مجّاناً — بلا سطر واحد يزامنهما.
 */

/* ── الأطلس ──────────────────────────────────────────────────────────────────────────────────
   نسيج واحد 8×8 يُبنى مرّة عند أوّل استعمال ويعيش ما عاشت الصفحة، فيه كلّ ما يُرسَم في كلّ
   الأنماط: اثنان وثلاثون حرفاً للأكواد، ثمّ أربعة رموز لكلّ نمط بعدها. نسيج واحد يعني نداء رسم
   واحد مهما تبدّلت الأنماط — بدل نسيج لكلّ نمط يُرفَع إلى بطاقة الرسوميات عند كلّ مرور مؤشّر.

   ولماذا رموزٌ مرسومة لا أشكال هندسية: النسخة الأولى كانت دوائر ومربّعات ومعيّنات بسرعات
   مختلفة، فكانت "أدوات" تُرسَم مربّعات — أي أنّها لا تقول شيئاً عن صاحب الكارت، وهو كلّ
   الغرض. والرموز مرسومة هنا بمسارات بسيطة لا مستوردة: مقاسها المعروض بين 22 و54 بكسلاً
   وشفافيّتها تحت 0.4، فالظِلّ يكفي والتفصيل يضيع.

   ولا إيموجي: هي صور ملوّنة تتبع خطّ النظام، تكسر أحاديّة لون القسم وتختلف شكلاً بين جهاز
   وآخر — وهي أصلاً في قائمة ما لا يُستعمل أيقونةً في قواعد التصميم. */
const ATLAS_COLS = 8;
const ATLAS_CELL = 48;

/** حروف الأكواد: الخانات 0..31. */
const GLYPHS = '01{}[]<>/\\;=+-*&|!?:.#$_()01ifn=>';

type IconDraw = (c: CanvasRenderingContext2D, s: number) => void;

/* أدوات رسم مختصرة. كلّ رمز يُرسَم في مربّع 0..s، والقلم مضبوط قبل النداء. */
const line = (c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
};
const poly = (c: CanvasRenderingContext2D, pts: number[][], close = true) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (close) c.closePath();
  c.stroke();
};
const circle = (c: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
};

/* أربعة رموز لكلّ نمط، بالترتيب الذي تشير إليه `glyphBase` في workMotifs.ts. */
const ICONS: IconDraw[] = [
  // 32..35 — أزياء: علّاقة، قميص، فستان، زرّ
  (c, s) => { circle(c, s * 0.5, s * 0.2, s * 0.07); poly(c, [[s * 0.5, s * 0.27], [s * 0.16, s * 0.72], [s * 0.84, s * 0.72]]); },
  (c, s) => { poly(c, [[s * 0.3, s * 0.22], [s * 0.14, s * 0.36], [s * 0.24, s * 0.48], [s * 0.28, s * 0.42], [s * 0.28, s * 0.8], [s * 0.72, s * 0.8], [s * 0.72, s * 0.42], [s * 0.76, s * 0.48], [s * 0.86, s * 0.36], [s * 0.7, s * 0.22], [s * 0.6, s * 0.28], [s * 0.4, s * 0.28]]); },
  (c, s) => { poly(c, [[s * 0.38, s * 0.18], [s * 0.62, s * 0.18], [s * 0.58, s * 0.45], [s * 0.82, s * 0.84], [s * 0.18, s * 0.84], [s * 0.42, s * 0.45]]); },
  (c, s) => { circle(c, s * 0.5, s * 0.5, s * 0.3); circle(c, s * 0.42, s * 0.42, s * 0.04); circle(c, s * 0.58, s * 0.42, s * 0.04); circle(c, s * 0.42, s * 0.58, s * 0.04); circle(c, s * 0.58, s * 0.58, s * 0.04); },

  // 36..39 — تجارة: كيس، بطاقة سعر، عربة، صندوق
  (c, s) => { poly(c, [[s * 0.2, s * 0.34], [s * 0.8, s * 0.34], [s * 0.74, s * 0.84], [s * 0.26, s * 0.84]]); c.beginPath(); c.arc(s * 0.5, s * 0.34, s * 0.14, Math.PI, 0); c.stroke(); },
  (c, s) => { poly(c, [[s * 0.18, s * 0.5], [s * 0.5, s * 0.18], [s * 0.84, s * 0.52], [s * 0.52, s * 0.84]]); circle(c, s * 0.62, s * 0.36, s * 0.06); },
  (c, s) => { poly(c, [[s * 0.14, s * 0.24], [s * 0.28, s * 0.24], [s * 0.38, s * 0.64], [s * 0.8, s * 0.64], [s * 0.86, s * 0.36], [s * 0.32, s * 0.36]], false); circle(c, s * 0.42, s * 0.78, s * 0.06); circle(c, s * 0.74, s * 0.78, s * 0.06); },
  (c, s) => { poly(c, [[s * 0.18, s * 0.3], [s * 0.82, s * 0.3], [s * 0.82, s * 0.82], [s * 0.18, s * 0.82]]); line(c, s * 0.18, s * 0.46, s * 0.82, s * 0.46); line(c, s * 0.5, s * 0.3, s * 0.5, s * 0.46); },

  // 40..43 — أدوات: مسنّن، مفتاح ربط، مفكّ، صامولة
  (c, s) => {
    circle(c, s * 0.5, s * 0.5, s * 0.22); circle(c, s * 0.5, s * 0.5, s * 0.08);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      line(c, s * 0.5 + Math.cos(a) * s * 0.24, s * 0.5 + Math.sin(a) * s * 0.24,
              s * 0.5 + Math.cos(a) * s * 0.36, s * 0.5 + Math.sin(a) * s * 0.36);
    }
  },
  (c, s) => { c.beginPath(); c.arc(s * 0.32, s * 0.32, s * 0.16, Math.PI * 0.6, Math.PI * 2.1); c.stroke(); line(c, s * 0.42, s * 0.44, s * 0.8, s * 0.82); },
  (c, s) => { line(c, s * 0.24, s * 0.76, s * 0.56, s * 0.44); poly(c, [[s * 0.52, s * 0.4], [s * 0.68, s * 0.24], [s * 0.8, s * 0.36], [s * 0.64, s * 0.52]]); },
  (c, s) => { poly(c, [[s * 0.5, s * 0.16], [s * 0.79, s * 0.33], [s * 0.79, s * 0.67], [s * 0.5, s * 0.84], [s * 0.21, s * 0.67], [s * 0.21, s * 0.33]]); circle(c, s * 0.5, s * 0.5, s * 0.13); },

  // 44..47 — نعومة: بريق، بتلة، قطرة، زهرة
  (c, s) => { poly(c, [[s * 0.5, s * 0.12], [s * 0.58, s * 0.42], [s * 0.88, s * 0.5], [s * 0.58, s * 0.58], [s * 0.5, s * 0.88], [s * 0.42, s * 0.58], [s * 0.12, s * 0.5], [s * 0.42, s * 0.42]]); },
  (c, s) => { c.beginPath(); c.moveTo(s * 0.5, s * 0.14); c.bezierCurveTo(s * 0.9, s * 0.4, s * 0.78, s * 0.86, s * 0.5, s * 0.86); c.bezierCurveTo(s * 0.22, s * 0.86, s * 0.1, s * 0.4, s * 0.5, s * 0.14); c.stroke(); },
  (c, s) => { c.beginPath(); c.moveTo(s * 0.5, s * 0.14); c.bezierCurveTo(s * 0.84, s * 0.5, s * 0.76, s * 0.86, s * 0.5, s * 0.86); c.bezierCurveTo(s * 0.24, s * 0.86, s * 0.16, s * 0.5, s * 0.5, s * 0.14); c.stroke(); },
  (c, s) => { for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; circle(c, s * 0.5 + Math.cos(a) * s * 0.22, s * 0.5 + Math.sin(a) * s * 0.22, s * 0.15); } },
];

let atlasTexture: THREE.CanvasTexture | null = null;

function buildAtlas(): THREE.CanvasTexture {
  if (atlasTexture) return atlasTexture;
  const s = ATLAS_CELL;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = s * ATLAS_COLS;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(s * 0.74)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  for (let i = 0; i < GLYPHS.length && i < 32; i++) {
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    ctx.fillText(GLYPHS[i], col * s + s / 2, row * s + s / 2);
  }

  ctx.lineWidth = Math.max(2, s * 0.075);
  ICONS.forEach((draw, i) => {
    const cellIndex = 32 + i;
    const col = cellIndex % ATLAS_COLS;
    const row = Math.floor(cellIndex / ATLAS_COLS);
    ctx.save();
    /* هامش داخل الخانة: الرموز كانت تُرسَم من حافة إلى حافة، والترشيح الخطّي يقرأ عندها
       من الخانة المجاورة فتعود الحدود مقصوصة. مقيس على اللقطات: أطراف الرموز كانت تُبتَر. */
    ctx.translate(col * s + s / 2, row * s + s / 2);
    ctx.scale(0.82, 0.82);
    ctx.translate(-s / 2, -s / 2);
    draw(ctx, s);
    ctx.restore();
  });

  atlasTexture = new THREE.CanvasTexture(canvas);
  atlasTexture.minFilter = THREE.LinearFilter;
  atlasTexture.magFilter = THREE.LinearFilter;
  atlasTexture.generateMipmaps = false;
  /* الخانة تُحسَب يدوياً في الـshader، فالقلب التلقائي يعقّد الحساب بلا مقابل. */
  atlasTexture.flipY = false;
  return atlasTexture;
}

/* ── الهندسة ─────────────────────────────────────────────────────────────────────────────────
   مربّع واحد مُكرَّر MOTIF_MAX_COUNT مرّة. البذور تُولَّد مرّة واحدة ولا تتغيّر أبداً — تبديل
   النمط يغيّر كيف تُقرأ البذرة، لا البذرة نفسها، فلا رفع جديد إلى بطاقة الرسوميات عند كلّ مرور
   مؤشّر. والأنماط الأقلّ كثافة تُخفي الفائض بـ`uCount` بدل أن تُعيد التخصيص. */
function buildGeometry(): THREE.InstancedBufferGeometry {
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.uv = base.attributes.uv;
  geo.instanceCount = MOTIF_MAX_COUNT;

  const seed = new Float32Array(MOTIF_MAX_COUNT * 4);
  const glyph = new Float32Array(MOTIF_MAX_COUNT);
  const index = new Float32Array(MOTIF_MAX_COUNT);

  for (let i = 0; i < MOTIF_MAX_COUNT; i++) {
    seed[i * 4 + 0] = Math.random();            // موضعه الأفقي، 0..1
    seed[i * 4 + 1] = Math.random();            // طوره في الدورة، حتى لا يبدأ الجميع معاً
    seed[i * 4 + 2] = 0.65 + Math.random() * 0.7; // مضاعف الحجم
    seed[i * 4 + 3] = 0.75 + Math.random() * 0.5; // مضاعف السرعة
    glyph[i] = Math.floor(Math.random() * GLYPHS.length);
    index[i] = i;
  }

  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geo.setAttribute('aGlyph', new THREE.InstancedBufferAttribute(glyph, 1));
  geo.setAttribute('aIndex', new THREE.InstancedBufferAttribute(index, 1));
  base.dispose();
  return geo;
}

const VERT = /* glsl */ `
  attribute vec4 aSeed;
  attribute float aGlyph;
  attribute float aIndex;

  uniform float uTime;
  uniform vec2  uHalf;      // نصف الكانفاس بالبكسل — وحدات المشهد بكسلات (كاميرا متعامدة، تكبير 1)
  uniform float uSize;
  uniform float uDirY;      // +1 ينزل، -1 يصعد
  uniform float uSpeed;     // بكسل/ثانية
  uniform vec2  uSway;      // السعة، والتردّد
  uniform float uSpin;
  uniform float uLanes;     // 0 = بلا أعمدة
  uniform float uTrail;
  uniform float uCount;

  varying vec2  vUv;
  varying float vGlyph;
  varying float vFade;

  const float TAU = 6.2831853;

  void main() {
    vUv = uv;
    vGlyph = aGlyph;

    float size = uSize * aSeed.z;
    float extent = uHalf.y + size;

    // نسبة العبور 0..1، ثم تُلفّ. لكلّ جزيء طوره وسرعته، فلا يتحرّك الحقل ككتلة واحدة.
    float cycle = (extent * 2.0) / max(uSpeed * aSeed.w, 1.0);
    float t = fract(aSeed.y + uTime / cycle);

    // 0 عند الحافّة التي يدخل منها، 1 عند التي يخرج منها.
    float y = mix(extent, -extent, t) * uDirY;

    float free = mix(-uHalf.x, uHalf.x, aSeed.x);
    // أعمدة ثابتة بدل التوزيع الحرّ: هذا ما يجعل الأكواد تُقرأ أعمدةً لا رذاذاً.
    float lane = (floor(aSeed.x * uLanes) + 0.5) / max(uLanes, 1.0) * uHalf.x * 2.0 - uHalf.x;
    float x = mix(free, lane, step(0.5, uLanes));
    x += sin(t * TAU * uSway.y + aSeed.y * TAU) * uSway.x;

    // زاوية الجزيء حول نفسه.
    float ang = uSpin * TAU * uTime * aSeed.w + aSeed.y * TAU;
    float ca = cos(ang);
    float sa = sin(ang);
    vec2 corner = vec2(position.x * ca - position.y * sa, position.x * sa + position.y * ca);

    // خفوت عند الطرفين حتى لا يظهر الجزيء أو يختفي فجأة على الحافّة.
    vFade = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.86, 1.0, t));
    // ذيل العمود: الرأس ساطع وما خلفه يخفت. لا أثر له حين uTrail = 0.
    vFade *= mix(1.0, 1.0 - t * 0.85, uTrail);
    // الفائض عن كثافة هذا النمط يُخفى بدل أن يُعاد تخصيص الهندسة.
    vFade *= step(aIndex, uCount - 0.5);

    vec2 world = vec2(x, y) + corner * size;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;

  uniform sampler2D uAtlas;
  uniform float uShape;   // 0 حرف، 1 دائرة، 2 مستطيل، 3 معيّن
  uniform vec3  uColor;
  uniform float uAlpha;
  uniform float uReveal;
  uniform float uAtlasCols;
  uniform float uGlyphBase;   // أوّل خانة يملكها هذا النمط
  uniform float uGlyphSpan;   // كم خانة

  varying vec2  vUv;
  varying float vGlyph;
  varying float vFade;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;

    // الأشكال الأربعة تُحسَب كلّها وتُمزَج بـstep: فرعُ if في shader يُنفَّذ على كلّ بكسل من
    // الطرفين على أي حال، فالمزج أصدق وأسرع من التظاهر بالاختيار.
    float aCircle = 1.0 - smoothstep(0.35, 1.0, length(p));
    float aRect = 1.0 - smoothstep(0.72, 1.0, max(abs(p.x), abs(p.y)));
    float aDiamond = 1.0 - smoothstep(0.55, 1.0, abs(p.x) + abs(p.y));

    // البذرة عشوائية 0..63 وتُطوى داخل نطاق النمط، فلا تُعاد توليدها عند كلّ تبديل.
    float cell = uGlyphBase + mod(vGlyph, uGlyphSpan);
    float col = mod(cell, uAtlasCols);
    float row = floor(cell / uAtlasCols);
    vec2 atlasUv = (vec2(col, row) + vec2(vUv.x, 1.0 - vUv.y)) / uAtlasCols;
    float aGlyphAlpha = texture2D(uAtlas, atlasUv).a;

    float a = mix(aGlyphAlpha, aCircle, step(0.5, uShape));
    a = mix(a, aRect, step(1.5, uShape));
    a = mix(a, aDiamond, step(2.5, uShape));

    float alpha = a * vFade * uAlpha * uReveal;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

interface FieldProps {
  motif: WorkMotifId | null;
  reduced: boolean;
}

/**
 * المشهد. البدائل تُكتب في الـuniforms مباشرة داخل `useFrame` لا عبر حالة React: هذه قيم
 * تتغيّر كلّ إطار، وتحويلها إلى `setState` يعني إعادة عرض React ستّين مرّة في الثانية مقابل
 * رقم واحد.
 */
const Field: React.FC<FieldProps> = ({ motif, reduced }) => {
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const geometry = useMemo(buildGeometry, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uHalf: { value: new THREE.Vector2(1, 1) },
          uSize: { value: 14 },
          uDirY: { value: -1 },
          uSpeed: { value: 30 },
          uSway: { value: new THREE.Vector2(20, 1) },
          uSpin: { value: 0 },
          uLanes: { value: 0 },
          uTrail: { value: 0 },
          uCount: { value: 0 },
          uShape: { value: 1 },
          uColor: { value: new THREE.Color(SLATE) },
          uAlpha: { value: 0.2 },
          uReveal: { value: 0 },
          uAtlas: { value: buildAtlas() },
          uAtlasCols: { value: ATLAS_COLS },
          uGlyphBase: { value: 0 },
          uGlyphSpan: { value: 32 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        // عمقٌ لا معنى له في حقل مسطّح شفّاف، وكتابته تجعل الجزيئات تقصّ بعضها.
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  /* النمط المكتوب حالياً في الـuniforms. يتخلّف عمداً عن `motif` أثناء التلاشي: التبديل
     يحدث عند الشفافيّة صفر، فلا يُرى الحقل وهو يقفز من شكل إلى شكل. */
  const shown = useRef<WorkMotifId | null>(null);
  const reveal = useRef(0);

  /* الثابت هو الكثافة لا العدد.

     العدد في الجدول مضبوط على مساحة سطح المكتب (896×448). وعلى هاتف تصير المساحة ربعها
     تقريباً، فنفس العدد يعني أربعة أضعاف الازدحام — مرئيّ في اللقطات: الأكواد كانت تُغرِق
     اللوح الضيّق وتزاحم الشعار والاسم فوقها. والأعمدة كذلك: أربعة عشر عموداً على 400px
     تعني عموداً كلّ 28px. */
  const REFERENCE_AREA = 896 * 448;
  const density = Math.min(1, Math.max(0.4, (size.width * size.height) / REFERENCE_AREA));
  const widthRatio = Math.min(1, Math.max(0.35, size.width / 896));

  const apply = (spec: MotifSpec) => {
    const u = material.uniforms;
    u.uSize.value = spec.size;
    u.uDirY.value = spec.dirY;
    u.uSpeed.value = spec.speed;
    (u.uSway.value as THREE.Vector2).set(spec.swayAmp, spec.swayFreq);
    u.uSpin.value = spec.spin;
    u.uLanes.value = spec.lanes ? Math.max(5, Math.round(spec.lanes * widthRatio)) : 0;
    u.uTrail.value = spec.trail;
    u.uCount.value = Math.round(spec.count * density);
    u.uShape.value = spec.shape;
    u.uAlpha.value = spec.alpha;
    u.uGlyphBase.value = spec.glyphBase;
    u.uGlyphSpan.value = spec.glyphSpan;
  };

  useEffect(() => {
    (material.uniforms.uHalf.value as THREE.Vector2).set(size.width / 2, size.height / 2);
    // والنمط المعروض يُعاد تطبيقه: الكثافة والأعمدة مشتقّتان من المقاس، فتغيّره يبطلهما.
    if (shown.current) apply(MOTIFS[shown.current]);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material, size.width, size.height, invalidate]);

  /* تقليل الحركة: النمط يُطبَّق ويُرسَم إطار واحد ثابت. "بلا حركة" لا يعني "بلا شيء" — يبقى
     نسيجاً ساكناً خلف اللوح، وهو ما يريده مَن أطفأ الحركة: صورة لا سكون تام. */
  useEffect(() => {
    if (!reduced) return;
    const next = motif ?? shown.current;
    if (next) {
      shown.current = next;
      apply(MOTIFS[next]);
    }
    reveal.current = motif ? 1 : 0;
    material.uniforms.uReveal.value = reveal.current;
    material.uniforms.uTime.value = 4.2; // لقطة من منتصف الدورة، لا الإطار صفر حيث يصطفّ الكلّ
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, motif, material, invalidate]);

  useFrame((_, delta) => {
    if (reduced) return;
    const u = material.uniforms;
    u.uTime.value += delta;

    const wantSwap = motif !== shown.current;
    const target = motif && !wantSwap ? 1 : 0;
    // ‎~180ms لكلّ اتّجاه، مستقلّة عن معدّل الإطارات.
    const k = Math.min(1, delta / 0.18);
    reveal.current += (target - reveal.current) * k;

    if (wantSwap && reveal.current < 0.02) {
      shown.current = motif;
      if (motif) apply(MOTIFS[motif]);
    }
    u.uReveal.value = reveal.current;
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
};

const ContextRecovery: React.FC = () => {
  const gl = useThree((s) => s.gl);
  useEffect(() => attachWebGLContextRecovery(gl), [gl]);
  return null;
};

export interface WorkMotifProps {
  /** نمط اللوح المفتوح، أو `null` حين لا لوح مفتوح. */
  motif: WorkMotifId | null;
  /** لا يُركَّب الكانفاس قبل أن يُرى القسم: سياق WebGL لقسم أسفل الصفحة لم يصل إليه أحد بعد. */
  seen: boolean;
}

/**
 * المضيف. يملك القرارين الوحيدين اللذين يكلّفان شيئاً: متى يوجد الكانفاس، ومتى يرسم.
 */
export const WorkMotif: React.FC<WorkMotifProps> = ({ motif, seen }) => {
  const [reduced, setReduced] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  /* ويظلّ يرسم بعد الإغلاق بقدر التلاشي وحده. بلا هذا الذيل يتوقّف الرسم لحظة إغلاق اللوح
     فتتجمّد الحركة على آخر إطار بدل أن تخفت — وهو ظاهر لأنّ نافذة اللوح تُغلق في 240ms
     لا فوراً. */
  useEffect(() => {
    if (motif) {
      setRunning(true);
      return;
    }
    const id = window.setTimeout(() => setRunning(false), 700);
    return () => window.clearTimeout(id);
  }, [motif]);

  if (!seen) return null;

  return (
    <div className="nq-work-motif" aria-hidden="true">
      <Canvas
        orthographic
        /* `demand` لا `never` عند السكون: الحقل يحتاج إطاراً واحداً عند تغيّر المقاس أو
           النمط، و`never` كان سيتركه على آخر ما رُسم. ولا شيء يُرسَم بينهما. */
        frameloop={reduced ? 'demand' : running ? 'always' : 'demand'}
        /* سقف 1.5 لا 2: هذا نسيج خلفيّ خافت خلف شعار، ومضاعفة البكسلات فيه تضاعف التعبئة
           مقابل فرق لا يُرى تحت طبقة التغبيش البيضاء فوقه. */
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 10], zoom: 1, near: 0.1, far: 100 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      >
        <ContextRecovery />
        <Field motif={motif} reduced={reduced} />
      </Canvas>
    </div>
  );
};

export default WorkMotif;
