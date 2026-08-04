import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Language } from '../lib/i18n';

interface AboutSectionProps {
  language?: Language;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ language = 'ar' }) => {
  return (
    <section id="about-section" className="py-4 sm:py-6 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-zinc-950 p-5 sm:p-6 rounded-3xl border border-zinc-800 relative overflow-hidden shadow-2xl">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            
            <div className="group relative overflow-hidden space-y-4">
              {/* Giant wordmark watermark — sits behind the heading/paragraph, barely
                  visible at rest (still faintly there on mobile, which has no hover) and
                  brightens slightly on hover for a subtle "premium" reveal. */}
              <span
                aria-hidden="true"
                className="pointer-events-none select-none absolute -top-3 sm:-top-6 -right-2 sm:-right-4 text-[4.5rem] sm:text-[7rem] lg:text-[8.5rem] font-black tracking-widest text-white opacity-[0.04] group-hover:opacity-[0.09] transition-opacity duration-700 whitespace-nowrap font-mono"
              >
                NOVAIQ
              </span>

              <h2 className="relative text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                {language === 'ar' ? (
                  <>شركة برمجية متخصصة في تطوير <span className="text-white underline decoration-zinc-700 underline-offset-8">المواقع والتطبيقات الإلكترونية</span></>
                ) : (
                  <>Software Firm Specializing in <span className="text-white underline decoration-zinc-700 underline-offset-8">Websites & Digital Applications</span></>
                )}
              </h2>

              <p className="relative text-zinc-300 text-xs sm:text-sm leading-relaxed">
                {language === 'ar' ? (
                  <>تُقدم شركة <strong className="text-white">NOVAIQ</strong> حلولاً برمجية متطورة للشركات والمؤسسات بأسعار شفافة بالدينار العراقي ومعايير جودة عالية.</>
                ) : (
                  <><strong className="text-white">NOVAIQ</strong> delivers cutting-edge software solutions for enterprises with transparent IQD pricing and high standards.</>
                )}
              </p>
            </div>

            {/* Concise Capabilities List */}
            <div className="space-y-3">
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
                <div key={idx} className="p-4 rounded-xl bg-black border border-zinc-800 hover:border-white/40 glow-white-hover flex items-start gap-3 transition-all">
                  <CheckCircle2 className="w-4 h-4 text-white shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
