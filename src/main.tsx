import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { applyDeviceClass } from './lib/deviceQuality.ts';
import './index.css';

// Classify the GPU tier before first paint so the stylesheet can lighten
// compositor-heavy effects on weak devices without waiting on React at all.
applyDeviceClass();

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
