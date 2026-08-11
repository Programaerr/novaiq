import { Template } from '../types';

export const templatesData: Template[] = [
  {
    id: 'NVQ-CORP-01',
    title: 'ستيلا المؤسسي (Stella Corporate)',
    subtitle: 'منصة شركات القابضة والمجموعات الاستثمارية الكبرى',
    category: 'corporate',
    categoryLabel: 'شركات ومؤسسات',
    description: 'واجهة بصرية فضائية مستقبليّة للمؤسسات الكبرى تعكس الثقة والابتكار، مع لوحة تحكم متطورة لإدارة الأعمال والمشاريع.',
    longDescription: 'تم تصميم قالب Stella Corporate خصيصاً للشركات القابضة والمجموعات الكبرى. يوفر هيكلية متكاملة لعرض الخدمات، المشاريع، التقارير السنوية، وهيكل الحوكمة، مع دمج نظام إدارة العملاء المتقدم.',
    previewImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=60',
    basePriceIQD: 1450000,
    basePriceUSD: 1000,
    deliveryWeeks: 3,
    tags: ['شركات قابضة', 'إدارة متقدمة', 'لوحة قيادة', 'متعدد اللغات'],
    techStack: ['React 19', 'Tailwind CSS v4', 'Express', 'Firebase', 'REST API', 'Framer Motion'],
    features: [
      'هيكل تنظيمي تفاعلي للهيكل الإداري والمشاريع',
      'مستكشف التقارير المالية والسنوية بصيغة PDF',
      'مساعد استفسارات المستثمرين والعملاء المتقدم',
      'لوحة قيادة حية للإحصائيات والمؤشرات الرئيسية (KPIs)',
      'دعم كامل للغتين العربية والإنجليزية بتبديل فوري'
    ],
    specificationsOptions: [
      { id: 'spec_ai_bot', label: 'دمج شات بوت خدمة العملاء المتقدم الخاص بالشركة', priceIQD: 180000, recommended: true },
      { id: 'spec_multi_branch', label: 'نظام إدارة الفروع المتعددة والخريطة التفاعلية', priceIQD: 150000, recommended: true },
      { id: 'spec_investor_portal', label: 'بوابة المستثمرين المحمية بكلمة سر وتشفير عالي', priceIQD: 280000 },
      { id: 'spec_custom_cms', label: 'لوحة تحكم لإضافة الأخبار والوظائف الشاغرة', priceIQD: 170000 }
    ],
    mockScreens: [
      {
        title: 'الرئيسية والمقر الرئيسي',
        description: 'عرض الإنجازات والشركات التابعة برؤية بصرية مجرية متطورة',
        colorGrad: 'from-purple-900/60 to-slate-950',
        contentPreview: 'Stella Holding Group - Leading the Cosmic Era of Business'
      },
      {
        title: 'محفظة المشاريع الاستثمارية',
        description: 'فلترة تفاعلية وحساب العوائد التقريبية لكل قطاع',
        colorGrad: 'from-blue-900/60 to-slate-950',
        contentPreview: 'Enterprise Investment Portfolio - 45+ Active Assets'
      }
    ]
  },
  {
    id: 'NVQ-ECOM-02',
    title: 'أوريون للتجارة الإلكترونية (Orion)',
    subtitle: 'منصة مبيعات المستقبل للماركات والمتاجر المتقدمة',
    category: 'ecommerce',
    categoryLabel: 'تجارة إلكترونية',
    description: 'تجربة تسوق فضائية فريدة مع محرك توصيات متقدم وبوابات دفع إلكترونية معتمدة.',
    longDescription: 'يوفر قالب Orion تجربة شراء سريعة بدون تعقيدات، مع دعم التخصيص التفاعلي للمنتجات، ونظام تتبع الطلبات الحي، وربط آلي مع شركات الشحن والمدفوعات.',
    previewImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=60',
    basePriceIQD: 1750000,
    basePriceUSD: 1210,
    deliveryWeeks: 4,
    tags: ['متجر رقمي', 'بوابات دفع', 'توصيات المنتجات', 'تتبع حي'],
    techStack: ['React', 'Tailwind CSS', 'Stripe / ZainCash / Card', 'Firebase Store', 'REST API'],
    features: [
      'واجهة منتجات ثلاثية الأبعاد تفاعلية وسريعة الاستجابة',
      'محرك اقتراحات المنتجات بناءً على تفضيلات الزائر المتقدمة',
      'دعم سلة التسوق الفورية وسداد الخطوة الواحدة (One-step Checkout)',
      'لوحة تتبع الشحنات والطلب للعملاء بالرقم المباشر',
      'نظام الخصومات والكوبونات التلقائية حسب الشريحة'
    ],
    specificationsOptions: [
      { id: 'spec_apple_pay', label: 'تفعيل زين كاش والبطاقات الإلكترونية المباشرة', priceIQD: 200000, recommended: true },
      { id: 'spec_inventory_sync', label: 'ربط نظام المخازن والمبيعات الآلي', priceIQD: 260000, recommended: true },
      { id: 'spec_ai_stylist', label: 'مساعد التسوق الشخصي المتقدم', priceIQD: 220000 }
    ],
    mockScreens: [
      {
        title: 'معرض المنتجات الفاخرة',
        description: 'عرض المنتجات بزوايا متعددة ودعم الواقع المعزز AR',
        colorGrad: 'from-indigo-900/60 to-slate-950',
        contentPreview: 'Orion Premium Collection - Powered by Smart Commerce'
      }
    ]
  },
  {
    id: 'NVQ-CARS-03',
    title: 'أوتوستيلار لمعارض السيارات (AutoStellar)',
    subtitle: 'معرض سيارات مع حاسبة تقسيط وحجز تجربة قيادة',
    category: 'cars',
    categoryLabel: 'معارض سيارات',
    description: 'معرض سيارات إلكتروني يعرض كل سيارة بمحركها وناقل حركتها واستهلاك وقودها، مع حاسبة تقسيط فورية وحجز تجربة قيادة.',
    longDescription: 'مصمم لمعارض ووكلاء السيارات، يعرض كل سيارة ببطاقة مواصفات كاملة (المحرك، ناقل الحركة، الدفع، استهلاك الوقود، سنة الصنع)، مع حاسبة أقساط تحسب الدفعة الأولى والقسط الشهري لحظياً، ونموذج حجز تجربة قيادة يصل مباشرة إلى صالة العرض.',
    previewImage: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=60',
    basePriceIQD: 1900000,
    basePriceUSD: 1310,
    deliveryWeeks: 4,
    tags: ['معرض سيارات', 'حاسبة تقسيط', 'تجربة قيادة', 'مقارنة مواصفات'],
    techStack: ['React 19', 'TypeScript', 'Tailwind CSS', 'Motion/React', 'Node Express'],
    features: [
      'بطاقة سيارة بمواصفات كاملة: المحرك، ناقل الحركة، الدفع، والاستهلاك',
      'حاسبة تقسيط فورية تحسب الدفعة الأولى والقسط الشهري',
      'حجز تجربة قيادة بموعد يصل مباشرة إلى صالة العرض',
      'مقارنة بين سيارتين جنباً إلى جنب قبل القرار'
    ],
    specificationsOptions: [
      { id: 'spec_finance_bank', label: 'ربط حاسبة التقسيط بنِسب التمويل الفعلية للمصارف', priceIQD: 240000, recommended: true },
      { id: 'spec_trade_in', label: 'نظام تقييم سيارتك القديمة (Trade-in) واحتسابها من السعر', priceIQD: 300000, recommended: true }
    ],
    mockScreens: [
      {
        title: 'صالة العرض الرقمية',
        description: 'بطاقة لكل سيارة بصورتها ومواصفاتها وسعرها',
        colorGrad: 'from-slate-800/70 to-slate-950',
        contentPreview: 'AutoStellar — Showroom'
      }
    ]
  },
  {
    id: 'NVQ-REAL-04',
    title: 'كوزموس العقاري (Cosmos)',
    subtitle: 'منصة التطوير العقاري والمجمعات المكتملة',
    category: 'realestate',
    categoryLabel: 'عقارات وتطوير',
    description: 'استعراض العقارات والفلل والأبراج برؤية فضائية مبتكرة، مع حاسبة التمويل العقاري وجولات افتراضية.',
    longDescription: 'قالب عقاري متكامل يستعرض المشاريع الفاخرة، المخططات السكنية، المساحات، وجداول الدفع مع إمكانية حجز المعاينة الإلكترونية مباشرة.',
    previewImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=60',
    basePriceIQD: 1600000,
    basePriceUSD: 1100,
    deliveryWeeks: 3,
    tags: ['عقارات', 'حاسبة تمويل', 'حجز معاينة', 'خريطة مشاريع'],
    techStack: ['React', 'Google Maps API / Custom Canvas Map', 'Tailwind', 'Firebase'],
    features: [
      'فلترة المخططات حسب المنطقة، المساحة، والميزانية',
      'حاسبة التمويل والأقساط العقارية المتقدمة',
      'حجز موعد معاينة افتراضي أو ميداني مع الاستشاري',
      'استعراض مخططات الوحدة السكنية برسم عالي الدقة'
    ],
    specificationsOptions: [
      { id: 'spec_mortgage_calc', label: 'ربط حاسبة المصارف والتمويل العقاري المباشر', priceIQD: 180000, recommended: true },
      { id: 'spec_3d_tour', label: 'دمج الجولات الافتراضية 360 درجة', priceIQD: 280000 }
    ],
    mockScreens: [
      {
        title: 'استعراض البرج والوحدات',
        description: 'تفاصيل المساحات وخيارات الدفع الميسرة',
        colorGrad: 'from-amber-900/60 to-slate-950',
        contentPreview: 'Cosmos Luxury Residences & Towers'
      }
    ]
  },
  {
    id: 'NVQ-HEALTH-05',
    title: 'غالكسي الطبي (Galaxy Health)',
    subtitle: 'منصة مستشفيات ومجموعات الرعاية الطبية',
    category: 'healthcare',
    categoryLabel: 'خدمات وطب',
    description: 'بوابة إلكترونية متكاملة لإدارة المواعيد الطبية، الاستشارات عن بُعد، والملفات الصحية الإلكترونية.',
    longDescription: 'تم إنشاؤه وفق أعلى معايير أمان البيانات الصحية، يوفر نظام حجز الأطباء، الأقسام الطبية، نتائج التحاليل، والدردشة مع طبيبك.',
    previewImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=60',
    basePriceIQD: 1550000,
    basePriceUSD: 1070,
    deliveryWeeks: 3,
    tags: ['طب', 'حجز مواعيد', 'استشارات', 'ملف صحي'],
    techStack: ['React', 'Firebase Auth & Firestore', 'Tailwind CSS', 'WebRTC Video'],
    features: [
      'جدول حجز المواعيد مع الأطباء حسب التخصص والتفرغ',
      'بوابة نتائج التحاليل والتقارير الطبية المشفرة',
      'غرفة الاستشارات المرئية والنصية عن بُعد',
      'التذكيرات التلقائية بالواتساب والبريد الإلكتروني'
    ],
    specificationsOptions: [
      { id: 'spec_telehealth', label: 'تفعيل الاستشارات المرئية المباشرة (Telehealth Video)', priceIQD: 300000, recommended: true },
      { id: 'spec_whatsapp_reminder', label: 'ربط إشعارات المواعيد التلقائية عبر الواتساب الرسمي', priceIQD: 150000 }
    ],
    mockScreens: [
      {
        title: 'بوابة المريض والجدول',
        description: 'إدارة الاستشارات والنتائج بسهولة وخصوصية',
        colorGrad: 'from-cyan-900/60 to-slate-950',
        contentPreview: 'Galaxy Medical Center - Advanced Care'
      }
    ]
  },
  {
    id: 'NVQ-FINTECH-06',
    title: 'فورتكس المالي (Vortex FinTech)',
    subtitle: 'بوابة التحويلات المالية والمدفوعات الإلكترونية الشاملة',
    category: 'fintech',
    categoryLabel: 'فينتك وخدمات مالية',
    description: 'نظام مالي رقمي متكامل يتيح إدارة الحسابات، التحويلات الفورية، المحافظ الإلكترونية، وتقارير الشفافية المالية.',
    longDescription: 'تم إنشاؤه لشركات الفينتك والمؤسسات المالية، يدمج أعلى مستويات التشفير والأمان، مع دعم بوابات الدفع الإلكترونية السريعة وإشارات التنبيه التلقائية.',
    previewImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=60',
    basePriceIQD: 1850000,
    basePriceUSD: 1280,
    deliveryWeeks: 4,
    tags: ['فينتك', 'محفظة رقمية', 'دفع إلكتروني', 'تحويلات مالية', 'أمان عالي'],
    techStack: ['React 19', 'Tailwind CSS', 'Node Express', 'Firebase Auth', 'ZainCash / Visa API'],
    features: [
      'محفظة رقمية تفاعلية مع سجل المعاملات الفوري',
      'نظام تحويل الأموال وتتبع العمليات بالرمز المرجعي',
      'لوحة تحليل التدفقات المالية والرسوم البيانية المباشرة',
      'دعم الحماية ثنائية العوامل 2FA والامتثال الأمني'
    ],
    specificationsOptions: [
      { id: 'spec_kyc_verify', label: 'ربط نظام التحقق التلقائي من الهوية (KYC Verification)', priceIQD: 260000, recommended: true },
      { id: 'spec_multi_curr', label: 'دعم المحافظ متعددة العملات والتحويل الفوري', priceIQD: 200000, recommended: true }
    ],
    mockScreens: [
      {
        title: 'لوحة التحكم والمحفظة المالية',
        description: 'استعراض الأرصدة والتحويلات وإدارة المعاملات بأعلى درجات الأمان',
        colorGrad: 'from-emerald-900/60 to-slate-950',
        contentPreview: 'Vortex FinTech Engine - Secure Digital Banking'
      }
    ]
  },
  {
    id: 'NVQ-FOOD-07',
    title: 'ميتيور للمطاعم الذكية (Meteor Kitchen)',
    subtitle: 'منصة طلب الطعام والحجوزات الذكية للمطاعم وسلاسل التوصيل',
    category: 'restaurant',
    categoryLabel: 'مطاعم وتوصيل الطلبات',
    description: 'منصة رقمية متكاملة لعرض قوائم الطعام، استقبال الطلبات الفورية، وإدارة حجوزات الطاولات بتجربة مستخدم سلسة.',
    longDescription: 'مصمم لمطاعم وسلاسل التوصيل، يوفر عرض قائمة طعام مصنفة بصور عالية الجودة، سلة طلبات ذكية بالإضافات والملاحظات، تتبع حالة الطلب من المطبخ حتى التسليم، ونظام حجز طاولات فوري.',
    previewImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=60',
    basePriceIQD: 1500000,
    basePriceUSD: 1035,
    deliveryWeeks: 3,
    tags: ['مطاعم', 'قائمة طعام', 'سلة طلبات', 'حجز طاولات'],
    techStack: ['React 19', 'Tailwind CSS v4', 'Firebase Firestore', 'REST API', 'Framer Motion'],
    features: [
      'قائمة طعام تفاعلية مصنفة حسب الأقسام مع صور عالية الجودة',
      'سلة طلبات ذكية مع تخصيص الإضافات والملاحظات لكل صنف',
      'نظام حجز الطاولات وتأكيد الحجوزات الفورية',
      'تتبع حالة الطلب من المطبخ حتى التوصيل بشكل حي',
      'دعم الدفع عند الاستلام وزين كاش والبطاقات الإلكترونية'
    ],
    specificationsOptions: [
      { id: 'spec_live_kitchen_tracking', label: 'تتبع حالة الطلب المباشر من المطبخ حتى باب المنزل', priceIQD: 220000, recommended: true },
      { id: 'spec_table_reservation', label: 'نظام حجز الطاولات مع خرائط الصالة التفاعلية', priceIQD: 180000, recommended: true },
      { id: 'spec_loyalty_points', label: 'نظام نقاط الولاء والخصومات للعملاء الدائمين', priceIQD: 160000 },
      { id: 'spec_multi_branch_menu', label: 'إدارة قوائم متعددة لفروع المطعم المختلفة', priceIQD: 200000 }
    ],
    mockScreens: [
      {
        title: 'قائمة الطعام الرئيسية',
        description: 'تصفح الأصناف مع صور شهية وفلترة حسب القسم',
        colorGrad: 'from-orange-900/60 to-slate-950',
        contentPreview: 'Meteor Kitchen - Order Fresh, Fast'
      },
      {
        title: 'تتبع الطلب الحي',
        description: 'خط زمني تفاعلي لمراحل تحضير وتوصيل الطلب',
        colorGrad: 'from-red-900/60 to-slate-950',
        contentPreview: 'Live Order Tracking - Kitchen to Door'
      }
    ]
  },
  {
    id: 'NVQ-EDU-08',
    title: 'كوازار للتعليم والتدريب (Quasar Academy)',
    subtitle: 'منصة معاهد التدريب والدورات التعليمية الاحترافية',
    category: 'education',
    categoryLabel: 'تعليم ومعاهد تدريب',
    description: 'منصة رقمية لمعاهد التدريب والتعليم تتيح عرض الدورات، التسجيل الإلكتروني الفوري، ومتابعة الطالب لدرجاته وحضوره.',
    longDescription: 'مصمم لمعاهد التدريب والمؤسسات التعليمية، يقدم كتالوج دورات تفاعلي، تسجيل والتحاق إلكتروني بخطوة واحدة، لوحة تحكم طالب شاملة للدرجات والحضور والشهادات، وتقويم محاضرات ذكي.',
    previewImage: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=60',
    basePriceIQD: 1650000,
    basePriceUSD: 1140,
    deliveryWeeks: 4,
    tags: ['تعليم', 'دورات تدريبية', 'تسجيل طلاب', 'لوحة درجات'],
    techStack: ['React 19', 'Tailwind CSS v4', 'Firebase Auth & Firestore', 'REST API', 'Chart.js'],
    features: [
      'كتالوج دورات تفاعلي مصنف حسب المجال والمستوى',
      'نظام تسجيل والتحاق إلكتروني بخطوة واحدة مع الدفع',
      'لوحة تحكم الطالب: الدرجات، الحضور، والشهادات',
      'تقويم المحاضرات والتذكيرات التلقائية',
      'شهادات إتمام رقمية قابلة للتحقق'
    ],
    specificationsOptions: [
      { id: 'spec_certificate_gen', label: 'توليد شهادات إتمام رقمية موثقة برمز QR', priceIQD: 200000, recommended: true },
      { id: 'spec_live_classes', label: 'دمج نظام البث المباشر للمحاضرات عن بعد', priceIQD: 280000, recommended: true },
      { id: 'spec_attendance_qr', label: 'نظام تسجيل الحضور بالباركود/QR داخل القاعات', priceIQD: 170000 },
      { id: 'spec_installment_plans', label: 'خطط تقسيط الرسوم الدراسية التلقائية', priceIQD: 150000 }
    ],
    mockScreens: [
      {
        title: 'كتالوج الدورات',
        description: 'تصفح الدورات المتاحة مع فلترة حسب المجال والمستوى',
        colorGrad: 'from-blue-900/60 to-slate-950',
        contentPreview: 'Quasar Academy - Learn Without Limits'
      },
      {
        title: 'لوحة تحكم الطالب',
        description: 'متابعة الدرجات والحضور والشهادات في مكان واحد',
        colorGrad: 'from-indigo-900/60 to-slate-950',
        contentPreview: 'Student Dashboard - Grades & Attendance'
      }
    ]
  },
  {
    id: 'NVQ-PHONE-09',
    title: 'بلسار لبيع الهواتف (Pulsar Mobile)',
    subtitle: 'متجر الهواتف الذكية والإكسسوارات',
    category: 'mobile',
    categoryLabel: 'هواتف وإلكترونيات',
    description: 'متجر هواتف متكامل يعرض الموديلات بمواصفاتها، ويتيح اختيار الذاكرة واللون وحساب السعر النهائي قبل تأكيد الطلب.',
    longDescription: 'مصمم لمتاجر الهواتف الذكية ومحلات الإلكترونيات، يوفر كتالوج موديلات بمواصفات تفصيلية وشارات (الأكثر مبيعاً / أفضل سعر)، اختيار سعة الذاكرة واللون مع تحديث فوري للسعر، إضافة كفالة سنة إضافية، حاسبة تقسيط شهري، وتأكيد طلب برقم مرجعي وفاتورة إلكترونية.',
    previewImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=60',
    basePriceIQD: 1650000,
    basePriceUSD: 1138,
    deliveryWeeks: 4,
    tags: ['متجر هواتف', 'مقارنة مواصفات', 'تقسيط', 'كفالة وصيانة'],
    techStack: ['React 19', 'Tailwind CSS v4', 'Firebase Firestore', 'Payment Gateway API', 'Framer Motion'],
    features: [
      'كتالوج هواتف بمواصفات تفصيلية وشارات الأكثر مبيعاً وأفضل سعر',
      'اختيار سعة الذاكرة واللون مع تحديث السعر لحظياً',
      'إضافة كفالة سنة إضافية وحساب الإجمالي حسب الكمية',
      'حاسبة تقسيط شهري تعرض الدفعة قبل الشراء',
      'تأكيد الطلب برقم مرجعي وفاتورة إلكترونية'
    ],
    specificationsOptions: [
      { id: 'spec_phone_compare', label: 'أداة مقارنة بين هاتفين أو أكثر بالمواصفات جنباً إلى جنب', priceIQD: 250000, recommended: true },
      { id: 'spec_installment_engine', label: 'نظام التقسيط وحساب الدفعات مع طلب الموافقة', priceIQD: 300000, recommended: true },
      { id: 'spec_imei_warranty', label: 'سجل الكفالة بالرقم التسلسلي IMEI وتتبع حالة الصيانة', priceIQD: 220000 },
      { id: 'spec_trade_in', label: 'خدمة استبدال الجهاز القديم وتقييم سعره تلقائياً', priceIQD: 190000 }
    ],
    mockScreens: [
      {
        title: 'كتالوج الهواتف',
        description: 'تصفح الموديلات مع المواصفات والسعر ابتداءً من أقل ذاكرة',
        colorGrad: 'from-indigo-900/60 to-slate-950',
        contentPreview: 'Pulsar Mobile - Original Devices, Real Warranty'
      },
      {
        title: 'تأكيد الطلب',
        description: 'ملخص الطلب مع الذاكرة واللون والكفالة ورقم مرجعي',
        colorGrad: 'from-sky-900/60 to-slate-950',
        contentPreview: 'Order Confirmed - Reference #PLS-...'
      }
    ]
  },
  {
    id: 'NVQ-WATCH-10',
    title: 'ميريديان لساعات اليد (Meridian Watches)',
    subtitle: 'متجر ساعات فاخرة مع دليل مقاسات وخدمة نقش',
    category: 'watches',
    categoryLabel: 'ساعات يد ومجوهرات',
    description: 'متجر إلكتروني لساعات اليد يعرض كل ساعة بحركتها ومقاس علبتها وخامة سوارها، مع نقش مجاني على ظهر العلبة وشهادة أصالة.',
    longDescription: 'مصمم لمحلات الساعات الفاخرة، يعرض كل موديل بتفاصيله الحقيقية — نوع الحركة (أوتوماتيك أو كوارتز)، قطر العلبة بالمليمتر، مقاومة الماء، وخيارات السوار — مع اختيار السوار ونقش اسم على ظهر العلبة، وشهادة أصالة وكفالة دولية مع كل قطعة.',
    previewImage: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=600&q=60',
    basePriceIQD: 1600000,
    basePriceUSD: 1103,
    deliveryWeeks: 3,
    tags: ['ساعات يد', 'متجر فاخر', 'نقش على الساعة', 'شهادة أصالة'],
    techStack: ['React 19', 'Tailwind CSS v4', 'Node Express', 'Firebase Firestore', 'Stripe / ZainCash'],
    features: [
      'بطاقة منتج تعرض الحركة وقطر العلبة ومقاومة الماء لكل ساعة',
      'اختيار السوار (جلد، ستيل، مطاط) مع تغيّر السعر مباشرة',
      'خدمة نقش اسم أو تاريخ على ظهر العلبة قبل التسليم',
      'شهادة أصالة وكفالة دولية سنتان مرفقة بكل طلب',
      'تغليف هدايا وتوصيل مؤمّن لكل المحافظات'
    ],
    specificationsOptions: [
      { id: 'spec_watch_engraving', label: 'محرّك النقش: معاينة حية لاسم الزبون على ظهر العلبة', priceIQD: 280000, recommended: true },
      { id: 'spec_watch_authenticity', label: 'شهادة أصالة رقمية برمز QR لكل قطعة مباعة', priceIQD: 220000, recommended: true },
      { id: 'spec_watch_size_guide', label: 'دليل مقاس المعصم التفاعلي مع توصية بقطر العلبة', priceIQD: 150000 },
      { id: 'spec_watch_service_book', label: 'سجل صيانة إلكتروني وتذكير بمواعيد خدمة الحركة', priceIQD: 190000 }
    ],
    mockScreens: [
      {
        title: 'معرض الساعات',
        description: 'بطاقة لكل موديل بحركته وقطر علبته وخيارات سواره',
        colorGrad: 'from-slate-800/60 to-slate-950',
        contentPreview: 'Meridian Watches - Time, Well Kept'
      },
      {
        title: 'إتمام الطلب والنقش',
        description: 'اختيار السوار وكتابة النقش وملخص السعر قبل التأكيد',
        colorGrad: 'from-amber-900/60 to-slate-950',
        contentPreview: 'Engraving & Checkout'
      }
    ]
  }
];
