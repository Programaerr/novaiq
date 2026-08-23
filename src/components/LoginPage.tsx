import React, { useState } from 'react';
import { FileCheck, Clock, Download } from 'lucide-react';
import { Language } from '../lib/i18n';
import { loginWithGoogle, authErrorMessage } from '../lib/auth';
import { INK, PERIWINKLE, SAND } from '../lib/homePalette';
import { StarField } from './StarField';
import { TileField, SECTION_TONES, SECTION_FADE } from './TileField';
import { NqButton } from './ui/NqButton';

interface LoginPageProps {
  language: Language;
  /**
   * Dismisses this page and sends the visitor to the home page to browse without an account.
   *
   * Required, deliberately. This screen is reached from three places — the front gate, the
   * navbar's sign-in button, and the two inner pages that need an account (the contract
   * builder and "my orders") — and a visitor must be able to walk away from every one of them.
   * It was briefly optional so the inner pages could omit it, on the reasoning that a guest
   * button there would only return someone to the wall they had just met. That reasoning was
   * wrong about what the wall is for: it exists to stop a contract being created without an
   * account, not to strand somebody on a screen with no way back into the site. Making it
   * required means a future sign-in screen cannot be added without answering "and how does
   * someone leave this?".
   */
  onContinueAsGuest: () => void;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

/**
 * The lightest ink that still clears 4.5:1 on SAND.
 *
 * Measured rather than picked: INK over #D5BDAC comes out at 5.14:1 at 70% and 4.46:1 at 65%, so
 * 0.7 is the floor and there is no room below it. Worth writing down, because the reflex on a
 * light page is to reach for /60 or /50 the way the old dark version of this screen used
 * `text-white/60` — which was fine on near-black and is a failing pair here.
 */
const INK_MUTED = 'rgba(16, 19, 34, 0.7)';

/**
 * How far out of focus the sky behind the card is.
 *
 * Tuned against the smallest thing in it rather than by eye. The stars bottom out at 2.6px, so
 * every pixel of blur here is a large fraction of a star — at 8px they stopped being stars and
 * became a haze, and the first attempt at 22px erased them completely. 4px softens the planets'
 * edges and leaves the stars as points of light with a glow, which is what a star out of focus
 * actually looks like.
 */
const BACKDROP_BLUR = '4px';

/**
 * Standalone sign-in page: one card, split down the middle. The company's words on sand, and the
 * site's own cube field in the panel blue beside them.
 *
 * Self-contained by design — it renders its own ground rather than mounting inside the site's
 * shared chrome. App gives it the whole viewport (see the early return there), so there is no
 * navbar to sit under and no page padding to clear. The only things it takes from the rest of the
 * app are the pieces that genuinely are shared: the auth call, the palette, the button system and
 * the tile field.
 *
 * The field is the SAME component the home page's hero and the timeline page run, on the same
 * tones and the same fade, not a second cube scene written for this screen. That is the whole
 * reason it is worth having here: a sign-in page built out of the site's own parts reads as the
 * site, where a bespoke animation on the way in reads as a different product.
 */
export const LoginPage: React.FC<LoginPageProps> = ({ language, onContinueAsGuest }) => {
  const isAr = language === 'ar';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      // The auth subscription upstream picks up the new session and routes away from here.
    } catch (err) {
      setError(authErrorMessage(err, isAr));
    } finally {
      setIsSubmitting(false);
    }
  };

  const perks = [
    { icon: FileCheck, text: isAr ? 'كل عقودك في مكان واحد خاص بك' : 'All your contracts in one place, private to you' },
    { icon: Clock, text: isAr ? 'تابع حالة كل عقد لحظة بلحظة' : 'Track each contract\'s status live' },
    { icon: Download, text: isAr ? 'حمّل نسخة PDF من عقدك في أي وقت' : 'Download a PDF copy anytime' },
  ];

  return (
    <div
      className="nq-login relative min-h-screen overflow-hidden font-['Cairo'] grid place-items-center p-6 sm:p-10 lg:p-14 selection:bg-[#101322] selection:text-[#F6F1E9]"
      /* Painted here rather than left to the document. The page this replaced was white-on-black
         and inherited its ground from the body; a screen that gets its background from somewhere
         else is a screen that goes black the day that somewhere else changes. INK, because it is
         the sky's own ground — the one frame before WebGL has anything on screen is then already
         the right colour instead of a flash of something else. */
      style={{ background: INK, color: INK }}
    >
      {/* The ground the card sits on: a night sky in the site's own palette, out of focus.

          Blur is the whole point of it. A sharp sky behind a card that itself contains a moving
          field is two things asking to be looked at; blurred, it becomes atmosphere, and the card
          reads as forward simply by being the only crisp thing on the screen. That depth cue is
          doing the work a drop shadow would otherwise have to do.

          `-inset-[6%]` and not `inset-0`: `filter: blur()` samples what is outside the element as
          transparent, so a layer blurred at its own edges fades out along all four sides and the
          page shows a dark halo around the sky. Oversizing it past the clip on the parent puts
          those soft edges off screen. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -inset-[6%]" style={{ filter: `blur(${BACKDROP_BLUR})` }}>
          <StarField />
        </div>
      </div>

      {/* `dir="ltr"` on the SPLIT only, and it is what pins the halves.
          The page is RTL in Arabic, so the grid's first column is the right-hand one — the two
          halves would swap sides with the language and the composition would mirror. It does not
          mirror in the wireframe and it does not mirror in the hero either, for the same reason
          (see the note on `mr-auto` in HomeHero): this is a picture, not a reading order. Words
          left, field right, in both languages.
          The text inside is handed its own direction back on the column below, so only the
          COLUMN ORDER is forced physical — nothing about the copy is. */}
      {/* `relative` so the card is above the backdrop without a z-index — it comes after it in
          the DOM and both are positioned, which is all the stacking order needs. */}
      <div
        dir="ltr"
        className="relative w-full max-w-[64rem] grid grid-cols-1 lg:grid-cols-2 rounded-[0.5rem] overflow-hidden"
        style={{ background: SAND }}
      >
        {/* ── Words ─────────────────────────────────────────────────────────────────────── */}
        {/* Padding is deliberately ASYMMETRIC at lg: 56px on the left, 112px on the right. The
            right is the side the coastline bites into, and the deepest headland reaches about
            80px past the seam — so the extra 56px is not taste, it is clearance. Symmetric, the
            last few characters of the longest line sat under the cube field.
            More top padding on the phone for the same reason, where the coast runs along the
            bottom of the band instead and erodes down into the first heading. */}
        <div
          dir={isAr ? 'rtl' : 'ltr'}
          className="flex flex-col px-6 pt-14 pb-10 sm:px-10 sm:pt-16 sm:pb-12 lg:pl-14 lg:pr-28 lg:py-12"
        >
          {/* flex-1 + centred, so the block sits in the middle of whatever height the card
              resolved to and the copyright line stays on the floor rather than being dragged up
              under the buttons. */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="w-full max-w-[25rem] mx-auto">
              <h1 className="text-[1.75rem] sm:text-3xl lg:text-[2.1rem] font-black leading-tight">
                {isAr ? 'سجّل دخولك إلى' : 'Sign in to your'}
                <br />
                {isAr ? 'حسابك في NOVAIQ' : 'NOVAIQ account'}
              </h1>

              <p className="mt-3 lg:mt-4 text-[13px] sm:text-sm leading-relaxed" style={{ color: INK_MUTED }}>
                {isAr
                  ? 'ادخل بحساب Google لمتابعة عقودك وقوالبك المحفوظة في مكان واحد.'
                  : 'Continue with Google to follow your contracts and saved templates in one place.'}
              </p>

              {/* Three, and three is the cap rather than the count that happened to fit: a list of
                  reasons long enough to need scanning is competing with the button underneath it.
                  The icons lost the filled chip they used to sit in — a 28px dark square each was
                  three more objects on a surface that now has a whole blue half beside it to carry
                  the visual weight. */}
              <ul className="mt-5 lg:mt-7 space-y-2.5">
                {perks.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2.5 text-xs sm:text-[13px]">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" style={{ color: PERIWINKLE }} />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              {/* `role="alert"` so a sign-in failure is announced rather than only drawn. A message
                  that appears silently under a button somebody just pressed is a message a screen
                  reader user never receives. */}
              {error && (
                <div
                  role="alert"
                  className="mt-5 p-3 rounded-[0.375rem] text-xs text-center"
                  style={{
                    background: 'rgba(127, 29, 29, 0.1)',
                    color: '#7F1D1D',
                    boxShadow: 'inset 0 0 0 1px rgba(127, 29, 29, 0.3)',
                  }}
                >
                  {error}
                </div>
              )}

              {/* One button, because there is only one path: Firebase creates the account on a
                  first-time Google sign-in, so "log in" and "sign up" are the same click here and
                  offering both would be two doors into one room.

                  `footer` is the tone, on a sand ground, and the borrow is deliberate. The
                  wireframe paints this button in the panel blue — the same blue as the half beside
                  it — and `footer` is the site's only pair that puts PERIWINKLE in the fill with
                  INK on top of it (6.28:1). `chrome` has the same fill but a white focus ring,
                  which on sand is no ring at all. */}
              <NqButton
                tone="footer"
                variant="solid"
                size="lg"
                radius="xl"
                block
                loading={isSubmitting}
                onClick={handleGoogleSignIn}
                className="mt-6 lg:mt-7"
                icon={<GoogleIcon />}
              >
                {isAr ? 'المتابعة عبر Google' : 'Continue with Google'}
              </NqButton>

              {/* Browsing the catalogue, opening a demo and reading the timeline need no account,
                  and requiring one to look around turns a visitor away before they have seen
                  anything worth signing in for. The line underneath says where the wall actually
                  is, so choosing this does not feel like it might cost them something later on. */}
              <NqButton
                tone="sand"
                variant="solid"
                size="md"
                radius="xl"
                block
                disabled={isSubmitting}
                onClick={onContinueAsGuest}
                className="mt-3"
              >
                {isAr ? 'أكمل كضيف' : 'Continue as guest'}
              </NqButton>

              <p className="mt-2.5 text-center text-[11px]" style={{ color: INK_MUTED }}>
                {isAr
                  ? 'تصفّح القوالب وجرّبها بحرية — تسجيل الدخول مطلوب فقط عند إنشاء عقد.'
                  : 'Browse and try the templates freely — an account is only needed to create a contract.'}
              </p>
            </div>
          </div>

          <p className="shrink-0 mt-10 text-center text-[11px]" style={{ color: INK_MUTED }}>
            {isAr ? '© NOVAIQ — جميع الحقوق محفوظة' : '© NOVAIQ — All rights reserved'}
          </p>
        </div>

        {/* ── Field ─────────────────────────────────────────────────────────────────────── */}
        {/* `order-first` below lg and back in place at lg, so the field is a BAND across the top
            of the card on a phone and the right-hand half on a desktop. A band rather than a
            second full screen: the page this replaced dropped its artwork entirely below lg on the
            reasoning that a phone which has to scroll past a screenful of decoration to reach a
            sign-in button has been given a worse page. That reasoning was about the SIZE, not
            about the atmosphere — 10rem of it costs nothing and the button stays above the fold.

            `min-h` on this column is what gives the whole card its shape at lg: grid rows stretch,
            so the sand column is as tall as this one whenever the copy is shorter. */}
        <div
          aria-hidden="true"
          className="relative order-first lg:order-none h-40 lg:h-auto lg:min-h-[34rem]"
        >
          {/* `.nq-coast` is the whole seam: it carries the blue, hangs past this cell over the
              words, and is clipped to a stepped coastline. Both the overhang and the clip live in
              index.css because they change at the breakpoint — a horizontal coast along the
              bottom of the phone band, a vertical one down the side of the desktop half. */}
          <div className="nq-coast">
            <TileField tones={SECTION_TONES} fade={SECTION_FADE} />
          </div>
        </div>
      </div>
    </div>
  );
};
