import React from 'react';
import logoMark from '../assets/images/novaiq-icon.png';

interface NovaiqLogoProps {
  className?: string;
  showText?: boolean;
  size?: number;
}

export const NovaiqLogo: React.FC<NovaiqLogoProps> = ({
  className = "",
  showText = true,
  size = 36
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src={logoMark}
        alt="NOVAIQ"
        width={size}
        height={size}
        className="shrink-0 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
        style={{ width: size, height: size }}
      />

      {showText && (
        <span className="font-black tracking-widest text-white text-xl sm:text-2xl font-mono">
          NOVAIQ
        </span>
      )}
    </div>
  );
};
