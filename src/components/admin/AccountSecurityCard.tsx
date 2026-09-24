// كلمة سر احتياطية لحساب الأدمن الموقَّع حالياً — طريق دخول ثانٍ إلى الحساب نفسه، لا حساباً
// جديداً ولا تجاوزاً لبوّابة admins. انظر setAccountPassword/loginWithPassword في lib/auth.ts
// والزرّ العائم في LoginPage.tsx، وهما الطرفان الآخران لهذه الميزة.
import React, { useState } from 'react';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { currentUserEmail, setAccountPassword, authErrorMessage } from '../../lib/auth';
import { showToast } from '../../lib/toast';

export function AccountSecurityCard({ isAr }: { isAr: boolean }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const email = currentUserEmail();

  const handleSave = async () => {
    if (isSaving) return;
    if (password.length < 6) {
      showToast(isAr ? 'كلمة السر يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters', 'error');
      return;
    }
    if (password !== confirm) {
      showToast(isAr ? 'كلمتا السر غير متطابقتين' : 'Passwords do not match', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await setAccountPassword(password);
      if (error) throw error;
      setPassword('');
      setConfirm('');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (e) {
      showToast(authErrorMessage(e, isAr), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-ink flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-ink/60" />
          <span>{isAr ? 'دخول احتياطي بالبريد وكلمة السر' : 'Backup sign-in with email and password'}</span>
        </h3>
        <p className="text-xs text-ink/60 leading-relaxed">
          {isAr
            ? `تضيف كلمة سر لحساب ${email || 'هذا'} الموقَّع به الآن — بديل عن Google حين لا يناسبك، بنفس الحساب والصلاحيات تماماً. ادخل بها بعدها من الأيقونة الصغيرة في زاوية شاشة تسجيل الدخول.`
            : `Adds a password to the ${email || 'current'} account you're signed in with now — an alternative to Google when it doesn't suit you, same account and same permissions. Sign in with it afterward from the small icon in the corner of the sign-in screen.`}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-paper border border-ink/10 space-y-3">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-ink/75">
            {isAr ? 'كلمة السر الجديدة' : 'New password'}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isAr ? '6 أحرف على الأقل' : 'At least 6 characters'}
            dir="ltr"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-ink/15 text-xs font-mono text-ink outline-none focus:border-periwinkle"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-ink/75">
            {isAr ? 'تأكيد كلمة السر' : 'Confirm password'}
          </span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            dir="ltr"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-ink/15 text-xs font-mono text-ink outline-none focus:border-periwinkle"
          />
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !password || !confirm}
          className="w-full py-2.5 rounded-xl bg-white hover:bg-white disabled:opacity-60 text-black text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all border border-white"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : justSaved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          <span>
            {justSaved
              ? (isAr ? 'تم التعيين' : 'Password set')
              : (isAr ? 'تعيين كلمة السر' : 'Set password')}
          </span>
        </button>
      </div>
    </div>
  );
}
