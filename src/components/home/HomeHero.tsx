import React, { useEffect, useRef } from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Language } from '../../lib/i18n';
import { useIsMobile } from '../../lib/useIsMobile';
import { StarField } from './mobile/StarField';
import { TouchParallax } from './mobile/TouchParallax';
import { TouchRipple } from './mobile/TouchRipple';

// Deferred so the animation feature set lands in its own chunk — see motionFeatures.ts.
const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

interface HomeHeroProps {
  language?: Language;
  onStart?: () => void;
  onRequestProject?: () => void;
}

/**
 * The opening section — two distinct designs.
 *
 * Desktop: one centred stack over the drained space film, hairline grid, hollow numerals.
 *
 * Phone: a completely different composition. The film is tighter and brighter, a live star
 * field drifts over it, three floating orbs orbit the headline, and the whole surface answers
 * the finger — the content shifts with the gesture (`TouchParallax`) and every button answers
 * a touch with a ripple (`TouchRipple`). Strictly #000000 / #ffffff either way.
 */
export const HomeHero: React.FC<HomeHeroProps> = ({ language = 'ar', onStart, onRequestProject }) => {
  const isAr = language === 'ar';
  const reduce = useReducedMotion();
  const { isMobile } = useIsMobile();
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

  const mobileVideoStyle = {
    filter: 'grayscale(1) contrast(1.3) brightness(0.62)',
    transform: 'scale(1.15)',
    transformOrigin: 'center 30%',
  };

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
        <div className="absolute inset-0" style={{ background: '#000000' }} aria-hidden="true" />

        {/* The film — tighter and closer on a phone so it fills the small screen. */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover object-top"
          style={isMobile ? mobileVideoStyle : { filter: 'grayscale(1) contrast(1.15) brightness(0.55)' }}
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

        {/* Vignette — deeper on phones so type survives the brighter film. */}
        <div
          className="absolute inset-0"
          style={{
            background: isMobile
              ? 'radial-gradient(ellipse 120% 90% at 50% 40%, transparent 8%, rgba(0,0,0,0.5) 52%, rgba(0,0,0,0.92) 82%, #000000 100%)'
              : 'radial-gradient(ellipse 70% 70% at 50% 45%, transparent 20%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.9) 82%, #000000 100%)',
          }}
          aria-hidden="true"
        />

        {/* Phones get the drifting star field over the film. */}
        {isMobile && <StarField count={80} />}

        {/* ── CONTENT ──
            Phone: a parallax surface. The whole composition shifts with the finger; the
            buttons individually ripple on touch. */}
        <TouchParallax strength={20} className="relative z-10 flex-1">
          <div className="relative w-full h-full nq-container py-20 lg:py-24 flex flex-col justify-center items-center text-center">
            {/* Floating orbs around the headline (phones only). */}
            {isMobile && !reduce && (
              <>
                <span
                  className="absolute top-[24%] start-[8%] w-20 h-20 rounded-full bg-white/15 blur-2xl"
                  style={{ animation: 'nq-orb-float 7s ease-in-out infinite' }}
                  aria-hidden="true"
                />
                <span
                  className="absolute top-[38%] end-[6%] w-14 h-14 rounded-full bg-white/10 blur-xl"
                  style={{ animation: 'nq-orb-float 9s ease-in-out 1.2s infinite' }}
                  aria-hidden="true"
                />
                <span
                  className="absolute bottom-[22%] start-[16%] w-10 h-10 rounded-full bg-white/10 blur-lg"
                  style={{ animation: 'nq-orb-float 8s ease-in-out 2.1s infinite' }}
                  aria-hidden="true"
                />
              </>
            )}

            <m.span
              {...fade(0.05)}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/25 text-[0.65rem] sm:text-[0.7rem] font-bold tracking-[0.3em] uppercase text-white"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden="true" />
              {isAr ? 'استوديو عراقي' : 'An Iraqi studio'}
            </m.span>

            <m.h1
              {...fade(0.15)}
              className="mt-7 text-[2.8rem] sm:text-7xl lg:text-[6rem] font-black uppercase leading-[0.92] tracking-tight text-white font-['Cairo'] text-balance"
            >
              {isAr ? (
                <>
                  تجارب رقمية
                  <span className="block text-transparent" style={{ WebkitTextStroke: '1.5px #ffffff' }}>
                    في الفضاء
                  </span>
                </>
              ) : (
                <>
                  Digital
                  <span className="block text-transparent" style={{ WebkitTextStroke: '1.5px #ffffff' }}>
                    experiences
                  </span>
                </>
              )}
            </m.h1>

            <m.p {...fade(0.25)} className="mt-7 max-w-xl text-sm sm:text-base text-white/80 leading-relaxed">
              {isAr
                ? 'نصمم ونطوّر في NOVAIQ أنظمة وتطبيقات ذكية من الفكرة والمواصفات حتى الإطلاق — بعقود إلكترونية، وتصميم يجعل علامتك لا تُنسى.'
                : 'At NOVAIQ we design and build smart systems and applications — from idea and spec to launch, with e-contracts and a brand that is never forgotten.'}
            </m.p>

            <m.div {...fade(0.35)} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
              <TouchRipple className="w-full sm:w-auto rounded-full">
                <button
                  type="button"
                  onClick={onStart}
                  className="inline-flex items-center justify-center gap-3 px-8 py-3 rounded-full bg-white text-black text-xs font-bold tracking-[0.16em] uppercase hover:bg-black hover:text-white hover:ring-1 hover:ring-white transition-colors cursor-pointer w-full sm:w-auto"
                >
                  <span>{isAr ? 'شاهد أعمالنا' : 'Explore our work'}</span>
                  <Arrow className="w-4 h-4" strokeWidth={2.6} />
                </button>
              </TouchRipple>
              <TouchRipple className="w-full sm:w-auto rounded-full">
                <button
                  type="button"
                  onClick={onRequestProject}
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white text-white text-xs font-bold tracking-[0.16em] uppercase hover:bg-white hover:text-black transition-colors cursor-pointer w-full sm:w-auto"
                >
                  {isAr ? 'اطلب مشروعك' : 'Request a project'}
                </button>
              </TouchRipple>
            </m.div>

            {/* Bottom meta row — two counters and a scroll hint. */}
            <m.div
              {...fade(0.5)}
              className="mt-16 sm:mt-20 w-full max-w-3xl flex items-center justify-center gap-6 sm:gap-10 text-white"
            >
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-black text-white tabular-nums">{isAr ? '١١+' : '11+'}</p>
                <p className="mt-1 text-[0.6rem] sm:text-[0.65rem] font-bold tracking-[0.22em] uppercase text-white/60">
                  {isAr ? 'قالب جاهز' : 'Templates'}
                </p>
              </div>
              <span className="h-8 w-px bg-white/25" aria-hidden="true" />
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-black text-white tabular-nums">{isAr ? '١٢٠+' : '120+'}</p>
                <p className="mt-1 text-[0.6rem] sm:text-[0.65rem] font-bold tracking-[0.22em] uppercase text-white/60">
                  {isAr ? 'تسليم' : 'Deliveries'}
                </p>
              </div>
              <span className="hidden sm:block h-8 w-px bg-white/25" aria-hidden="true" />
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
                className="block mx-auto h-12 w-px bg-white/70"
                animate={reduce ? undefined : { scaleY: [0.4, 1], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: 'top' }}
              />
            </m.div>
          </div>
        </TouchParallax>
      </section>
    </LazyMotion>
  );
};