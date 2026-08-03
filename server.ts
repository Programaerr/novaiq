import express from 'express';
import path from 'path';
import os from 'os';
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

// Auto-Translation Endpoint (Arabic -> English) for dynamic/free-text content that isn't
// part of the static UI dictionary — e.g. a client's custom feature request notes, or a
// template's add-on spec labels. Deliberately NOT AI-based: this project is meant to run
// on plain Node hosting (not just AI Studio, which is the only place GEMINI_API_KEY gets
// auto-injected), so this proxies the free public Google Translate web endpoint instead —
// no API key, no billing account, works anywhere with outbound internet access.
app.post('/api/translate', async (req, res) => {
  try {
    const { text, source = 'ar', target = 'en' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Translate service responded with ${response.status}`);
    }

    const data = await response.json();
    // Response shape: [[[translatedChunk, originalChunk, ...], ...], ...] — Google splits
    // long input into sentence chunks; join them back into one string.
    const translated = ((data[0] || []) as any[]).map((segment) => segment[0]).join('');

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
