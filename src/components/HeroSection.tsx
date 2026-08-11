import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Clock, Globe2, Award, ChevronLeft, ChevronRight } from 'lucide-react';

const WHEEL_STEP = 90;

// No navigation callbacks any more: the two buttons that used them are gone, and nothing
// else in the hero routes anywhere. The navbar and the section CTAs still do.
interface HeroSectionProps {
  language: 'ar' | 'en';
}

export const HeroSection: React.FC<HeroSectionProps> = ({ language }) => {
  // bgImage/bgSize are placeholder abstract patterns (grayscale, on-brand) standing in
  // for real photography until the client supplies per-guarantee images.
  //
  // Each of these used to carry a bright white overlay layer on top of its base gradient —
  // a diagonal sheen band, a radial hotspot pair, a conic sweep. Those were the glare on the
  // cube's faces: they blew out the middle of every face and left the icon and text sitting
  // in a white haze. Only the base gradient survives now, so each face is a clean, evenly
  // lit surface and what's printed on it stays fully legible.
  const guarantees = [
    {
      Icon: Clock,
      title: language === 'ar' ? 'تسليم سريع ومنظم' : 'Fast Delivery',
      desc: language === 'ar' ? 'منهجية برمجية واضحة ومحددة' : 'Clear timeline & sprints',
      bgImage: 'linear-gradient(135deg, #3f3f46, #09090b)',
      bgSize: 'cover',
    },
    {
      Icon: ShieldCheck,
      title: language === 'ar' ? 'مواصفات برمجية دقيقة' : 'Verified Specs',
      desc: language === 'ar' ? 'حقوق الكود كاملة مع الحفظ' : 'Full code ownership',
      bgImage: 'linear-gradient(160deg, #27272a, #000)',
      bgSize: 'cover',
    },
    {
      Icon: Award,
      title: language === 'ar' ? 'دعم فني متكامل' : 'Full Support',
      desc: language === 'ar' ? 'متابعة دورية حسب الاتفاق' : 'Ongoing technical SLA',
      bgImage: 'linear-gradient(180deg, #3f3f46, #000)',
      bgSize: 'cover',
    },
    {
      Icon: Globe2,
      title: language === 'ar' ? 'أداء فائق السرعة' : 'Blazing Performance',
      desc: language === 'ar' ? 'أحدث التقنيات لسرعة استثنائية' : 'Modern web tech stacks',
      bgImage: 'radial-gradient(circle, #27272a, #000)',
      bgSize: 'cover',
    },
  ];

  // Drag-to-spin state for the 3D guarantee wheel. `rotation` lives in a ref and is written
  // straight to the ring's style.transform on every pointermove — React state per frame is
  // exactly the main-thread churn that shows up as stutter on a weak device. The ref write
  // is one property on one element; React only re-renders when `isDragging` flips (twice per
  // gesture). `rotRef` is the live angle, `wheelRef` the ring it is written to.
  const [isDragging, setIsDragging] = useState(false);
  // Bumped only by a manual action (button click / drag release) to restart the autoplay
  // clock — the wheel's angle itself lives in `rotRef`, so no per-frame state is needed.
  const [tick, setTick] = useState(0);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const rotRef = useRef(0);
  const dragRef = useRef<{ startX: number; startRot: number } | null>(null);

  const writeRotation = (deg: number) => {
    rotRef.current = deg;
    const el = wheelRef.current;
    if (el) el.style.transform = `rotateY(${deg}deg)`;
  };

  const snapToStep = (deg: number) => Math.round(deg / WHEEL_STEP) * WHEEL_STEP;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, startRot: rotRef.current };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    writeRotation(drag.startRot + (e.clientX - drag.startX) * 0.5);
  };

  const stopDragging = () => {
    dragRef.current = null;
    setIsDragging(false);
    setTick((t) => t + 1);
    writeRotation(snapToStep(rotRef.current));
  };

  const rotateBy = (delta: number) => {
    dragRef.current = null;
    setIsDragging(false);
    setTick((t) => t + 1);
    writeRotation(snapToStep(rotRef.current) + delta);
  };

  // Auto-advance one face every 5s. Reads the ref, so nothing re-renders for it. Paused
  // while dragging, and skipped under reduced-motion — a stated preference, so it is
  // honoured. Depends on `tick` so a manual turn restarts the clock, the same "don't
  // auto-advance right on top of my input" the old rotation-state version gave us.
  //
  // Runs on every device. The turn is a rotateY on a preserve-3d ring — compositor work of
  // exactly the kind even modest hardware handles well, which is the same reason the hero's
  // WebGL cards stay smooth where painted CSS effects do not. It used to be switched off
  // whenever a capability probe decided the machine was weak, and the visible result was
  // simply that the wheel stopped turning by itself, permanently, after one stray hitch.
  useEffect(() => {
    if (isDragging) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      writeRotation(snapToStep(rotRef.current) + WHEEL_STEP);
    }, 5000);
    return () => window.clearInterval(id);
  }, [isDragging, tick]);

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
            <>Premium <span className="text-white underline decoration-zinc-700 decoration-2 underline-offset-8 font-black">Web &amp; Mobile</span> App Development</>
          )}
        </h1>

        {/* Description */}
        <p className="max-w-2xl text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal mb-6 text-center mx-auto">
          {language === 'ar'
            ? 'نحن في NOVAIQ نبتكر منصات رقمية فائقة السرعة والأمان. تصفح معرض قوالبنا الجاهزة لشركتك، أو تواصل معنا لصياغة نظام خاص ومخصص يلبي احتياجاتك بدقة واحترافية متكاملة.'
            : 'At NOVAIQ, we build high-performance, secure digital platforms. Explore our ready-made templates for your business, or contact us to build a custom application tailored exactly to your needs.'}
        </p>

        {/* The pair of primary buttons that used to sit here is gone at the customer's
            request. The spacing they carried is not: it separated the copy above from the
            wheel below, so it stays on the block that follows them. */}

        {/* Key Guarantees Wheel — a 3D cube of cards the visitor spins by dragging
            (mouse or touch) or with the arrow buttons pinned to the far edges of the
            row. DOM order is reversed on purpose: the page is dir="rtl", so the first
            child lands on the physical right. */}
        <div className="mt-14 sm:mt-16 flex items-center justify-center sm:justify-between w-full max-w-xs sm:max-w-xl lg:max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => rotateBy(-WHEEL_STEP)}
            aria-label={language === 'ar' ? 'التالي' : 'Next'}
            className="nq-btn nq-btn--solid hidden sm:flex shrink-0 w-10 h-10 rounded-full items-center justify-center cursor-pointer"
          >
            <span className="nq-btn-beam" aria-hidden="true" />
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
              ref={wheelRef}
              className={`wheel3d-ring${isDragging ? ' is-dragging' : ''}`}
            >
              {guarantees.map(({ Icon, title, desc, bgImage, bgSize }, i) => (
                <div
                  key={title}
                  className="wheel3d-item"
                  style={{ '--item-angle': `${i * 90}deg` } as React.CSSProperties}
                >
                  {/* No spotlight/glow here on purpose — the pointer-tracked light and the
                      box-shadow bloom both washed a white overlay across the icon and text on
                      hover, cutting their contrast. A plain border highlight communicates
                      "hovered" without dimming what's actually on the face. */}
                  <div className="group relative overflow-hidden h-full flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-950/90 border border-zinc-700 text-center hover:border-white/50 hover:bg-zinc-900/90 transition-all shadow-xl">
                    {/* Full opacity, not the 40% it faded to before: at 40% the face's image
                        was a washed-out ghost of itself blended with the card fill underneath.
                        Its gradient is dark enough on its own that the white text above it
                        keeps its contrast at full strength. */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ backgroundImage: bgImage, backgroundSize: bgSize }}
                    />
                    <div className="relative z-10 w-9 h-9 mb-2 rounded-xl bg-black border border-zinc-700 flex items-center justify-center text-white">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="relative z-10 text-base sm:text-lg lg:text-xl font-bold text-white mb-0.5">{title}</div>
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
            className="nq-btn nq-btn--solid hidden sm:flex shrink-0 w-10 h-10 rounded-full items-center justify-center cursor-pointer"
          >
            <span className="nq-btn-beam" aria-hidden="true" />
            <ChevronLeft className="w-4 h-4 ltr:rotate-180" />
          </button>
        </div>

      </div>
    </section>
  );
};

