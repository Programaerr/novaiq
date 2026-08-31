import React, { useState, useRef, useEffect } from 'react';
import { Template, ContractData, CUSTOM_PROJECT_TEMPLATE_ID } from '../types';
import { useLiveTemplates } from '../lib/pricingOverrides';
import {
  FileSignature,
  Building2,
  RotateCcw,
  Layers,
  ArrowLeft,
  ArrowRight,
  FileCheck,
  PenLine,
  AlertCircle,
  CheckCircle2,
  Globe,
  Smartphone
} from 'lucide-react';
import { cosmicAudio } from '../lib/audio';
import { Language, getTranslation } from '../lib/i18n';
import { formatPrice, Currency } from '../lib/currency';
import { showToast } from '../lib/toast';
import { NqButton } from './ui/NqButton';
import { ColorWheel } from './ui/ColorWheel';
import { loadContractDraft, saveContractDraft } from '../lib/contractDraft';
import { useSignaturePad } from '../lib/useSignaturePad';
import { contractTerms } from '../data/contractTerms';
import { ERROR, OBSIDIAN, SUCCESS } from '../lib/homePalette';

interface ContractBuilderProps {
  selectedTemplate: Template | null;
  onContractGenerated: (contract: ContractData) => void;
  language?: Language;
  currency?: Currency;
  initialCustomFeaturesText?: string;
  initialPrimaryColor?: string;
  /** موقع إلكتروني أم تطبيق هاتف، قادماً من البطاقة/المعاينة التي دخل منها العميل. */
  initialProjectType?: 'website' | 'app';
  accountEmail?: string | null;
  accountUid?: string | null;
}

/**
 * A counted noun in Arabic changes with the count, and this form was printing one form for every
 * number: "5 أسبوع" and "8 بنداً", which are the shapes for 1 and for 11-99 respectively, on values
 * that are neither. 3 to 10 takes the plural — "5 أسابيع", "8 بنود".
 *
 * A function rather than the two fixed strings it currently resolves to, because both counts come
 * from data: `deliveryWeeks` is a per-template field and the clause list is an array whose length
 * is whatever `contractTerms` returns. Hard-coding today's answers would be correct until either
 * one is edited, and wrong silently after that.
 */
function arCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  return `${n} ${n >= 3 && n <= 10 ? few : many}`;
}

/**
 * What each of the three colour DIALOGS opens on. Not what the tiles show, and not what the
 * contract records: a tile the customer has not touched is empty, and stays empty all the way
 * through to the printed contract.
 *
 * A native `<input type="color">` has to be handed some value to open at, and an unset one opens
 * at black — the worst possible place to start dragging from in a picker whose whole point is
 * hue. These three are far apart on the wheel so that opening the second dialog does not land on
 * the first tile's answer and invite three near-identical picks.
 */
const DEFAULT_BRAND_COLORS = ['#8b5cf6', '#10b981', '#f59e0b'];



export const ContractBuilder: React.FC<ContractBuilderProps> = ({
  selectedTemplate,
  onContractGenerated,
  language = 'ar' as Language,
  currency = 'IQD',
  initialCustomFeaturesText,
  initialPrimaryColor,
  initialProjectType,
  accountEmail,
  accountUid,
}) => {
  const lang: Language = language;
  const isAr = lang === 'ar';

  // Static catalogue merged with any live admin price overrides — same shape and name as
  // the old static import, so every existing reference below still works unchanged.
  const templatesData = useLiveTemplates();

  // Restored once on mount (not re-read on every render) — whatever the customer last
  // typed here, so a refresh or accidental navigation away doesn't mean starting over.
  const [draft] = useState(() => loadContractDraft());

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [template, setTemplate] = useState<Template>(selectedTemplate || templatesData[0]);

  // Keeps the active template's pricing current if an admin edits it while this page is
  // open (overrides load asynchronously, a moment after the initial static render).
  useEffect(() => {
    const live = templatesData.find(t => t.id === template.id);
    // Compared by value, not just by reference. The reference test alone is only safe while
    // `templatesData` keeps a stable identity between renders (see the useMemo in
    // useLiveTemplates); if that ever stops being true again, an identity-only check setStates
    // on every render and loops until React aborts the tree. Stringifying one template object
    // costs nothing next to the render it prevents, and makes this effect correct on its own
    // terms rather than dependent on a promise made in another file.
    if (live && live !== template && JSON.stringify(live) !== JSON.stringify(template)) {
      setTemplate(live);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatesData]);

  // Form State
  const [companyName, setCompanyName] = useState(draft?.companyName || '');
  const [crNumber, setCrNumber] = useState(draft?.crNumber || '');
  const [repName, setRepName] = useState(draft?.repName || '');
  /* بريد الحساب الموقّع أولاً، لا بريد المسودة: من فتح النموذج بحساب ثم سجّل دخوله بحساب آخر
     كانت مسودته تُبقي البريد القديم، فيُنشأ عقد ببريد لا يخصّ صاحب الحساب — وقاعدة Firestore
     الآن ترفض ذلك صراحةً (firestore.rules)، فكانت النتيجة فشل حفظ صامت. */
  const [email] = useState(accountEmail || draft?.email || '');
  const [phone, setPhone] = useState(draft?.phone || '');
  const city = draft?.city || 'بغداد';
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

  // The brand's own ERROR token, written as the literal `#EF4444` (Tailwind's JIT scanner reads
  // arbitrary-value classes as static text, not runtime JS — an interpolated `${ERROR}` here would
  // silently generate no CSS at all), not Tailwind's stock red-600/red-500. Those are close but
  // different exact hexes, which is precisely the drift "consistent" rules out: every other error
  // state on the site (ContactSection, LoginPage) is this one red, not a Tailwind default that
  // happens to look similar. Must match `ERROR` in homePalette.ts if that value ever changes.
  const errorInputClass = (field: string) =>
    fieldErrors.has(field)
      ? 'border-[#EF4444] focus:border-[#EF4444] ring-1 ring-[#EF4444]/40'
      : 'border-steel/60 focus:border-orange';

  const clearFieldError = (field: string) => {
    if (!fieldErrors.has(field)) return;
    setFieldErrors((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  };

  // Phone Validation helper (Must start with 07 and be 11 digits)
  const isValidIraqiPhone = (num: string) => {
    const clean = num.replace(/[\s\-\+\(\)]/g, '');
    return /^07\d{9}$/.test(clean);
  };

  // Customizations. There is no add-on checklist any more: a priced list of options asked the
  // customer to make a dozen small purchasing decisions about things they could not evaluate,
  // before they had even agreed to the project. Anything they actually want is written in the
  // request field below and priced by us afterwards, which is what was happening anyway.
  const [customFeaturesText, setCustomFeaturesText] = useState(draft?.customFeaturesText || '');

  // A fully custom project — not based on any ready template at all. Arriving with no
  // selectedTemplate (e.g. via the navbar's direct "Custom Contract" link) opens straight
  // into this mode instead of silently defaulting to the first template in the catalogue.
  const CUSTOM_OPTION_VALUE = CUSTOM_PROJECT_TEMPLATE_ID;
  /* Always true now. The one ready-made template came out of the picker below on the owner's
     call, and with nothing left to choose between, the project type is not a choice. Kept as a
     named constant rather than deleted, because every branch downstream already reads it and
     already does the right thing: a price of 0 shown as "quoted after review", an 8-week
     timeline, and templateId/templateTitle taken from the customer's own project name.
     Sakan is still in templatesData, so the templates gallery and the timeline are unaffected. */
  const isCustomProject = true;
  const [customProjectName, setCustomProjectName] = useState(draft?.customProjectName || '');
  /* نوع المشروع: موقع إلكتروني أم تطبيق هاتف. يبدأ على ما اختاره العميل فعلاً قبل وصوله إلى
     هنا (بطاقة "اطلب موقع"/"اطلب تطبيق"، أو مفتاح الموقع/التطبيق داخل المعاينة الحية)، ويبقى
     قابلاً للتغيير من الخطوة الثانية. من دخل مباشرة بلا أي اختيار سابق يبدأ على "موقع
     إلكتروني" ويغيّره إن أراد — لكن الحقل موجود دائماً، فلا يُطبع عقد بلا نوع مشروع. */
  const [projectType, setProjectType] = useState<'website' | 'app'>(
    draft?.projectType || initialProjectType || 'website'
  );
  /* Empty until the customer picks, which is the whole of the change the owner asked for: the
     hex code appears when a colour is chosen and the circle becomes that colour, so an untouched
     tile can no longer report an answer nobody gave. Colour 1 keeps the `primaryColor` name it
     has on the wire; see the note in types.ts. */
  const [primaryColor, setPrimaryColor] = useState(draft?.primaryColor || '');
  const [secondColor, setSecondColor] = useState(draft?.secondColor || '');
  const [thirdColor, setThirdColor] = useState(draft?.thirdColor || '');
  const brandColors: Array<{ value: string; set: (v: string) => void }> = [
    { value: primaryColor, set: setPrimaryColor },
    { value: secondColor, set: setSecondColor },
    { value: thirdColor, set: setThirdColor },
  ];
  const [themePreference, setThemePreference] = useState<'dark' | 'light' | 'both'>(draft?.themePreference || 'dark');
  const [languageSupport, setLanguageSupport] = useState<'ar' | 'en' | 'ar_en'>(draft?.languageSupport || 'ar_en');
  const [paymentPlan] = useState<'50_50' | '100_upfront' | '3_milestones'>('50_50');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Digital Signature Canvas
  const signaturePadRef = useRef<HTMLDivElement | null>(null);
  // Drives an inline highlight on the pad instead of an alert() — a modal popup that just
  // says "go sign" makes the user dismiss it and then hunt for the pad themselves.
  const [signatureMissing, setSignatureMissing] = useState(false);
  const {
    canvasRef,
    hasSignature,
    startDrawing,
    draw,
    stopDrawing,
    clear: clearSignature,
  } = useSignaturePad({ onStrokeStart: () => setSignatureMissing(false) });

  /* Arriving from the live template preview. The line that flipped this out of custom mode is
     gone with the picker, but the rest of the handoff still earns its place: the notes the
     visitor typed in the demo become the project description, and the colour they picked there
     becomes colour 1, so nothing they did before signing in is thrown away. */
  useEffect(() => {
    if (selectedTemplate) {
      setTemplate(selectedTemplate);
      if (initialCustomFeaturesText) setCustomFeaturesText(initialCustomFeaturesText);
      if (initialPrimaryColor) setPrimaryColor(initialPrimaryColor);
      if (initialProjectType) setProjectType(initialProjectType);
    }
  }, [selectedTemplate, initialCustomFeaturesText, initialPrimaryColor, initialProjectType]);

  // Mirrors every field into localStorage as the customer types, so the draft survives a
  // refresh or an accidental navigation away. Cleared only once a contract is actually
  // submitted (see handleSubmitContract).
  useEffect(() => {
    saveContractDraft({
      companyName,
      crNumber,
      repName,
      email,
      phone,
      city,
      customFeaturesText,
      primaryColor,
      secondColor,
      thirdColor,
      themePreference,
      languageSupport,
      isCustomProject,
      customProjectName,
      projectType,
    });
  }, [
    companyName,
    crNumber,
    repName,
    email,
    phone,
    city,
    customFeaturesText,
    primaryColor,
    secondColor,
    thirdColor,
    themePreference,
    languageSupport,
    isCustomProject,
    customProjectName,
    projectType,
  ]);


  // Price Calculation in IQD — a fully custom project has no catalogue price at all; its
  // final value is quoted by the team after reviewing the written description below.
  const basePriceIQD = isCustomProject ? 0 : (template.basePriceIQD || 0);
  const totalPriceIQD = basePriceIQD;

  // Shown to the customer in step 3 and printed as section 4 of their PDF, from one module so
  // the two can never disagree. The week count must match what handleSubmit writes into the
  // contract below, which is why it is derived the same way rather than typed out again.
  const deliveryTimelineWeeks = isCustomProject ? 8 : template.deliveryWeeks;
  const terms = contractTerms(lang, deliveryTimelineWeeks);

  // Live verdict on the phone field, so a wrong number is caught as it is typed rather than
  // only when the finished contract is submitted.
  //
  // The prefix test compares "07" against *only as many characters as have been typed*, which
  // is what separates "wrong" from "not finished yet": "0" and "07" are someone part-way
  // through a correct number and must not go red, while "05" or "1" can never become a valid
  // Iraqi mobile no matter what follows, so there is no reason to make them type nine more
  // digits and press submit to find that out. The full-length check then catches anything the
  // prefix alone cannot.
  const phoneError: string | null = (() => {
    if (!phone) return null;
    if (!'07'.startsWith(phone.slice(0, 2))) {
      return isAr ? 'رقم غير عراقي — يجب أن يبدأ بـ 07' : 'Not an Iraqi number — it must start with 07';
    }
    if (phone.length === 11 && !isValidIraqiPhone(phone)) {
      return isAr ? 'رقم غير صالح' : 'Invalid number';
    }
    return null;
  })();

  // Everything that must be true before the contract can be submitted at all. Kept as one
  // expression so the disabled button and handleSubmit's guards cannot disagree about what
  // "ready" means.
  const canSubmit = hasSignature && agreedToTerms && isValidIraqiPhone(phone);

  const handleSubmitContract = (e: React.FormEvent) => {
    e.preventDefault();

    const missing = new Set<string>();
    if (!companyName) missing.add('companyName');
    if (!repName) missing.add('repName');
    if (!phone) missing.add('phone');

    if (missing.size > 0) {
      setFieldErrors(missing);
      showToast(
        isAr ? 'يرجى إكمال بيانات شركتك في الخطوة الأولى (الحقول الناقصة محدّدة بالأحمر)' : 'Please complete the required company details in step 1 (highlighted in red)',
        'error'
      );
      setCurrentStep(1);
      return;
    }

    if (!isValidIraqiPhone(phone)) {
      setFieldErrors(new Set(['phone']));
      showToast(
        isAr ? 'رقم الهاتف يجب أن يبدأ بـ 07 ويتكوّن من 11 رقماً' : 'Invalid Iraqi phone number format. Must start with 07 and be 11 digits.',
        'error'
      );
      setCurrentStep(1);
      return;
    }

    if (isCustomProject && (!customProjectName.trim() || !customFeaturesText.trim())) {
      const missingCustom = new Set<string>();
      if (!customProjectName.trim()) missingCustom.add('customProjectName');
      if (!customFeaturesText.trim()) missingCustom.add('customDescription');
      setFieldErrors(missingCustom);
      showToast(
        isAr ? 'يرجى تسمية مشروعك ووصفه في الخطوة الثانية (الحقول الناقصة محدّدة بالأحمر)' : 'Please name and describe your project in detail in step 2 (highlighted in red)',
        'error'
      );
      setCurrentStep(2);
      return;
    }

    if (!agreedToTerms) {
      showToast(isAr ? 'يرجى الموافقة على بنود العقد أولاً' : 'Please accept the terms and conditions', 'error');
      return;
    }

    if (!hasSignature) {
      // Take the user straight to the pad and highlight it, rather than popping an alert
      // that has to be dismissed before they can act on it.
      setCurrentStep(3);
      setSignatureMissing(true);
      showToast(isAr ? 'التوقيع مطلوب لإتمام العقد' : 'A signature is required to complete the contract', 'error');
      requestAnimationFrame(() => {
        signaturePadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    let signatureDataUrl = '';
    if (canvasRef.current && hasSignature) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    }

    const contractNumber = `NVQ-CTR-${Date.now().toString().slice(-6)}`;

    const contractData: ContractData = {
      // Conditionally spread (not `uid: accountUid || undefined`) — Firestore's setDoc
      // throws on an explicit `undefined` field value, so the key must be entirely absent
      // rather than present-with-undefined when there's no account uid.
      ...(accountUid ? { uid: accountUid } : {}),
      contractNumber,
      companyName,
      crNumber,
      repName,
      email,
      phone,
      city,
      templateId: isCustomProject ? CUSTOM_OPTION_VALUE : template.id,
      templateTitle: isCustomProject ? customProjectName.trim() : template.title,
      projectType,
      customFeaturesText,
      primaryColor,
      secondColor,
      thirdColor,
      themePreference,
      languageSupport,
      basePriceIQD,
      totalPriceIQD,
      basePriceSAR: basePriceIQD,
      totalPriceSAR: totalPriceIQD,
      paymentPlan,
      deliveryTimelineWeeks,
      signatureDataUrl,
      agreedToTerms,
      status: 'submitted',
      createdAt: new Date().toISOString(),
    };

    // Neither the success toast nor clearing the draft belongs here. This function has not
    // created anything at this point — it has assembled an object and is about to hand it
    // over — so announcing "تم إنشاء العقد بنجاح" from here was a claim made before the work
    // was attempted, and it stayed on screen even when the save then failed or never ran.
    // Clearing the draft was worse: it threw away the only recoverable copy of a contract
    // that did not yet exist anywhere else. Both now happen in App's handleContractGenerated,
    // on the actual outcome of the actual save.
    //
    // The sound stays: it acknowledges the click, which did happen.
    cosmicAudio.playWarp();
    onContractGenerated(contractData);
  };

  return (
    <section id="contract-section" className="py-4 sm:py-6 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section title — sits directly on the page's own white ground, outside the dark form
            panel below it, so it follows the same rule every other section's heading does now:
            OBSIDIAN, secondary chrome on white, not a dark panel's own primary text. It used to be
            `text-white`, a leftover from when this whole page sat on a dark ground by default —
            true three identities ago, not true since the site's base ground went light, and
            invisible ever since: white text with no dark backing under it. `font-black` and the
            rest of the site's heading weight, in place of the one-off `font-extrabold` this page
            had drifted to on its own. */}
        <div className="text-center mb-5">
          <h2 className="text-xl sm:text-3xl font-black mb-1.5" style={{ color: OBSIDIAN }}>
            {getTranslation('builderTitle', lang)}
          </h2>
          <p className="text-sm sm:text-base max-w-2xl mx-auto font-bold leading-relaxed" style={{ color: OBSIDIAN, opacity: 0.7 }}>
            {getTranslation('builderSubtext', lang)}
          </p>
        </div>

        {/* Phase stepper — the three phases of building a contract. Each is clickable so a
            customer can jump back to a phase they want to revisit; the active one is filled
            Signal Orange with an Obsidian label (white on Orange is 2.68:1 and does not read), a
            finished one turns near-white with a check, and the next is dim until reached.
            Three phases, not four: pricing/terms and the signature used to be separate screens,
            which meant the customer agreed to a figure on one page and signed on another with the
            figure no longer in front of them. They are one phase: read the price, read the
            clauses, sign, send. */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6">
          {[
            { step: 1, title: isAr ? 'بيانات الشركة' : 'Company Details', icon: Building2, phase: isAr ? 'المرحلة الأولى' : 'Phase one' },
            { step: 2, title: isAr ? 'مواصفات المشروع' : 'Project Specs', icon: Layers, phase: isAr ? 'المرحلة الثانية' : 'Phase two' },
            { step: 3, title: isAr ? 'المراجعة والتوقيع' : 'Review & Sign', icon: FileSignature, phase: isAr ? 'المرحلة الثالثة' : 'Phase three' },
          ].map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  setCurrentStep(s.step);
                  cosmicAudio.playPing();
                }}
                aria-current={isCurrent ? 'step' : undefined}
                className={`text-start p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex items-center gap-2.5 cursor-pointer ${
        isCurrent
          ? 'bg-orange border-orange text-obsidian shadow-lg shadow-orange/25'
          : isCompleted
          ? 'bg-obsidian border-white/70 text-white shadow-lg shadow-black/50'
          : 'bg-obsidian border-white/10 text-white/50 hover:border-orange'
                }`}
              >
                {/* `#BA4F04` — ORANGE_ON_LIGHT, the same darkened-for-a-light-fill orange every
                    other white/light chip on the site uses; `text-periwinkle` resolved to this
                    exact value already (via a legacy alias two identities old), just under a name
                    that no longer means anything to a reader of this file. */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isCurrent ? 'bg-white text-[#BA4F04]' : isCompleted ? 'bg-white text-obsidian' : 'bg-white/10 text-white/60'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <span className="block text-xs opacity-70">{s.phase}</span>
                  <span className="block text-xs sm:text-sm font-bold truncate">{s.title}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmitContract} className="bg-graphite border border-white/10 p-4 sm:p-6 rounded-3xl space-y-5 shadow-2xl">
          
          {/* STEP 1: Company Details */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-white" />
                  <span>{getTranslation('stepCompanyInfo', lang)}</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white/85 mb-2">
                    {getTranslation('companyNameLabel', lang)} *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      clearFieldError('companyName');
                    }}
                    placeholder={getTranslation('companyNamePlaceholder', lang)}
                    className={`w-full px-4 py-3 rounded-xl bg-obsidian border focus:outline-none text-white text-sm transition-colors ${errorInputClass('companyName')}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/85 mb-2">
                    {getTranslation('crNumberLabel', lang)}
                  </label>
                  <input
                    type="text"
                    value={crNumber}
                    onChange={(e) => setCrNumber(e.target.value)}
                    placeholder={getTranslation('crNumberPlaceholder', lang)}
                    className="w-full px-4 py-3 rounded-xl bg-obsidian border border-steel/60 focus:border-orange focus:outline-none text-white text-sm font-mono placeholder:font-sans"
                  />
                  {/* Said outright rather than left to the absence of a `*`: plenty of clients
                      here are individuals or new businesses with no commercial register at
                      all, and a blank field with no explanation reads as something they are
                      missing rather than something they can skip. */}
                  <p className="text-xs text-white/60 mt-1">
                    {isAr
                      ? 'يمكنك تركه فارغاً إذا لم يكن لديك سجل تجاري.'
                      : 'Leave blank if you do not have a commercial register.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/85 mb-2">
                    {getTranslation('repNameLabel', lang)} *
                  </label>
                  <input
                    type="text"
                    required
                    value={repName}
                    onChange={(e) => {
                      setRepName(e.target.value);
                      clearFieldError('repName');
                    }}
                    placeholder={getTranslation('repNamePlaceholder', lang)}
                    className={`w-full px-4 py-3 rounded-xl bg-obsidian border focus:outline-none text-white text-sm transition-colors ${errorInputClass('repName')}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/85 mb-2">
                    {getTranslation('phoneLabel', lang)} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    maxLength={11}
                    onChange={(e) => {
                      const cleanDigits = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setPhone(cleanDigits);
                      clearFieldError('phone');
                    }}
                    placeholder={getTranslation('phonePlaceholder', lang)}
                    aria-invalid={phoneError ? true : undefined}
                    // The live verdict outranks the submit-time one: while someone is fixing a
                    // number the field should follow what they are typing right now, not stay
                    // red because of the value that failed when they last pressed submit.
                    className={`w-full px-4 py-3 rounded-xl bg-obsidian border focus:outline-none text-white text-sm font-mono transition-colors ${
                      phoneError
                        ? 'border-[#EF4444] focus:border-[#EF4444] ring-1 ring-[#EF4444]/40'
                        : errorInputClass('phone')
                    }`}
                  />
                  {phoneError ? (
                    <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: ERROR }}>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{phoneError}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-white/60 mt-1">
                      {isAr ? 'مثال: 07701234567 (11 رقماً)' : 'e.g. 07701234567 (11 digits)'}
                    </p>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* STEP 2: Template & Specifications */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-orange" />
                  <span>{getTranslation('stepTechSpecs', lang)}</span>
                </h3>
                <p className="text-white/55 text-xs sm:text-sm leading-relaxed mt-2 max-w-2xl">
                  {isAr
                    ? 'اختر قالباً وصِف ما تريد تنفيذه — وسترى مواصفاتك تتحدّث مباشرة في بطاقة الملخّص بالأسفل.'
                    : 'Pick a template and describe what to build — your spec updates live in the summary card below.'}
                </p>
              </div>


              <div className="p-4 rounded-2xl bg-obsidian border border-white/10 flex items-center gap-4">
                <div className="flex items-center gap-4">
                  {isCustomProject ? (
                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-steel/60 flex items-center justify-center shrink-0">
                      <PenLine className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <img
                      src={template.previewImage}
                      alt={template.title}
                      className="w-16 h-16 rounded-xl object-cover border border-steel/60"
                    />
                  )}
                  <div>
                    <span className="text-xs font-bold text-white bg-white/8 border border-steel/60 px-2.5 py-0.5 rounded-full">
                      {isCustomProject ? (isAr ? 'مشروع مخصص بالكامل' : 'Fully Custom Project') : template.categoryLabel}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">
                      {isCustomProject ? (isAr ? 'صف مشروعك بنفسك بالأسفل' : 'Describe your project below') : template.title}
                    </h4>
                  </div>
                </div>
                {/* The dropdown that used to sit here is gone with the one template it offered.
                    A select with a single option is not a choice, it is a control that cannot do
                    anything, so the card now simply states what the project is. */}
              </div>

              {isCustomProject && (
                <div>
                  <label className="block text-sm font-semibold text-white/85 mb-2">
                    {isAr ? 'اسم مشروعك المخصص' : 'Name your custom project'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={customProjectName}
                    onChange={(e) => {
                      setCustomProjectName(e.target.value);
                      clearFieldError('customProjectName');
                    }}
                    placeholder={isAr ? 'مثال: منصة حجوزات صالات أفراح' : 'e.g. Event Hall Booking Platform'}
                    className={`w-full px-4 py-3 rounded-xl bg-obsidian border focus:outline-none text-white text-sm transition-colors ${errorInputClass('customProjectName')}`}
                  />
                </div>
              )}

              {/* نوع المشروع — الحقل الذي يقرر ماذا يُطبع في العقد: "موقع إلكتروني" أو "تطبيق
                  هاتف". يصل مضبوطاً مسبقاً على ما اختاره العميل في صفحة القوالب أو في المعاينة
                  الحية، ويبقى قابلاً للتصحيح هنا قبل التوقيع — فما يُوقَّع عليه هو ما يراه. */}
              <div>
                <label className="block text-sm font-semibold text-white/85 mb-2">
                  {isAr ? 'نوع المشروع' : 'Project Type'} *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {([
                    { id: 'website' as const, label: isAr ? 'موقع إلكتروني' : 'Website', Icon: Globe },
                    { id: 'app' as const, label: isAr ? 'تطبيق هاتف' : 'Mobile App', Icon: Smartphone },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setProjectType(opt.id)}
                      aria-pressed={projectType === opt.id}
                      className={`p-3 rounded-xl border text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-2 ${
                        projectType === opt.id
                          ? 'bg-orange border-white text-obsidian'
                          : 'bg-obsidian border-white/10 text-white/60 hover:border-orange'
                      }`}
                    >
                      <opt.Icon className="w-4 h-4 shrink-0" />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/60 mt-2 leading-relaxed">
                  {isAr
                    ? 'يُطبع هذا الاختيار في عقدك كنوع المشروع المتفق عليه.'
                    : 'This choice is printed on your contract as the agreed project type.'}
                </p>
              </div>


              {/* Appearance — the whole "what it looks like" group in one labelled card. */}
              <div className="text-white font-bold text-base mt-1">{isAr ? 'تخصيص المظهر' : 'Appearance'}</div>
              <div className="p-4 rounded-2xl bg-obsidian border border-white/10">
                <label className="block text-sm font-semibold text-white/85 mb-2">
                  {getTranslation('colorSchemeLabel', lang)}
                </label>
                {/* Three rectangles, each one a free colour picker.

                    The whole rectangle is the input: a native `<input type="color">` stretched
                    over it at zero opacity, so the square, the code and the space around them are
                    one click target and the browser's own colour dialog opens from anywhere on it.
                    `aria-label` rather than a visible caption per tile — the sketch has no room for
                    one, but a screen reader still needs to hear which of the three it is landed on.

                    dir="ltr" is not cosmetic. It puts the square on the left the way the sketch
                    draws it, AND it stops '#' — a bidi-neutral — from jumping to the far end of a
                    code that begins with a letter, which is how #F59E0B came out as F59E0B#. */}
                {/* Three across from `sm` up, stacked below it. Measured on a 360px phone with
                    all three in a row: the tile is 79px wide, the code is 56px, and the swatch
                    plus padding takes 40 of them — so a code centred on the tile lands ON the
                    swatch and cannot be read. Stacked, each tile has the full card width. */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {brandColors.map((c, i) => (
                    <div
                      key={i}
                      dir="ltr"
                      className="relative flex items-center px-3 py-2.5 rounded-xl border border-steel/60 hover:border-orange focus-within:border-orange transition-colors"
                    >
                      {/* One circle, two jobs, never both at once. Empty, it is the hue wheel:
                          a sign that nothing is chosen here and that pressing opens colours.
                          Picked, it IS the colour — which is what was asked for, and it is also
                          the only honest reading, because a wheel sitting on a filled slot says
                          "choose" about a thing already chosen.

                          The ring comes back with the fill, and only with the fill. It is what
                          keeps a near-black pick from vanishing into the card behind it: white/40
                          on obsidian measures 3.77:1, past the 3:1 WCAG 1.4.11 asks of a boundary
                          that identifies a control, where white/30 would be 2.61 and would not.
                          The wheel needs no such ring — it saturates to its own rim and
                          antialiases its own edge — and a ring is exactly what made an earlier
                          version of it read as white-edged. */}
                      {c.value ? (
                        <span
                          aria-hidden="true"
                          className="w-7 h-7 rounded-full border border-white/40 shrink-0"
                          style={{ backgroundColor: c.value }}
                        />
                      ) : (
                        <ColorWheel size={28} />
                      )}
                      {/* Centred on the RECTANGLE, not on the space left over beside the swatch,
                          so the three codes line up with each other down the row whatever size the
                          swatch is. That means taking it out of the flex flow and centring it over
                          the whole tile; `pointer-events-none` keeps the click falling through to
                          the input underneath, which is what opens the picker. */}
                      <span
                        /* The tile is dir="ltr" for the swatch's sake and for the '#'. The empty
                           label is Arabic, and an Arabic phrase ending in a numeral inside an LTR
                           run puts that numeral on the wrong side of the words. dir="auto" reads
                           the first strong character and gets it right in either language. */
                        dir={c.value ? 'ltr' : 'auto'}
                        className={`absolute inset-0 flex items-center justify-center text-sm pointer-events-none ${
                          c.value
                            ? 'font-bold font-mono tracking-wide text-white'
                            : 'font-semibold text-white/55'
                        }`}
                      >
                        {c.value
                          ? c.value.toUpperCase()
                          : isAr
                            ? `اللون ${i + 1}`
                            : `Color ${i + 1}`}
                      </span>
                      <input
                        type="color"
                        /* The dialog needs a value to open at; the STATE stays empty until the
                           customer actually moves it, so opening a picker and closing it again
                           without choosing leaves the tile as it found it. */
                        value={c.value || DEFAULT_BRAND_COLORS[i]}
                        onChange={(e) => c.set(e.target.value)}
                        aria-label={isAr ? `اللون ${i + 1}` : `Color ${i + 1}`}
                        title={isAr ? `اختر اللون ${i + 1}` : `Pick color ${i + 1}`}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/60 leading-relaxed mt-3">
                  {isAr
                    ? 'اضغط على أي مستطيل واختار لونه، ويظهر كوده داخل المستطيل. الألوان اللي تختارها راح نستخدمها بالضبط في تصميم موقعك، وتنطبع أكوادها في عقدك.'
                    : 'Tap any rectangle to pick its colour and its code appears inside it. The colours you pick are the exact ones we use in your design, and their codes are printed in your contract.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-10 p-4 rounded-2xl bg-obsidian border border-white/10">
                {/* Theme Preference */}
                <div>
                  <label className="block text-sm font-semibold text-white/85 mb-2">
                    {isAr ? 'وضع العرض:' : 'Interface Mode:'}
                  </label>
                  {/* "Cosmic" used to be the third option. It named this site's own look rather
                      than anything the customer's build would actually get, so choosing it promised
                      something we do not deliver unless it is genuinely asked for and scoped.
                      "Both" replaces it with a real, buildable choice: the site ships light and
                      dark and lets its visitors switch. */}
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'dark' as const, label: isAr ? 'داكن' : 'Dark' },
                      { id: 'light' as const, label: isAr ? 'فاتح' : 'Light' },
                      { id: 'both' as const, label: isAr ? 'ثنائي' : 'Both' },
                    ]).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setThemePreference(opt.id)}
                        className={`p-2.5 rounded-xl border text-sm font-bold cursor-pointer transition-all ${
                          themePreference === opt.id
                            ? 'bg-orange border-white text-obsidian'
                            : 'bg-obsidian border-white/10 text-white/60 hover:border-orange'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Support */}
                <div>
                  <label className="block text-sm font-semibold text-white/85 mb-2">
                    {getTranslation('languageSupportLabel', lang)}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'ar' as const, label: getTranslation('langAr', lang) },
                      { id: 'en' as const, label: getTranslation('langEn', lang) },
                      { id: 'ar_en' as const, label: isAr ? 'ثنائي' : 'Both' },
                    ]).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setLanguageSupport(opt.id)}
                        title={opt.label}
                        className={`p-2.5 rounded-xl border text-sm font-bold cursor-pointer transition-all truncate ${
                          languageSupport === opt.id
                            ? 'bg-orange border-white text-obsidian'
                            : 'bg-obsidian border-white/10 text-white/60 hover:border-orange'
                        }`}
                      >
                        {opt.label}
                       </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description — after the appearance/customization block so the custom flow reads
                  name → customization → description (per request). Template flow has no name,
                  so it is simply customization → description. */}
              {isCustomProject ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-white/85 mb-2">
                      {isAr ? 'صف مشروعك بالتفصيل الكامل' : 'Describe your project in full detail'} *
                    </label>
                    <p className="text-xs text-white/60 leading-relaxed mb-2">
                      {isAr
                        ? 'اكتب كل ما يخطر ببالك: الصفحات والأقسام المطلوبة، الميزات، الجمهور المستهدف، أمثلة مواقع تعجبك، وأي تفاصيل تساعدنا على فهم رؤيتك قبل تسعير المشروع.'
                        : 'Write everything that comes to mind: the pages/sections you need, features, target audience, sites you like as references, and any detail that helps us fully understand your vision before pricing the project.'}
                    </p>
                    <textarea
                      required
                      rows={8}
                      value={customFeaturesText}
                      onChange={(e) => {
                        setCustomFeaturesText(e.target.value);
                        clearFieldError('customDescription');
                      }}
                      placeholder={isAr ? 'اكتب وصفك التفصيلي هنا...' : 'Write your detailed description here...'}
                      className={`w-full p-3.5 rounded-xl bg-obsidian border focus:outline-none text-white text-sm leading-relaxed transition-colors ${errorInputClass('customDescription')}`}
                    />
                  </div>

                  {/* `white-warm`/`surface-light`, the current names — `sand`/`sand-light` still
                      resolve to the exact same values through a legacy alias, but a reader
                      shouldn't have to know that three identities' worth of renaming happened to
                      find out what colour this actually is. */}
                  <div className="p-3.5 rounded-xl bg-white-warm/10 border border-white-warm/40 text-xs leading-relaxed text-surface-light">
                    {isAr
                      ? 'لا يوجد سعر مسبق لمشروع مخصص — سيراجع فريقنا وصفك ويرسل لك عرض سعر ومدة تنفيذ مناسبة بعد تقديم الطلب.'
                      : 'A custom project has no upfront price — our team will review your description and send back a quote and timeline after you submit.'}
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-2xl bg-obsidian/60 border-2 border-dashed border-steel/60 space-y-2.5">
                  <label className="flex items-center gap-2 text-sm font-bold text-white">
                    <PenLine className="w-4 h-4 shrink-0" />
                    <span>{isAr ? 'وصف القالب والمطلوب تنفيذه' : 'Template description & what you need built'}</span>
                  </label>
                  <textarea
                    rows={4}
                    value={customFeaturesText}
                    onChange={(e) => setCustomFeaturesText(e.target.value)}
                    placeholder={getTranslation('customFeaturesPlaceholder', lang)}
                    className="w-full p-3.5 rounded-xl bg-obsidian border border-steel/60 focus:border-orange focus:outline-none text-white text-sm leading-relaxed"
                  />
                </div>
              )}

              {/* ── Live project spec outline ── placed LAST (per request): the customer fills the
                  inputs first, then reads the assembled summary at the bottom. Reads the same state
                  the contract is assembled from, so it can never disagree with what is sent. */}
              <div className="p-4 rounded-2xl bg-white/5 border border-steel/60 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <FileCheck className="w-4 h-4 text-orange" />
                  {isAr ? 'ملخّص مواصفات مشروعك' : 'Project Spec Outline'}
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
                  <div className="flex flex-col min-w-0">
                    <dt className="text-white/55">{isAr ? 'المشروع' : 'Project'}</dt>
                    <dd className="font-bold text-white truncate">{isCustomProject ? (customProjectName.trim() || (isAr ? 'مشروع مخصص' : 'Custom')) : template.title}</dd>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <dt className="text-white/55">{isAr ? 'النوع' : 'Type'}</dt>
                    <dd className="font-bold text-white truncate">
                      {projectType === 'app' ? (isAr ? 'تطبيق هاتف' : 'Mobile App') : (isAr ? 'موقع إلكتروني' : 'Website')}
                    </dd>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <dt className="text-white/55">{isAr ? 'الألوان' : 'Colors'}</dt>
                    {/* Only the colours actually picked, so this row cannot claim three
                        answers when one was given — and a dash when none were, rather than three
                        empty circles, which would read as three failed swatches.

                        Swatches only, no codes: three hexes side by side would not fit this
                        column, and the codes are already shown on the tiles above and printed in
                        the contract itself. The title attribute keeps them reachable. */}
                    <dd className="font-bold text-white flex items-center gap-1.5">
                      {brandColors.some((c) => c.value) ? (
                        brandColors
                          .filter((c) => c.value)
                          .map((c, i) => (
                            <span
                              key={i}
                              title={c.value.toUpperCase()}
                              className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                              style={{ backgroundColor: c.value }}
                            />
                          ))
                      ) : (
                        <span className="text-white/40">—</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-white/55">{isAr ? 'الوضع' : 'Mode'}</dt>
                    <dd className="font-bold text-white">{themePreference === 'dark' ? (isAr ? 'داكن' : 'Dark') : themePreference === 'light' ? (isAr ? 'فاتح' : 'Light') : (isAr ? 'ثنائي' : 'Both')}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-white/55">{isAr ? 'اللغات' : 'Languages'}</dt>
                    <dd className="font-bold text-white">{languageSupport === 'ar' ? (isAr ? 'عربي' : 'Arabic') : languageSupport === 'en' ? (isAr ? 'إنجليزي' : 'English') : (isAr ? 'ثنائي' : 'Both')}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-white/55">{isAr ? 'مدة التنفيذ' : 'Delivery'}</dt>
                    <dd className="font-bold text-white">{isAr ? arCount(deliveryTimelineWeeks, 'أسبوع واحد', 'أسبوعان', 'أسابيع', 'أسبوعاً') : `${deliveryTimelineWeeks} wks`}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-white/55">{isAr ? 'السعر' : 'Price'}</dt>
                    <dd className="font-bold text-white">{isCustomProject ? (isAr ? 'بعد المراجعة' : 'Later') : formatPrice(totalPriceIQD, lang, currency)}</dd>
                  </div>
                </dl>
              </div>

            </div>
          )}


          {/* STEP 3: terms, signature, then the figure — the whole close, on one screen.
              Price last, immediately above the button that commits to it: the customer reads the
              clauses, signs, then sees exactly what they are agreeing to pay and ticks one box
              covering both. It sat at the top before, which meant the number had scrolled away by
              the time anyone pressed the button. */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-white" />
                  <span>{getTranslation('stepSignature', lang)}</span>
                </h3>
              </div>

              {/* The agreement itself, in full, immediately above the pad that signs it.
                  A customer should never have to take on trust what they are signing, and
                  the clauses printed as section 4 of their PDF are exactly these — same
                  module, same order, so the two cannot drift apart (src/data/contractTerms.ts).
                  `data-lenis-prevent` because this box scrolls internally: without it the
                  smooth-scroll wrapper takes the wheel and moves the page behind instead. */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-bold text-white/85">
                    {isAr ? 'بنود العقد — يُرجى قراءتها قبل التوقيع:' : 'Contract terms — please read before signing:'}
                  </label>
                  <span className="text-xs text-white/60 shrink-0">
                    {isAr ? arCount(terms.length, 'بند واحد', 'بندان', 'بنود', 'بنداً') : `${terms.length} clauses`}
                  </span>
                </div>

                <div
                  data-lenis-prevent
                  className="max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-obsidian p-4"
                >
                  <ol className="list-decimal space-y-2.5 ps-4 marker:font-bold marker:text-white/60">
                    {terms.map((term, i) => (
                      <li key={i} className="text-sm leading-relaxed text-white/85">
                        {term}
                      </li>
                    ))}
                  </ol>
                </div>

                <p className="text-xs leading-relaxed text-white/60">
                  {isAr
                    ? 'توقيعك أدناه إقرار بأنك قرأت البنود أعلاه ووافقت عليها، ويُطبع توقيعك ضمن نسخة عقدك.'
                    : 'Signing below acknowledges that you have read and accepted the terms above; they are printed in your contract copy.'}
                </p>
              </div>

              <div className="space-y-2" ref={signaturePadRef}>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white/85">
                    {isAr ? 'توقيعك:' : 'Live Digital Signature Pad:'}
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="flex items-center gap-1 text-xs text-white/60 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{getTranslation('clearSignature', lang)}</span>
                  </button>
                </div>

                <div
                  className={`relative rounded-2xl overflow-hidden border-2 border-dashed bg-obsidian transition-colors ${
                    signatureMissing ? 'border-white ring-2 ring-white/40' : 'border-steel/60'
                  }`}
                >
                  <canvas
                    ref={canvasRef}
                    width={700}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-36 cursor-crosshair touch-none"
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-white/60 text-sm font-semibold">
                      {isAr ? '[ ارسم توقيعك هنا ]' : '[ Draw your signature here ]'}
                    </div>
                  )}
                </div>

                {/* Three states, not two: signed, explicitly flagged as missing after a
                    submit attempt, and simply not signed yet. The last one is not a failure —
                    nobody has done anything wrong on first arriving at this step — so it
                    states the requirement plainly instead of in red. */}
                {hasSignature ? (
                  <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: SUCCESS }}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{isAr ? 'تم التوقيع — يمكنك الآن إتمام العقد.' : 'Signed — you can now complete the contract.'}</span>
                  </p>
                ) : signatureMissing ? (
                  <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: ERROR }}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{isAr ? 'التوقيع مطلوب لإتمام العقد — ارسم توقيعك في المساحة أعلاه.' : 'A signature is required to complete the contract — draw yours in the area above.'}</span>
                  </p>
                ) : (
                  <p className="text-xs text-white/60 flex items-center gap-1.5">
                    <PenLine className="w-3.5 h-3.5 shrink-0" />
                    <span>{isAr ? 'التوقيع مطلوب لإتمام العقد.' : 'A signature is required to complete the contract.'}</span>
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-obsidian border border-white/10 text-sm text-white/85 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 rounded bg-graphite border-steel/60 text-white focus:ring-white cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-white leading-relaxed">
                    {getTranslation('agreeTermsCheckbox', lang)}
                  </span>
                </label>
              </div>

              {/* The figure, last and alone. One number, not a breakdown: with the priced add-on
                  list gone the base price and the total are the same amount by definition, and
                  printing it twice under two headings only invites the question of why they
                  differ. Nothing follows it but the button that commits to it. */}
              {isCustomProject ? (
                <div className="p-5 rounded-2xl bg-obsidian border border-white/10 space-y-2">
                  <div className="text-base font-bold text-white">
                    {isAr ? 'مشروع مخصص — السعر يُحدَّد بعد المراجعة' : 'Custom Project — price to be quoted after review'}
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {isAr
                      ? 'سيراجع فريقنا الوصف الذي كتبته في الخطوة السابقة ويتواصل معك بعرض سعر ومدة تنفيذ دقيقة بعد تقديم الطلب.'
                      : 'Our team will review the description you wrote in the previous step and follow up with an accurate quote and timeline after you submit.'}
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-obsidian border border-white/10 flex items-center justify-between gap-3">
                  <span className="text-base font-bold text-white">{getTranslation('totalCostSummary', lang)}</span>
                  <span className="text-xl text-white font-extrabold tabular-nums">
                    {formatPrice(totalPriceIQD, lang, currency)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Form Navigation Buttons */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            {currentStep > 1 ? (
              /* Back is the quiet one. All three buttons in this bar were the same solid fill,
                 so a three-step form gave no clue which way it wanted you to go. */
              <NqButton
                tone="chrome"
                variant="quiet"
                size="sm"
                radius="xl"
                onClick={() => setCurrentStep(currentStep - 1)}
                icon={<ArrowRight className={`w-4 h-4 ${!isAr ? 'rotate-180' : ''}`} />}
              >
                {isAr ? 'الخطوة السابقة' : 'Previous Step'}
              </NqButton>
            ) : <div />}

            {currentStep < 3 ? (
              <NqButton
                tone="chrome"
                variant="solid"
                size="sm"
                radius="xl"
                onClick={() => {
                  if (currentStep === 1) {
                    const missing = new Set<string>();
                    if (!companyName) missing.add('companyName');
                    if (!repName) missing.add('repName');
                    if (!phone) missing.add('phone');
                    if (missing.size > 0) {
                      setFieldErrors(missing);
                      showToast(
                        isAr ? 'يرجى إكمال البيانات الأساسية أولاً (الحقول الناقصة محدّدة بالأحمر)' : 'Please complete the required basic info first (highlighted in red)',
                        'error'
                      );
                      return;
                    }
                    // A present-but-wrong number was let through here and only rejected at
                    // submit, three steps later — by which point the field that caused it is
                    // off-screen. Caught on the step that owns it instead.
                    if (!isValidIraqiPhone(phone)) {
                      setFieldErrors(new Set(['phone']));
                      showToast(
                        isAr ? 'رقم الهاتف يجب أن يبدأ بـ 07 ويتكوّن من 11 رقماً' : 'The phone number must start with 07 and be 11 digits',
                        'error'
                      );
                      return;
                    }
                  }
                  if (currentStep === 2 && isCustomProject && (!customProjectName.trim() || !customFeaturesText.trim())) {
                    const missingCustom = new Set<string>();
                    if (!customProjectName.trim()) missingCustom.add('customProjectName');
                    if (!customFeaturesText.trim()) missingCustom.add('customDescription');
                    setFieldErrors(missingCustom);
                    showToast(
                      isAr ? 'يرجى تسمية مشروعك ووصفه أولاً (الحقول الناقصة محدّدة بالأحمر)' : 'Please name and describe your project first (highlighted in red)',
                      'error'
                    );
                    return;
                  }
                  setCurrentStep(currentStep + 1);
                  cosmicAudio.playPing();
                }}
                trailing={<ArrowLeft className={`w-4 h-4 ${!isAr ? 'rotate-180' : ''}`} />}
              >
                {isAr ? 'الخطوة التالية' : 'Next Step'}
              </NqButton>
            ) : (
              // Disabled until the contract is genuinely signable, rather than letting it be
              // pressed and answered with an error. handleSubmit still re-checks every one of
              // these conditions: this button is the honest signal, not the enforcement — a
              // disabled attribute is trivially removed in devtools and says nothing about
              // what the form does with the data.
              <NqButton
                type="submit"
                tone="chrome"
                variant="solid"
                size="md"
                radius="xl"
                disabled={!canSubmit}
                title={
                  canSubmit
                    ? undefined
                    : isAr
                      ? 'أكمل رقم الهاتف والموافقة والتوقيع أولاً'
                      : 'Complete the signature, approval and phone number first'
                }
                className="sm:text-sm"
                icon={<FileCheck className="w-4 h-4" />}
              >
                {getTranslation('generateContractBtn', lang)}
              </NqButton>
            )}
          </div>

        </form>

      </div>
    </section>
  );
};
