import React from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { Language } from '../../lib/i18n';

const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

interface HomeStatsProps {
  language?: Language;
}

/**
 * The proof strip: four numbers counted in with a staggered fade as they enter the viewport.
 * The numbers are the whole section, so the motion is slow and even — nothing competes.
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
      <section className="relative py-10 sm:py-14">
        <div className="nq-container">
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <m.div
                key={s.n}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className={`py-6 sm:py-8 px-4 sm:px-6 ${
                  i > 0 ? 'border-s border-white/10' : ''
                } max-lg:[&:nth-child(even)]:border-s-0 max-lg:odd:border-e max-lg:odd:border-white/10 max-lg:[&:nth-child(n+3)]:border-t max-lg:border-white/10`}
              >
                <dt className="sr-only">{s.l}</dt>
                <dd className="text-center">
                  <span className="block text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
                    {s.n}
                  </span>
                  <span className="mt-2 block text-[0.65rem] sm:text-xs font-bold tracking-[0.22em] uppercase text-white/50">
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
