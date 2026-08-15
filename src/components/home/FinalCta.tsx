import React from 'react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Language } from '../../lib/i18n';
import { Reveal } from './Reveal';

/**
 * The closing call-to-action: one enormous claim, two roads in. The pill glows softly against
 * the black ground — the only strong light on the whole page, so it is where the eye stops.
 */
interface FinalCtaProps {
  language?: Language;
  onStart?: () => void;
  onRequestProject?: () => void;
}

export const FinalCta: React.FC<FinalCtaProps> = ({ language = 'ar', onStart, onRequestProject }) => {
  const isAr = language === 'ar';
  const Arrow = isAr ? ArrowUpLeft : ArrowUpRight;

  return (
    <section className="relative py-24 sm:py-36" aria-labelledby="final-cta-title">
      {/* A soft radial bloom behind the headline, painted once — not a blurred layer. */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(46% 46% at 50% 42%, rgba(255,255,255,0.09) 0%, transparent 72%)',
        }}
        aria-hidden="true"
      />

      <Reveal>
        <div className="nq-container relative text-center">
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
              className="nq-btn inline-flex items-center gap-3 ps-7 pe-2 py-2 rounded-full bg-white text-black text-xs font-bold tracking-[0.16em] uppercase hover:bg-white/90 transition-colors cursor-pointer w-full sm:w-auto justify-center"
            >
              <span>{isAr ? 'اطلب مشروعك' : 'Request a project'}</span>
              <span
                className="w-9 h-9 rounded-full grid place-items-center"
                style={{ background: '#111111', color: '#FFFFFF' }}
                aria-hidden="true"
              >
                <Arrow className="w-4 h-4" strokeWidth={2.6} />
              </span>
            </button>
            <button
              type="button"
              onClick={onStart}
              className="nq-btn inline-flex items-center justify-center px-7 py-2.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-xs font-bold tracking-[0.16em] uppercase text-white hover:bg-white/10 hover:border-white/40 transition-colors cursor-pointer w-full sm:w-auto"
            >
              {isAr ? 'تصفح القوالب' : 'Browse templates'}
            </button>
          </div>
        </div>
      </Reveal>
    </section>
  );
};
