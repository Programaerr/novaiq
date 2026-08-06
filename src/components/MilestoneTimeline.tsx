import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Rocket,
  Code2,
  Cpu,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import { cosmicAudio } from '../lib/audio';
import { Language } from '../lib/i18n';

interface MilestoneTimelineProps {
  onCreateContract: () => void;
  language?: Language;
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({ onCreateContract, language = 'ar' }) => {
  // Windows/Fluent-style spotlight for the glow CTA button: pushes the cursor position
  // straight into a CSS custom property via the DOM (no setState) so the circular light
  // can track every frame without a React re-render.
  const handleSpotlightMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  };

  const milestones = [
    {
      weeks: language === 'ar' ? 'الأسبوع 1 - 2' : 'Weeks 1 - 2',
      phaseTitle: language === 'ar' ? 'المرحلة الأولى: التحليل والاعتماد العادي' : 'Phase 1: Analysis & Official Approval',
      icon: Calendar,
      status: language === 'ar' ? 'مرحلة الاعتماد' : 'Approval Phase',
      tasks: [
        language === 'ar' ? 'توقيع واعتماد العقد الإلكتروني الرسمي وطباعة ملف PDF' : 'Sign & approve official electronic contract and export PDF',
        language === 'ar' ? 'تحديد الهوية البصرية، الألوان، واللغات المطلوبة للمشروع' : 'Define visual identity, colors, and required system languages',
        language === 'ar' ? 'هيكلة الخوادم والنطاق الخاص بالشركة (Domain & Cloud)' : 'Configure domain, cloud infrastructure, and server architecture',
      ]
    },
    {
      weeks: language === 'ar' ? 'الأسبوع 3 - 4' : 'Weeks 3 - 4',
      phaseTitle: language === 'ar' ? 'المرحلة الثانية: بناء التصميم والواجهات التفاعلية' : 'Phase 2: Interactive Design & UI/UX',
      icon: Code2,
      status: language === 'ar' ? 'التطوير البصري' : 'Visual Development',
      tasks: [
        language === 'ar' ? 'تطوير وتوليد واجهات المستخدم وفق أعلى معايير الجودة (UX/UI)' : 'Develop responsive user interfaces with top UX/UI standards',
        language === 'ar' ? 'ضمان الاستجابة التامة على الكمبيوتر، التاب، والجوال' : 'Ensure full responsiveness on desktop, tablet, and mobile',
        language === 'ar' ? 'دمج تأثيرات الحركة والسلاسة التفاعلية' : 'Integrate motion effects and smooth interactivity',
      ]
    },
    {
      weeks: language === 'ar' ? 'الأسبوع 5 - 6' : 'Weeks 5 - 6',
      phaseTitle: language === 'ar' ? 'المرحلة الثالثة: الربط البرمجي وإعداد الخدمات المتقدمة' : 'Phase 3: Core Engineering & Backend Integration',
      icon: Cpu,
      status: language === 'ar' ? 'البرمجة والخوادم' : 'Engineering & Cloud',
      tasks: [
        language === 'ar' ? 'ربط بوابات الدفع الإلكتروني (Apple Pay / Mada / Visa)' : 'Integrate payment gateways (ZainCash, Card, Visa, Apple Pay)',
        language === 'ar' ? 'تطوير وتجهيز نظام المحادثة والدعم الفني المتكامل لجمهور الشركة' : 'Develop integrated customer support & communication modules',
        language === 'ar' ? 'ربط وتوثيق البيانات السحابية الحية (Database & Cloud Storage)' : 'Connect & secure live cloud databases (Firebase / Cloud Store)',
      ]
    },
    {
      weeks: language === 'ar' ? 'الأسبوع 7 - 8' : 'Weeks 7 - 8',
      phaseTitle: language === 'ar' ? 'المرحلة الرابعة: الاختبار النهائي والإطلاق المباشر' : 'Phase 4: Final Testing & Live Launch',
      icon: ShieldCheck,
      status: language === 'ar' ? 'الإطلاق المكتمل' : 'Live Launch',
      tasks: [
        language === 'ar' ? 'اختبارات الأمان والسرعة وضغط الزوار (Performance & Security Tests)' : 'Run load tests, security audits, and performance tuning',
        language === 'ar' ? 'تسليم الكود المصدري ولوحات التحكم بالكامل لممثل الشركة' : 'Deliver full source code and admin panels to company owner',
        language === 'ar' ? 'التسليم النهائي وإمكانية تفعيل خطة صيانة مخصصة حسب الاتفاق' : 'Final delivery and optional maintenance plan per agreement',
      ]
    }
  ];

  return (
    <section id="timeline-section" className="py-10 sm:py-14 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            {language === 'ar' ? 'جدول المراحل الزمنية لتنفيذ مشروعك' : 'Project Sprints & Delivery Timeline'}
          </h2>
          <p className="text-zinc-300 text-xs sm:text-sm">
            {language === 'ar'
              ? 'نتبع خطة تسليم واضحة ومحددة خطوة بخطوة تضمن التزامنا الكامل بالمواعيد وجودة المنتج النهائي.'
              : 'We follow a structured step-by-step roadmap guaranteeing deadline compliance and peak product quality.'}
          </p>
        </div>

        {/* Milestones Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12 relative">
          {milestones.map((ms, index) => {
            const Icon = ms.icon;
            return (
              <div
                key={index}
                className="bg-zinc-950 border border-zinc-800 rounded-[32px] p-6 pt-11 flex flex-col justify-between space-y-6 relative group hover:border-zinc-700 transition-all shadow-xl"
              >

                {/* Background phase-number — fades in on card hover (simple hover, no
                    cursor tracking), clipped to its own layer so the card itself can stay
                    overflow-visible for the floating badge below to poke past its top
                    edge. Plain opacity only, no blur() — a blurred descendant's paint
                    still escaped this wrapper's overflow-hidden + rounded corner clip in
                    testing, which read as the number bleeding out over the badge above it. */}
                <div className="absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none">
                  <span className="absolute top-2 left-9 text-[5.5rem] font-black text-white leading-none select-none font-mono opacity-0 group-hover:opacity-20 transition-opacity duration-500">
                    {index + 1}
                  </span>
                </div>

                {/* Floating icon badge — pops above the card's top edge instead of
                    sitting inline, matching the reference card's badge treatment. */}
                <div className="absolute -top-7 right-6 w-14 h-14 rounded-full bg-white flex items-center justify-center text-black shadow-lg z-10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]">
                  <Icon className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                </div>

                {/* Weeks Banner — margin-right:auto (physical, not the logical
                    justify-start/-end pair) keeps this pinned to the same side as the
                    icon badge's own fixed right-6 in both languages. justify-start flips
                    with dir, so in English this used to land on the opposite side from
                    the icon instead of staying grouped with it the way it does in Arabic. */}
                <div className="flex items-center">
                  <span className="font-mono text-xs font-bold text-zinc-200 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 ml-auto">
                    {ms.weeks}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {ms.phaseTitle}
                  </h3>
                  <p className="text-xs text-zinc-400 font-semibold mb-4">
                    {ms.status}
                  </p>

                  <ul className="space-y-2 text-xs text-zinc-300">
                    {ms.tasks.map((task, tIdx) => (
                      <li key={tIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom Step Indicator */}
                <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                  <span>{language === 'ar' ? `المرحلة ${index + 1} من 4` : `Phase ${index + 1} of 4`}</span>
                  <span className="text-white font-bold">{language === 'ar' ? '2 أسابيع' : '2 Weeks'}</span>
                </div>

              </div>
            );
          })}
        </div>

        {/* Bottom Callout */}
        <div className="mt-28 sm:mt-36 flex justify-center">
          <button
            onClick={() => {
              onCreateContract();
              cosmicAudio.playWarp();
            }}
            onMouseMove={handleSpotlightMove}
            className="glow-cta-btn px-4 py-2.5 text-xs gap-2 sm:px-8 sm:py-4 sm:text-sm sm:gap-3 rounded-full text-white font-extrabold uppercase tracking-[0.1em] hover:scale-[1.02] transition-all inline-flex items-center cursor-pointer"
          >
            <span className="cta-spotlight" />
            <Rocket className="relative z-10 w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <span className="relative z-10">{language === 'ar' ? 'ابدأ تنفيذ مشروعك ووقع العقد الآن' : 'Start Your Project & Sign Contract Now'}</span>
            <ArrowLeft className={`relative z-10 w-4 h-4 sm:w-5 sm:h-5 ${language === 'en' ? 'rotate-180' : ''}`} />
          </button>
        </div>

      </div>
    </section>
  );
};
