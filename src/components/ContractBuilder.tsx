import React, { useState, useRef, useEffect } from 'react';
import { Template, ContractData, CUSTOM_PROJECT_TEMPLATE_ID } from '../types';
import { useLiveTemplates } from '../lib/pricingOverrides';
import {
  FileSignature,
  Building2,
  CheckSquare,
  RotateCcw,
  Layers,
  ArrowLeft,
  ArrowRight,
  FileCheck,
  PenLine,
  Pipette,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cosmicAudio } from '../lib/audio';
import { Language, getTranslation } from '../lib/i18n';
import { formatPrice, Currency } from '../lib/currency';
import { showToast } from '../lib/toast';
import { NqButton } from './ui/NqButton';
import { loadContractDraft, saveContractDraft } from '../lib/contractDraft';
import { useSignaturePad } from '../lib/useSignaturePad';
import { contractTerms } from '../data/contractTerms';

interface ContractBuilderProps {
  selectedTemplate: Template | null;
  onContractGenerated: (contract: ContractData) => void;
  language?: Language;
  currency?: Currency;
  initialCustomFeaturesText?: string;
  initialPrimaryColor?: string;
  accountEmail?: string | null;
  accountUid?: string | null;
}

const PRESET_COLORS = [
  { hex: '#8b5cf6', labelAr: 'بنفسجي', labelEn: 'Purple' },
  { hex: '#10b981', labelAr: 'زمردي', labelEn: 'Emerald' },
  { hex: '#06b6d4', labelAr: 'سماوي', labelEn: 'Cyan' },
  { hex: '#f59e0b', labelAr: 'ذهبي', labelEn: 'Amber' },
  { hex: '#f43f5e', labelAr: 'ياقوتي', labelEn: 'Rose' },
  { hex: '#71717a', labelAr: 'رمادي', labelEn: 'Monochrome' },
];

export const ContractBuilder: React.FC<ContractBuilderProps> = ({
  selectedTemplate,
  onContractGenerated,
  language = 'ar' as Language,
  currency = 'IQD',
  initialCustomFeaturesText,
  initialPrimaryColor,
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
  const [email] = useState(draft?.email || accountEmail || '');
  const [phone, setPhone] = useState(draft?.phone || '');
  const city = draft?.city || 'بغداد';
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

  const errorInputClass = (field: string) =>
    fieldErrors.has(field)
      ? 'border-red-600 focus:border-red-500 ring-1 ring-red-600/40'
      : 'border-periwinkle/30 focus:border-periwinkle';

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
  const [isCustomProject, setIsCustomProject] = useState(draft?.isCustomProject ?? !selectedTemplate);
  const [customProjectName, setCustomProjectName] = useState(draft?.customProjectName || '');
  const [primaryColor, setPrimaryColor] = useState(draft?.primaryColor || '#8b5cf6');
  const isCustomColor = !PRESET_COLORS.some((c) => c.hex === primaryColor);
  const customColorInputRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    if (selectedTemplate) {
      setIsCustomProject(false);
      setTemplate(selectedTemplate);
      if (initialCustomFeaturesText) setCustomFeaturesText(initialCustomFeaturesText);
      if (initialPrimaryColor) setPrimaryColor(initialPrimaryColor);
    }
  }, [selectedTemplate, initialCustomFeaturesText, initialPrimaryColor]);

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
      themePreference,
      languageSupport,
      isCustomProject,
      customProjectName,
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
    themePreference,
    languageSupport,
    isCustomProject,
    customProjectName,
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
        isAr ? 'يرجى تعبئة كافة بيانات الشركة المطلوبة في الخطوة الأولى (محدّدة باللون الأحمر)' : 'Please complete the required company details in step 1 (highlighted in red)',
        'error'
      );
      setCurrentStep(1);
      return;
    }

    if (!isValidIraqiPhone(phone)) {
      setFieldErrors(new Set(['phone']));
      showToast(
        isAr ? 'خطأ في رقم الهاتف: يجب أن يبدأ رقم الهاتف العراقي بـ 07 ويتكون من 11 رقماً بالضبط' : 'Invalid Iraqi phone number format. Must start with 07 and be 11 digits.',
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
        isAr ? 'يرجى تسمية مشروعك ووصفه بالتفصيل في الخطوة الثانية (محدّدة باللون الأحمر)' : 'Please name and describe your project in detail in step 2 (highlighted in red)',
        'error'
      );
      setCurrentStep(2);
      return;
    }

    if (!agreedToTerms) {
      showToast(isAr ? 'يرجى الموافقة على الشروط والأحكام العامة للبدء' : 'Please accept the terms and conditions', 'error');
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
      customFeaturesText,
      primaryColor,
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
        
        {/* Section Title */}
        <div className="text-center mb-5">
          <h2 className="text-xl sm:text-3xl font-extrabold text-white mb-1.5">
            {getTranslation('builderTitle', lang)}
          </h2>
          <p className="text-white/70 text-xs sm:text-sm max-w-2xl mx-auto">
            {getTranslation('builderSubtext', lang)}
          </p>
        </div>

        {/* Phase stepper — the three phases of building a contract. Each is clickable so a
            customer can jump back to a phase they want to revisit; the active one is filled
            periwinkle, a finished one turns sand with a check, and the next is dim until reached.
            Three phases, not four: pricing/terms and the signature used to be separate screens,
            which meant the customer agreed to a figure on one page and signed on another with the
            figure no longer in front of them. They are one phase: read the price, read the
            clauses, sign, send. */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6">
          {[
            { step: 1, title: isAr ? 'بيانات الشركة' : 'Company Details', icon: Building2, phase: isAr ? 'المرحلة الأولى' : 'Phase one' },
            { step: 2, title: isAr ? 'مواصفات القالب' : 'Template Specs', icon: Layers, phase: isAr ? 'المرحلة الثانية' : 'Phase two' },
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
          ? 'bg-periwinkle border-periwinkle text-white shadow-lg shadow-periwinkle/25'
          : isCompleted
          ? 'bg-[#080A0D] border-white/70 text-white shadow-lg shadow-black/50'
          : 'bg-[#071431] border-periwinkle/20 text-white/50 hover:border-periwinkle/40'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isCurrent ? 'bg-white text-periwinkle' : isCompleted ? 'bg-white text-[#080A0D]' : 'bg-white/10 text-white/60'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-mono opacity-70">{s.phase}</span>
                  <span className="block text-[11px] sm:text-xs font-bold truncate">{s.title}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmitContract} className="bg-[#171E42] border border-periwinkle/30 p-4 sm:p-6 rounded-3xl space-y-5 shadow-2xl">
          
          {/* STEP 1: Company Details */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-periwinkle/25 pb-4">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-white" />
                  <span>{getTranslation('stepCompanyInfo', lang)}</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/85 mb-1.5">
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
                    className={`w-full px-4 py-3 rounded-xl bg-[#071431] border focus:outline-none text-white text-xs transition-colors ${errorInputClass('companyName')}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/85 mb-1.5">
                    {getTranslation('crNumberLabel', lang)}
                  </label>
                  <input
                    type="text"
                    value={crNumber}
                    onChange={(e) => setCrNumber(e.target.value)}
                    placeholder={getTranslation('crNumberPlaceholder', lang)}
                    className="w-full px-4 py-3 rounded-xl bg-[#071431] border border-periwinkle/25 focus:border-periwinkle focus:outline-none text-white text-xs font-mono"
                  />
                  {/* Said outright rather than left to the absence of a `*`: plenty of clients
                      here are individuals or new businesses with no commercial register at
                      all, and a blank field with no explanation reads as something they are
                      missing rather than something they can skip. */}
                  <p className="text-[11px] text-white/60 mt-1">
                    {isAr
                      ? 'يمكنك تركه فارغاً إذا لم يكن لديك سجل تجاري.'
                      : 'Leave blank if you do not have a commercial register.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/85 mb-1.5">
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
                    className={`w-full px-4 py-3 rounded-xl bg-[#071431] border focus:outline-none text-white text-xs transition-colors ${errorInputClass('repName')}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/85 mb-1.5">
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
                    className={`w-full px-4 py-3 rounded-xl bg-[#071431] border focus:outline-none text-white text-xs font-mono transition-colors ${
                      phoneError
                        ? 'border-red-600 focus:border-red-500 ring-1 ring-red-600/40'
                        : errorInputClass('phone')
                    }`}
                  />
                  {phoneError ? (
                    <p className="text-[11px] font-bold text-red-500 mt-1 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{phoneError}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/60 mt-1">
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
              <div className="border-b border-periwinkle/25 pb-4">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-periwinkle" />
                  <span>{getTranslation('stepTechSpecs', lang)}</span>
                </h3>
                <p className="text-white/55 text-[11px] sm:text-xs mt-1.5 max-w-2xl">
                  {isAr
                    ? 'اختر القالب وصف ما تريد تنفيذه — وتابع مواصفات مشروعك تتحدّث مباشرة في البطاقة أعلاه.'
                    : 'Pick a template and describe what to build — your spec updates live in the card above.'}
                </p>
              </div>


              <div className="p-4 rounded-2xl bg-[#071431] border border-periwinkle/25 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {isCustomProject ? (
                    <div className="w-16 h-16 rounded-xl bg-periwinkle/25 border border-periwinkle/40 flex items-center justify-center shrink-0">
                      <PenLine className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <img
                      src={template.previewImage}
                      alt={template.title}
                      className="w-16 h-16 rounded-xl object-cover border border-periwinkle/40"
                    />
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-white bg-periwinkle/25 border border-periwinkle/40 px-2.5 py-0.5 rounded-full">
                      {isCustomProject ? (isAr ? 'مشروع مخصص بالكامل' : 'Fully Custom Project') : template.categoryLabel}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1">
                      {isCustomProject ? (isAr ? 'صف مشروعك بنفسك بالأسفل' : 'Describe your project below') : template.title}
                    </h4>
                  </div>
                </div>

                <select
                  value={isCustomProject ? CUSTOM_OPTION_VALUE : template.id}
                  onChange={(e) => {
                    if (e.target.value === CUSTOM_OPTION_VALUE) {
                      setIsCustomProject(true);
                      return;
                    }
                    const found = templatesData.find(t => t.id === e.target.value);
                    if (found) {
                      setIsCustomProject(false);
                      setTemplate(found);
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B1130] border border-periwinkle/40 text-white text-xs font-semibold"
                >
                  <option value={CUSTOM_OPTION_VALUE}>
                    {isAr ? '✏️ قالب مخصص بالكامل — صف مشروعك بنفسك' : '✏️ Fully Custom Project — describe it yourself'}
                  </option>
                  {templatesData.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({formatPrice(t.basePriceIQD, lang, currency)})
                    </option>
                  ))}
                </select>
              </div>

              {isCustomProject && (
                <div>
                  <label className="block text-xs font-semibold text-white/85 mb-1.5">
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
                    className={`w-full px-4 py-3 rounded-xl bg-[#071431] border focus:outline-none text-white text-xs transition-colors ${errorInputClass('customProjectName')}`}
                  />
                </div>
              )}


              {/* Appearance — the whole "what it looks like" group in one labelled card. */}
              <div className="text-white font-bold text-sm mt-1">{isAr ? 'تخصيص المظهر' : 'Appearance'}</div>
              <div className="p-4 rounded-2xl bg-[#071431] border border-periwinkle/25">
                <label className="block text-xs font-semibold text-white/85 mb-2">
                  {getTranslation('colorSchemeLabel', lang)}
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setPrimaryColor(c.hex)}
                      title={isAr ? c.labelAr : c.labelEn}
                      className={`w-9 h-9 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center ${
                        !isCustomColor && primaryColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-periwinkle/40 hover:border-periwinkle/60'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {!isCustomColor && primaryColor === c.hex && <CheckSquare className="w-4 h-4 text-white" />}
                    </button>
                  ))}

                  {/* Custom color — a native <input type="color"> gives the customer a full
                      OS/browser color picker instead of being limited to the presets above;
                      the swatch button just proxies a click through to the hidden input. */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => customColorInputRef.current?.click()}
                      title={isAr ? 'لون مخصص' : 'Custom Color'}
                      className={`w-9 h-9 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-center overflow-hidden ${
                        isCustomColor ? 'border-white scale-110 shadow-lg' : 'border-periwinkle/40 hover:border-periwinkle/60'
                      }`}
                      style={isCustomColor ? { backgroundColor: primaryColor } : undefined}
                    >
                      {isCustomColor ? (
                        <CheckSquare className="w-4 h-4 text-white drop-shadow" />
                      ) : (
                        <Pipette className="w-4 h-4 text-white/60" />
                      )}
                    </button>
                    <input
                      ref={customColorInputRef}
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      title={isAr ? 'اختر لوناً مخصصاً' : 'Pick a custom color'}
                      className="absolute inset-0 w-9 h-9 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                {isCustomColor && (
                  <p className="text-[11px] text-white/45 mt-2">
                    {isAr
                      ? `سنستخدم هذا اللون بالضبط (${primaryColor}) في تصميم موقعك.`
                      : `We'll use this exact color (${primaryColor}) in your site's design.`}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#071431] border border-periwinkle/25">
                {/* Theme Preference */}
                <div>
                  <label className="block text-xs font-semibold text-white/85 mb-1.5">
                    {isAr ? 'نمط الوضع (فاتح/داكن):' : 'Interface Mode:'}
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
                        className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          themePreference === opt.id
                            ? 'bg-periwinkle border-white text-white'
                            : 'bg-[#071431] border-periwinkle/25 text-white/60 hover:border-periwinkle/60'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Support */}
                <div>
                  <label className="block text-xs font-semibold text-white/85 mb-1.5">
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
                        className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all truncate ${
                          languageSupport === opt.id
                            ? 'bg-periwinkle border-white text-white'
                            : 'bg-[#071431] border-periwinkle/25 text-white/60 hover:border-periwinkle/60'
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
                    <label className="block text-xs font-semibold text-white/85 mb-1.5">
                      {isAr ? 'صف مشروعك بالتفصيل الكامل' : 'Describe your project in full detail'} *
                    </label>
                    <p className="text-[11px] text-white/60 mb-2">
                      {isAr
                        ? 'اكتب كل ما يخطر ببالك: الصفحات والأقسام المطلوبة، الميزات، الجمهور المستهدف، أمثلة مواقع تعجبك، وأي تفاصيل تساعدنا نفهم رؤيتك تماماً قبل تسعير المشروع.'
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
                      placeholder={isAr ? 'اكتب وصفك التفصيلية هنا...' : 'Write your detailed description here...'}
                      className={`w-full p-3.5 rounded-xl bg-[#071431] border focus:outline-none text-white text-xs leading-relaxed transition-colors ${errorInputClass('customDescription')}`}
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-sand/10 border border-sand/40 text-[11px] text-sand-light">
                    {isAr
                      ? 'لا يوجد سعر مسبق لمشروع مخصص — سيراجع فريقنا وصفك ويرسل لك عرض سعر ومدة تنفيذ مناسبة بعد تقديم الطلب.'
                      : 'A custom project has no upfront price — our team will review your description and send back a quote and timeline after you submit.'}
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#071431]/60 border-2 border-dashed border-periwinkle/40 space-y-2.5">
                  <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                    <PenLine className="w-4 h-4 shrink-0" />
                    <span>{isAr ? 'وصف القالب والمطلوب تنفيذه' : 'Template description & what you need built'}</span>
                  </label>
                  <textarea
                    rows={4}
                    value={customFeaturesText}
                    onChange={(e) => setCustomFeaturesText(e.target.value)}
                    placeholder={getTranslation('customFeaturesPlaceholder', lang)}
                    className="w-full p-3.5 rounded-xl bg-[#071431] border border-periwinkle/25 focus:border-periwinkle focus:outline-none text-white text-xs"
                  />
                </div>
              )}

              {/* ── Live project spec outline ── placed LAST (per request): the customer fills the
                  inputs first, then reads the assembled summary at the bottom. Reads the same state
                  the contract is assembled from, so it can never disagree with what is sent. */}
              <div className="p-4 rounded-2xl bg-periwinkle/10 border border-periwinkle/40 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <FileCheck className="w-4 h-4 text-periwinkle" />
                  {isAr ? 'مخطط مواصفات المشروع' : 'Project Spec Outline'}
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-xs">
                  <div className="flex flex-col min-w-0">
                    <dt className="text-white/55">{isAr ? 'نوع المشروع' : 'Project'}</dt>
                    <dd className="font-bold text-white truncate">{isCustomProject ? (customProjectName.trim() || (isAr ? 'مشروع مخصص' : 'Custom')) : template.title}</dd>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <dt className="text-white/55">{isAr ? 'اللون الرئيسي' : 'Color'}</dt>
                    <dd className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-md border border-white/30 shrink-0" style={{ backgroundColor: primaryColor }} />
                      <span className="font-mono truncate">{primaryColor.toUpperCase()}</span>
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
                    <dd className="font-bold text-white">{deliveryTimelineWeeks} {isAr ? 'أسبوع' : 'wks'}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-white/55">{isAr ? 'السعر' : 'Price'}</dt>
                    <dd className="font-bold text-white">{isCustomProject ? (isAr ? 'لاحقاً' : 'Later') : formatPrice(totalPriceIQD, lang, currency)}</dd>
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
              <div className="border-b border-periwinkle/25 pb-4">
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
                  <label className="text-xs font-bold text-white/85">
                    {isAr ? 'بنود العقد — يُرجى قراءتها قبل التوقيع:' : 'Contract terms — please read before signing:'}
                  </label>
                  <span className="text-[11px] text-white/45 shrink-0">
                    {terms.length} {isAr ? 'بنداً' : 'clauses'}
                  </span>
                </div>

                <div
                  data-lenis-prevent
                  className="max-h-72 overflow-y-auto rounded-2xl border border-periwinkle/25 bg-[#071431] p-4"
                >
                  <ol className="list-decimal space-y-2.5 ps-4 marker:font-bold marker:text-white/45">
                    {terms.map((term, i) => (
                      <li key={i} className="text-[11px] leading-relaxed text-white/85">
                        {term}
                      </li>
                    ))}
                  </ol>
                </div>

                <p className="text-[11px] text-white/45">
                  {isAr
                    ? 'توقيعك أدناه إقرار بأنك قرأت البنود أعلاه ووافقت عليها، وستُطبع ضمن نسخة عقدك.'
                    : 'Signing below acknowledges that you have read and accepted the terms above; they are printed in your contract copy.'}
                </p>
              </div>

              <div className="space-y-2" ref={signaturePadRef}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white/85">
                    {isAr ? 'لوحة التوقيع الحي:' : 'Live Digital Signature Pad:'}
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{getTranslation('clearSignature', lang)}</span>
                  </button>
                </div>

                <div
                  className={`relative rounded-2xl overflow-hidden border-2 border-dashed bg-[#071431] transition-colors ${
                    signatureMissing ? 'border-white ring-2 ring-white/40' : 'border-periwinkle/40'
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
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-white/45 text-xs font-semibold">
                      {isAr ? '[ ارسم توقيعك هنا ]' : '[ Draw your signature here ]'}
                    </div>
                  )}
                </div>

                {/* Three states, not two: signed, explicitly flagged as missing after a
                    submit attempt, and simply not signed yet. The last one is not a failure —
                    nobody has done anything wrong on first arriving at this step — so it
                    states the requirement plainly instead of in red. */}
                {hasSignature ? (
                  <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{isAr ? 'تم التوقيع — يمكنك الآن إتمام العقد.' : 'Signed — you can now complete the contract.'}</span>
                  </p>
                ) : signatureMissing ? (
                  <p className="text-[11px] font-bold text-red-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{isAr ? 'التوقيع مطلوب لإتمام العقد — ارسم توقيعك في المساحة أعلاه.' : 'A signature is required to complete the contract — draw yours in the area above.'}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-white/60 flex items-center gap-1.5">
                    <PenLine className="w-3.5 h-3.5 shrink-0" />
                    <span>{isAr ? 'التوقيع مطلوب لإتمام العقد.' : 'A signature is required to complete the contract.'}</span>
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[#071431] border border-periwinkle/25 text-xs text-white/85 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#0B1130] border-periwinkle/40 text-white focus:ring-white cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-white">
                    {getTranslation('agreeTermsCheckbox', lang)}
                  </span>
                </label>
              </div>

              {/* The figure, last and alone. One number, not a breakdown: with the priced add-on
                  list gone the base price and the total are the same amount by definition, and
                  printing it twice under two headings only invites the question of why they
                  differ. Nothing follows it but the button that commits to it. */}
              {isCustomProject ? (
                <div className="p-5 rounded-2xl bg-[#071431] border border-periwinkle/25 space-y-2">
                  <div className="text-sm font-bold text-white">
                    {isAr ? 'مشروع مخصص — السعر يُحدَّد بعد المراجعة' : 'Custom Project — price to be quoted after review'}
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">
                    {isAr
                      ? 'سيراجع فريقنا الوصف الذي كتبته في الخطوة السابقة ويتواصل معك بعرض سعر ومدة تنفيذ دقيقة بعد تقديم الطلب.'
                      : 'Our team will review the description you wrote in the previous step and follow up with an accurate quote and timeline after you submit.'}
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-[#071431] border border-periwinkle/25 font-mono flex items-center justify-between gap-3">
                  <span className="text-base font-bold text-white">{getTranslation('totalCostSummary', lang)}</span>
                  <span className="text-xl text-white font-extrabold">
                    {formatPrice(totalPriceIQD, lang, currency)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Form Navigation Buttons */}
          <div className="pt-4 border-t border-periwinkle/25 flex items-center justify-between">
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
                        isAr ? 'يرجى تعبئة كافة البيانات الأساسية المكتملة أولاً (محدّدة باللون الأحمر)' : 'Please complete the required basic info first (highlighted in red)',
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
                        isAr ? 'رقم الهاتف يجب أن يبدأ بـ 07 ويتكون من 11 رقماً' : 'The phone number must start with 07 and be 11 digits',
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
                      isAr ? 'يرجى تسمية مشروعك ووصفه بالتفصيل أولاً (محدّدة باللون الأحمر)' : 'Please name and describe your project first (highlighted in red)',
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
                      ? 'أكمل التوقيع والموافقة ورقم الهاتف أولاً'
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
