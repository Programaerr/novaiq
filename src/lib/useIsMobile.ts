import { useEffect, useState } from 'react';

export interface MobileTrait {
  isMobile: boolean;
  isTouch: boolean;
}

function read(): MobileTrait {
  const isTouch =
    typeof window !== 'undefined' &&
    (('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (window.matchMedia?.('(pointer: coarse)').matches ?? false));
  return {
    isTouch,
    isMobile:
      typeof window !== 'undefined' &&
      (isTouch || (window.matchMedia?.('(max-width: 767px)').matches ?? false)),
  };
}

/**
 * Live mobile/touch detection. `isMobile` widens on `pointer: coarse` so a tablet in portrait
 * (which touches like a phone but measures like a laptop) still gets the phone layout. The hook
 * re-evaluates on resize and on pointer/any-pointer changes.
 */
export function useIsMobile(): MobileTrait {
  const [trait, setTrait] = useState<MobileTrait>(read);

  useEffect(() => {
    const update = () => setTrait(read());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const mq = window.matchMedia?.('(pointer: coarse)');
    if (mq?.addEventListener) mq.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      mq?.removeEventListener?.('change', update);
    };
  }, []);

  return trait;
}