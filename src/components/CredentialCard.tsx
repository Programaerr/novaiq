import React, { useRef } from 'react';
import { ShieldCheck, Clock, Globe2, Award, Signal } from 'lucide-react';

interface CredentialCardProps {
  language: 'ar' | 'en';
}

/**
 * The hero's centrepiece: a smart-card rendered as a real object rather than a picture of one.
 *
 * It replaces the 3D guarantee cube that used to sit here. The cube's problem was not how it
 * looked but what it did — it turned itself every five seconds whether or not anyone was
 * reading it, so three of its four faces were always hidden and the one facing you could be
 * taken away mid-sentence. Four guarantees printed on one card say the same thing at once, and
 * nothing has to be waited for.
 *
 * ## The tilt
 *
 * Depth comes from the pointer, not from a timer: the card leans towards wherever the cursor is
 * and returns to flat when it leaves. That keeps the motion something the visitor causes rather
 * than something that happens at them, which is the distinction the spinning cube got wrong.
 *
 * Angles are written as CSS custom properties on the element and consumed by a single
 * `transform` in index.css, so a pointer move costs one style write and one compositor
 * transform — no React state per frame, no layout, no paint. Moves are coalesced into a frame,
 * because a pointer stream fires well above the refresh rate and the extra events cannot draw
 * anything the next frame would not.
 *
 * On touch this does nothing at all, deliberately: a finger on the card IS the tap that would
 * otherwise be a hover, and tilting under it would only obscure what the tap is meant to show.
 * Under `prefers-reduced-motion` the CSS drops the transition and the card simply stays flat.
 */
export const CredentialCard: React.FC<CredentialCardProps> = ({ language }) => {
  const isAr = language === 'ar';
  const cardRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const next = useRef({ x: 0, y: 0 });

  const guarantees = [
    {
      Icon: Clock,
      title: isAr ? 'تسليم سريع ومنظم' : 'Fast, structured delivery',
      desc: isAr ? 'منهجية برمجية واضحة ومحددة' : 'Clear timeline and sprints',
    },
    {
      Icon: ShieldCheck,
      title: isAr ? 'مواصفات برمجية دقيقة' : 'Precise technical specs',
      desc: isAr ? 'حقوق الكود كاملة مع الحفظ' : 'Full code ownership',
    },
    {
      Icon: Award,
      title: isAr ? 'دعم فني متكامل' : 'Complete technical support',
      desc: isAr ? 'متابعة دورية حسب الاتفاق' : 'Ongoing technical SLA',
    },
    {
      Icon: Globe2,
      title: isAr ? 'أداء فائق السرعة' : 'Blazing performance',
      desc: isAr ? 'أحدث التقنيات لسرعة استثنائية' : 'Modern web tech stacks',
    },
  ];

  const applyTilt = () => {
    frame.current = 0;
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--tilt-x', `${next.current.x}deg`);
    el.style.setProperty('--tilt-y', `${next.current.y}deg`);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // -0.5 → 0.5 across each axis, then scaled to a deliberately small angle. Past about 8°
    // the card stops reading as a solid object catching the light and starts reading as a
    // picture being waved about.
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    next.current = { x: -py * 9, y: px * 12 };
    if (frame.current) return;
    frame.current = requestAnimationFrame(applyTilt);
  };

  const resetTilt = () => {
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
  };

  return (
    // The perspective lives on the wrapper rather than the card, so the vanishing point stays
    // put while the card turns inside it. Declared on the card itself, the perspective rotates
    // along with it and the lean flattens out at exactly the angles it should be strongest.
    <div className="credential-stage w-full max-w-md mx-auto">
      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        className="credential-card relative w-full aspect-[1.586/1] min-h-[290px] sm:min-h-[330px] rounded-3xl border border-white/15 overflow-hidden select-none"
      >
        {/* The surface. A fixed gradient, painted once — no moving centre, nothing to
            re-rasterise as the card turns, which is what keeps the tilt a pure compositor
            transform on a weak GPU. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(120% 110% at 12% 8%, #2b2b31 0%, #131317 42%, #08080a 100%)',
          }}
        />

        {/* Circuit traces — the one decorative flourish, drawn as an SVG rather than images so
            it stays crisp at any card size and costs a single element. */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.18]"
          viewBox="0 0 400 252"
          fill="none"
          aria-hidden="true"
        >
          <path d="M0 60h96l18 18h74" stroke="#fff" strokeWidth="1" />
          <path d="M400 96h-72l-16-16h-58" stroke="#fff" strokeWidth="1" />
          <path d="M0 190h120l22-22h96" stroke="#fff" strokeWidth="1" />
          <path d="M400 210h-90l-18-18h-40" stroke="#fff" strokeWidth="1" />
          <circle cx="188" cy="78" r="2.5" fill="#fff" />
          <circle cx="254" cy="80" r="2.5" fill="#fff" />
          <circle cx="238" cy="168" r="2.5" fill="#fff" />
          <circle cx="252" cy="192" r="2.5" fill="#fff" />
        </svg>

        {/* The sheen. Sits above the surface and below the content, and moves only with the
            card's own transform — it is a static highlight on a turning object, not an
            animation of its own. */}
        <div
          className="credential-sheen absolute inset-0 pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base sm:text-lg font-black tracking-[0.22em] text-white">
                NOVAIQ
              </div>
              <div className="text-[10px] text-zinc-400 tracking-wide mt-0.5">
                {isAr ? 'بطاقة ضمانات التنفيذ' : 'Delivery guarantee card'}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* The chip. Four contact pads on a metallic plate — enough to read as a chip
                  without pretending to be a photograph of one. */}
              <div className="w-9 h-7 sm:w-10 sm:h-8 rounded-md bg-gradient-to-br from-zinc-300 to-zinc-500 grid grid-cols-2 grid-rows-2 gap-px p-px overflow-hidden">
                <span className="bg-zinc-800/70 rounded-[2px]" />
                <span className="bg-zinc-800/50 rounded-[2px]" />
                <span className="bg-zinc-800/50 rounded-[2px]" />
                <span className="bg-zinc-800/70 rounded-[2px]" />
              </div>
              <Signal className="w-4 h-4 text-zinc-400 rotate-90" aria-hidden="true" />
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {guarantees.map(({ Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 w-6 h-6 rounded-lg bg-white/8 border border-white/15 flex items-center justify-center text-white">
                  <Icon className="w-3 h-3" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] sm:text-xs font-bold text-white leading-tight">
                    {title}
                  </span>
                  <span className="block text-[10px] text-zinc-400 leading-tight mt-0.5">
                    {desc}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-end justify-between gap-3 pt-1">
            <div className="font-mono text-[11px] sm:text-xs text-zinc-300 tracking-[0.18em]">
              •••• •••• •••• 2026
            </div>
            <div className="text-[9px] text-zinc-500 tracking-[0.16em] uppercase text-end">
              {isAr ? 'شركة برمجية عراقية' : 'Iraqi software studio'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CredentialCard;
