import React, { useState, lazy, Suspense } from 'react';
import { Template } from '../types';
import { useLiveTemplates, resolveVariant } from '../lib/pricingOverrides';
import { Globe, Smartphone, Eye, ArrowLeft } from 'lucide-react';
import { Language } from '../lib/i18n';
import { Currency, formatPrice } from '../lib/currency';
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
                   otherwise be pure waste.

                   8px, where this was 18. The paragraph above still describes the reasoning
                   that put it at 18 — far enough that no cube edge survives — and the owner has
                   asked for the opposite twice, on this card and on the hero before it: a
                   surface you can see the field THROUGH. Erasing the grid is also what made
                   the card read opaque regardless of its alpha, since blurring a regular
                   repeating pattern averages it away and whatever light still came through
                   arrived as a flat lift. Proven on the hero, where 22px and 12px were
                   indistinguishable from each other.

                   What keeps the type readable at 8px is no longer the blur, it is the
                   surface: `.nq-card-glass` composites to `#3C4449` over the brightest cube
                   behind it, where the weakest ink on this card — its 0.62 label — measures
                   4.71:1. */
                className="nq-card-glass relative flex flex-col min-h-[56svh] lg:min-h-[60vh] rounded-[1.75rem] p-7 sm:p-9 overflow-hidden backdrop-blur-[8px] backdrop-saturate-[140%] border border-white/45"
              >
                {/* The white sheen that used to run across the top of each card is gone, on the
                    owner's call. It was a lit top edge for a card that was nearly opaque; on
                    glass this open it stopped reading as a highlight and started reading as fog
                    laid over the headline. The hairline border is what tells the pane from a
                    hole now, which is the job that edge was doing anyway. */}
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
                  {/* `nq-label`, which is what stops the tracking below from cutting the
                      Arabic apart. The rule and the reasoning are in index.css; the short
                      version is that Arabic is a connected script and 0.14em lands on the
                      joining stroke, so the tag rendered as detached letters. English keeps
                      the tracking and the uppercase; only RTL drops them.

                      0.82rem on a phone where this was 0.7rem (11.2px). Arabic keeps what
                      distinguishes one letter from another -- the dots, the teeth -- at a
                      far finer scale than Latin does, so a size that is merely small in
                      Latin stops being readable here. */}
                  <span
                    className="nq-label text-[0.82rem] sm:text-[0.85rem] uw:text-[0.9rem] font-extrabold tracking-[0.14em] uppercase"
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
                    /* 1rem on a phone, where this was 0.92rem, and `leading-[1.9]` for the
                       same reason as the line above: this is the longest Arabic sentence on
                       the card and it wraps to three lines at 390px. */
                    className="relative mt-3 text-[1rem] sm:text-base uw:text-lg font-bold leading-[1.9]"
                    style={{ color: WHITE, opacity: 0.9 }}
                >
                  {variant.description}
                </p>

                {/* السعر، لكل اختيار سعره.
                    كان مخفياً عمداً (الاختيار بالقراءة والمعاينة ثم العقد)، وأصبح ظاهراً بقرار
                    المالك: الزائر يجب أن يعرف كل شيء قبل أن يضغط، لا بعده.

                    والرقم هو سعر هذا الاختيار تحديداً — سعر الموقع على بطاقة الموقع، وسعر
                    التطبيق على بطاقة التطبيق — من `variant` نفسه الذي يُمرَّر إلى العقد
                    (`pricedTemplate` أعلاه). أي أن ما يقرؤه هنا هو ما سيجده هناك حرفياً، ولا
                    يمكن للرقمين أن يفترقا لأنهما مصدر واحد يُضبط من تبويب الأسعار في لوحة
                    التحكم.

                    والعبارة تحته ليست تحفّظاً قانونياً بل هي الرسالة نفسها: هذا نموذج واحد
                    مبنيّ بالكامل لا سقف لما نبنيه، والرقم استرشادي لفكرته كما هي. */}
                <div
                  className="relative mt-7 pt-5 border-t"
                  style={{ borderColor: 'rgba(247, 247, 245, 0.16)' }}
                >
                  {/* The same `nq-label` fix, and the same size floor. This line was the
                      worst case on the page and it was three faults at once: 10.9px, the
                      smallest type anywhere here; 1.52px of spacing splitting every join;
                      and 0.62 opacity on top of both. 0.82rem and 0.78 now.

                      Raising the opacity cannot cost contrast, only add it -- 0.62 was the
                      weakest ink on the card at 4.71:1 over the brightest cube behind the
                      glass, and it is the reason the card cannot open past 0.78 alpha.

                      0.92rem and 0.88 now, a second pass, because 0.82rem/0.78 was reported
                      as still unclear and the tracking fix was only half the problem. The
                      other half is that the whole TREATMENT is wrong for this string in
                      Arabic. The tracked uppercase micro-label works on a Latin one-worder
                      -- BROWSE, LEGAL -- because the reader takes it as a sign rather than
                      as text. This is a full eight-word sentence with an em dash in it, and
                      once `.nq-label` has correctly stripped the tracking and the uppercase
                      there is nothing left of the label except the two things that were only
                      ever its costs: the smallest type on the card, and one of the dimmest.

                      The class stays. The ENGLISH string is still genuinely set as a tracked
                      uppercase label and should keep being one; it is only RTL that drops it.

                      6.39:1 at 0.78, 7.61:1 at 0.88, both on `#3C4449` -- the surface this
                      glass composites to against the brightest cube behind it. Up, so the
                      card’s alpha floor loosens rather than tightens. */}
                  <span
                    className="nq-label block text-[0.92rem] sm:text-[0.95rem] font-extrabold tracking-[0.14em] uppercase"
                    style={{ color: WHITE, opacity: 0.88 }}
                  >
                    {currentLang === 'ar'
                      ? `السعر المقترح لهذه الفكرة — ${choice.tagAr}`
                      : `Suggested price for this idea — ${choice.tagEn}`}
                  </span>

                  <strong
                    className="block mt-1.5 text-[1.6rem] sm:text-[1.95rem] uw:text-[2.2rem] font-black leading-none tabular-nums"
                    style={{ color: ORANGE_ON_DARK }}
                  >
                    {formatPrice(variant.priceIQD, currentLang, currency)}
                  </strong>

                  {/* 0.9rem and 0.82, up from 0.82rem and 0.72. No tracking on this one, so
                      it was legible rather than broken -- but it is a full Arabic sentence
                      set at 13.1px and dimmed, which is the size where the script stops
                      being comfortable rather than the size where it fails. `leading-[1.85]`
                      instead of `leading-relaxed` (1.625) because Arabic ascenders and the
                      dots below the baseline need more room between lines than Latin. */}
                  <p
                    className="mt-3 text-[0.9rem] sm:text-[0.92rem] font-bold leading-[1.85]"
                    style={{ color: WHITE, opacity: 0.82 }}
                  >
                    {currentLang === 'ar'
                      ? 'رقم نموذجي للقالب والسعر قابل للتحديد من خلال العقد بين الطرفين'
                      : 'An indicative figure for the template; the price is settled in the contract between the two parties.'}
                  </p>
                </div>
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
