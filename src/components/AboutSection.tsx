import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Language } from '../lib/i18n';

interface AboutSectionProps {
  language?: Language;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ language = 'ar' }) => {
  // Windows/Fluent-style spotlight, same mechanic as the homepage feature squares:
  // pushes the cursor position straight into a CSS custom property via the DOM (no
  // setState) so the glow can track every frame without a React re-render.
  const handleSpotlightMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  };

  return (
    <section id="about-section" className="py-10 sm:py-14 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-zinc-950 p-5 sm:p-6 rounded-3xl border border-zinc-800 relative overflow-hidden shadow-2xl">
          
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 max-w-4xl mx-auto">
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
              <div
                key={idx}
                onMouseMove={handleSpotlightMove}
                className="spotlight-card min-h-[160px] flex flex-col items-center justify-center p-4 rounded-xl bg-black border border-zinc-800 hover:border-white/40 glow-white-hover text-center transition-all"
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
