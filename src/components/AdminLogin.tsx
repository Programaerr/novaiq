import React, { useState } from 'react';
import { ShieldCheck, Loader2, Lock } from 'lucide-react';
import { Language } from '../lib/i18n';
import { loginAdmin, authErrorMessage } from '../lib/auth';

interface AdminLoginProps {
  language: Language;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ language }) => {
  const isAr = language === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await loginAdmin(email.trim(), password);
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
            {isAr ? 'دخول لوحة التحكم' : 'Control Panel Login'}
          </h2>
          <p className="text-xs text-zinc-400">
            {isAr ? 'هذه المنطقة مخصصة لإدارة NOVAIQ فقط.' : 'This area is restricted to NOVAIQ management only.'}
          </p>
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
              placeholder="admin@novaiq.space"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs font-mono"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>
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
          ) : (
            <Lock className="w-4 h-4" />
          )}
          <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
        </button>
      </form>
    </div>
  );
};
