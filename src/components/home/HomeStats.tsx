import React from 'react';
import { Language } from '../../lib/i18n';
import { Reveal } from './Reveal';

/**
 * The proof strip under the hero: four numbers, counted, with no decoration except a hairline
 * row of dividers. The numbers are the section — anything else (icons, gradients, coloured
 * digits) would just be competing with the section above it for the eye.
 */
interface HomeStatsProps {
  language?: Language;
}

export const HomeStats: React.FC<HomeStatsProps> = ({ language = 'ar' }) => {
  const isAr = language === 'ar';

  const stats = [
    { n: '11+', l: isAr ? 'قالب جاهز' : 'Ready templates' },
    { n: '120+', l: isAr ? 'تسليم ناجح' : 'Deliveries' },
    { n: '48h', l: isAr ? 'استجابة أولية' : 'First response' },
    { n: '100%', l: isAr ? 'ضمان التوقيت' : 'On-time guarantee' },
  ];

  return (
    <section className="relative py-10 sm:py-14">
      <Reveal y={16}>
        <div className="nq-container">
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.n}
                className={`py-6 sm:py-8 px-4 sm:px-6 ${i > 0 ? 'border-s border-white/10 max-lg:[&:nth-child(even)]:border-s-0 max-lg:odd:border-e max-lg:odd:border-white/10' : ''} max-lg:[&:nth-child(n+3)]:border-t max-lg:border-white/10`}
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
              </div>
            ))}
          </dl>
        </div>
      </Reveal>
    </section>
  );
};
