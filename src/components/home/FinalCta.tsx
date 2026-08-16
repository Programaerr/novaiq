import React from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Language } from '../../lib/i18n';

const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

interface FinalCtaProps {
  language?: Language;
  onStart?: () => void;
  onRequestProject?: () => void;
}

/**
 * The closing call-to-action: one enormous claim, two roads in. The headline scales in gently
 * and the buttons settle after it — the only strong light on the page sits here, so the motion
 * slows down to let the eye rest.
 */
export const FinalCta: React.FC<FinalCtaProps> = ({ language = 'ar', onStart, onRequestProject }) => {
  const isAr = language === 'ar';
  const reduce = useReducedMotion();
  const Arrow = isAr ? ArrowUpLeft : ArrowUpRight;

  return (
    <LazyMotion features={loadDomAnimation} strict>
      <section className="relative py-24 sm:py-36 overflow-hidden" aria-labelledby="final-cta-title">
        {/* A soft radial bloom, painted once — not a blurred layer. */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(46% 46% at 50% 42%, rgba(255,255,255,0.09) 0%, transparent 72%)',
          }}
          aria-hidden="true"
        />

        <m.div
          className="nq-container relative text-center"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase text-white/50">
            {isAr ? 'جاهز تبدأ؟' : 'Ready to start?'}
          </span>
          <h2
            id="final-cta-title"
            className="mx-auto mt-5 max-w-4xl text-4xl sm:text-6xl lg:text-7xl font-black uppercase leading-[0.98] tracking-tight text-white text-balance"
          >
            {isAr ? 'نبني أفكارك القادمة' : 'Let’s build what’s next'}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm sm:text-base text-white/60 leading-relaxed">
            {isAr
              ? 'ابدأ من قالب جاهز أو صف مشروعك من الصفر — النموذج، المواصفات، العقد والتوقيع كلها إلكترونية، وتسليمك في موعده.'
              : 'Start from a ready template or describe a project from scratch — forms, specs, contract and signature are all digital, and delivery is on time.'}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onRequestProject}
              className="nq-btn nq-btn--solid inline-flex items-center gap-3 px-7 py-2.5 rounded-full text-xs font-bold tracking-[0.16em] uppercase cursor-pointer w-full sm:w-auto justify-center"
            >
              <span className="nq-btn-beam" aria-hidden="true" />
              <span>{isAr ? 'اطلب مشروعك' : 'Request a project'}</span>
              <Arrow className="w-4 h-4" strokeWidth={2.6} />
            </button>
            <button
              type="button"
              onClick={onStart}
              className="nq-btn inline-flex items-center justify-center px-7 py-2.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-xs font-bold tracking-[0.16em] uppercase text-white hover:bg-white/10 hover:border-white/40 transition-colors cursor-pointer w-full sm:w-auto"
            >
              {isAr ? 'تصفح القوالب' : 'Browse templates'}
            </button>
          </div>
        </m.div>
      </section>
    </LazyMotion>
  );
};
