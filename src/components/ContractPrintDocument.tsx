import React from 'react';
import { ContractData } from '../types';
import { Language, translateText } from '../lib/i18n';
import { useAutoTranslate, useAutoTranslateList } from '../lib/autoTranslate';
import { formatPrice } from '../lib/currency';

interface ContractPrintDocumentProps {
  contract: ContractData;
  language: Language;
  /** Spec labels already resolved to the target language by the caller. */
  translatedSpecs: string[];
  /** Custom notes already resolved to the target language by the caller. */
  translatedNotes: string;
  /** Admin's negotiated terms, already resolved to the target language by the caller. */
  translatedAdminNotes?: string;
  templateTitle: string;
  city: string;
  country: string;
}

// A print-optimized rendering of the contract, separate from the on-screen preview.
//
// The screen version is dark-themed to match the site; capturing that for the PDF produced
// a black page that's unusable on paper and burns through ink. This renders the same data
// as a white, A4-proportioned formal document instead. It's still captured as an image
// rather than drawn with jsPDF's text API on purpose: jsPDF's built-in fonts have no Arabic
// glyphs and no bidi shaping, so an Arabic contract drawn that way comes out as blank boxes.
// Letting the browser lay out the text and photographing the result is what makes a genuine
// Arabic PDF possible at all.
export const ContractPrintDocument = React.forwardRef<HTMLDivElement, ContractPrintDocumentProps>(
  ({ contract, language, translatedSpecs, translatedNotes, translatedAdminNotes, templateTitle, city, country }, ref) => {
    const isAr = language === 'ar';

    const t = {
      docTitle: isAr ? 'وثيقة عقد تطوير برمجي' : 'SOFTWARE DEVELOPMENT AGREEMENT',
      tagline: isAr ? 'منصة القوالب البرمجية والعقود الإلكترونية' : 'Software Templates & Electronic Contracts Platform',
      ref: isAr ? 'رقم العقد' : 'Reference',
      date: isAr ? 'تاريخ الإصدار' : 'Issue Date',
      status: isAr ? 'الحالة' : 'Status',
      statusValue: isAr ? 'موثّق ومعتمد' : 'Verified & Approved',

      s1: isAr ? '1. بيانات الشركة والممثل القانوني' : '1. COMPANY & LEGAL REPRESENTATIVE',
      companyName: isAr ? 'اسم الشركة' : 'Company Name',
      crNumber: isAr ? 'رقم السجل التجاري' : 'CR / ID Number',
      repName: isAr ? 'الممثل المخوّل' : 'Authorized Representative',
      email: isAr ? 'البريد الإلكتروني' : 'Email',
      phone: isAr ? 'رقم الهاتف' : 'Phone',
      location: isAr ? 'المقر' : 'Location',

      s2: isAr ? '2. القالب المعتمد والمواصفات الفنية' : '2. APPROVED TEMPLATE & TECHNICAL SPECIFICATIONS',
      template: isAr ? 'القالب المعتمد' : 'Approved Template',
      addons: isAr ? 'الإضافات والمواصفات المختارة' : 'Selected Add-ons & Specifications',
      standard: isAr ? 'مواصفات القالب القياسية' : 'Standard template specifications',
      notes: isAr ? 'ملاحظات ومتطلبات خاصة' : 'Custom Notes & Requirements',
      agreedTerms: isAr ? 'الشروط المتفق عليها بعد المراجعة' : 'Agreed Terms After Review',
      identity: isAr ? 'الهوية البصرية' : 'Visual Identity',
      langSupport: isAr ? 'لغات النظام' : 'System Languages',

      s3: isAr ? '3. القيمة المالية ومدة التنفيذ' : '3. FINANCIAL VALUE & DELIVERY TIMELINE',
      basePrice: isAr ? 'سعر القالب الأساسي' : 'Base Template Price',
      addonsTotal: isAr ? 'إجمالي الإضافات' : 'Add-ons Total',
      total: isAr ? 'الإجمالي الكلي المعتمد' : 'TOTAL AGREED VALUE',
      timeline: isAr ? 'مدة التنفيذ' : 'Delivery Timeline',
      weeks: isAr ? 'أسابيع' : 'weeks',
      payment: isAr ? 'آلية السداد' : 'Payment Structure',

      s4: isAr ? '4. الشروط والأحكام والضمانات' : '4. TERMS, CONDITIONS & GUARANTEES',
      s5: isAr ? '5. التواقيع والاعتماد' : '5. SIGNATURES & AUTHORIZATION',
      clientSig: isAr ? 'توقيع ممثل الشركة' : 'Client Representative Signature',
      signedElectronically: isAr ? '[ تم التوقيع إلكترونياً ]' : '[ Signed Electronically ]',
      companySig: isAr ? 'توقيع واعتماد NOVAIQ' : 'NOVAIQ Sign-off',
      pendingApproval: isAr ? '[ قيد الاعتماد ]' : '[ Pending Approval ]',
      seal: isAr ? 'ختم NOVAIQ الرسمي' : 'NOVAIQ OFFICIAL SEAL',
      verified: isAr ? 'عقد إلكتروني موثّق' : 'VERIFIED E-CONTRACT',
      authCode: isAr ? 'رمز التوثيق' : 'AUTH CODE',
      footer: isAr
        ? 'NOVAIQ — تم إصدار هذه الوثيقة إلكترونياً عبر منصة NOVAIQ وهي معتمدة دون الحاجة لتوقيع ورقي.'
        : 'NOVAIQ — This document was issued electronically via the NOVAIQ platform and is valid without a wet signature.',
    };

    const paymentPlanLabel = (() => {
      switch (contract.paymentPlan) {
        case '50_50':
          return isAr ? '50% عند التعاقد و 50% عند التسليم النهائي' : '50% on signing, 50% on final delivery';
        case '100_upfront':
          return isAr ? 'دفعة كاملة مسبقة (خصم 5%)' : 'Full upfront payment (5% discount)';
        case '3_milestones':
          return isAr ? '3 دفعات حسب مراحل الإنجاز الموثقة' : '3 installments across documented milestones';
        default:
          return contract.paymentPlan;
      }
    })();

    const languageSupportLabel = (() => {
      switch (contract.languageSupport) {
        case 'ar':
          return isAr ? 'العربية فقط' : 'Arabic only';
        case 'en':
          return isAr ? 'الإنجليزية فقط' : 'English only';
        default:
          return isAr ? 'ثنائي اللغة (عربي + إنجليزي)' : 'Bilingual (Arabic + English)';
      }
    })();

    const themeLabel = (() => {
      switch (contract.themePreference) {
        case 'dark':
          return isAr ? 'داكن' : 'Dark';
        case 'light':
          return isAr ? 'فاتح' : 'Light';
        default:
          return isAr ? 'فضائي' : 'Cosmic';
      }
    })();

    const terms = isAr
      ? [
          'الملكية الفكرية: تنتقل ملكية الكود المصدري وكامل الحقوق إلى الشركة العميلة فور سداد كامل قيمة العقد.',
          `التسليم المرحلي: يُقسَّم التطوير إلى مراحل موزّعة على مدة ${contract.deliveryTimelineWeeks} أسابيع مع تقارير تقدّم دورية.`,
          'الدعم والصيانة: تُحدَّد شروط الدعم الفني والصيانة التشغيلية باتفاق الطرفين بعد التسليم.',
          'الصلاحية القانونية: هذه الوثيقة ملزمة قانونياً بموجب أنظمة التوقيع الإلكتروني والتعاملات الرقمية.',
        ]
      : [
          'Intellectual Property: Full source code and rights transfer to the client company upon complete payment of the contract value.',
          `Milestone Delivery: Development is divided into phases across the ${contract.deliveryTimelineWeeks}-week timeline, with regular progress reports.`,
          'Support & Maintenance: Post-delivery technical support and maintenance terms are set by mutual agreement between both parties.',
          'Legal Validity: This document is legally binding under electronic signature and digital transaction regulations.',
        ];

    const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
      <div style={{ marginBottom: 6 }}>
        <span style={{ color: '#64748b', fontSize: 11 }}>{label}: </span>
        <strong style={{ color: '#0f172a', fontSize: 12 }}>{value}</strong>
      </div>
    );

    const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <h2
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: '#0f172a',
          borderBottom: '2px solid #0f172a',
          paddingBottom: 5,
          marginBottom: 10,
          letterSpacing: isAr ? 0 : 0.3,
        }}
      >
        {children}
      </h2>
    );

    return (
      <div
        ref={ref}
        dir={isAr ? 'rtl' : 'ltr'}
        // Opted out of the whole-page auto-translator: this document already resolves its
        // own translations, and letting the page translator loose on it would also rewrite
        // the client's own company name and signature line, which must stay verbatim.
        data-no-translate
        style={{
          // Rendered off-screen: html2canvas needs a genuinely laid-out element, so this
          // can't use display:none. Fixed 794px is A4 width at 96dpi.
          position: 'fixed',
          top: 0,
          left: -20000,
          width: 794,
          backgroundColor: '#ffffff',
          color: '#0f172a',
          fontFamily: isAr ? "'Cairo', 'Tajawal', sans-serif" : "'Helvetica Neue', Arial, sans-serif",
          textAlign: isAr ? 'right' : 'left',
        }}
      >
        {/* Header banner */}
        <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '24px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 3 }}>NOVAIQ</div>
              <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>{t.tagline}</div>
            </div>
            <div style={{ textAlign: isAr ? 'left' : 'right', fontSize: 11, color: '#e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>
                {t.ref}: {contract.contractNumber}
              </div>
              <div style={{ marginTop: 4 }}>
                {t.date}: {new Date(contract.createdAt).toLocaleDateString(isAr ? 'ar-IQ' : 'en-GB')}
              </div>
              <div style={{ marginTop: 2 }}>
                {t.status}: {t.statusValue}
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 4, backgroundColor: '#475569' }} />

        {/* Document title */}
        <div style={{ padding: '20px 32px 0', textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: isAr ? 0 : 1 }}>
            {t.docTitle}
          </h1>
        </div>

        <div style={{ padding: '20px 32px 32px' }}>
          {/* Section 1 */}
          <div style={{ marginBottom: 22 }}>
            <SectionTitle>{t.s1}</SectionTitle>
            <div style={{ display: 'flex', gap: 32 }}>
              <div style={{ flex: 1 }}>
                <Field label={t.companyName} value={contract.companyName} />
                <Field label={t.crNumber} value={contract.crNumber || '—'} />
                <Field label={t.repName} value={contract.repName} />
              </div>
              <div style={{ flex: 1 }}>
                <Field label={t.email} value={contract.email} />
                <Field label={t.phone} value={contract.phone} />
                <Field label={t.location} value={`${city}, ${country}`} />
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: 22 }}>
            <SectionTitle>{t.s2}</SectionTitle>
            <Field label={t.template} value={templateTitle} />
            <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#64748b', fontSize: 11 }}>{t.identity}: </span>
              <strong style={{ color: '#0f172a', fontSize: 12 }}>{themeLabel}</strong>
              <span
                style={{
                  display: 'inline-block',
                  width: 13,
                  height: 13,
                  borderRadius: 4,
                  backgroundColor: contract.primaryColor || '#8b5cf6',
                  border: '1px solid #cbd5e1',
                }}
              />
              <span style={{ fontSize: 10.5, color: '#475569', fontFamily: 'monospace' }}>
                {(contract.primaryColor || '#8b5cf6').toUpperCase()}
              </span>
            </div>
            <Field label={t.langSupport} value={languageSupportLabel} />

            <div style={{ marginTop: 10 }}>
              <span style={{ color: '#64748b', fontSize: 11 }}>{t.addons}:</span>
              {translatedSpecs.length > 0 ? (
                <ul style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>
                  {translatedSpecs.map((s, i) => (
                    <li key={i} style={{ fontSize: 11.5, color: '#1e293b', marginBottom: 3 }}>
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>{t.standard}</div>
              )}
            </div>

            {translatedNotes && (
              <div style={{ marginTop: 12 }}>
                <span style={{ color: '#64748b', fontSize: 11 }}>{t.notes}:</span>
                <div
                  style={{
                    marginTop: 5,
                    padding: 10,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    fontSize: 11.5,
                    color: '#1e293b',
                    lineHeight: 1.7,
                  }}
                >
                  {translatedNotes}
                </div>
              </div>
            )}

            {translatedAdminNotes && (
              <div style={{ marginTop: 12 }}>
                <span style={{ color: '#64748b', fontSize: 11 }}>{t.agreedTerms}:</span>
                <div
                  style={{
                    marginTop: 5,
                    padding: 10,
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 6,
                    fontSize: 11.5,
                    color: '#1e293b',
                    lineHeight: 1.7,
                  }}
                >
                  {translatedAdminNotes}
                </div>
              </div>
            )}
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: 22 }}>
            <SectionTitle>{t.s3}</SectionTitle>
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', fontSize: 11.5 }}>
                <span style={{ color: '#475569' }}>{t.basePrice}</span>
                <strong>{formatPrice(contract.basePriceIQD || 0, language)}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  fontSize: 11.5,
                  backgroundColor: '#f8fafc',
                }}
              >
                <span style={{ color: '#475569' }}>{t.addonsTotal}</span>
                <strong>{formatPrice(contract.selectedSpecsPriceIQD || 0, language)}</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700 }}>{t.total}</span>
                <strong style={{ fontSize: 17, fontWeight: 900 }}>
                  {formatPrice(contract.totalPriceIQD || 0, language)}
                </strong>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label={t.timeline} value={`${contract.deliveryTimelineWeeks} ${t.weeks}`} />
              <Field label={t.payment} value={paymentPlanLabel} />
            </div>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: 22 }}>
            <SectionTitle>{t.s4}</SectionTitle>
            <ol style={{ margin: 0, paddingInlineStart: 18 }}>
              {terms.map((term, i) => (
                <li key={i} style={{ fontSize: 11, color: '#334155', marginBottom: 6, lineHeight: 1.7 }}>
                  {term}
                </li>
              ))}
            </ol>
          </div>

          {/* Section 5 */}
          <div>
            <SectionTitle>{t.s5}</SectionTitle>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{t.clientSig}</div>
                {contract.signatureDataUrl ? (
                  <img
                    src={contract.signatureDataUrl}
                    alt=""
                    style={{
                      height: 56,
                      maxWidth: 200,
                      objectFit: 'contain',
                      // The pad draws in near-white on a dark canvas; inverting makes the
                      // same stroke legible as dark ink on this white document.
                      filter: 'invert(1)',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', height: 56 }}>
                    {t.signedElectronically}
                  </div>
                )}
                <div
                  style={{
                    borderTop: '1px solid #94a3b8',
                    marginTop: 4,
                    paddingTop: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#0f172a',
                    maxWidth: 220,
                  }}
                >
                  {contract.repName}
                </div>
              </div>

              <div
                style={{
                  border: '2px solid #0f172a',
                  borderRadius: 8,
                  padding: '12px 16px',
                  textAlign: 'center',
                  width: 210,
                }}
              >
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{t.companySig}</div>
                {contract.companySignatureDataUrl ? (
                  <img
                    src={contract.companySignatureDataUrl}
                    alt=""
                    style={{ height: 44, maxWidth: 160, objectFit: 'contain', filter: 'invert(1)', display: 'block', margin: '0 auto' }}
                  />
                ) : (
                  <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {t.pendingApproval}
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', marginTop: 6, borderTop: '1px solid #cbd5e1', paddingTop: 6 }}>
                  {t.seal}
                </div>
                <div style={{ fontSize: 9, color: '#475569', marginTop: 4, letterSpacing: 0.5 }}>{t.verified}</div>
                <div style={{ fontSize: 9, color: '#475569', marginTop: 6, fontFamily: 'monospace' }}>
                  {t.authCode}: NVQ-{contract.contractNumber.slice(-6)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: '#0f172a',
            color: '#94a3b8',
            fontSize: 9.5,
            padding: '10px 32px',
            textAlign: 'center',
          }}
        >
          {t.footer}
        </div>
      </div>
    );
  }
);

ContractPrintDocument.displayName = 'ContractPrintDocument';

/**
 * Self-contained variant that resolves its own translations. Use this where the caller
 * doesn't already need the translated strings for its own UI (e.g. the saved-orders list,
 * which only ever needs them to produce the PDF).
 */
export const ConnectedContractPrintDocument = React.forwardRef<
  HTMLDivElement,
  { contract: ContractData; language: Language }
>(({ contract, language }, ref) => {
  const translatedSpecs = useAutoTranslateList(contract.selectedSpecs || [], language);
  const translatedNotes = useAutoTranslate(contract.customFeaturesText, language);
  const translatedAdminNotes = useAutoTranslate(contract.adminNotes, language);

  return (
    <ContractPrintDocument
      ref={ref}
      contract={contract}
      language={language}
      translatedSpecs={translatedSpecs}
      translatedNotes={translatedNotes}
      translatedAdminNotes={translatedAdminNotes}
      templateTitle={translateText(contract.templateTitle, language)}
      city={translateText(contract.city, language)}
      country={translateText(contract.country, language)}
    />
  );
});

ConnectedContractPrintDocument.displayName = 'ConnectedContractPrintDocument';
