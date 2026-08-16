import React from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { Quote } from 'lucide-react';
import { Language } from '../../lib/i18n';

const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

interface TestimonialsSectionProps {
  language?: Language;
}

/**
 * Client voices — the blue pass. Three glass cards, each with a glowing blue quote mark and a
 * thin top seam; the words carry the weight, the glow keeps the section feeling elevated.
 */
export const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ language = 'ar' }) => {
  const isAr = language === 'ar';
  const reduce = useReducedMotion();

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
    <LazyMotion features={loadDomAnimation} strict>
      <section className="relative py-16 sm:py-24" aria-labelledby="testimonials-title">
        <div className="nq-container">
          <m.header
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <span className="text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase" style={{ color: '#7ab2ff' }}>
              {isAr ? 'قالوا عنّا' : 'What clients say'}
            </span>
            <h2
              id="testimonials-title"
              className="mt-4 text-3xl sm:text-4xl lg:text-[3.2rem] font-black uppercase leading-[1.02] tracking-tight text-white"
            >
              {isAr ? 'الكلمة لأصحابها' : 'In their own words'}
            </h2>
          </m.header>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {items.map((it, i) => (
              <m.figure
                key={it.a}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-32px' }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex flex-col rounded-2xl bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 overflow-hidden"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}
              >
                <div className="absolute -top-8 -start-8 w-28 h-28 rounded-full opacity-60" style={{ background: 'radial-gradient(circle, rgba(56,109,255,0.35) 0%, transparent 70%)', filter: 'blur(10px)' }} aria-hidden="true" />

                <Quote
                  className="relative w-8 h-8"
                  strokeWidth={1.4}
                  style={{ transform: 'scaleX(-1)', color: '#9cc3ff' }}
                  aria-hidden="true"
                />
                <blockquote className="relative mt-5 flex-1 text-sm sm:text-[0.95rem] text-white/80 leading-relaxed">
                  {it.q}
                </blockquote>
                <figcaption className="relative mt-6 pt-4 border-t border-white/12 text-[0.7rem] font-bold tracking-[0.14em] uppercase text-white/60">
                  {it.a}
                </figcaption>
              </m.figure>
            ))}
          </div>
        </div>
      </section>
    </LazyMotion>
  );
};