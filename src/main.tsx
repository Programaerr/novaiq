import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Classify the GPU tier before first paint so the stylesheet can lighten
// compositor-heavy effects on weak devices without waiting on React at all.

/* كونسول صامت في الإنتاج.
 *
 * `esbuild.drop` في vite.config يمسح كل `console.*` من كودنا نحن عند البناء — تحقّقتُ: صفر
 * استدعاء في حزم التطبيق. لكنه لا يطال المكتبات المُحزَّمة مسبقاً: jspdf وthree وhtml2canvas
 * تحمل تحذيراتها الخاصة (11 استدعاءً بينها `console.error` و`console.log`)، وتطبعها عند أي
 * حالة غير متوقّعة لدى الزائر.
 *
 * وما تطبعه ليس محايداً: رسائل مكتبة تكشف أسماءها وإصداراتها ومسار الفشل داخلها — وهي أوّل
 * ما يقرؤه من يبحث عن ثغرة معروفة في نسخة بعينها. الصمت هنا تقليل لسطح المعلومات، لا تجميل.
 *
 * لا يُلغى إلا في الإنتاج، فالتشخيص في التطوير يبقى كاملاً.
 *
 * حدّ صريح: الاستثناءات غير الملتقَطة يطبعها المتصفح بنفسه ولا يملك أي كود منعها — الكونسول
 * فارغ من كل ما نطبعه نحن ومكتباتنا، لا من كل ما يمكن أن يظهر فيه. */
if (import.meta.env.PROD) {
  const silence = () => undefined;
  for (const key of ['log', 'info', 'warn', 'error', 'debug', 'trace', 'table', 'dir', 'group', 'groupEnd', 'time', 'timeEnd'] as const) {
    (console as unknown as Record<string, () => void>)[key] = silence;
  }
}

// Installable-app worker. Registered only in production builds (dev serves /sw.js anyway,
// but prod is where the cache-first speed-up on a phone actually pays off). Runtime-cached —
// see public/sw.js for the strategy.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // No service worker? The site still works, just without the offline/cache layer.
    });
  });
}

// `?live=<template-id>` is served as its own document rather than as a route inside the app.
// It has to be a genuinely separate page: it's what the device-frame iframes load and what
// the "open in a new tab" action opens, so none of NUVAIQ's own shell (navbar, background,
// scroll rig, translator) may mount around it — the customer must be looking at the template
// and nothing else.
const TemplateLivePage = lazy(() =>
  import('./components/TemplateLivePage.tsx').then((m) => ({ default: m.TemplateLivePage }))
);

const isLiveTemplateView = new URLSearchParams(window.location.search).has('live');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isLiveTemplateView ? (
        <Suspense fallback={null}>
          <TemplateLivePage />
        </Suspense>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </StrictMode>,
);
