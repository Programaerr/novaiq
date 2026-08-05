import React, { Suspense, lazy, useEffect, useMemo } from 'react';
import { ArrowLeft, FileSignature, TriangleAlert } from 'lucide-react';
import { templatesData } from '../data/templatesData';
import { PageLoader } from './PageLoader';
import { NovaiqLogo } from './NovaiqLogo';
import type { ThemeColor } from './TemplateInteractiveSandbox';

const TemplateInteractiveSandbox = lazy(() =>
  import('./TemplateInteractiveSandbox').then((m) => ({ default: m.TemplateInteractiveSandbox }))
);

const THEME_COLORS: ThemeColor[] = ['emerald', 'purple', 'cyan', 'amber', 'rose', 'monochrome'];

/**
 * The template as its own website, on its own URL (`?live=<template-id>`).
 *
 * Nothing of NOVAIQ's own shell renders here — no navbar, no cosmic background, no preview
 * toolbar. That is the entire point: this is what the device frames load into their iframes
 * (so the template's media queries resolve against a genuine device viewport rather than the
 * customer's real browser window), and what the "open in a new tab" action opens. Reading
 * the catalogue statically instead of through `useLiveTemplates` keeps the Firebase SDK out
 * of this bundle, which is what makes the frames load instantly.
 */
export const TemplateLivePage: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const templateId = params.get('live') || '';
  const nameOverride = params.get('name') || '';
  const colorParam = params.get('color') as ThemeColor | null;
  const initialThemeColor = colorParam && THEME_COLORS.includes(colorParam) ? colorParam : undefined;

  // Embedded inside a device frame the parent already provides every control, so the
  // return-to-NOVAIQ bar would just be chrome drawn on top of chrome.
  const isEmbedded = window.self !== window.top;

  const template = useMemo(() => {
    const found = templatesData.find((t) => t.id === templateId);
    if (!found) return null;
    return nameOverride ? { ...found, title: nameOverride } : found;
  }, [templateId, nameOverride]);

  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    document.title = template ? `${template.title} — معاينة حية` : 'معاينة حية | NOVAIQ';
  }, [template]);

  const goHome = () => {
    window.location.href = window.location.pathname;
  };

  if (!template) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 bg-black px-6 text-center">
        <TriangleAlert className="w-10 h-10 text-amber-400" />
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-white">هذا القالب غير متوفر</h1>
          <p className="text-xs text-zinc-400">
            الرابط الذي فتحته لا يشير إلى أي قالب في معرضنا. تصفّح المعرض لاختيار قالب آخر.
          </p>
        </div>
        <button
          onClick={goHome}
          className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-bold cursor-pointer"
        >
          العودة إلى NOVAIQ
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
          initialThemeColor={initialThemeColor}
          onClose={goHome}
          onSelectForContract={() => {
            // The contract flow lives in the main app, so hand the visitor back to it with
            // this template already opened for them.
            window.location.href = `${window.location.pathname}?preview=${encodeURIComponent(template.id)}`;
          }}
        />
      </Suspense>

      {!isEmbedded && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-2.5 py-2 rounded-2xl bg-black/90 backdrop-blur-md border border-zinc-700/80 shadow-2xl">
          <NovaiqLogo size={22} showText={false} />
          <span className="hidden sm:inline text-[10px] text-zinc-400 px-1">معاينة حية لقالب NOVAIQ</span>
          <button
            onClick={goHome}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>العودة</span>
          </button>
          <button
            onClick={() =>
              (window.location.href = `${window.location.pathname}?preview=${encodeURIComponent(template.id)}`)
            }
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-[11px] font-bold cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <FileSignature className="w-3.5 h-3.5" />
            <span>اطلب هذا القالب</span>
          </button>
        </div>
      )}
    </div>
  );
};
