// Comprehensive Internationalization (i18n) & Dynamic Translation Engine
export type Language = 'ar' | 'en';

// Dictionary of predefined translations for template attributes, categories, features, and UI
const DYNAMIC_TRANSLATIONS: Record<string, { en: string; ar: string }> = {
  // Categories (keyed by the exact Arabic label text, since translateText()
  // looks up DYNAMIC_TRANSLATIONS by the Arabic string callers pass in, not by an English slug)
  'شركات ومؤسسات': { ar: 'شركات ومؤسسات', en: 'Corporate & Enterprise' },
  'تجارة إلكترونية': { ar: 'تجارة إلكترونية', en: 'E-Commerce' },
  'معارض سيارات': { ar: 'معارض سيارات', en: 'Car Dealerships' },
  'عقارات وتطوير': { ar: 'عقارات وتطوير', en: 'Real Estate & Development' },
  'خدمات وطب': { ar: 'خدمات وطب', en: 'Healthcare & Medical' },
  'فينتك وخدمات مالية': { ar: 'فينتك وخدمات مالية', en: 'FinTech & Digital Banking' },
  'مطاعم وتوصيل الطلبات': { ar: 'مطاعم وتوصيل الطلبات', en: 'Restaurants & Food Delivery' },
  'تعليم ومعاهد تدريب': { ar: 'تعليم ومعاهد تدريب', en: 'Education & Training Institutes' },
  'هواتف وإلكترونيات': { ar: 'هواتف وإلكترونيات', en: 'Mobile Phones & Electronics' },
  'ساعات يد ومجوهرات': { ar: 'ساعات يد ومجوهرات', en: 'Watches & Jewellery' },
  'all': { ar: 'جميع القطاعات', en: 'All Categories' },

  // Statuses
  'submitted': { ar: 'تم تقديم العقد', en: 'Contract Submitted' },
  'under_review': { ar: 'قيد المراجعة الفنية', en: 'Under Technical Review' },
  'in_development': { ar: 'قيد التطوير والتنفيذ', en: 'In Development' },
  'completed': { ar: 'مكتمل ومسلم', en: 'Completed & Delivered' },
  'draft': { ar: 'مسودة', en: 'Draft' },

  // Templates Titles & Phrases
  'ستيلا المؤسسي (Stella Corporate)': { ar: 'ستيلا المؤسسي (Stella Corporate)', en: 'Stella Corporate' },
  'منصة شركات القابضة والمجموعات الاستثمارية الكبرى': { ar: 'منصة شركات القابضة والمجموعات الاستثمارية الكبرى', en: 'Platform for Holding Companies & Major Investment Groups' },
  'واجهة بصرية فضائية مستقبليّة للمؤسسات الكبرى تعكس الثقة والابتكار، مع لوحة تحكم متطورة لإدارة الأعمال والمشاريع.': {
    ar: 'واجهة بصرية فضائية مستقبليّة للمؤسسات الكبرى تعكس الثقة والابتكار، مع لوحة تحكم متطورة لإدارة الأعمال والمشاريع.',
    en: 'A futuristic cosmic visual interface for large enterprises reflecting trust & innovation, with an advanced dashboard for business and project management.'
  },

  'أوريون للتجارة الإلكترونية (Orion)': { ar: 'أوريون للتجارة الإلكترونية (Orion)', en: 'Orion E-Commerce' },
  'منصة مبيعات المستقبل للماركات والمتاجر المتقدمة': { ar: 'منصة مبيعات المستقبل للماركات والمتاجر المتقدمة', en: 'Next-Gen Sales Platform for Advanced Brands & Stores' },
  'تجربة تسوق فضائية فريدة مع محرك توصيات متقدم وبوابات دفع إلكترونية معتمدة.': {
    ar: 'تجربة تسوق فضائية فريدة مع محرك توصيات متقدم وبوابات دفع إلكترونية معتمدة.',
    en: 'A unique cosmic shopping experience with an advanced recommendation engine and verified payment gateways.'
  },

  'أوتوستيلار لمعارض السيارات (AutoStellar)': { ar: 'أوتوستيلار لمعارض السيارات (AutoStellar)', en: 'AutoStellar Car Showrooms' },
  'معرض سيارات مع حاسبة تقسيط وحجز تجربة قيادة': { ar: 'معرض سيارات مع حاسبة تقسيط وحجز تجربة قيادة', en: 'Car Showroom with an Instalment Calculator & Test-Drive Booking' },

  'كوزموس العقاري (Cosmos)': { ar: 'كوزموس العقاري (Cosmos)', en: 'Cosmos Real Estate' },
  'منصة التطوير العقاري والمجمعات المكتملة': { ar: 'منصة التطوير العقاري والمجمعات المكتملة', en: 'Real Estate Development & Housing Complexes Platform' },

  'غالكسي الطبي (Galaxy Health)': { ar: 'غالكسي الطبي (Galaxy Health)', en: 'Galaxy Health' },
  'منصة مستشفيات ومجموعات الرعاية الطبية': { ar: 'منصة مستشفيات ومجموعات الرعاية الطبية', en: 'Hospitals & Medical Care Groups Platform' },

  'فورتكس المالي (Vortex FinTech)': { ar: 'فورتكس المالي (Vortex FinTech)', en: 'Vortex FinTech' },
  'بوابة التحويلات المالية والمدفوعات الإلكترونية الشاملة': { ar: 'بوابة التحويلات المالية والمدفوعات الإلكترونية الشاملة', en: 'Comprehensive Money Transfers & Digital Payments Gateway' },

  'ميتيور للمطاعم الذكية (Meteor Kitchen)': { ar: 'ميتيور للمطاعم الذكية (Meteor Kitchen)', en: 'Meteor Kitchen' },
  'منصة طلب الطعام والحجوزات الذكية للمطاعم وسلاسل التوصيل': { ar: 'منصة طلب الطعام والحجوزات الذكية للمطاعم وسلاسل التوصيل', en: 'Smart Food Ordering & Reservations Platform for Restaurants & Delivery Chains' },

  'كوازار للتعليم والتدريب (Quasar Academy)': { ar: 'كوازار للتعليم والتدريب (Quasar Academy)', en: 'Quasar Academy' },
  'منصة معاهد التدريب والدورات التعليمية الاحترافية': { ar: 'منصة معاهد التدريب والدورات التعليمية الاحترافية', en: 'Platform for Training Institutes & Professional Educational Courses' },

  'بلسار لبيع الهواتف (Pulsar Mobile)': { ar: 'بلسار لبيع الهواتف (Pulsar Mobile)', en: 'Pulsar Mobile' },
  'متجر الهواتف الذكية والإكسسوارات': { ar: 'متجر الهواتف الذكية والإكسسوارات', en: 'Smartphone & Accessories Store' },
  'متجر هواتف متكامل يعرض الموديلات بمواصفاتها، ويتيح اختيار الذاكرة واللون وحساب السعر النهائي قبل تأكيد الطلب.': {
    ar: 'متجر هواتف متكامل يعرض الموديلات بمواصفاتها، ويتيح اختيار الذاكرة واللون وحساب السعر النهائي قبل تأكيد الطلب.',
    en: 'A complete phone store that lists every model with its specs and lets customers pick storage and colour, seeing the final price before confirming the order.'
  },

  'ميريديان لساعات اليد (Meridian Watches)': { ar: 'ميريديان لساعات اليد (Meridian Watches)', en: 'Meridian Watches' },
  'متجر ساعات فاخرة مع دليل مقاسات وخدمة نقش': { ar: 'متجر ساعات فاخرة مع دليل مقاسات وخدمة نقش', en: 'Luxury Watch Store with a Size Guide & Engraving Service' },

  // Generic Phrases
  'العراق': { ar: 'العراق', en: 'Iraq' },
  'السعودية': { ar: 'السعودية', en: 'Saudi Arabia' },
  'الإمارات': { ar: 'الإمارات', en: 'UAE' },
  'قطر': { ar: 'قطر', en: 'Qatar' },
  'الكويت': { ar: 'الكويت', en: 'Kuwait' },
  'عمان': { ar: 'عمان', en: 'Oman' },
  'الأردن': { ar: 'الأردن', en: 'Jordan' },
  'مصر': { ar: 'مصر', en: 'Egypt' },

  'بغداد': { ar: 'بغداد', en: 'Baghdad' },
  'أربيل': { ar: 'أربيل', en: 'Erbil' },
  'البصرة': { ar: 'البصرة', en: 'Basra' },
  'الرياض': { ar: 'الرياض', en: 'Riyadh' },
  'دبي': { ar: 'دبي', en: 'Dubai' },

  'دك': { ar: 'د.ع', en: 'IQD' },
  'دينار عراقي': { ar: 'دينار عراقي', en: 'IQD' },
  'دولار أمريكي': { ar: 'دولار أمريكي', en: 'USD' },
  'أسابيع': { ar: 'أسابيع', en: 'weeks' },
  'أسبوع': { ar: 'أسبوع', en: 'week' },
  'يوم': { ar: 'يوم', en: 'days' }
};

// Auto-Translate function: translates known items or provides smart transliteration/word mapping
export function translateText(text: string | undefined | null, lang: Language): string {
  if (!text) return '';
  if (lang === 'ar') return text; // Default source is Arabic

  const trimmed = text.trim();
  if (DYNAMIC_TRANSLATIONS[trimmed]) {
    return DYNAMIC_TRANSLATIONS[trimmed].en;
  }

  // Check if text starts or contains known parts
  let result = text;

  // Replacements dictionary for dynamic contract terms and features
  const replacements: [RegExp, string][] = [
    [/قالب/g, 'Template'],
    [/عقد/g, 'Contract'],
    [/شركة/g, 'Company'],
    [/مشروع/g, 'Project'],
    [/نظام/g, 'System'],
    [/تطوير/g, 'Development'],
    [/مجاني/g, 'Free'],
    [/مخصص/g, 'Custom'],
    [/دعم/g, 'Support'],
    [/كامل/g, 'Full'],
    [/ربط/g, 'Integration'],
    [/لوحة تحكم/g, 'Control Panel / Dashboard'],
    [/دفع إلكتروني/g, 'Online Payment'],
    [/زين كاش/g, 'ZainCash'],
    [/إدارة/g, 'Management'],
    [/تطبيق/g, 'Application'],
    [/موقع/g, 'Website'],
    [/حفظ/g, 'Storage / Save'],
    [/بيانات/g, 'Data'],
    [/حماية/g, 'Security'],
    [/تخصيص/g, 'Customization'],
    [/تفاصيل/g, 'Details'],
    [/العراق/g, 'Iraq'],
    [/بغداد/g, 'Baghdad'],
    [/أربيل/g, 'Erbil'],
    [/دينار/g, 'IQD'],
    [/دولار/g, 'USD']
  ];

  let hasArabicChars = /[\u0600-\u06FF]/.test(result);
  if (!hasArabicChars) return result; // Already English/Latin

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  // If still contains Arabic after basic replacements, provide neat fallback
  if (/[\u0600-\u06FF]/.test(result)) {
    // Keep numbers and replaced words, clean up
    return result;
  }

  return result;
}

// Full UI String Dictionary
export const UI_TRANSLATIONS = {
  ar: {
    // Brand & Header
    brandTitle: 'NOVAIQ',
    brandTagline: 'منظومة تطوير البرمجيات السحابية',
    navHome: 'الرئيسية',
    navTemplates: 'القوالب البرمجية',
    navCustomRequest: 'طلب تطوير مخصص',
    navTimeline: 'مراحل العمل',
    navAbout: 'من نحن',
    navOrders: 'طلباتي المحفوظة',
    navLanguage: 'اللغة / Language',
    navArabic: 'العربية',
    navEnglish: 'English',

    // Hero Section
    heroBadge: 'الجيل القادم من الأنظمة البرمجية الفضائية',
    heroTitleLine1: 'نحول أفكارك إلى منصات',
    heroTitleLine2: 'سحابية فائقة الأداء',
    heroSubtitle: 'نظام هندسة وتطوير الأنظمة والتطبيقات الذكية مع تخطيط الميزات بدقة وتصميم المواصفات الفنية المتكاملة لضمان تسليم المشاريع في مواقيتها الدقيقة.',
    heroExploreBtn: 'تصفح القوالب والحلول',
    heroContractBtn: 'ابدأ تخطيط مشروع جديد',
    heroStatsTemplates: 'قوالب جاهزة',
    heroStatsDelivery: 'تسليم قياسي',
    heroStatsGuaranteed: 'حماية وأمان',
    heroStatsSatisfaction: 'رضا العملاء',

    // Quick Section
    quickTitle: 'الإنتاجية والسرعة في تسليم مشروعك',
    quickDesc: 'نحن لا نضيع وقتك في نقاشات ومفاوضات مطولة بلا طائل. قوالبنا البرمجية الجاهزة تمنحك انطلاقة فورية بنسبة 80% من مشروعك، بينما نتولى نحن تخصيص الـ 20% المتبقية لتلائم هوية شركتك ومتطلباتك الخاصة.',
    quickTemplatesBtn: 'تصفح القوالب الجاهزة',
    quickCustomBtn: 'اطلب نظام مخصص',

    // Template Grid
    templatesHeading: 'المكتبة الفضائية للقوالب البرمجية',
    templatesSubheading: 'اختر القالب الأنسب لنشاطك التجاري وانطلق بنسبة 80% جاهزية فورية مع إمكانية التخصيص الكامل.',
    searchPlaceholder: 'ابحث عن قالب',
    allCategories: 'جميع القطاعات',
    viewDetails: 'معاينة القالب',
    selectForContract: 'اختيار القالب',
    deliveryTime: 'مدة التسليم:',
    techStackLabel: 'المستودع البرمجي:',
    featuresLabel: 'المميزات الرئيسية:',

    // Contract Builder
    builderTitle: 'مخطط مواصفات المشروع وتخصيص الميزات',
    builderSubtext: 'قم بتعبئة معلومات شركتك وتحديد المتطلبات التقنية ليتم توليد وثيقة مواصفات وخطة العمل فوراً وحفظها.',
    stepCompanyInfo: '1. بيانات الشركة والطرف الثاني',
    stepTechSpecs: '2. المواصفات البرمجية والهوية',
    stepTermsPayment: '3. نظام الدفع والجدول الزمني',
    stepSignature: '4. مراجعة الخطة والاعتماد',

    companyNameLabel: 'اسم الشركة / المؤسسة:',
    companyNamePlaceholder: 'مثال: شركة النجوم للتطوير المحدودة',
    crNumberLabel: 'رقم السجل التجاري / الهوية (اختياري):',
    crNumberPlaceholder: 'مثال: 104928374',
    repNameLabel: 'اسم الممثل المخول بالتوقيع:',
    repNamePlaceholder: 'اسم المدير أو الممثل الرسمي',
    emailLabel: 'البريد الإلكتروني الرسمي:',
    emailPlaceholder: 'info@company.com',
    phoneLabel: 'رقم الهاتف للتواصل والواتساب:',
    phonePlaceholder: '07701234567',
    countryLabel: 'الدولة:',
    cityLabel: 'المدينة:',

    templateSelectedLabel: 'القالب المختار للمشروع:',
    selectTemplatePrompt: 'لم تقم باختيار قالب بعد، يمكنك اختيار أحد القوالب أو الاستمرار بعقد تطوير مخصص من الصفر.',
    chooseTemplateBtn: 'اختيار القالب',
    customFeaturesTextLabel: 'متطلبات برمجية إضافية خاصة (اختياري):',
    customFeaturesPlaceholder: 'اكتب أي ميزات إضافية ترغب بدمجها في النظام...',
    colorSchemeLabel: 'نمط الألوان والهوية البصرية المفضلة:',
    languageSupportLabel: 'اللغات المطلوبة في النظام:',
    langAr: 'اللغة العربية فقط',
    langEn: 'اللغة الإنجليزية فقط',
    langBoth: 'ثنائي اللغة (عربي + إنجليزي)',

    paymentPlanLabel: 'خطة التسديد والدفعات:',
    plan5050: '50% دفعة أولى عند البدء و 50% عند التسليم النهائي للمشروع',
    plan100Upfront: '100% تسديد كامل مسبق (خصم 5% خاص)',
    plan3Milestones: '3 دفعات مقسمة حسب مراحل الإنجاز الموثقة للموقع/التطبيق',

    totalCostSummary: 'إجمالي التكلفة التقديرية للبناء:',
    clearSignature: 'مسح التوقيع والاعتماد',
    agreeTermsCheckbox: 'أقر بصحة المواصفات الفنية المطلوبة ومراحل التسليم المذكورة لتخصيص طلبي وبدء التنفيذ.',
    generateContractBtn: 'الموافقة على العقد والتوقيع والإرسال',

    // Firebase Orders Modal
    ordersTitle: 'سجل الطلبات والمشاريع البرمجية المحفوظة',
    ordersSubtitle: 'جميع طلبات التطوير والمواصفات التي قمت بتخطيطها محفوظة بشكل دائم وسحابي.',
    searchOrdersPlaceholder: 'ابحث برقم الطلب أو اسم الشركة...',
    noOrdersFound: 'لا توجد طلبات برمجية محفوظة حالياً بالمطابقة الحالية.',
    contractNumberHeader: 'رقم الطلب / المشروع',
    clientHeader: 'العميل / الشركة',
    templateHeader: 'القالب والمشروع',
    totalPriceHeader: 'القيمة الإجمالية التقديرية',
    statusHeader: 'حالة المشروع',
    dateHeader: 'تاريخ الإنشاء',
    actionsHeader: 'الإجراءات',
    viewContractBtn: 'معاينة وثيقة المشروع',
    deleteContractBtn: 'حذف الطلب',

    // Delete Modal
    deleteTitle: 'تأكيد حذف مواصفات الطلب نهائياً',
    deleteWarning: 'هل أنت متأكد من رغبتك في حذف مواصفات هذا المشروع بالكامل؟ سيتم مسح جميع التفاصيل والبيانات المتصلة به من خوادم السحاب بشكل نهائي.',
    confirmDeleteBtn: 'تأكيد حذف الطلب',
    cancelBtn: 'إلغاء الأمر',

    // Footer & About
    aboutTitle: 'من نحن - NOVAIQ',
    aboutDesc: 'نحن منظومة هندسة برمجية سحابية متخصصة في بناء المنصات الفضائية عالية الأداء والتطبيقات المؤسسية الرقمية والمواقع المتكاملة.',
    rightsReserved: 'جميع الحقوق محفوظة منصة NOVAIQ البرمجية',
    privacyPolicy: 'سياسة الخصوصية',
    termsOfService: 'شروط الخدمة'
  },
  en: {
    // Brand & Header
    brandTitle: 'NOVAIQ',
    brandTagline: 'Cloud Software Engineering Platform',
    navHome: 'Home',
    navTemplates: 'Templates',
    navCustomRequest: 'Custom Project Builder',
    navTimeline: 'Process & Timeline',
    navAbout: 'About Us',
    navOrders: 'Saved Requests',
    navLanguage: 'Language / اللغة',
    navArabic: 'العربية',
    navEnglish: 'English',

    // Hero Section
    heroBadge: 'Next-Generation Cosmic Software Ecosystem',
    heroTitleLine1: 'Transforming Ideas into',
    heroTitleLine2: 'High-Performance Cloud Platforms',
    heroSubtitle: 'Engineering and developing intelligent applications with detailed custom project planning and guaranteed on-time project delivery.',
    heroExploreBtn: 'Explore Templates & Solutions',
    heroContractBtn: 'Plan a New Project',
    heroStatsTemplates: 'Ready Templates',
    heroStatsDelivery: 'Standard Delivery',
    heroStatsGuaranteed: 'Guaranteed Protection',
    heroStatsSatisfaction: 'Client Satisfaction',

    // Quick Section
    quickTitle: 'Productivity & Speed in Delivering Your Project',
    quickDesc: 'We don\'t waste your time in endless discussions. Our pre-built software templates give you an instant 80% head start on your project, while we customize the remaining 20% to fit your brand identity and unique requirements.',
    quickTemplatesBtn: 'Browse Ready Templates',
    quickCustomBtn: 'Request Custom System',

    // Template Grid
    templatesHeading: 'Cosmic Library of Software Templates',
    templatesSubheading: 'Choose the ideal template for your business and launch with 80% immediate readiness with full customization options.',
    searchPlaceholder: 'Search for a template',
    allCategories: 'All Categories',
    viewDetails: 'Preview Template',
    selectForContract: 'Select for Contract',
    deliveryTime: 'Delivery Time:',
    techStackLabel: 'Tech Stack:',
    featuresLabel: 'Key Features:',

    // Contract Builder
    builderTitle: 'Project Spec & Custom Builder',
    builderSubtext: 'Fill in your company information and technical specifications to generate the official project plan and spec sheet immediately.',
    stepCompanyInfo: '1. Company & Client Information',
    stepTechSpecs: '2. Software Specs & Identity',
    stepTermsPayment: '3. Payment Terms & Schedule',
    stepSignature: '4. Review & Confirm Plan',

    companyNameLabel: 'Company / Organization Name:',
    companyNamePlaceholder: 'e.g. Stella Development Ltd.',
    crNumberLabel: 'Commercial Register / ID Number (optional):',
    crNumberPlaceholder: 'e.g. 104928374',
    repNameLabel: 'Authorized Representative Name:',
    repNamePlaceholder: 'Official Name / Director',
    emailLabel: 'Official Email:',
    emailPlaceholder: 'info@company.com',
    phoneLabel: 'Phone & WhatsApp Number:',
    phonePlaceholder: '07701234567',
    countryLabel: 'Country:',
    cityLabel: 'City:',

    templateSelectedLabel: 'Selected Project Template:',
    selectTemplatePrompt: 'No template selected yet. You can choose a template or build a custom software contract from scratch.',
    chooseTemplateBtn: 'Select Template Now',
    customFeaturesTextLabel: 'Additional Custom Features (Optional):',
    customFeaturesPlaceholder: 'Specify any additional custom features you want to integrate...',
    colorSchemeLabel: 'Color Scheme & Visual Identity:',
    languageSupportLabel: 'Supported System Languages:',
    langAr: 'Arabic Only',
    langEn: 'English Only',
    langBoth: 'Bilingual (Arabic + English)',

    paymentPlanLabel: 'Payment Plan:',
    plan5050: '50% Upon Signing & 50% Upon Final Delivery',
    plan100Upfront: '100% Upfront Payment (5% Special Discount)',
    plan3Milestones: '3 Installments based on documented milestones',

    totalCostSummary: 'Estimated Total Project Cost:',
    clearSignature: 'Clear Signature',
    agreeTermsCheckbox: 'I confirm the technical specifications and delivery phases selected for my custom request.',
    generateContractBtn: 'Approve, sign & send contract',

    // Firebase Orders Modal
    ordersTitle: 'Saved Project Specs & Requests',
    ordersSubtitle: 'All your custom project specs with NOVAIQ are permanently saved on the cloud.',
    searchOrdersPlaceholder: 'Search by request number or company name...',
    noOrdersFound: 'No saved requests found matching your search.',
    contractNumberHeader: 'Request #',
    clientHeader: 'Client / Company',
    templateHeader: 'Template / Project',
    totalPriceHeader: 'Estimated Total Value',
    statusHeader: 'Project Status',
    dateHeader: 'Created Date',
    actionsHeader: 'Actions',
    viewContractBtn: 'View Spec Sheet',
    deleteContractBtn: 'Delete Request',

    // Delete Modal
    deleteTitle: 'Confirm Permanent Request Deletion',
    deleteWarning: 'Are you sure you want to permanently delete this project specification? All related data will be removed from cloud servers and cannot be undone.',
    confirmDeleteBtn: 'Confirm Delete Request',
    cancelBtn: 'Cancel',

    // Footer & About
    aboutTitle: 'About Us - NOVAIQ',
    aboutDesc: 'We are a cloud software engineering platform specializing in building high-performance cosmic systems, enterprise applications, and responsive websites.',
    rightsReserved: 'All rights reserved NOVAIQ Software Platform',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service'
  }
};

export function getTranslation(key: keyof typeof UI_TRANSLATIONS['ar'], lang: Language): string {
  return UI_TRANSLATIONS[lang]?.[key] || UI_TRANSLATIONS['ar'][key] || String(key);
}
