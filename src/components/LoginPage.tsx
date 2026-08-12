import React, { useMemo, useState } from 'react';
import { Loader2, FileCheck, Clock, Download } from 'lucide-react';
import { Language } from '../lib/i18n';
import { loginWithGoogle, authErrorMessage } from '../lib/auth';
import { useLiveTemplates } from '../lib/pricingOverrides';
import { CosmicBackground } from './CosmicBackground';
import { NovaiqLogo } from './NovaiqLogo';

interface LoginPageProps {
  language: Language;
  /** Dismisses this page and lets the visitor browse without an account. */
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

// Each column drifts at its own speed and against its neighbours. Same-speed columns read as
// one sliding sheet cut into strips; different speeds read as depth, which is the point of
// having three of them rather than one. The numbers are minutes-long on purpose — this is
// meant to be noticed only if you watch for it, and a gallery that visibly races beside a
// sign-in form competes with the thing the page is actually for.
const COLUMNS = [
  { duration: '48s', direction: 'up' as const },
  { duration: '62s', direction: 'down' as const },
  { duration: '54s', direction: 'up' as const },
];

// The covers are a fixed size per breakpoint, never a fluid one. Sized by the column (`flex-1`)
// the same cover became a different shape at every window width — near-circular on a wide
// screen, squat on a narrow one — and resizing visibly re-proportioned the gallery mid-drift.
// Pinning means the shape is the shape: a tall capsule of roughly 1:2.6, the arch the reference
// is built from, held at all three sizes (96×250, 120×315, 160×420).
//
// The values themselves live in index.css as custom properties on `.login-gallery`, because the
// phone tier needs a smaller capsule and a media query is the only place that can say so without
// this component measuring the window itself. Everything here reads them through var(), so the
// marquee maths and the markup stay in step with whatever the breakpoint resolved to.
const COVER_W = 'var(--cover-w)';
const COVER_H = 'var(--cover-h)';
const COVER_GAP = 'var(--cover-gap)';

/**
 * Standalone sign-in page: brand and form on one side, a slow gallery of the company's own
 * template covers on the other.
 *
 * Self-contained by design — it renders its own background and its own header rather than
 * mounting inside the site's shared chrome. App gives it the whole viewport (see the early
 * return there), so there is no navbar to sit under, no page padding to clear, and nothing
 * about it that has to be kept in step with the home page's layout as that layout changes.
 * The only things it takes from the rest of the app are the pieces that genuinely are shared:
 * the auth call, the template catalogue, the logo and the cosmic backdrop.
 */
export const LoginPage: React.FC<LoginPageProps> = ({ language, onContinueAsGuest }) => {
  const isAr = language === 'ar';
  const templates = useLiveTemplates();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Dealt round-robin rather than sliced into thirds, so three consecutive covers never end up
  // stacked in one column — with ten templates a sliced split would put the same category
  // together and the gallery would read as sorted rather than scattered.
  const columns = useMemo(() => {
    const buckets: string[][] = COLUMNS.map(() => []);
    templates.forEach((t, i) => buckets[i % buckets.length].push(t.previewImage));
    // A column short on covers still has to fill a tall viewport twice over, so it repeats its
    // own until it has enough. Without this a filtered-down catalogue would leave visible gaps
    // sliding through the frame.
    return buckets.map((imgs) => {
      if (imgs.length === 0) return imgs;
      const filled = [...imgs];
      while (filled.length < 4) filled.push(...imgs);
      return filled;
    });
  }, [templates]);

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
    <div className="min-h-screen bg-black text-zinc-100 font-['Cairo'] relative overflow-hidden selection:bg-zinc-100 selection:text-black">
      {/* Desktop only, and for once that is a performance decision rather than a layout one:
          below lg the gallery covers the entire viewport, so every star drifting behind it is
          being animated and composited under something opaque. Two full-screen infinite
          animations running at once, one of them invisible, is precisely the waste this site
          has spent its time removing. */}
      <div className="hidden lg:block">
        <CosmicBackground activeSection="hero" activeBgImage={null} />
      </div>

      {/* lg is where the split appears. Below it the gallery is dropped entirely rather than
          stacked under the form: it is atmosphere, and a phone that has to scroll past a
          screenful of drifting covers to reach a sign-in button has been given a worse page,
          not a richer one.

          Capped and centred rather than filling the viewport. The two halves are 50% each while
          the things inside them are fixed — a 448px form and three 160px columns of covers — so
          every extra pixel of window goes entirely into the gap between them. On a 34" screen
          that is the same composition dragged to opposite ends of the desk. Past a point more
          width stops being more room and starts being distance.
          1160 is not picked by eye: the gap between the covers' inner edge and the form is
          exactly `width − 1064` (560px of covers from the left edge, and the form block sitting
          504px in from the right), so the cap IS the gap, plus 96. Wider caps open it fast —
          1280 gives 216px, 1700 gives 636px. Beyond the cap the composition holds its size and
          the starfield, full-bleed outside this wrapper, takes the rest of the screen. */}
      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-2 max-w-[1160px] mx-auto">

        {/* ── Form side ─────────────────────────────────────────────────────────────── */}
        {/* min-h-screen only below lg. On the split layout the grid row already gives this
            column the full height, and asking for a screen's worth on top of that is how a
            two-column page ends up scrolling for no reason. */}
        {/* z-10: below lg the gallery is an absolute layer over this same box, so the form has
            to be lifted above it to stay clickable as well as visible. */}
        <div className="relative z-10 flex flex-col min-h-screen lg:min-h-0 p-6 sm:p-10 lg:p-14">
          {/* Logo only. The Back button that used to sit opposite it is gone along with the
              page's `onBack` prop: sign-in now gates the whole site, so there is no page behind
              this one to return to and the button could only ever re-render the screen it was
              already on. */}
          <div className="flex items-center shrink-0">
            <NovaiqLogo size={34} showText={true} />
          </div>

          {/* flex-1 + justify-center rather than the outer column's justify-between. With
              `between`, the header, the form and the footer were pushed to three separate
              corners of a tall phone screen and the form was left floating alone in the middle
              of ~400px of nothing — three unrelated objects instead of one page. Centring the
              form inside the leftover space keeps it a single composition at any height. */}
          <div className="flex-1 flex flex-col justify-center py-8 lg:py-0">
            {/* A bordered panel on phones, nothing on desktop. On the split layout the gallery
                beside it already frames the form; on a phone there is nothing to frame it, and
                bare text on a starfield reads as unfinished rather than minimal. */}
            <div className="w-full max-w-md mx-auto lg:mx-0 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 sm:p-7 lg:border-0 lg:bg-transparent lg:p-0 lg:rounded-none">
              <h1 className="text-2xl sm:text-3xl lg:text-[2.75rem] font-black leading-tight text-white">
                {isAr ? 'سجّل دخولك إلى' : 'Sign in to your'}
                <br />
                {isAr ? 'حسابك في NOVAIQ' : 'NOVAIQ account'}
              </h1>
              <p className="mt-3 lg:mt-4 text-[13px] sm:text-sm text-zinc-400 leading-relaxed">
                {isAr
                  ? 'ادخل بحساب Google لمتابعة عقودك وقوالبك المحفوظة في مكان واحد.'
                  : 'Continue with Google to follow your contracts and saved templates in one place.'}
              </p>

              <div className="mt-5 lg:mt-7 space-y-2.5">
                {perks.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-xs text-zinc-300">
                    <span className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-zinc-300" />
                    </span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mt-5 p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 text-xs text-center">
                  {error}
                </div>
              )}

              {/* One button, because there is only one path: Firebase creates the account on a
                  first-time Google sign-in, so "log in" and "sign up" are the same click here
                  and offering both would be two doors into one room. */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="nq-btn nq-btn--solid mt-6 lg:mt-7 w-full py-3.5 rounded-2xl disabled:opacity-60 text-sm font-extrabold flex items-center justify-center gap-3 cursor-pointer"
              >
                <span className="nq-btn-beam" aria-hidden="true" />
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
                <span>{isAr ? 'المتابعة عبر Google' : 'Continue with Google'}</span>
              </button>

              {/* Browsing the catalogue, opening a demo and reading the timeline need no
                  account, and requiring one to look around turns a visitor away before they
                  have seen anything worth signing in for. Signing in stays the primary action —
                  it is the filled button above; this one is deliberately quieter, an outline
                  rather than a second solid button competing with it.

                  The line underneath says where the wall actually is, so choosing this does not
                  feel like it might cost them something later on. */}
              <button
                type="button"
                onClick={onContinueAsGuest}
                disabled={isSubmitting}
                className="nq-btn mt-3 w-full py-3 rounded-2xl border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white disabled:opacity-60 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span className="nq-btn-beam" aria-hidden="true" />
                <span>{isAr ? 'أكمل كضيف' : 'Continue as guest'}</span>
              </button>

              <p className="mt-2.5 text-center text-[11px] text-zinc-500">
                {isAr
                  ? 'تصفّح القوالب وجرّبها بحرية — تسجيل الدخول مطلوب فقط عند إنشاء عقد.'
                  : 'Browse and try the templates freely — an account is only needed to create a contract.'}
              </p>
            </div>
          </div>

          <p className="shrink-0 text-center lg:text-start text-[11px] text-zinc-600">
            {isAr ? '© NOVAIQ — جميع الحقوق محفوظة' : '© NOVAIQ — All rights reserved'}
          </p>
        </div>

        {/* ── Gallery side ──────────────────────────────────────────────────────────── */}
        {/* Two roles from one element, because the gallery is worth having on a phone but not
            in the same place.
            At lg it is the second grid column: a panel beside the form, as designed.
            Below lg it leaves the grid entirely (`absolute inset-0`) and becomes the backdrop
            *behind* the form instead of a block stacked above it. Stacking was the thing worth
            avoiding — a phone that has to scroll past a screenful of drifting covers to reach a
            sign-in button has been given a worse page, not a richer one — but that was an
            argument against the position, never against the atmosphere. Behind the form it
            costs no vertical space at all and the button stays exactly where it was. */}
        <div className="login-gallery absolute inset-0 lg:relative lg:inset-auto overflow-hidden">
          {/* justify-end packs the columns against the OUTER screen edge and lets all the
              leftover width collect on the inner side, next to the form — which is where the
              seam fade already lives, so the space reads as breathing room around the panel
              rather than as a gap someone forgot to fill. Centred, the same slack was split in
              two and the gallery floated with a margin on the screen edge, which is not how
              the reference sits. Logical `end`, so it stays the outer edge in both languages:
              the form is the grid's first column, so the gallery's inline-end is the far side
              of the screen whichever way the page reads.
              The padding on that end keeps the outermost column just off the screen edge —
              packed flush against it the gallery read as cropped rather than placed. */}
          {/* Centred on a phone, where the gallery is the whole backdrop and packing it to one
              edge would leave the other half plain black behind the form. */}
          <div
            className="absolute inset-0 flex justify-center lg:justify-end"
            style={{ gap: COVER_GAP, paddingInlineEnd: `calc(${COVER_GAP} * 2)` }}
          >
            {columns.map((imgs, col) => {
              if (imgs.length === 0) return null;
              const { duration, direction } = COLUMNS[col];
              return (
                <div key={col} className="overflow-hidden shrink-0" style={{ width: COVER_W }}>
                  {/* Spacing lives on the pills as margin, NOT as a flex `gap` on this track,
                      and that is load-bearing rather than stylistic. With `gap`, a track of 2n
                      items is 2n·item + (2n−1)·gap tall — one gap short of two identical
                      halves — so travelling exactly -50% lands half a gap away from where the
                      second copy started and the loop jumps ~8px once per cycle. Folding the
                      gap into each item makes the track exactly 2n·(item+gap), and -50% is
                      then precisely one pass. */}
                  <div
                    className="login-marquee__track flex flex-col"
                    style={{
                      animationName: direction === 'up' ? 'login-marquee-up' : 'login-marquee-down',
                      animationDuration: duration,
                      // Staggered start so the capsule seams across the columns don't line up
                      // into one horizontal band marching down the page. In px against the
                      // fixed cover height rather than rem, so it stays a proportion of the
                      // shape it is offsetting no matter the root font size.
                      marginTop: `calc(${-col} * (${COVER_H} + ${COVER_GAP}) / ${COLUMNS.length})`,
                    }}
                  >
                    {/* Rendered twice — see the note on the keyframes in index.css. The second
                        pass is aria-hidden so a screen reader is not read the same gallery
                        twice over. */}
                    {[0, 1].map((pass) =>
                      imgs.map((src, i) => (
                        <div
                          key={`${pass}-${i}`}
                          aria-hidden={pass === 1 ? 'true' : undefined}
                          className="relative shrink-0 rounded-[999px] overflow-hidden bg-zinc-900 border border-white/10"
                          style={{ width: COVER_W, height: COVER_H, marginBottom: COVER_GAP }}
                        >
                          <img
                            src={src}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                      )),
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fades the columns out into the page at top and bottom instead of letting them run
              into a hard edge, and darkens the side nearest the form so the two never fight for
              attention. pointer-events-none so it cannot swallow anything. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, #000 0%, transparent 18%, transparent 82%, #000 100%)',
            }}
          />
          {/* The seam where the gallery meets the form. `start-0` puts this strip on the right
              edge in Arabic and the left edge in English, which is the form-facing side in both
              — but the gradient inside it cannot be a single fixed direction, because "black at
              the seam, fading away from it" points the opposite way once the columns swap
              sides. Written the other way round it darkens the middle of the gallery instead of
              its edge, which is exactly what it was doing. */}
          <div
            className="hidden lg:block absolute inset-y-0 start-0 w-40 pointer-events-none"
            style={{
              background: `linear-gradient(to ${isAr ? 'right' : 'left'}, transparent, #000)`,
            }}
          />

          {/* Phone only: the wash that turns the gallery from a subject into a backdrop. The
              form sits directly on top of it here, so the covers have to lose enough contrast
              that white text on them is comfortable rather than merely legible. A flat rgba
              layer and not a backdrop-filter — blurring a full-screen, permanently animating
              layer is exactly the kind of per-frame rasterisation this site has been stripped
              of everywhere else, and it would buy nothing a solid scrim does not. */}
          <div className="lg:hidden absolute inset-0 bg-black/78 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
