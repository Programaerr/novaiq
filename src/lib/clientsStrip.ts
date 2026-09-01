import { useEffect, useState } from 'react';

/**
 * "أعمالنا" — شريط متحرك بأسماء/شعارات الشركات التي عملنا معها، تحت قسم الهيرو مباشرة.
 *
 * يتبع نفس نمط socialLinks.ts بالضبط: مستند إعدادات واحد يقرؤه كل زائر ويكتبه الأدمن وحده
 * (قاعدة settings في firestore.rules)، مع نسخة محلية تُرسَم فوراً قبل وصول Firestore حتى لا
 * يظهر الشريط ثم يقفز.
 *
 * ## لماذا الصور داخل المستند لا في Storage
 * الشعار المرفوع يُصغَّر ويُضغَط في المتصفح قبل الحفظ (انظر SettingsTab) فيصير عشرات الكيلوبايت
 * لا ميغابايت، ويُخزَّن كـ data URL داخل هذا المستند. البديل — Firebase Storage — يفرض إعداد
 * قواعد تخزين منفصلة من الكونسول ورفعاً ثم حذفاً يدوياً لكل صورة، مقابل عدد شعارات لا يتجاوز
 * العشرات عادةً. الحدّ الحقيقي الوحيد هو سقف مستند Firestore (1 ميغابايت)، ولذلك يوجد
 * `CLIENTS_DOC_BUDGET_BYTES` أدناه ويمنع الحفظ قبل الاصطدام به بدل أن يفشل بعده.
 */

const SETTINGS_DOC = 'settings/clients';
const CACHE_KEY = 'nuvaiq_clients_strip_cache';

/** سقف عملي دون سقف Firestore الصلب (1MB) بهامش يكفي لبقية الحقول ولترميز base64. */
export const CLIENTS_DOC_BUDGET_BYTES = 700 * 1024;

export interface ClientItem {
  id: string;
  /** الاسم — يُعرَض نصاً حين لا توجد صورة، ويُستعمل دائماً كـ alt للصورة. */
  name: string;
  /** شعار مصغَّر ومضغوط كـ data URL. غيابه يعني "اعرض الاسم نصاً". */
  logoDataUrl?: string;
}

export interface ClientsStrip {
  /** التفعيل يدوي بالكامل: القسم لا يظهر للزوار حتى يُشغّله الأدمن. */
  enabled: boolean;
  /** العنوان فوق الشريط، قابل للتعديل في أي وقت. */
  title: string;
  /** ثواني الدورة الكاملة. أكبر = أبطأ. */
  speedSeconds: number;
  items: ClientItem[];
}

export const DEFAULT_CLIENTS_STRIP: ClientsStrip = {
  enabled: false,
  title: 'أعمالنا',
  speedSeconds: 32,
  items: [],
};

function normalize(raw: unknown): ClientsStrip {
  const data = (raw || {}) as Partial<ClientsStrip>;
  return {
    enabled: data.enabled === true,
    title: typeof data.title === 'string' && data.title.trim() ? data.title : DEFAULT_CLIENTS_STRIP.title,
    // يُقيَّد هنا لا في الواجهة فقط: قيمة صفر أو سالبة تنتج حركة لا نهائية السرعة أو متجمّدة.
    speedSeconds: Math.min(120, Math.max(8, Number(data.speedSeconds) || DEFAULT_CLIENTS_STRIP.speedSeconds)),
    items: Array.isArray(data.items)
      ? data.items
          .filter((i): i is ClientItem => !!i && typeof i.id === 'string')
          .map((i) => ({ id: i.id, name: String(i.name || ''), logoDataUrl: i.logoDataUrl || undefined }))
      : [],
  };
}

function readCache(): ClientsStrip {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? normalize(JSON.parse(raw)) : DEFAULT_CLIENTS_STRIP;
  } catch {
    return DEFAULT_CLIENTS_STRIP;
  }
}

function writeCache(value: ClientsStrip) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // مساحة ممتلئة أو تصفّح خاص — الشريط سيعتمد على Firestore وحده، لا أكثر.
  }
}

export function subscribeToClientsStrip(callback: (value: ClientsStrip) => void) {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  import('firebase/firestore')
    .then(async ({ doc, onSnapshot }) => {
      if (cancelled) return;
      const { db } = await import('./firebase');
      if (cancelled) return;
      unsubscribe = onSnapshot(
        doc(db, SETTINGS_DOC),
        (snap) => callback(normalize(snap.data())),
        // لا تُمسح البيانات المعروضة عند خطأ عابر في المستمع — نفس القاعدة في socialLinks.ts.
        (error) => console.error('clients strip subscription error:', error)
      );
    })
    .catch((error) => console.error('clients strip subscription error:', error));

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function saveClientsStrip(value: ClientsStrip): Promise<void> {
  const [{ doc, setDoc }, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('./firebase'),
  ]);
  await setDoc(doc(db, SETTINGS_DOC), value);
}

/** الهوك الوحيد الذي يقرأ منه كل من يعرض الشريط. */
export function useClientsStrip(): ClientsStrip {
  const [value, setValue] = useState<ClientsStrip>(readCache);
  useEffect(
    () =>
      subscribeToClientsStrip((next) => {
        writeCache(next);
        setValue(next);
      }),
    []
  );
  return value;
}

/** حجم المستند تقريبياً بالبايت — ما يمنع تجاوز سقف Firestore قبل محاولة الحفظ. */
export function estimateStripBytes(value: ClientsStrip): number {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return JSON.stringify(value).length;
  }
}
