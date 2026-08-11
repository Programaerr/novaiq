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

    // The clauses printed as section 4. Deliberately covering both directions: the ones that
    // protect the client (ownership, warranty, handover, confidentiality) and the ones that
    // protect NOVAIQ (fixed scope, capped revisions, client-caused delays, third-party costs,
    // liability ceiling) sit in the same numbered list, because a contract that only defends
    // one side is the one that gets argued about later.
    //
    // Kept as prose in one array rather than a structured type: they are printed verbatim as
    // an ordered list and nothing else reads them, so a shape with ids and titles would add
    // indirection without adding a single capability. `deliveryTimelineWeeks` is the only
    // value interpolated — every other clause is deliberately constant across contracts so
    // that two NOVAIQ contracts can never disagree about what was promised.
    const terms = isAr
      ? [
          'نطاق العمل: يقتصر التنفيذ على القالب والمواصفات والإضافات المذكورة في البند (2) من هذه الوثيقة. أي طلب خارج هذا النطاق يُعد تغييراً في النطاق ويُسعَّر ويُوثَّق في ملحق مستقل موقَّع من الطرفين قبل تنفيذه.',
          'التعديلات والمراجعات: يشمل العقد جولتَي تعديل على التصميم والواجهات دون رسوم إضافية قبل الاعتماد النهائي. ما يزيد عن ذلك، أو أي تعديل يُطلب بعد الاعتماد، يُقدَّر ويُتفق على أجره مسبقاً.',
          `التسليم المرحلي: يُقسَّم التطوير إلى مراحل موزّعة على مدة ${contract.deliveryTimelineWeeks} أسابيع تبدأ من تاريخ سداد الدفعة الأولى واستلام كامل مواد العميل، مع تقارير تقدّم دورية عند إنجاز كل مرحلة.`,
          'التزامات العميل: يلتزم العميل بتزويد الشركة بالمحتوى المطلوب (نصوص، صور، شعارات، بيانات، صلاحيات الوصول) وبإبداء موافقته على كل مرحلة خلال سبعة (7) أيام عمل من طلبها. ويُوقف احتساب مدة التنفيذ عن أي فترة تأخير ناشئة عن الطرف العميل دون أن يُعد ذلك إخلالاً من الشركة.',
          'الملكية الفكرية: تنتقل ملكية الكود المصدري الخاص بالمشروع وكامل حقوق استخدامه إلى الشركة العميلة فور سداد كامل قيمة العقد. ولا يشمل هذا الانتقال أدوات NOVAIQ ومكتباتها العامة وأطر العمل مفتوحة المصدر أو المرخَّصة من أطراف ثالثة، والتي تبقى خاضعة لتراخيصها الأصلية.',
          'التسليم النهائي: يشمل التسليم الكود المصدري ونسخة تشغيلية عاملة وبيانات الدخول الإدارية والتوثيق التشغيلي الأساسي، وذلك بعد سداد كامل قيمة العقد.',
          'ضمان الأخطاء البرمجية: تلتزم الشركة بمعالجة أي خلل برمجي يظهر ضمن نطاق العمل المتفق عليه مجاناً لمدة ثلاثين (30) يوماً من تاريخ التسليم النهائي. ولا يشمل الضمان الميزات الجديدة، ولا الأعطال الناتجة عن تعديل الكود من طرف آخر، أو عن خدمات استضافة أو أنظمة خارجة عن سيطرة الشركة.',
          'الدعم والصيانة: خدمات الدعم الفني والصيانة التشغيلية بعد انتهاء مدة الضمان غير مشمولة بقيمة هذا العقد، وتُنظَّم باتفاق مستقل بين الطرفين.',
          'السداد والتأخر: تُستحق الدفعات وفق الآلية المحددة في البند (3). ويحق للشركة تعليق العمل مؤقتاً إذا تأخر سداد أي دفعة مستحقة أكثر من أربعة عشر (14) يوماً، مع استئنافه فور السداد ودون أن يُعد التعليق إخلالاً بالعقد.',
          'تكاليف الأطراف الثالثة: رسوم الاستضافة واسم النطاق وشهادات الأمان وتراخيص الخدمات الخارجية وبوابات الدفع ورسوم متاجر التطبيقات غير مشمولة بقيمة العقد ما لم يُنص على خلاف ذلك صراحةً، وتكون على حساب العميل.',
          'السرية: يلتزم الطرفان بالحفاظ على سرية كل ما يطّلعان عليه من معلومات ووثائق وبيانات بحكم هذا العقد، وبعدم إفشائها لأي طرف ثالث دون موافقة كتابية، ويستمر هذا الالتزام سارياً بعد انتهاء العقد أو إنهائه.',
          'مسؤولية المحتوى: يقر العميل بأنه يملك أو مخوَّل قانوناً باستخدام كل ما يزوّد به الشركة من محتوى وعلامات تجارية وبيانات، ويتحمل وحده المسؤولية القانونية الناشئة عن أي مخالفة في ذلك.',
          'حق العرض: يحق لـ NOVAIQ عرض المشروع ضمن معرض أعمالها لأغراض التعريف بخدماتها، دون كشف أي بيانات سرية أو بيانات عملاء، ما لم يعترض العميل على ذلك كتابةً.',
          'حدود المسؤولية: لا تتجاوز مسؤولية الشركة التعاقدية في جميع الأحوال قيمة العقد المسدَّدة فعلياً، ولا تمتد إلى الأضرار غير المباشرة أو الأرباح الفائتة أو فقدان البيانات الناتج عن أسباب خارجة عن نطاق العمل المتفق عليه.',
          'القوة القاهرة: يُعلَّق التزام أي من الطرفين عند وقوع ظرف قاهر خارج عن إرادته يحول دون التنفيذ، على أن يُخطر الطرف الآخر خلال مدة معقولة، وتُمدَّد المدد التعاقدية بما يعادل فترة التعليق.',
          'الإنهاء: يجوز إنهاء هذا العقد باتفاق الطرفين كتابةً، أو من أي طرف عند إخلال جوهري لم يُعالَج خلال أربعة عشر (14) يوماً من الإخطار. وفي جميع حالات الإنهاء تُسدَّد قيمة ما أُنجز فعلياً حتى تاريخه، وتُسلَّم مخرجات المراحل المسدَّدة.',
          'القانون الحاكم وتسوية النزاعات: يخضع هذا العقد للقوانين النافذة في جمهورية العراق. ويسعى الطرفان لتسوية أي نزاع ودياً خلال ثلاثين (30) يوماً، وإلا فيكون الاختصاص للمحاكم المختصة في جمهورية العراق.',
          'الصلاحية القانونية: هذه الوثيقة ملزمة للطرفين بموجب أنظمة التوقيع الإلكتروني والتعاملات الرقمية، وتمثل كامل ما اتفقا عليه، ولا يعتد بأي تفاهم سابق يخالفها إلا بملحق مكتوب موقَّع منهما.',
        ]
      : [
          'Scope of Work: Delivery is limited to the template, specifications and add-ons listed in Section (2) of this document. Any request beyond that scope constitutes a change of scope and must be priced and documented in a separate annex signed by both parties before it is carried out.',
          'Revisions: The contract includes two rounds of design and interface revisions at no additional charge prior to final approval. Anything beyond that, or any change requested after approval, is estimated and its fee agreed in advance.',
          `Milestone Delivery: Development is divided into phases across a ${contract.deliveryTimelineWeeks}-week timeline beginning on the date the first payment is settled and all client materials are received, with progress reports at the completion of each phase.`,
          'Client Obligations: The client shall provide the required content (text, images, logos, data, access credentials) and give approval at each phase within seven (7) business days of request. The delivery timeline is suspended for any period of delay caused by the client, and such suspension is not a breach by the company.',
          "Intellectual Property: Ownership of the project's source code and full rights of use transfer to the client company upon complete payment of the contract value. This transfer excludes NOVAIQ's own tooling and general libraries, and open-source or third-party licensed frameworks, which remain subject to their original licences.",
          'Final Handover: Delivery comprises the source code, a working deployable build, administrative access credentials and essential operational documentation, provided after the full contract value has been settled.',
          'Defect Warranty: The company shall remedy, free of charge, any software defect arising within the agreed scope of work for thirty (30) days from the date of final delivery. The warranty does not cover new features, faults caused by code modified by another party, or failures of hosting services or systems outside the company\'s control.',
          'Support & Maintenance: Technical support and operational maintenance after the warranty period are not included in the value of this contract and are governed by a separate agreement between the parties.',
          'Payment & Late Settlement: Payments fall due per the structure set out in Section (3). The company may temporarily suspend work if any due payment is more than fourteen (14) days late, resuming immediately upon settlement; such suspension is not a breach of contract.',
          'Third-Party Costs: Hosting fees, domain names, security certificates, external service licences, payment gateways and app-store fees are not included in the contract value unless expressly stated otherwise, and are borne by the client.',
          'Confidentiality: Each party shall keep confidential all information, documents and data obtained by virtue of this contract and shall not disclose it to any third party without written consent. This obligation survives the expiry or termination of the contract.',
          'Content Responsibility: The client warrants that it owns, or is legally authorised to use, all content, trademarks and data it supplies to the company, and bears sole legal responsibility for any infringement arising from it.',
          "Portfolio Rights: NOVAIQ may present the project within its portfolio for the purpose of describing its services, without disclosing any confidential or customer data, unless the client objects in writing.",
          "Limitation of Liability: The company's contractual liability shall in no case exceed the contract value actually paid, and does not extend to indirect damages, lost profits, or data loss arising from causes outside the agreed scope of work.",
          "Force Majeure: Either party's obligations are suspended upon a force majeure event beyond its control that prevents performance, provided the other party is notified within a reasonable period; contractual periods are extended by the duration of the suspension.",
          'Termination: This contract may be terminated by written agreement of both parties, or by either party upon a material breach not remedied within fourteen (14) days of notice. In all cases of termination, the value of work actually completed to that date is payable, and the deliverables of paid phases are handed over.',
          'Governing Law & Disputes: This contract is governed by the laws in force in the Republic of Iraq. The parties shall seek to settle any dispute amicably within thirty (30) days, failing which jurisdiction lies with the competent courts of the Republic of Iraq.',
          'Legal Validity: This document is binding on both parties under electronic signature and digital transaction regulations, represents the entirety of what they have agreed, and no prior understanding to the contrary shall be relied upon except by a written annex signed by both.',
        ];

    const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
      <div style={{ marginBottom: 4 }}>
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
          paddingBottom: 4,
          marginBottom: 7,
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
        <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '16px 28px' }}>
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
        <div style={{ padding: '12px 28px 0', textAlign: 'center' }}>
          <h1 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', letterSpacing: isAr ? 0 : 1 }}>
            {t.docTitle}
          </h1>
        </div>

        <div style={{ padding: '12px 28px 18px' }}>
          {/* Section 1 */}
          <div style={{ marginBottom: 14 }}>
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
          <div style={{ marginBottom: 14 }}>
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

            <div style={{ marginTop: 7 }}>
              <span style={{ color: '#64748b', fontSize: 11 }}>{t.addons}:</span>
              {translatedSpecs.length > 0 ? (
                <ul style={{ margin: '4px 0 0', paddingInlineStart: 18 }}>
                  {translatedSpecs.map((s, i) => (
                    <li key={i} style={{ fontSize: 11.5, color: '#1e293b', marginBottom: 2 }}>
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: 11.5, color: '#475569', marginTop: 3 }}>{t.standard}</div>
              )}
            </div>

            {translatedNotes && (
              <div style={{ marginTop: 8 }}>
                <span style={{ color: '#64748b', fontSize: 11 }}>{t.notes}:</span>
                <div
                  style={{
                    marginTop: 4,
                    padding: 8,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    fontSize: 11.5,
                    color: '#1e293b',
                    lineHeight: 1.5,
                  }}
                >
                  {translatedNotes}
                </div>
              </div>
            )}

            {translatedAdminNotes && (
              <div style={{ marginTop: 8 }}>
                <span style={{ color: '#64748b', fontSize: 11 }}>{t.agreedTerms}:</span>
                <div
                  style={{
                    marginTop: 4,
                    padding: 8,
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 6,
                    fontSize: 11.5,
                    color: '#1e293b',
                    lineHeight: 1.5,
                  }}
                >
                  {translatedAdminNotes}
                </div>
              </div>
            )}
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: 14 }}>
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
            <div style={{ marginTop: 7 }}>
              <Field label={t.timeline} value={`${contract.deliveryTimelineWeeks} ${t.weeks}`} />
              <Field label={t.payment} value={paymentPlanLabel} />
            </div>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: 14 }}>
            <SectionTitle>{t.s4}</SectionTitle>
            <ol style={{ margin: 0, paddingInlineStart: 18 }}>
              {terms.map((term, i) => (
                <li key={i} style={{ fontSize: 10, color: '#334155', marginBottom: 3, lineHeight: 1.45 }}>
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
            padding: '8px 28px',
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
