import React, { Suspense, lazy } from 'react';

interface CredentialCardProps {
  language: 'ar' | 'en';
}

// three.js is ~890KB and this is the only thing on the site that uses it, so it is not allowed
// anywhere near the initial download. vite.config.ts keeps it in its own `vendor-three` chunk AND
// excludes that chunk from modulePreload — both halves are needed, or the browser fetches it
// eagerly despite the lazy import and the split buys nothing.
const CredentialCard3D = lazy(() => import('./CredentialCard3D'));

/**
 * The hero credential card.
 *
 * A placeholder while the 3D scene loads, and the scene itself once it has. The placeholder is
 * the same size and shape as the card, so nothing on the page moves when the swap happens.
 *
 * Everything about why this is WebGL rather than CSS is in CredentialCard3D — the short version
 * is that a rounded outline, real thickness and a back cannot all be true at once in CSS 3D, and
 * every way of faking the rim fails in a different place.
 */
export const CredentialCard: React.FC<CredentialCardProps> = ({ language }) => {
  const isAr = language === 'ar';

  return (
    <Suspense
      fallback={
        <div
          // Matches the scene's own breakout box exactly, so the page does not shift when the
          // real card arrives — see the note on that element in CredentialCard3D. Inset by the
          // same ~11% the camera leaves as turning room, so the placeholder sits where the card
          // will actually be rather than filling the whole box.
          className="relative z-30 w-[210%] mx-[-55%] mt-[-24%] mb-[-34%] max-w-[54rem] lg:w-[150%] lg:mx-[-25%] lg:mt-[-14%] lg:mb-[-16%] lg:max-w-[58rem] aspect-[1.586/1] p-[26%]"
        >
          <div
            className="w-full h-full rounded-2xl border border-black/10"
            style={{
              background:
                'radial-gradient(120% 110% at 12% 8%, #ffffff 0%, #f6f6f8 45%, #e4e4ea 100%)',
            }}
            aria-label={isAr ? 'جارِ تحميل بطاقة الضمانات' : 'Loading the guarantees card'}
            role="img"
          />
        </div>
      }
    >
      <CredentialCard3D language={language} />
    </Suspense>
  );
};

export default CredentialCard;
