import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { Language } from '../lib/i18n';
import { ORANGE, OBSIDIAN, PAPER } from '../lib/homePalette';
import { NqButton } from './ui/NqButton';

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

  // A spinner promises that something is still coming. When the thing it is waiting on is a
  // network request that has stalled rather than failed, nothing ever contradicts that promise
  // and the customer is left on a full-screen overlay with no exit, which is exactly what
  // "انها عالقة" describes. Nothing here can make a stalled request finish — but leaving
  // someone with no information and no way out is a separate failure from the network's, and
  // this one is ours to fix. After fifteen seconds it stops claiming to be nearly done and
  // offers the only action that actually helps.
  const [isSlow, setIsSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setIsSlow(true), 15000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: `${PAPER}F2` }}>
      <div className="flex flex-col items-center gap-4 text-center px-6 max-w-sm">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              border: `2px solid ${ORANGE}33`,
              borderTopColor: ORANGE,
              boxShadow: `0 0 22px ${ORANGE}50`,
            }}
          />
          <ShieldCheck className="w-6 h-6" style={{ color: OBSIDIAN }} />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-bold" style={{ color: OBSIDIAN }}>
            {isAr ? 'جارِ تجهيز عقدك الإلكتروني...' : 'Preparing your electronic contract...'}
          </p>
          <p className="text-xs" style={{ color: OBSIDIAN, opacity: 0.6 }}>
            {isSlow
              ? isAr
                ? 'الاتصال بطيء ويستغرق وقتاً أطول من المعتاد. عقدك محفوظ ولن يضيع — يمكنك إعادة التحميل والوصول إليه من "طلباتي".'
                : 'The connection is slow and this is taking longer than usual. Your contract is saved and will not be lost — you can reload and find it under "My Orders".'
              : isAr
                ? 'لحظات ونعرض لك نسخة العقد الجاهزة للتنزيل'
                : 'One moment — your downloadable contract is almost ready'}
          </p>
        </div>

        {isSlow && (
          <NqButton
            tone="chrome"
            variant="solid"
            size="sm"
            radius="xl"
            onClick={() => window.location.reload()}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {isAr ? 'إعادة التحميل' : 'Reload'}
          </NqButton>
        )}
      </div>
    </div>
  );
};
