import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Language } from '../lib/i18n';
import { Currency } from '../lib/currency';
import { subscribeToAuthState, isAdminEmail } from '../lib/auth';
import { LoginPage } from './LoginPage';
import { AdminDashboard } from './AdminDashboard';
import { CustomerDashboard } from './CustomerDashboard';
import { useDocumentFlag } from '../lib/useDocumentFlag';
import { PageLoader } from './PageLoader';

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

  // Declare the light page ground HERE, on the entry component, not on the dashboards it
  // renders. Otherwise the loader below — which shows while auth and the admin check are still
  // running — would sit on the site's black ground, a black panel with a spinner in it. The
  // account pages paint their own ground, so the ground must already be light before the first
  // pixel of the first dashboard (or of the loader) is drawn.
  useDocumentFlag('flat');
  useDocumentFlag('account');

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
    return <PageLoader />;
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
