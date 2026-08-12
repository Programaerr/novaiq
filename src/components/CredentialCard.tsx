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
          // real card arrives — see the note on that element in CredentialCard3D.
          className="relative z-30 w-[116%] mx-[-8%] max-w-lg aspect-[1.586/1] rounded-2xl border border-white/12"
          style={{
            background:
              'radial-gradient(120% 110% at 12% 8%, #2b2b31 0%, #131317 42%, #08080a 100%)',
          }}
          aria-label={isAr ? 'جارِ تحميل بطاقة الضمانات' : 'Loading the guarantees card'}
          role="img"
        />
      }
    >
      <CredentialCard3D language={language} />
    </Suspense>
  );
};

export default CredentialCard;
