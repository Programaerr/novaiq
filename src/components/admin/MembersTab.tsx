// Subscriber management: the non-admin account list, with disable and delete controls, and a
// per-person profile pulling every contract they hold into one place.
import { useState, useEffect } from 'react';
import { Search, Loader2, Users, RotateCcw, UserCheck, IdCard } from 'lucide-react';
import { ContractData } from '../../types';
import { Language } from '../../lib/i18n';
import { Currency } from '../../lib/currency';
import { listRegularSubscribers, ManagedUser } from '../../lib/adminUsers';
import { StatTile } from './shared';
import { CustomerProfileSheet } from './CustomerProfileSheet';

// Fetched list lives at module level so switching tabs (which remounts this component) renders
// instantly from the cached data instead of re-fetching and flashing a spinner. The Refresh
// button and a full page reload always fetch fresh data, so the cache never goes stale for long.
let membersCache: ManagedUser[] | null = null;

export function MembersTab({
  isAr,
  language,
  currency,
  contracts,
  onBackToSite,
}: {
  isAr: boolean;
  language: Language;
  currency: Currency;
  contracts: ContractData[];
  onBackToSite: () => void;
}) {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [profileUser, setProfileUser] = useState<ManagedUser | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await listRegularSubscribers();
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      membersCache = list;
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (membersCache) {
      setUsers(membersCache);
      setIsLoading(false);
      return;
    }
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

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <StatTile
          icon={UserCheck}
          label={isAr ? 'إجمالي المشتركين' : 'Total Subscribers'}
          value={users === null ? '—' : String(users.length)}
          accent="text-ink/75"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <p className="text-xs text-ink/60 max-w-lg">
          {isAr
            ? 'حسابات الزبائن العاديين فقط (المسؤولون يُدارون من تبويب الفريق). عطّل حساباً لمنعه من الدخول مؤقتاً، أو احذفه نهائياً.'
            : "Regular customer accounts only (admins are managed from the Team tab). Disable to temporarily block sign-in, or delete permanently."}
        </p>
        <button
          onClick={load}
          disabled={isLoading}
          className="px-3 py-2 rounded-xl bg-white/70 hover:bg-sand-light border border-ink/10 text-ink/75 hover:text-ink text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shrink-0 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          <span>{isAr ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      <div className="relative max-w-md">
        {/* موضع الأيقونة يتبع اتجاه اللغة الآن (يمين في العربية، يسار في الإنجليزية) بدل موضع
            ثابت فيزيائياً — نفس النمط المستخدم أصلاً في ContractsTab.tsx لحقل البحث هناك. */}
        <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-ink/50`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isAr ? 'ابحث بالبريد أو الاسم...' : 'Search by email or name...'}
          className={`w-full ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 rounded-xl bg-paper border border-ink/10 focus:border-periwinkle focus:outline-none text-ink text-xs`}
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-300/60 text-red-700 text-xs">
          {error}
        </div>
      )}

      {isLoading && !users ? (
        <div className="py-16 text-center text-ink/60 text-xs">
          <Loader2 className="w-6 h-6 text-ink mx-auto mb-2 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-ink/50 text-xs border border-dashed border-ink/10 rounded-2xl">
          {isAr ? 'لا يوجد حسابات مطابقة' : 'No matching accounts'}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-2.5">
          {filtered.map((u) => (
            <div
              key={u.uid}
              className="p-3.5 rounded-2xl bg-paper border border-ink/10 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {u.photoURL ? (
                  <img src={u.photoURL} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/70 border border-ink/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-ink/60" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-ink truncate">{u.displayName || u.email}</span>
                  <div className="text-[10px] text-ink/50 font-mono truncate" dir="ltr">{u.email}</div>
                  <div className="text-[10px] text-ink/45 mt-0.5">
                    {isAr ? 'انضم:' : 'Joined:'} {formatDate(u.createdAt)} · {isAr ? 'آخر دخول:' : 'Last seen:'} {formatDate(u.lastSignInAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setProfileUser(u)}
                  title={isAr ? 'الملف الشخصي' : 'Profile'}
                  className="p-2 rounded-lg bg-white/70 hover:bg-sand-light border border-ink/10 text-ink/75 hover:text-ink cursor-pointer transition-colors"
                >
                  <IdCard className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {profileUser && (
        <CustomerProfileSheet
          isAr={isAr}
          language={language}
          currency={currency}
          uid={profileUser.uid}
          email={profileUser.email}
          displayName={profileUser.displayName}
          photoURL={profileUser.photoURL}
          createdAt={profileUser.createdAt}
          lastSignInAt={profileUser.lastSignInAt}
          contracts={contracts}
          onClose={() => setProfileUser(null)}
        />
      )}
    </div>
  );
}
