import React, { useEffect, useState } from 'react';
import { Cookie, ShieldCheck } from 'lucide-react';
import { Language } from '../lib/i18n';
import { getConsentStatus, setConsentStatus } from '../lib/consent';

interface CookieConsentProps {
  language: Language;
  onNavigateToPrivacy: () => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ language, onNavigateToPrivacy }) => {
  const [visible, setVisible] = useState(false);
  const isAr = language === 'ar';

  useEffect(() => {
    // Only show the banner if the visitor hasn't made a choice yet on this browser.
    setVisible(getConsentStatus() === null);
  }, []);

  if (!visible) return null;

  const handleChoice = (accepted: boolean) => {
    setConsentStatus(accepted ? 'accepted' : 'rejected');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[999] p-3 sm:p-5 pointer-events-none">
      <div className="max-w-4xl mx-auto bg-black/95 border border-zinc-800 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 pointer-events-auto">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0">
            <Cookie className="w-4.5 h-4.5" />
          </div>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            {isAr
              ? 'نستخدم ملفات تعريف الارتباط (الكوكيز) لتحسين تجربتك وفهم كيفية استخدام المنصة بشكل مجهول الهوية. يمكنك القبول أو الرفض، ولن يؤثر ذلك على استخدامك الأساسي للموقع.'
              : "We use cookies to improve your experience and understand anonymous platform usage. You can accept or reject — either choice won't affect your core use of the site."}
            {' '}
            <button
              type="button"
              onClick={onNavigateToPrivacy}
              className="underline decoration-zinc-600 hover:decoration-white text-white font-semibold cursor-pointer"
            >
              {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </button>
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => handleChoice(false)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold transition-colors cursor-pointer"
          >
            {isAr ? 'رفض' : 'Reject'}
          </button>
          <button
            type="button"
            onClick={() => handleChoice(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold white-btn-glow flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isAr ? 'موافقة' : 'Accept'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
