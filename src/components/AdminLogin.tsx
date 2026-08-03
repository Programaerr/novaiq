import React, { useState } from 'react';
import { ShieldCheck, Loader2, Lock, UserPlus, LogIn } from 'lucide-react';
import { Language } from '../lib/i18n';
import { loginAccount, registerAccount, authErrorMessage } from '../lib/auth';

interface AdminLoginProps {
  language: Language;
}

type Mode = 'login' | 'signup';

// One shared login/sign-up screen for everyone — customers and the owner/partner alike.
// There's nothing "admin" about creating an account here; AdminPage decides afterwards,
// based on the admins allowlist, whether to show the control panel or a customer's own
// contracts.
export const AdminLogin: React.FC<AdminLoginProps> = ({ language }) => {
  const isAr = language === 'ar';
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(window.location.search).get('mode') === 'signup' ? 'signup' : 'login'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    if (mode === 'signup' && password !== confirmPassword) {
      setError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await loginAccount(email.trim(), password);
      } else {
        await registerAccount(email.trim(), password);
      }
      // onAuthStateChanged in the parent picks up the new session automatically.
    } catch (err) {
      setError(authErrorMessage(err, isAr));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">
            {isAr ? 'حسابي في NOVAIQ' : 'My NOVAIQ Account'}
          </h2>
          <p className="text-xs text-zinc-400">
            {isAr ? 'سجّل دخولك لمتابعة عقودك المحفوظة.' : 'Log in to track your saved contracts.'}
          </p>
        </div>

        {/* Login / Sign-up switch */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              mode === 'login' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{isAr ? 'تسجيل دخول' : 'Login'}</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              mode === 'signup' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isAr ? 'اشتراك' : 'Sign Up'}</span>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {isAr ? 'البريد الإلكتروني' : 'Email'}
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs font-mono"
              placeholder="you@email.com"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {isAr ? 'كلمة المرور' : 'Password'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs font-mono"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs font-mono"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 text-xs text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-60 text-black text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all border border-white"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === 'login' ? (
            <Lock className="w-4 h-4" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          <span>{mode === 'login' ? (isAr ? 'تسجيل الدخول' : 'Sign In') : (isAr ? 'إنشاء الحساب' : 'Create Account')}</span>
        </button>
      </form>
    </div>
  );
};
