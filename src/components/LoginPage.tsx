import React, { useState } from 'react';
import { FileCheck, Clock, Download } from 'lucide-react';
import { Language } from '../lib/i18n';
import { loginWithGoogle, authErrorMessage } from '../lib/auth';
import { ERROR, OBSIDIAN, ORANGE, ORANGE_ON_DARK, WHITE } from '../lib/homePalette';
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
 * against it.
 *
 * It measured 7.75:1 while that panel was OBSIDIAN. The panel is the accent now, `#273036`, so
 * the same ink composites to 6.18:1 — less headroom, still well past the floor, and the reason
 * this stayed at 0.62 rather than being nudged up with the ground.
 */
const INK_MUTED_ON_DARK = 'rgba(255, 255, 255, 0.62)';

/**
 * The muted ink ON THE GLASS, and it is a different number from the one above for a reason worth
 * keeping: the surface under it is not a colour, it is whatever the card field happens to be
 * showing through 62% white.
 *
 * The old page's trick of dropping a grey in for "quiet" does not survive that. Measured against
 * the worst case the glass can composite to, the site's own muted grey STEEL_LIGHT failed at
 * every glass opacity up to 0.86. Quiet has to be made out of the ink that passes rather than
 * out of a lighter colour, and OBSIDIAN at 0.68 is that ink.
 *
 * The worst case itself moved when the accent stopped being orange. It used to be a bright
 * Orange card compositing to `#FFC69E`; the cards are dark now, so 68% white over a lit card
 * face resolves to `#C1C3C5` instead — a DARKER worst case, which costs some of the margin. Both
 * still clear the floor and nothing here had to move: the muted ink goes 6.32:1 —> 5.43:1 and
 * full-strength ink 15.23:1 —> 11.25:1, against 7.02:1 and 19.38:1 over the plain ground.
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
 * drift past. The dark box is opaque, so the copy has ONE ground — WHITE on the accent, 12.53:1,
 * whatever happens behind the panel. (18.48:1 while the box was OBSIDIAN; it is the accent now,
 * to match the cards, and opacity is what this paragraph is about rather than the exact ratio.)
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

      {/* ── The card ────────────────────────────────────────────────────────────── */}
      {/* ONE surface, which is the change from the drawing before this: that one had two cards
          meeting in the middle, this one has a single card with a dark block inside it. Read off
          the revision (canvas 687x383, card 679x375, aspect 1.81):

            padding        8.5% of the card's width at the sides, 4.3% top and bottom — as a
                           percentage up to `lg` and in rem past it, because a CSS percentage
                           resolves against the CONTAINING BLOCK and the card stops growing at
                           max-w-5xl while the page does not. Left as a percentage it reached
                           119px at 1440, which is 11.7% of the card rather than 8.5%.
            dark block     34.6% of the card, which is 41.7% of the row inside that padding,
                           and the full inner height
            circle         32.6% of the region beside the block
            buttons        45.9% of that region, centred in it

          `direction: ltr` on the card, with `dir` handed back to each half, is what keeps the
          dark block on the LEFT in both languages while the words inside it still set
          right-to-left in Arabic. Ordering with `order-*` would need a pair per breakpoint and
          would still leave the halves mirrored.

          Below `md` the row stacks and the dark block goes on top, full width. */}
      <div
        style={{ direction: 'ltr' }}
        className="nq-glass nq-rise relative w-full max-w-5xl p-5 sm:p-6 md:px-[8.5%] md:py-[4.3%] lg:px-[5.4rem] lg:py-[2.7rem]"
      >
        <div className="flex flex-col md:flex-row md:items-stretch gap-5 md:gap-0">
          {/* ── The dark block ───────────────────────────────────────────── */}
          {/* 41.7% of the row, which is the drawing's 34.6% of the whole card once the padding
              is taken off both sides. `items-stretch` on the row is what gives it the full inner
              height the drawing has it at.

              Rounded at every size, on the owner's call. The drawing has it as a sharp
              rectangle and it was built that way for one revision; a square block inside a
              rounded card is a deliberate look, and this is not the one wanted. It takes the
              card's own corner family instead. */}
          <div
            dir={isAr ? 'rtl' : 'ltr'}
            className="md:w-[41.7%] md:shrink-0 rounded-2xl shadow-[0_4px_10px_-2px_rgba(8,10,13,0.12),0_20px_44px_-18px_rgba(8,10,13,0.40)] px-6 py-9 md:px-6 md:py-9 lg:px-7 lg:py-10 flex flex-col justify-center text-center"
            /* The accent, not OBSIDIAN, so this panel is the same colour as the cards drifting
               behind the glass. Every ink in here is light-on-dark and the ground rose two and a
               half stops, so all three were re-measured: headline 12.53:1, muted paragraph
               6.18:1, perk icons 8.40:1, and the panel itself 7.60:1 against the glass card it
               sits on. That last one is the one that could have broken the LAYOUT rather than
               the text — a panel that stops separating from its card stops being a panel. */
            style={{ background: ORANGE, color: WHITE }}
          >
            {/* Line height 1.35 and up, throughout. Arabic needs more of it than Latin at the
                same size: the ascenders (ل ك ا) and the marks above them — the shadda in
                "سجّل" — occupy space Latin leaves empty, so leading that looks airy in English
                is cramped here. Nothing on this page sets below 13px, on a script that carries
                meaning in dot clusters (ث against ت, ش against س) one or two pixels across. */}
            {/* Each step is the largest size that still sets "حسابك في NUVAIQ" on ONE line,
                measured in the real face rather than estimated — the estimate was wrong twice,
                both times optimistic. The size follows the MEASURE, and the measure is this block
                rather than the viewport, which is why the `md` step is smaller than the `sm` one:
                `sm` is still stacked at full page width, and `md` is where the block takes its
                41.7% share. */}
            <h1 className="text-[1.75rem] sm:text-[2rem] md:text-[1.375rem] lg:text-[1.75rem] xl:text-[2rem] font-black leading-[1.35]">
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
                reasons long enough to need scanning is competing with the button beside it.

                Centred with everything else in this block, on the owner's call — which for a list
                means `justify-center` on the row and not only `text-center` on the parent: each
                row is a flex line of icon + label that fills the block's width, so centring the
                text inside it moves nothing. The icons stop forming a column down the start edge
                and travel with their labels instead. */}
            <ul className="mt-6 sm:mt-7 space-y-3.5">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center justify-center gap-2.5 text-[14px] font-medium leading-[1.6]">
                  {/* ORANGE_ON_DARK, because this block is OBSIDIAN and the accent is dark now:
                      `#273036` on it is 1.47:1, the light twin 12.39:1. While the accent was
                      Orange this was the plain value and needed no twin at all. `mt-px`
                      rather than `items-start`: the icon is a 16px square whose artwork is
                      centred in it, and Arabic sits low in its own line box, so optically
                      centred and box-centred are one pixel apart here. */}
                  <Icon className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" style={{ color: ORANGE_ON_DARK }} />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── The half beside it ──────────────────────────────────────── */}
          {/* Everything in it is centred, which is what the drawing has: the circle, the two
              buttons and the lines under them all share one axis down the middle of the region.

              120ms behind the card it sits in. Enough to read as an order — the surface, then
              what is on it — without becoming a queue the visitor waits through. */}
          <div
            dir={isAr ? 'rtl' : 'ltr'}
            style={{ animationDelay: '120ms' }}
            className="nq-rise flex-1 min-w-0 flex flex-col items-center justify-center px-2 py-2 md:py-4"
          >
            {/* The mark, in the place the drawing marks with a circle. No disc behind it any
                more, on the owner's call — the shape was standing in for the logo, and now the
                logo is all there is.

                Which leaves one thing to solve rather than to draw around: the asset is WHITE
                artwork with a hairline dark outline, made for the dark chrome it sits in
                everywhere else on this site. Dropped straight onto a frosted white card, the only
                part of it that would show is the hairline. It is inverted in CSS instead — see
                index.css — so the white glyph goes dark and the hairline is what disappears.

                Mark only, no wordmark: the lockup is a horizontal NAME + MARK pair, and the name
                is already the first line of the heading beside it.

                Stepped by breakpoint rather than set in `%`, because a percentage inside a flex
                column resolves against the wrong axis and would leave it an oval. Smaller than
                the disc it replaces (96/112/128 against 112/128/160): a bare glyph reads larger
                than the same measurement filled.

                It does not answer the pointer any more, on the owner's call. `.nq-logo-mark` is
                down to two jobs: sizing the image to this box, and inverting it. */}
            <div className="nq-logo-mark grid place-items-center w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32">
              <NuvaiqLogo size={54} showText={false} />
            </div>

            {/* `role="alert"` so a sign-in failure is announced rather than only drawn. A message
                that appears silently under a button somebody just pressed is a message a screen
                reader user never receives.

                ERROR's own light-ground pattern, because the surface under this is light: a
                barely-tinted white fill with the darkened `ON_LIGHT` red as the ink. The dark-band
                version this replaced (a translucent red over near-black) would be invisible. */}
            {error && (
              <div
                role="alert"
                className="w-full max-w-[20rem] md:max-w-[17rem] mt-6 p-3 rounded-[0.5rem] text-[13px] font-medium leading-[1.6] text-center"
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

                `signal`, which is the accent with WHITE text and a DARK focus ring. Both halves
                still matter, and the first one has inverted since this note was written: it read
                "Orange with OBSIDIAN text" because white on Signal Orange was 2.87:1. The accent
                is `#273036` now, so Obsidian on it is 1.47:1 and white 13.44:1. The ring is
                unchanged: `chrome`'s white one would still vanish against frosted white.

                `radius="xl"`, not the default pill: the drawing shows rounded rectangles, and a
                full radius on a wide short button reads as a capsule floating in a box rather
                than as part of it.

                17rem is the drawing's 45.9% of this region at the desktop size — 268px of a
                583px region — and it is a max rather than a width so the column simply becomes
                the card on a phone. It was 14rem for one revision, which was under the drawing
                AND under the label: "المتابعة عبر Google" plus its icon does not fit 224px
                and set on two lines, which showed up as a button 60px tall beside one of 56.

                `mt-[28px]` and `mt-[22px]` are the gaps as drawn, not a rounded spacing step: the
                space above the first button and the space between the two are different in the
                reference, and rounding both to one token is what would flatten it. */}
            <div className="w-full max-w-[20rem] md:max-w-[17rem]">
              <NqButton
                tone="signal"
                variant="solid"
                size="lg"
                radius="xl"
                block
                loading={isSubmitting}
                onClick={handleGoogleSignIn}
                className={`${error ? 'mt-4' : 'mt-[28px]'} shadow-[0_2px_6px_-1px_rgba(8,10,13,0.10),0_10px_22px_-10px_rgba(8,10,13,0.28)]`}
                icon={<GoogleIcon />}
              >
                {isAr ? 'المتابعة عبر Google' : 'Continue with Google'}
              </NqButton>

              {/* Browsing the catalogue, opening a demo and reading the timeline need no account,
                  and requiring one to look around turns a visitor away before they have seen
                  anything worth signing in for. The line underneath says where the wall actually
                  is, so choosing this does not feel like it might cost them something later.

                  WHITE, on the owner's call, where this was the warm grey `white` quiet gives.
                  It took a new tone to do it honestly rather than a class at the call site.

                  `glass` solid has the fill but the wrong ring: darkRing is keyed to the PAGE
                  behind the button, and `glass` is set for the hero's Obsidian panel, so on this
                  light card its white ring vanishes and a keyboard user loses the button. `frost`
                  is `glass` with that one thing flipped — the same move `signal` already makes for
                  Orange on a light ground.

                  White and filled, with a soft shadow under it rather than a line around it.
                  That distinction is the whole history of this button: a white fill measures
                  1.06:1 against this card and has no silhouette of its own, a 1px outline fixed
                  that and read as a frame, and the shadow does the same job by lifting the fill
                  above the card instead of drawing a border on it.

                  The shadow is set here rather than in the tone, because it belongs to this
                  page's composition and not to `frost`: the card lost its own shadow in the same
                  pass, and what moved is where the depth lives, not how much of it there is. */}
              <NqButton
                tone="frost"
                variant="solid"
                size="lg"
                radius="xl"
                block
                disabled={isSubmitting}
                onClick={onContinueAsGuest}
                className="mt-[22px] shadow-[0_2px_6px_-1px_rgba(8,10,13,0.10),0_10px_22px_-10px_rgba(8,10,13,0.28)]"
              >
                {isAr ? 'أكمل كضيف' : 'Continue as guest'}
              </NqButton>
            </div>

            {/* Both lines under the buttons, from the first sketch's note. This wireframe draws
                nothing below the second button, but a copyright line is not something to drop
                because a later drawing left it out.

                Outside the 17rem column deliberately: these are sentences, and in 272px the first
                one sets in four lines. They take the region's own measure and stay centred, which
                is what everything above them is. */}
            <p
              className="mt-7 text-[13px] font-medium leading-[1.65] text-center"
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
          </div>
        </div>
      </div>
    </div>
  );
};
