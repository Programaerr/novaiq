import React, { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { templatesData } from '../data/templatesData';
import { isLowEndDevice } from '../lib/deviceQuality';

// three.js + fiber + drei are a large dependency. Kept behind React.lazy
// so they land in their own chunk and never block the initial page parse, and only mounted
// once the browser goes idle after first paint — the hero's text and CTA are what matter
// on load, not the WebGL scene under them.
const TemplateCards3D = lazy(() => import('./TemplateCards3D'));

interface FloatingTemplateCardsProps {
  language: 'ar' | 'en';
  onExploreTemplates: () => void;
}

const STATIC_PREVIEW = templatesData.slice(0, 3);

export const FloatingTemplateCards: React.FC<FloatingTemplateCardsProps> = ({
  language,
  onExploreTemplates,
}) => {
  const [showCanvas, setShowCanvas] = useState(false);

  useEffect(() => {
    // A WebGL scene runs its own render loop regardless of what CSS animations honour, so
    // reduced-motion has to be checked before mounting it, not styled around afterwards.
    // Same for low-end GPUs — a continuous 60fps WebGL render loop on a weak device just
    // keeps competing with scroll for the same bus; the static preview reads the same.
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      isLowEndDevice()
    ) return;

    const show = () => setShowCanvas(true);
    // Checked via `typeof window.x` rather than `'x' in window`: the `in` form narrows
    // `window` itself, and since lib.dom declares requestIdleCallback the else branch
    // narrows to `never` and every call on it fails to compile.
    const hasIdle = typeof window.requestIdleCallback === 'function';
    const id = hasIdle
      ? window.requestIdleCallback(show, { timeout: 1800 })
      : window.setTimeout(show, 400);

    return () => {
      if (hasIdle) {
        window.cancelIdleCallback(id);
      } else {
        window.clearTimeout(id);
      }
    };
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto mt-16 sm:mt-24 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-10">
      {/* 3D stage. The fixed height is reserved up front so the hero never reflows when the
          canvas finishes loading. */}
      <div className="w-full sm:w-[30rem] h-72 sm:h-[26rem] shrink-0 select-none">
        {showCanvas ? (
          <Suspense fallback={null}>
            <TemplateCards3D />
          </Suspense>
        ) : (
          // Static stand-in for reduced-motion and for the moment before the canvas mounts.
          <div className="w-full h-full flex items-center justify-center gap-3">
            {STATIC_PREVIEW.map((tpl) => (
              <img
                key={tpl.id}
                src={tpl.previewImage}
                alt=""
                aria-hidden="true"
                draggable={false}
                loading="lazy"
                decoding="async"
                className="w-24 h-32 sm:w-28 sm:h-40 object-cover rounded-xl border border-zinc-700 opacity-80"
              />
            ))}
          </div>
        )}
      </div>

      {/* Text + single CTA, fully separate from the cards. */}
      <div className="text-center sm:text-start max-w-sm">
        <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
          {language === 'ar' ? 'قوالب جاهزة لكل قطاع' : 'Ready Templates, Every Industry'}
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-5">
          {language === 'ar'
            ? 'تصفح مجموعة قوالبنا الاحترافية المصممة خصيصاً لقطاعك، وابدأ مشروعك خلال أيام بدل أسابيع.'
            : 'Browse our professional templates built for your industry, and launch your project in days instead of weeks.'}
        </p>
        <button
          type="button"
          onClick={onExploreTemplates}
          className="nq-btn nq-btn--solid px-6 py-3 rounded-full font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="nq-btn-beam" aria-hidden="true" />
          <span>{language === 'ar' ? 'استكشاف القوالب' : 'Explore Templates'}</span>
          {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
