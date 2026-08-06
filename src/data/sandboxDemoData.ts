// Every demo template's static content: the sample records each demo browses (doctors,
// products, menu items, courses, rooms, shipments), the company identity each one presents
// itself with, and the shared palette/navigation tables. Pure data with no React and no
// imports, split out of TemplateInteractiveSandbox.tsx so editing a product price or a
// company's phone number doesn't mean scrolling past it inside a 4,700-line component.
/** A row in the customer's in-site account area, built from whatever the template's own demo
 *  actually holds — orders, appointments, bookings, enrolments — so the account page shows
 *  the visitor's real activity rather than invented placeholder history. */
export interface AccountRecord {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  status: string;
  amount?: string;
}

export interface SiteAccount {
  email: string;
  name: string;
  role: 'customer' | 'admin';
}

export type ThemeColor = 'emerald' | 'purple' | 'cyan' | 'amber' | 'rose' | 'monochrome';

export const THEME_COLOR_HEX: Record<ThemeColor, string> = {
  emerald: '#10b981',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  rose: '#f43f5e',
  monochrome: '#71717a',
};

export const THEME_COLOR_LABEL_AR: Record<ThemeColor, string> = {
  emerald: 'زمردي',
  purple: 'بنفسجي',
  cyan: 'سماوي',
  amber: 'ذهبي',
  rose: 'ياقوتي',
  monochrome: 'رمادي',
};

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  availableToday: boolean;
  imageBg: string;
}

export const SAMPLE_DOCTORS: Doctor[] = [
  { id: 'doc-1', name: 'د. سارة الجبوري', specialty: 'أمراض القلب والشرايين', rating: 4.9, availableToday: true, imageBg: 'from-cyan-900/60 to-slate-900' },
  { id: 'doc-2', name: 'د. عمر الحسني', specialty: 'الأطفال وحديثي الولادة', rating: 4.8, availableToday: true, imageBg: 'from-blue-900/60 to-slate-900' },
  { id: 'doc-3', name: 'د. لينا صالح', specialty: 'الجلدية والتجميل', rating: 4.7, availableToday: false, imageBg: 'from-teal-900/60 to-slate-900' },
  { id: 'doc-4', name: 'د. أحمد كريم', specialty: 'العظام والمفاصل', rating: 4.9, availableToday: true, imageBg: 'from-cyan-950/70 to-slate-900' },
];

export const SAMPLE_LAB_RESULTS = [
  { id: 'LAB-2291', name: 'فحص الدم الشامل (CBC)', date: '2026-07-28', status: 'جاهز', doctor: 'د. سارة الجبوري' },
  { id: 'LAB-2288', name: 'تحليل وظائف الكبد', date: '2026-07-20', status: 'جاهز', doctor: 'د. أحمد كريم' },
  { id: 'LAB-2275', name: 'الأشعة المقطعية - الصدر', date: '2026-07-05', status: 'قيد المراجعة', doctor: 'د. عمر الحسني' },
];

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
}

export interface ClothingProduct {
  id: string;
  name: string;
  category: 'men' | 'women' | 'accessories';
  priceIQD: number;
  priceUSD: number;
  colors: string[];
  sizes: string[];
  badge?: string;
  imageBg: string;
  imageUrl?: string;
  description: string;
}

export interface CartItem {
  product: ClothingProduct;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
}

export const SAMPLE_PRODUCTS: ClothingProduct[] = [
  {
    id: 'prod-1',
    name: 'قميص كاجوال فاخر (كتان إيطالي)',
    category: 'men',
    priceIQD: 45000,
    priceUSD: 31,
    colors: ['أبيض ناصع', 'كحلي ملكي', 'زيتوني'],
    sizes: ['S', 'M', 'L', 'XL'],
    badge: 'الأكثر مبيعاً',
    imageBg: 'from-blue-900/60 to-slate-900',
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
    description: 'قميص رجالي مصنع من الكتان الطبيعي الإيطالي المقاوم للتجعد يناسب المناسبات الرسمية واليومية.'
  },
  {
    id: 'prod-2',
    name: 'بنطال جينز عصري (سليم فيت)',
    category: 'men',
    priceIQD: 55000,
    priceUSD: 38,
    colors: ['أزرق داكن', 'أسود فحم'],
    sizes: ['30', '32', '34', '36'],
    badge: 'تخفيض 20%',
    imageBg: 'from-indigo-900/60 to-slate-900',
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&q=80',
    description: 'جينز مطاطي مريح للغاية بخياطة ثنائية معالجة ضد انكماش الغسيل.'
  },
  {
    id: 'prod-3',
    name: 'سترة شتوية مبطنة (وتربروف)',
    category: 'men',
    priceIQD: 120000,
    priceUSD: 82,
    colors: ['أسود مات', 'زيتوني عسكري'],
    sizes: ['M', 'L', 'XL', 'XXL'],
    badge: 'تشكيلة الشتاء',
    imageBg: 'from-zinc-800 to-slate-950',
    imageUrl: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=600&q=80',
    description: 'جاكيت حراري عازل للماء والرياح مزود ببطانة ريش طبيعي خفيفة الوزن.'
  },
  {
    id: 'prod-4',
    name: 'فستان سهرة حريري أنيق',
    category: 'women',
    priceIQD: 145000,
    priceUSD: 98,
    colors: ['حرير أسود', 'أحمر عنابي', 'زمردي'],
    sizes: ['S', 'M', 'L'],
    badge: 'تصميم حصري',
    imageBg: 'from-rose-950/70 to-slate-900',
    imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80',
    description: 'فستان انسيابي ذو قصة راقية وملمس حريري ناعم يمنحك إطلالة فريدة ومتميزة.'
  },
  {
    id: 'prod-5',
    name: 'حقيبة يد جلدية كلاسيكية',
    category: 'accessories',
    priceIQD: 85000,
    priceUSD: 58,
    colors: ['بني كلاسيك', 'أسود فاخر'],
    sizes: ['قياس موحد'],
    badge: 'جلد طبيعي 100%',
    imageBg: 'from-amber-950/70 to-slate-900',
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',
    description: 'حقيبة يد نسائية مصنوعة يدوياً من الجلد الطبيعي مع جيوب متعددة وحزام كتف قابل للتعديل.'
  },
  {
    id: 'prod-6',
    name: 'حذاء رياضي أنيق (خفيف الوزن)',
    category: 'accessories',
    priceIQD: 95000,
    priceUSD: 65,
    colors: ['أبيض وسيليكون', 'أسود رمادي'],
    sizes: ['40', '41', '42', '43', '44'],
    badge: 'راحة ممتدة',
    imageBg: 'from-emerald-950/70 to-slate-900',
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80',
    description: 'حذاء كاجوال ذو نعل طبي بضغط هواء مريح للمشي الطويل والأنشطة اليومية.'
  }
];

// Restaurant demo data
export interface MenuItem {
  id: string;
  name: string;
  category: 'appetizers' | 'mains' | 'desserts' | 'drinks';
  priceIQD: number;
  imageBg: string;
  description: string;
}

export interface FoodOrderItem {
  item: MenuItem;
  quantity: number;
}

export const SAMPLE_MENU_ITEMS: MenuItem[] = [
  { id: 'menu-1', name: 'سلطة تبولة طازجة', category: 'appetizers', priceIQD: 8000, imageBg: 'from-lime-900/60 to-slate-900', description: 'بقدونس طازج مفروم ناعماً مع طماطم وبرغل وليمون.' },
  { id: 'menu-2', name: 'حمص بالطحينة', category: 'appetizers', priceIQD: 7000, imageBg: 'from-amber-900/60 to-slate-900', description: 'حمص كريمي غني بزيت الزيتون البكر ومكسرات الصنوبر.' },
  { id: 'menu-3', name: 'مسكوف سمك مشوي', category: 'mains', priceIQD: 35000, imageBg: 'from-orange-900/60 to-slate-900', description: 'سمك شط مشوي على الفحم بالطريقة العراقية التقليدية.' },
  { id: 'menu-4', name: 'كباب موصلي مشكل', category: 'mains', priceIQD: 28000, imageBg: 'from-red-900/60 to-slate-900', description: 'تشكيلة كباب لحم مشوي مع أرز ومقبلات جانبية.' },
  { id: 'menu-5', name: 'برياني دجاج فاخر', category: 'mains', priceIQD: 22000, imageBg: 'from-yellow-900/60 to-slate-900', description: 'أرز بسمتي معطر بالبهارات مع قطع دجاج طرية.' },
  { id: 'menu-6', name: 'كنافة نابلسية', category: 'desserts', priceIQD: 9000, imageBg: 'from-amber-950/70 to-slate-900', description: 'كنافة ساخنة بالجبن مغطاة بالقطر والفستق.' },
  { id: 'menu-7', name: 'عصير رمان طازج', category: 'drinks', priceIQD: 5000, imageBg: 'from-rose-950/70 to-slate-900', description: 'عصير رمان طبيعي 100% معصور طازجاً.' },
  { id: 'menu-8', name: 'شاي عراقي أصيل', category: 'drinks', priceIQD: 2500, imageBg: 'from-red-950/70 to-slate-900', description: 'شاي أسود مقطر بالطريقة العراقية التقليدية.' },
];

// Education demo data
export interface Course {
  id: string;
  title: string;
  category: 'programming' | 'languages' | 'business' | 'design';
  instructor: string;
  level: 'مبتدئ' | 'متوسط' | 'متقدم';
  durationWeeks: number;
  priceIQD: number;
  imageBg: string;
}

export interface Enrollment {
  id: string;
  courseTitle: string;
  studentName: string;
  date: string;
}

export const SAMPLE_COURSES: Course[] = [
  { id: 'course-1', title: 'أساسيات تطوير الويب', category: 'programming', instructor: 'م. حيدر السعدي', level: 'مبتدئ', durationWeeks: 8, priceIQD: 250000, imageBg: 'from-blue-900/60 to-slate-900' },
  { id: 'course-2', title: 'تطبيقات الذكاء الاصطناعي', category: 'programming', instructor: 'م. رنا الكناني', level: 'متقدم', durationWeeks: 10, priceIQD: 400000, imageBg: 'from-indigo-900/60 to-slate-900' },
  { id: 'course-3', title: 'اللغة الإنجليزية للأعمال', category: 'languages', instructor: 'أ. مريم توفيق', level: 'متوسط', durationWeeks: 6, priceIQD: 150000, imageBg: 'from-cyan-900/60 to-slate-900' },
  { id: 'course-4', title: 'إدارة المشاريع الاحترافية', category: 'business', instructor: 'د. سيف الدليمي', level: 'متوسط', durationWeeks: 6, priceIQD: 220000, imageBg: 'from-emerald-900/60 to-slate-900' },
  { id: 'course-5', title: 'ريادة الأعمال والتسويق', category: 'business', instructor: 'أ. نور الزبيدي', level: 'مبتدئ', durationWeeks: 5, priceIQD: 180000, imageBg: 'from-teal-900/60 to-slate-900' },
  { id: 'course-6', title: 'تصميم واجهات UI/UX', category: 'design', instructor: 'م. علي حمزة', level: 'متوسط', durationWeeks: 7, priceIQD: 230000, imageBg: 'from-purple-900/60 to-slate-900' },
];

export const SAMPLE_GRADES = [
  { course: 'أساسيات تطوير الويب', grade: 'A', status: 'مكتملة' },
  { course: 'اللغة الإنجليزية للأعمال', grade: 'B+', status: 'قيد الدراسة' },
];

export const SAMPLE_ATTENDANCE = [
  { date: '2026-08-01', status: 'حاضر' },
  { date: '2026-08-03', status: 'حاضر' },
  { date: '2026-08-05', status: 'غائب' },
  { date: '2026-08-08', status: 'حاضر' },
];

// Mobile store demo data
export interface PhoneStorageTier {
  /** Capacity in GB — the label is derived (1024 renders as "1 تيرا"). */
  gb: number;
  priceIQD: number;
}

export interface PhoneProduct {
  id: string;
  name: string;
  brand: string;
  /** Cheapest tier first: the catalogue card quotes `storageTiers[0]` as the "starting at" price. */
  storageTiers: PhoneStorageTier[];
  colors: string[];
  /** Tint the card sits on, behind and below the photo — the poster look the cards copy. */
  imageBg: string;
  /** Product photo. Stock shots of the right *kind* of handset, not the exact model — a real
   *  store swaps these for its own shelf photos. */
  image: string;
  /** The one-line claim under the model name, in the poster's highlighted strip. */
  tagline: string;
  specs: string[];
  badge?: string;
}

export interface PhoneOrder {
  id: string;
  phoneName: string;
  storageGb: number;
  color: string;
  quantity: number;
  warranty: boolean;
  totalIQD: number;
  date: string;
}

/** Extra-year warranty add-on, priced per device (see `confirmPhoneOrder`). */
export const PHONE_WARRANTY_IQD = 45000;

const UNSPLASH = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=75`;

export const SAMPLE_PHONES: PhoneProduct[] = [
  {
    id: 'phone-1', name: 'iPhone 15 Pro Max', brand: 'Apple', badge: 'الأكثر مبيعاً',
    storageTiers: [{ gb: 256, priceIQD: 1700000 }, { gb: 512, priceIQD: 1950000 }, { gb: 1024, priceIQD: 2300000 }],
    colors: ['تيتانيوم طبيعي', 'تيتانيوم أسود', 'تيتانيوم أزرق'],
    imageBg: 'from-slate-700/70 to-slate-950',
    image: UNSPLASH('photo-1616348436168-de43ad0db179'),
    tagline: 'تيتانيوم. أخف. وأقوى.',
    specs: ['شاشة 6.7 بوصة', 'شريحة A17 Pro', 'كاميرا 48 ميغا', 'بطارية 4441 mAh'],
  },
  {
    id: 'phone-2', name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', badge: 'قلم S Pen',
    storageTiers: [{ gb: 256, priceIQD: 1550000 }, { gb: 512, priceIQD: 1780000 }, { gb: 1024, priceIQD: 2100000 }],
    colors: ['رمادي تيتانيوم', 'بنفسجي', 'أسود'],
    imageBg: 'from-indigo-900/70 to-slate-950',
    image: UNSPLASH('photo-1610945265064-0e34e5519bbf'),
    tagline: 'قلم S Pen بين يديك.',
    specs: ['شاشة 6.8 بوصة', 'Snapdragon 8 Gen 3', 'كاميرا 200 ميغا', 'زوم بصري 5x'],
  },
  {
    id: 'phone-3', name: 'Google Pixel 8 Pro', brand: 'Google',
    storageTiers: [{ gb: 128, priceIQD: 1050000 }, { gb: 256, priceIQD: 1190000 }, { gb: 512, priceIQD: 1400000 }],
    colors: ['أزرق فاتح', 'رمادي', 'أبيض'],
    imageBg: 'from-sky-900/70 to-slate-950',
    image: UNSPLASH('photo-1574944985070-8f3ebc6b79d2'),
    tagline: 'كاميرا تفكّر معك.',
    specs: ['شاشة 6.7 بوصة', 'شريحة Tensor G3', 'كاميرا 50 ميغا', 'تعديل صور بالذكاء الاصطناعي'],
  },
  {
    id: 'phone-4', name: 'Xiaomi 14 Pro', brand: 'Xiaomi',
    storageTiers: [{ gb: 256, priceIQD: 950000 }, { gb: 512, priceIQD: 1120000 }],
    colors: ['أسود', 'أبيض', 'أخضر'],
    imageBg: 'from-orange-900/70 to-slate-950',
    image: UNSPLASH('photo-1567581935884-3349723552ca'),
    tagline: 'عدسات Leica بالكامل.',
    specs: ['شاشة 6.73 بوصة', 'عدسات Leica', 'شحن سريع 120 واط', 'بطارية 4880 mAh'],
  },
  {
    id: 'phone-5', name: 'OnePlus 12', brand: 'OnePlus',
    storageTiers: [{ gb: 256, priceIQD: 900000 }, { gb: 512, priceIQD: 1060000 }],
    colors: ['أخضر زمردي', 'أسود'],
    imageBg: 'from-emerald-900/70 to-slate-950',
    image: UNSPLASH('photo-1601784551446-20c9e07cdbdb'),
    tagline: 'سرعة بلا انتظار.',
    specs: ['شاشة 6.82 بوصة 120Hz', 'رام 12 غيغا', 'شحن 100 واط', 'بطارية 5400 mAh'],
  },
  {
    id: 'phone-6', name: 'Samsung Galaxy A55', brand: 'Samsung', badge: 'أفضل سعر',
    storageTiers: [{ gb: 128, priceIQD: 420000 }, { gb: 256, priceIQD: 490000 }],
    colors: ['أزرق فاتح', 'أسود', 'بنفسجي'],
    imageBg: 'from-cyan-900/70 to-slate-950',
    image: UNSPLASH('photo-1585060544812-6b45742d762f'),
    tagline: 'كل المزايا، بأقل سعر.',
    specs: ['شاشة 6.6 بوصة', 'كاميرا 50 ميغا', 'بطارية 5000 mAh', 'مقاوم للماء IP67'],
  },
];

// Logistics demo data
export interface ShipmentStage {
  label: string;
  done: boolean;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  origin: string;
  destination: string;
  status: string;
  stages: ShipmentStage[];
}

export interface ShippingQuote {
  id: string;
  weight: string;
  destination: 'local' | 'regional' | 'international';
  priceIQD: number;
}

export const SAMPLE_SHIPMENTS: Shipment[] = [
  {
    id: 'ship-1', trackingNumber: 'CMX-77201', origin: 'بغداد', destination: 'البصرة', status: 'في الطريق للتسليم',
    stages: [
      { label: 'تم استلام الشحنة', done: true },
      { label: 'تم الفرز في المستودع', done: true },
      { label: 'في الطريق للتسليم', done: true },
      { label: 'تم التسليم', done: false },
    ]
  },
  {
    id: 'ship-2', trackingNumber: 'CMX-77198', origin: 'أربيل', destination: 'بغداد', status: 'تم التسليم',
    stages: [
      { label: 'تم استلام الشحنة', done: true },
      { label: 'تم الفرز في المستودع', done: true },
      { label: 'في الطريق للتسليم', done: true },
      { label: 'تم التسليم', done: true },
    ]
  },
];

// Each demo is meant to read as a real company's own website rather than a feature list,
// so a customer browsing the catalogue can picture their business running on it. This is
// the identity layer that makes that believable: a named company with a positioning line,
// real-looking numbers, a service list, a client quote, and contact details.
export interface CompanyProfile {
  name: string;
  badge: string;
  headline: string;
  description: string;
  primaryCta: { label: string; tab: string };
  secondaryCta: { label: string; tab: string };
  stats: { value: string; label: string }[];
  services: { title: string; description: string }[];
  testimonial: { quote: string; author: string; role: string };
  contact: { phone: string; email: string; address: string; hours: string };
}

export const COMPANY_PROFILES: Record<string, CompanyProfile> = {
  'NVQ-HEALTH-05': {
    name: 'Galaxy Health',
    badge: 'مجموعة مستشفيات ومراكز طبية',
    headline: 'رعاية طبية متكاملة على مدار الساعة',
    description:
      'مجموعة غالكسي الطبية تضم 4 مستشفيات و12 عيادة تخصصية في بغداد وأربيل والبصرة، مع فريق من 180 استشارياً وأحدث أجهزة التشخيص، وخدمة الاستشارات المرئية عن بُعد.',
    primaryCta: { label: 'احجز موعدك الآن', tab: 'booking' },
    secondaryCta: { label: 'تصفح الأطباء', tab: 'doctors' },
    stats: [
      { value: '180+', label: 'استشاري وطبيب' },
      { value: '24/7', label: 'طوارئ واستقبال' },
      { value: '12', label: 'عيادة تخصصية' },
      { value: '96%', label: 'رضا المرضى' },
    ],
    services: [
      { title: 'حجز المواعيد الفوري', description: 'اختر الطبيب والوقت المناسب واحصل على تأكيد فوري برسالة.' },
      { title: 'نتائج التحاليل رقمياً', description: 'استلم نتائج المختبر والأشعة في حسابك دون مراجعة المستشفى.' },
      { title: 'استشارات مرئية عن بُعد', description: 'قابل طبيبك بالفيديو من المنزل مع وصفة إلكترونية معتمدة.' },
      { title: 'ملف صحي موحّد', description: 'كل تاريخك الطبي والوصفات والتقارير في مكان واحد آمن.' },
    ],
    testimonial: {
      quote: 'حجزت موعداً واستلمت نتائج التحاليل من التطبيق دون الحاجة لمراجعة المستشفى مرتين. وفّر عليّ وقتاً كبيراً.',
      author: 'أم محمد',
      role: 'مراجعة في قسم الباطنية',
    },
    contact: {
      phone: '07701234567',
      email: 'care@galaxyhealth.iq',
      address: 'بغداد - المنصور، شارع الأميرات',
      hours: 'الطوارئ 24 ساعة | العيادات 9 صباحاً - 9 مساءً',
    },
  },

  'NVQ-FOOD-07': {
    name: 'Meteor Kitchen',
    badge: 'سلسلة مطاعم وتوصيل',
    headline: 'ألذ الأطباق تصلك ساخنة خلال 30 دقيقة',
    description:
      'ميتيور كيتشن سلسلة مطاعم عراقية بـ 7 فروع، تقدم المشاوي والمأكولات الشرقية والعالمية مع مطبخ مركزي يعمل بمعايير جودة صارمة وأسطول توصيل خاص يغطي بغداد بالكامل.',
    primaryCta: { label: 'اطلب الآن', tab: 'menu' },
    secondaryCta: { label: 'احجز طاولة', tab: 'reservation' },
    stats: [
      { value: '7', label: 'فروع في بغداد' },
      { value: '30 د', label: 'متوسط التوصيل' },
      { value: '4.8★', label: 'تقييم العملاء' },
      { value: '65+', label: 'طبق في القائمة' },
    ],
    services: [
      { title: 'طلب أونلاين وتوصيل', description: 'اختر من القائمة وتابع طلبك مباشرة من المطبخ حتى باب المنزل.' },
      { title: 'حجز الطاولات', description: 'احجز طاولتك مسبقاً واختر الفرع والوقت المناسب لمناسبتك.' },
      { title: 'قوائم متعددة للفروع', description: 'كل فرع بقائمته وأسعاره وعروضه الخاصة بإدارة مركزية.' },
      { title: 'نقاط الولاء', description: 'اجمع نقاطاً مع كل طلب واستبدلها بخصومات ووجبات مجانية.' },
    ],
    testimonial: {
      quote: 'أطلب أسبوعياً والتطبيق يحفظ طلبي المفضل. تتبع الطلب لحظة بلحظة يعطيني راحة بال.',
      author: 'حسين العبيدي',
      role: 'عميل دائم',
    },
    contact: {
      phone: '07709876543',
      email: 'order@meteorkitchen.iq',
      address: 'بغداد - الكرادة داخل، قرب ساحة كهرمانة',
      hours: 'يومياً 11 صباحاً - 2 بعد منتصف الليل',
    },
  },

  'NVQ-EDU-08': {
    name: 'Quasar Academy',
    badge: 'معهد تدريب وتطوير مهني',
    headline: 'تعلّم مهارة اليوم، واحصل على وظيفة الغد',
    description:
      'أكاديمية كوازار معهد تدريب معتمد يقدم دورات في البرمجة والتصميم والتسويق الرقمي وإدارة الأعمال، بشهادات موثقة ومدربين من داخل السوق، حضورياً وعن بُعد.',
    primaryCta: { label: 'تصفح الدورات', tab: 'courses' },
    secondaryCta: { label: 'لوحة الطالب', tab: 'dashboard' },
    stats: [
      { value: '4,200+', label: 'خريج وخريجة' },
      { value: '38', label: 'دورة تدريبية' },
      { value: '92%', label: 'نسبة إكمال الدورات' },
      { value: '25', label: 'مدرب معتمد' },
    ],
    services: [
      { title: 'دورات حضورية وعن بُعد', description: 'اختر الحضور في القاعة أو المتابعة أونلاين بنفس الشهادة.' },
      { title: 'شهادات رقمية موثقة', description: 'شهادة إتمام برمز QR يمكن لأي جهة التحقق منها إلكترونياً.' },
      { title: 'متابعة الدرجات والحضور', description: 'لوحة للطالب تعرض تقدمه ودرجاته ونسبة حضوره أولاً بأول.' },
      { title: 'تقسيط الرسوم', description: 'خطط دفع مرنة على أقساط شهرية دون فوائد.' },
    ],
    testimonial: {
      quote: 'أنهيت دورة تطوير الويب وحصلت على عمل خلال شهرين. المتابعة والمشاريع العملية صنعت الفرق.',
      author: 'زينب كريم',
      role: 'خريجة دورة تطوير الويب',
    },
    contact: {
      phone: '07712345678',
      email: 'info@quasaracademy.iq',
      address: 'بغداد - زيونة، شارع الربيعي',
      hours: 'السبت - الخميس، 10 صباحاً - 8 مساءً',
    },
  },

  'NVQ-PHONE-09': {
    name: 'Pulsar Mobile',
    badge: 'هواتف ذكية وإكسسوارات',
    headline: 'هاتفك الجديد بضمان حقيقي وسعر واضح',
    description:
      'بلسار موبايل متجر هواتف ذكية يبيع أجهزة أصلية بكفالة وكيل، مع مقارنة مواصفات قبل الشراء، وخيارات ذاكرة وألوان، وتقسيط مريح، وصيانة معتمدة داخل المتجر.',
    primaryCta: { label: 'تصفح الهواتف', tab: 'phones' },
    secondaryCta: { label: 'أكمل طلبك', tab: 'order' },
    stats: [
      { value: '4', label: 'فروع في بغداد' },
      { value: '150+', label: 'موديل متوفر' },
      { value: '4.8★', label: 'تقييم الزبائن' },
      { value: '12 شهر', label: 'كفالة الوكيل' },
    ],
    services: [
      { title: 'أجهزة أصلية بكفالة', description: 'كل جهاز يصل بكفالة وكيل موثقة برقم تسلسلي داخل الفاتورة.' },
      { title: 'مقارنة المواصفات', description: 'قارن الشاشة والكاميرا والبطارية بين الموديلات قبل ما تقرر.' },
      { title: 'تقسيط بدون فوائد', description: 'قسّط جهازك على دفعات شهرية مع موافقة فورية داخل المتجر.' },
      { title: 'صيانة واستبدال', description: 'مركز صيانة معتمد، واستبدال خلال 7 أيام إذا كان هناك عيب مصنعي.' },
    ],
    testimonial: {
      quote: 'اشتريت الجهاز بالتقسيط والسعر كان نفس المعروض بالموقع بالضبط، والكفالة انكتبت بالفاتورة.',
      author: 'عمر الجبوري',
      role: 'زبون - iPhone 15 Pro Max',
    },
    contact: {
      phone: '07705558888',
      email: 'sales@pulsarmobile.iq',
      address: 'بغداد - الكرادة، شارع 62',
      hours: 'السبت - الخميس، 10 صباحاً - 10 مساءً',
    },
  },

  'NVQ-LOG-10': {
    name: 'Comet Express',
    badge: 'خدمات شحن ولوجستيات',
    headline: 'شحنتك تصل بسرعة، وتعرف مكانها كل لحظة',
    description:
      'كوميت إكسبرس شركة شحن وتوصيل تغطي جميع محافظات العراق، بأسطول من 120 مركبة ومستودعات فرز في 5 مدن، وخدمة الدفع عند الاستلام مع تسوية يومية للتجار.',
    primaryCta: { label: 'تتبّع شحنتك', tab: 'tracking' },
    secondaryCta: { label: 'احسب تكلفة الشحن', tab: 'calculator' },
    stats: [
      { value: '18', label: 'محافظة مغطاة' },
      { value: '120', label: 'مركبة توصيل' },
      { value: '48 س', label: 'متوسط زمن التسليم' },
      { value: '99.2%', label: 'شحنات وصلت بنجاح' },
    ],
    services: [
      { title: 'تتبّع لحظي للشحنة', description: 'تابع شحنتك في كل مرحلة من الاستلام حتى التسليم النهائي.' },
      { title: 'حاسبة تكلفة فورية', description: 'اعرف تكلفة الشحن قبل الإرسال حسب الوزن والوجهة.' },
      { title: 'الدفع عند الاستلام', description: 'حصّل قيمة بضاعتك من الزبون مع تسوية مالية يومية موثقة.' },
      { title: 'إشعارات واتساب تلقائية', description: 'الزبون يستلم تحديثاً بكل تغيير في حالة شحنته.' },
    ],
    testimonial: {
      quote: 'أدير متجراً إلكترونياً وأرسل يومياً أكثر من 40 طرداً. التسوية اليومية والتتبع وفّرا عليّ موظفاً كاملاً.',
      author: 'مصطفى الساعدي',
      role: 'صاحب متجر إلكتروني',
    },
    contact: {
      phone: '07703334444',
      email: 'support@cometexpress.iq',
      address: 'بغداد - الدورة، المنطقة الصناعية',
      hours: 'السبت - الخميس، 8 صباحاً - 8 مساءً',
    },
  },
};

// The five templates above carry a full CompanyProfile. The remaining five drive their own
// bespoke page layouts and never needed one — but the site chrome (header, account area,
// footer) does, so every demo can present itself as a named business with real contact
// details instead of borrowing the catalogue's marketing title.
export const SITE_IDENTITIES: Record<string, { name: string; badge: string; contact: CompanyProfile['contact'] }> = {
  'NVQ-CORP-01': {
    name: 'Stella Holding',
    badge: 'مجموعة استثمارية قابضة',
    contact: {
      phone: '07701112233',
      email: 'info@stellaholding.iq',
      address: 'بغداد - المنصور، برج ستيلا التجاري',
      hours: 'الأحد - الخميس، 9 صباحاً - 5 مساءً',
    },
  },
  'NVQ-ECOM-02': {
    name: 'Orion Store',
    badge: 'متجر أزياء إلكتروني',
    contact: {
      phone: '07704445566',
      email: 'support@orionstore.iq',
      address: 'بغداد - الكرادة، مجمع أوريون',
      hours: 'الطلبات على مدار الساعة | الدعم 9 صباحاً - 10 مساءً',
    },
  },
  'NVQ-TECH-03': {
    name: 'Nebula Cloud',
    badge: 'منصة برمجيات سحابية',
    contact: {
      phone: '07707778899',
      email: 'hello@nebulacloud.iq',
      address: 'بغداد - زيونة، مركز الابتكار التقني',
      hours: 'دعم فني 24/7 عبر المنصة',
    },
  },
  'NVQ-REAL-04': {
    name: 'Cosmos Estates',
    badge: 'تطوير واستثمار عقاري',
    contact: {
      phone: '07702223344',
      email: 'sales@cosmosestates.iq',
      address: 'بغداد - اليرموك، مجمع كوزموس السكني',
      hours: 'يومياً 10 صباحاً - 8 مساءً',
    },
  },
  'NVQ-FINTECH-06': {
    name: 'Vortex Pay',
    badge: 'محفظة ومدفوعات إلكترونية',
    contact: {
      phone: '07706667788',
      email: 'care@vortexpay.iq',
      address: 'بغداد - الجادرية، برج فورتكس المالي',
      hours: 'خدمة العملاء 24 ساعة',
    },
  },
};

// Section lists for the shared side menu. Every template used to spell its sections out as
// a wrapping row of pills inside its own header, which crowded the header and broke down
// entirely once a template had five sections. One menu button per template, opening one
// drawer, replaces all of them.
export const SITE_NAV_ITEMS: Record<string, Array<{ id: string; label: string }>> = {
  'NVQ-CORP-01': [
    { id: 'home', label: 'الرئيسية' },
    { id: 'services', label: 'خدماتنا' },
    { id: 'projects', label: 'المشاريع' },
    { id: 'calculator', label: 'حاسبة المشروع' },
    { id: 'contact', label: 'اتصل بنا' },
  ],
  'NVQ-TECH-03': [
    { id: 'home', label: '~/home' },
    { id: 'features', label: '~/features' },
    { id: 'docs', label: '~/docs' },
    { id: 'pricing', label: '~/pricing' },
    { id: 'dashboard', label: '~/dashboard' },
  ],
  'NVQ-REAL-04': [
    { id: 'home', label: 'الرئيسية' },
    { id: 'properties', label: 'العقارات' },
    { id: 'booking', label: 'حجز معاينة' },
    { id: 'agents', label: 'مستشارونا' },
  ],
  'NVQ-HEALTH-05': [
    { id: 'home', label: 'الرئيسية' },
    { id: 'doctors', label: 'الأطباء والتخصصات' },
    { id: 'booking', label: 'حجز موعد' },
    { id: 'results', label: 'نتائج التحاليل' },
    { id: 'consultation', label: 'استشارة مرئية' },
  ],
  'NVQ-FINTECH-06': [
    { id: 'home', label: 'الرئيسية' },
    { id: 'wallet', label: 'المحفظة' },
    { id: 'cards', label: 'البطاقات' },
    { id: 'security', label: 'الأمان' },
  ],
  'NVQ-FOOD-07': [
    { id: 'home', label: 'الرئيسية' },
    { id: 'menu', label: 'قائمة الطعام' },
    { id: 'order', label: 'سلة الطلب' },
    { id: 'reservation', label: 'حجز طاولة' },
  ],
  'NVQ-EDU-08': [
    { id: 'home', label: 'الرئيسية' },
    { id: 'courses', label: 'الدورات' },
    { id: 'enroll', label: 'التسجيل' },
    { id: 'dashboard', label: 'لوحة الطالب' },
  ],
  'NVQ-PHONE-09': [
    { id: 'home', label: 'الرئيسية' },
    { id: 'phones', label: 'الهواتف' },
    { id: 'order', label: 'إتمام الطلب' },
    { id: 'confirmation', label: 'تأكيد الطلب' },
  ],
  'NVQ-LOG-10': [
    { id: 'home', label: 'الرئيسية' },
    { id: 'tracking', label: 'تتبع الشحنة' },
    { id: 'calculator', label: 'حاسبة التكلفة' },
    { id: 'fleet', label: 'الأسطول' },
  ],
};

// The store navigates by product category rather than by page, so its menu drives that
// instead of the shared tab state.
export const STORE_NAV_ITEMS = [
  { id: 'all', label: 'كل المنتجات' },
  { id: 'men', label: 'أزياء رجالية' },
  { id: 'women', label: 'أزياء نسائية' },
  { id: 'accessories', label: 'إكسسوارات وأحذية' },
];

export const STORE_SORT_OPTIONS: { value: 'default' | 'priceAsc' | 'priceDesc'; label: string }[] = [
  { value: 'default', label: 'ترتيب: الأكثر رواجاً' },
  { value: 'priceAsc', label: 'السعر: من الأقل للأعلى' },
  { value: 'priceDesc', label: 'السعر: من الأعلى للأقل' },
];
