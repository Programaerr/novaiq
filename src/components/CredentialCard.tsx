import React, { useEffect, useRef } from 'react';
import { ShieldCheck, Clock, Globe2, Award, Signal } from 'lucide-react';

interface CredentialCardProps {
  language: 'ar' | 'en';
}

/** How far the card may lean, in degrees — see "Why the turn is clamped" below. */
const MAX_X = 30;
const MAX_Y = 38;

const clamp = (v: number, max: number) => (v > max ? max : v < -max ? -max : v);

/**
 * The hero's centrepiece: a smart-card that leans towards the pointer or the finger, with the
 * light on its surface moving as it leans.
 *
 * It replaces the 3D guarantee cube that used to sit here. The cube's problem was not how it
 * looked but what it did — it turned itself every five seconds whether or not anyone was
 * reading it, so three of its four faces were always hidden and the one facing you could be
 * taken away mid-sentence. This turns only when someone turns it.
 *
 * ## Why it is one plane and not a solid
 *
 * It was a solid: a printed front, a branded back, and six stacked rings for the rim, all inside
 * a `preserve-3d` body, turnable through a full circle so you could see its edge. That version
 * blinked on Chrome for Android — the face, and sometimes just the text on it, disappearing and
 * returning while the card moved — and it warmed the phone doing so.
 *
 * The cause was the solid itself. A preserve-3d subtree cannot be painted in document order: its
 * children hold real positions in space, so the compositor depth-sorts them and splits them
 * wherever they intersect, rebuilding that structure on every frame the transform changes. Eight
 * card-sized planes, six of them 2px apart, is the worst input you can hand that algorithm —
 * near-coplanar surfaces are exactly where the sort order is decided by floating-point noise and
 * flips between consecutive frames, which is what the blinking was, and the splitting cost grows
 * with the square of the number of planes, which is what the heat was.
 *
 * So the card is now a single flat plane. `rotateX`/`rotateY` still place it in the stage's
 * perspective and still foreshorten it — a flat element is transformed in 3D perfectly well, it
 * just does not open a 3D space for its children — so the lean is intact, on one layer, with
 * nothing to sort and therefore nothing that can be sorted differently next frame.
 *
 * ## Why the turn is clamped
 *
 * One plane has no thickness, so it would thin to an invisible line at 90° and show its own
 * printing mirrored beyond that. The lean is therefore bounded well short of edge-on, which is
 * the honest trade for the fix: a full turn and a visible rim are what required the geometry
 * that broke. Within these limits nothing gives the flatness away, and the tighter perspective
 * on `.credential-stage` makes 30° read about as strongly as a much larger angle did before.
 *
 * ## The gesture
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
  const restTimer = useRef(0);

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
    const { x, y } = angle.current;
    el.style.setProperty('--tilt-x', `${x}deg`);
    el.style.setProperty('--tilt-y', `${y}deg`);
    // Where the light falls. The highlight slides opposite to the turn, which is what a real
    // card does under a fixed light: tip its right edge towards you and the glare runs left.
    //
    // Written as px offsets from the card's centre rather than as a gradient position, and
    // that distinction is the whole performance story. Moving a gradient's centre re-generates
    // and repaints it every frame; moving a fixed-size disc by transform is a compositor
    // operation and costs nothing. It is the same technique as the reveal lights (`.rv`).
    //
    // Travel is scaled to the lean limits rather than to a raw pixel figure: at full lean the
    // highlight sits near the card's edge and no further, whatever those limits are set to.
    el.style.setProperty('--glare-x', `${(-y / MAX_Y) * 150}px`);
    el.style.setProperty('--glare-y', `${(x / MAX_X) * 110}px`);
  };

  const turnTo = (x: number, y: number) => {
    angle.current = { x: clamp(x, MAX_X), y: clamp(y, MAX_Y) };
    if (frame.current) return;
    frame.current = requestAnimationFrame(flush);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    clearTimeout(restTimer.current);
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
    // Vertical drag turns it about X, horizontal about Y — the axes a hand expects. turnTo
    // clamps, so dragging past the limit simply holds at the limit rather than running away.
    turnTo(d.ax - (e.clientY - d.py) * 0.35, d.ay + (e.clientX - d.px) * 0.4);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    cardRef.current?.classList.remove('is-turning');
    cardRef.current?.releasePointerCapture?.(e.pointerId);
    // Left alone, the card rights itself after three seconds.
    //
    // Holding the released angle is what a real object does, but a web page is not a desk: the
    // next visitor — or the same one scrolling back up — would find a card someone had left
    // face-down, with no way to tell that was a previous choice rather than a broken render.
    // Three seconds is long enough that the turn plainly belongs to the person who made it,
    // and short enough that the card is never found in a state nobody chose.
    clearTimeout(restTimer.current);
    restTimer.current = window.setTimeout(() => {
      if (!drag.current) turnTo(0, 0);
    }, 3000);
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
    clearTimeout(restTimer.current);
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
        {/* No border utility here — the rim, its catch-light and its shaded underside are all
            drawn by `.credential-face--front::after`, so the edge stays one thing to adjust. */}
        <div className="credential-face credential-face--front">
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

          {/* The light on the surface. A fixed disc that slides as the card turns — see the
              note in flush() for why it moves by transform rather than by gradient position.
              It is the only highlight now: a static diagonal streak used to sit above it, and
              the two read as two different light sources on one surface — one fixed to the card
              no matter how it turned, one responding to the turn. Only the responding one is
              worth having, so the streak is gone. */}
          <div className="credential-glare pointer-events-none" aria-hidden="true" />

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

      </div>
    </div>
  );
};

export default CredentialCard;
