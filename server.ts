import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Find the machine's LAN IP so the server can also be reached from other devices on the same network
function getLocalNetworkIP(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

app.use(express.json({ limit: '10mb' }));

// API Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'NOVAIQ Cosmic Engine' });
});

// Gemini AI Consultation Endpoint
app.post('/api/gemini/consult', async (req, res) => {
  try {
    const { prompt, companyName, businessType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير متوفر في البيئة' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `أنت المساعد الذكي الخبير لمنصة NOVAIQ الرقمية الفضائية لبناء القوالب والعقود البرمجية الإلكترونية للشركات والمؤسسات.
أجب باللغة العربية بأسلوب راقي ومستقبلي واحترافي موجه لإدارات الشركات.
بيانات الاستشارة:
اسم الشركة: ${companyName || 'شركة غير محددة'}
نشاط الشركة: ${businessType || 'عام'}
السؤال/الطلب: ${prompt}

قدم اقتراحاً للمواصفات الفنية الموصى بها، والمدة الزمنية التقريبية، وأبرز الشروط العقدية الهامة للحفاظ على حقوق الطرفين.`
            }
          ]
        }
      ]
    });

    return res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini consultation error:', error);
    return res.status(500).json({ error: error.message || 'حدث خطأ أثناء معالجة الطلب عبر الذكاء الاصطناعي' });
  }
});

// ---------------------------------------------------------------------------
// Auto-Translation (Arabic -> English) for dynamic/free-text content that isn't part of
// the static UI dictionary — a client's custom feature notes, a template's add-on spec
// labels, or any section added later.
//
// Deliberately NOT AI-based: this project is meant to run on plain Node hosting, not just
// AI Studio (the only place GEMINI_API_KEY gets auto-injected), so it proxies the free
// public Google Translate endpoint — no API key, no billing account.
//
// Results are cached to disk and shared by every visitor. Without this, each browser
// re-translated the entire site on its first visit; now the first request for a given
// string is the only one that ever hits the network, and the cache survives restarts.
// ---------------------------------------------------------------------------

const TRANSLATION_CACHE_FILE = path.join(process.cwd(), '.translation-cache.json');

function loadTranslationCache(): Record<string, string> {
  try {
    if (fs.existsSync(TRANSLATION_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(TRANSLATION_CACHE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Could not read translation cache, starting empty:', e);
  }
  return {};
}

const translationCache: Record<string, string> = loadTranslationCache();
let cacheWriteTimer: NodeJS.Timeout | null = null;

// Debounced so a burst of new strings results in one disk write, not one per string.
function persistTranslationCache() {
  if (cacheWriteTimer) clearTimeout(cacheWriteTimer);
  cacheWriteTimer = setTimeout(() => {
    try {
      fs.writeFileSync(TRANSLATION_CACHE_FILE, JSON.stringify(translationCache, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not persist translation cache:', e);
    }
  }, 1000);
}

async function translateOne(text: string, source: string, target: string): Promise<string> {
  const cacheKey = `${source}:${target}:${text}`;
  if (translationCache[cacheKey]) return translationCache[cacheKey];

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translate service responded with ${response.status}`);
  }

  const data = await response.json();
  // Response shape: [[[translatedChunk, originalChunk, ...], ...], ...] — Google splits
  // long input into sentence chunks; join them back into one string.
  const translated = ((data[0] || []) as any[]).map((segment) => segment[0]).join('');

  if (translated) {
    translationCache[cacheKey] = translated;
    persistTranslationCache();
  }
  return translated;
}

app.post('/api/translate', async (req, res) => {
  try {
    const { text, texts, source = 'ar', target = 'en' } = req.body;

    // Batch form — one request for a whole page's worth of strings instead of N.
    if (Array.isArray(texts)) {
      const results = await Promise.all(
        texts.map(async (item: unknown) => {
          if (typeof item !== 'string' || !item.trim()) return '';
          try {
            return await translateOne(item.trim(), source, target);
          } catch {
            return '';
          }
        })
      );
      return res.json({ translations: results });
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text or texts is required' });
    }

    const translated = await translateOne(text.trim(), source, target);
    return res.json({ translated });
  } catch (error: any) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: error.message || 'Translation failed' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const networkIP = getLocalNetworkIP();
    console.log('');
    console.log('  NOVAIQ Server is running:');
    console.log(`  ➜  Local:   http://localhost:${PORT}`);
    if (networkIP) {
      console.log(`  ➜  Network: http://${networkIP}:${PORT}`);
    }
    console.log('');
  });
}

startServer();
