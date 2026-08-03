import { useEffect, useState } from 'react';
import { Language, translateText } from './i18n';

// Auto-Translation Layer (Arabic -> English) for dynamic, free-text content that will
// never have a manually maintained dictionary entry — e.g. a client's own custom feature
// request notes. `translateText()` in i18n.ts only knows fixed UI strings; anything new
// falls through here instead of requiring a code change every time content is added.

const CACHE_KEY = 'novaiq_ai_translation_cache';

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

async function requestAiTranslation(text: string): Promise<string> {
  if (memoryCache[text]) return memoryCache[text];

  const pending = pendingRequests.get(text);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch('/api/gemini/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
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
 * on first render, then swapped in-place once the AI translation resolves and gets cached.
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
      // Fully resolved by the static dictionary/replacements — no AI call needed.
      setResolved(staticTranslation);
      return;
    }

    if (memoryCache[trimmed]) {
      setResolved(memoryCache[trimmed]);
      return;
    }

    let cancelled = false;
    setResolved(staticTranslation);
    requestAiTranslation(trimmed)
      .then((translated) => {
        if (!cancelled) setResolved(translated);
      })
      .catch(() => {
        // Network/API unavailable (e.g. no GEMINI_API_KEY configured locally) — keep
        // the static best-effort result already shown.
      });

    return () => {
      cancelled = true;
    };
  }, [text, lang]);

  return resolved;
}
