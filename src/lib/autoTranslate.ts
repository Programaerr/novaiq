import { useEffect, useState } from 'react';
import { Language, translateText } from './i18n';
import bundledTranslations from '../data/translations.json';

// Auto-Translation Layer (Arabic -> English) for dynamic, free-text content that will
// never have a manually maintained dictionary entry — e.g. a client's own custom feature
// request notes, or a template's add-on spec labels. `translateText()` in i18n.ts only
// knows fixed UI strings; anything new falls through to the `/api/translate` server proxy
// instead of requiring a code change every time content is added.
//
// Before that live call, every string is also checked against the pre-built dictionary in
// src/data/translations.json (npm run translations) — the same one the whole-page
// translator uses. Template spec labels and other authored content already live in that
// bundle, so this resolves them instantly instead of paying for a network round trip (which
// matters most right where it's used: capturing a contract as a PDF needs the final text
// available on the very first render, not a moment later).
//
// Two layers of caching keep genuinely new content free after its first lookup:
// localStorage here (per browser) and a shared on-disk cache on the server (every visitor).
// Requests are also batched, so a page with 30 untranslated strings makes one network call.

const CACHE_KEY = 'novaiq_translation_cache';
const BATCH_WINDOW_MS = 40;

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

type PendingEntry = { resolve: (value: string) => void; reject: (reason?: unknown) => void };

// Keyed by text so two components asking for the same string share one request.
const pendingBatch = new Map<string, PendingEntry[]>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;

async function flushBatch() {
  batchTimer = null;
  if (pendingBatch.size === 0) return;

  const entries = Array.from(pendingBatch.entries());
  pendingBatch.clear();
  const texts = entries.map(([text]) => text);

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, source: 'ar', target: 'en' }),
    });
    if (!res.ok) throw new Error('translation request failed');

    const data = await res.json();
    const translations: string[] = data.translations || [];

    const nextCache = { ...memoryCache };
    entries.forEach(([text, waiters], i) => {
      const translated = (translations[i] || '').trim();
      if (translated) {
        nextCache[text] = translated;
        waiters.forEach((w) => w.resolve(translated));
      } else {
        waiters.forEach((w) => w.reject(new Error('empty translation')));
      }
    });

    memoryCache = nextCache;
    saveCache(memoryCache);
  } catch (err) {
    entries.forEach(([, waiters]) => waiters.forEach((w) => w.reject(err)));
  }
}

function requestTranslation(text: string): Promise<string> {
  if (memoryCache[text]) return Promise.resolve(memoryCache[text]);

  return new Promise<string>((resolve, reject) => {
    const waiters = pendingBatch.get(text);
    if (waiters) {
      waiters.push({ resolve, reject });
    } else {
      pendingBatch.set(text, [{ resolve, reject }]);
    }

    if (!batchTimer) {
      batchTimer = setTimeout(flushBatch, BATCH_WINDOW_MS);
    }
  });
}

const arabicCharsPattern = /[؀-ۿ]/;
const bundled = bundledTranslations as Record<string, string>;

/** True when the static dictionary already produced a fully-English result. */
function isFullyResolved(value: string): boolean {
  return !arabicCharsPattern.test(value);
}

/** Instant, no-network resolution: i18n.ts's small hand-curated dictionary first, then the
 *  much larger pre-built bundle generated from the whole source tree. */
function resolveStatic(text: string | undefined | null, lang: Language): string {
  const viaI18n = translateText(text, lang);
  if (!text || isFullyResolved(viaI18n)) return viaI18n;
  const trimmed = text.trim();
  return bundled[trimmed] || viaI18n;
}

/**
 * Returns `text` translated to the target language. Known UI strings resolve instantly
 * via the static dictionary in i18n.ts; unrecognized (dynamic) Arabic text is shown as-is
 * on first render, then swapped in-place once the translation resolves and gets cached.
 */
export function useAutoTranslate(text: string | undefined | null, lang: Language): string {
  const [resolved, setResolved] = useState(() => resolveStatic(text, lang));

  useEffect(() => {
    if (lang === 'ar' || !text) {
      setResolved(text || '');
      return;
    }

    const trimmed = text.trim();
    const staticTranslation = resolveStatic(text, lang);

    if (isFullyResolved(staticTranslation)) {
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
        // Service unavailable — keep the static best-effort result already shown.
      });

    return () => {
      cancelled = true;
    };
  }, [text, lang]);

  return resolved;
}
