import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Language } from '../lib/i18n';

interface ContractPreparingLoaderProps {
  language?: Language;
}

/**
 * Suspense fallback for the contract download/preview modal specifically — the generic
 * PageLoader is an unlabeled inline spinner, fine for a plain lazy route, but a customer who
 * just submitted a contract and sees nothing happen for a moment reasonably wonders if the
 * click even registered. This fills that gap with the same reassurance the real modal
 * follows it with, so the transition reads as one continuous "we're on it" moment.
 */
export const ContractPreparingLoader: React.FC<ContractPreparingLoaderProps> = ({ language = 'ar' }) => {
  const isAr = language === 'ar';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/94">
      <div className="flex flex-col items-center gap-4 text-center px-6">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-800 border-t-white animate-spin" />
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-bold text-white">
            {isAr ? 'جارِ تجهيز عقدك الإلكتروني...' : 'Preparing your electronic contract...'}
          </p>
          <p className="text-xs text-zinc-400">
            {isAr ? 'لحظات ونعرض لك نسخة العقد الجاهزة للتنزيل' : 'One moment — your downloadable contract is almost ready'}
          </p>
        </div>
      </div>
    </div>
  );
};
