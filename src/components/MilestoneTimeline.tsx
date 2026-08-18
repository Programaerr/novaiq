import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Code2,
  Cpu,
  ShieldCheck,
} from 'lucide-react';
import { Language } from '../lib/i18n';
import { useSeen } from '../lib/useSeen';
import { INK, PAPER, PERIWINKLE } from '../lib/homePalette';
import { BAND_FADE, PERIWINKLE_TONES, TileField } from './TileField';
import { ProjectCtaButton } from './ProjectCtaButton';

interface MilestoneTimelineProps {
  language?: Language;
  /** Opens the contract builder — lands on the section's own CTA inside it. */
  onCreateContract?: () => void;
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({ language = 'ar', onCreateContract }) => {
  const isAr = language === 'ar';
  const { ref: sectionRef, seen } = useSeen<HTMLElement>();

  const milestones = [
    {
      weeks: isAr ? 'الأسبوع 1 - 2' : 'Weeks 1 - 2',
      phaseTitle: isAr ? 'المرحلة الأولى: التحليل والاعتماد' : 'Phase 1: Analysis & Official Approval',
      icon: Calendar,
      status: isAr ? 'مرحلة الاعتماد' : 'Approval Phase',
      tasks: [
        isAr ? 'توقيع واعتماد العقد' : 'Sign & approve official electronic contract and export PDF',
        isAr ? 'تحديد الهوية البصرية' : 'Define visual identity, colors, and required system languages',
        isAr ? 'الخوادم والنطاق الخاص بالشركة' : 'Configure domain, cloud infrastructure, and server architecture',
      ]
    },
    {
      weeks: isAr ? 'الأسبوع 3 - 4' : 'Weeks 3 - 4',
      phaseTitle: isAr ? 'المرحلة الثانية: بناء التصميم' : 'Phase 2: Interactive Design & UI/UX',
      icon: Code2,
      status: isAr ? 'التطوير البصري' : 'Visual Development',
      tasks: [
        isAr ? 'تطوير واجهات المستخدم' : 'Develop responsive user interfaces with top UX/UI standards',
        isAr ? 'دمج تأثيرات الحركة والسلاسة' : 'Integrate motion effects and smooth interactivity',
        isAr ? 'ضمان الاستجابة التامة' : 'Ensure full responsiveness on desktop, tablet, and mobile',
      ]
    },
    {
      weeks: isAr ? 'الأسبوع 5 - 6' : 'Weeks 5 - 6',
      phaseTitle: isAr ? 'المرحلة الثالثة: الربط البرمجي' : 'Phase 3: Core Engineering & Backend Integration',
      icon: Cpu,
      status: isAr ? 'البرمجة والخوادم' : 'Engineering & Cloud',
      tasks: [
        isAr ? 'ربط بوابات الدفع الإلكتروني' : 'Integrate payment gateways (ZainCash, Card, Visa, Apple Pay)',
        isAr ? 'تجهيز نظام المحادثة والدعم' : 'Develop integrated customer support & communication modules',
        isAr ? 'ربط البيانات السحابية' : 'Connect & secure live cloud databases (Firebase / Cloud Store)',
      ]
    },
    {
      weeks: isAr ? 'الأسبوع 7 - 8' : 'Weeks 7 - 8',
      phaseTitle: isAr ? 'المرحلة الرابعة: الاختبار النهائي' : 'Phase 4: Final Testing & Live Launch',
      icon: ShieldCheck,
      status: isAr ? 'الإطلاق المكتمل' : 'Live Launch',
      tasks: [
        isAr ? 'اختبارات الأمان والسرعة' : 'Run load tests, security audits, and performance tuning',
        isAr ? 'تسليم الكود المصدري ولوحات التحكم بالكامل لممثل الشركة' : 'Deliver full source code and admin panels to company owner',
        isAr ? 'إمكانية تفعيل خطة صيانة مخصصة حسب الاتفاق' : 'Final delivery and optional maintenance plan per agreement',
      ]
    }
  ];

  return (
    <section
      ref={sectionRef}
      id="timeline-section"
      data-seen={seen ? 'true' : 'false'}
      style={{
        background: PERIWINKLE,
        /* Pull the whole section up behind the floating navbar, exactly as the hero does — so
           the cube band at the top runs under the navbar instead of starting below it as a
           black strip. The navbar is fixed and floats above the page; without this the band's
           cubes would look cut off at the top of the section. */
        marginTop: 'calc(-1 * (var(--nav-bottom, 74px) + var(--content-gap, 0.75rem)))',
      }}
      className="relative overflow-hidden pt-[calc(var(--nq-band)+3.5rem)] pb-20 sm:pb-28 lg:pb-32"
    >
      {/* ── The edge ────────────────────────────────────────────────────────────────────────────
          The same band the contact section carries: the ground's change of colour and the field
          of cubes crossing it. The gradient reaches full blue well before the strip ends, so the
          cubes have solid ground to settle onto rather than vanishing the moment the colour
          lands. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0"
        style={{
          height: 'var(--nq-band)',
          background: 'linear-gradient(to bottom, ' + PAPER + ' 6%, ' + PERIWINKLE + ' 74%)',
        }}
      >
        <TileField tones={PERIWINKLE_TONES} fade={BAND_FADE} />
      </div>

      <div className="relative nq-container">
        <div className="mx-auto max-w-[56rem]">
          <h2
            className="nq-rise text-[1.55rem] sm:text-[2.1rem] font-black leading-none tracking-tight"
            style={{ color: INK, ['--nq-rise-delay' as string]: '80ms' }}
          >
            {isAr ? 'جدول المراحل الزمنية لتنفيذ مشروعك' : 'Project Sprints & Delivery Timeline'}
          </h2>

          {/* ── The four phases, in one frosted panel ───────────────────────────────────────────
              Semi-transparent over the blue, with a heavy blur: the copy stays sharp while the
              background keeps showing through, instead of hiding it behind opaque cards. The
              panel IS the container — no per-phase cards inside it. */}
          <div
            className="nq-rise mt-10 sm:mt-12 rounded-3xl px-5 sm:px-8 lg:px-10 py-8 sm:py-10 border border-white/25 backdrop-blur-2xl"
            style={{
              background: 'rgba(246, 241, 233, 0.16)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), 0 30px 60px rgba(16,19,34,0.18)',
              ['--nq-rise-delay' as string]: '180ms',
            }}
          >
            <ol className="grid gap-10 sm:gap-9">
              {milestones.map((ms, index) => {
                const Icon = ms.icon;
                return (
                  <li key={index} className="flex items-start gap-4 sm:gap-5">
                    {/* The step number, quiet and small — sequence without the card's numeral. */}
                    <span
                      className="pt-1 text-[1.35rem] sm:text-[1.5rem] font-black leading-none tabular-nums shrink-0"
                      style={{ color: INK, opacity: 0.5 }}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>

                    <span
                      aria-hidden="true"
                      className="w-px self-stretch shrink-0"
                      style={{ background: INK, opacity: 0.18 }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <h3
                          className="text-[1.05rem] sm:text-[1.2rem] font-black leading-none"
                          style={{ color: INK }}
                        >
                          {ms.phaseTitle}
                        </h3>
                        <span
                          className="grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl shrink-0"
                          style={{ background: PERIWINKLE, color: INK }}
                          aria-hidden="true"
                        >
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.9} />
                        </span>
                      </div>

                      <p
                        className="mt-2 text-xs font-bold"
                        style={{ color: INK, opacity: 0.6 }}
                      >
                        {ms.status}
                      </p>

                      <ul className="mt-4 space-y-2">
                        {ms.tasks.map((task, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-2">
                            <CheckCircle2
                              className="w-4 h-4 shrink-0 mt-0.5"
                              strokeWidth={2.2}
                              style={{ color: INK }}
                            />
                            <span
                              className="text-[0.92rem] font-bold leading-[1.9]"
                              style={{ color: INK, opacity: 0.82 }}
                            >
                              {task}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(16,19,34,0.15)' }}>
                        <div className="text-xl font-black tracking-tight" style={{ color: INK }}>
                          {ms.weeks}
                        </div>
                        <p className="mt-0.5 text-[11px] font-bold" style={{ color: INK, opacity: 0.6 }}>
                          {isAr
                            ? `المرحلة ${index + 1} من 4 · 2 أسابيع`
                            : `Phase ${index + 1} of 4 · 2 Weeks`}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* ── The CTA, inside the section ───────────────────────────────────────────────────
              Sits on the section's own blue ground so the whole block is one surface — no black
              strip breaking the section from the footer that follows it. */}
          <div
            className="nq-rise mt-12 sm:mt-16 flex justify-center"
            style={{ ['--nq-rise-delay' as string]: '300ms' }}
          >
            <ProjectCtaButton language={language} onCreateContract={onCreateContract} />
          </div>
        </div>
      </div>
    </section>
  );
};