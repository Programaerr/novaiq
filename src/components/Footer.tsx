import React from 'react';
import { ShieldCheck, Mail, Globe, Facebook, Instagram, Twitter, Music2, MessageCircle } from 'lucide-react';
import { Language } from '../lib/i18n';
import { useSocialLinks, whatsappLink } from '../lib/socialLinks';
import { NovaiqLogo } from './NovaiqLogo';

interface FooterProps {
  language?: Language;
  onNavigate?: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ language = 'ar', onNavigate }) => {
  const handleLinkClick = (pageId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(pageId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative mt-20 sm:mt-32 bg-black border-t border-zinc-800/80 pt-14 pb-10 overflow-hidden text-xs text-zinc-400 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
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

          {/* Contact */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white mb-3">{language === 'ar' ? 'التواصل والخدمة' : 'Contact & Support'}</h4>
            <div className="space-y-2 font-mono">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>support@novaiq.space</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>www.novaiq.space</span>
              </div>
            </div>
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
