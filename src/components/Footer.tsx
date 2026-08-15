import React from 'react';
import { Language } from '../lib/i18n';

interface FooterProps {
  language?: Language;
  onNavigate?: (page: string) => void;
}

/**
 * The site footer — rebuilt from the empty shell it was before the homepage redesign.
 *
 * Three columns: the brand line, the page links and the legal links, then a bottom bar with
 * the copyright and the language/currency affordance. `onNavigate` routes through App's SPA
 * navigation so the footer links behave exactly like the navbar's.
 */
export const Footer: React.FC<FooterProps> = ({ language = 'ar', onNavigate }) => {
  const isAr = language === 'ar';

  const pages = [
    { id: 'home', l: isAr ? 'الرئيسية' : 'Home' },
    { id: 'templates', l: isAr ? 'القوالب الجاهزة' : 'Ready Templates' },
    { id: 'timeline', l: isAr ? 'خارطة الطريق' : 'Roadmap' },
    { id: 'about', l: isAr ? 'عن NOVAIQ' : 'About NOVAIQ' },
  ];

  const legal = [
    { id: 'privacy', l: isAr ? 'سياسة الخصوصية' : 'Privacy Policy' },
    { id: 'terms', l: isAr ? 'الشروط والأحكام' : 'Terms of Service' },
  ];

  const go = (page: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate?.(page);
  };

  return (
    <footer className="relative mt-10 pb-10 z-20">
      <div className="border-t border-white/10">
        <div className="nq-container pt-12 sm:pt-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand column */}
            <div className="lg:col-span-2">
              <p className="text-2xl font-black tracking-tight text-white">
                NOVAIQ
              </p>
              <p className="mt-3 max-w-sm text-xs sm:text-sm text-white/50 leading-relaxed">
                {isAr
                  ? 'استوديو عراقي لتصميم وتطوير الأنظمة والتطبيقات الذكية — من الفكرة والمواصفات حتى الإطلاق والدعم، بعقود إلكترونية وتسليم في الوقت المحدد.'
                  : 'An Iraqi studio for smart systems and applications — from idea and spec to launch and support, with e-contracts and on-time delivery.'}
              </p>
            </div>

            {/* Page links */}
            <nav aria-label={isAr ? 'صفحات الموقع' : 'Site pages'}>
              <h3 className="text-[0.7rem] font-bold tracking-[0.24em] uppercase text-white/40">
                {isAr ? 'الموقع' : 'Site'}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {pages.map((p) => (
                  <li key={p.id}>
                    <a
                      href={`?page=${p.id}`}
                      onClick={go(p.id)}
                      className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {p.l}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Legal links */}
            <nav aria-label={isAr ? 'روابط قانونية' : 'Legal'}>
              <h3 className="text-[0.7rem] font-bold tracking-[0.24em] uppercase text-white/40">
                {isAr ? 'قانوني' : 'Legal'}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {legal.map((p) => (
                  <li key={p.id}>
                    <a
                      href={`?page=${p.id}`}
                      onClick={go(p.id)}
                      className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {p.l}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[0.65rem] sm:text-xs text-white/35">
              © {new Date().getFullYear()} NOVAIQ. {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </p>
            <p className="text-[0.65rem] sm:text-xs text-white/35">
              {isAr ? 'صُنع بحب في العراق' : 'Crafted in Iraq'}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
