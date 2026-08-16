import React from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { Language } from '../../lib/i18n';

const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

interface HomeStatsProps {
  language?: Language;
}

/**
 * The proof strip, redesigned for the black-and-white system: four enormous outlined numbers
 * in a single band, split by hairlines instead of cards. No fills — just white type, space and
 * one vertical rule per cell.
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
      <section className="relative border-y border-white/15">
        <div className="nq-container">
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <m.div
                key={s.n}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className={`py-10 sm:py-14 px-4 sm:px-8 ${
                  i > 0 ? 'border-s border-white/15' : ''
                } max-lg:[&:nth-child(even)]:border-s-0 max-lg:odd:border-e max-lg:odd:border-white/15 max-lg:[&:nth-child(n+3)]:border-t max-lg:border-white/15`}
              >
                <dt className="sr-only">{s.l}</dt>
                <dd>
                  <span
                    className="block text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none tabular-nums text-transparent"
                    style={{ WebkitTextStroke: '1.5px #ffffff' }}
                  >
                    {s.n}
                  </span>
                  <span className="mt-4 block text-[0.65rem] sm:text-xs font-bold tracking-[0.22em] uppercase text-white">
                    {s.l}
                  </span>
                </dd>
              </m.div>
            ))}
          </dl>
        </div>
      </section>
    </LazyMotion>
  );
};