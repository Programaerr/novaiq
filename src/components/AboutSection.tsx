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
            
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                {language === 'ar' ? (
                  <>شركة برمجية متخصصة في تطوير <span className="text-white underline decoration-zinc-700 underline-offset-8">المنصات والعقود الرقمية</span></>
                ) : (
                  <>Software Firm Specializing in <span className="text-white underline decoration-zinc-700 underline-offset-8">Platforms & Digital Contracts</span></>
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

            {/* Concise Capabilities List */}
            <div className="space-y-3">
              {[
                { 
                  title: language === 'ar' ? 'تطوير منصات برمجية متكاملة' : 'Full-Stack Platform Engineering', 
                  desc: language === 'ar' ? 'تصميم وتنفيذ أنظمة ويب حديثة مخصصة لاحتياجات المؤسسات.' : 'Custom web system architecture & full deployment for modern enterprises.' 
                },
                { 
                  title: language === 'ar' ? 'توثيق عقود إلكترونية رسمية (IQD)' : 'Official Digital Contracts System (IQD)', 
                  desc: language === 'ar' ? 'نظام عقود رقمي معتمد يحدد كافة التفاصيل الفنية والمالية وحقوق الطرفين.' : 'Legally binding digital agreement engine specifying all specs, timelines & rights.' 
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
