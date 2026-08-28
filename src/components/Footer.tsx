import React, { useRef } from 'react';
import { ArrowUpLeft, ArrowUpRight, Facebook, Instagram, MessageCircle, Music2 } from 'lucide-react';
import { Language } from '../lib/i18n';
import { COBALT, ICE, PAPER } from '../lib/homePalette';
import { NovaiqLogo } from './NovaiqLogo';
import { connectionTones, FOOTER_BAND_FADE, TileField } from './TileField';
import { NqButton } from './ui/NqButton';
import { useSocialLinks, whatsappLink } from '../lib/socialLinks';
import { useGroundAbove } from '../lib/useGroundAbove';

interface FooterProps {
  language?: Language;
  onNavigate?: (page: string) => void;
  /** Opens the contract-request flow (full-screen sign-in while signed out, then the builder). */
  onRequestProject?: () => void;
  /**
   * The page currently on screen.
   *
   * Not used to look anything up — the footer measures the colour above it rather than being told
   * (see useGroundAbove). This is only the signal that the thing above it has been swapped, since
   * the footer is mounted once and outlives navigation.
   */
  pageKey: string;
}

/**
 * The footer's ground and everything drawn on it, as the only place a colour is written here.
 *
 * `--ft-fg` is every mark and `--ft-bg` the ground under it, as space-separated channels rather
 * than hexes, because that is the form `rgb(var(--x) / a)` needs — a hex inside a custom property
 * cannot take an alpha.
 *
 * The five alphas are the footer's hierarchy: headings quiet, links a step up, icons a step down.
 * They sit high because ink on paper is not white on black: near-black at 50% on paper measures
 * 3.4:1, under the 4.5:1 a body-sized line needs. Pushed toward opaque, the same hierarchy reads
 * and every level passes.
 *
 * There used to be a second set beside this one for a black-ground footer, chosen by a `tone`
 * prop. It went with the identity it belonged to: the site has one palette now, so a second ground
 * is not a variant, it is the old design still shipping. Its `--ft-bg` was `0 0 0`.
 */
const PAPER_VARS: React.CSSProperties = {
  ['--ft-fg' as string]: '7 17 31',
  ['--ft-bg' as string]: '233 237 244',
  background: PAPER,
  ['--ft-a40' as string]: '0.72',
  ['--ft-a50' as string]: '0.8',
  ['--ft-a55' as string]: '0.86',
  ['--ft-a60' as string]: '0.9',
  ['--ft-a70' as string]: '0.94',
  // Brand accent (Cobalt) and the ink that sits on it — used for markers, the CTA and social
  // hovers so the footer reads in the site's own colour instead of flat monochrome.
  //
  // `--ft-accent-ink` is WHITE, not Midnight, and that is a genuine flip from the old identity:
  // periwinkle (`#8295CF`) was light enough for dark ink to sit on it at 6.4:1, but Cobalt
  // (`#2864FF`) is more saturated and less luminous — Midnight on it measures only 3.93:1, under
  // the 4.5:1 the social-icon hover (the one place this variable is read) needs at full opacity.
  // White on Cobalt measures 4.82:1.
  ['--ft-accent' as string]: '40 100 255',
  ['--ft-accent-ink' as string]: '255 255 255',
};

interface FooterColumnProps {
  heading: string;
  children: React.ReactNode;
}

const FooterColumn: React.FC<FooterColumnProps> = ({ heading, children }) => (
  <div>
    <h3 className="nq-label flex items-center gap-2.5 text-sm sm:text-base uw:text-lg font-bold tracking-[0.28em] uppercase text-[rgb(var(--ft-fg)/var(--ft-a50))]">
      <span className="h-1.5 w-6 rounded-full bg-[rgb(var(--ft-accent))]" aria-hidden="true" />
      {heading}
    </h3>
    {/* `space-y-1` rather than `space-y-3`, because the gap moved INSIDE the links — see
        FooterLink. The column's overall pitch is unchanged; what changed is that the space
        between two links is now part of one of them and can be pressed. */}
    <ul className="mt-4 space-y-1">{children}</ul>
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
      /* `min-h-11`: these were the height of their own text, 24px, in a stack of five — the
         hardest thing on the page to hit with a thumb and the only navigation in the footer. The
         padding is what makes the target, so the gap between them came out of the list. */
      className="inline-flex items-center min-h-11 py-1.5 gap-2 text-sm sm:text-base uw:text-lg text-[rgb(var(--ft-fg)/var(--ft-a60))] hover:text-[rgb(var(--ft-fg))] transition-colors cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ft-accent))]"
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
 * ## It joins onto whatever is above it, without being told what that is
 *
 * The belt below ramps out of the last section on the page and into this footer's ground. The
 * colour it ramps out of is MEASURED from the rendered page (useGroundAbove) rather than looked up
 * in a table of page names — so a page added tomorrow, in a colour nobody here has heard of, joins
 * on correctly with nothing written anywhere. See that hook for why the table had to go.
 *
 * Every colour in this file is `--ft-fg` (marks) or `--ft-bg` (ground) at some opacity, written
 * once in PAPER_VARS, so re-toning the whole footer is one object rather than thirty class names.
 */
export const Footer: React.FC<FooterProps> = ({
  language = 'ar',
  onNavigate,
  onRequestProject,
  pageKey,
}) => {
  const isAr = language === 'ar';
  const Arrow = isAr ? ArrowUpLeft : ArrowUpRight;
  const ref = useRef<HTMLElement>(null);
  /** The ground the page ends on, read off the page itself. The belt ramps from this into PAPER. */
  const fromColor = useGroundAbove(ref, pageKey);
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
      ref={ref}
      /* Two triplets, and everything else follows: every colour in this file is one of them at
         some opacity, so the whole footer re-tones from here rather than from thirty class names.
         Space-separated channels rather than a hex, because that is the form rgb(var(--x) / a)
         needs — a hex inside a custom property cannot take an alpha. */
      style={PAPER_VARS}
      /* No top margin and no hairline rule: the belt below does the whole job of arriving out of
         the section above, and a rule drawn across it is exactly the straight line the belt exists
         to avoid. */
      className="relative"
    >
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
          belt, owned by the footer, instead of a separate edge hand-built into every page.

          It used to start half a band ABOVE the footer, overhanging the section so the cubes read
          as standing on it. That worked while every page ended in flat colour. It stopped working
          the moment a section above grew a cube field of its own: this canvas is opaque, so the
          overhang painted over the last ~120px of that field — and it painted its own field there
          at the strength its top fade says, which is nearly nothing. The section's cubes were at
          half height on one side of the line and gone on the other, sliced clean across the page.

          Starting at the footer's own top edge removes the overlap entirely, and with it the whole
          class of bug: the section's field runs to its own bottom edge and fades to nothing there,
          this one starts from nothing at exactly that pixel, and the two meet at the one value they
          are guaranteed to agree on — zero. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0"
        style={{
          top: 0,
          height: 'var(--nq-band)',
          // Seen only for the frame before the canvas over it paints, but it has to make the same
          // journey — section colour, through ice, into paper — or that first frame flashes a
          // different band than the one that replaces it.
          background: `linear-gradient(to bottom, ${fromColor} 0%, ${ICE} 52%, ${PAPER} 100%)`,
        }}
      >
        {/* Ice is the body of the band, not either of its ends. It arrives out of whatever
            colour the page ended on and still settles into the footer's paper — ice is simply
            what the cubes in between are made of, which is the one place on a blue page the
            site's own light-neutral still shows. */}
        <TileField tones={connectionTones(fromColor, PAPER, COBALT, ICE)} fade={FOOTER_BAND_FADE} />
      </div>

      {/* Top padding clears the belt, which is absolutely positioned and so takes up no height of
          its own — without it the first link would sit inside the cubes. */}
      <div className="relative nq-container pb-16 sm:pb-20 pt-[calc(var(--nq-band)+2.5rem)]">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Brand + blurb. */}
          <div className="lg:col-span-4">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); go('home')(); }}
              className="inline-flex items-center gap-3 cursor-pointer"
            >
              {/* The mark is white artwork on transparency, which is nothing at all on paper.
                  brightness(0) takes any colour to black and leaves the alpha alone, so the one
                  asset reads here without a second file or a chip behind it. */}
              <NovaiqLogo size={34} showText={false} className="brightness-0" />
            </a>
            <p               className="mt-5 max-w-sm uw:max-w-md text-sm sm:text-base uw:text-lg text-[rgb(var(--ft-fg)/var(--ft-a55))] leading-relaxed">
              {isAr
                ? 'استوديو رقمي عراقي يصمم ويطور أنظمة وتطبيقات ذكية — من الفكرة والمواصفات حتى الإطلاق، وبالعقد الإلكتروني وتسليم في الموعد.'
                : 'An Iraqi digital studio designing and building smart systems and applications — from idea and spec to launch, with an e-contract and on-time delivery.'}
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
                    className="w-10 h-10 uw:w-12 uw:h-12 grid place-items-center rounded-full text-[rgb(var(--ft-fg)/var(--ft-a70))] hover:text-[rgb(var(--ft-accent-ink))] transition-colors bg-[rgb(var(--ft-fg)/0.05)] hover:bg-[rgb(var(--ft-accent)/0.92)] backdrop-blur-md"
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
              <FooterLink label={isAr ? 'العقد الإلكتروني' : 'E-contract'} onClick={go('econtracts')} />
              <FooterLink label={isAr ? 'الدعم الفني' : 'Support'} onClick={go('support')} />
            </FooterColumn>
          </div>

          {/* Contact. */}
          <div className="lg:col-span-4">
              <div className="rounded-2xl bg-[rgb(var(--ft-accent)/0.1)] backdrop-blur-xl p-5"
                style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--ft-accent) / 0.3)' }}
              >
                <p className="nq-label text-sm sm:text-base uw:text-lg font-bold tracking-[0.2em] uppercase text-[rgb(var(--ft-fg)/var(--ft-a60))]">
                  {isAr ? 'ابدأ مشروعك اليوم' : 'Start a project today'}
                </p>
                <p                 className="mt-2 text-sm sm:text-base uw:text-lg text-[rgb(var(--ft-fg)/var(--ft-a50))] leading-relaxed">
                  {isAr
                    ? 'أخبرنا عن فكرتك وسنرجع إليك بمواصفات أولية خلال 48 ساعة.'
                    : 'Tell us about your idea and we will come back with a first spec within 48 hours.'}
                </p>
                <NqButton
                  tone="footer"
                  variant="solid"
                  size="md"
                  onClick={onRequestProject ?? (() => go('custom-request')())}
                  className="nq-label mt-4 tracking-[0.12em] uppercase sm:text-base uw:text-lg"
                  trailing={<Arrow className="w-3.5 h-3.5" strokeWidth={2.6} />}
                >
                  {isAr ? 'اطلب مشروعك' : 'Request a project'}
                </NqButton>
              </div>
          </div>
        </div>

        {/* Bottom bar. */}
        <div className="mt-14 pt-6 border-t border-[rgb(var(--ft-accent)/0.25)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="nq-label text-xs sm:text-sm uw:text-base tracking-[0.14em] uppercase text-[rgb(var(--ft-fg)/var(--ft-a40))]">
            © {new Date().getFullYear()} NOVAIQ — {isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
          </p>
          {/* A ghost rather than a bare text button, and the reason is the 44px floor: this was
              the height of its own 12px type, which is a target you have to aim at. */}
          <NqButton
            tone="footer"
            variant="ghost"
            size="sm"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="nq-label -me-4 tracking-[0.18em] uppercase sm:text-sm uw:text-base"
            trailing={<Arrow className="w-3.5 h-3.5 -rotate-90" strokeWidth={2.6} />}
          >
            {isAr ? 'العودة للأعلى' : 'Back to top'}
          </NqButton>
        </div>
      </div>
    </footer>
  );
};