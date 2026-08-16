import React, { useEffect, useRef } from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Language } from '../../lib/i18n';
import { TouchRipple } from './mobile/TouchRipple';

// Deferred so the animation feature set lands in its own chunk — see motionFeatures.ts.
const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

interface HomeHeroProps {
  language?: Language;
  onStart?: () => void;
  onRequestProject?: () => void;
}

/**
 * The opening section — strictly #000000 and #ffffff, nothing else. A grayscale space film runs
 * behind everything, a white→grey gradient washes the headline, glass panels carry the meta row,
 * and soft white glows sit behind the composition. One design for every screen.
 */
export const HomeHero: React.FC<HomeHeroProps> = ({ language = 'ar', onStart, onRequestProject }) => {
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

  const fade = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 26 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <LazyMotion features={loadDomAnimation} strict>
      <section
        id="home-hero"
        style={{
          minHeight: '100svh',
          marginTop: 'calc(-1 * (var(--nav-bottom, 74px) + var(--content-gap, 0.75rem)))',
        }}
        className="relative flex flex-col overflow-hidden"
      >
        {/* Pure black ground. */}
        <div className="absolute inset-0" style={{ background: '#000000' }} aria-hidden="true" />

        {/* The space film — drained to grayscale so a coloured source reads as black-and-white. */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: 'grayscale(1) contrast(1.2) brightness(0.62)' }}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='%23000000'/%3E%3C/svg%3E"
          aria-hidden="true"
        >
          <source
            src="https://assets.mixkit.co/videos/26794/26794-720.mp4"
            type="video/mp4"
          />
        </video>

        {/* White wash — unifies the film with the black page. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 50% 42%, rgba(255,255,255,0.16) 0%, transparent 55%), linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 55%, #000000 100%)',
          }}
          aria-hidden="true"
        />

        {/* ── CONTENT ── */}
        <div className="relative z-10 flex-1 nq-container py-20 lg:py-24 flex flex-col justify-center items-center text-center">
                    <m.h1
            {...fade(0.15)}
            className="mt-7 text-3xl sm:text-5xl lg:text-[5rem] font-black uppercase leading-[1.02] tracking-tight font-['Cairo'] text-balance"
            style={{
              background: 'linear-gradient(120deg, #ffffff 0%, #ffffff 30%, #ffffff 65%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {isAr ? (
              <>
                تجارب رقمية
                <span className="block">في الفضاء</span>
              </>
            ) : (
              <>
                Digital experiences
                <span className="block">in space</span>
              </>
            )}
          </m.h1>

          {/* Glow beneath the headline — the soft white halo. */}
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[46%] -z-10 w-[60vw] h-40 rounded-full"
            style={{
              background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(255,255,255,0.28) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />

          <m.p {...fade(0.25)} className="mt-6 max-w-xl text-sm sm:text-base text-white/80 leading-relaxed">
            {isAr
              ? 'نصمم ونطوّر في NOVAIQ أنظمة وتطبيقات ذكية من الفكرة والمواصفات حتى الإطلاق — بعقود إلكترونية، وتصميم يجعل علامتك لا تُنسى.'
              : 'At NOVAIQ we design and build smart systems and applications — from idea and spec to launch, with e-contracts and a brand that is never forgotten.'}
          </m.p>

          <m.div {...fade(0.35)} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <TouchRipple className="w-full sm:w-auto rounded-full">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center justify-center gap-3 px-8 py-3 rounded-full bg-white text-black text-xs font-bold tracking-[0.16em] uppercase cursor-pointer w-full sm:w-auto"
              >
                <span>{isAr ? 'شاهد أعمالنا' : 'Explore our work'}</span>
                <Arrow className="w-4 h-4" strokeWidth={2.6} />
              </button>
            </TouchRipple>
            <TouchRipple className="w-full sm:w-auto rounded-full">
              <button
                type="button"
                onClick={onRequestProject}
                className="inline-flex items-center justify-center px-8 py-3 rounded-full text-white text-xs font-bold tracking-[0.16em] uppercase cursor-pointer w-full sm:w-auto bg-black/50"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.28)' }}
              >
                {isAr ? 'اطلب مشروعك' : 'Request a project'}
              </button>
            </TouchRipple>
          </m.div>

          {/* Bottom meta row — glass panel. */}
          <m.div
            {...fade(0.5)}
            className="mt-16 sm:mt-20 w-full max-w-2xl flex items-center justify-center gap-6 sm:gap-10 text-white rounded-2xl bg-white/[0.05] backdrop-blur-xl px-6 py-5"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 18px 50px -20px rgba(255,255,255,0.12)' }}
          >
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-black text-white tabular-nums">11+</p>
              <p className="mt-1 text-[0.6rem] sm:text-[0.65rem] font-bold tracking-[0.22em] uppercase text-white/60">
                {isAr ? 'قالب جاهز' : 'Templates'}
              </p>
            </div>
            <span className="h-8 w-px bg-white/20" aria-hidden="true" />
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-black text-white tabular-nums">120+</p>
              <p className="mt-1 text-[0.6rem] sm:text-[0.65rem] font-bold tracking-[0.22em] uppercase text-white/60">
                {isAr ? 'تسليم' : 'Deliveries'}
              </p>
            </div>
            <span className="hidden sm:block h-8 w-px bg-white/20" aria-hidden="true" />
            <div className="hidden sm:block text-center">
              <p className="text-xl sm:text-2xl font-black text-white tabular-nums">100%</p>
              <p className="mt-1 text-[0.6rem] sm:text-[0.65rem] font-bold tracking-[0.22em] uppercase text-white/60">
                {isAr ? 'ضمان التوقيت' : 'On-time'}
              </p>
            </div>
          </m.div>

          {/* Scroll hint */}
          <m.div {...fade(0.7)} className="mt-12" aria-hidden="true">
            <m.span
              className="block mx-auto h-12 w-px"
              style={{ background: 'linear-gradient(180deg, transparent, #ffffff)' }}
              animate={reduce ? undefined : { scaleY: [0.4, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </m.div>
        </div>
      </section>
    </LazyMotion>
  );
};
