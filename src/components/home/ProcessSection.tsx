import React from 'react';
import { FileSignature, Palette, Rocket, SearchCheck } from 'lucide-react';
import { Language } from '../../lib/i18n';
import { Reveal } from './Reveal';

/**
 * The process — four steps down the page, connected by a hairline that runs the full height.
 * Steps alternate number and arrow placement so the line reads as a single thread rather than
 * four unconnected panels.
 */
interface ProcessSectionProps {
  language?: Language;
  onRequestProject?: () => void;
}

export const ProcessSection: React.FC<ProcessSectionProps> = ({ language = 'ar', onRequestProject }) => {
  const isAr = language === 'ar';

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
    <section className="relative py-16 sm:py-24" aria-labelledby="process-title">
      <div className="nq-container">
        <Reveal>
          <header className="max-w-2xl">
            <span className="text-[0.7rem] sm:text-xs font-bold tracking-[0.3em] uppercase text-white/50">
              {isAr ? 'كيف نعمل' : 'How we work'}
            </span>
            <h2
              id="process-title"
              className="mt-4 text-3xl sm:text-4xl lg:text-[3.2rem] font-black uppercase leading-[1.02] tracking-tight text-white"
            >
              {isAr ? 'أربع خطوات إلى الإطلاق' : 'Four steps to launch'}
            </h2>
          </header>
        </Reveal>

        <ol className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <li className="nq-card nq-card--hover p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <span
                    className="w-11 h-11 rounded-xl grid place-items-center"
                    style={{ background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}
                  >
                    <s.icon className="w-5 h-5 text-white/90" strokeWidth={1.8} />
                  </span>
                  <span className="text-[0.65rem] font-black tracking-widest text-white/30 tabular-nums">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-6 text-base sm:text-lg font-extrabold tracking-[0.08em] uppercase text-white">
                  {s.t}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-white/60 leading-relaxed">{s.d}</p>
              </li>
            </Reveal>
          ))}
        </ol>

        {onRequestProject && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={onRequestProject}
              className="nq-btn inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-white text-black text-xs font-bold tracking-[0.16em] uppercase hover:bg-white/90 transition-colors cursor-pointer"
            >
              {isAr ? 'ابدأ مشروعك الآن' : 'Start your project'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
