import React from 'react';
import { ArrowUpLeft, ArrowUpRight } from 'lucide-react';
import { Language } from '../../lib/i18n';
import { templatesData } from '../../data/templatesData';
import { Template } from '../../types';
import { Reveal } from './Reveal';

/**
 * The portfolio grid — a preview of the ready template catalogue.
 *
 * Covers are real screenshots of each template's own demo (captured phone viewport, see
 * templatesData.ts), so the grid is a literal "this is what you get" rather than stock art.
 * Six shown, the rest reachable through the templates page. The layout is a masonry-style
 * staggered column grid on desktop — the Motion-Driven pattern's hero + grid + contact shape.
 */
interface ShowcaseSectionProps {
  language?: Language;
  onViewAll?: () => void;
  onSelectTemplate?: (template: Template) => void;
}

export const ShowcaseSection: React.FC<ShowcaseSectionProps> = ({
  language = 'ar',
  onViewAll,
  onSelectTemplate,
}) => {
  const isAr = language === 'ar';
  const Arrow = isAr ? ArrowUpLeft : ArrowUpRight;

  // The six most representative of the eleven — one per major category.
  const picks = ['NVQ-CORP-01', 'NVQ-ECOM-02', 'NVQ-REAL-04', 'NVQ-FINTECH-06', 'NVQ-FOOD-07', 'NVQ-WATCH-10'];
  const items = picks
    .map((id) => templatesData.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <section className="relative py-16 sm:py-24" aria-labelledby="showcase-title">
      <div className="nq-container">
        <Reveal>
          <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
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
                style={{ background: 'var(--nq-accent, #E4E4E7)', color: '#000000' }}
                aria-hidden="true"
              >
                <Arrow className="w-4 h-4" strokeWidth={2.6} />
              </span>
            </button>
          </header>
        </Reveal>

        <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {items.map((t, i) => (
            <Reveal key={t.id} delay={(i % 3) * 90}>
              <button
                type="button"
                onClick={() => onSelectTemplate?.(t)}
                className="group text-start cursor-pointer w-full"
                aria-label={t.title}
              >
                <div
                  className="nq-card nq-card--hover overflow-hidden"
                  style={{
                    aspectRatio: '9 / 12',
                    padding: '0.75rem',
                  }}
                >
                  <div
                    className="h-full rounded-2xl overflow-hidden relative"
                    style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
                  >
                    <img
                      src={t.previewImage}
                      alt={t.title}
                      loading={i > 1 ? 'lazy' : 'eager'}
                      decoding="async"
                      className="w-full h-full object-cover object-top"
                    />
                    <div
                      className="absolute inset-x-0 bottom-0 h-24"
                      style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))' }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="relative z-10 -mt-9 px-2 pb-2">
                    <span
                      className="inline-block px-2.5 py-1 rounded-full text-[0.6rem] font-bold tracking-widest uppercase"
                      style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--nq-accent, #E4E4E7)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)' }}
                    >
                      {t.categoryLabel}
                    </span>
                  </div>
                </div>
                <div className="mt-3 px-1">
                  <h3 className="text-sm font-extrabold tracking-[0.06em] text-white group-hover:text-white/90 transition-colors">
                    {t.title}
                  </h3>
                  <p className="mt-1 text-xs text-white/50 leading-relaxed">{t.subtitle}</p>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
