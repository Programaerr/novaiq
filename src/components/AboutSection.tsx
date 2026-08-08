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
        
        {/* No electric-frame here on purpose — its pulsing border glow was the "light around
            the card" effect asked to be removed from this section. A static border keeps the
            card visibly separated from the page without animating on its own. */}
        <div className="bg-zinc-950 p-5 sm:p-6 rounded-3xl border border-zinc-700 relative overflow-hidden shadow-2xl">
          
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
