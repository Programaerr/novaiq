import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Language } from '../lib/i18n';
import { Currency } from '../lib/currency';
import { Template, ContractData } from '../types';
import { useCurrentUser } from '../lib/auth';
import { AdminLogin } from './AdminLogin';
import { ContractBuilder } from './ContractBuilder';

interface ContractBuilderGateProps {
  selectedTemplate: Template | null;
  onContractGenerated: (contract: ContractData) => void;
  language?: Language;
  currency?: Currency;
  initialCustomFeaturesText?: string;
  initialPrimaryColor?: string;
}

// Contract creation now requires an account, so every contract is reliably tied to a real,
// logged-in email instead of whatever the customer happened to type. Reuses the exact same
// Google sign-in screen as "My Account" — once signed in, the account's email pre-fills the
// contract form (still a normal editable field, just one less thing to type).
export const ContractBuilderGate: React.FC<ContractBuilderGateProps> = (props) => {
  const user = useCurrentUser();

  if (user === undefined) {
    return (
      <div className="py-24 text-center text-zinc-400 text-xs">
        <RefreshCw className="w-6 h-6 text-white mx-auto mb-2 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AdminLogin language={props.language || 'ar'} />;
  }

  return <ContractBuilder {...props} accountEmail={user.email} />;
};
