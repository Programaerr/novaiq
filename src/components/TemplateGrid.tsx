import React, { useState, lazy, Suspense } from 'react';
import { Template } from '../types';
import { useLiveTemplates, resolveVariant } from '../lib/pricingOverrides';
import { Globe, Smartphone, Eye, ArrowLeft } from 'lucide-react';
import { Language } from '../lib/i18n';
import { Currency } from '../lib/currency';
import { OBSIDIAN, ORANGE_ON_DARK, WHITE } from '../lib/homePalette';
import { NqButton } from './ui/NqButton';
import { trackLoad } from '../lib/loadTracker';
import type { DemoMode } from './TemplateInteractiveSandbox';

// The interactive sandbox is the single largest component in the app — a whole website and a
// whole phone app, plus the 3D building both of them use. Loading it only when a customer
// actually opens a preview keeps it out of the initial "Templates" page bundle entirely, which
// matters most on weak/low-end devices.
//
// `trackLoad` so this reports into the app's one loading counter like every other lazy chunk.
// It used to be untracked AND to mount its own <PageLoader/> as the Suspense fallback, which
// broke the rule loadTracker exists to enforce: one counter, one loader. The visible cost was
// that opening a preview blanked the entire templates page — PageLoader is `fixed inset-0` and
// opaque — so a modal opening over a grid instead wiped the grid, flashed a full-screen spinner,
// and then drew the modal. Tracked, the same download is reported by the single SmartPageLoader
// in App, and a cached chunk (every open after the first) shows nothing at all.
const TemplateInteractiveSandbox = lazy(() =>
  trackLoad(import('./TemplateInteractiveSandbox').then((m) => ({ default: m.TemplateInteractiveSandbox })))
);

interface TemplateGridProps {
  onSelectTemplateForContract: (
    template: Template,
    customNotes?: string,
    primaryColorHex?: string,
    projectType?: 'website' | 'app'
  ) => void;
  onOpenStandalonePreview?: (template: Template, mode?: DemoMode) => void;
  language?: Language;
  currency?: Currency;
  focusTemplateId?: string | null;
}

/* The two choices the customer picks between. One template (سَكَن) ships as both a website and an
   app, so both cards carry the same catalogue entry — what differs is the delivery the customer
   is buying, which is handed to the contract builder as `customNotes` so the written spec opens
   on the right foot. */
type Choice = {
  id: 'website' | 'app';
  icon: typeof Globe;
  titleAr: string;
  titleEn: string;
  tagAr: string;
  tagEn: string;
  descAr: string;
  descEn: string;
  note: string;
};

const CHOICES: Choice[] = [
  {
    id: 'website',
    icon: Globe,
    titleAr: 'اطلب موقع الكتروني',
    titleEn: 'Order a Website',
    tagAr: 'موقع متكامل',
    tagEn: 'Full website',
    descAr:
      'موقع احترافي يعمل على كل المتصفحات — صفحات تعريفية، حجوزات فورية، ولوحة تحكم تدير طلباتك من مكان واحد.',
    descEn:
      'A professional site that runs in every browser — intro pages, instant bookings, and a control panel that runs your requests from one place.',
    note: 'موقع الكتروني',
  },
  {
    id: 'app',
    icon: Smartphone,
    titleAr: 'اطلب تطبيق هاتف',
    titleEn: 'Order a Mobile App',
    tagAr: 'تطبيق جوال',
    tagEn: 'Mobile app',
    descAr:
      'تطبيق جوال متكامل لنظامي iOS وأندرويد — نفس الخدمات في جيب عميلك، مع إشعارات وحجز من الهاتف مباشرة.',
    descEn:
      'A full mobile app for iOS and Android — the same services in your customer’s pocket, with push alerts and in-app booking.',
    note: 'تطبيق هاتف',
  },
];

export const TemplateGrid: React.FC<TemplateGridProps> = ({
  onSelectTemplateForContract,
  onOpenStandalonePreview,
  language = 'ar',
  currency = 'IQD',
}) => {
  const currentLang: Language = language === 'en' ? 'en' : 'ar';
  // Static catalogue merged with any live admin price overrides.
  const templatesData = useLiveTemplates();
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  // The catalogue is a single line — سَكَن — offered as both a website and an app, each
  // priced and described separately from the admin Pricing tab (see resolveVariant below).
  const template = templatesData[0];

  return (
    <section
      id="templates-section"
      style={{
        background: WHITE,
        /* Pull the whole section up behind the floating navbar, exactly as the hero and the
           timeline do — so the ground reaches the top of the viewport instead of leaving a seam
           of body colour visible between the navbar and the section. WARM WHITE, the client's
           third pass — the flat sections went Obsidian, then Orange, and are white now, with the
           dark neutral confined to this section's own two cards instead (see below). */
        marginTop: 'calc(-1 * (var(--nav-bottom, 74px) + var(--content-gap, 0.75rem)))',
      }}
      className="relative overflow-hidden pt-[calc(var(--nav-bottom,74px)+1rem)] pb-4 sm:pb-6"
    >
      <div className="relative nq-container">
        {/* ── The two cards ─────────────────────────────────────────────────────────────
            Tall, full-height panels so each reads as a destination rather than a row. No heading
            above them any more — the client asked for this section's intro copy ("ماذا تريد أن
            تبني؟" / "بطاقتان — اختر...") removed outright, so the cards are now the section's
            first visual content and carry their own top margin down accordingly. */}
        <div className="mt-4 sm:mt-6 grid gap-6 sm:gap-8 lg:grid-cols-2 items-stretch">
          {CHOICES.map((choice) => {
            const Icon = choice.icon;
            const variant = resolveVariant(
              template,
              choice.id,
              currentLang === 'ar' ? choice.descAr : choice.descEn
            );
            // النسخة الفعلية المُمرَّرة للعقد: نفس القالب لكن بسعر هذا الاختيار تحديداً
            // (موقع/تطبيق) بدل السعر العام الموحّد — هذا هو التسعير المنفصل الذي طلبه الأدمن
            // من لوحة التحكم (قسم الأسعار).
            const pricedTemplate: Template = {
              ...template,
              basePriceIQD: variant.priceIQD,
              basePriceUSD: variant.priceUSD,
            };
            return (
              <article
                key={choice.id}
                /* Frosted glass, not white.
                
                   The blur is the load-bearing part, not the transparency. What is behind these
                   cards is a cube field — high-contrast geometry with its own edges and shading —
                   so a merely translucent card would show sharp cubes straight through the
                   headline. The blur is what turns that into a wash the type can sit on. A card
                   this size over a busy ground either frosts properly or stays opaque; the
                   in-between is the one option that fails.

                   The surface itself lives in `.nq-card-glass` (index.css), because the version
                   for browsers without `backdrop-filter` has to be opaque and an inline style
                   cannot carry an `@supports`. Measured, not chosen: the frosted card reads
                   `#202224` (90% Obsidian over the section's own white ground) and WHITE text on
                   it is 15.96:1 — this is where the brief's "black confined to secondary text"
                   rule puts the dark neutral, now that the flat section itself is white.

                   A hairline border and no box-shadow of any kind. Glass needs a lit edge to
                   read as a pane rather than as a hole, and a 1px inside-white line does that
                   without putting any ink back under the card.

                   `backdrop-filter` re-samples what is beneath it, and beneath it is a WebGL
                   field that animates — so this costs a blur pass per frame per card while the
                   field is running. Measured at 120fps on the reference machine with both cards
                   on screen, and the field already parks itself at `frameloop: 'never'` when it
                   scrolls out and on `data-idle`, which is when two full-card blurs would
                   otherwise be pure waste. 18px, not the navbar's 32: the radius is what the
                   pass costs, and 18 is already past the point where a cube edge survives it. */
                className="nq-card-glass relative flex flex-col min-h-[56svh] lg:min-h-[60vh] rounded-[1.75rem] p-7 sm:p-9 overflow-hidden backdrop-blur-[18px] backdrop-saturate-[140%] border border-white/45"
              >
                {/* A faint highlight at the top of each dark card — the lit top edge a real glass
                    pane catches, not a wash of the section's own ground any more: the ground is
                    WHITE now and the card is dark, so what used to blend the card into an Orange
                    section instead reads as a sheen on a dark one. Low opacity fading to nothing,
                    so it does not compete with the one full-strength Orange element on the card
                    (the icon tile below). */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-24 pointer-events-none"
                  style={{ background: `linear-gradient(to bottom, ${WHITE}2e, ${WHITE}00)` }}
                />

                <div className="relative flex items-center gap-3">
                  {/* The light twin, not the accent itself. Everywhere else on the site this tile
                      is the plain accent, but this one stands on the card's `#202224`, and
                      `#273036` against that is 1.3:1 — the tile would not exist. ORANGE_ON_DARK
                      measures 12.39:1 there and takes an Obsidian glyph at the same ratio.
                      Still the one accent fill on the card, and still exactly the "worth being a
                      point of attraction" element the brief describes for an icon that matters. */}
                  <span
                    className="w-14 h-14 rounded-2xl grid place-items-center shrink-0"
                    style={{ background: ORANGE_ON_DARK, color: OBSIDIAN }}
                  >
                    <Icon className="w-7 h-7" strokeWidth={2.2} />
                  </span>
                  <span
                    className="text-[0.7rem] sm:text-[0.75rem] uw:text-[0.85rem] font-extrabold tracking-[0.14em] uppercase"
                    style={{ color: WHITE }}
                  >
                    {currentLang === 'ar' ? choice.tagAr : choice.tagEn}
                  </span>
                </div>

                {/* WHITE, not Obsidian — the card itself IS the confined dark panel now, so its
                    primary copy is the "primary text" the brief asks to read white. Was a literal
                    `#000000` before this pass, which the brand's own rule already treats as a
                    mistake: the darkest tone in this system is Obsidian, never a flat black. */}
                <h3
                  className="relative mt-6 text-[1.6rem] sm:text-[2rem] uw:text-[2.4rem] font-black leading-tight"
                  style={{ color: WHITE }}
                >
                  {currentLang === 'ar' ? choice.titleAr : choice.titleEn}
                </h3>

                <p
                    className="relative mt-3 text-[0.92rem] sm:text-base uw:text-lg font-bold leading-relaxed"
                    style={{ color: WHITE, opacity: 0.85 }}
                >
                  {variant.description}
                </p>

                {/* No price on the card: the customer chooses by reading the offer and opening the
                    live preview, then continues straight into the contract. Each choice's own
                    price (set separately per template in the admin Pricing tab) still flows into
                    the contract the moment they pick it — see `pricedTemplate` above. */}
                <div className="relative mt-auto pt-8 flex flex-wrap items-center gap-3">
                  {/* `obsidian`, not `paper` — the card these buttons sit on IS a dark ground now
                      (the section's own flat fill moved to white; the card is the confined dark
                      panel), so the pair needed is a LIGHT pill that pops against it, which is
                      exactly what `obsidian`'s solid gives: WHITE fill, OBSIDIAN text. `paper`'s
                      own dark-on-dark pill was built for the card's previous light-glass era and
                      would all but vanish here. */}
                  <NqButton
                    tone="obsidian"
                    variant="solid"
                    size="md"
                    onClick={() => onSelectTemplateForContract(pricedTemplate, choice.note, undefined, choice.id)}
                    className="uw:text-base"
                    badge={<ArrowLeft className="w-4 h-4 rotate-180" strokeWidth={2.6} />}
                  >
                    {currentLang === 'ar' ? choice.titleAr : choice.titleEn}
                  </NqButton>

                  {onOpenStandalonePreview && (
                    <NqButton
                      tone="obsidian"
                      variant="quiet"
                      size="md"
                      onClick={() => onOpenStandalonePreview(template, choice.id === 'app' ? 'app' : 'site')}
                      className="uw:text-base"
                      icon={<Eye className="w-4 h-4" strokeWidth={2.2} />}
                    >
                      {currentLang === 'ar' ? 'معاينة حية' : 'Live preview'}
                    </NqButton>
                  )}
                </div>
              </article>
            );
          })}
        </div>

      </div>

      {/* Interactive Live Sandbox Preview Modal.
          The Suspense fallback is `null`, like every other boundary in the app: the grid behind
          stays on screen while the chunk arrives instead of being replaced by a spinner. */}
      {previewTemplate && (
        <Suspense fallback={null}>
          <TemplateInteractiveSandbox
            template={previewTemplate}
            language={language}
            currency={currency}
            onClose={() => setPreviewTemplate(null)}
            onSelectForContract={(template, customNotes, primaryColorHex, projectType) => {
              setPreviewTemplate(null);
              onSelectTemplateForContract(template, customNotes, primaryColorHex, projectType);
            }}
          />
        </Suspense>
      )}

    </section>
  );
};
