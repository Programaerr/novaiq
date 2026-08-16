import React, { useEffect, useRef } from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Language } from '../../lib/i18n';
import { useIsMobile } from '../../lib/useIsMobile';
import { StarField } from './mobile/StarField';
import { TouchRipple } from './mobile/TouchRipple';

const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

interface FinalCtaProps {
  language?: Language;
  onStart?: () => void;
  onRequestProject?: () => void;
}

/**
 * The closing call-to-action, redesigned to echo the hero: the same moving space film behind
 * an enormous claim, drained to greyscale so the page stays strictly black and white. A bright
 * ruled panel in front keeps the CTA legible over the motion.
 */
export const FinalCta: React.FC<FinalCtaProps> = ({ language = 'ar', onStart, onRequestProject }) => {
  const isAr = language === 'ar';
  const reduce = useReducedMotion();
  const Arrow = isAr ? ArrowUpLeft : ArrowUpRight;
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isMobile } = useIsMobile();

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
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: 'grayscale(1) contrast(1.15) brightness(0.5)' }}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='%23000000'/%3E%3C/svg%3E"
          aria-hidden="true"
        >
          <source
            src="https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/bg-red-ball.mp4"
            type="video/mp4"
          />
        </video>

        {/* A ruled panel over the film — the CTA zone. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 50% 45%, transparent 25%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.92) 85%, #000000 100%)',
          }}
          aria-hidden="true"
        />

        {isMobile && <StarField count={45} />}

        <m.div
          className="nq-container relative text-center"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center gap-2 text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden="true" />
            {isAr ? 'جاهز تبدأ؟' : 'Ready to start?'}
          </span>
          <h2
            id="final-cta-title"
            className="mx-auto mt-6 max-w-4xl text-4xl sm:text-6xl lg:text-7xl font-black uppercase leading-[0.98] tracking-tight text-white text-balance"
          >
            {isAr ? 'نبني أفكارك القادمة' : 'Let’s build what’s next'}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm sm:text-base text-white/75 leading-relaxed">
            {isAr
              ? 'ابدأ من قالب جاهز أو صف مشروعك من الصفر — النموذج، المواصفات، العقد والتوقيع كلها إلكترونية، وتسليمك في موعده.'
              : 'Start from a ready template or describe a project from scratch — forms, specs, contract and signature are all digital, and delivery is on time.'}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <TouchRipple className="w-full sm:w-auto rounded-full">
              <button
                type="button"
                onClick={onRequestProject}
                className="inline-flex items-center gap-3 px-8 py-3 rounded-full bg-white text-black text-xs font-bold tracking-[0.16em] uppercase hover:bg-black hover:text-white hover:ring-1 hover:ring-white transition-colors cursor-pointer w-full sm:w-auto justify-center"
              >
                <span>{isAr ? 'اطلب مشروعك' : 'Request a project'}</span>
                <Arrow className="w-4 h-4" strokeWidth={2.6} />
              </button>
            </TouchRipple>
            <TouchRipple className="w-full sm:w-auto rounded-full">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white text-white text-xs font-bold tracking-[0.16em] uppercase hover:bg-white hover:text-black transition-colors cursor-pointer w-full sm:w-auto"
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