import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { templatesData } from '../data/templatesData';

interface FloatingTemplateCardsProps {
  language: 'ar' | 'en';
  onExploreTemplates: () => void;
}

// Each card carries its own resting pose and drift timing. Nothing is uniform on purpose:
// matching angles and a shared bob phase would make three cards read as one rigid object,
// which is exactly what stops a row like this from looking like separate floating pieces.
const CARDS = templatesData.slice(0, 3).map((template, i) => ({
  template,
  pose: [
    { ry: -18, rx: 7, rz: -5 },
    { ry: -13, rx: 5, rz: 3 },
    { ry: -20, rx: 8, rz: -2 },
  ][i],
  // Vertical offset applied as margin (never transform) so it can't collide with the bob
  // keyframes or the tilt — the three suspended heights are what read as "falling".
  offsetY: [0, 26, 8][i],
  bobDelay: [0, -2.6, -4.9][i],
}));

export const FloatingTemplateCards: React.FC<FloatingTemplateCardsProps> = ({
  language,
  onExploreTemplates,
}) => {
  const [active, setActive] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduceMotion = !!useReducedMotion();

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start 95%', 'end 15%'] });
  const rawY = useTransform(scrollYProgress, [0, 1], [40, -20]);
  const y = reduceMotion ? 0 : rawY;

  return (
    <motion.div
      ref={sectionRef}
      style={{ y }}
      className="w-full max-w-4xl mx-auto mt-16 sm:mt-28 flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-14"
    >
      {/* Cards — image only, no text inside, each its own 3D object. */}
      <div className="shrink-0 flex items-center gap-4 sm:gap-5">
        {CARDS.map(({ template, pose, offsetY, bobDelay }, i) => {
          const isActive = active === i;
          const isDimmed = active !== null && !isActive;

          const face = isActive
            ? {
                transform: 'rotateY(0deg) rotateX(0deg) rotateZ(0deg) translateZ(70px) scale(1.06)',
                filter: 'none',
                opacity: 1,
              }
            : {
                transform: `rotateY(${pose.ry}deg) rotateX(${pose.rx}deg) rotateZ(${pose.rz}deg)`,
                filter: isDimmed ? 'blur(6px)' : 'none',
                opacity: isDimmed ? 0.45 : 1,
              };

          return (
            <div
              key={template.id}
              className="float3d-slot"
              style={{ marginTop: offsetY, zIndex: isActive ? 30 : 10 }}
            >
              <div
                className="float3d-bob"
                style={{ '--bob-delay': `${bobDelay}s` } as React.CSSProperties}
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={template.title}
                  onClick={() => setActive(isActive ? null : i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActive(isActive ? null : i);
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  className="float3d-face relative w-24 h-32 sm:w-32 sm:h-44 rounded-xl border border-zinc-700 bg-zinc-950 overflow-hidden shadow-[0_28px_40px_-18px_rgba(0,0,0,0.95)]"
                  style={face}
                >
                  <img
                    src={template.previewImage}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  <span className="float3d-sheen absolute inset-0 pointer-events-none" aria-hidden="true" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Text + single CTA, fully separate from the cards. */}
      <div className="text-center sm:text-start max-w-sm">
        <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
          {language === 'ar' ? 'قوالب جاهزة لكل قطاع' : 'Ready Templates, Every Industry'}
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-5">
          {language === 'ar'
            ? 'تصفح مجموعة قوالبنا الاحترافية المصممة خصيصاً لقطاعك، وابدأ مشروعك خلال أيام بدل أسابيع.'
            : 'Browse our professional templates built for your industry, and launch your project in days instead of weeks.'}
        </p>
        <button
          type="button"
          onClick={onExploreTemplates}
          className="nq-btn nq-btn--solid px-6 py-3 rounded-full font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="nq-btn-beam" aria-hidden="true" />
          <span>{language === 'ar' ? 'استكشاف القوالب' : 'Explore Templates'}</span>
          {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
};
