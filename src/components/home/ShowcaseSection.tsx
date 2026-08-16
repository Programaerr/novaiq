import React from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Language } from '../../lib/i18n';
import { templatesData } from '../../data/templatesData';
import { Template } from '../../types';
import { TouchRipple } from './mobile/TouchRipple';

const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

interface ShowcaseSectionProps {
  language?: Language;
  onViewAll?: () => void;
  onSelectTemplate?: (template: Template) => void;
}

/**
 * The portfolio grid — the blue pass. Each template sits in a glass frame with a soft blue glow
 * rising from its base; the number badge floats on the cover. Touch-reactive cards.
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
            className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          >
            <div className="max-w-2xl">
              <span className="text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase" style={{ color: '#7ab2ff' }}>
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
              className="nq-btn inline-flex items-center gap-3 ps-6 pe-2 py-2 rounded-full text-xs font-bold tracking-[0.16em] uppercase text-white cursor-pointer shrink-0 bg-white/[0.06] backdrop-blur-md"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22)' }}
            >
              <span>{isAr ? 'كل القوالب' : 'All templates'}</span>
              <span
                className="w-8 h-8 rounded-full grid place-items-center text-black"
                style={{ background: 'linear-gradient(120deg, #ffffff, #9cc3ff)' }}
                aria-hidden="true"
              >
                <Arrow className="w-4 h-4" strokeWidth={2.6} />
              </span>
            </button>
          </m.header>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {items.map((t, i) => (
              <TouchRipple key={t.id} className="rounded-2xl">
                <m.button
                  type="button"
                  onClick={() => onSelectTemplate?.(t)}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-32px' }}
                  transition={{ duration: 0.6, delay: (i % 3) * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={reduce ? undefined : { y: -6 }}
                  className="group text-start cursor-pointer w-full"
                  aria-label={t.title}
                >
                  <div
                    className="relative overflow-hidden rounded-2xl bg-white/[0.04] backdrop-blur-xl"
                    style={{ aspectRatio: '9 / 12', padding: '0.75rem', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}
                  >
                    {/* Rising blue glow under the cover. */}
                    <div className="absolute inset-x-6 bottom-6 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(56,109,255,0.4) 0%, transparent 70%)', filter: 'blur(12px)' }} aria-hidden="true" />

                    <div
                      className="relative h-full rounded-xl overflow-hidden"
                      style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
                    >
                      <img
                        src={t.previewImage}
                        alt={t.title}
                        loading={i > 1 ? 'lazy' : 'eager'}
                        decoding="async"
                        className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-500"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: 'linear-gradient(180deg, transparent, rgba(5,6,15,0.9))' }} aria-hidden="true" />
                      <span
                        className="absolute top-3 start-3 grid place-items-center w-8 h-8 rounded-lg text-xs font-black tabular-nums backdrop-blur-md text-white"
                        style={{ background: 'rgba(5,6,15,0.55)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)' }}
                        aria-hidden="true"
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span
                        className="absolute bottom-3 start-3 px-2.5 py-1 rounded-full text-[0.6rem] font-bold tracking-widest uppercase text-white backdrop-blur-md"
                        style={{ background: 'rgba(5,6,15,0.6)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)' }}
                      >
                        {t.categoryLabel}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 px-1 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold tracking-[0.06em] text-white">{t.title}</h3>
                      <p className="mt-1 text-xs text-white/50 leading-relaxed">{t.subtitle}</p>
                    </div>
                    <span className="w-8 h-8 shrink-0 rounded-full grid place-items-center bg-white/[0.06] backdrop-blur-md transition-colors" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)' }} aria-hidden="true">
                      <Arrow className="w-4 h-4 text-white" strokeWidth={2.4} />
                    </span>
                  </div>
                </m.button>
              </TouchRipple>
            ))}
          </div>
        </div>
      </section>
    </LazyMotion>
  );
};