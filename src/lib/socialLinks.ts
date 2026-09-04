import { useEffect, useState } from 'react';

// A single settings document (not per-template like pricing_overrides) — there's only ever
// one set of company social accounts, so one doc keyed by a fixed ID is simpler than a
// collection of one.
const SETTINGS_KEY = 'social';

// Same reasoning as OVERRIDES_CACHE_KEY in pricingOverrides.ts: without a local cache, a
// fresh page load shows no social links at all until the async Firestore listener responds,
// which reads as "links disappear on reload" even though it self-corrects a moment later.
const LINKS_CACHE_KEY = 'nuvaiq_social_links_cache';

function readCachedLinks(): SocialLinks {
  try {
    const raw = localStorage.getItem(LINKS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCachedLinks(links: SocialLinks) {
  try {
    localStorage.setItem(LINKS_CACHE_KEY, JSON.stringify(links));
  } catch {
    // Storage unavailable (private browsing, quota) — the cache just won't persist.
  }
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  /** A phone number (any format) — the wa.me link is built from it at render time, not
   *  stored, so the admin never has to know or paste the exact wa.me URL format. */
  whatsapp?: string;
}

export function subscribeToSocialLinks(callback: (links: SocialLinks) => void) {
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
        // لا مسح لما حُمِّل عند خطأ عابر — نفس القاعدة في pricingOverrides.ts: وميض يُخفي روابط الفوتر ثم يعيدها أسوأ من لا شيء.
        if (error) {
          console.error('social-links load error:', error);
          return;
        }
        callback(((data?.data as SocialLinks) || {}));
      };

      await load();
      if (cancelled) return;

      const channel = supabase
        .channel('social-links')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => void load())
        .subscribe();

      unsubscribe = () => {
        void supabase.removeChannel(channel);
      };
    })
    .catch((error) => console.error('social-links subscription error:', error));

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function saveSocialLinks(links: SocialLinks): Promise<void> {
  const { supabase } = await import('./supabase');
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: SETTINGS_KEY, data: links, updated_at: new Date().toISOString() },
            { onConflict: 'key' });
  if (error) throw error;
}

/** The single hook every social-links consumer (currently just the Footer) should use. */
export function useSocialLinks(): SocialLinks {
  const [links, setLinks] = useState<SocialLinks>(readCachedLinks);
  useEffect(() => subscribeToSocialLinks((next) => {
    writeCachedLinks(next);
    setLinks(next);
  }), []);
  return links;
}

/** Digits only — accepts whatever format the admin typed (spaces, +, dashes) and builds a
 *  working wa.me link regardless.
 *
 *  `prefilledText` يفتح المحادثة ونصّها مكتوب أصلاً، ينقص ضغطة إرسال واحدة. مضاف هنا لا في
 *  موضع الاستدعاء: شكل رابط wa.me يعيش في هذه الدالة وحدها، ومن يبني `?text=` بنفسه في مكان
 *  آخر يصنع النسخة الثانية التي تفترق عند أول تغيير في الشكل. */
export function whatsappLink(rawNumber: string, prefilledText?: string): string {
  const base = `https://wa.me/${rawNumber.replace(/[^\d]/g, '')}`;
  return prefilledText ? `${base}?text=${encodeURIComponent(prefilledText)}` : base;
}
