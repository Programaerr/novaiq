import React from 'react';
import {
  Rocket,
  FileText,
  ShieldCheck,
  Clock,
  Globe2,
  Award
} from 'lucide-react';

interface HeroSectionProps {
  onExploreTemplates: () => void;
  onCreateContract: () => void;
  language: 'ar' | 'en';
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreTemplates,
  onCreateContract,
  language,
}) => {
  return (
    <section className="relative pt-4 pb-8 md:pt-6 md:pb-10 overflow-hidden">
      
      {/* Background Subtle Space Ambient Glow — drawn as a radial gradient instead of a
          blurred circle: an animated 600px `blur(140px)` layer had to be re-rasterized by
          the GPU continuously, which is pure cost on low-end devices for an effect that
          looks the same either way. */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none animate-pulse-glow"
        style={{ backgroundImage: 'radial-gradient(circle closest-side, rgba(39,39,42,0.55) 0%, rgba(39,39,42,0.18) 45%, rgba(0,0,0,0) 78%)' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center flex flex-col items-center">
        
        {/* Main Title - Centered */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.2] mb-3 font-['Cairo'] text-center">
          {language === 'ar' ? (
            <>برمجة وتطوير <span className="text-white underline decoration-zinc-700 decoration-2 underline-offset-8 font-black">التطبيقات والمواقع</span> المتكاملة</>
          ) : (
            <>Premium <span className="text-white underline decoration-zinc-700 decoration-2 underline-offset-8 font-black">Web & Mobile</span> App Development</>
          )}
        </h1>

        {/* Description */}
        <p className="max-w-2xl text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal mb-6 text-center mx-auto">
          {language === 'ar'
            ? 'نحن في NOVAIQ نبتكر منصات رقمية فائقة السرعة والأمان. تصفح معرض قوالبنا الجاهزة لشركتك، أو تواصل معنا لصياغة نظام خاص ومخصص يلبي احتياجاتك بدقة واحترافية متكاملة.'
            : 'At NOVAIQ, we build high-performance, secure digital platforms. Explore our ready-made templates for your business, or contact us to build a custom application tailored exactly to your needs.'}
        </p>

        {/* Primary Action Buttons - Seamless SPA transition */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 w-full">
          
          <button
            onClick={onExploreTemplates}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-sm white-btn-glow hover:scale-[1.01] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Rocket className="w-4 h-4 text-black" />
            <span>{language === 'ar' ? 'استكشاف القوالب الجاهزة' : 'Explore Ready Templates'}</span>
          </button>

          <button
            onClick={onCreateContract}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-black hover:bg-zinc-900 text-white font-extrabold text-sm border border-zinc-700 hover:border-white glow-white-hover hover:scale-[1.01] transition-all flex items-center justify-center gap-2.5 cursor-pointer tracking-wider"
          >
            <FileText className="w-4 h-4 text-zinc-300" />
            <span>{language === 'ar' ? 'ابدأ مشروعك' : 'START YOUR Project'}</span>
          </button>
        </div>

        {/* Key Guarantees Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          
          <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-right hover:border-white/50 glow-white-hover hover:bg-zinc-900/90 transition-all group shadow-xl">
            <div className="w-9 h-9 mb-2 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-white">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-white font-mono mb-0.5">{language === 'ar' ? 'تسليم سريع ومنظم' : 'Fast Delivery'}</div>
            <div className="text-[11px] text-zinc-400">{language === 'ar' ? 'منهجية برمجية واضحة ومحددة' : 'Clear timeline & sprints'}</div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-right hover:border-white/50 glow-white-hover hover:bg-zinc-900/90 transition-all group shadow-xl">
            <div className="w-9 h-9 mb-2 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-white font-mono mb-0.5">{language === 'ar' ? 'مواصفات برمجية دقيقة' : 'Verified Specs'}</div>
            <div className="text-[11px] text-zinc-400">{language === 'ar' ? 'حقوق الكود كاملة مع الحفظ' : 'Full code ownership'}</div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-right hover:border-white/50 glow-white-hover hover:bg-zinc-900/90 transition-all group shadow-xl">
            <div className="w-9 h-9 mb-2 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-white">
              <Award className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-white font-mono mb-0.5">{language === 'ar' ? 'دعم فني متكامل' : 'Full Support'}</div>
            <div className="text-[11px] text-zinc-400">{language === 'ar' ? 'متابعة دورية حسب الاتفاق' : 'Ongoing technical SLA'}</div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-right hover:border-white/50 glow-white-hover hover:bg-zinc-900/90 transition-all group shadow-xl">
            <div className="w-9 h-9 mb-2 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-white">
              <Globe2 className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold text-white font-mono mb-0.5">{language === 'ar' ? 'أداء فائق السرعة' : 'Blazing Performance'}</div>
            <div className="text-[11px] text-zinc-400">{language === 'ar' ? 'أحدث التقنيات لسرعة استثنائية' : 'Modern web tech stacks'}</div>
          </div>

        </div>

      </div>
    </section>
  );
};

