// Subscriber management: the non-admin account list, with disable and delete controls.
import { useState, useEffect } from 'react';
import {
  Trash2,
  Search,
  Loader2,
  Users,
  RotateCcw,
  Ban,
  UserCheck,
} from 'lucide-react';
import { listRegularSubscribers, setUserDisabled, deleteUserAccount, ManagedUser } from '../../lib/adminUsers';
import { showToast } from '../../lib/toast';
import { StatTile } from './shared';

export function MembersTab({ isAr }: { isAr: boolean }) {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await listRegularSubscribers();
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = (users || []).filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
  });

  const formatDate = (iso: string | undefined) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(isAr ? 'ar-IQ' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleToggleDisabled = async (u: ManagedUser) => {
    if (busyUid) return;
    setBusyUid(u.uid);
    try {
      await setUserDisabled(u.uid, !u.disabled);
      setUsers((prev) => prev && prev.map((x) => (x.uid === u.uid ? { ...x, disabled: !u.disabled } : x)));
      showToast(
        !u.disabled ? (isAr ? 'تم تعطيل الحساب' : 'Account disabled') : (isAr ? 'تم إعادة تفعيل الحساب' : 'Account re-enabled'),
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : (isAr ? 'فشلت العملية' : 'Action failed'), 'error');
    } finally {
      setBusyUid(null);
    }
  };

  const handleDelete = async (u: ManagedUser) => {
    if (busyUid) return;
    const confirmMsg = isAr
      ? `هل تريد حذف حساب "${u.email}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Permanently delete the account for "${u.email}"? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    setBusyUid(u.uid);
    try {
      await deleteUserAccount(u.uid);
      setUsers((prev) => prev && prev.filter((x) => x.uid !== u.uid));
      showToast(isAr ? 'تم حذف الحساب' : 'Account deleted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : (isAr ? 'فشل الحذف' : 'Delete failed'), 'error');
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <StatTile
          icon={UserCheck}
          label={isAr ? 'إجمالي المشتركين' : 'Total Subscribers'}
          value={users === null ? '—' : String(users.length)}
          accent="text-white/70"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <p className="text-xs text-white/50 max-w-lg">
          {isAr
            ? 'حسابات الزبائن العاديين فقط (المسؤولون يُدارون من تبويب الفريق). عطّل حساباً لمنعه من الدخول مؤقتاً، أو احذفه نهائياً.'
            : "Regular customer accounts only (admins are managed from the Team tab). Disable to temporarily block sign-in, or delete permanently."}
        </p>
        <button
          onClick={load}
          disabled={isLoading}
          className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shrink-0 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          <span>{isAr ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-white/40 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isAr ? 'ابحث بالبريد أو الاسم...' : 'Search by email or name...'}
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-black border border-white/10 focus:border-white/60 focus:outline-none text-white text-xs"
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-300 text-xs">
          {error}
        </div>
      )}

      {isLoading && !users ? (
        <div className="py-16 text-center text-white/50 text-xs">
          <Loader2 className="w-6 h-6 text-white mx-auto mb-2 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-white/40 text-xs border border-dashed border-white/10 rounded-2xl">
          {isAr ? 'لا يوجد حسابات مطابقة' : 'No matching accounts'}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-2.5">
          {filtered.map((u) => (
            <div
              key={u.uid}
              className={`p-3.5 rounded-2xl bg-black border flex items-center justify-between gap-3 ${
                u.disabled ? 'border-red-900/50' : 'border-white/10'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {u.photoURL ? (
                  <img src={u.photoURL} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-white/50" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">{u.displayName || u.email}</span>
                    {u.disabled && (
                      <span className="px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/60 text-red-300 text-[10px] font-bold shrink-0">
                        {isAr ? 'معطّل' : 'Disabled'}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-white/40 font-mono truncate" dir="ltr">{u.email}</div>
                  <div className="text-[10px] text-white/35 mt-0.5">
                    {isAr ? 'انضم:' : 'Joined:'} {formatDate(u.createdAt)} · {isAr ? 'آخر دخول:' : 'Last seen:'} {formatDate(u.lastSignInAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleToggleDisabled(u)}
                  disabled={busyUid === u.uid}
                  title={u.disabled ? (isAr ? 'إعادة تفعيل' : 'Re-enable') : (isAr ? 'تعطيل' : 'Disable')}
                  className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-white/70 hover:text-white cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {busyUid === u.uid ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : u.disabled ? (
                    <UserCheck className="w-3.5 h-3.5" />
                  ) : (
                    <Ban className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(u)}
                  disabled={busyUid === u.uid}
                  title={isAr ? 'حذف نهائي' : 'Delete permanently'}
                  className="p-2 rounded-lg bg-red-950/30 hover:bg-red-950/50 border border-red-900/50 text-red-300 hover:text-red-200 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
