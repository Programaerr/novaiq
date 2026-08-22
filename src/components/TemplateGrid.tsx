import React, { useState, lazy, Suspense } from 'react';
import { Template } from '../types';
import { useLiveTemplates } from '../lib/pricingOverrides';
import { Globe, Smartphone, Eye, ArrowLeft } from 'lucide-react';
import { Language } from '../lib/i18n';
import { Currency } from '../lib/currency';
import { PERIWINKLE } from '../lib/homePalette';
import { SECTION_FADE, SECTION_TONES, TileField } from './TileField';
import { NqButton } from './ui/NqButton';
import { PageLoader } from './PageLoader';
import type { DemoMode } from './TemplateInteractiveSandbox';

// The interactive sandbox is the single largest component in the app — a whole website and a
// whole phone app, plus the 3D building both of them use. Loading it only when a customer
// actually opens a preview keeps it out of the initial "Templates" page bundle entirely, which
// matters most on weak/low-end devices.
const TemplateInteractiveSandbox = lazy(() =>
  import('./TemplateInteractiveSandbox').then((m) => ({ default: m.TemplateInteractiveSandbox }))
);

interface TemplateGridProps {
  onSelectTemplateForContract: (template: Template, customNotes?: string) => void;
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

  // The catalogue is a single line — سَكَن — that is offered as both a website and an app.
  const template = templatesData[0];

  return (
    <section
      id="templates-section"
      style={{
        background: PERIWINKLE,
        /* Pull the whole section up behind the floating navbar, exactly as the hero and the
           timeline do — so the blue reaches the top of the viewport instead of leaving the
           body's black visible between the navbar and the section. */
        marginTop: 'calc(-1 * (var(--nav-bottom, 74px) + var(--content-gap, 0.75rem)))',
      }}
      className="relative overflow-hidden pt-[calc(var(--nav-bottom,74px)+1rem)] pb-4 sm:pb-6"
    >
      {/* ── The whole background ─────────────────────────────────────────────────────────────
          One full-bleed cube field covering the section and dissolving at both edges. */}
      <TileField tones={SECTION_TONES} fade={SECTION_FADE} />

      <div className="relative nq-container">
        {/* ── The heading ─────────────────────────────────────────────────────────────────
            Two cards, not a menu: the customer picks a delivery and we carry that choice into
            the contract. */}
        <div className="mt-6 sm:mt-8 text-center max-w-3xl mx-auto">
          <h2
            className="text-[1.7rem] sm:text-[2.4rem] uw:text-[3rem] font-black leading-none tracking-tight"
            style={{ color: '#FFFFFF' }}
          >
            {currentLang === 'ar' ? 'ماذا تريد أن تبني؟' : 'What do you want to build?'}
          </h2>
          <p
            className="mt-4 text-[0.95rem] sm:text-base uw:text-lg font-bold leading-relaxed"
            style={{ color: '#FFFFFF' }}
          >
            {currentLang === 'ar'
              ? 'بطاقتان — اختر موقعاً أو تطبيقاً، ونكمل معك العقد فوراً.'
              : 'Two cards — pick a website or an app, and we continue your contract right away.'}
          </p>
        </div>

        {/* ── The two cards ─────────────────────────────────────────────────────────────
            Tall, full-height panels so each reads as a destination rather than a row. */}
        <div className="mt-10 sm:mt-14 grid gap-6 sm:gap-8 lg:grid-cols-2 items-stretch">
          {CHOICES.map((choice, i) => {
            const Icon = choice.icon;
            const disabled = !template;
            return (
              <article
                key={choice.id}
                className="relative flex flex-col min-h-[56svh] lg:min-h-[60vh] rounded-[1.75rem] p-7 sm:p-9 bg-white overflow-hidden"
                style={{ boxShadow: '0 26px 64px -28px rgba(16, 19, 34, 0.5)' }}
              >
                {/* A faint wash of the section's blue at the top of each card, so the two read as
                    belonging to the page they sit on rather than as foreign white boxes. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-24 pointer-events-none"
                  style={{ background: `linear-gradient(to bottom, ${PERIWINKLE}22, ${PERIWINKLE}00)` }}
                />

                <div className="relative flex items-center gap-3">
                  <span
                    className="w-14 h-14 rounded-2xl grid place-items-center shrink-0"
                    style={{ background: PERIWINKLE, color: '#FFFFFF' }}
                  >
                    <Icon className="w-7 h-7" strokeWidth={2.2} />
                  </span>
                  <span
                    className="text-[0.7rem] sm:text-[0.75rem] uw:text-[0.85rem] font-extrabold tracking-[0.14em] uppercase"
                    style={{ color: '#000000' }}
                  >
                    {currentLang === 'ar' ? choice.tagAr : choice.tagEn}
                  </span>
                </div>

                <h3
                  className="relative mt-6 text-[1.6rem] sm:text-[2rem] uw:text-[2.4rem] font-black leading-tight"
                  style={{ color: '#000000' }}
                >
                  {currentLang === 'ar' ? choice.titleAr : choice.titleEn}
                </h3>

                <p
                    className="relative mt-3 text-[0.92rem] sm:text-base uw:text-lg font-bold leading-relaxed"
                    style={{ color: '#000000' }}
                >
                  {currentLang === 'ar' ? choice.descAr : choice.descEn}
                </p>

                {/* No price on the card: the customer chooses by reading the offer and opening the
                    live preview, then continues straight into the contract. */}
                <div className="relative mt-auto pt-8 flex flex-wrap items-center gap-3">
                  {/* `paper`, because that is the ground these cards sit on. The black pill and
                      its white badge are the pair this page already used; what is new is that the
                      cubes it lifts are black too, and the periwinkle on their crests is the same
                      accent the band at the foot of this page carries. */}
                  <NqButton
                    tone="paper"
                    variant="solid"
                    size="md"
                    loading={disabled}
                    onClick={() => template && onSelectTemplateForContract(template, choice.note)}
                    className="uw:text-base"
                    badge={<ArrowLeft className="w-4 h-4 rotate-180" strokeWidth={2.6} />}
                  >
                    {currentLang === 'ar' ? choice.titleAr : choice.titleEn}
                  </NqButton>

                  {onOpenStandalonePreview && template && (
                    <NqButton
                      tone="paper"
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

        {/* ── The brand mark under the cards ─────────────────────────────────────────────── */}
        <div className="mt-20 sm:mt-28">
          <div dir="ltr" className="relative z-10 flex justify-center mt-16 sm:mt-24 mb-8 sm:mb-14">
            <span className="font-black tracking-widest text-white font-['Cairo'] text-4xl sm:text-6xl lg:text-7xl">
              NOVAIQ
            </span>
          </div>
        </div>

      </div>

      {/* Interactive Live Sandbox Preview Modal */}
      {previewTemplate && (
        <Suspense fallback={<PageLoader />}>
          <TemplateInteractiveSandbox
            template={previewTemplate}
            language={language}
            currency={currency}
            onClose={() => setPreviewTemplate(null)}
            onSelectForContract={(template) => {
              setPreviewTemplate(null);
              onSelectTemplateForContract(template);
            }}
          />
        </Suspense>
      )}

    </section>
  );
};
