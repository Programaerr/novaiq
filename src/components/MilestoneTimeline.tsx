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
import { OBSIDIAN, ORANGE_ON_DARK, WHITE } from '../lib/homePalette';
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
        isAr ? 'ضمان إصلاح الأخطاء 15 يوماً، وأي صيانة لاحقة باتفاق مستقل' : 'A 15-day defect warranty, with any later maintenance under a separate agreement',
      ]
    }
  ];

  return (
    <section
      ref={sectionRef}
      id="timeline-section"
      data-seen={seen ? 'true' : 'false'}
      style={{
        background: WHITE,
        /* Pull the whole section up behind the floating navbar, exactly as the hero does — so
           the cube field at the top runs under the navbar instead of starting below it as a
           seam of body colour. The navbar is fixed and floats above the page; without this the
           cubes would look cut off at the top of the section. */
        marginTop: 'calc(-1 * (var(--nav-bottom, 74px) + var(--content-gap, 0.75rem)))',
      }}
      className="relative overflow-hidden pt-[calc(var(--nav-bottom,74px)+3.5rem)] pb-20 sm:pb-28 lg:pb-32"
    >
      <div className="relative nq-container">
        <div className="mx-auto max-w-[56rem]">
          {/* This heading and the paragraph under it sit directly on the section's own ground —
              WARM WHITE, per the client's third pass — with nothing dark behind them to carry
              white text, so both stay OBSIDIAN: secondary chrome sitting on the page's own paper,
              exactly like every other section label outside a panel now reads (18.48:1). The
              black the brief asks to confine to secondary text lives here and in the frosted
              panel below — which is where the "confined" black actually IS the panel. */}
          <h2
            /* `tracking-tight` in English only. It is -0.025em, a Latin display nicety for a
               heavy weight at a large size, and on Arabic it does the mirror image of what
               the footer's positive tracking did: instead of cutting the joins open it
               drags the glyphs together, so the dots that are the ONLY thing separating
               several letters start colliding with the letter beside them. Measured at
               -0.62px on this heading at 390px.

               Conditional here rather than via the `.nq-label` rule in index.css: that rule
               also clears `text-transform`, and this is a heading rather than the tracked
               uppercase label device the rule was written for. The `isAr ? '' : ...`
               shape is the pattern already used at HomeHero.tsx:195. */
            className={`nq-rise text-[1.55rem] sm:text-[2.1rem] font-black leading-none ${isAr ? '' : 'tracking-tight'}`}
            style={{ color: OBSIDIAN, ['--nq-rise-delay' as string]: '80ms' }}
          >
            {isAr ? 'مراحل العمل' : 'Project Phases & Delivery'}
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
              and Orange were both bright grounds, so the panel stayed light and its marks dark
              ink. The third pass moves the flat ground itself to WARM WHITE and asks for black to
              be confined to where secondary things are written — so this panel is where the
              brief's black actually lives.

              SLATE at 90% now, where this was 90% Obsidian, and an 8px blur where it was
              `backdrop-blur-2xl` (40px). The blur change stays exactly as it came: 40px averages
              a regular cube grid away entirely, so the 10% of field that used to come through
              arrived as a flat lift and the panel read as a dark card rather than as glass. At
              8px the field is visible through it, which is what "glass over the field" was always
              claiming to be.

              The tint is the owner's `#273036`, and it is why the ALPHA did not follow the blur
              down to 0.78 the way the templates card's first draft did. SLATE is a much lighter
              dark than Obsidian, so it buys much less ink at the same alpha: at 0.78 these 0.70
              step numbers fall to 4.08:1, and the templates card's 0.62 label — the same glass,
              so the same floor — to 3.56:1, which fails. 0.90 is the honest setting for this
              colour: over the brightest cube behind it the surface is `#3C4449`, where WHITE
              reads 9.26:1 and these step numbers 5.49:1. */}
          <div
            className="nq-rise mt-10 sm:mt-12 rounded-3xl px-5 sm:px-8 lg:px-10 py-8 sm:py-10 border border-white/10 backdrop-blur-[8px]"
            style={{
              background: 'rgba(39, 48, 54, 0.9)',
              /* A clear drop shadow so the panel reads as floating above the cube field rather
                 than sitting flat on it — the field is busy, and without the shadow the two
                 planes fight for the same depth. */
              boxShadow:
                'inset 0 0 0 1px rgba(255,255,255,0.06), 0 40px 90px -20px rgba(8,10,13,0.5), 0 12px 28px -8px rgba(8,10,13,0.35)',
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
                      style={{ color: WHITE, opacity: 0.7 }}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>

                    <span
                      aria-hidden="true"
                      className="w-px self-stretch shrink-0"
                      style={{ background: WHITE, opacity: 0.25 }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* `leading-[1.35]`, where this was `leading-none`. Every one of the
                            four titles wraps to two lines on a phone -- in English as well as
                            Arabic -- and line-height 1 makes the line box exactly the font
                            size, so the two lines had nothing between them. Latin survives
                            that as merely tight; Arabic collides, because it puts real ink
                            both above the line (the alif and lam ascenders) and below it (the
                            dots under several letters), so its true vertical extent is well
                            over 1em where Latin’s is about 1em.

                            Still tighter than the 1.9 the task list below it uses, so the
                            title stays the denser block of the two. */}
                        <h3
                          className="text-[1.05rem] sm:text-[1.2rem] font-black leading-[1.35]"
                          style={{ color: WHITE }}
                        >
                          {ms.phaseTitle}
                        </h3>
                        <span
                          className="grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl shrink-0"
                          /* ORANGE_ON_DARK, matching the icon tile on the templates cards — the
                             owner asked for the two to be the same chip, and they are the same
                             thing: a light square holding a dark glyph on dark glass.

                             This was PAPER_DEEP, and the note that put it there argued against
                             ORANGE specifically — that a second orange note beside the page's one
                             signal colour dilutes both. That argument is now moot rather than
                             overruled: the accent is `#273036`, a dark slate, and ORANGE_ON_DARK
                             is its LIGHT twin `#C4CED4`. Nothing orange is being added here.

                             Measured on the panel's new glass (`#3C4449` over the brightest cube
                             behind it): the Obsidian glyph reads 12.39:1 on the chip, and the
                             chip itself 6.21:1 against the panel. Both are a little lower than
                             PAPER_DEEP's 14.30:1 and 7.16:1, and both are far clear of any floor;
                             what is bought is that the two sections stop using two different
                             greys for one idea. */
                          style={{ background: ORANGE_ON_DARK, color: OBSIDIAN }}
                          aria-hidden="true"
                        >
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.9} />
                        </span>
                      </div>

                      <p
                        /* 0.85rem and 0.82, up from `text-xs` (12px) and 0.75. Two or three
                           Arabic words on glass at 12px is the size this section was least
                           readable at. */
                        className="mt-2 text-[0.85rem] sm:text-sm font-bold"
                        style={{ color: WHITE, opacity: 0.82 }}
                      >
                        {ms.status}
                      </p>

                      <ul className="mt-4 space-y-2">
                        {ms.tasks.map((task, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-2">
                            <CheckCircle2
                              className="w-4 h-4 shrink-0 mt-0.5"
                              strokeWidth={2.2}
                              style={{ color: WHITE }}
                            />
                            <span
                              className="text-[0.92rem] font-bold leading-[1.9]"
                              style={{ color: WHITE, opacity: 0.9 }}
                            >
                              {task}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* The phase's place in the sequence. This used to carry a week range as
                          well; see the note on `milestones` for why the timing is not stated
                          here but in the contract that actually sets it. */}
                      <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                        {/* English only, for the reason on the section heading above: at 20px
                            this measured -0.5px, pulling the Arabic joins closed. */}
                        <div className={`text-xl font-black ${isAr ? '' : 'tracking-tight'}`} style={{ color: WHITE }}>
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