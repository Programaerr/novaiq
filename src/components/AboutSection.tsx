import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Language } from '../lib/i18n';

interface AboutSectionProps {
  language?: Language;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ language = 'ar' }) => {
  return (
    <section id="about-section" className="relative">
      {/* No vertical padding here. The home page sets the gap between sections with a single
          `space-y` (see App.tsx) — a section that also pads itself adds to that gap on both
          sides, so this one break came out half again as wide as the others. Spacing between
          blocks belongs to whatever is stacking them, not to the blocks. */}
      <div className="nq-container">
        
        {/* The border itself glints — see .solid-shimmer. No overflow-hidden: the shimmer
            ring sits at inset:-1px, on the border and therefore outside the padding box a
            clip would cut at. Nothing in this panel needed the clip. */}
        <div className="solid-shimmer p-5 sm:p-6 rounded-3xl border border-zinc-700 shadow-2xl">

          
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
              {language === 'ar' ? (
                <>شركة متخصصة في تطوير <span className="text-white underline decoration-zinc-700 underline-offset-8">المواقع والتطبيقات</span></>
              ) : (
                <>A firm specialised in <span className="text-white underline decoration-zinc-700 underline-offset-8">web &amp; app development</span></>
              )}
            </h2>

            {/* No price claim in the introduction. This line used to promise "transparent pricing
                in Iraqi dinars", which is a commitment the section cannot keep on its own — the
                figure a customer actually pays is negotiated on the contract, not published here. */}
            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
              {language === 'ar'
                ? 'تُقدم الشركة حلولاً برمجية متطورة للشركات والمؤسسات بمعايير جودة عالية.'
                : 'The firm delivers advanced software solutions for companies and institutions, to high quality standards.'}
            </p>
          </div>

          {/* Concise Capabilities List — nested under the intro instead of split into a
              side-by-side column, so the whole card reads as one centered block. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 sm:mt-14 max-w-4xl mx-auto">
            {[
              // Titles trimmed to the thing itself. "A Formal Digital Contract for Every Project
              // (IQD)" was a heading carrying a qualifier, a scope and a currency — and "رسمي"
              // in particular is a word this contract must not use about itself: it is a private
              // agreement between two parties, not an officially certified document.
              {
                title: language === 'ar' ? 'منصات متكاملة' : 'Complete platforms',
                desc: language === 'ar' ? 'تصميم وتنفيذ أنظمة ويب حديثة مخصصة لاحتياجات المؤسسات.' : 'Modern web systems, designed and built around what an organisation actually needs.'
              },
              {
                title: language === 'ar' ? 'عقد رقمي' : 'Digital contract',
                desc: language === 'ar' ? 'كل مشروع يُوثَّق باتفاقية واضحة تحدد التفاصيل الفنية والمالية وحقوق الطرفين قبل بدء العمل.' : "Every project is documented in a clear agreement setting out the technical and financial details and both parties' rights before work begins."
              },
              {
                title: language === 'ar' ? 'دعم فني ومتابعة' : 'Support & follow-up',
                desc: language === 'ar' ? 'متابعة فنية بحسب الاتفاق بين الطرفين.' : 'Technical follow-up as agreed between the two parties.'
              }
            ].map((item, idx) => (
              <div
                key={idx}
                className="nq-card nq-card--hover min-h-[190px] flex flex-col items-center justify-center p-5 text-center"
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
