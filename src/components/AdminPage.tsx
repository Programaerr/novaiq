import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Language } from '../lib/i18n';
import { Currency } from '../lib/currency';
import { subscribeToAuthState, isAdminEmail } from '../lib/auth';
import { LoginPage } from './LoginPage';
import { AdminDashboard } from './AdminDashboard';
import { CustomerDashboard } from './CustomerDashboard';
import { RefreshCw } from 'lucide-react';

interface AdminPageProps {
  language: Language;
  currency?: Currency;
  /** Leaves the sign-in screen without signing in — App sends them back to browsing. */
  onContinueAsGuest: () => void;
}

// The single entry point for "my account" — reached from the navbar by everyone, customers
// and the owner/partner alike. Login/sign-up is identical for both; what happens after
// depends entirely on the admins allowlist (src/lib/auth.ts), checked here once per
// session: admins get the full control panel, everyone else gets their own contracts.
export const AdminPage: React.FC<AdminPageProps> = ({ language, currency = 'IQD', onContinueAsGuest }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);

  useEffect(() => subscribeToAuthState(setUser), []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(undefined);
      return;
    }
    let cancelled = false;
    isAdminEmail(user.email).then((result) => {
      if (!cancelled) setIsAdmin(result);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (user === undefined || (user && isAdmin === undefined)) {
    return (
      <div className="py-24 text-center flex flex-col items-center gap-3">
        <span
          className="w-7 h-7 rounded-full animate-spin"
          style={{ border: '2px solid rgba(130, 149, 207, 0.35)', borderTopColor: '#8295CF' }}
        />
        <span className="text-xs font-mono" style={{ color: '#101322', opacity: 0.6 }}>
          {language === 'ar' ? 'جارٍ التحقق...' : 'Checking...'}
        </span>
      </div>
    );
  }

  if (!user) {
    // The guest button is offered here too. It cannot expose anything: this page reads the
    // signed-in account and there is none, so all it can do is send the visitor back to the
    // parts of the site that need no account — which is better than leaving them on a sign-in
    // screen with no way out of it.
    return <LoginPage language={language} onContinueAsGuest={onContinueAsGuest} />;
  }

  return isAdmin
    ? <AdminDashboard language={language} currency={currency} />
    : <CustomerDashboard language={language} currency={currency} user={user} />;
};
