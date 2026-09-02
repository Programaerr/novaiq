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
  Smartphone,
  FileText,
  ChevronDown,
  ImagePlus,
  X
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
import { compressLogoFile, CONTRACT_LOGO_MAX_WIDTH, LOGO_MAX_DATA_URL } from '../lib/logoFile';
import { trackEvent } from '../lib/analytics';
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
      : 'border-steel/60 focus:border-orange-on-dark';

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
  /* شعار العميل.
   *
   * اختياري، ويُطبع في عقده كما رفعه بالضبط — بلا قصّ ولا إعادة تلوين ولا وضعه في إطار من
   * ألواننا: هو علامته هو، والعقد وثيقة الطرفين لا لوحة إعلانية لنا.
   *
   * يُصغَّر ويُضغَط في المتصفح قبل الحفظ (lib/logoFile.ts). صورة هاتف بحجم أربعة ميغابايت
   * تتجاوز وحدها سقف مستند Firestore، والرفض حينها كان سيقع بعد أن يوقّع العميل — أي بعد أن
   * يظنّ أنه أنهى كل شيء. */
  const [clientLogoDataUrl, setClientLogoDataUrl] = useState(draft?.clientLogoDataUrl || '');
  const [logoBusy, setLogoBusy] = useState(false);

  const pickClientLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // يُفرَّغ فوراً: بدونه لا يُطلق اختيار نفس الملف مرّة ثانية حدث change إطلاقاً.
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(isAr ? 'اختر ملف صورة' : 'Pick an image file', 'error');
      return;
    }
    setLogoBusy(true);
    try {
      const dataUrl = await compressLogoFile(file, CONTRACT_LOGO_MAX_WIDTH);
      if (dataUrl.length > LOGO_MAX_DATA_URL) {
        showToast(
          isAr ? 'الصورة كبيرة جداً حتى بعد الضغط — جرّب صورة أبسط' : 'Still too large after compression — try a simpler image',
          'error',
        );
        return;
      }
      setClientLogoDataUrl(dataUrl);
    } catch {
      showToast(isAr ? 'تعذّرت قراءة الصورة' : 'Could not read that image', 'error');
    } finally {
      setLogoBusy(false);
    }
  };

  const [themePreference, setThemePreference] = useState<'dark' | 'light' | 'both'>(draft?.themePreference || 'dark');
  const [languageSupport, setLanguageSupport] = useState<'ar' | 'en' | 'ar_en'>(draft?.languageSupport || 'ar_en');
  const [paymentPlan] = useState<'50_50' | '100_upfront' | '3_milestones'>('50_50');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  /* البنود خلف زرّ.
   *
   * كانت مفتوحة دائماً: صندوق نصّ طويل يتوسّط الخطوة الأخيرة بين العنوان ولوحة التوقيع، فيدفع
   * كل من وصل إلى هنا للتمرير فوقه لا لقراءته. الزرّ يجعل فتحها فعلاً مقصوداً — ويجعل الفتح
   * قابلاً للتسجيل، وهذا هو الفرق المهم: بنود مخفيّة بلا شرط فتح تعني توقيعاً على نصّ لم
   * يُعرض، وهو أسوأ من حائط نصّ.
   *
   * termsViewedAt هو الأثر الباقي (يُكتب في العقد نفسه — انظر types.ts)؛ termsOpen مجرد حالة
   * عرض تُفتح وتُغلق كما يشاء. مربّع الموافقة معطَّل حتى يوجد الأول. */
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsViewedAt, setTermsViewedAt] = useState<string | null>(null);
  const termsRef = useRef<HTMLDivElement | null>(null);

  /** يفتح البنود ويسجّل لحظة أول فتح. التسجيل مرة واحدة: الفتح الثاني ليس عرضاً جديداً. */
  const openTerms = () => {
    setTermsOpen(true);
    setFieldErrors((prev) => {
      if (!prev.has('terms')) return prev;
      const next = new Set(prev);
      next.delete('terms');
      return next;
    });
    if (!termsViewedAt) setTermsViewedAt(new Date().toISOString());
    requestAnimationFrame(() => {
      termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

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
      clientLogoDataUrl,
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
    clientLogoDataUrl,
  ]);


  // Price Calculation in IQD — a fully custom project has no catalogue price at all; its
  // final value is quoted by the team after reviewing the written description below.
  const basePriceIQD = isCustomProject ? 0 : (template.basePriceIQD || 0);
  const totalPriceIQD = basePriceIQD;

  // Shown to the customer in step 3 and printed as section 4 of their PDF, from one module so
  // the two can never disagree. The week count must match what handleSubmit writes into the
  // contract below, which is why it is derived the same way rather than typed out again.
  /* صفر = "لم تُحدَّد بعد"، لا "تُسلَّم فوراً".
     كانت 8 أسابيع تُكتب لكل مشروع مخصص أياً كان حجمه، فتُطبع في وثيقة يوقّعها العميل كالتزام
     بمدة لم يقدّرها أحد. المدة الحقيقية تُعتمد من لوحة التحكم مع السعر، وحتى ذلك الحين تقول
     الوثيقة "تُحدَّد بالاتفاق" (انظر ContractPrintDocument). */
  const deliveryTimelineWeeks = isCustomProject ? 0 : template.deliveryWeeks;
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

  /* ما ينقص العقد، محسوباً في مكان واحد.
   *
   * كانت الفحوص مكتوبة ثلاث مرات: في زرّ "الخطوة التالية"، وفي handleSubmit، وفي شرط تعطيل زرّ
   * الإتمام — ثلاث نسخ لنفس القاعدة، وأي شرط يُضاف لواحدة ينسى في الأخريين، فيصير زرّ مفعَّل
   * يرفض العمل عند الضغط، أو خطوة تُقفل على نقص لا يقوله أحد. القائمة أدناه هي المصدر الوحيد:
   * منها يعرف الزرّ متى يُعطَّل، ومنها تُبنى الرسالة، ومنها يُعرف إلى أي خطوة يُنقَل المستخدم.
   *
   * وكل عنصر يحمل خطوته واسم حقله وعبارته: الخطوة تنقل المستخدم إلى مكان النقص، واسم الحقل
   * يلوّنه بالأحمر، والعبارة تقول ما هو بالضبط بدل "أكمل الحقول الناقصة". */
  type MissingItem = { step: number; field: string; label: string };

  const missingItems: MissingItem[] = [];
  if (!companyName.trim()) {
    missingItems.push({ step: 1, field: 'companyName', label: isAr ? 'اسم الشركة' : 'Company name' });
  }
  if (!repName.trim()) {
    missingItems.push({ step: 1, field: 'repName', label: isAr ? 'اسم المخوَّل بالتوقيع' : 'Authorised signatory' });
  }
  if (!phone.trim()) {
    missingItems.push({ step: 1, field: 'phone', label: isAr ? 'رقم الهاتف' : 'Phone number' });
  } else if (!isValidIraqiPhone(phone)) {
    missingItems.push({
      step: 1,
      field: 'phone',
      label: isAr ? 'رقم هاتف صحيح (يبدأ بـ07 و11 رقماً)' : 'A valid phone (starts with 07, 11 digits)',
    });
  }
  if (isCustomProject && !customProjectName.trim()) {
    missingItems.push({ step: 2, field: 'customProjectName', label: isAr ? 'اسم مشروعك' : 'Your project name' });
  }
  if (isCustomProject && !customFeaturesText.trim()) {
    missingItems.push({ step: 2, field: 'customDescription', label: isAr ? 'وصف المشروع' : 'Project description' });
  }
  /* لون واحد على الأقل. ليس تشدّداً شكلياً: الألوان تُطبع في العقد وتُنفَّذ حرفياً في التصميم
     (انظر ContractPrintDocument)، فعقد بلا لون واحد يعني اتفاقاً على هوية بصرية لم يُتفق عليها
     — والنتيجة جولة تعديل كاملة بعد التسليم على شيء كان سؤالاً واحداً قبله. */
  if (!primaryColor) {
    missingItems.push({ step: 2, field: 'primaryColor', label: isAr ? 'اللون الأساسي' : 'The primary colour' });
  }
  /* الاطّلاع أولاً، ثم الموافقة — بندان لا بند واحد.
     ما دامت البنود لم تُفتح فمربّع الموافقة معطَّل، وقول "أشِّر على مربّع الموافقة" لمن لا يقدر
     أن يؤشّر يجعله يبحث عن عطل غير موجود. فالناقص هنا هو القراءة، ويُسمّى باسمها. */
  if (!termsViewedAt) {
    missingItems.push({ step: 3, field: 'terms', label: isAr ? 'فتح بنود العقد وقراءتها' : 'Opening and reading the contract terms' });
  } else if (!agreedToTerms) {
    missingItems.push({ step: 3, field: 'agreedToTerms', label: isAr ? 'الموافقة على بنود العقد' : 'Accepting the contract terms' });
  }
  if (!hasSignature) {
    missingItems.push({ step: 3, field: 'signature', label: isAr ? 'توقيعك' : 'Your signature' });
  }

  const missingForStep = (step: number) => missingItems.filter((m) => m.step === step);
  const canSubmit = missingItems.length === 0;

  /** يعرض النقص: يلوّن الحقول، ينتقل إلى خطوته، ويقول ما هو بالاسم. */
  const announceMissing = (items: MissingItem[]) => {
    if (items.length === 0) return;
    setFieldErrors(new Set(items.map((m) => m.field)));
    const list = items.map((m) => m.label).join(isAr ? ' · ' : ' · ');
    showToast(
      isAr ? `ينقص العقد: ${list}` : `Still missing: ${list}`,
      'error'
    );
    const firstStep = Math.min(...items.map((m) => m.step));
    if (firstStep !== currentStep) setCurrentStep(firstStep);
    /* لا يُفتح شيء تلقائياً هنا: فتح البنود نيابةً عن العميل يكتب في عقده أنه اطّلع عليها
       بينما الذي حدث أنه ضغط "إتمام". النقل إلى مكانها هو أقصى ما يجوز. */
    if (items.some((m) => m.field === 'terms')) {
      requestAnimationFrame(() => {
        termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    if (items.some((m) => m.field === 'signature')) {
      setSignatureMissing(true);
      requestAnimationFrame(() => {
        signaturePadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  /* Enter ينقل إلى الحقل التالي بدل أن يُرسل النموذج.
   *
   * سلوك المتصفح الافتراضي داخل أي <form> هو أن Enter في حقل نصّي = ضغط زرّ الإرسال. هنا كان
   * ذلك يعني أن من يعبّئ اسم شركته ويضغط Enter — وهي حركة تلقائية عند كل من عبّأ نموذجاً في
   * حياته — يُحاول إنشاء العقد من الخطوة الأولى، فتنهال عليه رسائل النقص. أي أن أسرع طريقة
   * للتنقّل كانت أسرع طريقة لرؤية خطأ.
   *
   * الآن: Enter يمنع الإرسال وينقل التركيز إلى الحقل التالي داخل النموذج نفسه.
   *  · textarea مستثناة: Enter فيها يعني سطراً جديداً، وهو المطلوب في وصف المشروع تحديداً.
   *  · حقول اللون والملفات مستثناة: تركيزها يفتح نافذة النظام، فيتحوّل تنقّل هادئ إلى نافذة
   *    منبثقة لم يطلبها أحد.
   *  · آخر حقل يبقى مكانه بلا إرسال — الإرسال فعل يُقصَد بالضغط على زرّه، لا نتيجة جانبية
   *    لضغطة تنقّل. */
  const formRef = useRef<HTMLFormElement | null>(null);

  const focusNextField = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter') return;
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type === 'color' || target.type === 'file' || target.type === 'checkbox') return;

    event.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const fields = Array.from(
      form.querySelectorAll<HTMLElement>('input, textarea')
    ).filter((el) => {
      if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
      if (el instanceof HTMLInputElement && ['color', 'file', 'hidden', 'checkbox'].includes(el.type)) return false;
      // عنصر داخل خطوة غير معروضة لا وجود له في DOM أصلاً (الخطوات تُرسم شرطياً)، لكن هذا
      // يحمي أيضاً من أي حقل مخفي بصرياً يبقى مركَّباً.
      return el.offsetParent !== null;
    });

    const index = fields.indexOf(target);
    if (index >= 0 && index < fields.length - 1) fields[index + 1].focus();
  };

  const handleSubmitContract = (e: React.FormEvent) => {
    e.preventDefault();

    /* فحص واحد لكل الخطوات، لا سلسلة فحوص تتوقف عند أول نقص.
       السلسلة القديمة كانت تقول "أكمل الخطوة الأولى"، فيُكملها المستخدم ويضغط فيُقال له "أكمل
       الثانية" — ثلاث رحلات لمعرفة ما كان يمكن قوله مرة واحدة. */
    if (missingItems.length > 0) {
      announceMissing(missingItems);
      return;
    }

    let signatureDataUrl = '';
    if (canvasRef.current && hasSignature) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    }

    /* رقم العقد هو نفسه مُعرِّف المستند في Firestore، فتكراره ليس تشابه أسماء بل اصطدام
       مستندين. الصيغة السابقة `Date.now().slice(-6)` تأخذ آخر ست خانات من الوقت بالملّي ثانية،
       أي أنها تعود إلى نفسها كل 10^6 ملّي ثانية = 16 دقيقة و40 ثانية بالضبط. عقدان يُنشآن على
       مسافة تلك الدورة يحملان الرقم ذاته: إمّا يُدمج عميلان في مستند واحد، أو تُرفض الكتابة
       الثانية (القاعدة تسمح بالإنشاء لا بالتعديل) فيبقى عقد موقَّع على جهاز صاحبه وحده ويظن
       الجميع أنه محفوظ.

       التاريخ يجعل الأرقام غير قابلة للتكرار عبر الأيام، والجزء العشوائي (36^5 ≈ 60 مليون
       احتمال داخل اليوم الواحد) يجعل التصادم داخل اليوم نفسه احتمالاً نظرياً لا تشغيلياً. */
    const today = new Date();
    const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    const contractNumber = `NVQ-${stamp}-${suffix}`;

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
      // مفتاح غائب لا مفتاح بقيمة undefined — Firestore يرفض الثاني ويسقط الكتابة كلها.
      ...(clientLogoDataUrl ? { clientLogoDataUrl } : {}),
      basePriceIQD,
      totalPriceIQD,
      basePriceSAR: basePriceIQD,
      totalPriceSAR: totalPriceIQD,
      paymentPlan,
      deliveryTimelineWeeks,
      signatureDataUrl,
      // علامة أن هذا التوقيع بحبر داكن، فلا يقلبه أي عارض (انظر types.ts).
      signatureInk: 'dark',
      agreedToTerms,
      // مفتاح غائب لا مفتاح بقيمة undefined — Firestore يرفض الثاني ويسقط الكتابة كلها.
      ...(termsViewedAt ? { termsViewedAt } : {}),
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
            clauses, sign, send.

            Stacked below `sm`, three across above it. Three across on a phone does not fit and
            never did: measured at a 360px viewport, each card came out 86.7px wide and the
            padding, the 32px icon and the gap took 68 of them, leaving a text column of 18.7px
            for titles that want 71, 99 and 97 — so 73% to 81% of every title was cut and every
            phase label wrapped mid-phrase. Stacked, each card gets the full width of the grid and
            every string fits on one line.

            It buys that with height, about 190px against 74. Worth it here: this is three rows
            above a form, read once on the way in, and a row of "بيانا..." names nothing. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-6">
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
                data-incomplete={missingForStep(s.step).length > 0 ? 'true' : undefined}
                className={`text-start p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 flex items-center gap-2.5 cursor-pointer ${
        isCurrent
          /* Accent fill kept and only the LABEL flipped, because this row is on the light
             page rather than in the panel: the fill is 12.53:1 there, where the obsidian
             label on it was 1.47:1 and white is 13.44:1. The light twin every dark-ground
             accent in this file takes would have been the wrong fix here -- 1.49:1 against
             the white page. */
          ? 'bg-orange border-orange text-white shadow-lg shadow-orange/25'
          : isCompleted
          ? 'bg-obsidian border-white/70 text-white shadow-lg shadow-black/50'
          : 'bg-obsidian border-white/10 text-white/50 hover:border-orange-on-dark'
                }`}
              >
                {/* The accent itself. This used to be `#BA4F04`, the darkened-for-a-light-fill
                    orange, because plain Orange was 2.13:1 on this white chip. The accent is
                    `#273036` now and measures 13.44:1 on white, so there is nothing left to
                    darken and the two values have collapsed into one. */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isCurrent ? 'bg-white text-[#273036]' : isCompleted ? 'bg-white text-obsidian' : 'bg-white/10 text-white/60'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <span className="block text-xs opacity-70 flex items-center gap-1.5">
                    {s.phase}
                    {/* علامة النقص على الخطوة نفسها: يراها المستخدم قبل أن يفتحها، فيعرف أين
                        بقي شيء بلا أن يتنقّل بين الخطوات ليكتشفه. */}
                    {missingForStep(s.step).length > 0 && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: ERROR }}
                        aria-label={isAr ? 'خطوة غير مكتملة' : 'Incomplete step'}
                      />
                    )}
                  </span>
                  {/* No `truncate`. It was hiding the overflow rather than fixing it, and now
                      that the cards are sized to hold their text there is nothing to hide: at
                      the sm breakpoint, where the longest title is still 14px over its column,
                      it wraps at the space between two words instead of disappearing. */}
                  <span className="block text-xs sm:text-sm font-bold leading-snug">{s.title}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Form Container */}
        <form ref={formRef} onKeyDown={focusNextField} onSubmit={handleSubmitContract} /* The accent, on the owner's call, where this was `bg-graphite`. The inputs stay obsidian:
             that is 1.47:1 against the new panel where graphite over the same inputs was 1.09:1,
             so the layering got stronger rather than weaker -- and neither number ever carried
             the separation alone, since every input has a `border-steel/60`, which measures
             4.68:1 here. White copy on the panel is 12.53:1. */
            className="bg-orange border border-white/10 p-4 sm:p-6 rounded-3xl space-y-5 shadow-2xl">
          
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
                    className="w-full px-4 py-3 rounded-xl bg-obsidian border border-steel/60 focus:border-orange-on-dark focus:outline-none text-white text-sm font-mono placeholder:font-sans"
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
                  <Layers className="w-5 h-5 text-orange-on-dark" />
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
                          ? 'bg-orange-on-dark border-white text-obsidian'
                          : 'bg-obsidian border-white/10 text-white/60 hover:border-orange-on-dark'
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
                      className="relative flex items-center px-3 py-2.5 rounded-xl border border-steel/60 hover:border-orange-on-dark focus-within:border-orange-on-dark transition-colors"
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
                      {/* The way back out. A native colour dialog has no "none" in it — it hands
                          back a colour whatever you do — so a tile that has been filled could
                          never be emptied again, and "empty" was only a state the page could put
                          you in, never one you could ask for.

                          It has to sit ABOVE the input, which covers the whole tile: z-10 plus
                          its own hit area, or the press would fall through and open the picker
                          it is meant to cancel. Full tile height and wide padding for a finger;
                          it stops short of the centred code so the code stays pressable as the
                          picker. Only rendered on a filled tile, where it has something to do. */}
                      {c.value && (
                        <button
                          type="button"
                          onClick={() => c.set('')}
                          aria-label={isAr ? `مسح اللون ${i + 1}` : `Clear color ${i + 1}`}
                          title={isAr ? 'مسح اللون' : 'Clear colour'}
                          className="absolute inset-y-0 right-0 z-10 flex items-center px-2.5 text-white/45 hover:text-white focus-visible:text-white transition-colors"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/60 leading-relaxed mt-3">
                  {isAr
                    ? 'اضغط على أي مستطيل واختار لونه، ويظهر كوده داخل المستطيل، وعلامة × ترجّعه فارغ. الألوان اللي تختارها راح نستخدمها بالضبط في تصميم موقعك، وتنطبع أكوادها في عقدك.'
                    : 'Tap any rectangle to pick its colour and its code appears inside it; the × empties it again. The colours you pick are the exact ones we use in your design, and their codes are printed in your contract.'}
                </p>

                {/* شعار العميل — يُطبع في العقد كما رُفع.
                    تحت الألوان مباشرة لأنه نفس السؤال: ما هي هوية هذا المشروع البصرية. */}
                <div className="mt-5 pt-4 border-t border-white/10">
                  <label className="block text-sm font-semibold text-white/85 mb-2">
                    {isAr ? 'شعار شركتك (اختياري)' : 'Your company logo (optional)'}
                  </label>

                  <div className="flex items-center gap-3">
                    {/* أرضية بيضاء خلف المعاينة: أغلب الشعارات تُصمَّم على أبيض، وشعار داكن على
                        بطاقتنا السوداء يختفي — فيظنّ صاحبه أن الرفع فشل. */}
                    {clientLogoDataUrl ? (
                      <span className="w-16 h-16 rounded-xl bg-white grid place-items-center shrink-0 overflow-hidden p-1.5">
                        <img
                          src={clientLogoDataUrl}
                          alt={isAr ? 'شعار شركتك' : 'Your company logo'}
                          className="max-w-full max-h-full object-contain"
                        />
                      </span>
                    ) : (
                      <span className="w-16 h-16 rounded-xl border border-dashed border-steel/60 grid place-items-center shrink-0 text-white/45">
                        <ImagePlus className="w-5 h-5" />
                      </span>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <label
                        className={`px-3.5 py-2 rounded-xl border border-steel/60 hover:border-orange-on-dark text-xs font-bold text-white transition-colors ${
                          logoBusy ? 'opacity-60 cursor-wait' : 'cursor-pointer'
                        }`}
                      >
                        <input type="file" accept="image/*" className="hidden" onChange={pickClientLogo} disabled={logoBusy} />
                        {logoBusy
                          ? (isAr ? 'جارٍ التجهيز…' : 'Preparing…')
                          : clientLogoDataUrl
                            ? (isAr ? 'تغيير الشعار' : 'Change logo')
                            : (isAr ? 'رفع الشعار' : 'Upload logo')}
                      </label>

                      {clientLogoDataUrl && (
                        <button
                          type="button"
                          onClick={() => setClientLogoDataUrl('')}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white cursor-pointer transition-colors"
                        >
                          {isAr ? 'إزالة' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-white/60 leading-relaxed mt-2.5">
                    {isAr
                      ? 'يظهر داخل عقدك كما رفعته بالضبط، بلا أي تعديل عليه. PNG أو SVG أو JPG.'
                      : 'It appears inside your contract exactly as you uploaded it, unaltered. PNG, SVG or JPG.'}
                  </p>
                </div>
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
                            ? 'bg-orange-on-dark border-white text-obsidian'
                            : 'bg-obsidian border-white/10 text-white/60 hover:border-orange-on-dark'
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
                            ? 'bg-orange-on-dark border-white text-obsidian'
                            : 'bg-obsidian border-white/10 text-white/60 hover:border-orange-on-dark'
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
                    className="w-full p-3.5 rounded-xl bg-obsidian border border-steel/60 focus:border-orange-on-dark focus:outline-none text-white text-sm leading-relaxed"
                  />
                </div>
              )}

              {/* ── Live project spec outline ── placed LAST (per request): the customer fills the
                  inputs first, then reads the assembled summary at the bottom. Reads the same state
                  the contract is assembled from, so it can never disagree with what is sent. */}
              <div className="p-4 rounded-2xl bg-white/5 border border-steel/60 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <FileCheck className="w-4 h-4 text-orange-on-dark" />
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
                    <dd className="font-bold text-white">
                      {deliveryTimelineWeeks > 0
                        ? isAr
                          ? arCount(deliveryTimelineWeeks, 'أسبوع واحد', 'أسبوعان', 'أسابيع', 'أسبوعاً')
                          : `${deliveryTimelineWeeks} wks`
                        : isAr
                          ? 'تُحدَّد بالاتفاق'
                          : 'To be agreed'}
                    </dd>
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

              {/* البنود، كاملة، خلف زرّ واحد فوق لوحة التوقيع مباشرة.
                  النصّ هو هو: نفس الوحدة ونفس الترتيب الذي يُطبع كقسم 4 في وثيقة العميل
                  (src/data/contractTerms.ts)، فلا يمكن أن يختلف ما قرأه عمّا وقّعه. المخفيّ هو
                  الحائط لا المحتوى، والفتح بضغطة — ومسجَّل، فلا يُوقَّع على نصّ لم يُعرض.
                  `data-lenis-prevent` لأن الصندوق يمرّر داخلياً: بدونها يأخذ التمرير الناعم
                  العجلة ويحرّك الصفحة خلفه. */}
              <div className="space-y-2" ref={termsRef}>
                <button
                  type="button"
                  onClick={() => (termsOpen ? setTermsOpen(false) : openTerms())}
                  aria-expanded={termsOpen}
                  className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl bg-obsidian border text-start cursor-pointer transition-colors"
                  style={{ borderColor: fieldErrors.has('terms') ? ERROR : 'rgba(255,255,255,0.1)' }}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 shrink-0 text-white/70" />
                    <span className="text-sm font-bold text-white">
                      {isAr ? 'بنود العقد' : 'Contract terms'}
                    </span>
                    <span className="text-xs text-white/60 shrink-0">
                      {isAr ? arCount(terms.length, 'بند واحد', 'بندان', 'بنود', 'بنداً') : `${terms.length} clauses`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {termsViewedAt && <CheckCircle2 className="w-4 h-4" style={{ color: SUCCESS }} />}
                    <ChevronDown
                      className={`w-4 h-4 text-white/70 transition-transform duration-200 ${termsOpen ? 'rotate-180' : ''}`}
                    />
                  </span>
                </button>

                {termsOpen && (
                  <div
                    data-lenis-prevent
                    className="max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-obsidian p-4 animate-fade-in"
                  >
                    <ol className="list-decimal space-y-2.5 ps-4 marker:font-bold marker:text-white/60">
                      {terms.map((term, i) => (
                        <li key={i} className="text-sm leading-relaxed text-white/85">
                          {term}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <p className="text-xs leading-relaxed text-white/60">
                  {termsViewedAt
                    ? isAr
                      ? 'توقيعك أدناه إقرار بأنك قرأت هذه البنود ووافقت عليها، وتُطبع كاملة ضمن نسخة عقدك.'
                      : 'Signing below acknowledges that you have read and accepted these terms; they are printed in full in your contract copy.'
                    : isAr
                      ? 'افتح البنود واقرأها أولاً — لا يمكن الموافقة على نصّ لم يُعرض عليك.'
                      : 'Open the terms and read them first — you cannot accept text that was never shown to you.'}
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

                {/* لوحة فاتحة، لأن الحبر صار داكناً (lib/useSignaturePad.ts) — وهي أيضاً
                    نفس أرضية الورقة التي سيُطبع عليها التوقيع، فما يراه الموقّع هنا هو
                    حرفياً ما سيظهر في عقده. */}
                <div
                  className={`relative rounded-2xl overflow-hidden border-2 border-dashed bg-white transition-colors ${
                    signatureMissing ? 'border-[#EF4444] ring-2 ring-[#EF4444]/40' : 'border-steel/60'
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
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-obsidian/45 text-sm font-semibold">
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
                {/* معطَّل قبل فتح البنود. المربّع نصّه "أوافق على بنود العقد أعلاه"، والتأشير
                    عليه دون فتحها يجعل الجملة غير صحيحة — والموافقة هي كل ما يُحتجّ به لاحقاً. */}
                <label className={`flex items-center gap-2 ${termsViewedAt ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                  <input
                    type="checkbox"
                    disabled={!termsViewedAt}
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 rounded bg-graphite border-steel/60 text-white focus:ring-white cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className="text-sm font-semibold text-white leading-relaxed">
                    {getTranslation('agreeTermsCheckbox', lang)}
                  </span>
                </label>

                {!termsViewedAt && (
                  <button
                    type="button"
                    onClick={openTerms}
                    className="text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    style={{ color: ERROR }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="underline decoration-white/30">
                      {isAr ? 'اضغط هنا لفتح البنود وقراءتها قبل الموافقة.' : 'Open the terms and read them before accepting.'}
                    </span>
                  </button>
                )}
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

          {/* ما ينقص، مرئياً قبل الضغط لا بعده.
              زرّ معطَّل يقول "لا تستطيع" ولا يقول "لماذا"، فيبقى المستخدم يبحث عن السبب في ثلاث
              خطوات. هذه القائمة تسمّي كل ناقص ومعه رقم خطوته، وكل سطر فيها زرّ ينقلك إليه. */}
          {currentStep === 3 && missingItems.length > 0 && (
            <div
              className="p-4 rounded-2xl border"
              style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.35)' }}
            >
              <span className="flex items-center gap-2 text-sm font-bold" style={{ color: ERROR }}>
                <AlertCircle className="w-4 h-4" />
                {isAr ? 'لا يمكن إتمام العقد قبل إكمال:' : 'The contract cannot be completed until you finish:'}
              </span>
              <ul className="mt-2.5 space-y-1.5">
                {missingItems.map((item) => (
                  <li key={`${item.step}-${item.field}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep(item.step);
                        setFieldErrors(new Set([item.field]));
                        if (item.field === 'signature') setSignatureMissing(true);
                        // السطر مكتوب "فتح بنود العقد وقراءتها"، والضغط عليه هو الفتح نفسه.
                        if (item.field === 'terms') openTerms();
                      }}
                      className="text-xs font-bold text-white/85 hover:text-white cursor-pointer flex items-center gap-2"
                    >
                      <span
                        className="w-5 h-5 rounded-md grid place-items-center text-[10px] shrink-0"
                        style={{ background: 'rgba(255,255,255,0.12)' }}
                      >
                        {item.step}
                      </span>
                      <span className="underline decoration-white/30">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
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
                  // نفس القائمة، مقصورة على الخطوة الحالية — فلا يقفز أحد فوق نقص ثم يُفاجأ به
                  // في النهاية، ولا يُمنع من التقدّم بسبب نقص في خطوة لم يصل إليها بعد.
                  const missingHere = missingForStep(currentStep);
                  if (missingHere.length > 0) {
                    announceMissing(missingHere);
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
                    : `${isAr ? 'ينقص: ' : 'Missing: '}${missingItems.map((m) => m.label).join(' · ')}`
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
