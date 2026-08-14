import React from 'react';
import { ShieldCheck, Facebook, Instagram, Twitter, Music2, MessageCircle } from 'lucide-react';
import { Language } from '../lib/i18n';
import { useSocialLinks, whatsappLink } from '../lib/socialLinks';
import { NovaiqLogo } from './NovaiqLogo';

interface FooterProps {
  language?: Language;
  onNavigate?: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ language = 'ar', onNavigate }) => {
  const social = useSocialLinks();
  const socialButtons = [
    { href: social.facebook, Icon: Facebook, label: 'Facebook' },
    { href: social.instagram, Icon: Instagram, label: 'Instagram' },
    { href: social.twitter, Icon: Twitter, label: 'X (Twitter)' },
    { href: social.tiktok, Icon: Music2, label: 'TikTok' },
    { href: social.whatsapp ? whatsappLink(social.whatsapp) : undefined, Icon: MessageCircle, label: 'WhatsApp' },
  ].filter((s): s is { href: string; Icon: typeof Facebook; label: string } => !!s.href);

  const handleLinkClick = (pageId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(pageId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    // No `bg-black` and no top border any more. Both existed to separate the footer from the
    // page, and both did it by being a solid black slab — which stopped working the moment there
    // was a lit background moving behind it, because a black slab over a lit scene is a hole cut
    // in the page. The separation now comes from the frosted card inside, which is translucent:
    // the scene stays visible through it while the text sits on a surface of its own.
    <footer className="relative mt-20 sm:mt-32 pb-10 text-xs text-zinc-400 z-20">
      {/* The same `.nq-panel` every section on the home page uses, rather than a surface of its
          own. It was `.frost-card` — a near-black translucent slab with its own border and drop
          shadow, written when the page behind it was black and everything on it was neutral. On
          the indigo ground it read as a hole cut in the bottom of the page, and it was the last
          block on the site still drawing itself a different way. */}
      <div className="nq-panel nq-container pt-12 pb-10 overflow-hidden">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <NovaiqLogo size={36} showText={true} />
            <p className="text-zinc-400 leading-relaxed text-xs">
              {language === 'ar'
                ? 'منصة برمجية متخصصة لبناء المنصات والأنظمة والقوالب المتقدمة للشركات والمؤسسات، مع نظام توثيق العقود الإلكترونية الرسمي بالدينار العراقي.'
                : 'Advanced software platform for enterprise web applications & official IQD digital contract architecture.'}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white mb-3">{language === 'ar' ? 'روابط المنصة' : 'Platform Links'}</h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={(e) => handleLinkClick('templates', e)} 
                  className="hover:text-white transition-colors text-zinc-300 cursor-pointer text-start"
                >
                  {language === 'ar' ? 'القوالب الجاهزة' : 'Ready Templates'}
                </button>
              </li>
              <li>
                <button 
                  onClick={(e) => handleLinkClick('custom-request', e)} 
                  className="hover:text-white transition-colors text-zinc-300 cursor-pointer text-start"
                >
                  {language === 'ar' ? 'صانع العقود الرقمية' : 'Contract Builder'}
                </button>
              </li>
              <li>
                <button 
                  onClick={(e) => handleLinkClick('timeline', e)} 
                  className="hover:text-white transition-colors text-zinc-300 cursor-pointer text-start"
                >
                  {language === 'ar' ? 'خطة التسليم' : 'Delivery Roadmap'}
                </button>
              </li>
              <li>
                <button 
                  onClick={(e) => handleLinkClick('about', e)} 
                  className="hover:text-white transition-colors text-zinc-300 cursor-pointer text-start"
                >
                  {language === 'ar' ? 'عن NOVAIQ' : 'About NOVAIQ'}
                </button>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white mb-3">{language === 'ar' ? 'مميزات منصة NOVAIQ' : 'NOVAIQ Features'}</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-1.5 text-zinc-300">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>{language === 'ar' ? 'عقود معتمدة بختم إلكتروني' : 'Digitally Signed & Timestamped'}</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-300">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>{language === 'ar' ? 'حفظ وتوثيق سحابي آمن' : 'Encrypted Cloud Archiving'}</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-300">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>{language === 'ar' ? 'متابعة وتحديثات حسب الاتفاق' : 'Ongoing Technical Follow-up'}</span>
              </li>
            </ul>
          </div>

          {/* Contact — deliberately no hardcoded email/domain here. Every contact point shown
              is admin-configured (AdminDashboard's Settings tab); this whole column collapses
              to just its heading until the admin actually sets at least one real link, rather
              than displaying placeholder contact info nobody monitors. */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white mb-3">{language === 'ar' ? 'التواصل والخدمة' : 'Contact & Support'}</h4>

            {socialButtons.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                {socialButtons.map(({ href, Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-start font-mono text-[11px]">
          <div>
            {language === 'ar' ? 'جميع الحقوق محفوظة ©' : 'All Rights Reserved ©'} {new Date().getFullYear()} <strong className="text-white font-bold">NOVAIQ SOFTWARE SYSTEMS</strong>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => handleLinkClick('privacy', e)}
              className="hover:text-white transition-colors text-zinc-400 cursor-pointer font-semibold"
            >
              {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </button>
            <button
              onClick={(e) => handleLinkClick('terms', e)}
              className="hover:text-white transition-colors text-zinc-400 cursor-pointer font-semibold"
            >
              {language === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
