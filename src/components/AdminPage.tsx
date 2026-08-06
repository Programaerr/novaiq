import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Language } from '../lib/i18n';
import { Currency } from '../lib/currency';
import { subscribeToAuthState, isAdminEmail } from '../lib/auth';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { CustomerDashboard } from './CustomerDashboard';
import { RefreshCw } from 'lucide-react';

interface AdminPageProps {
  language: Language;
  currency?: Currency;
}

// The single entry point for "my account" — reached from the navbar by everyone, customers
// and the owner/partner alike. Login/sign-up is identical for both; what happens after
// depends entirely on the admins allowlist (src/lib/auth.ts), checked here once per
// session: admins get the full control panel, everyone else gets their own contracts.
export const AdminPage: React.FC<AdminPageProps> = ({ language, currency = 'IQD' }) => {
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
      <div className="py-24 text-center text-zinc-400 text-xs">
        <RefreshCw className="w-6 h-6 text-white mx-auto mb-2 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AdminLogin language={language} />;
  }

  return isAdmin
    ? <AdminDashboard language={language} currency={currency} />
    : <CustomerDashboard language={language} currency={currency} user={user} />;
};
