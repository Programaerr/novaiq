import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Language } from '../lib/i18n';
import { useRevealGroup } from '../lib/useRevealGroup';

interface AboutSectionProps {
  language?: Language;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ language = 'ar' }) => {
  // Drives both halves of the Fluent reveal on every card below — the edge nearest the
  // pointer and the face under it — from one pointer position shared across the row.
  const revealGroup = useRevealGroup<HTMLDivElement>();

  return (
    <section id="about-section" className="py-10 sm:py-14 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* No overflow-hidden any more: the arc below is drawn on this border and throws its
            corona to both sides of it, and a clip at the padding box would shear off the
            outer half — the half that makes it read as light coming off the edge rather than
            a pattern printed inside it. Nothing in this panel needed the clip. */}
        <div className="p-5 sm:p-6 rounded-3xl border border-zinc-700 relative shadow-2xl">

          {/* Electric frame. The rounded rect matches the panel's own rounded-3xl (24px), so
              the arc rides the border it is electrifying instead of cutting its corners.
              Three seeds, one per filter — the CSS in .electric-frame-bolt swaps between
              them, which is what crackles. */}
          <svg className="electric-frame" aria-hidden="true">
            <defs>
              {[
                { id: 'nq-arc-a', seed: 2 },
                { id: 'nq-arc-b', seed: 7 },
                { id: 'nq-arc-c', seed: 13 },
              ].map(({ id, seed }) => (
                // The filter region is grown well past the element: displacement pushes the
                // stroke outward and the blur spreads further still, and anything beyond the
                // region is cut rather than drawn.
                <filter key={id} id={id} x="-20%" y="-20%" width="140%" height="140%">
                  {/* Anisotropic on purpose — a much lower frequency across than down makes
                      the tears run along the line the way a discharge does, instead of
                      pebbling it evenly in both directions. */}
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.012 0.05"
                    numOctaves={2}
                    seed={seed}
                    result="noise"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="noise"
                    scale={9}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="bolt"
                  />
                  <feGaussianBlur in="bolt" stdDeviation={3} result="corona" />
                  {/* The corona twice, then the bolt on top: the glow needs to be brighter
                      than one pass of a 3px blur leaves it, and stacking the same result is
                      cheaper than a second blur at a wider radius. */}
                  <feMerge>
                    <feMergeNode in="corona" />
                    <feMergeNode in="corona" />
                    <feMergeNode in="bolt" />
                  </feMerge>
                </filter>
              ))}
            </defs>
            <rect className="electric-frame-bolt" width="100%" height="100%" rx="24" ry="24" />
          </svg>

          
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
              {language === 'ar' ? (
                <>شركة برمجية متخصصة في تطوير <span className="text-white underline decoration-zinc-700 underline-offset-8">المواقع والتطبيقات الإلكترونية</span></>
              ) : (
                <>Software Firm Specializing in <span className="text-white underline decoration-zinc-700 underline-offset-8">Websites & Digital Applications</span></>
              )}
            </h2>

            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
              {language === 'ar' ? (
                <>تُقدم شركة <strong className="text-white">NOVAIQ</strong> حلولاً برمجية متطورة للشركات والمؤسسات بأسعار شفافة بالدينار العراقي ومعايير جودة عالية.</>
              ) : (
                <><strong className="text-white">NOVAIQ</strong> delivers cutting-edge software solutions for enterprises with transparent IQD pricing and high standards.</>
              )}
            </p>
          </div>

          {/* Concise Capabilities List — nested under the intro instead of split into a
              side-by-side column, so the whole card reads as one centered block. */}
          <div ref={revealGroup} className="reveal-group grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 max-w-4xl mx-auto">
            {[
              {
                title: language === 'ar' ? 'تطوير منصات برمجية متكاملة' : 'Full-Stack Platform Engineering',
                desc: language === 'ar' ? 'تصميم وتنفيذ أنظمة ويب حديثة مخصصة لاحتياجات المؤسسات.' : 'Custom web system architecture & full deployment for modern enterprises.'
              },
              {
                title: language === 'ar' ? 'عقد رقمي رسمي لكل مشروع (IQD)' : 'A Formal Digital Contract for Every Project (IQD)',
                desc: language === 'ar' ? 'كل مشروع يُوثَّق باتفاقية واضحة تحدد التفاصيل الفنية والمالية وحقوق الطرفين قبل بدء العمل.' : 'Every project is documented with a clear agreement specifying technical/financial details and both parties\' rights before work begins.'
              },
              {
                title: language === 'ar' ? 'دعم فني ومتابعة دورية' : 'Ongoing Technical Support',
                desc: language === 'ar' ? 'تحديثات استقرار ومتابعة فنية بحسب الاتفاق المبرم بين الطرفين.' : 'System updates and technical follow-ups according to mutual agreement.'
              }
            ].map((item, idx) => (
              // Both halves of the reveal, the same pair the productivity panel wears:
              // `reveal-border` lights the edge nearest the pointer, `reveal-face` lifts the
              // surface under it, and both read the group's pointer so the light carries
              // across the gap onto the neighbouring card instead of stopping at this one's
              // edge. `hover:border-white/40` is long gone for a related reason: brightening
              // the whole border at once fights a light whose entire point is that one side
              // of it is brighter than the rest.
              <div
                key={idx}
                className="reveal-face reveal-border min-h-[190px] flex flex-col items-center justify-center p-5 rounded-xl bg-black border border-zinc-700 text-center transition-all"
              >
                <CheckCircle2 className="relative z-10 w-4 h-4 text-white mx-auto mb-2" />
                <h4 className="relative z-10 text-xs font-bold text-white">{item.title}</h4>
                <p className="relative z-10 text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
};
