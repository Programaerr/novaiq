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
import { useRevealGroup } from '../lib/useRevealGroup';

interface MilestoneTimelineProps {
  onCreateContract: () => void;
  language?: Language;
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({ onCreateContract, language = 'ar' }) => {
  // Border only — no `.reveal-face` on these cards. They used to carry a pointer-tracked
  // wash across their face as well; it is gone at the customer's request, and the light on
  // the card is now the fixed glow at its foot plus this ring.
  const revealGroup = useRevealGroup<HTMLDivElement>();

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
        {/* Even gaps now the icon sits inside the card: gap-y used to be double gap-x purely
            to clear the badge that poked above each card's top edge. */}
        <div ref={revealGroup} className="reveal-group grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {milestones.map((ms, index) => {
            const Icon = ms.icon;
            return (
              <div
                key={index}
                // No overflow:hidden on the card, deliberately. `.reveal-border` draws its
                // ring at inset:-1px — outside the padding box — and the card's own overflow
                // would clip that away. The card's light is a `background` instead (the
                // border-radius clips it for free) and the two layers that genuinely need
                // clipping sit in the absolutely positioned wrapper below.
                // transition-colors, not transition-all: `all` includes `transform`, and
                // these cards run a scroll-driven transform animation (.milestone-card's
                // drift). Declaring a transition on the same property an animation is
                // continuously driving makes the style system reconcile the two every
                // frame for no benefit — nothing here animates transform on a state change.
                className="milestone-card reveal-border border border-white/10 rounded-[26px] p-7 flex flex-col relative group transition-colors shadow-xl"
              >

                {/* z-10 on the whole content column rather than on pieces of it: absolutely
                    positioned content paints after non-positioned siblings whatever the
                    source order, so without this the glow layer above would sit on top of
                    the text and the card would read as unlit wherever the two overlap. */}
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
                      list runs, so the four cards' figures and links line up across the row
                      instead of each sitting wherever its own list happened to end. */}
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

                    <button
                      onClick={() => {
                        onCreateContract();
                        cosmicAudio.playWarp();
                      }}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white underline underline-offset-[6px] decoration-white/40 hover:decoration-white transition-colors cursor-pointer"
                    >
                      <span>{language === 'ar' ? 'ابدأ مشروعك' : 'Start Your Project'}</span>
                      {/* The arrow leads the eye toward where the text is heading, so it
                          points and travels with the writing direction, not against it. */}
                      <ArrowLeft
                        className={`w-4 h-4 transition-transform duration-300 ${
                          language === 'en' ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
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
            className="nq-btn nq-btn--solid px-4 py-2.5 text-xs gap-2 sm:px-8 sm:py-4 sm:text-sm sm:gap-3 rounded-full font-extrabold uppercase tracking-[0.1em] inline-flex items-center cursor-pointer"
          >
            <span className="nq-btn-beam" aria-hidden="true" />
            <Rocket className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{language === 'ar' ? 'ابدأ تنفيذ مشروعك ووقع العقد الآن' : 'Start Your Project & Sign Contract Now'}</span>
            <ArrowLeft className={`w-4 h-4 sm:w-5 sm:h-5 ${language === 'en' ? 'rotate-180' : ''}`} />
          </button>
        </div>

      </div>
    </section>
  );
};
