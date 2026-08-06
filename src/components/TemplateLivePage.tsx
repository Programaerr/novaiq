import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileSignature, TriangleAlert } from 'lucide-react';
import { useLiveTemplates } from '../lib/pricingOverrides';
import { Language } from '../lib/i18n';
import { readStoredCurrency } from '../lib/currency';
import { PageLoader } from './PageLoader';
import { NovaiqLogo } from './NovaiqLogo';
import type { ThemeColor } from './TemplateInteractiveSandbox';

const TemplateInteractiveSandbox = lazy(() =>
  import('./TemplateInteractiveSandbox').then((m) => ({ default: m.TemplateInteractiveSandbox }))
);

const THEME_COLORS: ThemeColor[] = ['emerald', 'purple', 'cyan', 'amber', 'rose', 'monochrome'];

function readStoredLanguage(): Language {
  try {
    return localStorage.getItem('novaiq_language') === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

/**
 * The template as its own website, on its own URL (`?live=<template-id>`).
 *
 * Nothing of NOVAIQ's own shell renders here — no navbar, no cosmic background, no preview
 * toolbar. That is the entire point: this is what the "open in a new tab" action opens, and
 * a customer must be looking at a website, not a preview tool. It reads through
 * `useLiveTemplates` (not the static catalogue) specifically so an admin's price/name/image
 * edit shows up here too — this is the one place in the app that previously didn't.
 */
export const TemplateLivePage: React.FC = () => {
  const liveTemplates = useLiveTemplates();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const templateId = params.get('live') || '';
  const nameOverride = params.get('name') || '';
  const colorParam = params.get('color') as ThemeColor | null;
  const initialThemeColor = colorParam && THEME_COLORS.includes(colorParam) ? colorParam : undefined;

  // This document has no React tree in common with App.tsx (it's a separate entry point —
  // see main.tsx), so the language/currency the customer already picked on the main site
  // can only reach it through localStorage, the same place App.tsx itself persists them.
  const [language] = useState<Language>(() => readStoredLanguage());
  const [currency] = useState(() => readStoredCurrency());

  // Embedded inside a device frame the parent already provides every control, so the
  // return-to-NOVAIQ bar would just be chrome drawn on top of chrome.
  const isEmbedded = window.self !== window.top;
  const isAr = language === 'ar';

  const template = useMemo(() => {
    const found = liveTemplates.find((t) => t.id === templateId);
    if (!found) return null;
    return nameOverride ? { ...found, title: nameOverride } : found;
  }, [liveTemplates, templateId, nameOverride]);

  useEffect(() => {
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    document.title = template
      ? `${template.title} — ${isAr ? 'معاينة حية' : 'Live Preview'}`
      : isAr ? 'معاينة حية | NOVAIQ' : 'Live Preview | NOVAIQ';
  }, [template, language, isAr]);

  // Covers everything in the sandbox that isn't a price (which already renders correctly per
  // language on its own) — the same whole-page translator App.tsx uses, loaded on demand so
  // the Arabic default never pays for it.
  useEffect(() => {
    if (isAr) return;
    let cancelled = false;
    import('../lib/pageTranslator').then(({ setPageTranslation }) => {
      if (!cancelled) setPageTranslation('en');
    });
    return () => {
      cancelled = true;
    };
  }, [isAr]);

  // Opened via window.open() from the main site (see openInNewTab in the sandbox), so
  // window.opener still points back at that original tab — same origin, so talking to it
  // directly is safe. Reusing that tab instead of leaving this one sitting open is the whole
  // point: two full copies of the app (this one plus the customer's original tab) held open
  // at once is pure wasted memory for no benefit once the customer is done previewing.
  const closeBackToOpener = (targetPath?: string) => {
    if (window.opener && !window.opener.closed) {
      if (targetPath) window.opener.location.href = targetPath;
      window.opener.focus();
      window.close();
      return;
    }
    // No opener (direct link, or a browser that blocks script-closing an unopened tab) —
    // fall back to navigating this same tab instead.
    window.location.href = targetPath || window.location.pathname;
  };

  const goHome = () => closeBackToOpener();
  const goToContract = () =>
    closeBackToOpener(template ? `${window.location.pathname}?preview=${encodeURIComponent(template.id)}` : undefined);

  if (!template) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 bg-black px-6 text-center">
        <TriangleAlert className="w-10 h-10 text-amber-400" />
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-white">{isAr ? 'هذا القالب غير متوفر' : 'This template is unavailable'}</h1>
          <p className="text-xs text-zinc-400">
            {isAr
              ? 'الرابط الذي فتحته لا يشير إلى أي قالب في معرضنا. تصفّح المعرض لاختيار قالب آخر.'
              : "The link you opened doesn't point to any template in our gallery. Browse the gallery to pick another one."}
          </p>
        </div>
        <button
          onClick={goHome}
          className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-bold cursor-pointer"
        >
          {isAr ? 'العودة إلى NOVAIQ' : 'Back to NOVAIQ'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#05070c]">
      <Suspense fallback={<PageLoader />}>
        <TemplateInteractiveSandbox
          chromeless
          template={template}
          language={language}
          currency={currency}
          initialThemeColor={initialThemeColor}
          onClose={goHome}
          onSelectForContract={goToContract}
        />
      </Suspense>

      {!isEmbedded && (
        <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-2xl bg-black/90 backdrop-blur-md border border-zinc-700/80 shadow-2xl">
          <NovaiqLogo size={18} showText={false} />
          <span className="hidden sm:inline text-[10px] text-zinc-400 px-1">
            {isAr ? 'معاينة حية لقالب NOVAIQ' : 'NOVAIQ live template preview'}
          </span>
          <button
            onClick={goHome}
            title={isAr ? 'العودة' : 'Back'}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 ltr:rotate-180" />
            <span className="hidden sm:inline">{isAr ? 'العودة' : 'Back'}</span>
          </button>
          <button
            onClick={goToContract}
            title={isAr ? 'اطلب هذا القالب' : 'Order this template'}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-[11px] font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <FileSignature className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAr ? 'اطلب هذا القالب' : 'Order this template'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
