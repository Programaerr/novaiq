import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { HeroDevices } from './HeroDevices';

interface HeroSectionProps {
  language: 'ar' | 'en';
  /** Takes the visitor into the template gallery — the one thing this section asks them to do. */
  onStart: () => void;
}

/**
 * The hero: a claim, a reason, one way in, and a picture of the thing being sold.
 *
 * ## Why it is laid out this way now
 *
 * It was a centred column of text over a full-bleed render of a ringed planet. That failed on
 * both halves. The artwork was cropped by whatever height the copy happened to need, so the
 * devices in it were sliced off at the frame edge and what remained was an enormous planet with
 * no relationship to anything being said. And the headline sat directly on the brightest part of
 * it, which is a contrast problem no amount of dimming solves without throwing the picture away.
 *
 * A hero does not need a backdrop. It needs to say what this company does and give one way to
 * proceed. So the render is now a subject rather than a background — a real product shot of a
 * laptop, a phone and a tablet, in its own column — and the copy sits beside it on clean ground
 * with the call to action directly under it, where the eye already is when it finishes reading.
 *
 * Stacked below `lg`, where two columns would leave neither enough room: copy first, because a
 * visitor who has just arrived reads before they look, and the picture immediately after it.
 */
export const HeroSection: React.FC<HeroSectionProps> = ({ language, onStart }) => {
  const isAr = language === 'ar';

  return (
    <section className="relative pt-4 pb-2 md:pt-8 md:pb-6 overflow-hidden">
      {/* Ambient glow, drawn as a radial gradient rather than a blurred circle: an animated 600px
          `blur(140px)` layer has to be re-rasterized by the GPU continuously, which is pure cost
          on a low-end device for something that looks the same either way. */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none animate-pulse-glow"
        style={{ backgroundImage: 'radial-gradient(circle closest-side, rgba(39,39,42,0.55) 0%, rgba(39,39,42,0.18) 45%, rgba(0,0,0,0) 78%)' }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-14 items-center">

        {/* ── The claim ──────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-start">
          <h1 className="text-3xl sm:text-5xl lg:text-[3.2rem] font-extrabold text-white tracking-tight leading-[1.15] mb-4 font-['Cairo']">
            {isAr ? (
              <>برمجة <span className="underline decoration-zinc-700 decoration-2 underline-offset-8 font-black">مواقع وتطبيقات</span></>
            ) : (
              <>Web &amp; <span className="underline decoration-zinc-700 decoration-2 underline-offset-8 font-black">App Development</span></>
            )}
          </h1>

          <p className="max-w-xl text-xs sm:text-sm text-zinc-300 leading-relaxed mb-7">
            {isAr
              ? 'نحن في NOVAIQ نبتكر منصات رقمية فائقة السرعة والأمان. تصفح معرض قوالبنا الجاهزة لشركتك، أو تواصل معنا لصياغة نظام خاص ومخصص يلبي احتياجاتك بدقة واحترافية متكاملة.'
              : 'At NOVAIQ, we build high-performance, secure digital platforms. Explore our ready-made templates for your business, or contact us to build a custom application tailored exactly to your needs.'}
          </p>

          {/* One action, not two. A hero with a pair of equally weighted buttons asks the visitor
              to make a decision before they know enough to make it; a single one tells them where
              to go next. The label says what happens when it is pressed. */}
          <button
            type="button"
            onClick={onStart}
            className="nq-btn nq-btn--solid px-7 py-3.5 rounded-full font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="nq-btn-beam" aria-hidden="true" />
            <span>{isAr ? 'ابدأ معنا' : 'Start with us'}</span>
            {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {/* ── The subject ────────────────────────────────────────────────────────────────
            Drawn, not photographed. The generated render put four devices in the frame overlapping
            each other and every screen came out blank white — a still cannot show a process, and a
            model composes what it likes. This is one laptop, one tablet and one phone, and the
            laptop is building a page. See HeroDevices.

            Standing on a studio sweep (.hero-stage): the hero itself stays transparent so the
            background reads through the copy, and the sweep only exists where the devices are,
            fading up from near-white under them to nothing before it reaches the headline. */}
        <div className="hero-stage">
          <HeroDevices />
        </div>

      </div>
    </section>
  );
};
