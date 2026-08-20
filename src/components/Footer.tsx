import React from 'react';
import { ArrowUpLeft, ArrowUpRight, Facebook, Instagram, MessageCircle, Music2 } from 'lucide-react';
import { Language } from '../lib/i18n';
import { PAPER, INK, PERIWINKLE } from '../lib/homePalette';
import { NovaiqLogo } from './NovaiqLogo';
import { connectionTones, FOOTER_BAND_FADE, TileField } from './TileField';
import { useSocialLinks, whatsappLink } from '../lib/socialLinks';

interface FooterProps {
  language?: Language;
  onNavigate?: (page: string) => void;
  /** Opens the contract-request flow (full-screen sign-in while signed out, then the builder). */
  onRequestProject?: () => void;
  /**
   * Which ground the footer is standing on.
   *
   * `ink` is the site's own: no background of its own, letting the black page through, with
   * everything on it drawn in white at some opacity. `paper` is the home page's — #F6F1E9, the
   * same ground the phases section stands on, so the page opens and closes on the same colour with
   * the blue of the contact section held between them.
   *
   * A prop rather than a change to the component, because this footer is on every page but one
   * and only the home page has the palette that makes paper the right ground. A paper footer under
   * the black template gallery is not a footer that matches its page; it is a footer that stopped
   * matching six of them.
   */
  tone?: 'ink' | 'paper';
  /**
   * The colour of the section directly above the footer, so the cube belt can ramp out of it and
   * into this footer's ground as one continuous surface. Pass the actual ground of the last
   * section on the page (periwinkle on the home/support pages, the page's black on the rest) and
   * the belt meets it with no seam and no gap, whatever the colour happens to be.
   */
  fromColor?: string;
}

/**
 * The two grounds, as the only place any colour in this file is written.
 *
 * `--ft-fg` is everything drawn and `--ft-bg` the ground under it, as space-separated channels
 * rather than hexes, because that is the form `rgb(var(--x) / a)` needs — a hex inside a custom
 * property cannot take an alpha.
 *
 * The five alphas are the footer's hierarchy: headings quiet, links a step up, icons a step down.
 * They are per-tone because the same alpha does not mean the same thing on the two grounds. White
 * at 50% on black measures about 9:1; near-black at 50% on paper measures 3.4:1 — under the 4.5:1
 * a body-sized line needs. Pushed toward opaque, the same hierarchy reads and every level passes,
 * with 0.62 as the floor: it measures 4.9:1 and one step quieter is 4.0:1, which does not.
 */
const INK_VARS: React.CSSProperties = {
  ['--ft-fg' as string]: '255 255 255',
  ['--ft-bg' as string]: '0 0 0',
  ['--ft-a40' as string]: '0.52',
  ['--ft-a50' as string]: '0.64',
  ['--ft-a55' as string]: '0.72',
  ['--ft-a60' as string]: '0.8',
  ['--ft-a70' as string]: '0.9',
};

const PAPER_VARS: React.CSSProperties = {
  ['--ft-fg' as string]: '16 19 34',
  ['--ft-bg' as string]: '246 241 233',
  background: PAPER,
  ['--ft-a40' as string]: '0.72',
  ['--ft-a50' as string]: '0.8',
  ['--ft-a55' as string]: '0.86',
  ['--ft-a60' as string]: '0.9',
  ['--ft-a70' as string]: '0.94',
};

interface FooterColumnProps {
  heading: string;
  children: React.ReactNode;
}

const FooterColumn: React.FC<FooterColumnProps> = ({ heading, children }) => (
  <div>
      <h3 className="text-sm sm:text-base uw:text-lg font-bold tracking-[0.28em] uppercase text-[rgb(var(--ft-fg)/var(--ft-a50))]">
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
      className="inline-flex items-center gap-2 text-sm sm:text-base uw:text-lg text-[rgb(var(--ft-fg)/var(--ft-a60))] hover:text-[rgb(var(--ft-fg))] transition-colors cursor-pointer"
    >
      {label}
    </a>
  </li>
);

/**
 * The site footer: a tall ruled column of links on the left (or right in Arabic), contact and
 * socials, then a hairline bottom bar with the copyright and a small "back to top" control.
 * Takes the same `onNavigate` the Navbar uses so the links go to real pages, not dead anchors.
 *
 * ## Two grounds, one set of colours
 *
 * It was built for the site's strict #000000 / #ffffff system and now has to stand on the home
 * page's paper as well. Rather than a second copy of every class, every colour in here is one of
 * two custom properties at some opacity — `--ft-fg` for everything drawn and `--ft-bg` for the
 * ground it is drawn on — and the `tone` prop is the only place either is written. A third
 * ground would be two lines.
 */
export const Footer: React.FC<FooterProps> = ({
  language = 'ar',
  onNavigate,
  onRequestProject,
  tone = 'ink',
  fromColor,
}) => {
  const isAr = language === 'ar';
  const Arrow = isAr ? ArrowUpLeft : ArrowUpRight;
  const isPaper = tone === 'paper';
  const footerTone = isPaper ? PAPER : INK;
  const links = useSocialLinks();

  const go = (page: string) => () => onNavigate?.(page);

  // Rendered only where the admin has actually set a link — a blank field hides its icon
  // entirely instead of leaving a dead button pointing at "#". WhatsApp's link is built from
  // the number at render time (see whatsappLink), so the admin never has to paste a wa.me URL.
  const socials = [
    { Icon: Instagram, href: links.instagram?.trim(), label: 'Instagram' },
    { Icon: MessageCircle, href: links.whatsapp?.trim() ? whatsappLink(links.whatsapp) : undefined, label: 'WhatsApp' },
    { Icon: Facebook, href: links.facebook?.trim(), label: 'Facebook' },
    { Icon: Music2, href: links.tiktok?.trim(), label: 'TikTok' },
  ].filter((s) => s.href);

  return (
    <footer
      /* Two triplets, and everything else follows: every colour in this file is one of them at
         some opacity, so the whole footer re-tones from here rather than from thirty class names.
         Space-separated channels rather than a hex, because that is the form rgb(var(--x) / a)
         needs — a hex inside a custom property cannot take an alpha. */
      style={isPaper ? PAPER_VARS : INK_VARS}
      /* On paper there is no top margin and no hairline: the band below does the whole job of
         arriving out of the section above, and a rule drawn across it is exactly the straight
         line the band exists to avoid. On the black pages the footer keeps the gap and the rule
         it has always had. */
      className={`relative ${
        isPaper ? '' : 'mt-24 sm:mt-40 border-t border-[rgb(var(--ft-fg)/0.15)]'
      }`}
    >
      {/* ── The edge, on the home page only ──────────────────────────────────────────────────
          A strip carrying the ground's change of colour and a field of cubes crossing it: absent
          at the top where the ground is still the contact section's blue, assembling as it turns,
          settled into flat paper before the first link. The same move the hero makes on its way out
          and the contact section on its way in — three edges on this page, one gesture. */}
      {/* Faint ruled grid in the footer's field. */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(var(--ft-fg) / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--ft-fg) / 0.04) 1px, transparent 1px)',
          backgroundSize: '88px 88px',
        }}
      />

      {/* ── The connection belt ───────────────────────────────────────────────────────────────
          A field of cubes standing on the section above and dissolving into this footer's ground,
          so every page closes on the same gesture no matter what colour it ends on. The band ramps
          from `fromColor` (the section directly above) into the footer's own ground; its top is
          continuous with that section and its bottom settles into flat ground before the links. One
          belt, owned by the footer, instead of a separate edge hand-built into every page. */}
      {fromColor && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0"
          style={{
            top: 'calc(var(--nq-band) * -0.5)',
            height: 'calc(var(--nq-band) * 1.5)',
            background: `linear-gradient(to bottom, ${fromColor} 0%, ${fromColor} 33%, ${footerTone} 100%)`,
          }}
        >
          <TileField tones={connectionTones(fromColor, footerTone, PERIWINKLE)} fade={FOOTER_BAND_FADE} />
        </div>
      )}

      <div
        className={`relative nq-container pb-16 sm:pb-20 ${
          isPaper ? 'pt-[calc(var(--nq-band)+2.5rem)]' : 'pt-16 sm:pt-20'
        }`}
      >
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Brand + blurb. */}
          <div className="lg:col-span-4">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); go('home')(); }}
              className="inline-flex items-center gap-3 cursor-pointer"
            >
              {/* The mark is white artwork on transparency, which is nothing at all on sand.
                  brightness(0) takes any colour to black and leaves the alpha alone, so the same
                  single asset reads on both grounds without a second file or a chip behind it. */}
              <NovaiqLogo size={34} showText={false} className={isPaper ? "brightness-0" : ""} />
            </a>
            <p               className="mt-5 max-w-sm uw:max-w-md text-sm sm:text-base uw:text-lg text-[rgb(var(--ft-fg)/var(--ft-a55))] leading-relaxed">
              {isAr
                ? 'استوديو رقمي عراقي يصمم ويطور أنظمة وتطبيقات ذكية — من الفكرة والمواصفات حتى الإطلاق، بعقود إلكترونية وتسليم في الموعد.'
                : 'An Iraqi digital studio designing and building smart systems and applications — from idea and spec to launch, with e-contracts and on-time delivery.'}
            </p>

            {socials.length > 0 && (
              <div className="mt-7 flex items-center gap-3">
                {socials.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-10 h-10 uw:w-12 uw:h-12 grid place-items-center rounded-full text-[rgb(var(--ft-fg)/var(--ft-a70))] hover:text-[rgb(var(--ft-fg))] transition-colors bg-[rgb(var(--ft-fg)/0.05)] hover:bg-[rgb(var(--ft-fg)/0.14)] backdrop-blur-md"
                    style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--ft-fg) / 0.18)' }}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.8} />
                  </a>
                ))}
              </div>
            )}
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
              <FooterLink label={isAr ? 'العقود الإلكترونية' : 'E-contracts'} onClick={go('econtracts')} />
              <FooterLink label={isAr ? 'الدعم الفني' : 'Support'} onClick={go('support')} />
            </FooterColumn>
          </div>

          {/* Contact. */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl bg-[rgb(var(--ft-fg)/0.04)] backdrop-blur-xl p-5"
              style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--ft-fg) / 0.1)' }}
            >
              <p                 className="text-sm sm:text-base uw:text-lg font-bold tracking-[0.2em] uppercase text-[rgb(var(--ft-fg)/var(--ft-a60))]">
                {isAr ? 'ابدأ مشروعك اليوم' : 'Start a project today'}
              </p>
              <p                 className="mt-2 text-sm sm:text-base uw:text-lg text-[rgb(var(--ft-fg)/var(--ft-a50))] leading-relaxed">
                {isAr
                  ? 'أخبرنا عن فكرتك وسنرجع إليك بمواصفات أولية خلال 48 ساعة.'
                  : 'Tell us about your idea and we will come back with a first spec within 48 hours.'}
              </p>
              <button
                type="button"
                onClick={onRequestProject ?? (() => go('custom-request')())}
                className="mt-4 inline-flex items-center gap-2 px-5 py-3 uw:px-6 uw:py-3.5 rounded-full bg-[rgb(var(--ft-fg))] text-[rgb(var(--ft-bg))] text-sm sm:text-base uw:text-lg font-bold tracking-[0.12em] uppercase hover:bg-transparent hover:text-[rgb(var(--ft-fg))] hover:ring-1 hover:ring-[rgb(var(--ft-fg))] transition-colors cursor-pointer"
              >
                {isAr ? 'اطلب مشروعك' : 'Request a project'}
                <Arrow className="w-3.5 h-3.5" strokeWidth={2.6} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar. */}
        <div className="mt-14 pt-6 border-t border-[rgb(var(--ft-fg)/0.15)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p             className="text-xs sm:text-sm uw:text-base tracking-[0.14em] uppercase text-[rgb(var(--ft-fg)/var(--ft-a40))]">
            © {new Date().getFullYear()} NOVAIQ — {isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 text-xs sm:text-sm uw:text-base font-bold tracking-[0.18em] uppercase text-[rgb(var(--ft-fg)/var(--ft-a50))] hover:text-[rgb(var(--ft-fg))] transition-colors cursor-pointer"
          >
            {isAr ? 'العودة للأعلى' : 'Back to top'}
            <Arrow className="w-3.5 h-3.5 -rotate-90" strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </footer>
  );
};