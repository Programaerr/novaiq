import React from 'react';
import { Quote } from 'lucide-react';
import { Language } from '../../lib/i18n';
import { Reveal } from './Reveal';

/**
 * Client voices. Monochrome cards — the words carry the weight; the quote mark is a subtle
 * type-level detail rather than a decorative splash.
 */
interface TestimonialsSectionProps {
  language?: Language;
}

export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ language = 'ar' }) => {
  const isAr = language === 'ar';

  const items = [
    {
      q: isAr
        ? 'الفريق وثق كل خطوة بعقد إلكتروني — من المواصفات حتى التسليم. سلمنا المشروع في وقته بالضبط، وهذا نادر.'
        : 'The team documented every step with an electronic contract — from spec to handover. Delivered exactly on time, which is rare.',
      a: isAr ? 'مدير تقنية — شركة عراقية' : 'IT manager — Iraqi company',
    },
    {
      q: isAr
        ? 'التصميم غير نظرتي تماماً. صار عندنا حضور يليق بشركتنا، والقالب كان جاهزاً للتخصيص خلال أيام.'
        : 'The design completely changed how we look. We now have a presence that matches our company, and the template was ready to customise in days.',
      a: isAr ? 'صاحب مشروع تجاري' : 'Business owner',
    },
    {
      q: isAr
        ? 'أكثر ما أعجبني أنهم يشرحون بالعربي وبوضوح. حتى غير التقني يفهم أين أمواله بالضبط.'
        : 'What I liked most is that they explain everything in plain Arabic. Even a non-technical person knows exactly where their money goes.',
      a: isAr ? 'مستثمر — بغداد' : 'Investor — Baghdad',
    },
  ];

  return (
    <section className="relative py-16 sm:py-24" aria-labelledby="testimonials-title">
      <div className="nq-container">
        <Reveal>
          <header className="max-w-2xl">
            <span className="text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase text-white/50">
              {isAr ? 'قالوا عنّا' : 'What clients say'}
            </span>
            <h2
              id="testimonials-title"
              className="mt-4 text-3xl sm:text-4xl lg:text-[3.2rem] font-black uppercase leading-[1.02] tracking-tight text-white"
            >
              {isAr ? 'الكلمة لأصحابها' : 'In their own words'}
            </h2>
          </header>
        </Reveal>

        <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {items.map((it, i) => (
            <Reveal key={it.a} delay={i * 90}>
              <figure className="nq-card nq-card--hover p-6 sm:p-8 flex flex-col">
                <Quote
                  className="w-7 h-7 text-white/25"
                  strokeWidth={1.5}
                  style={{ transform: 'scaleX(-1)' }}
                  aria-hidden="true"
                />
                <blockquote className="mt-5 flex-1 text-sm sm:text-[0.95rem] text-white/75 leading-relaxed">
                  {it.q}
                </blockquote>
                <figcaption className="mt-6 pt-4 border-t border-white/10 text-[0.7rem] font-bold tracking-[0.14em] uppercase text-white/45">
                  {it.a}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
