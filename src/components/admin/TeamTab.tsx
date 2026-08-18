// Team/admin roster: lists existing admins and grants admin access by email.
import React, { useState, useEffect } from 'react';
import {
  Loader2,
  Users,
  UserPlus,
  RotateCcw,
} from 'lucide-react';
import { addAdminEmail, authErrorMessage } from '../../lib/auth';
import { listTeamMembers, TeamMember } from '../../lib/adminUsers';

export function TeamTab({ isAr }: { isAr: boolean }) {
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setMembers(await listTeamMembers());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(isAr ? 'ar-IQ' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await addAdminEmail(trimmed);
      setMessage({
        type: 'success',
        text: isAr
          ? `تمت إضافة ${trimmed} كمسؤول. عليه إنشاء حساب عادي (اشتراك) بنفس هذا البريد إن لم يفعل بعد.`
          : `${trimmed} added as an admin. They should sign up normally with this same email if they haven't already.`,
      });
      setEmail('');
      load();
    } catch (err) {
      setMessage({ type: 'error', text: authErrorMessage(err, isAr) });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="max-w-lg space-y-4">
        <p className="text-xs text-white/50">
          {isAr
            ? 'أضف بريد شريكك هنا ليصبح مسؤولاً (أدمن) بنفس صلاحياتك الكاملة. عليه بعدها إنشاء حساب عادي بنفس البريد من زر "اشتراك" — بمجرد تسجيل دخوله، سيدخل تلقائياً إلى لوحة التحكم هذه بدلاً من صفحة العقود الخاصة بالزبائن.'
            : "Add your partner's email here to make them a full admin. They then just sign up normally with this same email via the \"Sign Up\" button — once logged in, they'll automatically land in this control panel instead of the customer contracts view."}
        </p>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="partner@email.com"
            dir="ltr"
            className="flex-1 px-4 py-2.5 rounded-xl bg-black border border-white/10 focus:border-white/60 focus:outline-none text-white text-xs font-mono"
          />
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-white disabled:opacity-60 text-black text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all border border-white shrink-0"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span>{isAr ? 'إضافة' : 'Add'}</span>
          </button>
        </form>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs border ${
              message.type === 'success'
                ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-300'
                : 'bg-red-950/40 border-red-900/60 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      <div className="space-y-3 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between pt-3">
          <h4 className="text-xs font-bold text-white">{isAr ? 'أعضاء الفريق الحاليون' : 'Current Team Members'}</h4>
          <button
            onClick={load}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            <span>{isAr ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>

        {loadError && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 text-xs">
            {loadError}
          </div>
        )}

        {isLoading && !members ? (
          <div className="py-10 text-center text-white/50 text-xs">
            <Loader2 className="w-5 h-5 text-white mx-auto mb-2 animate-spin" />
          </div>
        ) : members && members.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-2.5">
            {members.map((m) => (
              <div key={m.email} className="p-3.5 rounded-2xl bg-black border border-white/10 flex items-center gap-3">
                {m.photoURL ? (
                  <img src={m.photoURL} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-white/50" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">{m.displayName || m.email}</span>
                    {!m.hasAccount && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-900/60 text-amber-300 text-[10px] font-bold shrink-0">
                        {isAr ? 'بانتظار التسجيل' : 'Pending sign-up'}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-white/40 font-mono truncate" dir="ltr">{m.email}</div>
                  <div className="text-[10px] text-white/35 mt-0.5">
                    {isAr ? 'أُضيف:' : 'Added:'} {formatDate(m.addedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loadError && (
            <div className="py-10 text-center text-white/40 text-xs border border-dashed border-white/10 rounded-2xl">
              {isAr ? 'لا يوجد أعضاء فريق بعد' : 'No team members yet'}
            </div>
          )
        )}
      </div>
    </div>
  );
}
