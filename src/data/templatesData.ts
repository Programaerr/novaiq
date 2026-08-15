import { Template } from '../types';

/* Template covers.
 *
 * These are screenshots of each template's OWN demo, captured at a phone viewport by
 * `tools/capture-template-covers.mjs`. They replace eleven stock photographs from Unsplash — a
 * shopfront for the store, a stethoscope for the clinic — which showed the customer's INDUSTRY
 * rather than the product, so the one question a cover exists to answer was the one it could not.
 *
 * Imported rather than referenced by path so the bundler fingerprints and serves them: a missing
 * or renamed file then fails the build instead of becoming a broken image in production.
 *
 * Re-run the capture tool after changing any demo, or a cover will quietly show the old design.
 */
import coverCORP01 from '../assets/covers/NVQ-CORP-01.webp';
import coverECOM02 from '../assets/covers/NVQ-ECOM-02.webp';
import coverCARS03 from '../assets/covers/NVQ-CARS-03.webp';
import coverREAL04 from '../assets/covers/NVQ-REAL-04.webp';
import coverHEALTH05 from '../assets/covers/NVQ-HEALTH-05.webp';
import coverFINTECH06 from '../assets/covers/NVQ-FINTECH-06.webp';
import coverFOOD07 from '../assets/covers/NVQ-FOOD-07.webp';
import coverEDU08 from '../assets/covers/NVQ-EDU-08.webp';
import coverPHONE09 from '../assets/covers/NVQ-PHONE-09.webp';
import coverWATCH10 from '../assets/covers/NVQ-WATCH-10.webp';
import coverMARKETING11 from '../assets/covers/NVQ-MARKETING-11.webp';

export const templatesData: Template[] = [
  {
    id: 'NVQ-CORP-01',
    title: 'ستيلا المؤسسي (Stella Corporate)',
    subtitle: 'منصة شركات القابضة والمجموعات الاستثمارية الكبرى',
    category: 'corporate',
    categoryLabel: 'شركات ومؤسسات',
    description: 'واجهة بصرية فضائية مستقبليّة للمؤسسات الكبرى تعكس الثقة والابتكار، مع لوحة تحكم متطورة لإدارة الأعمال والمشاريع.',
    longDescription: 'تم تصميم قالب Stella Corporate خصيصاً للشركات القابضة والمجموعات الكبرى. يوفر هيكلية متكاملة لعرض الخدمات، المشاريع، التقارير السنوية، وهيكل الحوكمة، مع دمج نظام إدارة العملاء المتقدم.',
    previewImage: coverCORP01,
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
    previewImage: coverECOM02,
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
    previewImage: coverCARS03,
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
    previewImage: coverREAL04,
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
    previewImage: coverHEALTH05,
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
    previewImage: coverFINTECH06,
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
    previewImage: coverFOOD07,
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
    previewImage: coverEDU08,
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
    previewImage: coverPHONE09,
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
    previewImage: coverWATCH10,
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
  },
  {
    id: 'NVQ-MARKETING-11',
    title: 'نوفا ماركتتنج (NovaMarketing)',
    subtitle: 'منصة وكالة التسويق الرقمي المتكاملة',
    category: 'marketing',
    categoryLabel: 'تسويق رقمي',
    description: 'وكالة تسويق رقمي فضائية تعرض الحملات والاستراتيجيات والتحليلات بتصميم مستقبلي مع بطاقات تفاعلية.',
    longDescription: 'مصمم لوكالات التسويق الرقمي والشركات التي تريد عرض خدماتها بشكل احترافي، يوفر عرض حملات مستهدفة، استراتيجية مدعومة بالبيانات، إدارة وسائل التواصل، SEO والمحتوى، العلامة التجارية الإبداعية، وتحليلات الأداء مع بطاقات تفاعلية ونسب متحركة.',
    previewImage: coverMARKETING11,
    basePriceIQD: 1550000,
    basePriceUSD: 1070,
    deliveryWeeks: 3,
    tags: ['تسويق رقمي', 'حملات مستهدفة', 'تحليلات أداء', 'علامة تجارية'],
    techStack: ['React 19', 'Tailwind CSS v4', 'Framer Motion', 'Chart.js', 'Firebase'],
    features: [
      'عرض الحملات المستهدفة مع نسب التحويل التفاعلية',
      'استراتيجية مدعومة بالبيانات مع رسوم بيانية حية',
      'إدارة وسائل التواصل الاجتماعي مع جدولة المحتوى',
      'تحسين SEO والمحتوى مع تتبع الترتيب',
      'تحليلات أداء بالوقت الحقيقي مع تقارير PDF'
    ],
    mockScreens: [
      {
        title: 'لوحة تحكم التسويق',
        description: 'عرض الحملات والتحليلات والنسب التفاعلية',
        colorGrad: 'from-blue-900/60 to-slate-950',
        contentPreview: 'NovaMarketing - Digital Marketing Dashboard'
      },
      {
        title: 'بطاقات الخدمات',
        description: 'بطاقات تفاعلية لعرض الخدمات مع نسب التحويل',
        colorGrad: 'from-purple-900/60 to-slate-950',
        contentPreview: 'Marketing Services - Interactive Cards'
      }
    ]
  }
];
