import React, { useState } from 'react';
import { FileCheck, Clock, Download } from 'lucide-react';
import { Language } from '../lib/i18n';
import { loginWithGoogle, authErrorMessage } from '../lib/auth';
import { ERROR, OBSIDIAN, ORANGE, WHITE } from '../lib/homePalette';
import { CardField } from './CardField';
import { NuvaiqLogo } from './NuvaiqLogo';
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
 * The muted ink INSIDE the dark panel — white at the lightest opacity that still clears 4.5:1
 * against it. WHITE at 0.62 over OBSIDIAN resolves to `#A1A2A3`, which measures 7.75:1 there.
 */
const INK_MUTED_ON_DARK = 'rgba(255, 255, 255, 0.62)';

/**
 * The muted ink ON THE GLASS, and it is a different number from the one above for a reason worth
 * keeping: the surface under it is not a colour, it is whatever the card field happens to be
 * showing through 62% white.
 *
 * The old page's trick of dropping a grey in for "quiet" does not survive that. Measured against
 * the worst case the glass can composite to — an Orange card directly behind it, `#FFC69E` — the
 * site's own muted grey STEEL_LIGHT lands at 3.24:1 and fails, and it still fails at every glass
 * opacity up to 0.86 (4.23:1). Quiet has to be made out of the ink that passes rather than out of
 * a lighter colour: OBSIDIAN at 0.68 measures 5.90:1 over that same worst case and 7.05:1 over
 * the plain ground, so the fine print is dimmed without ever going under the floor.
 */
const INK_MUTED_ON_GLASS = 'rgba(8, 10, 13, 0.68)';

/**
 * Standalone sign-in page: two panels of frosted white glass floating on a field of 3D template
 * cards, to the owner's whiteboard.
 *
 * ## The shape, and what each half is for
 *
 * The words panel and the action panel, side by side on a wide screen and stacked on a phone.
 * The split is the point: one panel says why an account is worth having, the other is the two
 * buttons and nothing else. The layout this replaces ran all of it down one 16rem column inside
 * a skewed band, where the pitch and the button competed for the same narrow measure.
 *
 * ## Why the words sit on an opaque black box inside the glass
 *
 * Straight from the sketch, and it is the right instinct: glass is a translucent surface over a
 * moving background, and a paragraph on it is a paragraph whose contrast changes as the cards
 * drift past. The dark box is opaque, so the copy has ONE ground — WHITE on OBSIDIAN, 18.48:1,
 * whatever happens behind the panel.
 *
 * The action panel has no such box because it needs none: its two buttons carry their own fills,
 * and the only loose text on the glass is the fine print, which uses the measured ink above.
 *
 * ## The r3f layer
 *
 * CardField runs ONCE, behind everything, and is deliberately out of focus. It is also what makes
 * the glass legible AS glass: frosted white over a flat colour is just a lighter flat colour. The
 * page has been through a blurred cube field, falling code, a rotating panel of stills and a
 * drifting grid of cards, and every one of them failed the same way until it was pushed out of
 * focus — it became a second thing to read on a screen that has one job, which is a button.
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
      className="nq-login relative min-h-screen overflow-hidden font-['Cairo'] flex items-center justify-center px-4 py-10 sm:px-6 sm:py-12 selection:bg-[#080A0D] selection:text-[#F7F7F5]"
      /* Painted here rather than left to the document. A screen that gets its background from
         somewhere else is a screen that goes black the day that somewhere else changes, and this
         is the first screen a visitor sees. `.nq-coast` below paints the same value as a plain
         CSS fill, so this is only ever seen in the frame before the stylesheet lands. */
      style={{ background: WHITE, color: OBSIDIAN }}
    >
      {/* ── The card field's own ground ───────────────────────────────────────────────── */}
      {/* `.nq-coast` is the flat WARM WHITE fill; the field on it is the texture, and the fill is
          what shows through the gaps between the cards — CardField's canvas is transparent.

          The cards say something cubes could not: what sits behind a sign-in form is the
          catalogue it gets you into, and a card is the shape a template takes everywhere else on
          this site. */}
      <div className="nq-coast" aria-hidden="true">
        <CardField />
      </div>

      {/* ── The two panels ────────────────────────────────────────────────────────────── */}
      {/* Words first, action second, in READING order rather than in fixed screen positions —
          so in Arabic the pitch starts at the right edge where the eye does and the buttons
          land at the left, and in English the pair mirrors. A sign-in screen is read before it
          is used; the panel that argues for an account belongs where reading starts.

          `items-stretch` (the grid default) is doing real work: it is what makes the dark box in
          the left panel run the full height of the taller of the two, so the pair reads as one
          object split down the middle rather than as two cards that happen to be adjacent. */}
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="relative w-full max-w-5xl grid gap-4 sm:gap-5 lg:grid-cols-2 animate-fade-in"
      >
        {/* ── Panel one: the words ────────────────────────────────────────────────────── */}
        {/* Thin padding on the glass, because here the glass is a FRAME: the dark box is the
            surface and the frost is the mount it sits in. The action panel opposite uses the
            same class with full padding, where the glass is the surface itself. */}
        <section className="nq-glass p-4 sm:p-5">
          <div
            className="h-full rounded-[1.35rem] px-6 py-9 sm:px-8 sm:py-11 flex flex-col justify-center"
            style={{ background: OBSIDIAN, color: WHITE }}
          >
            {/* Line height 1.35 and up, throughout. Arabic needs more of it than Latin at the
                same size: the ascenders (ل ك ا) and the marks above them — the shadda in
                "سجّل" — occupy space Latin leaves empty, so leading that looks airy in English
                is cramped here. Nothing on this page sets below 13px, on a script that carries
                meaning in dot clusters (ث against ت, ش against س) one or two pixels across. */}
            <h1 className="text-[1.75rem] sm:text-[2rem] lg:text-[2.15rem] font-black leading-[1.35]">
              {isAr ? 'سجّل دخولك إلى' : 'Sign in to your'}
              <br />
              {isAr ? 'حسابك في NUVAIQ' : 'NUVAIQ account'}
            </h1>

            <p
              className="mt-3.5 text-[15px] sm:text-base leading-[1.75]"
              style={{ color: INK_MUTED_ON_DARK }}
            >
              {isAr
                ? 'ادخل بحساب Google لمتابعة عقودك وقوالبك المحفوظة في مكان واحد.'
                : 'Continue with Google to follow your contracts and saved templates in one place.'}
            </p>

            {/* Three, and three is the cap rather than the count that happened to fit: a list of
                reasons long enough to need scanning is competing with the button opposite it. */}
            <ul className="mt-6 sm:mt-7 space-y-3.5">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-[14px] font-medium leading-[1.6]">
                  {/* Plain ORANGE, not the `_ON_LIGHT` variant — this box is OBSIDIAN, where
                      Orange measures 6.90:1 and has no legibility problem to fix. `mt-px`
                      rather than `items-start`: the icon is a 16px square whose artwork is
                      centred in it, and Arabic sits low in its own line box, so optically
                      centred and box-centred are one pixel apart here. */}
                  <Icon className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" style={{ color: ORANGE }} />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Panel two: the action ───────────────────────────────────────────────────── */}
        <section className="nq-glass px-6 py-9 sm:px-8 sm:py-11 flex flex-col justify-center">
          {/* The mark, where the sketch drew a circle to mark the spot. No circle drawn: the
              sketch's note says that shape was standing in for the logo, not asking to be one.

              It DOES need the dark plate, and that is not decoration either. The asset is a
              white mark with a hairline dark outline, built for the dark chrome it sits in
              everywhere else on the site — on frosted white, all that would show is the
              hairline. The plate gives it the ground it was drawn for, and echoes the dark box
              in the panel opposite so the pair carries one dark element each. */}
          <div
            className="self-center inline-flex items-center rounded-2xl px-5 py-3"
            style={{ background: OBSIDIAN }}
          >
            <NuvaiqLogo size={30} />
          </div>

          {/* `role="alert"` so a sign-in failure is announced rather than only drawn. A message
              that appears silently under a button somebody just pressed is a message a screen
              reader user never receives.

              ERROR's own light-ground pattern, because the panel under this is light now: a
              barely-tinted white fill with the darkened `ON_LIGHT` red as the ink. The dark-band
              version this replaces (a translucent red over near-black) would be invisible here. */}
          {error && (
            <div
              role="alert"
              className="mt-6 p-3 rounded-[0.5rem] text-[13px] font-medium leading-[1.6]"
              style={{
                background: 'rgba(202, 59, 59, 0.10)',
                color: '#CA3B3B',
                boxShadow: 'inset 0 0 0 1px rgba(202, 59, 59, 0.30)',
              }}
            >
              {error}
            </div>
          )}

          {/* One button, because there is only one path: Firebase creates the account on a
              first-time Google sign-in, so "log in" and "sign up" are the same click here and
              offering both would be two doors into one room.

              `signal`, which is Orange with OBSIDIAN text and a DARK focus ring. Both halves of
              that matter on this panel: white on Signal Orange measures 2.87:1 and does not read
              (Obsidian on it is 6.90:1), and `chrome`'s white ring — correct on the dark band
              this page used to have — would vanish against frosted white.

              `radius="xl"`, not the default pill: the sketch draws rounded rectangles, and a
              full radius on a wide short button inside a rounded card reads as a capsule
              floating in a box rather than as part of it. */}
          <NqButton
            tone="signal"
            variant="solid"
            size="lg"
            radius="xl"
            block
            loading={isSubmitting}
            onClick={handleGoogleSignIn}
            className={error ? 'mt-4' : 'mt-8'}
            icon={<GoogleIcon />}
          >
            {isAr ? 'المتابعة عبر Google' : 'Continue with Google'}
          </NqButton>

          {/* Browsing the catalogue, opening a demo and reading the timeline need no account, and
              requiring one to look around turns a visitor away before they have seen anything
              worth signing in for. The line underneath says where the wall actually is, so
              choosing this does not feel like it might cost them something later.

              `white` quiet, and the tone is chosen by the FOCUS RING rather than by the fill.
              `glass` solid looks closer to the sketch — a near-opaque white pill — but its ring
              is white, and nqSurface says why in as many words: darkRing is keyed to the page
              behind the button, and `glass` is set for the hero's OBSIDIAN panel, where a dark
              ring would vanish. This page is the mirror of that: light ground, frosted panel,
              so a white ring is the one that disappears and a keyboard user loses the button.
              `white` quiet is the light-ground pair — PAPER_DEEP fill, Obsidian label, dark ring
              — which reads as the secondary next to the Orange without needing a new tone. */}
          <NqButton
            tone="white"
            variant="quiet"
            size="lg"
            radius="xl"
            block
            disabled={isSubmitting}
            onClick={onContinueAsGuest}
            className="mt-3"
          >
            {isAr ? 'أكمل كضيف' : 'Continue as guest'}
          </NqButton>

          {/* Both lines under the buttons, per the sketch. Centred here and not start-aligned,
              because everything above them in this panel is centred too — the mark, and two
              block buttons whose own labels are centred. A start edge would be one element out
              of five disagreeing with the other four. */}
          <p
            className="mt-6 text-[13px] font-medium leading-[1.65] text-center"
            style={{ color: INK_MUTED_ON_GLASS }}
          >
            {isAr
              ? 'تصفّح القوالب وجرّبها بحرية — تسجيل الدخول مطلوب فقط عند إنشاء عقد.'
              : 'Browse and try the templates freely — an account is only needed to create a contract.'}
          </p>

          <p
            className="mt-3 text-[12px] font-medium leading-[1.6] text-center"
            style={{ color: INK_MUTED_ON_GLASS }}
          >
            {isAr ? '© NUVAIQ — جميع الحقوق محفوظة' : '© NUVAIQ — All rights reserved'}
          </p>
        </section>
      </div>
    </div>
  );
};
