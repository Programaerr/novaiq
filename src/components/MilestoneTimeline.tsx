import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Code2,
  Cpu,
  ShieldCheck,
} from 'lucide-react';
import { Language } from '../lib/i18n';

interface MilestoneTimelineProps {
  language?: Language;
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({ language = 'ar' }) => {
  const milestones = [
    {
      weeks: language === 'ar' ? 'الأسبوع 1 - 2' : 'Weeks 1 - 2',
      phaseTitle: language === 'ar' ? 'المرحلة الأولى: التحليل والاعتماد' : 'Phase 1: Analysis & Official Approval',
      icon: Calendar,
      status: language === 'ar' ? 'مرحلة الاعتماد' : 'Approval Phase',
      tasks: [
        language === 'ar' ? 'توقيع واعتماد العقد' : 'Sign & approve official electronic contract and export PDF',
        language === 'ar' ? 'تحديد الهوية البصرية' : 'Define visual identity, colors, and required system languages',
        language === 'ar' ? 'الخوادم والنطاق الخاص بالشركة' : 'Configure domain, cloud infrastructure, and server architecture',
      ]
    },
    {
      weeks: language === 'ar' ? 'الأسبوع 3 - 4' : 'Weeks 3 - 4',
      phaseTitle: language === 'ar' ? 'المرحلة الثانية: بناء التصميم' : 'Phase 2: Interactive Design & UI/UX',
      icon: Code2,
      status: language === 'ar' ? 'التطوير البصري' : 'Visual Development',
      tasks: [
        language === 'ar' ? 'تطوير واجهات المستخدم' : 'Develop responsive user interfaces with top UX/UI standards',
        language === 'ar' ? 'دمج تأثيرات الحركة والسلاسة' : 'Integrate motion effects and smooth interactivity',
        language === 'ar' ? 'ضمان الاستجابة التامة' : 'Ensure full responsiveness on desktop, tablet, and mobile',
      ]
    },
    {
      weeks: language === 'ar' ? 'الأسبوع 5 - 6' : 'Weeks 5 - 6',
      phaseTitle: language === 'ar' ? 'المرحلة الثالثة: الربط البرمجي' : 'Phase 3: Core Engineering & Backend Integration',
      icon: Cpu,
      status: language === 'ar' ? 'البرمجة والخوادم' : 'Engineering & Cloud',
      tasks: [
        language === 'ar' ? 'ربط بوابات الدفع الإلكتروني' : 'Integrate payment gateways (ZainCash, Card, Visa, Apple Pay)',
        language === 'ar' ? 'تجهيز نظام المحادثة والدعم' : 'Develop integrated customer support & communication modules',
        language === 'ar' ? 'ربط البيانات السحابية' : 'Connect & secure live cloud databases (Firebase / Cloud Store)',
      ]
    },
    {
      weeks: language === 'ar' ? 'الأسبوع 7 - 8' : 'Weeks 7 - 8',
      phaseTitle: language === 'ar' ? 'المرحلة الرابعة: الاختبار النهائي' : 'Phase 4: Final Testing & Live Launch',
      icon: ShieldCheck,
      status: language === 'ar' ? 'الإطلاق المكتمل' : 'Live Launch',
      tasks: [
        language === 'ar' ? 'اختبارات الأمان والسرعة' : 'Run load tests, security audits, and performance tuning',
        language === 'ar' ? 'تسليم الكود المصدري ولوحات التحكم بالكامل لممثل الشركة' : 'Deliver full source code and admin panels to company owner',
        language === 'ar' ? 'إمكانية تفعيل خطة صيانة مخصصة حسب الاتفاق' : 'Final delivery and optional maintenance plan per agreement',
      ]
    }
  ];

  return (
    <section id="timeline-section" className="relative">
      {/* No vertical padding here. The home page sets the gap between sections with a single
          `space-y` (see App.tsx) — a section that also pads itself adds to that gap on both
          sides, so this one break came out half again as wide as the others. Spacing between
          blocks belongs to whatever is stacking them, not to the blocks. */}
      <div className="nq-container">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            {language === 'ar' ? 'جدول المراحل الزمنية لتنفيذ مشروعك' : 'Project Sprints & Delivery Timeline'}
          </h2>
        </div>

        {/* Milestones Grid */}
        {/* Even gaps now the icon sits inside the card: gap-y used to be double gap-x purely
            to clear the badge that poked above each card's top edge. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {milestones.map((ms, index) => {
            const Icon = ms.icon;
            return (
              <div
                key={index}
                // transition-colors, not transition-all: `all` includes `transform`, and
                // these cards run a scroll-driven transform animation (.milestone-card's
                // drift). Declaring a transition on the same property an animation is
                // continuously driving makes the style system reconcile the two every
                // frame for no benefit — nothing here animates transform on a state change.
                className="milestone-card nq-card nq-card--hover p-7 flex flex-col relative group"
              >

                {/* z-10 kept even though the pointer-tracked glow that used to sit above this
                    is gone: the card still paints a background gradient of its own, and the
                    rule that put this here — absolutely positioned content paints after
                    non-positioned siblings whatever the source order — has not changed. */}
                <div className="relative z-10 flex flex-col h-full">

                  <Icon className="w-8 h-8 text-white shrink-0 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />

                  <h3 className="mt-9 text-xl font-bold text-white leading-snug">
                    {ms.phaseTitle}
                  </h3>
                  <p className="mt-2 text-xs text-zinc-400 font-semibold">
                    {ms.status}
                  </p>

                  <ul className="mt-5 space-y-2 text-xs text-zinc-300">
                    {ms.tasks.map((task, tIdx) => (
                      <li key={tIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{task}</span>
                      </li>
                    ))}
                  </ul>

                  {/* mt-auto pins this to the foot of the card however long the phase's task
                      list runs, so the four cards' figures line up across the row instead of
                      each sitting wherever its own list happened to end. The per-card
                      "Start Your Project" link that used to close this block is gone at the
                      customer's request; the section's own button below is the one route out
                      of here now. */}
                  <div className="mt-auto pt-8">
                    {/* Not font-mono, unlike the smaller version of this line it replaces:
                        the mono face letter-spaces Arabic, which at 11px was a quirk and at
                        24px pulls "الأسبوع 1 - 2" apart into loose glyphs. */}
                    <div className="text-2xl font-extrabold text-white tracking-tight">
                      {ms.weeks}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {language === 'ar'
                        ? `المرحلة ${index + 1} من 4 · 2 أسابيع`
                        : `Phase ${index + 1} of 4 · 2 Weeks`}
                    </p>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
