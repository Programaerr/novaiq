import React, { useEffect, useRef } from 'react';
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
  // The card's box, measured at most once per scroll/resize instead of once per pointer move.
  //
  // This is the difference between the tilt being free and it being the most expensive thing on
  // the page. getBoundingClientRect() forces the browser to flush pending layout before it can
  // answer, and a pointer stream fires every frame — so measuring inside the handler put a
  // forced synchronous layout on every frame the cursor moved. Scrolling makes that far worse
  // rather than merely equal: the card slides under a stationary cursor, so the browser emits
  // pointermove for each scroll frame too, and every one of those frames then had to stop and
  // re-layout mid-scroll. That is the "moving something while scrolling lags horribly" case.
  const box = useRef<DOMRect | null>(null);
  // Live drag: where it started, and the angles the card was already at when it did.
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);

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

  // A single lean-and-settle shortly after the card appears.
  //
  // Nothing announces that a flat rectangle can be picked up and turned, and on a phone there
  // is no cursor to discover it with — without this the interaction exists but goes unfound.
  // One deliberate movement is enough: it shows the card has thickness and a lit edge, and it
  // stops. A loop would be the spinning cube again, which is what this replaced.
  //
  // Driven through the same custom properties as the gesture rather than as its own keyframe
  // animation: an animation on `transform` would seize the property the pointer writes to, and
  // with a fill-mode it would hold its last frame permanently, leaving the card stuck at an
  // angle no one chose.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lean = window.setTimeout(() => {
      if (!drag.current) write(-5, 14);
    }, 700);
    const settle = window.setTimeout(() => {
      if (!drag.current) resetTilt();
    }, 1600);
    return () => {
      clearTimeout(lean);
      clearTimeout(settle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flag-only listeners: the re-measure itself happens inside the next pointer move, so a
  // scroll that nobody is hovering through costs exactly one boolean write per event.
  useEffect(() => {
    const invalidate = () => {
      box.current = null;
    };
    window.addEventListener('scroll', invalidate, { passive: true });
    window.addEventListener('resize', invalidate);
    return () => {
      window.removeEventListener('scroll', invalidate);
      window.removeEventListener('resize', invalidate);
    };
  }, []);

  const write = (x: number, y: number) => {
    next.current = { x, y };
    if (frame.current) return;
    frame.current = requestAnimationFrame(applyTilt);
  };

  // ── Mouse: the card leans towards the cursor, no click required ──────────────────────────
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Touch is handled by the drag below instead. A finger has no hover: the only way it can
    // reach the card is by landing on it, so "lean towards the pointer" would mean the card
    // jumping to a new angle on every tap, and doing it underneath the fingertip that is
    // covering the very corner it tilts towards.
    if (e.pointerType === 'touch') return;
    if (drag.current) return;
    const el = cardRef.current;
    if (!el) return;
    if (!box.current) box.current = el.getBoundingClientRect();
    const r = box.current;
    // -0.5 → 0.5 across each axis, then scaled to a deliberately small angle. Past about 8°
    // the card stops reading as a solid object catching the light and starts reading as a
    // picture being waved about.
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    write(-py * 9, px * 12);
  };

  // ── Touch and mouse-drag: turn the card by dragging it ───────────────────────────────────
  //
  // Relative to where the drag started, not to where the finger is. Absolute mapping is right
  // for a cursor hovering over a card it is not touching; for a finger it means the card
  // snaps to a new angle the instant it is touched, before any gesture has been made.
  //
  // Angles are clamped well inside ±90°. The card has one printed face and no back, so a turn
  // far enough to show its reverse would show a mirror image of its own front — clamping is
  // what keeps "turn it" from becoming "break it". Within that range it turns far enough to
  // read as a solid object being handled.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    drag.current = { x: e.clientX, y: e.clientY, rx: next.current.x, ry: next.current.y };
    // The easing has to come off for the duration of the turn. It exists so the card glides
    // back when a cursor leaves, but during a drag it puts 400ms between the finger and the
    // card, which feels like dragging something through treacle rather than turning it.
    // Toggled straight on the node: a state flip here would re-render the whole card twice per
    // gesture to change one class.
    el.classList.add('is-turning');
    // Capture so a turn that wanders off the card keeps working — without it the card stops
    // dead the moment the finger crosses its edge, which reads as the gesture breaking.
    el.setPointerCapture?.(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const clamp = (v: number, max: number) => (v > max ? max : v < -max ? -max : v);
    write(
      clamp(d.rx - (e.clientY - d.y) * 0.22, 26),
      clamp(d.ry + (e.clientX - d.x) * 0.28, 32),
    );
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    cardRef.current?.classList.remove('is-turning');
    cardRef.current?.releasePointerCapture?.(e.pointerId);
    // Springs back to flat rather than holding the last angle. Held, every visitor after the
    // first would meet a card someone left crooked, and the tilt would read as a rendering
    // fault rather than as something they did.
    resetTilt();
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
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          handleDragMove(e);
          handlePointerMove(e);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          if (!drag.current) resetTilt();
        }}
        // 1.586:1 at every size — the real ratio of a physical card, and the thing that makes
        // this read as a card at all rather than as a dark box. It is the content that adapts
        // to the ratio here, never the other way round: the first attempt paired this with a
        // `min-h`, which meant the taller of the two won and a phone got a 310×290 box that was
        // neither a card shape nor big enough for what was printed on it, and `overflow-hidden`
        // clipped the guarantees into each other. Everything inside now has a phone size that
        // fits inside 1.586:1 at ~310px wide — see the notes on each block.
        className="credential-card relative w-full aspect-[1.586/1] rounded-3xl border border-white/15 overflow-hidden select-none"
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

          {/* Two columns at every size, because four rows cannot fit a 1.586:1 card on a phone.
              What gives way instead is the second line: each guarantee keeps its icon and title
              and drops the description below sm. The title alone is the guarantee — "تسليم سريع
              ومنظم" says the thing; "منهجية برمجية واضحة" is elaboration, and elaboration is
              what a card has no room for. It comes back at sm, where the height does. */}
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
  );
};

export default CredentialCard;
