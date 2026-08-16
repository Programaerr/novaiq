import React from 'react';
import { ArrowUpLeft, ArrowUpRight, Github, Instagram, Mail, MapPin, MessageCircle, Send } from 'lucide-react';
import { Language } from '../lib/i18n';

interface FooterProps {
  language?: Language;
  onNavigate?: (page: string) => void;
}

interface FooterColumnProps {
  heading: string;
  children: React.ReactNode;
}

const FooterColumn: React.FC<FooterColumnProps> = ({ heading, children }) => (
  <div>
    <h3 className="text-[0.7rem] sm:text-xs font-bold tracking-[0.28em] uppercase text-white/50">
      {heading}
    </h3>
    <ul className="mt-5 space-y-3">{children}</ul>
  </div>
);

interface FooterLinkProps {
  label: string;
  onClick?: () => void;
  href?: string;
}

const FooterLink: React.FC<FooterLinkProps> = ({ label, onClick, href }) => (
  <li>
    <a
      href={href ?? '#'}
      onClick={onClick ? (e) => { e.preventDefault(); onClick(); } : undefined}
      className="inline-flex items-center gap-2 text-xs sm:text-sm text-white/60 hover:text-white transition-colors cursor-pointer"
    >
      {label}
    </a>
  </li>
);

/**
 * The site footer, built for the strict #000000 / #ffffff system: a tall ruled column of links
 * on the left (or right in Arabic), contact and socials, then a hairline bottom bar with the
 * copyright and a small "back to top" control. Takes the same `onNavigate` the Navbar uses so
 * the links go to real pages instead of dead anchors.
 */
export const Footer: React.FC<FooterProps> = ({ language = 'ar', onNavigate }) => {
  const isAr = language === 'ar';
  const Arrow = isAr ? ArrowUpLeft : ArrowUpRight;

  const go = (page: string) => () => onNavigate?.(page);

  return (
    <footer className="relative mt-24 sm:mt-40 border-t border-white/15 overflow-hidden">
      {/* Faint ruled grid in the footer's dark field. */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '88px 88px',
        }}
      />

      <div className="relative nq-container py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Brand + blurb. */}
          <div className="lg:col-span-4">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); go('home')(); }}
              className="inline-flex items-center gap-3 cursor-pointer"
            >
              <span
                className="w-9 h-9 grid place-items-center font-black text-black text-sm"
                style={{ background: '#ffffff', boxShadow: 'inset 0 0 0 1px #ffffff' }}
                aria-hidden="true"
              >
                N
              </span>
              <span className="text-lg font-black tracking-[0.18em] text-white">
                NOVAIQ
              </span>
            </a>
            <p className="mt-5 max-w-sm text-xs sm:text-sm text-white/55 leading-relaxed">
              {isAr
                ? 'استوديو رقمي عراقي يصمم ويطور أنظمة وتطبيقات ذكية — من الفكرة والمواصفات حتى الإطلاق، بعقود إلكترونية وتسليم في الموعد.'
                : 'An Iraqi digital studio designing and building smart systems and applications — from idea and spec to launch, with e-contracts and on-time delivery.'}
            </p>

            <div className="mt-7 flex items-center gap-3">
              {[
                { Icon: Instagram, href: '#', label: 'Instagram' },
                { Icon: Send, href: '#', label: 'Telegram' },
                { Icon: Github, href: '#', label: 'GitHub' },
                { Icon: MessageCircle, href: '#', label: 'WhatsApp' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 grid place-items-center rounded-full text-white/70 hover:text-black transition-colors bg-white/[0.05] backdrop-blur-md"
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.8} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links. */}
          <div className="lg:col-span-2">
            <FooterColumn heading={isAr ? 'تصفح' : 'Browse'}>
              <FooterLink label={isAr ? 'الرئيسية' : 'Home'} onClick={go('home')} />
              <FooterLink label={isAr ? 'القوالب البرمجية' : 'Ready Templates'} onClick={go('templates')} />
              <FooterLink label={isAr ? 'مراحل العمل' : 'Roadmap & Process'} onClick={go('timeline')} />
            </FooterColumn>
          </div>

          {/* Legal. */}
          <div className="lg:col-span-2">
            <FooterColumn heading={isAr ? 'قانوني' : 'Legal'}>
              <FooterLink label={isAr ? 'العقود الإلكترونية' : 'E-contracts'} onClick={go('templates')} />
              <FooterLink label={isAr ? 'الدعم الفني' : 'Support'} onClick={go('about')} />
            </FooterColumn>
          </div>

          {/* Contact. */}
          <div className="lg:col-span-4">
            <FooterColumn heading={isAr ? 'تواصل معنا' : 'Get in touch'}>
              <li>
                <a
                  href="mailto:hello@novaiq.io"
                  className="inline-flex items-center gap-2.5 text-xs sm:text-sm text-white/60 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4 text-white/40" strokeWidth={1.6} />
                  <span dir="ltr">hello@novaiq.io</span>
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-xs sm:text-sm text-white/60">
                <MapPin className="w-4 h-4 text-white/40" strokeWidth={1.6} />
                <span>{isAr ? 'بغداد، العراق' : 'Baghdad, Iraq'}</span>
              </li>
            </FooterColumn>

            <div className="mt-7 rounded-2xl bg-white/[0.04] backdrop-blur-xl p-5"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}
            >
              <p className="text-[0.7rem] font-bold tracking-[0.2em] uppercase text-white/60">
                {isAr ? 'ابدأ مشروعك اليوم' : 'Start a project today'}
              </p>
              <p className="mt-2 text-xs text-white/50 leading-relaxed">
                {isAr
                  ? 'أخبرنا عن فكرتك وسنرجع إليك بمواصفات أولية خلال 48 ساعة.'
                  : 'Tell us about your idea and we will come back with a first spec within 48 hours.'}
              </p>
              <button
                type="button"
                onClick={() => go('custom-request')()}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-[0.65rem] font-bold tracking-[0.16em] uppercase hover:bg-black hover:text-white hover:ring-1 hover:ring-white transition-colors cursor-pointer"
              >
                {isAr ? 'اطلب مشروعك' : 'Request a project'}
                <Arrow className="w-3.5 h-3.5" strokeWidth={2.6} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar. */}
        <div className="mt-14 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[0.65rem] tracking-[0.14em] uppercase text-white/40">
            © {new Date().getFullYear()} NOVAIQ — {isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 text-[0.65rem] font-bold tracking-[0.18em] uppercase text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            {isAr ? 'العودة للأعلى' : 'Back to top'}
            <Arrow className="w-3.5 h-3.5 -rotate-90" strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </footer>
  );
};