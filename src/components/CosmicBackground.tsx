import React, { useEffect, useRef } from 'react';

interface CosmicBackgroundProps {
  activeSection?: string;
  activeBgImage?: string | null;
}

export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  activeSection = 'hero',
  activeBgImage = null,
}) => {
  const glow1Ref = useRef<HTMLDivElement>(null);
  const glow2Ref = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Parallax is applied by writing directly to the DOM via refs (no React state/re-render
  // per scroll frame) — tying scroll position to component state here previously forced a
  // full re-render on every animation frame while scrolling, causing severe stutter on every page.
  useEffect(() => {
    let ticking = false;
    const applyParallax = () => {
      const y = window.scrollY;
      if (glow1Ref.current) glow1Ref.current.style.transform = `translate3d(0, ${y * 0.08}px, 0)`;
      if (glow2Ref.current) glow2Ref.current.style.transform = `translate3d(0, ${-y * 0.05}px, 0)`;
      if (gridRef.current) gridRef.current.style.transform = `translate3d(0, ${y * 0.02}px, 0)`;
      ticking = false;
    };
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(applyParallax);
        ticking = true;
      }
    };

    applyParallax();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Section-based glow coordinates and colors
  const getSectionGlowStyle = () => {
    switch (activeSection) {
      case 'templates':
        return {
          glow1: 'bg-zinc-700/20 top-[20%] right-[10%] w-[500px] h-[500px]',
          glow2: 'bg-zinc-800/15 top-[60%] left-[5%] w-[450px] h-[450px]',
        };
      case 'contract':
      case 'custom-request':
        return {
          glow1: 'bg-zinc-600/20 top-[35%] left-[20%] w-[550px] h-[550px]',
          glow2: 'bg-zinc-800/20 top-[70%] right-[15%] w-[400px] h-[400px]',
        };
      case 'timeline':
        return {
          glow1: 'bg-zinc-700/15 top-[50%] right-[25%] w-[500px] h-[500px]',
          glow2: 'bg-zinc-800/20 top-[25%] left-[10%] w-[450px] h-[450px]',
        };
      case 'about':
        return {
          glow1: 'bg-zinc-700/20 top-[40%] left-[30%] w-[600px] h-[600px]',
          glow2: 'bg-zinc-800/15 top-[80%] right-[20%] w-[400px] h-[400px]',
        };
      case 'hero':
      default:
        return {
          glow1: 'bg-zinc-700/15 top-[10%] left-[50%] -translate-x-1/2 w-[650px] h-[650px]',
          glow2: 'bg-zinc-800/15 top-[50%] right-[10%] w-[400px] h-[400px]',
        };
    }
  };

  const glowStyles = getSectionGlowStyle();

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black select-none">

      {/* Dynamic Background Image Layer (fades in when hovering template or inspecting specs) */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out transform-gpu ${
          activeBgImage ? 'opacity-25 scale-105' : 'opacity-0 scale-100'
        }`}
      >
        {activeBgImage && (
          <img
            src={activeBgImage}
            alt="Dynamic Section Background"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover filter blur-xl opacity-80 transform-gpu"
          />
        )}
      </div>

      {/* Parallax Ambient Floating Glow Blobs — transform is updated directly per scroll frame via refs,
          so only background-color/position transition between sections; transform itself is never
          CSS-transitioned (it must track scroll 1:1, not ease, or it fights the per-frame update) */}
      <div
        ref={glow1Ref}
        className={`absolute rounded-full blur-[120px] pointer-events-none transition-[background-color] duration-1000 ease-out transform-gpu will-change-transform ${glowStyles.glow1}`}
      />

      <div
        ref={glow2Ref}
        className={`absolute rounded-full blur-[140px] pointer-events-none transition-[background-color] duration-1000 ease-out transform-gpu will-change-transform ${glowStyles.glow2}`}
      />

      {/* Subtle Grid Lines Background Pattern for Tech feel */}
      <div
        ref={gridRef}
        className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 transform-gpu will-change-transform"
      />

      {/* Dark Vignette & Radial Mask Layer to guarantee maximum readability & high contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.85)_100%)] pointer-events-none" />
    </div>
  );
};
