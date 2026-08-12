import React from 'react';

// No navigation callbacks any more: the two buttons that used them are gone, and nothing
// else in the hero routes anywhere. The navbar and the section CTAs still do.
interface HeroSectionProps {
  language: 'ar' | 'en';
}

export const HeroSection: React.FC<HeroSectionProps> = ({ language }) => {
  return (
    // Bottom padding trimmed with the cube: it was clearing a tall 3D stage that is no longer
    // here, and the panel now following closely brings its own spacing.
    <section className="relative pt-4 pb-2 md:pt-6 md:pb-3 overflow-hidden">
      
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
            <>Premium <span className="text-white underline decoration-zinc-700 decoration-2 underline-offset-8 font-black">Web &amp; Mobile</span> App Development</>
          )}
        </h1>

        {/* Description */}
        <p className="max-w-2xl text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal mb-6 text-center mx-auto">
          {language === 'ar'
            ? 'نحن في NOVAIQ نبتكر منصات رقمية فائقة السرعة والأمان. تصفح معرض قوالبنا الجاهزة لشركتك، أو تواصل معنا لصياغة نظام خاص ومخصص يلبي احتياجاتك بدقة واحترافية متكاملة.'
            : 'At NOVAIQ, we build high-performance, secure digital platforms. Explore our ready-made templates for your business, or contact us to build a custom application tailored exactly to your needs.'}
        </p>

        {/* The guarantee cube that used to sit here is gone, and the card that replaced it now
            lives one block down in App.tsx, paired with the speed/efficiency panel. It was
            moved rather than merely swapped: on its own in the hero it left a wide band of
            empty page beside it, and the panel it now sits next to was the thing filling that
            space badly from further down. See the note at that grid. */}

      </div>
    </section>
  );
};

