import React, { useEffect, useRef } from 'react';

interface SealProps {
  language: 'ar' | 'en';
  /** The record this seal certifies — a real contract number when there is one. */
  reference?: string;
}

/**
 * The identity's signature: an official round seal that presses itself onto the page once.
 *
 * ## Why a seal and not an animation
 *
 * NOVAIQ's own description of what it sells is "عقود معتمدة بختم إلكتروني" — contracts certified
 * with an electronic stamp. The seal is not decoration borrowed from somewhere; it is the
 * artefact the company's product produces, drawn at the size it would be applied at.
 *
 * It is also the page's one deliberate moment of motion. Scattered hover effects and drifting
 * ornaments read as generated; a single thing that happens once, at the moment it means
 * something, reads as designed. So this fires when the section it belongs to is first reached
 * and then never again — there is no loop and no idle state to pay for.
 *
 * Pressed slightly askew, because a seal applied dead straight is a logo. The tilt and the uneven
 * ink (a radial mask, in index.css) are the whole difference between a stamp and a circle.
 */
export const Seal: React.FC<SealProps> = ({ language, reference }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isAr = language === 'ar';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fires on arrival, once. Disconnected immediately afterwards: a seal is applied a single
    // time, and an observer left watching for a thing that cannot happen again is a leak.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add('is-pressed');
        io.disconnect();
      },
      { threshold: 0.55 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="seal select-none"
      role="img"
      aria-label={
        isAr
          ? `ختم اعتماد NOVAIQ${reference ? ` — ${reference}` : ''}`
          : `NOVAIQ certification seal${reference ? ` — ${reference}` : ''}`
      }
    >
      <div className="flex flex-col items-center justify-center gap-0.5 leading-none">
        <span className="text-[0.55rem] tracking-[0.28em] uppercase opacity-80">novaiq</span>
        <span className="text-[0.72rem] font-extrabold tracking-[0.08em]">
          {isAr ? 'معتمد' : 'CERTIFIED'}
        </span>
        {/* The reference is the point of a seal — a stamp with no record on it certifies nothing.
            Tabular figures so a column of these lines up, as they would in a file. */}
        <span className="figure text-[0.5rem] opacity-70">{reference ?? 'NVQ · IQD'}</span>
      </div>
    </div>
  );
};

export default Seal;
