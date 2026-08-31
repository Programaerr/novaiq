import React, { useRef, useState } from 'react';
import { OBSIDIAN } from '../lib/homePalette';

/**
 * خلفية فيديو متحركة للصندوق الأسود في الـ Hero (الذي يحمل اسم الشعار NOVAIQ).
 *
 * ## المصادر وترتيبها
 * قائمة روابط فيديو خارجية (motionbgs.com). الترتيب يُخلط عشوائياً مرة واحدة عند
 * كل تحميل/تحديث للصفحة (useState initializer يشتغل فقط عند أول تركيب للمكوّن)،
 * فيصبح الفيديو الظاهر متغيّراً بين كل refresh دون أي منطق إضافي على السيرفر.
 *
 * ## لماذا طبقتان (crossfade) لا فيديو واحد
 * فيديو واحد بخاصية loop يعرض نفس المشهد دائماً. هنا كل فيديو يُشغَّل مرة واحدة
 * (بدون loop)، وعند انتهائه (`onEnded`) ننتقل للفيديو التالي في القائمة عبر طبقة
 * ثانية كانت تُحمَّل بصمت في الخلفية — فالتبديل يظهر كتلاشٍ ناعم (fade) بدل قفزة
 * مفاجئة، ولا تختفي الخلفية أبداً ولو للحظة.
 *
 * ## معالجة الفشل
 * لو تعذّر تحميل رابط (`onError` — الخادم الخارجي بطيء أو الرابط تغيّر)، ننتقل
 * فوراً للفيديو التالي بنفس آلية التلاشي، مع عدّاد يمنع حلقة فشل لا نهائية لو
 * تعطّلت كل الروابط دفعة واحدة. وتحت كل شيء تدرج لوني ثابت بلون OBSIDIAN نفسه،
 * فحتى لو فشلت كل الفيديوهات يبقى الصندوق مظلماً متسقاً مع باقي الموقع، لا فارغاً.
 */

const VIDEO_SOURCES = [
  'https://motionbgs.com/media/5125/spaceship-bedroom.960x540.mp4',
  'https://motionbgs.com/media/3130/red-light-tunnel.960x540.mp4',
  'https://motionbgs.com/media/3250/extraordinary-black-hole.960x540.mp4',
  'https://motionbgs.com/media/4564/rotating-black-hole.960x540.mp4',
  'https://motionbgs.com/media/2289/astronaut-and-hands.960x540.mp4',
  'https://motionbgs.com/media/6127/astronaut-riding-in-space.960x540.mp4',
];

function shuffledPlaylist(): string[] {
  const list = [...VIDEO_SOURCES];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export const HeroVideoBackground: React.FC = () => {
  // يُنشأ مرة واحدة فقط عند أول تركيب — أي عند كل تحميل/تحديث حقيقي للصفحة.
  const playlist = useRef(shuffledPlaylist()).current;
  const indexRef = useRef(0);
  const failuresRef = useRef(0);

  const [front, setFront] = useState<'a' | 'b'>('a');
  const [srcA, setSrcA] = useState(playlist[0]);
  const [srcB, setSrcB] = useState(playlist[1] ?? playlist[0]);

  const advance = () => {
    failuresRef.current = 0;
    indexRef.current = (indexRef.current + 1) % playlist.length;
    const next = playlist[indexRef.current];
    if (front === 'a') {
      setSrcB(next);
      setFront('b');
    } else {
      setSrcA(next);
      setFront('a');
    }
  };

  const handleError = () => {
    failuresRef.current += 1;
    // كل روابط القائمة فشلت — نتوقف بدل حلقة لا نهائية، ويبقى تدرج OBSIDIAN ظاهراً وحده.
    if (failuresRef.current <= playlist.length) advance();
  };

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* الطبقة الاحتياطية الثابتة — تبقى تحت الفيديو دائماً */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(160deg, ${OBSIDIAN}, #05070c)` }}
      />

      <video
        key={`a-${srcA}`}
        src={srcA}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={front === 'a' ? advance : undefined}
        onError={front === 'a' ? handleError : undefined}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1400ms] ease-in-out"
        style={{ opacity: front === 'a' ? 1 : 0 }}
      />
      <video
        key={`b-${srcB}`}
        src={srcB}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={front === 'b' ? advance : undefined}
        onError={front === 'b' ? handleError : undefined}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1400ms] ease-in-out"
        style={{ opacity: front === 'b' ? 1 : 0 }}
      />

      {/* تعتيم فوق الفيديو لضمان تباين كافٍ لأي عنصر فوقه حتى بدون الخلفية المغبشة الخاصة بالنص */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.32), rgba(0,0,0,0.12) 45%, rgba(0,0,0,0.5))' }}
      />
    </div>
  );
};
