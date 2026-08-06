// Social links the public footer renders. Blank fields hide their button entirely.
import React, { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  Settings,
  Facebook,
  Instagram,
  Twitter,
  Music2,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';
import { useSocialLinks, saveSocialLinks, SocialLinks } from '../../lib/socialLinks';
import { cosmicAudio } from '../../lib/audio';
import { showToast } from '../../lib/toast';

export const SOCIAL_FIELDS: Array<{
  id: keyof SocialLinks;
  icon: React.ElementType;
  labelAr: string;
  labelEn: string;
  placeholder: string;
}> = [
  { id: 'facebook', icon: Facebook, labelAr: 'فيسبوك', labelEn: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
  { id: 'instagram', icon: Instagram, labelAr: 'إنستغرام', labelEn: 'Instagram', placeholder: 'https://instagram.com/yourpage' },
  { id: 'twitter', icon: Twitter, labelAr: 'إكس (تويتر)', labelEn: 'X (Twitter)', placeholder: 'https://x.com/yourpage' },
  { id: 'tiktok', icon: Music2, labelAr: 'تيك توك', labelEn: 'TikTok', placeholder: 'https://tiktok.com/@yourpage' },
];

function SettingsTab({ isAr }: { isAr: boolean }) {
  const savedLinks = useSocialLinks();
  const [links, setLinks] = useState<SocialLinks>({});
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setLinks(savedLinks);
  }, [savedLinks]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveSocialLinks(links);
      cosmicAudio.playPing();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      showToast(isAr ? 'تعذر حفظ الروابط، حاول مجدداً' : 'Failed to save the links — please try again', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-zinc-400" />
          <span>{isAr ? 'روابط التواصل الاجتماعي وواتساب' : 'Social Media & WhatsApp Links'}</span>
        </h3>
        <p className="text-xs text-zinc-400">
          {isAr
            ? 'تظهر هذه الروابط أسفل الموقع للزوار — اترك أي حقل فارغاً لإخفاء أيقونته من الفوتر.'
            : "These links appear at the bottom of the site for visitors — leave a field empty to hide its icon from the footer."}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
        {SOCIAL_FIELDS.map(({ id, icon: Icon, labelAr, labelEn, placeholder }) => (
          <label key={id} className="block space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-zinc-500" />
              <span>{isAr ? labelAr : labelEn}</span>
            </span>
            <input
              type="url"
              value={links[id] || ''}
              onChange={(e) => setLinks((prev) => ({ ...prev, [id]: e.target.value }))}
              placeholder={placeholder}
              dir="ltr"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs font-mono placeholder:text-zinc-700"
            />
          </label>
        ))}

        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-zinc-500" />
            <span>{isAr ? 'رقم واتساب (مع رمز البلد)' : 'WhatsApp number (with country code)'}</span>
          </span>
          <input
            type="tel"
            value={links.whatsapp || ''}
            onChange={(e) => setLinks((prev) => ({ ...prev, whatsapp: e.target.value }))}
            placeholder="9647701234567"
            dir="ltr"
            className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-xs font-mono placeholder:text-zinc-700"
          />
        </label>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-60 text-black text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all border border-white"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : justSaved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>
            {justSaved
              ? (isAr ? 'تم الحفظ' : 'Saved')
              : (isAr ? 'حفظ الروابط' : 'Save Links')}
          </span>
        </button>
      </div>
    </div>
  );
}
