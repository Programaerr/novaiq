import React from 'react';
import logoMark from '../assets/images/novaiq-icon.png';

interface NovaiqLogoProps {
  className?: string;
  showText?: boolean;
  size?: number;
  // Hover-only: the mark spins and a terminal-style "...▊Design" prompt types itself out
  // next to it. Caller must put `group` on an ancestor for the hover trigger to reach this.
  animated?: boolean;
}

export const NovaiqLogo: React.FC<NovaiqLogoProps> = ({
  className = "",
  showText = true,
  size = 36,
  animated = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src={logoMark}
        alt="NOVAIQ"
        width={size}
        height={size}
        className={`shrink-0 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] ${animated ? 'navbar-logo-mark' : ''}`}
        style={{ width: size, height: size }}
      />

      {showText && (
        <span className="font-black tracking-widest text-white text-xl sm:text-2xl font-mono">
          NOVAIQ
        </span>
      )}

      {animated && (
        <span className="navbar-logo-word inline-flex items-center font-mono text-sm sm:text-base font-bold text-white">
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
