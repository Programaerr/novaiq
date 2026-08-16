import React from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Language } from '../../lib/i18n';
import { templatesData } from '../../data/templatesData';
import { Template } from '../../types';

const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

interface ShowcaseSectionProps {
  language?: Language;
  onViewAll?: () => void;
  onSelectTemplate?: (template: Template) => void;
}

/**
 * The portfolio grid, redesigned for the black-and-white system: numbered frames with square
 * corners and a hairline border. Each cover sits inside a ruled cell with a big index numeral
 * beside it — the frames read as film stills on a contact sheet.
 */
export const ShowcaseSection: React.FC<ShowcaseSectionProps> = ({
  language = 'ar',
  onViewAll,
  onSelectTemplate,
}) => {
  const isAr = language === 'ar';
  const reduce = useReducedMotion();
  const Arrow = isAr ? ArrowUpLeft : ArrowUpRight;

  const picks = ['NVQ-CORP-01', 'NVQ-ECOM-02', 'NVQ-REAL-04', 'NVQ-FINTECH-06', 'NVQ-FOOD-07', 'NVQ-WATCH-10'];
  const items = picks
    .map((id) => templatesData.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <LazyMotion features={loadDomAnimation} strict>
      <section className="relative py-16 sm:py-24" aria-labelledby="showcase-title">
        <div className="nq-container">
          <m.header
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between border-b border-white/15 pb-8"
          >
            <div className="max-w-2xl">
              <span className="text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase text-white/50">
                {isAr ? 'معرض الأعمال' : 'Selected work'}
              </span>
              <h2
                id="showcase-title"
                className="mt-4 text-3xl sm:text-4xl lg:text-[3.2rem] font-black uppercase leading-[1.02] tracking-tight text-white"
              >
                {isAr ? 'مشاريع جاهزة تُبنى عليها' : 'Ready projects to build on'}
              </h2>
              <p className="mt-4 text-sm sm:text-base text-white/60 leading-relaxed max-w-xl">
                {isAr
                  ? 'كل قالب هنا يعمل فعلياً — صُوِّرت شاشته الحقيقية وليس تصوراً. خصّصه بهويتك واستلمه خلال أيام.'
                  : 'Every template here is a working product — its real screen, not a mock. Customise it to your brand and ship in days.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onViewAll}
              className="nq-btn inline-flex items-center gap-3 ps-6 pe-2 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-xs font-bold tracking-[0.16em] uppercase text-white hover:bg-white/10 hover:border-white/40 transition-colors cursor-pointer shrink-0"
            >
              <span>{isAr ? 'كل القوالب' : 'All templates'}</span>
              <span
                className="w-8 h-8 rounded-full grid place-items-center"
                style={{ background: '#ffffff', color: '#000000' }}
                aria-hidden="true"
              >
                <Arrow className="w-4 h-4" strokeWidth={2.6} />
              </span>
            </button>
          </m.header>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/15">
            {items.map((t, i) => (
              <m.button
                key={t.id}
                type="button"
                onClick={() => onSelectTemplate?.(t)}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-32px' }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={reduce ? undefined : { y: -6 }}
                className="group text-start cursor-pointer w-full bg-black p-4 sm:p-5"
                aria-label={t.title}
              >
                <div
                  className="overflow-hidden relative"
                  style={{ aspectRatio: '9 / 12', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)' }}
                >
                  <img
                    src={t.previewImage}
                    alt={t.title}
                    loading={i > 1 ? 'lazy' : 'eager'}
                    decoding="async"
                    className="w-full h-full object-cover object-top grayscale-[0.35] group-hover:grayscale-0 group-hover:scale-[1.03] transition-all duration-500"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-28"
                    style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.9))' }}
                    aria-hidden="true"
                  />
                  <span className="absolute top-3 start-3 text-lg font-black tabular-nums text-transparent" style={{ WebkitTextStroke: '1px #ffffff' }} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="absolute bottom-3 start-3 px-2.5 py-1 text-[0.6rem] font-bold tracking-widest uppercase"
                    style={{ background: '#ffffff', color: '#000000' }}
                  >
                    {t.categoryLabel}
                  </span>
                </div>
                <div className="mt-4 px-1 flex items-end justify-between gap-3 border-t border-white/10 pt-3">
                  <div>
                    <h3 className="text-sm font-extrabold tracking-[0.06em] text-white">
                      {t.title}
                    </h3>
                    <p className="mt-1 text-xs text-white/50 leading-relaxed">{t.subtitle}</p>
                  </div>
                  <Arrow className="w-4 h-4 shrink-0 text-white/40 group-hover:text-white transition-colors" strokeWidth={2.4} />
                </div>
              </m.button>
            ))}
          </div>
        </div>
      </section>
    </LazyMotion>
  );
};