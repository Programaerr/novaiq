import React from 'react';
import { ContractData } from '../types';
import { Language, translateText } from '../lib/i18n';
import { formatPrice } from '../lib/currency';
import { contractTerms } from '../data/contractTerms';
import nuvaiqMark from '../assets/images/nuvaiq-icon.png';

interface ContractPrintDocumentProps {
  contract: ContractData;
  language: Language;
  /** Custom notes already resolved to the target language by the caller. */
  translatedNotes: string;
  /** Admin's negotiated terms, already resolved to the target language by the caller. */
  translatedAdminNotes?: string;
  templateTitle: string;
  city: string;
  /** بنود العقد كما كانت يوم الاعتماد (من lib/contractSnapshot.ts). حين تصل، تُطبع هي لا
   *  البنود الحالية: عقد وُقّع قبل تعديل بند يجب أن يبقى محمولاً على نصّه هو. */
  frozenTerms?: string[];
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
  ({ contract, language, translatedNotes, translatedAdminNotes, templateTitle, city, frozenTerms }, ref) => {
    const isAr = language === 'ar';

    const t = {
      docTitle: isAr ? 'وثيقة عقد تطوير برمجي' : 'SOFTWARE DEVELOPMENT AGREEMENT',
      ref: isAr ? 'رقم العقد' : 'Reference',
      date: isAr ? 'تاريخ الإصدار' : 'Issue Date',
      status: isAr ? 'الحالة' : 'Status',
      // "موثّق" reads in Arabic as notarised by an authority — see the seal/footer note below.
      //
      // وحالتان لا واحدة: كانت الوثيقة تقول "موقّع من الطرفين" منذ اللحظة التي يوقّع فيها
      // العميل وحده — أي قبل أن نوقّعها نحن بيوم أو أسبوع. عبارة غير صحيحة على وثيقة تعاقدية،
      // ويكفي أن يقرأها طرف ثالث ليأخذها على ظاهرها.
      statusSigned: isAr ? 'موقّع من الطرفين' : 'Signed by both parties',
      statusAwaiting: isAr ? 'موقّع من العميل — بانتظار اعتماد NUVAIQ' : 'Signed by the client — awaiting NUVAIQ approval',

      s1: isAr ? '1. بيانات الشركة والممثل القانوني' : '1. COMPANY & LEGAL REPRESENTATIVE',
      companyName: isAr ? 'اسم الشركة' : 'Company Name',
      crNumber: isAr ? 'رقم السجل التجاري' : 'CR / ID Number',
      repName: isAr ? 'الممثل المخوّل' : 'Authorized Representative',
      email: isAr ? 'البريد الإلكتروني' : 'Email',
      phone: isAr ? 'رقم الهاتف' : 'Phone',
      location: isAr ? 'المقر' : 'Location',

      /* "القالب المعتمد" كان مسمّى موروثاً من زمن كتالوج القوالب. لم يعد صحيحاً: القيمة
         المطبوعة هنا هي اسم المشروع الذي كتبه العميل بنفسه، والتنفيذ مخصص بالكامل. */
      s2: isAr ? '2. المشروع المطلوب ومواصفاته' : '2. THE REQUESTED PROJECT & ITS SPECIFICATIONS',
      template: isAr ? 'المشروع' : 'Project',
      projectType: isAr ? 'نوع المشروع' : 'Project Type',
      notes: isAr ? 'ملاحظات ومتطلبات خاصة' : 'Custom Notes & Requirements',
      agreedTerms: isAr ? 'الشروط المتفق عليها بعد المراجعة' : 'Agreed Terms After Review',
      identity: isAr ? 'الهوية البصرية' : 'Visual Identity',
      noColors: isAr ? 'الألوان تُحدَّد لاحقاً' : 'Colours to be agreed later',
      langSupport: isAr ? 'لغات النظام' : 'System Languages',

      s3: isAr ? '3. القيمة المالية ومدة التنفيذ' : '3. FINANCIAL VALUE & DELIVERY TIMELINE',
      total: isAr ? 'الإجمالي الكلي المعتمد' : 'TOTAL AGREED VALUE',
      timeline: isAr ? 'مدة التنفيذ' : 'Delivery Timeline',
      weeks: isAr ? 'أسابيع' : 'weeks',
      payment: isAr ? 'آلية السداد' : 'Payment Structure',

      pricePending: isAr ? 'القيمة المالية: تُحدَّد بالاتفاق' : 'CONTRACT VALUE: TO BE AGREED',
      pricePendingNote: isAr
        ? 'يُبنى هذا المشروع على ما طلبه العميل ووُصف في القسم الثاني أعلاه. تُحدَّد قيمته ومدة تنفيذه وآلية سدادها باتفاق الطرفين بعد مراجعة الطلب، وتُثبَّت في هذه الوثيقة فور اعتمادها من NUVAIQ، ولا يُلزَم أي طرف بقيمة قبل ذلك.'
        : 'This project is built to what the client requested, as described in Section Two above. Its value, delivery time and payment terms are set by agreement between the two parties after the request is reviewed, and are recorded in this document once approved by NUVAIQ. Neither party is bound to any figure before then.',
      toBeAgreed: isAr ? 'تُحدَّد بالاتفاق' : 'To be agreed',
      s4: isAr ? '4. الشروط والأحكام والضمانات' : '4. TERMS, CONDITIONS & GUARANTEES',
      s5: isAr ? '5. التواقيع والاعتماد' : '5. SIGNATURES & AUTHORIZATION',
      clientSig: isAr ? 'توقيع ممثل الشركة' : 'Client Representative Signature',
      signedElectronically: isAr ? '[ تم التوقيع إلكترونياً ]' : '[ Signed Electronically ]',
      companySig: isAr ? 'توقيع واعتماد NUVAIQ' : 'NUVAIQ Sign-off',
      pendingApproval: isAr ? '[ قيد الاعتماد ]' : '[ Pending Approval ]',
      // No "official", no "certified", no claim of validity without a wet signature. This is a
      // private agreement between two named parties — it is not issued, stamped or notarised by
      // any authority, and wording that implies otherwise is a liability rather than a feature.
      seal: isAr ? 'ختم NUVAIQ' : 'NUVAIQ SEAL',
      verified: isAr ? 'عقد إلكتروني بين الطرفين' : 'E-CONTRACT BETWEEN THE PARTIES',
      authCode: isAr ? 'رمز العقد' : 'CONTRACT REF',
      footer: isAr
        ? 'NUVAIQ — صدرت هذه الوثيقة إلكترونياً عبر منصة NUVAIQ، وهي اتفاق خاص بين الطرفين الموقّعَين عليها.'
        : 'NUVAIQ — Issued electronically via the NUVAIQ platform; a private agreement between its two signatories.',
    };

    /* "هل اتُّفق على السعر؟" مشتقّة لا مخزَّنة: عقد بقيمة صفر هو بالتعريف عقد لم يُسعَّر بعد،
       وإضافة حقل حالة ثانٍ يعني احتمال أن يتناقض الحقلان (سعر موجود وحالة "بانتظار"، أو
       العكس) — وهذا في وثيقة تعاقدية أسوأ من عدم وجود الحالة أصلاً. */
    const hasAgreedPrice = (contract.totalPriceIQD || 0) > 0;

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

    /* نوع المشروع المتفق عليه — موقع إلكتروني أم تطبيق هاتف. عقد وُقّع قبل وجود هذا الحقل لا
       يحمل قيمة، ولا يجوز اختراع واحدة له: يُترك سطره غائباً تماماً بدل طباعة نوع لم يختره
       أحد (نفس مبدأ الألوان أدناه). */
    const projectTypeLabel = (() => {
      switch (contract.projectType) {
        case 'website':
          return isAr ? 'موقع إلكتروني' : 'Website';
        case 'app':
          return isAr ? 'تطبيق هاتف (iOS و Android)' : 'Mobile App (iOS & Android)';
        default:
          return null;
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

    // Falls through to "dark" for anything unrecognised — including the retired 'cosmic' value
    // that contracts signed before that option was removed still carry. A stored value that no
    // longer exists must still print as something truthful rather than blank.
    const themeLabel = (() => {
      switch (contract.themePreference) {
        case 'light':
          return isAr ? 'فاتح' : 'Light';
        case 'both':
          return isAr ? 'ثنائي (فاتح وداكن)' : 'Both (light & dark)';
        default:
          return isAr ? 'داكن' : 'Dark';
      }
    })();

    /* The colours the customer actually picked, in order. Empty is a real answer now — the
       builder's three tiles start unpicked and only fill in when someone chooses — so this
       filters rather than falling back. It used to substitute an orange for a missing first
       colour, which was right while the field was always filled and only a contract signed
       before the field existed could lack it, and is wrong now: printing a colour nobody chose
       onto the contract the customer signs is the one thing this must not do. */
    const chosenColors = [contract.primaryColor, contract.secondColor, contract.thirdColor].filter(
      Boolean
    ) as string[];

    // Section 4, from the same module the builder reads when it shows the customer what they
    // are about to sign (src/data/contractTerms.ts) — the two must never be able to disagree.
    /* البنود المجمَّدة أولاً حين توجد — انظر frozenTerms أعلاه. غيابها يعني عقداً قبل نظام
       اللقطات أو لم يُعتمد بعد، فتُطبع البنود الحالية كما كان يحدث دائماً. */
    const terms = frozenTerms && frozenTerms.length > 0 ? frozenTerms : contractTerms(language, contract.deliveryTimelineWeeks);

    const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: '#6B7179', fontSize: 11 }}>{label}: </span>
        <strong style={{ color: '#080A0D', fontSize: 12 }}>{value}</strong>
      </div>
    );

    const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <h2
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: '#080A0D',
          borderBottom: '2px solid #080A0D',
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
          color: '#080A0D',
          fontFamily: isAr ? "'Cairo', 'Tajawal', sans-serif" : "'Helvetica Neue', Arial, sans-serif",
          textAlign: isAr ? 'right' : 'left',
        }}
      >
{/* Header banner — العلامة في المنتصف، وبيانات العقد تحتها.

            كانت العلامة في ركن والبيانات في الركن المقابل، ومعها سطر "منصة القوالب البرمجية
            والعقد الإلكتروني". حُذف السطر: العقد وثيقة بين طرفين، لا مساحة يُعرَّف فيها أحدهما
            بنفسه، وهذه الجملة تصف موقعاً لا تصف التزاماً — ولم تعد صحيحة أصلاً بعد أن صار
            العقد مخصصاً بالكامل لا مبنياً على قالب.

            والتوسيط ليس ذوقاً وحده: ترويسة تُقرأ يميناً في العربية ويساراً في الإنجليزية كانت
            تضع العلامة في مكانين مختلفين حسب لغة النسخة، فتبدو نسختا العقد الواحد وكأنهما من
            جهتين. المنتصف هو الموضع الوحيد الذي لا يتحرّك. */}
        <div style={{ backgroundColor: '#080A0D', color: '#ffffff', padding: '18px 28px 14px' }}>
          <div style={{ textAlign: 'center' }}>
            <img
              src={nuvaiqMark}
              alt="NUVAIQ"
              width={44}
              height={44}
              style={{ width: 44, height: 44, objectFit: 'contain', display: 'inline-block' }}
            />
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 3, marginTop: 4 }}>NUVAIQ</div>
          </div>

          {/* dir="ltr" على الصفّ وحده: الترتيب الفيزيائي للحقول الثلاثة يبقى واحداً في اللغتين،
              بينما نصّ كل حقل يقرأ باتجاهه الطبيعي. */}
          <div
            dir="ltr"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginTop: 14,
              paddingTop: 10,
              borderTop: '1px solid #282A2C',
              fontSize: 11,
              color: '#E6E7E7',
            }}
          >
            <span style={{ fontWeight: 700, color: '#ffffff' }}>
              {t.ref}: {contract.contractNumber}
            </span>
            <span>
              {t.date}: {new Date(contract.createdAt).toLocaleDateString(isAr ? 'ar-IQ' : 'en-GB')}
            </span>
            <span>
              {t.status}: {contract.companySignatureDataUrl ? t.statusSigned : t.statusAwaiting}
            </span>
          </div>
        </div>

        <div style={{ height: 4, backgroundColor: '#666769' }} />

        {/* Document title */}
        <div style={{ padding: '12px 28px 0', textAlign: 'center' }}>
          <h1 style={{ fontSize: 17, fontWeight: 900, color: '#080A0D', letterSpacing: isAr ? 0 : 1 }}>
            {t.docTitle}
          </h1>
        </div>

        <div style={{ padding: '12px 28px 18px' }}>
          {/* Section 1 */}
          <div style={{ marginBottom: 14 }}>
            <SectionTitle>{t.s1}</SectionTitle>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Field label={t.companyName} value={contract.companyName} />
                <Field label={t.crNumber} value={contract.crNumber || '—'} />
                <Field label={t.repName} value={contract.repName} />
              </div>
              <div style={{ flex: 1 }}>
                <Field label={t.email} value={contract.email} />
                <Field label={t.phone} value={contract.phone} />
                <Field label={t.location} value={`${city}`} />
              </div>

              {/* شعار العميل، كما رفعه.
                  مع بياناته هو لا في الترويسة: الترويسة تخصّ مُصدِر الوثيقة، وهذا الشعار جزء من
                  تعريف الطرف الثاني بنفسه. أرضية بيضاء وبلا قصّ — object-fit: contain داخل
                  صندوق ثابت — بحيث يُطبع الشعار كما هو مهما كانت نسبته، فيصلح لأن يُستعمل كما
                  يشاء صاحبه. */}
              {contract.clientLogoDataUrl && (
                <div
                  style={{
                    width: 104,
                    height: 72,
                    flex: 'none',
                    border: '1px solid #E6E7E7',
                    borderRadius: 6,
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 6,
                  }}
                >
                  <img
                    src={contract.clientLogoDataUrl}
                    alt={contract.companyName}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: 14 }}>
            <SectionTitle>{t.s2}</SectionTitle>
            <Field label={t.template} value={templateTitle} />
            {projectTypeLabel && <Field label={t.projectType} value={projectTypeLabel} />}
            <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#6B7179', fontSize: 11 }}>{t.identity}: </span>
              <strong style={{ color: '#080A0D', fontSize: 12 }}>{themeLabel}</strong>
              {/* Whatever was chosen, however many that is: one colour on a contract signed
                  before colours 2 and 3 existed prints exactly as it always did, and none at all
                  prints as a sentence instead of a row of empty boxes. */}
              {chosenColors.length === 0 ? (
                <span style={{ fontSize: 11, color: '#666769' }}>{t.noColors}</span>
              ) : (
                chosenColors.map((hex, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 13,
                        height: 13,
                        borderRadius: 4,
                        backgroundColor: hex,
                        border: '1px solid #D3D3D3',
                      }}
                    />
                    {/* dir="ltr" for the same reason as in the builder: '#' is a bidi-neutral,
                        and in this RTL document it jumps to the far side of a code that starts
                        with a letter, printing F59E0B# on the contract the customer keeps. */}
                    <span dir="ltr" style={{ fontSize: 10.5, color: '#666769', fontFamily: 'monospace' }}>
                      {hex.toUpperCase()}
                    </span>
                  </span>
                ))
              )}
            </div>
            <Field label={t.langSupport} value={languageSupportLabel} />

            {translatedNotes && (
              <div style={{ marginTop: 8 }}>
                <span style={{ color: '#6B7179', fontSize: 11 }}>{t.notes}:</span>
                <div
                  style={{
                    marginTop: 4,
                    padding: 8,
                    backgroundColor: '#F7F7F5',
                    border: '1px solid #E6E7E7',
                    borderRadius: 6,
                    fontSize: 11.5,
                    color: '#282A2C',
                    lineHeight: 1.5,
                  }}
                >
                  {translatedNotes}
                </div>
              </div>
            )}

            {translatedAdminNotes && (
              <div style={{ marginTop: 8 }}>
                <span style={{ color: '#6B7179', fontSize: 11 }}>{t.agreedTerms}:</span>
                <div
                  style={{
                    marginTop: 4,
                    padding: 8,
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 6,
                    fontSize: 11.5,
                    color: '#282A2C',
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
            {hasAgreedPrice ? (
              <div style={{ border: '1px solid #E6E7E7', borderRadius: 6, overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    backgroundColor: '#080A0D',
                    color: '#ffffff',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{t.total}</span>
                  <strong style={{ fontSize: 22, fontWeight: 900 }}>
                    {formatPrice(contract.totalPriceIQD || 0, language)}
                  </strong>
                </div>
              </div>
            ) : (
              /* لا رقم قبل أن يوجد رقم.
                 كانت هذه الخانة تطبع "0 د.ع" فوق توقيع العميل مباشرة لأن المشروع المخصص يبدأ
                 بلا سعر — أي وثيقة موقَّعة تُثبت اتفاقاً بصفر دينار، وأي نزاع يقرؤها حرفياً.
                 وما يُطبع الآن هو الحقيقة نفسها: القيمة تُحدَّد باتفاق الطرفين على ما طلبه
                 العميل، وتظهر هنا فور اعتمادها من لوحة التحكم. */
              <div
                style={{
                  border: '1px dashed #B5B6B6',
                  borderRadius: 6,
                  padding: '12px 14px',
                  backgroundColor: '#F7F7F5',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: '#080A0D' }}>{t.pricePending}</div>
                <div style={{ fontSize: 11, color: '#666769', marginTop: 4, lineHeight: 1.5 }}>
                  {t.pricePendingNote}
                </div>
              </div>
            )}
            <div style={{ marginTop: 7 }}>
              {/* المدة مستقلة عن السعر.
                  كانت مربوطة به، فمدة اعتمدها الأدمن تبقى مخفية لمجرد أن الرقم لم يُثبَّت بعد —
                  وهما اتفاقان منفصلان قد يُبرمان في وقتين مختلفين. كل واحد يظهر متى وُجد. */}
              {/* النصّ الحر أولاً، والأسابيع للعقود القديمة وحدها. */}
              <Field
                label={t.timeline}
                value={
                  contract.deliveryTimelineText?.trim()
                    ? contract.deliveryTimelineText
                    : contract.deliveryTimelineWeeks
                      ? `${contract.deliveryTimelineWeeks} ${t.weeks}`
                      : t.toBeAgreed
                }
              />
              <Field label={t.payment} value={hasAgreedPrice ? paymentPlanLabel : t.toBeAgreed} />
            </div>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: 14 }}>
            <SectionTitle>{t.s4}</SectionTitle>
            <ol style={{ margin: 0, paddingInlineStart: 18 }}>
              {terms.map((term, i) => (
                <li key={i} style={{ fontSize: 10, color: '#434547', marginBottom: 3, lineHeight: 1.45 }}>
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
                <div style={{ fontSize: 11, color: '#6B7179', marginBottom: 6 }}>{t.clientSig}</div>
                {contract.signatureDataUrl ? (
                  <img
                    src={contract.signatureDataUrl}
                    alt=""
                    style={{
                      height: 56,
                      maxWidth: 200,
                      objectFit: 'contain',
                      /* التواقيع الجديدة تُرسم بحبر داكن أصلاً فتُطبع كما هي. القلب يبقى
                         للتواقيع القديمة وحدها (بلا signatureInk) — تلك رُسمت بحبر أبيض
                         وبدون قلبها تختفي تماماً على هذه الورقة البيضاء. */
                      filter: contract.signatureInk === 'dark' ? undefined : 'invert(1)',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 11, color: '#B5B6B6', fontStyle: 'italic', height: 56 }}>
                    {t.signedElectronically}
                  </div>
                )}
                <div
                  style={{
                    borderTop: '1px solid #B5B6B6',
                    marginTop: 4,
                    paddingTop: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#080A0D',
                    maxWidth: 220,
                  }}
                >
                  {contract.repName}
                </div>
              </div>

              <div
                style={{
                  border: '2px solid #080A0D',
                  borderRadius: 8,
                  padding: '12px 16px',
                  textAlign: 'center',
                  width: 210,
                }}
              >
                <div style={{ fontSize: 10, color: '#6B7179', marginBottom: 4 }}>{t.companySig}</div>
                {contract.companySignatureDataUrl ? (
                  <img
                    src={contract.companySignatureDataUrl}
                    alt=""
                    style={{
                      height: 44,
                      maxWidth: 160,
                      objectFit: 'contain',
                      filter: contract.companySignatureInk === 'dark' ? undefined : 'invert(1)',
                      display: 'block',
                      margin: '0 auto',
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 10, color: '#B5B6B6', fontStyle: 'italic', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {t.pendingApproval}
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 900, color: '#080A0D', marginTop: 6, borderTop: '1px solid #D3D3D3', paddingTop: 6 }}>
                  {t.seal}
                </div>
                <div style={{ fontSize: 9, color: '#666769', marginTop: 4, letterSpacing: 0.5 }}>{t.verified}</div>
                <div style={{ fontSize: 9, color: '#666769', marginTop: 6, fontFamily: 'monospace' }}>
                  {t.authCode}: {contract.contractNumber}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: '#080A0D',
            color: '#B5B6B6',
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
  { contract: ContractData; language: Language; frozenTerms?: string[] }
>(({ contract, language, frozenTerms }, ref) => {
  /* حرفياً كما كُتبا — انظر نفس التعليق في ContractPDFPreview: العقد يُطبع بنصّ صاحبه، لا
     بإعادة صياغة آلية له. */
  const translatedNotes = contract.customFeaturesText;
  const translatedAdminNotes = contract.adminNotes;

  return (
    <ContractPrintDocument
      ref={ref}
      contract={contract}
      language={language}
      translatedNotes={translatedNotes}
      translatedAdminNotes={translatedAdminNotes}
      frozenTerms={frozenTerms}
      templateTitle={translateText(contract.templateTitle, language)}
      city={translateText(contract.city, language)}
    />
  );
});

ConnectedContractPrintDocument.displayName = 'ConnectedContractPrintDocument';
