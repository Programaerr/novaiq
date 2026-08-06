import React, { useState } from 'react';
import { ShieldCheck, Loader2, FileCheck, Clock, Download } from 'lucide-react';
import { Language } from '../lib/i18n';
import { loginWithGoogle, authErrorMessage } from '../lib/auth';

interface AdminLoginProps {
  language: Language;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

// One shared sign-in screen for everyone — customers and the owner/partner alike. There's
// nothing "admin" about signing in here; AdminPage decides afterwards, based on the admins
// allowlist, whether to show the control panel or a customer's own contracts. Google sign-in
// covers both login and first-time sign-up in a single click — Firebase creates the account
// automatically the first time a given Google account signs in.
export const AdminLogin: React.FC<AdminLoginProps> = ({ language }) => {
  const isAr = language === 'ar';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      // onAuthStateChanged in the parent picks up the new session automatically.
    } catch (err) {
      setError(authErrorMessage(err, isAr));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">
            {isAr ? 'حسابي في NOVAIQ' : 'My NOVAIQ Account'}
          </h2>
          <p className="text-xs text-zinc-400">
            {isAr ? 'سجّل الدخول بحساب Google لمتابعة عقودك المحفوظة.' : 'Sign in with Google to track your saved contracts.'}
          </p>
        </div>

        {/* Why sign in — shown before the button so it's clear what logging in actually
            unlocks, not just an auth wall for its own sake. */}
        <div className="space-y-2.5 py-1">
          {[
            {
              icon: FileCheck,
              text: isAr ? 'شاهد كل عقودك في مكان واحد خاص بك' : 'See all your contracts in one place, private to you',
            },
            {
              icon: Clock,
              text: isAr ? 'تابع حالة كل عقد لحظة بلحظة حتى الاكتمال' : 'Track each contract\'s status live, all the way to completion',
            },
            {
              icon: Download,
              text: isAr ? 'حمّل نسخة PDF من عقدك في أي وقت' : 'Download a PDF copy of your contract anytime',
            },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-xs text-zinc-300">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-zinc-300" />
              </div>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 text-xs text-center">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="nq-btn nq-btn--solid w-full py-3 rounded-xl disabled:opacity-60 text-sm font-extrabold flex items-center justify-center gap-3 cursor-pointer"
        >
          <span className="nq-btn-beam" aria-hidden="true" />
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
          <span>{isAr ? 'المتابعة عبر Google' : 'Continue with Google'}</span>
        </button>
      </div>
    </div>
  );
};
