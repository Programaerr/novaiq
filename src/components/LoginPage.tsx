import React, { useMemo, useState } from 'react';
import { ArrowRight, Loader2, FileCheck, Clock, Download } from 'lucide-react';
import { Language } from '../lib/i18n';
import { loginWithGoogle, authErrorMessage } from '../lib/auth';
import { useLiveTemplates } from '../lib/pricingOverrides';
import { CosmicBackground } from './CosmicBackground';
import { NovaiqLogo } from './NovaiqLogo';

interface LoginPageProps {
  language: Language;
  /** Leaves the page. The caller owns routing — this component never touches history itself. */
  onBack: () => void;
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
export const LoginPage: React.FC<LoginPageProps> = ({ language, onBack }) => {
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
      <CosmicBackground activeSection="hero" activeBgImage={null} />

      {/* lg is where the split appears. Below it the gallery is dropped entirely rather than
          stacked under the form: it is atmosphere, and a phone that has to scroll past a
          screenful of drifting covers to reach a sign-in button has been given a worse page,
          not a richer one. */}
      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-2">

        {/* ── Form side ─────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-14">
          <div className="flex items-center justify-between gap-4">
            <NovaiqLogo size={34} showText={true} />
            <button
              type="button"
              onClick={onBack}
              className="nq-btn nq-btn--solid inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer shrink-0"
            >
              <span className="nq-btn-beam" aria-hidden="true" />
              <ArrowRight className="w-3.5 h-3.5 ltr:rotate-180" />
              <span>{isAr ? 'رجوع' : 'Back'}</span>
            </button>
          </div>

          <div className="py-10 lg:py-0 max-w-md">
            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black leading-tight text-white">
              {isAr ? 'سجّل دخولك إلى' : 'Sign in to your'}
              <br />
              {isAr ? 'حسابك في NOVAIQ' : 'NOVAIQ account'}
            </h1>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              {isAr
                ? 'ادخل بحساب Google لمتابعة عقودك وقوالبك المحفوظة في مكان واحد.'
                : 'Continue with Google to follow your contracts and saved templates in one place.'}
            </p>

            <div className="mt-7 space-y-2.5">
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
              <div className="mt-6 p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 text-xs text-center">
                {error}
              </div>
            )}

            {/* One button, because there is only one path: Firebase creates the account on a
                first-time Google sign-in, so "log in" and "sign up" are the same click here and
                offering both would be two doors into one room. */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="nq-btn nq-btn--solid mt-7 w-full py-3.5 rounded-2xl disabled:opacity-60 text-sm font-extrabold flex items-center justify-center gap-3 cursor-pointer"
            >
              <span className="nq-btn-beam" aria-hidden="true" />
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
              <span>{isAr ? 'المتابعة عبر Google' : 'Continue with Google'}</span>
            </button>
          </div>

          <p className="text-[11px] text-zinc-600">
            {isAr ? '© NOVAIQ — جميع الحقوق محفوظة' : '© NOVAIQ — All rights reserved'}
          </p>
        </div>

        {/* ── Gallery side ──────────────────────────────────────────────────────────── */}
        <div className="hidden lg:block relative overflow-hidden">
          <div className="absolute inset-0 flex gap-4 xl:gap-5 px-4 xl:px-6">
            {columns.map((imgs, col) => {
              if (imgs.length === 0) return null;
              const { duration, direction } = COLUMNS[col];
              return (
                <div key={col} className="flex-1 overflow-hidden">
                  {/* Offset every other column so the pill seams across the three don't line
                      up into one horizontal band marching down the page. */}
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
                      marginTop: col % 2 === 1 ? '-6rem' : '-2rem',
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
                          className="relative w-full h-64 xl:h-72 shrink-0 mb-4 xl:mb-5 rounded-[999px] overflow-hidden bg-zinc-900 border border-white/10"
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
            className="absolute inset-y-0 start-0 w-40 pointer-events-none"
            style={{
              background: `linear-gradient(to ${isAr ? 'right' : 'left'}, transparent, #000)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
