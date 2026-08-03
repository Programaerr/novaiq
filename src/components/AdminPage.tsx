import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Language } from '../lib/i18n';
import { subscribeToAuthState } from '../lib/auth';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { RefreshCw } from 'lucide-react';

interface AdminPageProps {
  language: Language;
}

// Entry point for the whole admin area — not linked from the public nav, reached only via
// a direct ?page=admin URL. Everything past this point (the real dashboard) only renders
// once Firebase confirms a signed-in session.
export const AdminPage: React.FC<AdminPageProps> = ({ language }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => subscribeToAuthState(setUser), []);

  if (user === undefined) {
    return (
      <div className="py-24 text-center text-zinc-400 text-xs">
        <RefreshCw className="w-6 h-6 text-white mx-auto mb-2 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AdminLogin language={language} />;
  }

  return <AdminDashboard language={language} />;
};
