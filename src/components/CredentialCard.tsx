import React, { useEffect, useRef } from 'react';
import { ShieldCheck, Clock, Globe2, Award, Signal } from 'lucide-react';
import { NovaiqLogo } from './NovaiqLogo';

interface CredentialCardProps {
  language: 'ar' | 'en';
}

/**
 * The hero's centrepiece: a smart-card built as an actual solid, turnable in every direction.
 *
 * It replaces the 3D guarantee cube that used to sit here. The cube's problem was not how it
 * looked but what it did — it turned itself every five seconds whether or not anyone was
 * reading it, so three of its four faces were always hidden and the one facing you could be
 * taken away mid-sentence. This turns only when someone turns it.
 *
 * ## Why it is six elements and not one
 *
 * A single rotated rectangle is a picture of a card, and it gives itself away the moment it
 * passes side-on: it thins to an invisible line, because a plane has no thickness. This is
 * built as a real box instead — a printed front, a branded back, and four edge strips joining
 * them — inside a `preserve-3d` body. Turn it side-on and you see its edge, exactly as you
 * would holding one. That is the whole reason the geometry below is worth its complexity.
 *
 * The edges are hinged rather than positioned by half-width, and that is what makes the box
 * work at any size: each strip sits flush against one border of the front face (`left: 100%`
 * for the right edge, and so on) and rotates 90° about that shared border, so it reaches back
 * to meet the rear face without anything needing to know the card's pixel width. The card can
 * then be sized purely by CSS aspect-ratio and the solid stays correctly assembled.
 *
 * ## The gesture
 *
 * Free rotation on both axes with no clamp — a solid has no wrong side now, so there is
 * nothing to protect the visitor from. Angles are accumulated from where the drag began and
 * kept when it ends: the card holds the position it was left in, the way a real object does,
 * rather than springing back and undoing what the person just did.
 *
 * Angles are written as CSS custom properties and consumed by one `transform`, so a move costs
 * one style write and one compositor transform — no React state per frame, no layout, no
 * paint. Moves are coalesced into a frame, because a pointer stream fires well above the
 * refresh rate.
 */
export const CredentialCard: React.FC<CredentialCardProps> = ({ language }) => {
  const isAr = language === 'ar';
  const cardRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const angle = useRef({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; ax: number; ay: number } | null>(null);

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

  const flush = () => {
    frame.current = 0;
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--tilt-x', `${angle.current.x}deg`);
    el.style.setProperty('--tilt-y', `${angle.current.y}deg`);
  };

  const turnTo = (x: number, y: number) => {
    angle.current = { x, y };
    if (frame.current) return;
    frame.current = requestAnimationFrame(flush);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    drag.current = { px: e.clientX, py: e.clientY, ax: angle.current.x, ay: angle.current.y };
    // The easing comes off for the duration of the turn. It exists so the intro lean glides,
    // but during a drag it puts 400ms between the finger and the card, which feels like
    // dragging something through treacle rather than turning it. Toggled straight on the node:
    // a state flip would re-render the whole card twice per gesture to change one class.
    el.classList.add('is-turning');
    // Capture so a turn that wanders off the card keeps working — without it the card stops
    // dead the moment the pointer crosses its edge, which reads as the gesture breaking.
    el.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    // Vertical drag turns it about X, horizontal about Y — the axes a hand expects. Unclamped:
    // past 90° the front hides itself and the back comes into view, which is correct for a
    // solid and is the point of having built one.
    turnTo(d.ax - (e.clientY - d.py) * 0.35, d.ay + (e.clientX - d.px) * 0.4);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    cardRef.current?.classList.remove('is-turning');
    cardRef.current?.releasePointerCapture?.(e.pointerId);
  };

  // A single lean-and-settle shortly after the card appears.
  //
  // Nothing announces that a flat rectangle can be picked up and turned, and on a phone there
  // is no cursor to discover it with — without this the interaction exists but goes unfound.
  // One deliberate movement is enough: it shows the card has thickness and a lit edge, then
  // stops. A loop would be the spinning cube again, which is exactly what this replaced.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lean = window.setTimeout(() => {
      if (!drag.current) turnTo(-8, 22);
    }, 700);
    const settle = window.setTimeout(() => {
      if (!drag.current) turnTo(0, 0);
    }, 1700);
    return () => {
      clearTimeout(lean);
      clearTimeout(settle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (frame.current) cancelAnimationFrame(frame.current);
  }, []);

  return (
    // Perspective lives on the stage, not on the card. Declared on the card itself the
    // vanishing point turns along with it, and the lean visibly flattens at exactly the angles
    // it should be strongest.
    <div className="credential-stage w-full max-w-md mx-auto">
      <div
        ref={cardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={
          isAr
            ? 'بطاقة ضمانات NOVAIQ — تسليم سريع، مواصفات دقيقة، دعم متكامل، أداء فائق'
            : 'NOVAIQ guarantees card — fast delivery, precise specs, full support, high performance'
        }
        className="credential-card relative w-full aspect-[1.586/1] select-none"
      >
        {/* ── Front ─────────────────────────────────────────────────────────────────── */}
        <div className="credential-face credential-face--front rounded-3xl border border-white/15 overflow-hidden">
          {/* A fixed gradient, painted once — no moving centre, nothing to re-rasterise as the
              card turns, which is what keeps the whole gesture a compositor transform. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(120% 110% at 12% 8%, #2b2b31 0%, #131317 42%, #08080a 100%)',
            }}
          />

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

          <div className="credential-sheen absolute inset-0 pointer-events-none" aria-hidden="true" />

          <div className="relative z-10 h-full flex flex-col justify-between p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm sm:text-lg font-black tracking-[0.2em] sm:tracking-[0.22em] text-white">
                NOVAIQ
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* The chip. Four contact pads on a metallic plate — enough to read as a chip
                    without pretending to be a photograph of one. */}
                <div className="w-7 h-5 sm:w-10 sm:h-8 rounded sm:rounded-md bg-gradient-to-br from-zinc-300 to-zinc-500 grid grid-cols-2 grid-rows-2 gap-px p-px overflow-hidden">
                  <span className="bg-zinc-800/70 rounded-[2px]" />
                  <span className="bg-zinc-800/50 rounded-[2px]" />
                  <span className="bg-zinc-800/50 rounded-[2px]" />
                  <span className="bg-zinc-800/70 rounded-[2px]" />
                </div>
                <Signal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 rotate-90" aria-hidden="true" />
              </div>
            </div>

            {/* Two columns at every size, because four rows cannot fit a 1.586:1 card on a
                phone. What gives way instead is the second line: each guarantee keeps its icon
                and title and drops the description below sm. The title alone is the guarantee;
                the description is elaboration, and a card has no room for elaboration. */}
            <ul className="grid grid-cols-2 gap-x-2.5 sm:gap-x-3 gap-y-2 sm:gap-y-2.5">
              {guarantees.map(({ Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-1.5 sm:gap-2">
                  <span className="mt-px sm:mt-0.5 shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-white/8 border border-white/15 flex items-center justify-center text-white">
                    <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] sm:text-xs font-bold text-white leading-snug">
                      {title}
                    </span>
                    <span className="hidden sm:block text-[10px] text-zinc-400 leading-tight mt-0.5">
                      {desc}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-end justify-end">
              <div className="text-[8px] sm:text-[9px] text-zinc-500 tracking-[0.14em] sm:tracking-[0.16em] uppercase text-end">
                {isAr ? 'شركة برمجية عراقية' : 'Iraqi software studio'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Back ──────────────────────────────────────────────────────────────────────
            Deliberately plain. A back that repeated the front's contents would look like a
            mistake; a real card's reverse carries a magnetic stripe and a mark, so this does
            the same — and it means turning the card all the way round has something to arrive
            at rather than a blank. */}
        <div className="credential-face credential-face--back rounded-3xl border border-white/12 overflow-hidden bg-[#0b0b0e]">
          <div className="absolute inset-x-0 top-[16%] h-[22%] bg-gradient-to-b from-zinc-900 via-black to-zinc-900" />
          <div className="absolute inset-0 flex flex-col items-center justify-end gap-2 p-4 sm:p-6">
            <NovaiqLogo size={26} showText={false} />
            <div className="text-[8px] sm:text-[9px] text-zinc-600 tracking-[0.2em] uppercase">
              novaiq.space
            </div>
          </div>
        </div>

        {/* ── The four edges that make it a solid ────────────────────────────────────────
            Each is hinged flush against one border of the front face and folded back 90° to
            meet the rear, so the box assembles itself at whatever size the card happens to be.
            aria-hidden: they are the thickness of an object, not content. */}
        <div className="credential-edge credential-edge--right" aria-hidden="true" />
        <div className="credential-edge credential-edge--left" aria-hidden="true" />
        <div className="credential-edge credential-edge--top" aria-hidden="true" />
        <div className="credential-edge credential-edge--bottom" aria-hidden="true" />
      </div>
    </div>
  );
};

export default CredentialCard;
