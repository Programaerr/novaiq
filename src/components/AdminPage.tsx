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
  /**
   * App already knows the auth state, so it passes it down instead of this page re-subscribing.
   * When present, no loader flashes on re-entry: the page renders instantly from known state.
   */
  user?: User | null;
}

// The admin allowlist check is a Firestore read that, for a returning customer, resolves to
// the same answer every time. Cache it per email so revisiting "my account" renders instantly
// instead of flashing the loader again; the cache is keyed by email, so switching accounts
// (or signing out/in) naturally gets a fresh check.
const adminCache = new Map<string, boolean>();

// The single entry point for "my account" — reached from the navbar by everyone, customers
// and the owner/partner alike. Login/sign-up is identical for both; what happens after
// depends entirely on the admins allowlist (src/lib/auth.ts), checked here once per
// session: admins get the full control panel, everyone else gets their own contracts.
export const AdminPage: React.FC<AdminPageProps> = ({ language, currency = 'IQD', onContinueAsGuest, user: passedUser }) => {
  const [subscribedUser, setSubscribedUser] = useState<User | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);

  // Declare the light page ground HERE, on the entry component, not on the dashboards it
  // renders. Otherwise the loader below — which shows while auth and the admin check are still
  // running — would sit on the site's black ground, a black panel with a spinner in it. The
  // account pages paint their own ground, so the ground must already be light before the first
  // pixel of the first dashboard (or of the loader) is drawn.
  useDocumentFlag('flat');
  useDocumentFlag('account');

  // When App passes the known user down, trust it and skip the subscription entirely — that is
  // the whole point of passing it. Only fall back to subscribing when the prop is absent. The
  // subscription still runs unconditionally (rules of hooks), but its result is ignored whenever
  // a user is passed in.
  const effectiveUser = passedUser !== undefined ? passedUser : subscribedUser;

  useEffect(() => subscribeToAuthState(setSubscribedUser), []);

  // A cached answer is applied DURING render, not in the effect below.
  //
  // The effect already consulted adminCache, but an effect runs after the first paint — so a
  // second visit to this page, where the answer is already known and no network call will be
  // made, still rendered one frame of `isAdmin === undefined` and flashed the full-screen
  // loader before settling. A loader for work that is not happening.
  //
  // Reading the cache here collapses that: when the answer is known the very first render has
  // it, the guard below is false, and nothing loads. The effect still owns the uncached path.
  const cachedIsAdmin = effectiveUser ? adminCache.get(effectiveUser.email ?? '') : undefined;
  const resolvedIsAdmin = isAdmin ?? cachedIsAdmin;

  useEffect(() => {
    if (!effectiveUser) {
      setIsAdmin(undefined);
      return;
    }
    const email = effectiveUser.email ?? '';
    const cached = adminCache.get(email);
    if (cached !== undefined) {
      setIsAdmin(cached);
      return;
    }
    let cancelled = false;
    isAdminEmail(email).then((result) => {
      if (cancelled) return;
      adminCache.set(email, result);
      setIsAdmin(result);
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveUser]);

  if (effectiveUser === undefined || (effectiveUser && resolvedIsAdmin === undefined)) {
    return <PageLoader />;
  }

  if (!effectiveUser) {
    // The guest button is offered here too. It cannot expose anything: this page reads the
    // signed-in account and there is none, so all it can do is send the visitor back to the
    // parts of the site that need no account — which is better than leaving them on a sign-in
    // screen with no way out of it.
    return <LoginPage language={language} onContinueAsGuest={onContinueAsGuest} />;
  }

  // `resolvedIsAdmin`, not `isAdmin` — and this is the half that makes skipping the loader safe.
  // On the cached first render state is still `undefined`, which is falsy, so branching on the
  // raw state here would hand an admin the customer dashboard for a frame before correcting
  // itself. Both the guard above and this branch have to read the same resolved value or the
  // flash that was removed comes back as a wrong-dashboard flash instead.
  return resolvedIsAdmin
    ? <AdminDashboard language={language} currency={currency} />
    : <CustomerDashboard language={language} currency={currency} user={effectiveUser} />;
};
