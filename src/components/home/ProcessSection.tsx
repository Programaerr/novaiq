import React from 'react';
import { LazyMotion, m, useReducedMotion } from 'motion/react';
import { FileSignature, Palette, Rocket, SearchCheck } from 'lucide-react';
import { Language } from '../../lib/i18n';
import { TouchRipple } from './mobile/TouchRipple';

const loadDomAnimation = () => import('../../lib/motionFeatures').then((mod) => mod.default);

interface ProcessSectionProps {
  language?: Language;
  onRequestProject?: () => void;
}

/**
 * The process — the blue pass. Four steps on a connecting hairline, each with a glowing number
 * disc and a small icon chip; the row reads as a pipeline with a soft blue seam between cells.
 */
export const ProcessSection: React.FC<ProcessSectionProps> = ({ language = 'ar', onRequestProject }) => {
  const isAr = language === 'ar';
  const reduce = useReducedMotion();

  const steps = [
    {
      n: '01',
      icon: SearchCheck,
      t: isAr ? 'استشارة ومواصفات' : 'Consult & spec',
      d: isAr
        ? 'نجلس معك لفهم هدفك، ثم نكتب مواصفات فنية دقيقة تُصادق عليها بتوقيع إلكتروني.'
        : 'We sit with you to understand the goal, then write a precise spec you approve with an e-signature.',
    },
    {
      n: '02',
      icon: Palette,
      t: isAr ? 'تصميم وتجربة' : 'Design & UX',
      d: isAr
        ? 'نصمم الواجهات والمحتوى بأحدث معايير التفاعل، وتشاهدون التقدم أسبوعياً قبل أي برمجة.'
        : 'Interfaces and content are designed to modern interaction standards, with weekly reviews before any code.',
    },
    {
      n: '03',
      icon: Rocket,
      t: isAr ? 'تطوير وإطلاق' : 'Build & launch',
      d: isAr
        ? 'برمجة، ربط الدفع، استضافة ونطاق — ثم اختبار شامل وإطلاق معك مباشرة.'
        : 'Development, payments, hosting and domain — then thorough testing and a launch done together.',
    },
    {
      n: '04',
      icon: FileSignature,
      t: isAr ? 'عقد ودعم' : 'Contract & support',
      d: isAr
        ? 'كل شيء موثّق بعقد رسمي مع تسليم كودك، ودعم مستمر بعد الإطلاق.'
        : 'Everything is documented in a formal contract, your code is handed over, and support continues post-launch.',
    },
  ];

  return (
    <LazyMotion features={loadDomAnimation} strict>
      <section className="relative py-16 sm:py-24" aria-labelledby="process-title">
        <div className="nq-container">
          <m.header
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <span className="text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase" style={{ color: '#7ab2ff' }}>
              {isAr ? 'كيف نعمل' : 'How we work'}
            </span>
            <h2
              id="process-title"
              className="mt-4 text-3xl sm:text-4xl lg:text-[3.2rem] font-black uppercase leading-[1.02] tracking-tight text-white"
            >
              {isAr ? 'أربع خطوات إلى الإطلاق' : 'Four steps to launch'}
            </h2>
          </m.header>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {steps.map((s, i) => (
              <m.div
                key={s.n}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-32px' }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-2xl bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 overflow-hidden"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}
              >
                {/* Step connector — a soft blue seam between cells. */}
                {i < steps.length - 1 && (
                  <span
                    className="hidden lg:block absolute top-1/2 -end-4 w-4 h-px"
                    style={{ background: 'linear-gradient(90deg, rgba(122,178,255,0.5), transparent)' }}
                    aria-hidden="true"
                  />
                )}

                <div className="flex items-center justify-between">
                  <span
                    className="w-11 h-11 rounded-full grid place-items-center text-xs font-black tabular-nums text-white"
                    style={{
                      background: 'radial-gradient(circle at 30% 30%, rgba(56,109,255,0.55), rgba(5,6,15,0.9))',
                      boxShadow: 'inset 0 0 0 1px rgba(122,178,255,0.5), 0 0 22px -6px rgba(56,109,255,0.7)',
                    }}
                  >
                    {s.n}
                  </span>
                  <span
                    className="w-9 h-9 rounded-full grid place-items-center"
                    style={{ background: 'rgba(56,109,255,0.16)', boxShadow: 'inset 0 0 0 1px rgba(122,178,255,0.35)' }}
                  >
                    <s.icon className="w-4 h-4" strokeWidth={1.6} style={{ color: '#9cc3ff' }} />
                  </span>
                </div>
                <h3 className="mt-7 text-sm sm:text-base font-extrabold tracking-[0.08em] uppercase text-white">
                  {s.t}
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-white/60 leading-relaxed">{s.d}</p>
              </m.div>
            ))}
          </div>

          {onRequestProject && (
            <m.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12 text-center"
            >
              <TouchRipple className="inline-flex rounded-full">
                <button
                  type="button"
                  onClick={onRequestProject}
                  className="inline-flex items-center gap-3 px-9 py-3 rounded-full text-black text-xs font-bold tracking-[0.16em] uppercase cursor-pointer"
                  style={{ background: 'linear-gradient(120deg, #ffffff, #9cc3ff)' }}
                >
                  {isAr ? 'ابدأ مشروعك الآن' : 'Start your project'}
                </button>
              </TouchRipple>
            </m.div>
          )}
        </div>
      </section>
    </LazyMotion>
  );
};