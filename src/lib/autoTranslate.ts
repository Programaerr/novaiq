import { useEffect, useState } from 'react';
import { Language, translateText } from './i18n';

// Auto-Translation Layer (Arabic -> English) for dynamic, free-text content that will
// never have a manually maintained dictionary entry — e.g. a client's own custom feature
// request notes, or a template's add-on spec labels. `translateText()` in i18n.ts only
// knows fixed UI strings; anything new falls through to the `/api/translate` server proxy
// (a free Google Translate lookup, no API key) instead of requiring a code change every
// time content is added.

const CACHE_KEY = 'novaiq_translation_cache';

function loadCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, string>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage full or unavailable — cache simply won't persist across reloads
  }
}

let memoryCache: Record<string, string> = loadCache();
const pendingRequests = new Map<string, Promise<string>>();

async function requestTranslation(text: string): Promise<string> {
  if (memoryCache[text]) return memoryCache[text];

  const pending = pendingRequests.get(text);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: 'ar', target: 'en' }),
      });
      if (!res.ok) throw new Error('translation request failed');
      const data = await res.json();
      const translated = (data.translated || '').trim();
      if (!translated) throw new Error('empty translation');

      memoryCache = { ...memoryCache, [text]: translated };
      saveCache(memoryCache);
      return translated;
    } finally {
      pendingRequests.delete(text);
    }
  })();

  pendingRequests.set(text, promise);
  return promise;
}

const arabicCharsPattern = /[؀-ۿ]/;

/**
 * Returns `text` translated to the target language. Known UI strings resolve instantly
 * via the static dictionary in i18n.ts; unrecognized (dynamic) Arabic text is shown as-is
 * on first render, then swapped in-place once the translation resolves and gets cached.
 */
export function useAutoTranslate(text: string | undefined | null, lang: Language): string {
  const staticResult = translateText(text, lang);
  const [resolved, setResolved] = useState(staticResult);

  useEffect(() => {
    if (lang === 'ar' || !text) {
      setResolved(text || '');
      return;
    }

    const trimmed = text.trim();
    const staticTranslation = translateText(text, lang);

    if (!arabicCharsPattern.test(staticTranslation)) {
      // Fully resolved by the static dictionary/replacements — no network call needed.
      setResolved(staticTranslation);
      return;
    }

    if (memoryCache[trimmed]) {
      setResolved(memoryCache[trimmed]);
      return;
    }

    let cancelled = false;
    setResolved(staticTranslation);
    requestTranslation(trimmed)
      .then((translated) => {
        if (!cancelled) setResolved(translated);
      })
      .catch(() => {
        // Network unavailable — keep the static best-effort result already shown.
      });

    return () => {
      cancelled = true;
    };
  }, [text, lang]);

  return resolved;
}
