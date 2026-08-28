import React, { useState } from 'react';
import { FileCheck, Clock, Download } from 'lucide-react';
import { Language } from '../lib/i18n';
import { loginWithGoogle, authErrorMessage } from '../lib/auth';
import { OBSIDIAN, ORANGE_ON_LIGHT, WHITE } from '../lib/homePalette';
import { CardField } from './CardField';
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
 * The muted ink for the band below, at the lightest opacity that still clears 4.5:1.
 *
 * Measured rather than picked, and re-measured every time the surface under it changed: solid
 * sand, an ink sky, falling code, frosted glass over a cube field, solid sand, Obsidian's own
 * blue predecessor, and now solid WHITE — the brand's warm light-neutral, in the brand's own
 * Obsidian rather than any earlier ink.
 *
 * The band is opaque, so the surface IS the swatch: OBSIDIAN at 0.62 over WHITE resolves to
 * `#636465`, which measures 5.53:1 there — comfortable room above the 4.5:1 floor.
 */
const INK_MUTED = 'rgba(8, 10, 13, 0.62)';

/**
 * Standalone sign-in page: three layers on a full-bleed screen. A field of 3D template cards in
 * the brand's own dark ground (OBSIDIAN), a WHITE band leaning across it, and the company's words
 * on the band.
 *
 * Self-contained by design — it renders its own ground rather than mounting inside the site's
 * shared chrome. App gives it the whole viewport (see the early return there), so there is no
 * navbar to sit under and no page padding to clear. The only things it takes from the rest of the
 * app are the pieces that genuinely are shared: the auth call, the palette, the button system and
 * the tile field.
 *
 * The field runs ONCE, behind everything, and it is deliberately out of focus. This page has
 * been through a blurred cube field, falling code, a rotating panel of stills and a drifting
 * grid of cards, and every one of them failed the same way: it became a second thing to read on
 * a screen that has one job, which is a button. Out of focus is what lets a background be
 * atmosphere instead of content.
 *
 * The type is sized from the column rather than from the viewport, and the column is sized from
 * the lean. See `.nq-lean-copy` in index.css for that derivation and the block below for the
 * scale that falls out of it.
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
      className="nq-login relative min-h-screen overflow-hidden font-['Cairo'] flex items-center selection:bg-[#080A0D] selection:text-[#F7F7F5]"
      /* Painted here rather than left to the document. The page this replaced was white-on-black
         and inherited its ground from the body; a screen that gets its background from somewhere
         else is a screen that goes black the day that somewhere else changes.

         OBSIDIAN, because that is what covers the screen now — the brand's own dark neutral,
         used as a full-bleed fill exactly the way it fills every other whole-section colour panel
         in this layout (see homePalette.ts on why that role is Obsidian rather than a tint of
         Orange). `.nq-coast` below paints the same value as a plain CSS fill, so this is only
         ever seen in the frame before the stylesheet lands — but a fallback that does not match
         what covers it is a flash of the wrong colour, and this is the first screen a visitor
         sees. It was flat Cobalt Deep before the brand replaced it, periwinkle before THAT, sand
         while the blue was a card on a sand page before that, and ink before that, while the
         backdrop was a night sky.

         `color: WHITE`, not dark ink — Obsidian is a dark ground, and everything that inherits
         this default text colour needs to be the light member of the pair.

         No padding and no `place-items-center` any more. The card they were centring is gone;
         the layers are the page, and `flex items-center` is here only to hold the copy in the
         middle of a screen it no longer fills. */
      style={{ background: OBSIDIAN, color: WHITE }}
    >
      {/* Three layers, back to front: the blue, the band, the words. They used to sit inside a
          card — a 64rem box with rounded corners and a shadow, floating on a sand page. The box is
          gone and these are the page.

          It went because the page behind it did. A card is an object ON something, and once the
          ground was flat sand with nothing in it, the composition was a rectangle of design
          sitting in an empty margin — the margin was not framing anything, it was left over. Full
          bleed, the blue runs to all four edges and the band runs the height of the screen,
          which is the same picture without the part that was doing nothing.

          `overflow-hidden` on the page is what makes the lean safe: the band is skewed, so its
          corners travel past the screen's own edges and this is what cuts them off.

          The page is `flex items-center` and the words block below keeps its own `min-h-[34rem]`
          rather than stretching. That is deliberate and it is what protects the copy from the
          taller viewport: a skew costs `height x tan(angle)` of width, so a block that grew to
          fill a 1200px screen would lean 84px across the copy instead of 38 and take the
          clearance with it. The BAND spans the screen and leans further on a tall one, which is
          the whole point of it being full bleed; the COPY stays in the middle 34rem, where the
          arithmetic that sized `.nq-lean-copy` still holds. */}
      {/* ── The dark ground ───────────────────────────────────────────────────────────── */}
      {/* `.nq-coast` is the flat Obsidian fill; the field on it is the texture, and the fill
          is what shows through the gaps between the cards — CardField's canvas is transparent, so
          the dark ground is declared once, here, in the place the rest of the page reads it from.

          It used to be the site's cube field. The cards say something the cubes could not: what
          sits behind a sign-in form is the catalogue it gets you into, and a card is the shape a
          template takes everywhere else on this site. */}
      <div className="nq-coast" aria-hidden="true">
        <CardField />
      </div>

      {/* ── The band ──────────────────────────────────────────────────────────────────── */}
      {/* Decorative and empty: it is the surface, and the words are a sibling above it rather
          than children inside it, because a skewed parent skews its text (see .nq-lean).

          SOLID white, not glass. The panel this replaced was frosted glass at 0.72 over a blurred
          light backdrop, which worked while what it was mixing with was already light — but 0.72
          of WHITE over OBSIDIAN's near-black fill mixes down into a flat mid-grey the brand's own
          light-neutral family does not contain, and re-tuning the mix for every future ground
          change is exactly the fragility a solid fill avoids. Opaque is also a compositing pass
          saved on a full-height element, and the contrast floor stops depending on which cube
          face happens to be under the copy. */}
      <div
        aria-hidden="true"
        className="nq-lean"
        style={{
          background: WHITE,
          /* Two shadows doing two jobs. The inset hairline is the lit edge of a pane, and it
             is the reason this is a skew rather than a clip path. The outer one is the lift:
             against a field of cubes that are themselves shaded, a flat panel with no shadow
             reads as a hole cut in the card rather than as a surface laid on it. */
          boxShadow:
            'inset 1px 1px 0 rgba(255, 255, 255, 0.5), 0 26px 52px -30px rgba(7, 17, 31, 0.6)',
        }}
      />

      {/* ── The words ─────────────────────────────────────────────────────────────────── */}
      {/* `min-h` and not `h-full`, and this is the load-bearing line of the whole layout. The
          two layers above are absolute and stretch to the screen; this one is the only thing in
          flow, and it deliberately does NOT follow them. It claims 34rem in the middle and the
          page centres it.

          The reason is the lean. A skew costs `height x tan(angle)` of usable width, measured
          across whatever the copy actually spans — so a block stretched to a 1200px screen would
          have the band cross it by 84px instead of 38 and would eat the clearance `.nq-lean-copy`
          was sized against, on exactly the tall monitors nobody tests. Fixed at 34rem, the copy
          sees the same lean at every viewport height, and the band is free to run the full screen
          and lean as far as it likes around it.

          No horizontal padding, deliberately: the clearance between the copy and the band's
          slanted edges is set once, on `.nq-lean-copy`. Padding here would be a second helping
          of the same clearance, taken out of the copy rather than out of the field. */}
      {/* `color: OBSIDIAN`, overriding the page wrapper's WHITE. That default serves the outer
          OBSIDIAN ground; this block visually sits on the light WHITE band beside it, not on the
          dark fill, so anything in here that does not set its own colour (the heading, the perk
          labels) needs to inherit dark, not light. Every element that already carries an explicit
          colour (INK_MUTED text, the error banner) is unaffected either way. */}
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="relative w-full flex flex-col min-h-[34rem] py-10 sm:py-12 lg:py-14"
        style={{ color: OBSIDIAN }}
      >
        {/* flex-1 + centred, so the block sits in the middle of its 34rem and the copyright line
            stays on its floor rather than being dragged up under the buttons. */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Narrower than the 25rem it used to be, and the number is not a taste call — it
              falls out of the lean. See `.nq-lean-copy`, where it is derived.

              Centred on the card, which is also the band's centre at half height, so the
              margin lost at the top-left is exactly the margin gained at the bottom-right.
              That asymmetry is not a bug to tune out: an upright column in a leaning band
              cannot be even at both ends, and the even-at-the-middle answer is the one that
              keeps the same total clearance at both. */}
          <div className="nq-lean-copy">
            {/* ── The type scale ─────────────────────────────────────────────────────────────
                Four sizes, and every one of them steps with the COLUMN rather than with the
                viewport, because the column is what the line has to fit inside. 16rem holds
                28 / 15 / 14 / 13; 25rem holds 34 / 16 / 13 / 13.

                It replaces 28 / 13 / 12 / 11, which was not a scale so much as four separate
                decisions to shave a pixel off something that would not fit. Three of those
                four sat at or under the 12px floor, on a script that carries meaning in dot
                clusters — ث against ت, ش against س, the two dots under ي — features one or two
                pixels across at that size. Latin degrades into "small" there. Arabic degrades
                into "ambiguous", which is a different problem and a worse one.

                Nothing here is under 13px now, and the gaps between steps are wide enough to
                read as deliberate: the old 13/12/11 ladder put three near-identical sizes in
                one 240px column, which looks like drift rather than hierarchy.

                Line height is 1.6-1.75 throughout, up from 1.25-1.33. Arabic needs more of it
                than Latin at the same size: the ascenders (ل ك ا) and the marks above them
                (the shadda in "سجّل") occupy space Latin leaves empty, so a leading that looks
                airy in English is cramped here. */}
            {/* At 16rem the ceiling is 1.75rem — "حسابك في NOVAIQ" sets at ~238px in a
                256px column, and 2.1rem would wrap a two-word phrase across three lines. At
                25rem there is room for the 2.1rem the desktop layout always ran. */}
            <h1 className="text-[1.75rem] lg:text-[2.1rem] font-black leading-[1.35]">
              {isAr ? 'سجّل دخولك إلى' : 'Sign in to your'}
              <br />
              {isAr ? 'حسابك في NOVAIQ' : 'NOVAIQ account'}
            </h1>

            <p className="mt-3 lg:mt-4 text-[15px] lg:text-base leading-[1.75]" style={{ color: INK_MUTED }}>
              {isAr
                ? 'ادخل بحساب Google لمتابعة عقودك وقوالبك المحفوظة في مكان واحد.'
                : 'Continue with Google to follow your contracts and saved templates in one place.'}
            </p>

            {/* Three, and three is the cap rather than the count that happened to fit: a list of
                reasons long enough to need scanning is competing with the button underneath it.
                The icons lost the filled chip they used to sit in — a 28px dark square each was
                three more objects on a surface that now has a whole blue half beside it to carry
                the visual weight. */}
            <ul className="mt-5 lg:mt-7 space-y-3">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-[14px] lg:text-[13px] font-medium leading-[1.6]">
                  {/* `mt-px` rather than `items-start`: the icon is a 16px square whose artwork
                      is centred in it, and Arabic sits low in its own line box, so optically
                      centred and box-centred are one pixel apart here. */}
                  {/* ORANGE_ON_LIGHT, not plain Orange — this icon sits on the light WHITE band,
                      and plain Orange is 2.68:1 there, under even the 3:1 an icon needs. */}
                  <Icon className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" style={{ color: ORANGE_ON_LIGHT }} />
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
                className="mt-5 p-3 rounded-[0.375rem] text-[13px] font-medium leading-[1.6]"
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

                `footer` is the tone, on the WHITE band, and the borrow is deliberate. The
                wireframe paints this button in the panel's own dark ground — the same fill as the
                full screen behind it — and `footer` is the site's only pair that fills solid with
                OBSIDIAN and white on top of it (19.82:1). `chrome` has a similar fill but a
                white focus ring, which on the light band here is no ring at all — `footer`'s ring
                is Obsidian, which shows. */}
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
              tone="white"
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

            {/* Aligned to the column's start edge, not centred, and neither is the copyright
                below it. The block used to run three elements on the start edge and two on the
                centre, which in a 256px column reads as two competing margins rather than as
                one column. A single edge down the whole thing is the tidier read, and in RTL
                that edge is the right-hand one, where the eye starts. */}
            <p className="mt-3 text-[13px] font-medium leading-[1.6]" style={{ color: INK_MUTED }}>
              {isAr
                ? 'تصفّح القوالب وجرّبها بحرية — تسجيل الدخول مطلوب فقط عند إنشاء عقد.'
                : 'Browse and try the templates freely — an account is only needed to create a contract.'}
            </p>
          </div>
        </div>

        {/* Same column as the copy above it. It sits at the band's narrowest point — the
            bottom, where the lean has taken the band its full travel to the left — so a
            full-width line is the one line that would hang off the edge. The column is what
            keeps it inside; the alignment is the column's, for the reason given above. */}
        <p className="nq-lean-copy shrink-0 mt-10 text-[13px] font-medium leading-[1.6]" style={{ color: INK_MUTED }}>
          {isAr ? '© NOVAIQ — جميع الحقوق محفوظة' : '© NOVAIQ — All rights reserved'}
        </p>
      </div>
    </div>
  );
};
