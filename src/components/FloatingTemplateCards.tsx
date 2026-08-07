import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { templatesData } from '../data/templatesData';

interface FloatingTemplateCardsProps {
  language: 'ar' | 'en';
  onExploreTemplates: () => void;
}

const STACK = templatesData.slice(0, 4);

// Resting fan: each card sits further back (translateZ), nudged down/aside and rotated a
// touch more than the one in front of it — a hand-of-photos stack, not a flat grid. The
// active card jumps to the very front (positive translateZ, no rotation, larger scale);
// every other card gets pushed back further and blurred, so the one you're on is the only
// thing left in sharp focus.
function getCardTransform(index: number, active: number | null) {
  if (active === index) {
    return {
      transform: 'translate3d(0px, -14px, 120px) rotateZ(0deg) scale(1.12)',
      zIndex: 40,
      filter: 'none',
      opacity: 1,
    };
  }

  const isDimmed = active !== null;
  const restX = index * 20;
  const restY = index * 14;
  const restZ = index * -50;
  const restRotate = index * 6;

  return {
    transform: `translate3d(${restX}px, ${restY}px, ${isDimmed ? restZ - 40 : restZ}px) rotateZ(${restRotate}deg) scale(${1 - index * 0.06})`,
    zIndex: 30 - index,
    filter: isDimmed ? 'blur(7px)' : 'none',
    opacity: isDimmed ? 0.5 : 1,
  };
}

export const FloatingTemplateCards: React.FC<FloatingTemplateCardsProps> = ({
  language,
  onExploreTemplates,
}) => {
  const [active, setActive] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduceMotion = !!useReducedMotion();

  // The whole block drifts gently as it scrolls past — the "distinctive movement" beyond
  // the stack's own hover interaction — kept on an ancestor element so it never fights the
  // per-card transforms above.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start 95%', 'end 15%'] });
  const rawY = useTransform(scrollYProgress, [0, 1], [40, -20]);
  const y = reduceMotion ? 0 : rawY;

  return (
    <motion.div
      ref={sectionRef}
      style={{ y }}
      className="w-full max-w-4xl mx-auto mt-16 sm:mt-24 flex flex-col sm:flex-row items-center gap-10 sm:gap-14"
    >
      {/* Card stack — physically separate from the text, on the flow's start side (right
          in this site's default RTL) so the 3D effect reads as its own object. */}
      <div
        className="card-stack-stage shrink-0 w-48 h-60 sm:w-56 sm:h-72"
        onMouseLeave={() => setActive(null)}
        onTouchEnd={() => setActive(null)}
      >
        {STACK.map((tpl, i) => {
          const { transform, zIndex, filter, opacity } = getCardTransform(i, active);
          return (
            <div
              key={tpl.id}
              className="card-stack-item rounded-2xl border border-zinc-700 bg-zinc-950 overflow-hidden shadow-2xl"
              style={{ transform, zIndex, filter, opacity }}
              onMouseEnter={() => setActive(i)}
              onTouchStart={() => setActive(i)}
            >
              <img
                src={tpl.previewImage}
                alt={tpl.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}
      </div>

      {/* Text + single CTA, entirely separate from the cards. */}
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
