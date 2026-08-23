import React, { useState } from 'react';
import { FileCheck, Clock, Download } from 'lucide-react';
import { Language } from '../lib/i18n';
import { loginWithGoogle, authErrorMessage } from '../lib/auth';
import { INK, PERIWINKLE, SAND } from '../lib/homePalette';
import { TileField, SAND_TONES, SECTION_TONES, SECTION_FADE, FieldFade } from './TileField';
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
 * The lightest ink that still clears 4.5:1 on the glass panel below, in its WORST state.
 *
 * Measured rather than picked, and re-measured every time the thing behind the card changed:
 * solid sand, then an ink sky, then falling code, and now the site's cube field again.
 *
 * The panel is translucent, so the surface under this text is whatever the backdrop is, mixed
 * toward sand. Read off the rendered page rather than off the palette, that surface now spans
 * #D0B6A4 to #D4BCAA: full ink on it is 9.58:1 to 10.17:1, and this value 7.20:1 to 7.55:1.
 * Comfortable, and deliberately left where the dark backdrops put it rather than wound back to
 * the 0.7 that solid sand allowed — 0.7 measures 4.94:1 at the floor here, which clears the bar
 * by four hundredths and is not a margin worth defending the next time something moves behind
 * this card.
 *
 * Worth writing down because the reflex on a light-looking panel is to reach for /60 or /50 the
 * way the old dark version of this screen used `text-white/60`. On glass that reflex is a full
 * step worse than it looks, because the surface goes darker than the swatch it came from every
 * time something dark passes behind it.
 */
const INK_MUTED = 'rgba(16, 19, 34, 0.85)';

/**
 * The words half, as frosted glass rather than a solid sand panel.
 *
 * 0.72, and with the cube field back behind the card this is a LOOK rather than the contrast
 * floor it used to be. A translucent sand surface does not stay sand — it mixes toward whatever
 * is behind it, in proportion to how much it lets through — and while the backdrop was an ink
 * sky, and later dark code, that mixing was what set the number: at 0.6 the surface fell to
 * #867975 and full-strength INK on it measured 4.41:1, under what body text needs before a
 * single muted line is drawn.
 *
 * Over the field there is no such floor, and the reason is `backdrop-blur-xl` below rather than
 * the field being light. The rendered backdrop still spans #AA856B to #DAC1A9 — better than two
 * to one in luminance, because a cube's shaded faces go well past the trough tone the palette
 * declares. The backdrop filter averages all of that before this panel composites over it, so the
 * surface itself only ever moves between #D0B6A4 and #D4BCAA: a six percent spread, 9.58:1 at its
 * worst. Drop the `backdrop-blur-xl` and the floor comes back — a single dark cube face directly
 * under the copy would put the surface at #C9AD9A.
 *
 * It stays at 0.72 anyway, for the look: the panel has to read as a pane laid OVER the field
 * rather than as a hole cut in it, and this is where the cubes stay visible through the glass
 * without competing with the copy. Keeping the margin also means the pair below survives the next
 * backdrop — INK_MUTED is derived against this number, and the two have been re-derived three
 * times now.
 */
const SAND_GLASS = 'rgba(213, 189, 172, 0.72)';

/**
 * The backdrop field does not fade at either end.
 *
 * Every other field on the site fades because it has to arrive out of one section and leave into
 * the next. This one has no neighbours — it is the whole screen, behind everything — so a fade
 * could only put a pale strip along the top and bottom of the page. The hard slice a zero fade
 * leaves at each edge is the failure mode described at length in TileField; here it is invisible,
 * because the layer is blurred and hangs 6% off every side of the viewport before it is clipped.
 *
 * Module scope, not inline. `fade` is a dependency of the material's useMemo, so a fresh object
 * literal on every render would rebuild the shader on every render.
 */
const BACKDROP_FADE: FieldFade = { lo: 0, hi: 0 };

/**
 * How far out of focus the field behind the card is.
 *
 * Tuned against the smallest thing in it rather than by eye, and a cube is a big thing: the field
 * runs a 46px pitch, and blur spreads a feature's brightness over an area, so it destroys small
 * features long before large ones. 22px erased this layer outright — the cubes averaged out into
 * flat sand and the page looked like the backdrop had failed to load. 8px is enough that they
 * read as a texture rather than as a second thing to look at, and not so far that they stop being
 * cubes. It is deliberately heavier than the 1.8px the falling code wanted, for the same reason
 * in reverse: a 19px glyph has to survive blur AS a glyph, a cube only has to survive as a shape.
 */
const BACKDROP_BLUR = '8px';

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
         else is a screen that goes black the day that somewhere else changes.

         SAND, which is the ground every other page of this site stands on, and the ground the
         field on top of it is standing on too — so the one frame before WebGL has anything on
         screen is already the right colour rather than a flash of something else. It used to be
         INK, which was defensible while the backdrop was a night sky, but a sign-in screen is the
         first thing a visitor sees and one that is dark when the rest of the site is warm reads
         as a different product's login bolted on. */
      style={{ background: SAND, color: INK }}
    >
      {/* The ground the card sits on: the site's own cube field, out of focus.

          The site's OWN, and that is the point of it rather than a shortcut. Anything bespoke back
          here — a night sky, falling code — is a scene this page owns and no other page has, and
          a sign-in screen that looks like nowhere else on the site is the one screen that can
          least afford to.

          Blur is the rest of it. A second field at full sharpness behind a card containing a
          THIRD field is three things asking to be looked at; blurred, it becomes a texture, and
          the card reads as forward simply by being the only crisp thing on the screen. That depth
          cue is doing the work a drop shadow would otherwise have to do.

          `-inset-[6%]` and not `inset-0`: `filter: blur()` samples what is outside the element as
          transparent, so a layer blurred at its own edges fades out along all four sides and the
          page shows a pale halo around the field. Oversizing it past the clip on the parent puts
          those soft edges off screen. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -inset-[6%]" style={{ filter: `blur(${BACKDROP_BLUR})` }}>
          <TileField tones={SAND_TONES} fade={BACKDROP_FADE} />
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
      {/* No background of its own. It used to paint solid SAND behind both halves, which was
          needed while the seam was a stepped coastline: a bay cut into the blue had to show
          beach rather than a hole through to the page. With a straight seam every pixel of the
          card belongs to one half or the other, so the card can be transparent — and it has to
          be, or it would sit opaque behind the glass half and there would be nothing for the
          blur to sample. */}
      <div
        dir="ltr"
        className="relative w-full max-w-[64rem] grid grid-cols-1 lg:grid-cols-2 rounded-[0.5rem] overflow-hidden"
      >
        {/* ── Words ─────────────────────────────────────────────────────────────────────── */}
        {/* Padding is SYMMETRIC, and it is allowed to be because the seam beside it is straight.
            It used to be lopsided — 56px left, 112px right — purely as clearance: the seam was a
            stepped coastline that hung about 80px of blue over this column, and without the extra
            padding the deepest step landed on the copy and on the two buttons. The steps are gone
            (see .nq-coast), the overhang with them, so the copy can sit centred in its own half
            again instead of being pushed off it. */}
        <div
          dir={isAr ? 'rtl' : 'ltr'}
          className="flex flex-col px-6 py-10 sm:px-10 sm:py-12 lg:px-14 backdrop-blur-xl"
          style={{
            background: SAND_GLASS,
            /* A hairline of the paper tone along the top and left edges. On glass it reads as
               the lit edge of a pane rather than a border — without it the panel's boundary
               against the sky is only a change of blur, which disappears wherever the sky
               behind it happens to be empty. */
            boxShadow: 'inset 1px 1px 0 rgba(246, 241, 233, 0.35)',
          }}
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
          {/* `.nq-coast` is the seam: a plain blue fill at this cell's own bounds. It used to
              overhang this cell and carry a stepped clip-path, which is why it needed rules per
              breakpoint; a straight edge is the same edge at every width, so the class is four
              lines now and there is no breakpoint in it. */}
          <div className="nq-coast">
            <TileField tones={SECTION_TONES} fade={SECTION_FADE} />
          </div>
        </div>
      </div>
    </div>
  );
};
