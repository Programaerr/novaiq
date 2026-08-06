import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// `?live=<template-id>` is served as its own document rather than as a route inside the app.
// It has to be a genuinely separate page: it's what the device-frame iframes load and what
// the "open in a new tab" action opens, so none of NOVAIQ's own shell (navbar, background,
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

// Completes and retires the boot progress bar declared in index.html (see the note there).
// The rAF pair waits for the frame after the one this render commits in, so the bar's 100%
// and its fade start once there is genuinely something painted behind it — finishing it
// synchronously here would clear it while the page was still blank.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const bar = document.getElementById('boot-progress');
    if (!bar) return;
    bar.classList.add('is-done');
    // Removed rather than left hidden, so a permanently-invisible fixed element isn't sitting
    // over the top edge of every page for the rest of the session.
    bar.addEventListener('transitionend', () => bar.remove(), { once: true });
    // Fallback for the case where the opacity transition never fires (a background tab, or
    // reduced-motion settings that collapse the duration to zero).
    window.setTimeout(() => bar.remove(), 1500);
  });
});
