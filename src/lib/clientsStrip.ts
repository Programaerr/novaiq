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

const SETTINGS_KEY = 'clients';
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
          // المفتاح يُحذف حين لا شعار، ولا يُوضَع بقيمة undefined: تلك القيمة كانت تنتقل من
          // هنا إلى المسوّدة ثم إلى الكتابة، وFirestore يرفض undefined ويُفشل الحفظ كاملاً.
          .map((i) => ({
            id: i.id,
            name: String(i.name || ''),
            ...(i.logoDataUrl ? { logoDataUrl: i.logoDataUrl } : {}),
          }))
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

  import('./supabase')
    .then(async ({ supabase }) => {
      if (cancelled) return;

      const load = async () => {
        const { data, error } = await supabase
          .from('site_settings')
          .select('data')
          .eq('key', SETTINGS_KEY)
          .maybeSingle();
        if (cancelled) return;
        // لا مسح لما حُمِّل عند خطأ عابر — نفس القاعدة في socialLinks.ts.
        if (error) {
          console.error('clients-strip load error:', error);
          return;
        }
        callback(normalize(data?.data));
      };

      await load();
      if (cancelled) return;

      const channel = supabase
        .channel('clients-strip')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => void load())
        .subscribe();

      unsubscribe = () => {
        void supabase.removeChannel(channel);
      };
    })
    .catch((error) => console.error('clients-strip subscription error:', error));

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function saveClientsStrip(value: ClientsStrip): Promise<void> {
  const { supabase } = await import('./supabase');

  /* المستند يُكتب كاملاً بلا merge، وهذا مقصود: الحفظ استبدال لا إضافة، فأي شعار حُذف أو
     عنصر أُزيل يختفي فعلياً من قاعدة البيانات ولا يبقى محجوزاً للمساحة. merge كان سيُبقي كل
     حقل لم يُذكر في هذه الكتابة على حاله.
     
     والمفتاح يُحذف حذفاً لا يُرسَل `undefined`: Firestore يرفض القيمة undefined ويُفشل
     الكتابة كاملة برسالة "Unsupported field value" — أي أن إزالة شعار واحد كانت ستُسقط حفظ
     القسم كله. */
  const payload: ClientsStrip = {
    enabled: value.enabled,
    title: value.title,
    speedSeconds: value.speedSeconds,
    items: value.items.map((item) => ({
      id: item.id,
      name: item.name,
      ...(item.logoDataUrl ? { logoDataUrl: item.logoDataUrl } : {}),
    })),
  };

  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: SETTINGS_KEY, data: payload, updated_at: new Date().toISOString() },
            { onConflict: 'key' });
  if (error) throw error;
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
