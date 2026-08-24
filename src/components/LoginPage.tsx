import React, { useState } from 'react';
import { FileCheck, Clock, Download } from 'lucide-react';
import { Language } from '../lib/i18n';
import { loginWithGoogle, authErrorMessage } from '../lib/auth';
import { INK, PERIWINKLE, SAND } from '../lib/homePalette';
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
 * The lightest ink that still clears 4.5:1 on the band below.
 *
 * Measured rather than picked, and re-measured every time the surface under it changed: solid
 * sand, an ink sky, falling code, frosted glass over a cube field, and now solid sand again.
 *
 * The band is opaque, so for the first time in a while the surface IS the swatch. Sampled off
 * the rendered page at nine heights down the band, every one of them reads #D5BDAC exactly — no
 * spread at all, where the glass version moved across a six percent range and the solid-sand
 * version before THAT moved with whatever was behind it. Full ink on it measures 10.28:1 and
 * this value 7.57:1, at every point on the panel.
 *
 * It stays at 0.85 rather than being wound back to the 0.7 an opaque sand panel would allow.
 * 0.7 measures 5.14:1, which is fine today and was 4.94:1 the last time this surface was glass
 * — four hundredths over the bar, on a surface that has now moved five times. The margin is
 * cheaper than re-deriving it a sixth time.
 *
 * Worth writing down because the reflex on a light panel is to reach for /60 or /50 the way the
 * old dark version of this screen used `text-white/60`. On sand that reflex is a full step
 * worse than it looks.
 */
const INK_MUTED = 'rgba(16, 19, 34, 0.85)';

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
 * NOTHING behind the card, and that is the decision rather than the absence of one. This page
 * has been through a blurred cube field, falling code, a rotating panel of stills and a drifting
 * grid of cards, and every one of them was a second thing on a screen that has one job: a
 * button. What is left is the page's own SAND and the card on it, which is the same ground every
 * other page of the site stands on.
 *
 * The field still runs ONCE, inside the card, and it is the same component the home page's hero
 * and the timeline page run,
 * on the shared tones, not a second cube scene written for this screen. That is the whole reason
 * it is worth having here: a sign-in page built out of the site's own parts reads as the site,
 * where a bespoke animation on the way in reads as a different product.
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
      className="nq-login relative min-h-screen overflow-hidden font-['Cairo'] grid place-items-center p-4 sm:p-10 lg:p-14 selection:bg-[#101322] selection:text-[#F6F1E9]"
      /* Painted here rather than left to the document. The page this replaced was white-on-black
         and inherited its ground from the body; a screen that gets its background from somewhere
         else is a screen that goes black the day that somewhere else changes.

         SAND, which is the ground every other page of this site stands on, and the ground the
         field on top of it is standing on too — so the one frame before WebGL has anything on
         screen is already the right colour rather than a flash of something else. It used to be
         INK, which was defensible while the backdrop was a night sky, but a sign-in screen is the
         first thing a visitor sees and one that is dark when the rest of the site is warm reads
         as a different product's login bolted on. */
      style={{ background: SAND, color: INK }}
    >
      {/* The card. Three layers, back to front: the blue, the band, the words.

          It used to be a two-column grid, sand beside blue, split down a straight seam. The
          split is gone and the blue is now the whole card, with the copy riding a single sand
          band that leans across it. Same two colours and the same amount of each; what changed
          is that the boundary between them is one shape instead of a wall, so the card reads as
          one object rather than as two panels that happen to touch.

          `relative` so it is above the backdrop without a z-index — it comes after it in the DOM
          and both are positioned, which is all the stacking order needs. `overflow-hidden` is
          what makes the lean safe: the band is skewed, so its corners travel past the card's
          own edges, and this is the thing that cuts them off square with the rounding.

          No `dir` on the card any more. The old one was forced `ltr` to stop the two grid
          columns swapping sides with the language — there are no columns to swap now, the lean
          runs the same way in both languages because it is a picture, and the copy inside gets
          its own direction on the block below.

          The shadow is the only thing that separates the card from the page now that the page
          is flat sand, and it matters more for that: with nothing behind it, an unshadowed card
          reads as a recoloured hole cut in the ground rather than as an object laid on it. Long
          and soft rather than tight and dark — the ground is warm sand, and a hard shadow on sand
          reads as dirt. */}
      <div
        className="relative w-full max-w-[64rem] rounded-[0.5rem] overflow-hidden"
        style={{ boxShadow: '0 26px 58px -22px rgba(16, 19, 34, 0.5)' }}
      >
        {/* ── The blue ──────────────────────────────────────────────────────────────────── */}
        {/* `.nq-coast` is the flat fill and the field is the texture on it; the fill is what
            shows through the gaps the cubes leave. It covers the whole card now rather than one
            half of it, so the band has field on both sides of it at every height. */}
        <div className="nq-coast" aria-hidden="true">
          <TileField tones={SECTION_TONES} fade={SECTION_FADE} />
        </div>

        {/* ── The band ──────────────────────────────────────────────────────────────────── */}
        {/* Decorative and empty: it is the surface, and the words are a sibling above it rather
            than children inside it, because a skewed parent skews its text (see .nq-lean).

            SOLID sand, and this is the one place the redesign overrode the shape it was given.
            The panel this replaces was frosted glass at 0.72 over a blurred SAND backdrop, which
            landed on sand because what it was mixing with was already sand. The same 0.72 over
            the periwinkle field mixes with something darker and much bluer and lands on #BEB2B6
            — a mauve. It is still legible, 9.1:1, but the card then has no sand in it at all,
            and a sand band is the whole idea. Opaque is also a compositing pass saved on a
            full-height element, and the contrast floor stops depending on which cube face
            happens to be under the copy. */}
        <div
          aria-hidden="true"
          className="nq-lean"
          style={{
            background: SAND,
            /* Two shadows doing two jobs. The inset hairline is the lit edge of a pane, and it
               is the reason this is a skew rather than a clip path. The outer one is the lift:
               against a field of cubes that are themselves shaded, a flat panel with no shadow
               reads as a hole cut in the card rather than as a surface laid on it. */
            boxShadow:
              'inset 1px 1px 0 rgba(246, 241, 233, 0.35), 0 26px 52px -30px rgba(16, 19, 34, 0.6)',
          }}
        />

        {/* ── The words ─────────────────────────────────────────────────────────────────── */}
        {/* This block is what gives the card its height — the two layers above are absolute and
            contribute none. `min-h` is the floor for the lean: a skew needs height to travel
            across, and a card that shrink-wrapped to a short column would show a tilt of a few
            pixels instead of a band.

            No horizontal padding, deliberately: the clearance between the copy and the band's
            slanted edges is set once, on `.nq-lean-copy`. Padding here would be a second helping
            of the same clearance, taken out of the copy rather than out of the field.

            One `min-h`, not one per breakpoint, because the band it governs is one size at every
            breakpoint too. The travel a skew costs is `height x tan(angle)`, so a card that was
            taller on a phone would lean further there and eat the clearance the column was
            measured against. */}
        <div
          dir={isAr ? 'rtl' : 'ltr'}
          className="relative flex flex-col min-h-[34rem] py-10 sm:py-12 lg:py-14"
        >
          {/* flex-1 + centred, so the block sits in the middle of whatever height the card
              resolved to and the copyright line stays on the floor rather than being dragged up
              under the buttons. */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Narrower than the 25rem it used to be, and the number is not a taste call — it
                falls out of the lean. See `.nq-lean-copy`, where it is derived.

                Centred on the card, which is also the band's centre at half height, so the
                margin lost at the top-left is exactly the margin gained at the bottom-right.
                That asymmetry is not a bug to tune out: an upright column in a leaning band
                cannot be even at both ends, and the even-at-the-middle answer is the one that
                keeps the same total clearance at both. */}
            <div className="nq-lean-copy">
              {/* Two sizes, and they step with the column rather than with the viewport. At
                  15rem the ceiling is 1.75rem — "حسابك في NOVAIQ" sets at ~238px there, two
                  short of the column, and 2.1rem would wrap a two-word phrase across three
                  lines. At 25rem there is room for the 2.1rem the desktop card always ran. */}
              <h1 className="text-[1.75rem] lg:text-[2.1rem] font-black leading-tight">
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

          {/* Same column as the copy above it. It sits at the band's narrowest point — the
              bottom, where the lean has taken the band its full travel to the left — so a
              full-width centred line is the one line that would hang off the edge. */}
          <p className="nq-lean-copy shrink-0 mt-10 text-center text-[11px]" style={{ color: INK_MUTED }}>
            {isAr ? '© NOVAIQ — جميع الحقوق محفوظة' : '© NOVAIQ — All rights reserved'}
          </p>
        </div>

      </div>
    </div>
  );
};
