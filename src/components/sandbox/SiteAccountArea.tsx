import React from 'react';
import {
  Eye,
  EyeOff,
  LogOut,
  User,
  Users,
  LayoutDashboard,
  Receipt,
  Bell,
  KeyRound,
  Mail,
  ShieldCheck,
  Lock,
  TrendingUp,
} from 'lucide-react';
import type { AccountRecord, SiteAccount, SiteContact } from '../../data/sandboxDemoData';
import { cosmicAudio } from '../../lib/audio';
import type { SandboxTheme } from './context';

// The customer-account half of every demo site: the sign-in screen, and the signed-in area
// listing whatever that template calls the visitor's own records (appointments, bookings,
// orders, enrolments). Shared by all ten demos, so it lives beside them rather than inside
// the shell's render body.
interface SiteAccountAreaProps {
  account: SiteAccount | null;
  accountRecords: AccountRecord[];
  accountSection: 'overview' | 'records' | 'profile' | 'admin';
  setAccountSection: React.Dispatch<React.SetStateAction<'overview' | 'records' | 'profile' | 'admin'>>;
  setAuthView: React.Dispatch<React.SetStateAction<'site' | 'login' | 'account'>>;
  handleSiteLogin: (e: React.FormEvent) => void;
  handleSiteLogout: () => void;
  loginEmail: string;
  setLoginEmail: React.Dispatch<React.SetStateAction<string>>;
  loginPassword: string;
  setLoginPassword: React.Dispatch<React.SetStateAction<string>>;
  loginPasswordVisible: boolean;
  setLoginPasswordVisible: React.Dispatch<React.SetStateAction<boolean>>;
  loginError: string;
  setLoginError: React.Dispatch<React.SetStateAction<string>>;
  /** Whatever this template calls the visitor's own records — "مواعيدي", "حجوزاتي", … */
  recordsLabel: string;
  siteIdentity: { name: string; badge: string; contact: SiteContact };
  themeStyle: SandboxTheme;
  gridCols: (mobileCols: string, wideCols: string) => string;
  isNarrowViewport: boolean;
}

/**
 * `view` picks which half to show. The signed-in area falls back to the sign-in screen on its
 * own when there is no account, which is what the shell relied on before this was extracted.
 */
export function SiteAccountArea({ view, ...props }: SiteAccountAreaProps & { view: 'login' | 'account' }) {
  const {
    account,
    accountRecords,
    accountSection,
    setAccountSection,
    setAuthView,
    handleSiteLogin,
    handleSiteLogout,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    loginPasswordVisible,
    setLoginPasswordVisible,
    loginError,
    setLoginError,
    recordsLabel,
    siteIdentity,
    themeStyle,
    gridCols,
    isNarrowViewport,
  } = props;

  const renderLoginPage = () => (
    <div className="animate-fade-in flex items-center justify-center py-6 sm:py-12">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-2">
          <div className={`w-12 h-12 mx-auto rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} shadow-lg`}>
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-extrabold text-white">تسجيل الدخول إلى حسابك</h3>
          <p className="text-[11px] text-slate-400">بوابة العملاء الخاصة بـ {siteIdentity.name}</p>
        </div>

        {/* autoComplete="off" throughout — this is the sandbox demo's fake login, not a
            real account. Without it, Chrome treats the field like any other password
            input: it offers to save the credential and, if what got typed happens to
            match an entry in its breach corpus, throws up a "change your password" sheet
            on the way out. Neither makes sense for a value nobody is actually meant to
            keep. */}
        <form onSubmit={handleSiteLogin} autoComplete="off" className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-xl">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-300">البريد الإلكتروني</span>
            <span className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-black/40 border border-slate-700 focus-within:border-slate-500 transition-colors">
              <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }}
                placeholder="you@example.com"
                dir="ltr"
                autoComplete="off"
                className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600 min-w-0"
              />
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-300">كلمة المرور</span>
            <span className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-black/40 border border-slate-700 focus-within:border-slate-500 transition-colors">
              <KeyRound className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {/* Deliberately never type="password": that's what puts a browser's
                  password manager on this field at all, which is how a fake demo
                  credential ends up triggering a real "this password was found in a data
                  breach" prompt on the way out. Masking is done ourselves with
                  -webkit-text-security instead — visually identical, but the field never
                  registers as a real login field to begin with. Firefox doesn't support
                  that property and shows plain text; acceptable here since this is a
                  sandbox demo, not an account with anything to protect. */}
              <input
                type="text"
                inputMode="text"
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                placeholder="••••••••"
                dir="ltr"
                autoComplete="off"
                style={loginPasswordVisible ? undefined : ({ WebkitTextSecurity: 'disc' } as React.CSSProperties)}
                className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600 min-w-0"
              />
              <button
                type="button"
                onClick={() => setLoginPasswordVisible((v) => !v)}
                className="text-slate-500 hover:text-slate-300 cursor-pointer shrink-0"
                title={loginPasswordVisible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {loginPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </span>
          </label>

          {loginError && (
            <p className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-xl px-3 py-2">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            className={`w-full py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>دخول آمن</span>
          </button>

          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-3 h-3 accent-slate-400 cursor-pointer" />
              <span>تذكّرني على هذا الجهاز</span>
            </label>
            <span className="hover:text-slate-300 cursor-pointer">نسيت كلمة المرور؟</span>
          </div>
        </form>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
          <span className="block text-[10px] text-slate-400">حسابات تجريبية جاهزة — اضغط لتعبئتها فوراً:</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setLoginEmail('customer@demo.iq'); setLoginPassword('123456'); setLoginError(''); }}
              className="px-2.5 py-2 rounded-xl bg-black/40 border border-slate-700 hover:border-slate-500 text-[10px] font-bold text-slate-300 cursor-pointer transition-colors"
            >
              حساب زبون
            </button>
            <button
              onClick={() => { setLoginEmail('admin@demo.iq'); setLoginPassword('123456'); setLoginError(''); }}
              className="px-2.5 py-2 rounded-xl bg-black/40 border border-slate-700 hover:border-slate-500 text-[10px] font-bold text-slate-300 cursor-pointer transition-colors"
            >
              حساب إدارة
            </button>
          </div>
        </div>

        <button
          onClick={() => { setAuthView('site'); setLoginError(''); }}
          className="w-full text-[11px] text-slate-400 hover:text-white cursor-pointer transition-colors"
        >
          العودة إلى الموقع
        </button>
      </div>
    </div>
  );

  const renderRecordCard = (record: AccountRecord) => (
    <div key={record.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="text-xs font-bold text-white truncate">{record.title}</div>
          <div className="text-[10px] text-slate-400 truncate">{record.subtitle}</div>
        </div>
        <span className={`px-2 py-0.5 rounded-full ${themeStyle.badgeBg} text-[9px] font-bold shrink-0 whitespace-nowrap`}>
          {record.status}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[10px]">
        <span className="text-slate-500 font-mono truncate" dir="ltr">{record.id}</span>
        <span className="text-slate-400 truncate">{record.meta}</span>
        {record.amount && <span className={`font-mono font-bold shrink-0 ${themeStyle.primaryText}`}>{record.amount}</span>}
      </div>
    </div>
  );

  const renderAccountPage = () => {
    if (!account) return renderLoginPage();

    const navItems: Array<{ key: typeof accountSection; label: string; Icon: typeof User }> = [
      { key: 'overview', label: 'نظرة عامة', Icon: LayoutDashboard },
      { key: 'records', label: recordsLabel, Icon: Receipt },
      { key: 'profile', label: 'الملف الشخصي', Icon: User },
      ...(account.role === 'admin'
        ? [{ key: 'admin' as const, label: 'لوحة الإدارة', Icon: ShieldCheck }]
        : []),
    ];

    return (
      <div className="animate-fade-in space-y-4">
        <div className={`flex ${isNarrowViewport ? 'flex-col' : 'flex-col lg:flex-row'} gap-4`}>
          {/* In-site account navigation */}
          <aside className={`shrink-0 ${isNarrowViewport ? '' : 'lg:w-56'} space-y-3`}>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className={`w-10 h-10 rounded-full ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} text-sm font-black shrink-0`}>
                  {account.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{account.name}</div>
                  <div className="text-[10px] text-slate-500 truncate" dir="ltr">{account.email}</div>
                </div>
              </div>
              <span className={`inline-block px-2 py-0.5 rounded-full ${themeStyle.badgeBg} text-[9px] font-bold`}>
                {account.role === 'admin' ? 'صلاحيات إدارية' : 'حساب زبون'}
              </span>
            </div>

            <nav className={`grid ${isNarrowViewport ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-1'} gap-1.5`}>
              {navItems.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => { setAccountSection(key); cosmicAudio.playTick(); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${
                    accountSection === key
                      ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}`
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
              <button
                onClick={handleSiteLogout}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">تسجيل الخروج</span>
              </button>
            </nav>
          </aside>

          <div className="flex-1 min-w-0 space-y-4">
            {accountSection === 'overview' && (
              <div className="space-y-4">
                <div className={`p-5 rounded-2xl bg-gradient-to-r ${themeStyle.gradient} border ${themeStyle.primaryBorder} space-y-1`}>
                  <h3 className="text-base sm:text-lg font-extrabold text-white">أهلاً بك من جديد، {account.name}</h3>
                  <p className="text-[11px] text-slate-300">هذه لوحتك الخاصة داخل موقع {siteIdentity.name}.</p>
                </div>

                <div className={`grid ${gridCols('grid-cols-2', 'sm:grid-cols-3')} gap-3`}>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <div className={`text-lg font-extrabold font-mono ${themeStyle.primaryText}`}>{accountRecords.length}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{recordsLabel}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <div className={`text-lg font-extrabold font-mono ${themeStyle.primaryText}`}>
                      {accountRecords.filter((r) => r.amount).length}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">عمليات بقيمة مالية</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <div className="text-lg font-extrabold font-mono text-emerald-400">نشط</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">حالة الحساب</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">آخر النشاطات</h4>
                    <button
                      onClick={() => setAccountSection('records')}
                      className={`text-[10px] font-bold cursor-pointer ${themeStyle.primaryText}`}
                    >
                      عرض الكل
                    </button>
                  </div>
                  {accountRecords.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 border-dashed text-center space-y-1.5">
                      <p className="text-xs text-slate-300 font-bold">لا يوجد نشاط بعد</p>
                      <p className="text-[10px] text-slate-500">تصفّح الموقع وجرّب الطلب أو الحجز، وستظهر العملية هنا مباشرة.</p>
                    </div>
                  ) : (
                    <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-2.5`}>
                      {accountRecords.slice(0, 4).map(renderRecordCard)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {accountSection === 'records' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white">{recordsLabel}</h4>
                {accountRecords.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 border-dashed text-center space-y-1.5">
                    <p className="text-xs text-slate-300 font-bold">القائمة فارغة حالياً</p>
                    <p className="text-[10px] text-slate-500">كل عملية تنفّذها داخل الموقع تُسجّل هنا تلقائياً.</p>
                  </div>
                ) : (
                  <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-2.5`}>
                    {accountRecords.map(renderRecordCard)}
                  </div>
                )}
              </div>
            )}

            {accountSection === 'profile' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white">الملف الشخصي</h4>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  {[
                    { label: 'الاسم الكامل', value: account.name },
                    { label: 'البريد الإلكتروني', value: account.email, ltr: true },
                    { label: 'رقم الهاتف', value: siteIdentity.contact.phone, ltr: true },
                    { label: 'نوع الحساب', value: account.role === 'admin' ? 'حساب إداري' : 'حساب زبون' },
                  ].map((field) => (
                    <div key={field.label} className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-300">{field.label}</span>
                      <div
                        dir={field.ltr ? 'ltr' : undefined}
                        className="px-3 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-xs text-white truncate"
                      >
                        {field.value}
                      </div>
                    </div>
                  ))}
                  <button className={`w-full py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer`}>
                    حفظ التعديلات
                  </button>
                </div>
              </div>
            )}

            {accountSection === 'admin' && account.role === 'admin' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${themeStyle.primaryText}`} />
                  <h4 className="text-sm font-bold text-white">لوحة إدارة {siteIdentity.name}</h4>
                </div>

                <div className={`grid ${gridCols('grid-cols-2', 'sm:grid-cols-4')} gap-3`}>
                  {[
                    { Icon: Receipt, value: String(accountRecords.length), label: 'سجلات نشطة' },
                    { Icon: Users, value: '1,284', label: 'مستخدم مسجّل' },
                    { Icon: TrendingUp, value: '+18%', label: 'نمو هذا الشهر' },
                    { Icon: Bell, value: '7', label: 'إشعارات جديدة' },
                  ].map((tile) => (
                    <div key={tile.label} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <tile.Icon className={`w-4 h-4 ${themeStyle.primaryText}`} />
                      <div className="text-lg font-extrabold font-mono text-white">{tile.value}</div>
                      <div className="text-[10px] text-slate-400">{tile.label}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">السجلات الواردة</span>
                    <span className="text-[10px] text-slate-500">تُحدَّث لحظياً</span>
                  </div>
                  {accountRecords.length === 0 ? (
                    <p className="p-6 text-center text-[11px] text-slate-500">لا توجد سجلات واردة بعد.</p>
                  ) : (
                    <div className="divide-y divide-slate-800">
                      {accountRecords.map((record) => (
                        <div key={record.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors">
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-white truncate">{record.title}</div>
                            <div className="text-[10px] text-slate-500 truncate font-mono" dir="ltr">{record.id}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {record.amount && <span className="text-[10px] font-mono text-slate-300 hidden sm:inline">{record.amount}</span>}
                            <span className={`px-2 py-0.5 rounded-full ${themeStyle.badgeBg} text-[9px] font-bold whitespace-nowrap`}>
                              {record.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  لوحة الإدارة تُبنى بالكامل حسب نشاط شركتك: صلاحيات متعددة للموظفين، تقارير، وتحكم كامل بالمحتوى والأسعار.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return view === 'login' ? renderLoginPage() : renderAccountPage();
}
