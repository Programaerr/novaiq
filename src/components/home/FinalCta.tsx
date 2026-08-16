import React, { useEffect, useRef } from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { ArrowUpLeft, ArrowUpRight, Sparkles } from 'lucide-react';
import { Language } from '../../lib/i18n';
import { TouchRipple } from './mobile/TouchRipple';

const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

interface FinalCtaProps {
  language?: Language;
  onStart?: () => void;
  onRequestProject?: () => void;
}

/**
 * The closing call-to-action — the blue pass. The same nebula film returns behind an enormous
 * gradient headline, with a blue halo and a glass panel carrying the two roads in. Symmetry with
 * the hero closes the page.
 */
export const FinalCta: React.FC<FinalCtaProps> = ({ language = 'ar', onStart, onRequestProject }) => {
  const isAr = language === 'ar';
  const reduce = useReducedMotion();
  const Arrow = isAr ? ArrowUpLeft : ArrowUpRight;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const v = videoRef.current;
      if (!v) return;
      if (mq.matches) v.pause();
      else void v.play().catch(() => {});
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <LazyMotion features={loadDomAnimation} strict>
      <section className="relative py-24 sm:py-36 overflow-hidden" aria-labelledby="final-cta-title">
        {/* The nebula film returns to close the page. */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: 'saturate(1.25) contrast(1.05) brightness(0.6)' }}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='%2305060f'/%3E%3C/svg%3E"
          aria-hidden="true"
        >
          <source
            src="https://assets.mixkit.co/videos/26794/26794-720.mp4"
            type="video/mp4"
          />
        </video>

        {/* Blue wash. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 50% 45%, rgba(56,109,255,0.2) 0%, transparent 60%), linear-gradient(180deg, #05060f 0%, rgba(5,6,15,0.6) 45%, #05060f 100%)',
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
          <span className="inline-flex items-center gap-2 text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase" style={{ color: '#7ab2ff' }}>
            <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
            {isAr ? 'جاهز تبدأ؟' : 'Ready to start?'}
          </span>
          <h2
            id="final-cta-title"
            className="mx-auto mt-6 max-w-4xl text-4xl sm:text-6xl lg:text-7xl font-black uppercase leading-[0.98] tracking-tight text-balance"
            style={{
              background: 'linear-gradient(120deg, #ffffff 0%, #9cc3ff 45%, #6f8fff 68%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {isAr ? 'نبني أفكارك القادمة' : 'Let’s build what’s next'}
          </h2>

          {/* Halo under the headline. */}
          {!reduce && (
            <div
              className="pointer-events-none mx-auto -z-10 -mt-16 w-[70vw] h-32 rounded-full"
              style={{
                background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(90,140,255,0.35) 0%, transparent 70%)',
                filter: 'blur(22px)',
                animation: 'nq-orb-float 9s ease-in-out infinite',
              }}
              aria-hidden="true"
            />
          )}

          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-white/75 leading-relaxed">
            {isAr
              ? 'ابدأ من قالب جاهز أو صف مشروعك من الصفر — النموذج، المواصفات، العقد والتوقيع كلها إلكترونية، وتسليمك في موعده.'
              : 'Start from a ready template or describe a project from scratch — forms, specs, contract and signature are all digital, and delivery is on time.'}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <TouchRipple className="w-full sm:w-auto rounded-full">
              <button
                type="button"
                onClick={onRequestProject}
                className="inline-flex items-center gap-3 px-8 py-3 rounded-full text-black text-xs font-bold tracking-[0.16em] uppercase cursor-pointer w-full sm:w-auto justify-center"
                style={{ background: 'linear-gradient(120deg, #ffffff, #9cc3ff)' }}
              >
                <span>{isAr ? 'اطلب مشروعك' : 'Request a project'}</span>
                <Arrow className="w-4 h-4" strokeWidth={2.6} />
              </button>
            </TouchRipple>
            <TouchRipple className="w-full sm:w-auto rounded-full">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center justify-center px-8 py-3 rounded-full text-white text-xs font-bold tracking-[0.16em] uppercase cursor-pointer w-full sm:w-auto bg-white/[0.06] backdrop-blur-md"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.28)' }}
              >
                {isAr ? 'تصفح القوالب' : 'Browse templates'}
              </button>
            </TouchRipple>
          </div>
        </m.div>
      </section>
    </LazyMotion>
  );
};