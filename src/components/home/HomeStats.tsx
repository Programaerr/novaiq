import React from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { Language } from '../../lib/i18n';

const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

interface HomeStatsProps {
  language?: Language;
}

/**
 * The proof strip — the blue pass. Four large gradient-blue numbers sit in a glass band with a
 * faint top rule, each one fading up as the band enters. No hard cells: the dividers are soft
 * hairlines that let the glow carry the section.
 */
export const HomeStats: React.FC<HomeStatsProps> = ({ language = 'ar' }) => {
  const isAr = language === 'ar';
  const reduce = useReducedMotion();

  const stats = [
    { n: '11+', l: isAr ? 'قالب جاهز' : 'Ready templates' },
    { n: '120+', l: isAr ? 'تسليم ناجح' : 'Deliveries' },
    { n: '48h', l: isAr ? 'استجابة أولية' : 'First response' },
    { n: '100%', l: isAr ? 'ضمان التوقيت' : 'On-time guarantee' },
  ];

  return (
    <LazyMotion features={loadDomAnimation} strict>
      <section className="relative py-12 sm:py-16">
        <div className="nq-container">
          <m.dl
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl bg-white/[0.04] backdrop-blur-xl px-4 sm:px-6 py-8 sm:py-10"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1), 0 24px 60px -30px rgba(40,80,200,0.45)' }}
          >
            {stats.map((s, i) => (
              <m.div
                key={s.n}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className={`py-4 px-3 sm:px-6 ${i > 0 ? 'border-s border-white/10' : ''} max-lg:[&:nth-child(even)]:border-s-0 max-lg:odd:border-e max-lg:odd:border-white/10 max-lg:[&:nth-child(n+3)]:border-t max-lg:border-white/10`}
              >
                <dt className="sr-only">{s.l}</dt>
                <dd className="text-center">
                  <span
                    className="block text-4xl sm:text-5xl font-black tracking-tight tabular-nums"
                    style={{
                      background: 'linear-gradient(120deg, #ffffff, #9cc3ff 55%, #6f8fff)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    {s.n}
                  </span>
                  <span className="mt-2 block text-[0.65rem] sm:text-xs font-bold tracking-[0.22em] uppercase text-white/60">
                    {s.l}
                  </span>
                </dd>
              </m.div>
            ))}
          </m.dl>
        </div>
      </section>
    </LazyMotion>
  );
};