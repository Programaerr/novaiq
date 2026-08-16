import React from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Language } from '../../lib/i18n';

// Deferred so the animation feature set lands in its own chunk — see motionFeatures.ts.
const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

const GROUND = 'var(--nq-ground, #000000)';
const ACCENT = 'var(--nq-accent, #E4E4E7)';

interface HomeHeroProps {
  language?: Language;
  onStart?: () => void;
  onRequestProject?: () => void;
}

/**
 * The opening section. Motion does the talking where the deleted video used to: the eyebrow,
 * headline, copy and CTA enter one after the other, and a slow drifting light orbits the
 * composition behind them. Everything is off unless `prefers-reduced-motion` is honoured.
 */
export const HomeHero: React.FC<HomeHeroProps> = ({ language = 'ar', onStart, onRequestProject }) => {
  const isAr = language === 'ar';
  const reduce = useReducedMotion();
  const Arrow = isAr ? ArrowUpLeft : ArrowUpRight;

  const fade = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  const cards = [
    {
      n: '01',
      t: isAr ? 'تصميم إبداعي' : 'Creative design',
      d: isAr ? 'واجهات تُبنى لتُقنع، مو بس تُعجب.' : 'Interfaces built to convince, not only to please.',
    },
    {
      n: '02',
      t: isAr ? 'هوية واستراتيجية' : 'Brand strategy',
      d: isAr ? 'هوية تخليك تنعرف من أول نظرة.' : 'A brand recognised at first glance.',
    },
    {
      n: '03',
      t: isAr ? 'حلول رقمية' : 'Digital solutions',
      d: isAr ? 'أنظمة تشتغل بهدوء وتكبر معك.' : 'Systems that run quietly and grow with you.',
    },
  ];

  return (
    <LazyMotion features={loadDomAnimation} strict>
      <section
        id="home-hero"
        style={{ minHeight: '100svh' }}
        className="relative flex flex-col overflow-hidden"
      >
        <div className="absolute inset-0" style={{ background: GROUND }} aria-hidden="true" />

        {/* A slow, soft radial bloom that drifts — the video's quiet successor. */}
        <m.div
          className="absolute inset-0"
          aria-hidden="true"
          animate={reduce ? undefined : { x: [0, 30, -20, 0], y: [0, -25, 20, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background:
              'radial-gradient(60% 55% at 50% 44%, rgba(255,255,255,0.07) 0%, transparent 68%)',
          }}
        />

        <div className="relative z-10 flex-1 nq-container py-16 lg:py-24 flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">
            <div className="lg:col-span-6">
              <m.span {...fade(0.05)} className="block text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase" style={{ color: ACCENT }}>
                {isAr ? 'نحن نصمم' : 'We design'}
              </m.span>

              <m.h1
                {...fade(0.15)}
                className="mt-5 text-[2.6rem] sm:text-6xl lg:text-[4.6rem] font-black uppercase leading-[0.96] tracking-tight text-white font-['Cairo'] text-balance"
              >
                {isAr ? 'تجارب رقمية' : 'Digital experiences'}
              </m.h1>

              <m.p
                {...fade(0.25)}
                className="mt-6 max-w-md text-sm text-white/70 leading-relaxed"
              >
                {isAr
                  ? 'نصنع في NOVAIQ تجارب رقمية غامرة تزيد التفاعل، تلهم الإبداع، وتوصل نتائج حقيقية لشركتك.'
                  : 'At NOVAIQ we craft immersive digital experiences that drive engagement, inspire creativity and deliver real results.'}
              </m.p>

              <m.div {...fade(0.35)} className="mt-9 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onStart}
                  className="nq-btn nq-btn--solid inline-flex items-center gap-3 px-7 py-2.5 rounded-full text-xs font-bold tracking-[0.16em] uppercase cursor-pointer"
                >
                  <span className="nq-btn-beam" aria-hidden="true" />
                  <span>{isAr ? 'شاهد أعمالنا' : 'Explore our work'}</span>
                  <Arrow className="w-4 h-4" strokeWidth={2.6} />
                </button>
                <button
                  type="button"
                  onClick={onRequestProject}
                  className="nq-btn inline-flex items-center justify-center px-7 py-2.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-xs font-bold tracking-[0.16em] uppercase text-white hover:bg-white/10 hover:border-white/40 transition-colors cursor-pointer"
                >
                  {isAr ? 'اطلب مشروعك' : 'Request a project'}
                </button>
              </m.div>
            </div>

            <div className="lg:col-span-6">
              <ul className="flex flex-col">
                {cards.map((c, i) => (
                  <m.li
                    key={c.n}
                    {...fade(0.45 + i * 0.12)}
                    className={`py-5 sm:py-6 ${i > 0 ? 'border-t border-white/12' : ''} flex gap-4 sm:gap-5`}
                  >
                    <span className="text-xs font-bold tracking-widest pt-1" style={{ color: ACCENT }}>
                      {c.n}
                    </span>
                    <div>
                      <h2 className="text-sm sm:text-base font-extrabold tracking-[0.1em] uppercase text-white">
                        {c.t}
                      </h2>
                      <p className="mt-1.5 text-xs sm:text-sm text-white/60 leading-relaxed">{c.d}</p>
                    </div>
                  </m.li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </LazyMotion>
  );
};
