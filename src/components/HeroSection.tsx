import React, { useEffect, useRef, useState } from 'react';
import {
  Rocket,
  FileText,
  ShieldCheck,
  Clock,
  Globe2,
  Award,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const WHEEL_STEP = 90;

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
  // bgImage/bgSize are placeholder abstract patterns (grayscale, on-brand) standing in
  // for real photography until the client supplies per-guarantee images.
  const guarantees = [
    {
      Icon: Clock,
      title: language === 'ar' ? 'تسليم سريع ومنظم' : 'Fast Delivery',
      desc: language === 'ar' ? 'منهجية برمجية واضحة ومحددة' : 'Clear timeline & sprints',
      bgImage:
        'linear-gradient(115deg, transparent 0%, transparent 42%, rgba(255,255,255,0.4) 50%, transparent 58%, transparent 100%), linear-gradient(135deg, #3f3f46, #09090b)',
      bgSize: 'auto, cover',
    },
    {
      Icon: ShieldCheck,
      title: language === 'ar' ? 'مواصفات برمجية دقيقة' : 'Verified Specs',
      desc: language === 'ar' ? 'حقوق الكود كاملة مع الحفظ' : 'Full code ownership',
      bgImage:
        'linear-gradient(rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(160deg, #27272a, #000)',
      bgSize: '22px 22px, 22px 22px, cover',
    },
    {
      Icon: Award,
      title: language === 'ar' ? 'دعم فني متكامل' : 'Full Support',
      desc: language === 'ar' ? 'متابعة دورية حسب الاتفاق' : 'Ongoing technical SLA',
      bgImage:
        'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.45), transparent 45%), radial-gradient(circle at 72% 68%, rgba(255,255,255,0.22), transparent 50%), linear-gradient(180deg, #3f3f46, #000)',
      bgSize: 'cover, cover, cover',
    },
    {
      Icon: Globe2,
      title: language === 'ar' ? 'أداء فائق السرعة' : 'Blazing Performance',
      desc: language === 'ar' ? 'أحدث التقنيات لسرعة استثنائية' : 'Modern web tech stacks',
      bgImage:
        'conic-gradient(from 0deg, rgba(255,255,255,0.3), transparent 20%, rgba(255,255,255,0.18) 40%, transparent 60%, rgba(255,255,255,0.25) 80%, transparent 100%), radial-gradient(circle, #27272a, #000)',
      bgSize: 'cover, cover',
    },
  ];

  // Drag-to-spin state for the 3D guarantee wheel — dragRef holds the pointer's
  // starting position and the wheel's rotation at that moment, so onPointerMove can
  // compute an absolute rotation instead of accumulating drift from relative deltas.
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startRotation: number } | null>(null);

  const snapToStep = (deg: number) => Math.round(deg / WHEEL_STEP) * WHEEL_STEP;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startRotation: rotation };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;
    setRotation(dragRef.current.startRotation + deltaX * 0.5);
  };

  const stopDragging = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    setRotation((r) => snapToStep(r));
  };

  const rotateBy = (delta: number) => {
    dragRef.current = null;
    setIsDragging(false);
    setRotation((r) => snapToStep(r) + delta);
  };

  // Auto-advance one face every 5s. Depending on `rotation` restarts the timer after
  // any manual click/drag, so the wheel never auto-advances right on top of the visitor's
  // own input. Paused while dragging and skipped entirely under reduced-motion.
  useEffect(() => {
    if (isDragging) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setRotation((r) => snapToStep(r) + WHEEL_STEP);
    }, 5000);
    return () => window.clearInterval(id);
  }, [isDragging, rotation]);

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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20 sm:mb-24 w-full">
          
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

        {/* Key Guarantees Wheel — a 3D cube of cards the visitor spins by dragging
            (mouse or touch) or with the arrow buttons pinned to the far edges of the
            row. DOM order is reversed on purpose: the page is dir="rtl", so the first
            child lands on the physical right. */}
        <div className="flex items-center justify-center sm:justify-between w-full max-w-xs sm:max-w-xl lg:max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => rotateBy(-WHEEL_STEP)}
            aria-label={language === 'ar' ? 'التالي' : 'Next'}
            className="hidden sm:flex shrink-0 w-10 h-10 rounded-full bg-zinc-950/90 border border-zinc-800 items-center justify-center text-white hover:border-white/50 glow-white-hover transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 ltr:rotate-180" />
          </button>

          <div
            className="wheel3d-stage"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
          >
            <div
              className={`wheel3d-ring${isDragging ? ' is-dragging' : ''}`}
              style={{ transform: `rotateY(${rotation}deg)` }}
            >
              {guarantees.map(({ Icon, title, desc, bgImage, bgSize }, i) => (
                <div
                  key={title}
                  className="wheel3d-item"
                  style={{ '--item-angle': `${i * 90}deg` } as React.CSSProperties}
                >
                  <div className="group relative overflow-hidden h-full flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-center hover:border-white/50 glow-white-hover hover:bg-zinc-900/90 transition-all shadow-xl">
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
                      style={{ backgroundImage: bgImage, backgroundSize: bgSize }}
                    />
                    <div className="relative z-10 w-9 h-9 mb-2 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-white">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="relative z-10 text-base sm:text-lg lg:text-xl font-bold text-white font-mono mb-0.5">{title}</div>
                    <div className="relative z-10 text-[10px] sm:text-[11px] text-zinc-400">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => rotateBy(WHEEL_STEP)}
            aria-label={language === 'ar' ? 'السابق' : 'Previous'}
            className="hidden sm:flex shrink-0 w-10 h-10 rounded-full bg-zinc-950/90 border border-zinc-800 items-center justify-center text-white hover:border-white/50 glow-white-hover transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 ltr:rotate-180" />
          </button>
        </div>

      </div>
    </section>
  );
};

