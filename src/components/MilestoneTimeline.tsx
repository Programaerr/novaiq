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
import { OBSIDIAN, ORANGE, PAPER_DEEP } from '../lib/homePalette';
import { SECTION_FADE, SECTION_TONES, TileField } from './TileField';
import { ProjectCtaButton } from './ProjectCtaButton';

interface MilestoneTimelineProps {
  language?: Language;
  /** Opens the contract builder — lands on the section's own CTA inside it. */
  onCreateContract?: () => void;
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({ language = 'ar', onCreateContract }) => {
  const isAr = language === 'ar';
  const { ref: sectionRef, seen } = useSeen<HTMLElement>();

  /**
   * The four phases, in order. Deliberately WITHOUT a week grid.
   *
   * They used to be labelled "الأسبوع 1 - 2" … "الأسبوع 7 - 8", which fixed every project at
   * exactly eight weeks on a public page. The agreement does not work that way: the duration is
   * agreed per contract and stated in Section One (see contractTerms), and it genuinely differs —
   * a template delivers in 5 weeks (templatesData) while a custom build defaults to 8. So the grid
   * was quoting a delivery date to people whose own contract says something else. The phases are
   * the part that is actually the same for everyone; the timing belongs to the signed contract.
   *
   * Every task below is a commitment the contract also makes, in the same terms it makes it —
   * nothing here may promise something the clauses qualify.
   */
  const milestones = [
    {
      phaseTitle: isAr ? 'المرحلة الأولى: التحليل والاعتماد' : 'Phase 1: Analysis & Approval',
      icon: Calendar,
      status: isAr ? 'مرحلة الاعتماد' : 'Approval Phase',
      tasks: [
        isAr ? 'توقيع الاتفاق إلكترونياً وتحديد النطاق في القسم الأول' : 'Sign the agreement electronically and set the scope in Section One',
        isAr ? 'تحديد الهوية البصرية ولغات النظام' : 'Define visual identity, colors, and required system languages',
        isAr ? 'تجهيز النطاق والخوادم الخاصة بالمشروع' : 'Configure the project’s domain, cloud infrastructure, and servers',
      ]
    },
    {
      phaseTitle: isAr ? 'المرحلة الثانية: بناء التصميم' : 'Phase 2: Interactive Design & UI/UX',
      icon: Code2,
      status: isAr ? 'التطوير البصري' : 'Visual Development',
      tasks: [
        isAr ? 'تطوير واجهات المستخدم' : 'Develop responsive user interfaces with top UX/UI standards',
        isAr ? 'دمج تأثيرات الحركة والسلاسة' : 'Integrate motion effects and smooth interactivity',
        isAr ? 'جولتا تعديل مجانيتان ضمن النطاق المتفق عليه' : 'Two free revision rounds within the agreed scope',
      ]
    },
    {
      phaseTitle: isAr ? 'المرحلة الثالثة: الربط البرمجي' : 'Phase 3: Core Engineering & Backend Integration',
      icon: Cpu,
      status: isAr ? 'البرمجة والخوادم' : 'Engineering & Cloud',
      tasks: [
        isAr ? 'بناء المنطق البرمجي ولوحة الإدارة' : 'Build the core application logic and the admin panel',
        isAr ? 'تجهيز نظام المحادثة والدعم' : 'Develop integrated customer support & communication modules',
        isAr ? 'ربط قواعد البيانات السحابية وتأمينها' : 'Connect & secure live cloud databases (Firebase / Cloud Store)',
      ]
    },
    {
      phaseTitle: isAr ? 'المرحلة الرابعة: الاختبار النهائي' : 'Phase 4: Final Testing & Live Launch',
      icon: ShieldCheck,
      status: isAr ? 'الإطلاق المكتمل' : 'Live Launch',
      tasks: [
        isAr ? 'اختبارات الأمان والسرعة' : 'Run load tests, security audits, and performance tuning',
        isAr ? 'تسليم الكود المصدري وصلاحيات الإدارة للعميل بعد اكتمال السداد' : 'Hand the source code and admin access to the client once payment is complete',
        isAr ? 'ضمان إصلاح الأخطاء 30 يوماً، وأي صيانة لاحقة باتفاق مستقل' : 'A 30-day defect warranty, with any later maintenance under a separate agreement',
      ]
    }
  ];

  return (
    <section
      ref={sectionRef}
      id="timeline-section"
      data-seen={seen ? 'true' : 'false'}
      style={{
        background: ORANGE,
        /* Pull the whole section up behind the floating navbar, exactly as the hero does — so
           the cube field at the top runs under the navbar instead of starting below it as a
           seam of body colour. The navbar is fixed and floats above the page; without this the
           cubes would look cut off at the top of the section. */
        marginTop: 'calc(-1 * (var(--nav-bottom, 74px) + var(--content-gap, 0.75rem)))',
      }}
      className="relative overflow-hidden pt-[calc(var(--nav-bottom,74px)+3.5rem)] pb-20 sm:pb-28 lg:pb-32"
    >
      {/* ── The whole background ─────────────────────────────────────────────────────────────────
          One full-bleed cube field instead of a strip across the top. It covers the entire
          section and dissolves at both edges: up under the navbar above (TIMELINE_FADE.hi) and
          down into the footer below (TIMELINE_FADE.lo), so neither end lands on a straight
          seam. */}
      <TileField tones={SECTION_TONES} fade={SECTION_FADE} />

      <div className="relative nq-container">
        <div className="mx-auto max-w-[56rem]">
          {/* This heading and the paragraph under it sit directly on the section's own ground —
              ORANGE, on direct client instruction — so both read OBSIDIAN: Orange is bright
              enough that the dark member of the pair is the one that reads (6.90:1, where white
              is a failing 2.87:1), the same rule the frosted panel below now follows too. */}
          <h2
            className="nq-rise text-[1.55rem] sm:text-[2.1rem] font-black leading-none tracking-tight"
            style={{ color: OBSIDIAN, ['--nq-rise-delay' as string]: '80ms' }}
          >
            {isAr ? 'مراحل تنفيذ مشروعك' : 'Project Phases & Delivery'}
          </h2>

          {/* The one thing the phase list can no longer say for itself: the duration is real, it
              is simply per-contract rather than the same eight weeks for everyone. */}
          <p
            className="nq-rise mt-4 max-w-[42rem] text-sm sm:text-base font-bold leading-relaxed"
            style={{ color: OBSIDIAN, opacity: 0.8, ['--nq-rise-delay' as string]: '130ms' }}
          >
            {isAr
              ? 'أربع مراحل ثابتة لكل مشروع، ومدّة التنفيذ تُحدَّد في القسم الأول من اتفاقك حسب حجم العمل.'
              : 'Four phases in every project; the delivery duration is set in Section One of your agreement, sized to the work.'}
          </p>

          {/* ── The four phases, in one frosted panel ───────────────────────────────────────────
              Semi-transparent over the field, with a heavy blur: the copy stays sharp while the
              background keeps showing through, instead of hiding it behind opaque cards. The
              panel IS the container — no per-phase cards inside it.

              Reads as "glass over the field" rather than "a light card", and that has meant a
              different colour of glass under every identity this section has carried. Periwinkle
              was light-medium, so a little near-white mixed in stayed clearly light and every
              mark inside was dark ink. Cobalt Deep was dark, and needed the marks flipped to
              light instead. ORANGE, on direct client instruction, is back to being a BRIGHT
              ground — closer to periwinkle's case than Cobalt Deep's — so the marks flip back to
              dark again: 40% of warm white over Orange composites to `#FCA262`, and OBSIDIAN
              text on that measures 9.89:1. */}
          <div
            className="nq-rise mt-10 sm:mt-12 rounded-3xl px-5 sm:px-8 lg:px-10 py-8 sm:py-10 border border-white/25 backdrop-blur-2xl"
            style={{
              background: 'rgba(247, 247, 245, 0.4)',
              /* A clear drop shadow so the panel reads as floating above the cube field rather
                 than sitting flat on it — the field is busy, and without the shadow the two
                 planes fight for the same depth. */
              boxShadow:
                'inset 0 0 0 1px rgba(255,255,255,0.08), 0 40px 90px -20px rgba(8,10,13,0.6), 0 12px 28px -8px rgba(8,10,13,0.4)',
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
                      style={{ color: OBSIDIAN, opacity: 0.7 }}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>

                    <span
                      aria-hidden="true"
                      className="w-px self-stretch shrink-0"
                      style={{ background: OBSIDIAN, opacity: 0.25 }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <h3
                          className="text-[1.05rem] sm:text-[1.2rem] font-black leading-none"
                          style={{ color: OBSIDIAN }}
                        >
                          {ms.phaseTitle}
                        </h3>
                        <span
                          className="grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl shrink-0"
                          /* PAPER_DEEP, not ORANGE. An Orange chip here would fight the one
                             signal colour this whole page already carries at full strength —
                             Orange is reserved for things being pressed or pointed at, not
                             passive icon chrome, and a second orange note next to the first
                             dilutes both. PAPER_DEEP is a cool, neutral light grey against the
                             panel's own warm orange-tinted glass, which is enough of a hue
                             difference to read as its own chip rather than a shape cut from the
                             panel. Obsidian on it measures 14.30:1. */
                          style={{ background: PAPER_DEEP, color: OBSIDIAN }}
                          aria-hidden="true"
                        >
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.9} />
                        </span>
                      </div>

                      <p
                        className="mt-2 text-xs font-bold"
                        style={{ color: OBSIDIAN, opacity: 0.75 }}
                      >
                        {ms.status}
                      </p>

                      <ul className="mt-4 space-y-2">
                        {ms.tasks.map((task, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-2">
                            <CheckCircle2
                              className="w-4 h-4 shrink-0 mt-0.5"
                              strokeWidth={2.2}
                              style={{ color: OBSIDIAN }}
                            />
                            <span
                              className="text-[0.92rem] font-bold leading-[1.9]"
                              style={{ color: OBSIDIAN, opacity: 0.9 }}
                            >
                              {task}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* The phase's place in the sequence. This used to carry a week range as
                          well; see the note on `milestones` for why the timing is not stated
                          here but in the contract that actually sets it. */}
                      <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(8,10,13,0.15)' }}>
                        <div className="text-xl font-black tracking-tight" style={{ color: OBSIDIAN }}>
                          {isAr ? `المرحلة ${index + 1} من 4` : `Phase ${index + 1} of 4`}
                        </div>
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