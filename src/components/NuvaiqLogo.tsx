import React from 'react';
import logoMark from '../assets/images/novaiq-icon.png';

interface NuvaiqLogoProps {
  className?: string;
  showText?: boolean;
  size?: number;
  // Hover-only: a terminal-style "...▊Design" prompt types itself out right after the mark.
  // Caller must put `group` on an ancestor for the hover trigger to reach this.
  animated?: boolean;
  // Phones can't hover, so the caller drives the same reveal from a tap instead. On mobile the
  // revealed lockup stacks into a column rather than widening into the language button.
  revealed?: boolean;
}

export const NuvaiqLogo: React.FC<NuvaiqLogoProps> = ({
  className = "",
  showText = true,
  size = 36,
  animated = false,
  revealed = false,
}) => {
  return (
    // dir="ltr" always — a brand lockup shouldn't mirror order in RTL the way normal
    // content does; NAME → MARK → WORD must read the same physically in Arabic or English.
    <div
      dir="ltr"
      className={`navbar-logo-lockup inline-flex items-center gap-2.5 ${
        revealed ? 'is-revealed' : ''
      } ${className}`}
    >
      {showText && (
        <span
          className={`font-black tracking-widest text-white text-xl sm:text-2xl font-['Cairo'] ${
            animated ? 'navbar-logo-name' : ''
          }`}
        >
          NUVAIQ
        </span>
      )}

      <img
        src={logoMark}
        alt="NUVAIQ"
        width={size}
        height={size}
        className={`shrink-0 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] ${
          animated ? 'navbar-logo-mark-img' : ''
        }`}
        style={{ width: size, height: size }}
      />

      {animated && (
        <span className="navbar-logo-word font-mono text-sm sm:text-base font-bold text-white">
          <span className="navbar-logo-dots inline-flex" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
          <span className="navbar-logo-cursor" aria-hidden="true" />
          <span>Design</span>
        </span>
      )}
    </div>
  );
};
