import React, { useState, useEffect } from 'react';
import { Template } from '../types';
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
  ArrowLeft,
  Eye,
  Building2,
  ShoppingBag,
  Stethoscope,
  Wallet,
  Send,
  ArrowUpRight,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Palette,
  Sliders,
  Calendar,
  CreditCard,
  Cpu,
  Globe,
  Shield,
  ChefHat,
  GraduationCap,
  Hotel,
  Truck,
  Package,
  MapPin
} from 'lucide-react';
import { cosmicAudio } from '../lib/audio';

interface TemplateInteractiveSandboxProps {
  template: Template;
  onClose: () => void;
  onSelectForContract: (template: Template, customNotes?: string, primaryColorHex?: string) => void;
}

export type ThemeColor = 'emerald' | 'purple' | 'cyan' | 'amber' | 'rose' | 'monochrome';

const THEME_COLOR_HEX: Record<ThemeColor, string> = {
  emerald: '#10b981',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  rose: '#f43f5e',
  monochrome: '#71717a',
};

const THEME_COLOR_LABEL_AR: Record<ThemeColor, string> = {
  emerald: 'زمردي',
  purple: 'بنفسجي',
  cyan: 'سماوي',
  amber: 'ذهبي',
  rose: 'ياقوتي',
  monochrome: 'رمادي',
};

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  availableToday: boolean;
  imageBg: string;
}

const SAMPLE_DOCTORS: Doctor[] = [
  { id: 'doc-1', name: 'د. سارة الجبوري', specialty: 'أمراض القلب والشرايين', rating: 4.9, availableToday: true, imageBg: 'from-cyan-900/60 to-slate-900' },
  { id: 'doc-2', name: 'د. عمر الحسني', specialty: 'الأطفال وحديثي الولادة', rating: 4.8, availableToday: true, imageBg: 'from-blue-900/60 to-slate-900' },
  { id: 'doc-3', name: 'د. لينا صالح', specialty: 'الجلدية والتجميل', rating: 4.7, availableToday: false, imageBg: 'from-teal-900/60 to-slate-900' },
  { id: 'doc-4', name: 'د. أحمد كريم', specialty: 'العظام والمفاصل', rating: 4.9, availableToday: true, imageBg: 'from-cyan-950/70 to-slate-900' },
];

const SAMPLE_LAB_RESULTS = [
  { id: 'LAB-2291', name: 'فحص الدم الشامل (CBC)', date: '2026-07-28', status: 'جاهز', doctor: 'د. سارة الجبوري' },
  { id: 'LAB-2288', name: 'تحليل وظائف الكبد', date: '2026-07-20', status: 'جاهز', doctor: 'د. أحمد كريم' },
  { id: 'LAB-2275', name: 'الأشعة المقطعية - الصدر', date: '2026-07-05', status: 'قيد المراجعة', doctor: 'د. عمر الحسني' },
];

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
}

interface ClothingProduct {
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

interface CartItem {
  product: ClothingProduct;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
}

const SAMPLE_PRODUCTS: ClothingProduct[] = [
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
interface MenuItem {
  id: string;
  name: string;
  category: 'appetizers' | 'mains' | 'desserts' | 'drinks';
  priceIQD: number;
  imageBg: string;
  description: string;
}

interface FoodOrderItem {
  item: MenuItem;
  quantity: number;
}

const SAMPLE_MENU_ITEMS: MenuItem[] = [
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
interface Course {
  id: string;
  title: string;
  category: 'programming' | 'languages' | 'business' | 'design';
  instructor: string;
  level: 'مبتدئ' | 'متوسط' | 'متقدم';
  durationWeeks: number;
  priceIQD: number;
  imageBg: string;
}

interface Enrollment {
  id: string;
  courseTitle: string;
  studentName: string;
  date: string;
}

const SAMPLE_COURSES: Course[] = [
  { id: 'course-1', title: 'أساسيات تطوير الويب', category: 'programming', instructor: 'م. حيدر السعدي', level: 'مبتدئ', durationWeeks: 8, priceIQD: 250000, imageBg: 'from-blue-900/60 to-slate-900' },
  { id: 'course-2', title: 'تطبيقات الذكاء الاصطناعي', category: 'programming', instructor: 'م. رنا الكناني', level: 'متقدم', durationWeeks: 10, priceIQD: 400000, imageBg: 'from-indigo-900/60 to-slate-900' },
  { id: 'course-3', title: 'اللغة الإنجليزية للأعمال', category: 'languages', instructor: 'أ. مريم توفيق', level: 'متوسط', durationWeeks: 6, priceIQD: 150000, imageBg: 'from-cyan-900/60 to-slate-900' },
  { id: 'course-4', title: 'إدارة المشاريع الاحترافية', category: 'business', instructor: 'د. سيف الدليمي', level: 'متوسط', durationWeeks: 6, priceIQD: 220000, imageBg: 'from-emerald-900/60 to-slate-900' },
  { id: 'course-5', title: 'ريادة الأعمال والتسويق', category: 'business', instructor: 'أ. نور الزبيدي', level: 'مبتدئ', durationWeeks: 5, priceIQD: 180000, imageBg: 'from-teal-900/60 to-slate-900' },
  { id: 'course-6', title: 'تصميم واجهات UI/UX', category: 'design', instructor: 'م. علي حمزة', level: 'متوسط', durationWeeks: 7, priceIQD: 230000, imageBg: 'from-purple-900/60 to-slate-900' },
];

const SAMPLE_GRADES = [
  { course: 'أساسيات تطوير الويب', grade: 'A', status: 'مكتملة' },
  { course: 'اللغة الإنجليزية للأعمال', grade: 'B+', status: 'قيد الدراسة' },
];

const SAMPLE_ATTENDANCE = [
  { date: '2026-08-01', status: 'حاضر' },
  { date: '2026-08-03', status: 'حاضر' },
  { date: '2026-08-05', status: 'غائب' },
  { date: '2026-08-08', status: 'حاضر' },
];

// Hospitality demo data
interface HotelRoom {
  id: string;
  name: string;
  type: 'standard' | 'deluxe' | 'suite';
  pricePerNightIQD: number;
  capacity: number;
  imageBg: string;
  amenities: string[];
}

interface HotelBooking {
  id: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  totalIQD: number;
}

const SAMPLE_ROOMS: HotelRoom[] = [
  { id: 'room-1', name: 'غرفة قياسية بإطلالة على المدينة', type: 'standard', pricePerNightIQD: 90000, capacity: 2, imageBg: 'from-slate-800/60 to-slate-900', amenities: ['واي فاي مجاني', 'إفطار', 'تكييف'] },
  { id: 'room-2', name: 'غرفة ديلوكس بإطلالة على النهر', type: 'deluxe', pricePerNightIQD: 140000, capacity: 2, imageBg: 'from-amber-900/60 to-slate-900', amenities: ['واي فاي مجاني', 'إفطار', 'شرفة خاصة', 'ميني بار'] },
  { id: 'room-3', name: 'جناح تنفيذي فاخر', type: 'suite', pricePerNightIQD: 220000, capacity: 4, imageBg: 'from-yellow-900/60 to-slate-900', amenities: ['واي فاي مجاني', 'إفطار', 'صالة استقبال', 'خدمة كونسيرج'] },
  { id: 'room-4', name: 'جناح العائلة الواسع', type: 'suite', pricePerNightIQD: 260000, capacity: 6, imageBg: 'from-orange-900/60 to-slate-900', amenities: ['واي فاي مجاني', 'إفطار', 'غرفتي نوم', 'مطبخ صغير'] },
];

// Logistics demo data
interface ShipmentStage {
  label: string;
  done: boolean;
}

interface Shipment {
  id: string;
  trackingNumber: string;
  origin: string;
  destination: string;
  status: string;
  stages: ShipmentStage[];
}

interface ShippingQuote {
  id: string;
  weight: string;
  destination: 'local' | 'regional' | 'international';
  priceIQD: number;
}

const SAMPLE_SHIPMENTS: Shipment[] = [
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
interface CompanyProfile {
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

const COMPANY_PROFILES: Record<string, CompanyProfile> = {
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

  'NVQ-HOTEL-09': {
    name: 'Aurora Stay',
    badge: 'فنادق ومنتجعات',
    headline: 'إقامة تليق بك في قلب المدينة',
    description:
      'أورورا ستاي مجموعة فندقية تدير 3 فنادق ومنتجعاً سياحياً، بغرف وأجنحة مصممة بعناية، ومطاعم، وقاعات مؤتمرات، وخدمة كونسيرج على مدار الساعة.',
    primaryCta: { label: 'احجز غرفتك', tab: 'rooms' },
    secondaryCta: { label: 'تفاصيل الحجز', tab: 'booking' },
    stats: [
      { value: '3', label: 'فنادق ومنتجع' },
      { value: '240', label: 'غرفة وجناح' },
      { value: '4.7★', label: 'تقييم النزلاء' },
      { value: '24/7', label: 'خدمة الكونسيرج' },
    ],
    services: [
      { title: 'حجز فوري ومؤكد', description: 'اختر الغرفة والتواريخ واحصل على تأكيد الحجز مباشرة.' },
      { title: 'تسعير حسب الموسم', description: 'أسعار ديناميكية تتغير حسب الإشغال والموسم لأفضل قيمة.' },
      { title: 'مزامنة مع منصات الحجز', description: 'تكامل مع Booking وAirbnb لمنع الحجز المزدوج تلقائياً.' },
      { title: 'كونسيرج رقمي', description: 'اطلب خدمة الغرف أو المواصلات من هاتفك دون اتصال.' },
    ],
    testimonial: {
      quote: 'الحجز تم بثوانٍ والغرفة كانت مطابقة تماماً للصور. الاستقبال كان بانتظارنا بالاسم.',
      author: 'عمر الجبوري',
      role: 'نزيل - جناح تنفيذي',
    },
    contact: {
      phone: '07705558888',
      email: 'reservations@aurorastay.iq',
      address: 'بغداد - المنصور، شارع 14 رمضان',
      hours: 'الاستقبال 24 ساعة طوال أيام الأسبوع',
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

export const TemplateInteractiveSandbox: React.FC<TemplateInteractiveSandboxProps> = ({
  template,
  onClose,
  onSelectForContract,
}) => {
  const [deviceView, setDeviceView] = useState<'full' | 'desktop' | 'tablet' | 'mobile'>('full');
  const [controlsHidden, setControlsHidden] = useState<boolean>(false);
  const [themeColor, setThemeColor] = useState<ThemeColor>('emerald');
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

  // General Interactive States
  const [activeTab, setActiveTab] = useState<string>('home');

  // E-Commerce Store States
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('novaiq_sandbox_cart');
      return saved ? JSON.parse(saved) : [
        {
          product: SAMPLE_PRODUCTS[0],
          selectedColor: 'أبيض ناصع',
          selectedSize: 'L',
          quantity: 1
        }
      ];
    } catch {
      return [];
    }
  });

  const [storeCategory, setStoreCategory] = useState<'all' | 'men' | 'women' | 'accessories'>('all');
  const [storeSearch, setStoreSearch] = useState<string>('');
  const [storeSort, setStoreSort] = useState<'default' | 'priceAsc' | 'priceDesc'>('default');
  const [selectedProductForModal, setSelectedProductForModal] = useState<ClothingProduct | null>(null);
  const [modalColor, setModalColor] = useState<string>('');
  const [modalSize, setModalSize] = useState<string>('');
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [orderConfirmedInvoice, setOrderConfirmedInvoice] = useState<any | null>(null);

  // Checkout Form State
  const [customerName, setCustomerName] = useState<string>('أحمد العراقي');
  const [customerPhone, setCustomerPhone] = useState<string>('07701234567');
  const [customerCity, setCustomerCity] = useState<string>('بغداد - الكرادة');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'zaincash' | 'mastercard'>('cod');

  // Interactive demo states for other templates
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(() => {
    try { return (localStorage.getItem('novaiq_sandbox_plan') as 'monthly' | 'yearly') || 'monthly'; } catch { return 'monthly'; }
  });
  const [bookingDate, setBookingDate] = useState<string>('2026-08-15');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>(() => {
    try { return localStorage.getItem('novaiq_sandbox_property_filter') || 'all'; } catch { return 'all'; }
  });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('prop-1');
  const [visitorName, setVisitorName] = useState<string>('أحمد العراقي');
  const [propertyVisits, setPropertyVisits] = useState<Array<{ id: string; propertyTitle: string; date: string; visitorName: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('novaiq_sandbox_property_visits') || '[]'); } catch { return []; }
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(true);
  const [transferAmount, setTransferAmount] = useState<string>('250000');
  const [transfersLog, setTransfersLog] = useState<Array<{ id: string; amount: string; date: string; recipient: string }>>(() => {
    try {
      const saved = localStorage.getItem('novaiq_sandbox_transfers');
      return saved ? JSON.parse(saved) : [
        { id: 'TX-98421', amount: '500,000 د.ع', date: '2026-08-02', recipient: 'زين كاش - متجر بغداد' },
        { id: 'TX-98420', amount: '150,000 د.ع', date: '2026-08-01', recipient: 'تحويل سريع - علي حسام' }
      ];
    } catch {
      return [];
    }
  });

  // Corporate calculator state
  const [orgSize, setOrgSize] = useState<'medium' | 'large' | 'holding'>(() => {
    try { return (localStorage.getItem('novaiq_sandbox_orgsize') as 'medium' | 'large' | 'holding') || 'medium'; } catch { return 'medium'; }
  });

  // Which service or project card the customer clicked into, on the Corporate template's
  // Services/Projects tabs — a real site lets you click a card to see its full details
  // instead of just showing a static, non-interactive grid.
  const [corpDetail, setCorpDetail] = useState<{ kind: 'service' | 'project'; index: number } | null>(null);

  // Healthcare booking state
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try { return JSON.parse(localStorage.getItem('novaiq_sandbox_appointments') || '[]'); } catch { return []; }
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('doc-1');
  const [appointmentDate, setAppointmentDate] = useState<string>('2026-08-15');
  const [appointmentTime, setAppointmentTime] = useState<string>('10:00');

  // Restaurant demo state
  const [foodOrder, setFoodOrder] = useState<FoodOrderItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('novaiq_sandbox_food_order') || '[]'); } catch { return []; }
  });
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<'all' | 'appetizers' | 'mains' | 'desserts' | 'drinks'>('all');
  const [reservationGuests, setReservationGuests] = useState<number>(2);
  const [reservationDate, setReservationDate] = useState<string>('2026-08-15');
  const [reservationTime, setReservationTime] = useState<string>('19:30');
  const [tableReservations, setTableReservations] = useState<Array<{ id: string; guests: number; date: string; time: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('novaiq_sandbox_table_reservations') || '[]'); } catch { return []; }
  });

  // Education demo state
  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => {
    try { return JSON.parse(localStorage.getItem('novaiq_sandbox_enrollments') || '[]'); } catch { return []; }
  });
  const [selectedCourseId, setSelectedCourseId] = useState<string>('course-1');
  const [courseCategoryFilter, setCourseCategoryFilter] = useState<'all' | 'programming' | 'languages' | 'business' | 'design'>('all');
  const [studentNameInput, setStudentNameInput] = useState<string>('أحمد العراقي');

  // Hospitality demo state
  const [hotelBookings, setHotelBookings] = useState<HotelBooking[]>(() => {
    try { return JSON.parse(localStorage.getItem('novaiq_sandbox_hotel_bookings') || '[]'); } catch { return []; }
  });
  const [selectedRoomId, setSelectedRoomId] = useState<string>('room-1');
  const [checkInDate, setCheckInDate] = useState<string>('2026-08-20');
  const [checkOutDate, setCheckOutDate] = useState<string>('2026-08-23');
  const [guestsCount, setGuestsCount] = useState<number>(2);

  // Logistics demo state
  const [trackingInput, setTrackingInput] = useState<string>('');
  const [foundShipment, setFoundShipment] = useState<Shipment | null>(null);
  const [quoteWeight, setQuoteWeight] = useState<string>('5');
  const [quoteDestination, setQuoteDestination] = useState<'local' | 'regional' | 'international'>('local');
  const [savedQuotes, setSavedQuotes] = useState<ShippingQuote[]>(() => {
    try { return JSON.parse(localStorage.getItem('novaiq_sandbox_shipping_quotes') || '[]'); } catch { return []; }
  });

  // Persist per-template demo state locally so a returning customer's choices are remembered
  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_plan', selectedPlan); } catch { /* ignore */ }
  }, [selectedPlan]);

  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_property_filter', selectedPropertyFilter); } catch { /* ignore */ }
  }, [selectedPropertyFilter]);

  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_property_visits', JSON.stringify(propertyVisits)); } catch { /* ignore */ }
  }, [propertyVisits]);

  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_transfers', JSON.stringify(transfersLog)); } catch { /* ignore */ }
  }, [transfersLog]);

  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_orgsize', orgSize); } catch { /* ignore */ }
  }, [orgSize]);

  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_appointments', JSON.stringify(appointments)); } catch { /* ignore */ }
  }, [appointments]);

  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_food_order', JSON.stringify(foodOrder)); } catch { /* ignore */ }
  }, [foodOrder]);

  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_table_reservations', JSON.stringify(tableReservations)); } catch { /* ignore */ }
  }, [tableReservations]);

  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_enrollments', JSON.stringify(enrollments)); } catch { /* ignore */ }
  }, [enrollments]);

  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_hotel_bookings', JSON.stringify(hotelBookings)); } catch { /* ignore */ }
  }, [hotelBookings]);

  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_shipping_quotes', JSON.stringify(savedQuotes)); } catch { /* ignore */ }
  }, [savedQuotes]);

  // Persist Cart
  useEffect(() => {
    try {
      localStorage.setItem('novaiq_sandbox_cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  // Persist Theme Color
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('novaiq_sandbox_theme') as ThemeColor;
      if (savedTheme) setThemeColor(savedTheme);
    } catch {
      // ignore
    }
  }, []);

  const changeThemeColor = (color: ThemeColor) => {
    setThemeColor(color);
    try {
      localStorage.setItem('novaiq_sandbox_theme', color);
    } catch {
      // ignore
    }
    cosmicAudio.playPing();
  };

  const basePrice = template.basePriceIQD || 0;

  // Summarize exactly what the customer configured while playing with the live demo,
  // so it carries over into their actual contract request instead of being lost.
  const buildCustomizationSummary = (): string => {
    const lines: string[] = [
      `لون الهوية البصرية المفضل من المعاينة الحية: ${THEME_COLOR_LABEL_AR[themeColor]}`,
    ];

    const isEcommerceTemplate = template.id === 'NVQ-ECOM-02' || template.category === 'ecommerce';

    if (isEcommerceTemplate && cart.length > 0) {
      lines.push('منتجات جرّبها العميل داخل السلة التفاعلية:');
      cart.forEach((item) => {
        lines.push(`- ${item.product.name} | اللون: ${item.selectedColor} | القياس: ${item.selectedSize} | الكمية: ${item.quantity}`);
      });
    } else if (template.id === 'NVQ-CORP-01') {
      const sizeLabel = orgSize === 'medium' ? 'مؤسسة متوسطة' : orgSize === 'large' ? 'مؤسسة كبرى' : 'مجموعة قابضة';
      lines.push(`حجم المؤسسة المختار في حاسبة التكلفة التفاعلية: ${sizeLabel}`);
    } else if (template.id === 'NVQ-TECH-03') {
      lines.push(`نوع الاشتراك المفضل من المعاينة: ${selectedPlan === 'monthly' ? 'اشتراك شهري' : 'اشتراك سنوي (خصم 20%)'}`);
    } else if (template.id === 'NVQ-REAL-04') {
      const filterLabel = selectedPropertyFilter === 'villas' ? 'الفلل الفاخرة' : selectedPropertyFilter === 'apartments' ? 'الشقق والمكاتب' : 'جميع العقارات';
      lines.push(`تصنيف العقارات الذي اهتم به العميل: ${filterLabel}`);
      if (propertyVisits.length > 0) {
        const last = propertyVisits[0];
        lines.push(`قام العميل بتجربة طلب حجز معاينة تجريبي لعقار: ${last.propertyTitle} بتاريخ ${last.date}`);
      }
    } else if (template.id === 'NVQ-HEALTH-05' && appointments.length > 0) {
      const last = appointments[0];
      lines.push(`قام العميل بتجربة حجز موعد تجريبي مع: ${last.doctorName} (${last.specialty}) بتاريخ ${last.date} الساعة ${last.time}`);
    } else if (template.id === 'NVQ-FINTECH-06' && transfersLog.length > 2) {
      lines.push('قام العميل بتجربة تنفيذ عملية تحويل مالي داخل النظام التفاعلي.');
    } else if (template.id === 'NVQ-FOOD-07') {
      if (foodOrder.length > 0) {
        lines.push('عناصر جرّبها العميل في سلة الطلب التفاعلية:');
        foodOrder.forEach((o) => lines.push(`- ${o.item.name} × ${o.quantity}`));
      }
      if (tableReservations.length > 0) {
        const r = tableReservations[0];
        lines.push(`قام العميل بتجربة حجز طاولة تجريبي لعدد ${r.guests} أشخاص بتاريخ ${r.date} الساعة ${r.time}`);
      }
    } else if (template.id === 'NVQ-EDU-08' && enrollments.length > 0) {
      const last = enrollments[0];
      lines.push(`قام العميل بتجربة التسجيل في دورة: ${last.courseTitle} باسم الطالب التجريبي ${last.studentName}`);
    } else if (template.id === 'NVQ-HOTEL-09' && hotelBookings.length > 0) {
      const last = hotelBookings[0];
      lines.push(`قام العميل بتجربة حجز غرفة: ${last.roomName} من ${last.checkIn} إلى ${last.checkOut} (${last.nights} ليالٍ) بتكلفة تقديرية ${last.totalIQD.toLocaleString()} د.ع`);
    } else if (template.id === 'NVQ-LOG-10') {
      if (foundShipment) lines.push(`قام العميل بتجربة تتبع شحنة تجريبية: ${foundShipment.trackingNumber} (${foundShipment.status})`);
      if (savedQuotes.length > 0) {
        const q = savedQuotes[0];
        lines.push(`قام العميل بحساب عرض سعر شحن تجريبي: وزن ${q.weight} كغم لوجهة ${q.destination} بتكلفة تقديرية ${q.priceIQD.toLocaleString()} د.ع`);
      }
    }

    return lines.join('\n');
  };

  // Theme styling helpers
  const getThemeClasses = () => {
    switch (themeColor) {
      case 'purple':
        return {
          primaryBg: 'bg-purple-600 hover:bg-purple-500',
          primaryText: 'text-purple-400',
          primaryBorder: 'border-purple-500/40',
          badgeBg: 'bg-purple-500/20 text-purple-300',
          gradient: 'from-purple-950/80 via-slate-900 to-slate-950'
        };
      case 'cyan':
        return {
          primaryBg: 'bg-cyan-600 hover:bg-cyan-500',
          primaryText: 'text-cyan-400',
          primaryBorder: 'border-cyan-500/40',
          badgeBg: 'bg-cyan-500/20 text-cyan-300',
          gradient: 'from-cyan-950/80 via-slate-900 to-slate-950'
        };
      case 'amber':
        return {
          primaryBg: 'bg-amber-600 hover:bg-amber-500',
          primaryText: 'text-amber-400',
          primaryBorder: 'border-amber-500/40',
          badgeBg: 'bg-amber-500/20 text-amber-300',
          gradient: 'from-amber-950/80 via-slate-900 to-slate-950'
        };
      case 'rose':
        return {
          primaryBg: 'bg-rose-600 hover:bg-rose-500',
          primaryText: 'text-rose-400',
          primaryBorder: 'border-rose-500/40',
          badgeBg: 'bg-rose-500/20 text-rose-300',
          gradient: 'from-rose-950/80 via-slate-900 to-slate-950'
        };
      case 'monochrome':
        return {
          primaryBg: 'bg-white hover:bg-zinc-200 text-black',
          primaryText: 'text-zinc-100',
          primaryBorder: 'border-zinc-400/40',
          badgeBg: 'bg-zinc-800 text-zinc-200',
          gradient: 'from-zinc-900 via-slate-950 to-black'
        };
      case 'emerald':
      default:
        return {
          primaryBg: 'bg-emerald-600 hover:bg-emerald-500',
          primaryText: 'text-emerald-400',
          primaryBorder: 'border-emerald-500/40',
          badgeBg: 'bg-emerald-500/20 text-emerald-300',
          gradient: 'from-emerald-950/80 via-slate-900 to-slate-950'
        };
    }
  };

  const themeStyle = getThemeClasses();

  // The device-frame width (desktop/tablet/mobile) is a fixed pixel box, but CSS media
  // queries (sm:/md:/lg:) always evaluate against the REAL browser viewport, not the box
  // around them. Without this, picking "mobile" while testing from a desktop browser still
  // renders multi-column desktop layouts squeezed into the small frame. Forcing single-column
  // classes whenever the mobile frame is selected makes the simulation honest regardless of
  // which device is actually running the browser.
  const isMobileFrame = deviceView === 'mobile';
  const gridCols = (mobileCols: string, wideCols: string) => isMobileFrame ? mobileCols : `${mobileCols} ${wideCols}`;

  // Renders a template's landing page from its CompanyProfile. Shared across templates so
  // every demo opens on a page that reads like a real business, not a bare feature widget.
  const renderCompanyHome = (profile: CompanyProfile) => (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Hero */}
      <div className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-r ${themeStyle.gradient} border ${themeStyle.primaryBorder} text-center space-y-3 sm:space-y-4`}>
        <span className={`px-3 py-1 rounded-full ${themeStyle.badgeBg} text-xs font-semibold inline-block`}>
          {profile.badge}
        </span>
        <h3 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
          {profile.headline}
        </h3>
        <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
          {profile.description}
        </p>
        <div className={`pt-2 flex ${isMobileFrame ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
          <button
            onClick={() => { setActiveTab(profile.primaryCta.tab); cosmicAudio.playPing(); }}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} text-white text-xs font-bold cursor-pointer`}
          >
            {profile.primaryCta.label}
          </button>
          <button
            onClick={() => { setActiveTab(profile.secondaryCta.tab); cosmicAudio.playTick(); }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
          >
            {profile.secondaryCta.label}
          </button>
        </div>
      </div>

      {/* Key numbers */}
      <div className={`grid ${gridCols('grid-cols-2', 'sm:grid-cols-4')} gap-3`}>
        {profile.stats.map((stat, i) => (
          <div key={i} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <div className={`text-lg sm:text-xl font-extrabold font-mono ${themeStyle.primaryText}`}>{stat.value}</div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* What the company offers */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-white">ماذا نقدّم لك</h4>
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-3`}>
          {profile.services.map((service, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${themeStyle.primaryText}`} />
                <span className="text-xs font-bold text-white">{service.title}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Client quote */}
      <div className={`p-5 rounded-2xl bg-slate-900 border ${themeStyle.primaryBorder} space-y-3`}>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">“{profile.testimonial.quote}”</p>
        <div className="flex items-center gap-2.5 pt-1 border-t border-slate-800">
          <div className={`w-8 h-8 rounded-full ${themeStyle.primaryBg} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
            {profile.testimonial.author.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">{profile.testimonial.author}</div>
            <div className="text-[10px] text-slate-400 truncate">{profile.testimonial.role}</div>
          </div>
        </div>
      </div>

      {/* Contact block */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h4 className="text-sm font-bold text-white">تواصل معنا</h4>
        <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-3 text-[11px]`}>
          <div className="flex items-center gap-2 text-slate-300">
            <Send className={`w-3.5 h-3.5 shrink-0 ${themeStyle.primaryText}`} />
            <span className="font-mono" dir="ltr">{profile.contact.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Globe className={`w-3.5 h-3.5 shrink-0 ${themeStyle.primaryText}`} />
            <span className="font-mono truncate" dir="ltr">{profile.contact.email}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className={`w-3.5 h-3.5 shrink-0 ${themeStyle.primaryText}`} />
            <span>{profile.contact.address}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${themeStyle.primaryText}`} />
            <span>{profile.contact.hours}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Cart operations
  const addToCart = (product: ClothingProduct, color: string, size: string, quantity: number) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => 
        item.product.id === product.id && item.selectedColor === color && item.selectedSize === size
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + quantity };
        return updated;
      } else {
        return [...prev, { product, selectedColor: color, selectedSize: size, quantity }];
      }
    });
    cosmicAudio.playPing();
    setSelectedProductForModal(null);
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const newQty = prev[index].quantity + delta;
      if (newQty <= 0) {
        const updated = [...prev];
        updated.splice(index, 1);
        return updated;
      }
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
    cosmicAudio.playPing();
  };

  const totalCartIQD = cart.reduce((sum, item) => sum + (item.product.priceIQD * item.quantity), 0);
  const totalCartUSD = Math.round(totalCartIQD / 1450);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Restaurant order helpers
  const addFoodItem = (menuItem: MenuItem) => {
    setFoodOrder(prev => {
      const existingIndex = prev.findIndex(o => o.item.id === menuItem.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1 };
        return updated;
      }
      return [...prev, { item: menuItem, quantity: 1 }];
    });
    cosmicAudio.playPing();
  };

  const updateFoodItemQuantity = (index: number, delta: number) => {
    setFoodOrder(prev => {
      const newQty = prev[index].quantity + delta;
      if (newQty <= 0) {
        const updated = [...prev];
        updated.splice(index, 1);
        return updated;
      }
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
    cosmicAudio.playPing();
  };

  const foodOrderTotalIQD = foodOrder.reduce((sum, o) => sum + (o.item.priceIQD * o.quantity), 0);

  const confirmTableReservation = () => {
    setTableReservations(prev => [
      { id: `RES-${Math.floor(1000 + Math.random() * 9000)}`, guests: reservationGuests, date: reservationDate, time: reservationTime },
      ...prev
    ]);
    cosmicAudio.playPing();
  };

  // Education enrollment helper
  const confirmEnrollment = (course: Course) => {
    setEnrollments(prev => [
      { id: `ENR-${Math.floor(1000 + Math.random() * 9000)}`, courseTitle: course.title, studentName: studentNameInput, date: new Date().toLocaleDateString('ar-IQ') },
      ...prev
    ]);
    cosmicAudio.playPing();
  };

  // Hotel booking helpers
  const computeNights = (checkIn: string, checkOut: string) => {
    const inDate = new Date(checkIn).getTime();
    const outDate = new Date(checkOut).getTime();
    const diff = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  const confirmHotelBooking = (room: HotelRoom) => {
    const nights = computeNights(checkInDate, checkOutDate);
    setHotelBookings(prev => [
      {
        id: `AUR-${Math.floor(10000 + Math.random() * 90000)}`,
        roomName: room.name,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: guestsCount,
        nights,
        totalIQD: nights * room.pricePerNightIQD
      },
      ...prev
    ]);
    cosmicAudio.playPing();
    setActiveTab('confirmation');
  };

  // Logistics helpers
  const trackShipment = () => {
    const match = SAMPLE_SHIPMENTS.find(s => s.trackingNumber.toLowerCase() === trackingInput.trim().toLowerCase());
    setFoundShipment(match || {
      id: 'ship-new',
      trackingNumber: trackingInput.trim() || 'CMX-00000',
      origin: '—',
      destination: '—',
      status: 'لم يتم العثور على الشحنة، جرّب أحد الأرقام: CMX-77201 أو CMX-77198',
      stages: [
        { label: 'تم استلام الشحنة', done: false },
        { label: 'تم الفرز في المستودع', done: false },
        { label: 'في الطريق للتسليم', done: false },
        { label: 'تم التسليم', done: false },
      ]
    });
    cosmicAudio.playPing();
  };

  const computeShippingQuote = (): number => {
    const weightNum = parseFloat(quoteWeight) || 0;
    const multiplier = quoteDestination === 'local' ? 1 : quoteDestination === 'regional' ? 1.8 : 3;
    return Math.round((15000 + weightNum * 3000 * multiplier) / 1000) * 1000;
  };

  const saveShippingQuote = () => {
    setSavedQuotes(prev => [
      { id: `QT-${Math.floor(1000 + Math.random() * 9000)}`, weight: quoteWeight, destination: quoteDestination, priceIQD: computeShippingQuote() },
      ...prev
    ]);
    cosmicAudio.playPing();
  };

  const handleCompleteOrder = () => {
    if (cart.length === 0) return;
    const invoice = {
      orderId: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleDateString('ar-IQ'),
      customerName,
      customerPhone,
      customerCity,
      paymentMethod: paymentMethod === 'cod' ? 'الدفع عند الاستلام' : paymentMethod === 'zaincash' ? 'زين كاش' : 'بطاقة ماستر كارد',
      items: [...cart],
      totalIQD: totalCartIQD,
      totalUSD: totalCartUSD
    };
    setOrderConfirmedInvoice(invoice);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setCart([]);
    cosmicAudio.playPing();
  };

  // Render template-specific rich interactive UI sandbox
  const renderInteractivePageContent = () => {
    const isEcommerce = template.id === 'NVQ-ECOM-02' || template.id === 'orion-ecommerce' || template.category === 'ecommerce';

    if (isEcommerce) {
      const sortedProducts = [...SAMPLE_PRODUCTS]
        .filter(p => {
          const matchesCategory = storeCategory === 'all' || p.category === storeCategory;
          const matchesSearch = p.name.toLowerCase().includes(storeSearch.toLowerCase()) || 
                                p.description.toLowerCase().includes(storeSearch.toLowerCase());
          return matchesCategory && matchesSearch;
        })
        .sort((a, b) => {
          if (storeSort === 'priceAsc') return a.priceIQD - b.priceIQD;
          if (storeSort === 'priceDesc') return b.priceIQD - a.priceIQD;
          return 0;
        });

      return (
        <div className="space-y-6 text-slate-100">
          {/* Sticky Store Navbar — same glass-pill identity treatment as the real NOVAIQ navbar */}
          <div className="sticky -top-3 sm:-top-6 -mx-3 sm:-mx-6 bg-white/5 backdrop-blur-xl border-b border-white/10 z-30 shadow-xl shadow-black/20 mb-6 select-none rounded-t-2xl overflow-hidden">
            {/* Promo Banner inside the sticky wrapper so it rolls up or stays with the header */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-teal-900/40 to-slate-900/40 px-4 py-2 text-center text-[10px] sm:text-[11px] text-emerald-400 border-b border-white/10 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>عرض خاص: شحن مجاني آمن لكافة محافظات العراق ودفع آمن عند الاستلام</span>
            </div>

            <div className="flex items-center justify-between gap-4 p-4 px-4 sm:px-6">
              {/* Right: Logo & Name */}
              <div className="flex items-center gap-3">
                <div className={`relative w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center text-white shrink-0 shadow-lg ring-1 ring-white/20`}>
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
              </div>

              {/* Center: Shopify Navigation (interactively filters category states!) */}
              <nav className={`${isMobileFrame ? 'hidden' : 'hidden md:flex'} items-center gap-5 text-[11px] font-bold`}>
                <button
                  onClick={() => {
                    setStoreCategory('all');
                    cosmicAudio.playTick();
                  }}
                  className={`transition-all pb-1 border-b-2 cursor-pointer ${
                    storeCategory === 'all' 
                      ? `text-white border-emerald-400 font-extrabold` 
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  الرئيسية
                </button>
                <button
                  onClick={() => {
                    setStoreCategory('men');
                    cosmicAudio.playTick();
                  }}
                  className={`transition-all pb-1 border-b-2 cursor-pointer ${
                    storeCategory === 'men' 
                      ? `text-white border-emerald-400 font-extrabold` 
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  الأزياء الرجالية
                </button>
                <button
                  onClick={() => {
                    setStoreCategory('women');
                    cosmicAudio.playTick();
                  }}
                  className={`transition-all pb-1 border-b-2 cursor-pointer ${
                    storeCategory === 'women' 
                      ? `text-white border-emerald-400 font-extrabold` 
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  الأزياء النسائية
                </button>
                <button
                  onClick={() => {
                    setStoreCategory('accessories');
                    cosmicAudio.playTick();
                  }}
                  className={`transition-all pb-1 border-b-2 cursor-pointer ${
                    storeCategory === 'accessories' 
                      ? `text-white border-emerald-400 font-extrabold` 
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  الأحذية والإكسسوارات
                </button>
              </nav>

              {/* Left: Interactive Shopify Cart Trigger */}
              <div className="flex items-center gap-2.5">
                <button 
                  onClick={() => {
                    setIsCartOpen(true);
                    cosmicAudio.playTick();
                  }}
                  className="relative px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/25 flex items-center gap-2.5 transition-all text-xs text-white font-extrabold cursor-pointer group shadow-lg"
                >
                  <div className="relative">
                    <ShoppingCart className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 transition-colors" />
                    {totalCartCount > 0 && (
                      <span className="absolute -top-2.5 -left-2.5 bg-rose-500 text-white text-[9px] font-mono font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900 animate-pulse">
                        {totalCartCount}
                      </span>
                    )}
                  </div>
                  
                  <span className="hidden sm:inline text-[11px]">حقيبة التسوق</span>
                  {totalCartIQD > 0 ? (
                    <span className="font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                      {totalCartIQD.toLocaleString()} د.ع
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-normal hidden sm:inline">(فارغة)</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Search, Filters & Sorter Row */}
          <div className={`flex ${isMobileFrame ? 'flex-col items-stretch' : 'flex-col md:flex-row items-stretch md:items-center'} justify-between gap-4 p-4 bg-white/5 backdrop-blur-md border border-white/10`}>
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              <input 
                type="text" 
                value={storeSearch} 
                onChange={e => setStoreSearch(e.target.value)}
                placeholder="ابحث عن الموديلات، الأحذية، الإكسسوارات الفاخرة..." 
                className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-800 transition-all"
              />
            </div>

            {/* Mobile Category and Sort Controller */}
            <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end">
              {/* Category Quick Tabs on Mobile/Tablet */}
              <div className={`${isMobileFrame ? 'flex' : 'flex md:hidden'} items-center gap-1 overflow-x-auto no-scrollbar py-0.5`}>
                <button
                  onClick={() => { setStoreCategory('all'); cosmicAudio.playTick(); }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap cursor-pointer transition-all ${
                    storeCategory === 'all' ? `${themeStyle.primaryBg} text-white` : 'bg-black/30 backdrop-blur-sm text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => { setStoreCategory('men'); cosmicAudio.playTick(); }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap cursor-pointer transition-all ${
                    storeCategory === 'men' ? `${themeStyle.primaryBg} text-white` : 'bg-black/30 backdrop-blur-sm text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  رجالي
                </button>
                <button
                  onClick={() => { setStoreCategory('women'); cosmicAudio.playTick(); }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap cursor-pointer transition-all ${
                    storeCategory === 'women' ? `${themeStyle.primaryBg} text-white` : 'bg-black/30 backdrop-blur-sm text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  نسائي
                </button>
                <button
                  onClick={() => { setStoreCategory('accessories'); cosmicAudio.playTick(); }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap cursor-pointer transition-all ${
                    storeCategory === 'accessories' ? `${themeStyle.primaryBg} text-white` : 'bg-black/30 backdrop-blur-sm text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  إكسسوارات
                </button>
              </div>

              {/* Advanced Sorter */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">ترتيب الموديلات:</span>
                <select
                  value={storeSort}
                  onChange={(e) => {
                    setStoreSort(e.target.value as any);
                    cosmicAudio.playTick();
                  }}
                  className="bg-black/30 backdrop-blur-sm border border-white/10 text-slate-300 rounded-xl px-3 py-2 text-[10px] font-bold focus:outline-none focus:border-slate-700 cursor-pointer"
                >
                  <option value="default">الافتراضي (الأكثر رواجاً)</option>
                  <option value="priceAsc">السعر: من الأقل للأعلى</option>
                  <option value="priceDesc">السعر: من الأعلى للأقل</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2 lg:grid-cols-3')} gap-6`}>
            {sortedProducts.map((prod) => (
              <div 
                key={prod.id} 
                className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/25 hover:shadow-xl hover:shadow-black/30 transition-all duration-300 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Thumbnail / Image Mock */}
                  <div className="h-48 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 relative overflow-hidden group-hover:scale-[1.01] transition-all duration-300">
                    {prod.imageUrl ? (
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-300"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${prod.imageBg}`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                    <div className="absolute top-2.5 right-2.5 flex items-center justify-between w-[calc(100%-20px)] z-10">
                      {prod.badge && (
                        <span className="px-2.5 py-1 rounded-md bg-black/90 text-[10px] font-bold text-white border border-white/10">
                          {prod.badge}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-300 font-mono bg-black/60 px-2 py-0.5 rounded border border-white/10">
                        #{prod.id}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
                      {prod.colors.slice(0, 2).map((c, i) => (
                        <span key={i} className="text-[9px] bg-black/70 text-slate-200 px-2 py-0.5 rounded border border-white/5">
                          {c}
                        </span>
                      ))}
                      {prod.colors.length > 2 && (
                        <span className="text-[9px] bg-black/70 text-slate-200 px-1 rounded border border-white/5">
                          +{prod.colors.length - 2}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white leading-snug group-hover:text-emerald-400 transition-colors">{prod.name}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{prod.description}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                  <div>
                    <div className={`text-base font-bold font-mono ${themeStyle.primaryText}`}>
                      {prod.priceIQD.toLocaleString()} د.ع
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      (~${prod.priceUSD} USD)
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedProductForModal(prod);
                      setModalColor(prod.colors[0]);
                      setModalSize(prod.sizes[0]);
                      setModalQuantity(1);
                    }}
                    className={`px-3.5 py-2.5 rounded-xl ${themeStyle.primaryBg} text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تخصيص وشراء</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Product Options Modal (High Fidelity Preview & Setup) */}
          {selectedProductForModal && (
            <div className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-fade-in my-auto">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className={`w-5 h-5 ${themeStyle.primaryText}`} />
                    <h3 className="text-sm font-bold text-white">معاينة وتخصيص تفاصيل المنتج الفاخر</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedProductForModal(null)} 
                    className="text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 p-1.5 rounded-xl cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Layout Grid */}
                <div className={`grid ${gridCols('grid-cols-1', 'md:grid-cols-12')} gap-6 p-6`}>
                  
                  {/* Left Column: Image Area */}
                  <div className="md:col-span-5 space-y-3">
                    <div className="aspect-[4/5] rounded-2xl bg-black/30 backdrop-blur-sm border border-white/10 overflow-hidden relative group">
                      {selectedProductForModal.imageUrl ? (
                        <img 
                          src={selectedProductForModal.imageUrl} 
                          alt={selectedProductForModal.name} 
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${selectedProductForModal.imageBg} flex items-center justify-center`} />
                      )}
                      
                      {selectedProductForModal.badge && (
                        <span className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-emerald-500/25 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
                          {selectedProductForModal.badge}
                        </span>
                      )}
                      
                      <div className="absolute bottom-3 left-3 bg-black/75 px-2.5 py-1 rounded-md border border-white/10 text-[10px] font-mono text-slate-300">
                        {selectedProductForModal.id}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 text-center">
                      <span className="text-[10px] text-slate-400">توصيل محلي مباشر • شحن تجريبي مجاني</span>
                    </div>
                  </div>

                  {/* Right Column: Choices */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">تفاصيل الموديل المعتمد</span>
                        <h4 className="text-base font-extrabold text-white leading-snug mt-0.5">{selectedProductForModal.name}</h4>
                        
                        {/* Static Reviews / Badges */}
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-400">
                          <span className="font-bold">4.9</span>
                          <div className="flex">{'★'.repeat(5)}</div>
                          <span className="text-[10px] text-slate-500">(140 تقييم زبون حقيقي)</span>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">متوفر</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10">
                        <span className="text-[11px] text-slate-400 block mb-0.5">السعر الفردي للقطعة:</span>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-lg font-bold font-mono ${themeStyle.primaryText}`}>
                            {selectedProductForModal.priceIQD.toLocaleString()} د.ع
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            (~${selectedProductForModal.priceUSD} USD)
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] text-slate-300 leading-relaxed bg-white/5 backdrop-blur-sm p-2.5 rounded-lg border border-white/10">
                          {selectedProductForModal.description}
                        </p>
                      </div>

                      {/* Colors Selection */}
                      <div className="space-y-1.5">
                        <label className="block text-slate-400 font-bold text-[11px]">الألوان المتوفرة في المخزن:</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedProductForModal.colors.map(col => {
                            const isSelected = modalColor === col;
                            return (
                              <button
                                key={col}
                                onClick={() => setModalColor(col)}
                                className={`px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
                                  isSelected 
                                    ? `${themeStyle.primaryBg} text-white border-white scale-[1.03] shadow-md shadow-black/40` 
                                    : 'bg-black/30 backdrop-blur-sm text-slate-400 border-white/10 hover:text-white hover:border-white/25'
                                }`}
                              >
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                                <span>{col}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sizes Selection */}
                      <div className="space-y-1.5">
                        <label className="block text-slate-400 font-bold text-[11px]">القياسات المطلوبة:</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedProductForModal.sizes.map(s => {
                            const isSelected = modalSize === s;
                            return (
                              <button
                                key={s}
                                onClick={() => setModalSize(s)}
                                className={`min-w-[40px] h-9 px-3.5 rounded-xl border text-xs font-bold font-mono cursor-pointer transition-all duration-200 flex items-center justify-center ${
                                  isSelected 
                                    ? `${themeStyle.primaryBg} text-white border-white scale-[1.03] shadow-md shadow-black/40` 
                                    : 'bg-black/30 backdrop-blur-sm text-slate-400 border-white/10 hover:text-white hover:border-white/25'
                                }`}
                              >
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Dynamic Quantity Selection */}
                      <div className="space-y-2 pt-1 border-t border-slate-850">
                        <div className="flex items-center justify-between">
                          <label className="block text-slate-400 font-bold text-[11px]">الكمية المطلوبة:</label>
                          <span className="text-[11px] text-slate-500 font-bold">الحد الأقصى للشراء 10 قطع</span>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 w-fit">
                          <button 
                            onClick={() => setModalQuantity(prev => Math.max(1, prev - 1))}
                            className="p-1.5 hover:bg-slate-800 hover:text-white text-slate-400 cursor-pointer rounded-lg transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-mono font-bold text-white text-sm px-4 select-none">{modalQuantity}</span>
                          <button 
                            onClick={() => setModalQuantity(prev => Math.min(10, prev + 1))}
                            className="p-1.5 hover:bg-slate-800 hover:text-white text-slate-400 cursor-pointer rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Submit Section */}
                    <div className={`pt-4 border-t border-white/10 flex ${isMobileFrame ? 'flex-col items-stretch' : 'flex-col sm:flex-row items-stretch sm:items-center'} justify-between gap-4`}>
                      <div>
                        <span className="text-slate-400 block text-[10px]">إجمالي التكلفة المباشرة:</span>
                        <span className={`text-base font-bold font-mono ${themeStyle.primaryText}`}>
                          {(selectedProductForModal.priceIQD * modalQuantity).toLocaleString()} د.ع
                        </span>
                      </div>

                      <button
                        onClick={() => addToCart(selectedProductForModal, modalColor, modalSize, modalQuantity)}
                        className={`px-6 py-3 rounded-2xl ${themeStyle.primaryBg} text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>تأكيد الإضافة إلى حقيبة التسوق ({modalQuantity} قطع)</span>
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            </div>
          )}

          {/* Cart Drawer Modal */}
          {isCartOpen && (
            <div className="fixed inset-0 z-50 bg-black/88 flex items-center justify-end">
              <div className="bg-slate-950/95 backdrop-blur-2xl border-r border-white/10 w-full max-w-md h-full flex flex-col justify-between p-5 space-y-4 animate-fade-in">
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className={`w-5 h-5 ${themeStyle.primaryText}`} />
                      <h3 className="text-sm font-bold text-white">حقيبة التسوق الخاصة بك</h3>
                    </div>
                    <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {cart.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400">حقيبة التسوق فارغة حالياً.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                      {cart.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <h4 className="font-bold text-white">{item.product.name}</h4>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>اللون: {item.selectedColor}</span>
                              <span>القياس: {item.selectedSize}</span>
                            </div>
                            <div className={`font-mono font-bold ${themeStyle.primaryText}`}>
                              {(item.product.priceIQD * item.quantity).toLocaleString()} د.ع
                            </div>
                          </div>

                          <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm p-1.5 rounded-lg border border-white/10">
                            <button onClick={() => updateCartQuantity(idx, -1)} className="p-1 hover:text-white text-slate-400 cursor-pointer">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono font-bold text-white text-xs px-1">{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(idx, 1)} className="p-1 hover:text-white text-slate-400 cursor-pointer">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="border-t border-white/10 pt-4 space-y-3">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>إجمالي المنتجات:</span>
                        <span className="font-mono text-white">{totalCartIQD.toLocaleString()} د.ع</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>أجور التوصيل المباشر:</span>
                        <span className="text-emerald-400 font-bold">مجاني (عرض خاص)</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                        <span>الإجمالي الكلي:</span>
                        <span className={`font-mono ${themeStyle.primaryText}`}>{totalCartIQD.toLocaleString()} د.ع</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        setIsCheckoutOpen(true);
                      }}
                      className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2 shadow-lg`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>الانتقال لإتمام الطلب والشحن</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Checkout Modal */}
          {isCheckoutOpen && (
            <div className="fixed inset-0 z-50 bg-black/88 flex items-center justify-center p-4">
              <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>معلومات الطلب والتوصيل التجريبي</span>
                  </h3>
                  <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">الاسم الكامل:</label>
                    <input 
                      type="text" 
                      value={customerName} 
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white" 
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">رقم الهاتف (للتواصل عند التسليم):</label>
                    <input 
                      type="text" 
                      value={customerPhone} 
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono" 
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">المحافظة والعنوان التفصيلي:</label>
                    <input 
                      type="text" 
                      value={customerCity} 
                      onChange={e => setCustomerCity(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white" 
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5">وسيلة الدفع:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => setPaymentMethod('cod')}
                        className={`p-2.5 rounded-lg border text-center font-semibold cursor-pointer transition-all ${
                          paymentMethod === 'cod' ? `${themeStyle.primaryBg} text-white border-white` : 'bg-black/30 backdrop-blur-sm text-slate-400 border-white/10'
                        }`}
                      >
                        الدفع عند الاستلام
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('zaincash')}
                        className={`p-2.5 rounded-lg border text-center font-semibold cursor-pointer transition-all ${
                          paymentMethod === 'zaincash' ? `${themeStyle.primaryBg} text-white border-white` : 'bg-black/30 backdrop-blur-sm text-slate-400 border-white/10'
                        }`}
                      >
                        زين كاش
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('mastercard')}
                        className={`p-2.5 rounded-lg border text-center font-semibold cursor-pointer transition-all ${
                          paymentMethod === 'mastercard' ? `${themeStyle.primaryBg} text-white border-white` : 'bg-black/30 backdrop-blur-sm text-slate-400 border-white/10'
                        }`}
                      >
                        ماستر / كي كارد
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px]">المبلغ النهائي للطلب:</span>
                      <span className={`text-base font-bold font-mono ${themeStyle.primaryText}`}>
                        {totalCartIQD.toLocaleString()} د.ع
                      </span>
                    </div>

                    <button
                      onClick={handleCompleteOrder}
                      className={`px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} text-white text-xs font-bold cursor-pointer hover:scale-[1.02] transition-transform`}
                    >
                      تأكيد الطلب واستخراج الفاتورة
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirmed Order Invoice Screen Modal */}
          {orderConfirmedInvoice && (
            <div className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4">
              <div className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in text-slate-100">
                <div className="text-center space-y-2 border-b border-white/10 pb-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">تم استلام طلبك بنجاح!</h3>
                  <p className="text-xs text-slate-400">فاتورة طلب تجريبية مكتملة لموقعك القادم</p>
                </div>

                <div className="space-y-2.5 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400">رقم الفاتورة:</span>
                    <span className="font-mono font-bold text-white">{orderConfirmedInvoice.orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">اسم العميل:</span>
                    <span className="font-bold text-white">{orderConfirmedInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">رقم الهاتف:</span>
                    <span className="font-mono text-white">{orderConfirmedInvoice.customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">عنوان التوصيل:</span>
                    <span className="text-white">{orderConfirmedInvoice.customerCity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">طريقة الدفع:</span>
                    <span className="text-emerald-400 font-bold">{orderConfirmedInvoice.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10 font-bold">
                    <span>إجمالي الفاتورة:</span>
                    <span className={`font-mono text-sm ${themeStyle.primaryText}`}>
                      {orderConfirmedInvoice.totalIQD.toLocaleString()} د.ع
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setOrderConfirmedInvoice(null)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer text-center"
                  >
                    متابعة التصفح والتسوق
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Default or Corporate / SaaS / RealEstate / Health / Fintech template views
    switch (template.id) {
      case 'NVQ-CORP-01':
      case 'stella-corporate': {
        const stellaServices = [
          {
            icon: Cpu,
            title: 'تطوير الأنظمة السحابية المخصصة ERP',
            desc: 'بناء أنظمة متكاملة لإدارة الموارد، المبيعات، وشؤون الموظفين بطريقة مؤتمتة بالكامل وسريعة وآمنة.',
            tag: 'الأكثر طلباً للمؤسسات الكبرى',
            details: 'نظام ERP مبني خصيصاً لهيكل مؤسستك، يوحّد كل الأقسام (الموارد البشرية، المشتريات، المبيعات، المخزون) في منصة واحدة بدل ملفات إكسل متفرقة، مع صلاحيات دقيقة لكل موظف وتقارير حية للإدارة العليا.',
            bullets: [
              'إدارة الموارد البشرية والرواتب والإجازات',
              'تتبع المخزون والمشتريات بالوقت الحقيقي',
              'تقارير مالية آلية شهرية وربع سنوية',
              'صلاحيات متعددة المستويات لكل قسم وموظف',
            ],
          },
          {
            icon: Globe,
            title: 'بوابات الويب التعريفية للمجموعات',
            desc: 'تصميم وبناء مواقع الكترونية فخمة تعكس الهوية البصرية اللائقة بالشركات الكبرى والمستثمرين والمساهمين.',
            tag: 'تحميل فائق المتانة ومتوافق مع SEO',
            details: 'موقع تعريفي رسمي يليق بمجموعتك، مبني على أسس تقنية حديثة تضمن سرعة تحميل عالية وترتيباً أفضل في محركات البحث، مع لوحة تحكم بسيطة لتحديث الأخبار والوظائف الشاغرة بنفسك دون الحاجة لمبرمج.',
            bullets: [
              'تصميم مطابق تماماً للهوية البصرية للشركة',
              'تحسين كامل لمحركات البحث (SEO)',
              'دعم تعدد اللغات بتبديل فوري',
              'لوحة تحكم لإدارة الأخبار والوظائف بنفسك',
            ],
          },
          {
            icon: Shield,
            title: 'حلول أمن المعلومات والشبكات الداخلية',
            desc: 'تأمين المنظومات الداخلية ضد الاختراق، تفعيل جدران حماية برمجية متطورة، والتدقيق الأمني المسبق.',
            tag: 'حماية قصوى وتدقيق دوري',
            details: 'حماية بيانات مؤسستك ومستثمريك بأعلى معايير الأمان الرقمي، مع مراقبة مستمرة للأنظمة واختبارات اختراق دورية تكشف أي ثغرة قبل استغلالها.',
            bullets: [
              'جدار حماية WAF متقدم ضد الهجمات الشائعة',
              'تشفير كامل لقواعد البيانات وبوابة المستثمرين',
              'تدقيق أمني شامل كل 3 أشهر',
              'نظام كشف وتنبيه فوري لأي محاولة تسلل',
            ],
          },
          {
            icon: Smartphone,
            title: 'تطبيقات الهواتف الذكية عالية الأداء',
            desc: 'تطوير تطبيقات الهواتف الذكية iOS & Android مع ربط فوري آمن بقواعد البيانات وسرعة ممتازة.',
            tag: 'أحدث التقنيات وأفضل تجربة مستخدم',
            details: 'تطبيق مرافق لموقعك يمنح موظفيك وعملاءك تجربة أسرع وأقرب، مبني بنفس قاعدة البيانات الخاصة بالموقع فلا يوجد أي ازدواجية أو تعارض بالبيانات بين المنصتين.',
            bullets: [
              'تطبيقات iOS و Android أصلية الأداء',
              'إشعارات فورية Push Notifications',
              'إمكانية العمل بدون إنترنت (Offline Mode)',
              'ربط مباشر بنفس قاعدة بيانات الموقع الرئيسي',
            ],
          },
        ];

        const stellaProjects = [
          {
            image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
            client: 'مجموعة الرافدين للمقاولات العامة',
            title: 'المنظومة السحابية الموحدة وتتبع الآليات والعمال',
            desc: 'تسهيل المراسلات تتبع سير العمل والمشاريع في 15 موقع عمل بمرونة فائقة.',
            details: 'كانت المجموعة تدير مواقع عملها الـ15 عبر مكالمات ومجموعات واتساب متفرقة، ما سبّب تأخيراً في التقارير وصعوبة بمتابعة الآليات والعمال. صممنا منصة موحدة تجمع كل موقع عمل بلوحة تحكم مركزية واحدة.',
            stats: [
              { label: 'مواقع عمل مربوطة', value: '15' },
              { label: 'مدة التنفيذ', value: '5 أشهر' },
              { label: 'مستخدمون نشطون يومياً', value: '+320' },
            ],
          },
          {
            image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80',
            client: 'مصرف بابل الرقمي',
            title: 'بوابة المستثمرين وكبار العملاء الآمنة 2FA',
            desc: 'تحويل رقمي شامل لعمليات التحقق وإصدار شهادات الإيداع للمستثمرين بنقرة زر.',
            details: 'المصرف احتاج بوابة إلكترونية بأعلى درجات الأمان لكبار المستثمرين، تسمح لهم بمتابعة استثماراتهم وطلب شهادات الإيداع دون زيارة الفرع، مع طبقة تحقق ثنائية (2FA) وتشفير كامل للبيانات.',
            stats: [
              { label: 'مستوى الأمان', value: '2FA + تشفير AES-256' },
              { label: 'مدة التنفيذ', value: '4 أشهر' },
              { label: 'مستثمرون مسجّلون', value: '+1,200' },
            ],
          },
        ];

        return (
          <div className="relative space-y-6 text-slate-100">
            {/* Ambient cosmic glows behind the glass UI — cheap radial gradients, not a
                full-surface blur filter, so this stays smooth even on weak devices. */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl select-none" aria-hidden="true">
              <div
                className="absolute -top-20 -right-10 w-72 h-72 rounded-full"
                style={{ backgroundImage: 'radial-gradient(circle closest-side, rgba(139,92,246,0.35) 0%, rgba(88,28,135,0.14) 45%, rgba(0,0,0,0) 78%)' }}
              />
              <div
                className="absolute top-1/3 -left-16 w-64 h-64 rounded-full"
                style={{ backgroundImage: 'radial-gradient(circle closest-side, rgba(63,63,70,0.30) 0%, rgba(39,39,42,0.14) 45%, rgba(0,0,0,0) 78%)' }}
              />
            </div>

            {/* Glass Navigation Bar — frosted pill with a proper logo lockup, matching the
                real NOVAIQ navbar's own backdrop-blur treatment instead of a flat solid box. */}
            <div className={`flex ${isMobileFrame ? 'flex-col items-start' : 'flex-col sm:flex-row items-start sm:items-center'} justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
              <div className="flex items-center gap-3">
                <div className={`relative w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center text-white shrink-0 shadow-lg ring-1 ring-white/20`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full sm:w-auto">
                {['home', 'services', 'projects', 'calculator', 'contact'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeTab === tab ? `${themeStyle.primaryBg} text-white font-bold shadow-md` : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab === 'home' && 'الرئيسية'}
                    {tab === 'services' && 'خدماتنا'}
                    {tab === 'projects' && 'المشاريع'}
                    {tab === 'calculator' && 'حاسبة المشروع'}
                    {tab === 'contact' && 'اتصل بنا'}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Body */}
            {activeTab === 'home' && (
              <div className="space-y-4 sm:space-y-6 animate-fade-in">
                <div className={`relative overflow-hidden p-6 sm:p-8 rounded-2xl bg-gradient-to-r ${themeStyle.gradient} backdrop-blur-sm border ${themeStyle.primaryBorder} text-center space-y-3 sm:space-y-4`}>
                  <div className={`w-14 h-14 mx-auto rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center text-white shadow-lg ring-1 ring-white/20`}>
                    <Building2 className="w-7 h-7" />
                  </div>
                  <span className={`px-3 py-1 rounded-full ${themeStyle.badgeBg} text-xs font-semibold inline-block backdrop-blur-sm`}>
                    حلول مؤسسية متكاملة
                  </span>
                  <h3 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
                    نبتكر حلولاً برمجية تقود المؤسسات نحو التحول الرقمي
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                    منصة الشركات الكبرى مع لوحة تحكم ذكية، دعم متعدد اللغات، وبوابة المستثمرين المحمية بأعلى درجات الأمان.
                  </p>
                  <div className={`pt-2 flex ${isMobileFrame ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
                    <button onClick={() => setActiveTab('calculator')} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} text-white text-xs font-bold cursor-pointer shadow-lg`}>
                      حسّاب تكلفة مشروعك
                    </button>
                    <button onClick={() => setActiveTab('contact')} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/15 text-slate-300 text-xs font-bold cursor-pointer hover:bg-white/10 transition-colors">
                      طلب استشارة مباشرة
                    </button>
                  </div>
                </div>

                <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-2.5 text-center`}>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/25 transition-colors">
                    <div className={`text-lg sm:text-xl font-bold ${themeStyle.primaryText} font-mono`}>+150</div>
                    <div className="text-[11px] text-slate-400">مشروع مكتمل</div>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/25 transition-colors">
                    <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">99.9%</div>
                    <div className="text-[11px] text-slate-400">نسبة استقرار النظام</div>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/25 transition-colors">
                    <div className="text-lg sm:text-xl font-bold text-amber-400 font-mono">24/7</div>
                    <div className="text-[11px] text-slate-400">دعم فني متواصل</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
                {stellaServices.map((service, i) => {
                  const Icon = service.icon;
                  return (
                    <div
                      key={service.title}
                      onClick={() => { setCorpDetail({ kind: 'service', index: i }); cosmicAudio.playPing(); }}
                      className="p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 transition-colors space-y-3 cursor-pointer group"
                      style={{ animation: 'card-in 0.35s ease-out both', animationDelay: `${i * 0.05}s` }}
                    >
                      <div className={`w-10 h-10 rounded-xl ${themeStyle.primaryBg} text-white flex items-center justify-center shrink-0 shadow-md`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-white">{service.title}</h4>
                      <p className="text-slate-400 leading-relaxed">{service.desc}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className={`text-[10px] font-bold ${themeStyle.primaryText}`}>{service.tag}</span>
                        <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1 group-hover:text-white transition-colors">
                          التفاصيل <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'projects' && (
              <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
                {stellaProjects.map((project, i) => (
                  <div
                    key={project.client}
                    onClick={() => { setCorpDetail({ kind: 'project', index: i }); cosmicAudio.playPing(); }}
                    className="p-3 bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/30 transition-colors rounded-2xl space-y-3 overflow-hidden cursor-pointer group"
                  >
                    <div className="relative overflow-hidden rounded-xl">
                      <img src={project.image} alt={project.client} loading="lazy" decoding="async" className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                    <div className="p-1 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block">{project.client}</span>
                      <h4 className="text-xs font-bold text-white">{project.title}</h4>
                      <p className="text-[11px] text-slate-400">{project.desc}</p>
                      <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1 group-hover:text-white transition-colors pt-1">
                        دراسة الحالة الكاملة <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'calculator' && (
              <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4 animate-fade-in text-xs shadow-xl">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>حاسبة التكلفة المباشرة للشركات</span>
                </h4>
                <p className="text-slate-400">حدد نطاق الخدمة المطلوبة لحساب تقدير أولي لاحتياجات مؤسستك:</p>
                <div className="space-y-2">
                  <label className="block text-slate-300 font-bold">حجم المنظومة البرمجية:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'medium' as const, label: 'مؤسسة متوسطة' },
                      { id: 'large' as const, label: 'مؤسسة كبرى' },
                      { id: 'holding' as const, label: 'مجموعة القابضة' },
                    ]).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => { setOrgSize(opt.id); cosmicAudio.playPing(); }}
                        className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                          orgSize === opt.id ? `${themeStyle.primaryBg} text-white border-white shadow-md` : 'border-white/10 bg-white/5 backdrop-blur-sm text-slate-400 hover:text-white hover:border-white/25'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-black/30 backdrop-blur-md border border-white/10 text-center space-y-1">
                  <span className="text-slate-400 block text-[11px]">التكلفة التقديرية الحالية:</span>
                  <span className={`text-xl font-bold font-mono ${themeStyle.primaryText}`}>
                    {orgSize === 'medium' ? '$2,500 - $4,800 USD' : orgSize === 'large' ? '$4,800 - $9,000 USD' : '$9,000 - $18,000 USD'}
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-3 animate-fade-in shadow-xl">
                <h4 className="text-sm font-bold text-white">نموذج التواصل والتسجيل المباشر</h4>
                <input type="text" placeholder="الاسم الكامل" className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-xs text-white placeholder-slate-500" />
                <input type="text" placeholder="رقم الهاتف" className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-xs text-white placeholder-slate-500" />
                <textarea placeholder="تفاصيل المشروع والطلب..." rows={2} className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-xs text-white placeholder-slate-500" />
                <button onClick={() => alert('تم تسجيل الاستفسار التجريبي بنجاح في النظام!')} className={`w-full py-2.5 ${themeStyle.primaryBg} text-white text-xs font-bold rounded-lg cursor-pointer shadow-lg`}>
                  إرسال الاستفسار المباشر
                </button>
              </div>
            )}

            {/* Service / Project detail modal — clicking any card opens its full details
                instead of the grid being a static, non-interactive display. */}
            {corpDetail && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setCorpDetail(null)}>
                <div
                  className="bg-slate-950/95 backdrop-blur-2xl border border-white/10 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl animate-fade-in my-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white">
                      {corpDetail.kind === 'service' ? 'تفاصيل الخدمة الكاملة' : 'دراسة الحالة الكاملة'}
                    </h3>
                    <button
                      onClick={() => setCorpDetail(null)}
                      className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-xl cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {corpDetail.kind === 'service' && (() => {
                    const service = stellaServices[corpDetail.index];
                    const Icon = service.icon;
                    return (
                      <div className="p-6 space-y-4 text-xs">
                        <div className={`w-12 h-12 rounded-2xl ${themeStyle.primaryBg} text-white flex items-center justify-center shadow-lg`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-extrabold text-white leading-snug">{service.title}</h4>
                        <span className={`inline-block px-2.5 py-1 rounded-lg ${themeStyle.badgeBg} text-[10px] font-bold`}>{service.tag}</span>
                        <p className="text-slate-300 leading-relaxed">{service.details}</p>
                        <div className="space-y-1.5 pt-2 border-t border-white/10">
                          {service.bullets.map((b) => (
                            <div key={b} className="flex items-start gap-2">
                              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${themeStyle.primaryText}`} />
                              <span className="text-slate-300">{b}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => { setCorpDetail(null); setActiveTab('contact'); }}
                          className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} text-white text-xs font-bold cursor-pointer shadow-lg mt-2`}
                        >
                          اطلب هذه الخدمة الآن
                        </button>
                      </div>
                    );
                  })()}

                  {corpDetail.kind === 'project' && (() => {
                    const project = stellaProjects[corpDetail.index];
                    return (
                      <div className="space-y-4 text-xs">
                        <img src={project.image} alt={project.client} className="w-full h-40 sm:h-48 object-cover" referrerPolicy="no-referrer" />
                        <div className="px-6 space-y-4 pb-6">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">{project.client}</span>
                            <h4 className="text-base font-extrabold text-white leading-snug mt-0.5">{project.title}</h4>
                          </div>
                          <p className="text-slate-300 leading-relaxed">{project.details}</p>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
                            {project.stats.map((s) => (
                              <div key={s.label} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                                <div className={`text-xs font-bold font-mono ${themeStyle.primaryText}`}>{s.value}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{s.label}</div>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => { setCorpDetail(null); setActiveTab('contact'); }}
                            className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} text-white text-xs font-bold cursor-pointer shadow-lg mt-2`}
                          >
                            لديك مشروع مشابه؟ تواصل معنا
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'NVQ-TECH-03':
      case 'nebula-saas': {
        const techTab = ['home', 'features', 'docs', 'pricing', 'dashboard'].includes(activeTab) ? activeTab : 'home';

        return (
          <div className="space-y-6 text-slate-100">
            {/* Navigation Bar */}
            <div className={`flex ${isMobileFrame ? 'flex-col items-start' : 'flex-col sm:flex-row items-start sm:items-center'} justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center text-white shrink-0 shadow-lg ring-1 ring-white/20`}>
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full sm:w-auto">
                {['home', 'features', 'docs', 'pricing', 'dashboard'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      techTab === tab ? `${themeStyle.primaryBg} text-white font-bold shadow-md` : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab === 'home' && 'الرئيسية'}
                    {tab === 'features' && 'المزايا'}
                    {tab === 'docs' && 'توثيق API'}
                    {tab === 'pricing' && 'الأسعار'}
                    {tab === 'dashboard' && 'لوحة تحكم'}
                  </button>
                ))}
              </div>
            </div>

            {techTab === 'home' && (
              <div className="space-y-4 sm:space-y-6 animate-fade-in">
                <div className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-r ${themeStyle.gradient} border ${themeStyle.primaryBorder} text-center space-y-3 sm:space-y-4`}>
                  <span className={`px-3 py-1 rounded-full ${themeStyle.badgeBg} text-xs font-semibold inline-block`}>
                    منصة SaaS السحابية
                  </span>
                  <h3 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
                    ابنِ وأطلق منتجك السحابي بسرعة الضوء
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                    بنية تحتية سحابية جاهزة، توثيق API تفاعلي، ولوحة قيادة حية لمنتجك الرقمي — كل ما تحتاجه شركتك التقنية لتنطلق دون تعقيد.
                  </p>
                  <div className={`pt-2 flex ${isMobileFrame ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
                    <button onClick={() => setActiveTab('pricing')} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} text-white text-xs font-bold cursor-pointer`}>
                      شاهد خطط الأسعار
                    </button>
                    <button onClick={() => setActiveTab('docs')} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer">
                      استكشف توثيق API
                    </button>
                  </div>
                </div>

                <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-2.5 text-center`}>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
                    <div className={`text-lg sm:text-xl font-bold ${themeStyle.primaryText} font-mono`}>99.98%</div>
                    <div className="text-[11px] text-slate-400">معدل التشغيل السنوي</div>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
                    <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">+40</div>
                    <div className="text-[11px] text-slate-400">شركة تستخدم المنصة</div>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
                    <div className="text-lg sm:text-xl font-bold text-amber-400 font-mono">&lt; 50ms</div>
                    <div className="text-[11px] text-slate-400">زمن استجابة API</div>
                  </div>
                </div>
              </div>
            )}

            {techTab === 'features' && (
              <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
                {[
                  { icon: Cpu, title: 'نشر فوري بنقرة واحدة', desc: 'حزم كودك ونشره على بنية سحابية موزعة عالمياً خلال ثوانٍ، دون إعدادات خوادم معقدة.' },
                  { icon: Globe, title: 'قابلية توسع تلقائية', desc: 'يزداد عدد الخوادم تلقائياً مع ازدياد الطلب على منتجك، ويقل عند انخفاضه لتوفير التكلفة.' },
                  { icon: Shield, title: 'أمان وتشفير من الطبقة الأولى', desc: 'تشفير كامل للبيانات أثناء النقل والتخزين، مع مراقبة أمنية استباقية على مدار الساعة.' },
                  { icon: Sliders, title: 'مراقبة الأداء اللحظي', desc: 'لوحة قيادة حية لمراقبة زمن الاستجابة، الأخطاء، واستهلاك الموارد لحظة بلحظة.' },
                ].map((f, idx) => {
                  const FeatureIcon = f.icon;
                  return (
                    <div key={idx} className="p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-3">
                      <div className={`w-10 h-10 rounded-xl ${themeStyle.primaryBg} text-white flex items-center justify-center shrink-0`}>
                        <FeatureIcon className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-white">{f.title}</h4>
                      <p className="text-slate-400 leading-relaxed">{f.desc}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {techTab === 'docs' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
                <h4 className="text-sm font-bold text-white">توثيق واجهة برمجة التطبيقات (API Reference)</h4>
                <div className="p-4 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 font-mono text-[11px] text-emerald-300 overflow-x-auto" dir="ltr">
                  <div className="text-slate-500">// Example: fetch account usage</div>
                  <div>GET https://api.nebula.dev/v1/usage</div>
                  <div className="text-slate-500 mt-2">Authorization: Bearer YOUR_API_KEY</div>
                </div>
                <div className="space-y-2">
                  {[
                    { method: 'GET', path: '/v1/usage', desc: 'استرجاع بيانات الاستهلاك الحالية' },
                    { method: 'POST', path: '/v1/deploy', desc: 'نشر إصدار جديد من التطبيق' },
                    { method: 'GET', path: '/v1/users', desc: 'قائمة المستخدمين المرتبطين بالحساب' },
                  ].map((ep, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold shrink-0 ${ep.method === 'GET' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{ep.method}</span>
                      <span className="font-mono text-slate-300 shrink-0" dir="ltr">{ep.path}</span>
                      <span className="text-slate-500 truncate">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {techTab === 'pricing' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-center">
                  <div className="inline-flex flex-wrap justify-center p-1 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-xs">
                    <button
                      onClick={() => setSelectedPlan('monthly')}
                      className={`px-3 sm:px-4 py-1.5 rounded-lg cursor-pointer ${selectedPlan === 'monthly' ? `${themeStyle.primaryBg} text-white font-bold` : 'text-slate-400'}`}
                    >
                      اشتراك شهري
                    </button>
                    <button
                      onClick={() => setSelectedPlan('yearly')}
                      className={`px-3 sm:px-4 py-1.5 rounded-lg cursor-pointer ${selectedPlan === 'yearly' ? `${themeStyle.primaryBg} text-white font-bold` : 'text-slate-400'}`}
                    >
                      اشتراك سنوي (خصم 20%)
                    </button>
                  </div>
                </div>

                <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-3`}>
                  <div className="p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300">الباقة الأساسية</h4>
                    <div className={`text-base sm:text-lg font-bold ${themeStyle.primaryText} font-mono`}>
                      {selectedPlan === 'monthly' ? '250,000 د.ع / شهرياً' : '2,400,000 د.ع / سنوياً'}
                    </div>
                    <ul className="text-[11px] text-slate-400 space-y-1">
                      <li>✔ ربط حتى 5 مستخدمين</li>
                      <li>✔ دعم فني عبر البريد</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-2 relative">
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-indigo-500 text-[10px] text-white font-bold">
                      الأكثر طلباً
                    </span>
                    <h4 className="text-xs font-bold text-white">الباقة الاحترافية</h4>
                    <div className={`text-base sm:text-lg font-bold ${themeStyle.primaryText} font-mono`}>
                      {selectedPlan === 'monthly' ? '600,000 د.ع / شهرياً' : '5,800,000 د.ع / سنوياً'}
                    </div>
                    <ul className="text-[11px] text-slate-300 space-y-1">
                      <li>✔ مستخدمين غير محدودين</li>
                      <li>✔ ربط حقيقي مع API</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {techTab === 'dashboard' && (
              <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-3 animate-fade-in text-xs`}>
                {[
                  { value: '128,430', label: 'استدعاء API اليوم' },
                  { value: '12', label: 'تكاملات نشطة' },
                  { value: '99.98%', label: 'معدل التشغيل' },
                ].map((stat, idx) => (
                  <div key={idx} className="text-center p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
                    <div className={`text-xl font-extrabold font-mono ${themeStyle.primaryText}`}>{stat.value}</div>
                    <div className="text-slate-400 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'NVQ-REAL-04':
      case 'pulsar-realestate': {
        const realTab = ['home', 'properties', 'booking', 'agents'].includes(activeTab) ? activeTab : 'home';

        const SAMPLE_PROPERTIES = [
          { id: 'prop-1', title: 'فيلا ملكية فاخرة - الجادرية', category: 'villas', priceUSD: 450000, priceIQD: 650000000, location: 'بغداد - الجادرية', rooms: 5, space: '400م²', image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80' },
          { id: 'prop-2', title: 'مكتب تجاري بانورامي - المنصور', category: 'apartments', priceUSD: 180000, priceIQD: 260000000, location: 'بغداد - المنصور', rooms: 3, space: '150م²', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80' },
          { id: 'prop-3', title: 'شقة سكنية ديلوكس - الكرادة', category: 'apartments', priceUSD: 125000, priceIQD: 180000000, location: 'بغداد - الكرادة', rooms: 4, space: '180م²', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80' },
        ];

        const SAMPLE_AGENTS = [
          { name: 'م. زياد الحسيني', title: 'مستشار عقاري أول', phone: '07701112233' },
          { name: 'أ. رغد الطائي', title: 'استشارية استثمار عقاري', phone: '07709998877' },
        ];

        const filteredProperties = SAMPLE_PROPERTIES.filter(p => {
          if (selectedPropertyFilter === 'all') return true;
          return p.category === selectedPropertyFilter;
        });

        const selectedProperty = SAMPLE_PROPERTIES.find(p => p.id === selectedPropertyId) || SAMPLE_PROPERTIES[0];

        return (
          <div className="space-y-6 text-slate-100">
            {/* Navigation Bar */}
            <div className={`flex ${isMobileFrame ? 'flex-col items-start' : 'flex-col sm:flex-row items-start sm:items-center'} justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center text-white shrink-0 shadow-lg ring-1 ring-white/20`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full sm:w-auto">
                {['home', 'properties', 'booking', 'agents'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      realTab === tab ? `${themeStyle.primaryBg} text-white font-bold shadow-md` : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab === 'home' && 'الرئيسية'}
                    {tab === 'properties' && 'العقارات'}
                    {tab === 'booking' && 'حجز معاينة'}
                    {tab === 'agents' && 'مستشارونا'}
                  </button>
                ))}
              </div>
            </div>

            {realTab === 'home' && (
              <div className="space-y-4 sm:space-y-6 animate-fade-in">
                <div className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-r ${themeStyle.gradient} border ${themeStyle.primaryBorder} text-center space-y-3 sm:space-y-4`}>
                  <span className={`px-3 py-1 rounded-full ${themeStyle.badgeBg} text-xs font-semibold inline-block`}>
                    منصة التطوير العقاري
                  </span>
                  <h3 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
                    استثمر في أفضل العقارات الفاخرة في العراق
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                    فلل، شقق، ومكاتب تجارية مختارة بعناية، مع معاينة مباشرة واستشارة عقارية مجانية من فريقنا المتخصص.
                  </p>
                  <div className={`pt-2 flex ${isMobileFrame ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
                    <button onClick={() => setActiveTab('properties')} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} text-white text-xs font-bold cursor-pointer`}>
                      تصفح العقارات المتاحة
                    </button>
                    <button onClick={() => setActiveTab('agents')} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer">
                      تواصل مع مستشار عقاري
                    </button>
                  </div>
                </div>

                <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-2.5 text-center`}>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
                    <div className={`text-lg sm:text-xl font-bold ${themeStyle.primaryText} font-mono`}>+80</div>
                    <div className="text-[11px] text-slate-400">عقار متاح حالياً</div>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
                    <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">+500</div>
                    <div className="text-[11px] text-slate-400">صفقة ناجحة</div>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
                    <div className="text-lg sm:text-xl font-bold text-amber-400 font-mono">4.9★</div>
                    <div className="text-[11px] text-slate-400">تقييم رضا العملاء</div>
                  </div>
                </div>
              </div>
            )}

            {realTab === 'properties' && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedPropertyFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      selectedPropertyFilter === 'all' ? `${themeStyle.primaryBg} text-white` : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setSelectedPropertyFilter('villas')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      selectedPropertyFilter === 'villas' ? `${themeStyle.primaryBg} text-white` : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    فلل فاخرة
                  </button>
                  <button
                    onClick={() => setSelectedPropertyFilter('apartments')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      selectedPropertyFilter === 'apartments' ? `${themeStyle.primaryBg} text-white` : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    شقق ومكاتب
                  </button>
                </div>

                <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2 lg:grid-cols-3')} gap-5`}>
                  {filteredProperties.map(prop => (
                    <div key={prop.id} className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-3 flex flex-col justify-between hover:border-white/25 hover:shadow-lg transition-all">
                      <div className="space-y-2">
                        <div className="h-40 rounded-xl overflow-hidden relative border border-slate-800 bg-slate-950">
                          <img src={prop.image} alt={prop.title} loading="lazy" decoding="async" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-all duration-300" referrerPolicy="no-referrer" />
                          <span className="absolute top-2 right-2 bg-black/85 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/10">
                            {prop.category === 'villas' ? 'فيلا فاخرة' : 'عقار مكتبي/سكني'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white px-1">{prop.title}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 px-1">
                          <span>📍 {prop.location}</span>
                          <span>📐 {prop.space}</span>
                          <span>🚪 {prop.rooms} غرف</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block font-semibold">القيمة التقديرية:</span>
                          <span className="text-sm font-bold text-amber-400 font-mono block">
                            ${prop.priceUSD.toLocaleString()} USD
                          </span>
                          <span className="text-[10px] text-slate-450 font-mono">
                            ({prop.priceIQD.toLocaleString()} د.ع)
                          </span>
                        </div>

                        <button
                          onClick={() => { setSelectedPropertyId(prop.id); setActiveTab('booking'); cosmicAudio.playPing(); }}
                          className={`px-3 py-2 rounded-xl ${themeStyle.primaryBg} text-white font-bold cursor-pointer text-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all`}
                        >
                          طلب حجز معاينة
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {realTab === 'booking' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${themeStyle.primaryText}`} />
                  <span>حجز معاينة: {selectedProperty.title}</span>
                </h4>

                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-bold">اختر العقار:</label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white cursor-pointer"
                  >
                    {SAMPLE_PROPERTIES.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 font-bold">اسم الزائر:</label>
                    <input
                      type="text"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 font-bold">تاريخ المعاينة:</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPropertyVisits(prev => [
                      { id: `VIS-${Math.floor(1000 + Math.random() * 9000)}`, propertyTitle: selectedProperty.title, date: bookingDate, visitorName },
                      ...prev
                    ]);
                    cosmicAudio.playPing();
                  }}
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} text-white font-bold cursor-pointer flex items-center justify-center gap-2`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد طلب المعاينة</span>
                </button>

                {propertyVisits.length > 0 && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <span className="font-bold text-white block">طلبات المعاينة المقدمة:</span>
                    {propertyVisits.map((v) => (
                      <div key={v.id} className="p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-2">
                        <span className="text-white font-bold truncate">{v.propertyTitle}</span>
                        <span className="font-mono text-slate-300 shrink-0">{v.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {realTab === 'agents' && (
              <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
                {SAMPLE_AGENTS.map((agent, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                      {agent.name.replace(/^(م\.|أ\.|د\.)\s*/, '').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{agent.name}</h4>
                      <p className="text-slate-400 truncate">{agent.title}</p>
                      <p className="text-slate-500 font-mono text-[11px]" dir="ltr">{agent.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'NVQ-HEALTH-05':
      case 'galaxy-health': {
        const healthTab = ['home', 'doctors', 'booking', 'results', 'consultation'].includes(activeTab) ? activeTab : 'home';

        return (
          <div className="space-y-6 text-slate-100">
            {/* Navigation Bar */}
            <div className={`flex ${isMobileFrame ? 'flex-col items-start' : 'flex-col sm:flex-row items-start sm:items-center'} justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center text-white shrink-0 shadow-lg ring-1 ring-white/20`}>
                  <Stethoscope className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full sm:w-auto">
                {['home', 'doctors', 'booking', 'results', 'consultation'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      healthTab === tab ? `${themeStyle.primaryBg} text-white font-bold shadow-md` : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab === 'home' && 'الرئيسية'}
                    {tab === 'doctors' && 'الأطباء والتخصصات'}
                    {tab === 'booking' && 'حجز موعد'}
                    {tab === 'results' && 'نتائج التحاليل'}
                    {tab === 'consultation' && 'استشارة مرئية'}
                  </button>
                ))}
              </div>
            </div>

            {healthTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-HEALTH-05'])}

            {healthTab === 'doctors' && (
              <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
                {SAMPLE_DOCTORS.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-3 hover:border-white/25 transition-all">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${doc.imageBg} shrink-0 flex items-center justify-center text-white font-bold text-lg`}>
                      {doc.name.replace('د. ', '').charAt(0)}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{doc.name}</h4>
                      <p className="text-slate-400 truncate">{doc.specialty}</p>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-amber-400 font-bold">★ {doc.rating}</span>
                        {doc.availableToday ? (
                          <span className="text-emerald-400 font-bold">متوفر اليوم</span>
                        ) : (
                          <span className="text-slate-500">غير متوفر اليوم</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDoctorId(doc.id);
                        setActiveTab('booking');
                        cosmicAudio.playPing();
                      }}
                      className={`px-3 py-2 rounded-xl ${themeStyle.primaryBg} text-white font-bold cursor-pointer shrink-0`}
                    >
                      حجز موعد
                    </button>
                  </div>
                ))}
              </div>
            )}

            {healthTab === 'booking' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${themeStyle.primaryText}`} />
                  <span>حجز موعد طبي جديد</span>
                </h4>

                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-bold">اختر الطبيب:</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white cursor-pointer"
                  >
                    {SAMPLE_DOCTORS.map((doc) => (
                      <option key={doc.id} value={doc.id}>{doc.name} - {doc.specialty}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 font-bold">التاريخ:</label>
                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 font-bold">الوقت:</label>
                    <input
                      type="time"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    const doc = SAMPLE_DOCTORS.find((d) => d.id === selectedDoctorId);
                    setAppointments((prev) => [
                      { id: `APT-${Math.floor(1000 + Math.random() * 9000)}`, doctorName: doc?.name || '', specialty: doc?.specialty || '', date: appointmentDate, time: appointmentTime },
                      ...prev
                    ]);
                    cosmicAudio.playPing();
                  }}
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} text-white font-bold cursor-pointer flex items-center justify-center gap-2`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد الحجز</span>
                </button>

                {appointments.length > 0 && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <span className="font-bold text-white block">مواعيدك المحجوزة:</span>
                    {appointments.map((apt) => (
                      <div key={apt.id} className="p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-white font-bold block truncate">{apt.doctorName}</span>
                          <span className="text-slate-500 text-[10px] truncate block">{apt.specialty}</span>
                        </div>
                        <span className="font-mono text-slate-300 shrink-0">{apt.date} - {apt.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {healthTab === 'results' && (
              <div className="space-y-2.5 animate-fade-in text-xs">
                {SAMPLE_LAB_RESULTS.map((lab) => (
                  <div key={lab.id} className="p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-white font-bold block truncate">{lab.name}</span>
                      <span className="text-slate-500 text-[10px] font-mono block truncate">{lab.id} • {lab.date} • {lab.doctor}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${lab.status === 'جاهز' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>
                      {lab.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {healthTab === 'consultation' && (
              <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-center space-y-3 animate-fade-in text-xs">
                <div className={`w-14 h-14 rounded-full ${themeStyle.badgeBg} flex items-center justify-center mx-auto`}>
                  <Stethoscope className={`w-6 h-6 ${themeStyle.primaryText}`} />
                </div>
                <h4 className="text-sm font-bold text-white">غرفة الاستشارة المرئية عن بُعد</h4>
                <p className="text-slate-400 max-w-sm mx-auto">محاكاة لواجهة مكالمة الفيديو مع الطبيب المعالج، مع دردشة نصية مباشرة فور بدء الاستشارة.</p>
                <button
                  onClick={() => alert('تم بدء الاتصال التجريبي بغرفة الاستشارة المرئية بنجاح!')}
                  className={`px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} text-white font-bold cursor-pointer`}
                >
                  بدء الاستشارة الآن
                </button>
              </div>
            )}
          </div>
        );
      }

      case 'NVQ-FOOD-07': {
        const foodTab = ['home', 'menu', 'order', 'reservation'].includes(activeTab) ? activeTab : 'home';
        const filteredMenu = menuCategoryFilter === 'all' ? SAMPLE_MENU_ITEMS : SAMPLE_MENU_ITEMS.filter(m => m.category === menuCategoryFilter);

        return (
          <div className="space-y-6 text-slate-100">
            {/* Navigation Bar */}
            <div className={`flex ${isMobileFrame ? 'flex-col items-start' : 'flex-col sm:flex-row items-start sm:items-center'} justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center text-white shrink-0 shadow-lg ring-1 ring-white/20`}>
                  <ChefHat className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full sm:w-auto">
                {['home', 'menu', 'order', 'reservation'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      foodTab === tab ? `${themeStyle.primaryBg} text-white font-bold shadow-md` : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab === 'home' && 'الرئيسية'}
                    {tab === 'menu' && 'قائمة الطعام'}
                    {tab === 'order' && `سلة الطلب (${foodOrder.reduce((s, o) => s + o.quantity, 0)})`}
                    {tab === 'reservation' && 'حجز طاولة'}
                  </button>
                ))}
              </div>
            </div>

            {foodTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-FOOD-07'])}

            {foodTab === 'menu' && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="flex flex-wrap gap-2">
                  {(['all', 'appetizers', 'mains', 'desserts', 'drinks'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setMenuCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        menuCategoryFilter === cat ? `${themeStyle.primaryBg} text-white` : 'bg-white/5 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat === 'all' && 'الكل'}
                      {cat === 'appetizers' && 'مقبلات'}
                      {cat === 'mains' && 'أطباق رئيسية'}
                      {cat === 'desserts' && 'حلويات'}
                      {cat === 'drinks' && 'مشروبات'}
                    </button>
                  ))}
                </div>

                <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2 lg:grid-cols-3')} gap-4`}>
                  {filteredMenu.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden hover:border-white/25 transition-all">
                      <div className={`h-24 bg-gradient-to-br ${item.imageBg} flex items-center justify-center`}>
                        <ChefHat className="w-7 h-7 text-white/70" />
                      </div>
                      <div className="p-3.5 space-y-2">
                        <h4 className="text-sm font-bold text-white">{item.name}</h4>
                        <p className="text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{item.priceIQD.toLocaleString()} د.ع</span>
                          <button
                            onClick={() => addFoodItem(item)}
                            className={`px-3 py-1.5 rounded-lg ${themeStyle.primaryBg} text-white font-bold cursor-pointer flex items-center gap-1`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>أضف للطلب</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {foodTab === 'order' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-3 animate-fade-in text-xs">
                {foodOrder.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">سلة الطلب فارغة، تصفح القائمة وأضف أصنافك المفضلة.</p>
                ) : (
                  <>
                    {foodOrder.map((o, idx) => (
                      <div key={o.item.id} className="p-3 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-white font-bold block truncate">{o.item.name}</span>
                          <span className="text-slate-500 font-mono">{o.item.priceIQD.toLocaleString()} د.ع</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => updateFoodItemQuantity(idx, -1)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono font-bold text-white w-5 text-center">{o.quantity}</span>
                          <button onClick={() => updateFoodItemQuantity(idx, 1)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="font-bold text-white">الإجمالي:</span>
                      <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{foodOrderTotalIQD.toLocaleString()} د.ع</span>
                    </div>
                    <button
                      onClick={() => alert('تم تأكيد طلبك التجريبي بنجاح! سيتم تحضيره فور تفعيل موقعك الفعلي.')}
                      className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} text-white font-bold cursor-pointer`}
                    >
                      تأكيد الطلب
                    </button>
                  </>
                )}
              </div>
            )}

            {foodTab === 'reservation' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${themeStyle.primaryText}`} />
                  <span>حجز طاولة جديدة</span>
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 font-bold">عدد الضيوف:</label>
                    <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg px-2 py-2">
                      <button onClick={() => setReservationGuests(g => Math.max(1, g - 1))} className="text-white cursor-pointer"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="font-mono font-bold text-white flex-1 text-center">{reservationGuests}</span>
                      <button onClick={() => setReservationGuests(g => Math.min(20, g + 1))} className="text-white cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 font-bold">التاريخ:</label>
                    <input type="date" value={reservationDate} onChange={(e) => setReservationDate(e.target.value)} className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 font-bold">الوقت:</label>
                    <input type="time" value={reservationTime} onChange={(e) => setReservationTime(e.target.value)} className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono" />
                  </div>
                </div>

                <button
                  onClick={confirmTableReservation}
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} text-white font-bold cursor-pointer flex items-center justify-center gap-2`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد الحجز</span>
                </button>

                {tableReservations.length > 0 && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <span className="font-bold text-white block">حجوزاتك:</span>
                    {tableReservations.map((r) => (
                      <div key={r.id} className="p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-2">
                        <span className="text-white font-bold">{r.guests} أشخاص</span>
                        <span className="font-mono text-slate-300">{r.date} - {r.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'NVQ-EDU-08': {
        const eduTab = ['home', 'courses', 'enroll', 'dashboard'].includes(activeTab) ? activeTab : 'home';
        const selectedCourse = SAMPLE_COURSES.find(c => c.id === selectedCourseId) || SAMPLE_COURSES[0];
        const filteredCourses = courseCategoryFilter === 'all' ? SAMPLE_COURSES : SAMPLE_COURSES.filter(c => c.category === courseCategoryFilter);

        return (
          <div className="space-y-6 text-slate-100">
            {/* Navigation Bar */}
            <div className={`flex ${isMobileFrame ? 'flex-col items-start' : 'flex-col sm:flex-row items-start sm:items-center'} justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center text-white shrink-0 shadow-lg ring-1 ring-white/20`}>
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full sm:w-auto">
                {['home', 'courses', 'enroll', 'dashboard'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      eduTab === tab ? `${themeStyle.primaryBg} text-white font-bold shadow-md` : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab === 'home' && 'الرئيسية'}
                    {tab === 'courses' && 'الدورات'}
                    {tab === 'enroll' && 'التسجيل'}
                    {tab === 'dashboard' && 'لوحة الطالب'}
                  </button>
                ))}
              </div>
            </div>

            {eduTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-EDU-08'])}

            {eduTab === 'courses' && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="flex flex-wrap gap-2">
                  {(['all', 'programming', 'languages', 'business', 'design'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCourseCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        courseCategoryFilter === cat ? `${themeStyle.primaryBg} text-white` : 'bg-white/5 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat === 'all' && 'الكل'}
                      {cat === 'programming' && 'برمجة'}
                      {cat === 'languages' && 'لغات'}
                      {cat === 'business' && 'أعمال'}
                      {cat === 'design' && 'تصميم'}
                    </button>
                  ))}
                </div>

                <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4`}>
                  {filteredCourses.map((course) => (
                    <div key={course.id} className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden hover:border-white/25 transition-all">
                      <div className={`h-20 bg-gradient-to-br ${course.imageBg} flex items-center justify-center`}>
                        <GraduationCap className="w-7 h-7 text-white/70" />
                      </div>
                      <div className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-white truncate">{course.title}</h4>
                          <span className={`px-2 py-0.5 rounded-full ${themeStyle.badgeBg} text-[10px] font-bold shrink-0`}>{course.level}</span>
                        </div>
                        <p className="text-slate-400">{course.instructor} • {course.durationWeeks} أسابيع</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{course.priceIQD.toLocaleString()} د.ع</span>
                          <button
                            onClick={() => { setSelectedCourseId(course.id); setActiveTab('enroll'); cosmicAudio.playPing(); }}
                            className={`px-3 py-1.5 rounded-lg ${themeStyle.primaryBg} text-white font-bold cursor-pointer`}
                          >
                            سجل الآن
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {eduTab === 'enroll' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <GraduationCap className={`w-4 h-4 ${themeStyle.primaryText}`} />
                  <span>تأكيد التسجيل في: {selectedCourse.title}</span>
                </h4>
                <p className="text-slate-400">{selectedCourse.instructor} • {selectedCourse.level} • {selectedCourse.durationWeeks} أسابيع</p>
                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-bold">اسم الطالب:</label>
                  <input
                    type="text"
                    value={studentNameInput}
                    onChange={(e) => setStudentNameInput(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-white">رسوم الدورة:</span>
                  <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{selectedCourse.priceIQD.toLocaleString()} د.ع</span>
                </div>
                <button
                  onClick={() => confirmEnrollment(selectedCourse)}
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} text-white font-bold cursor-pointer flex items-center justify-center gap-2`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد التسجيل</span>
                </button>
              </div>
            )}

            {eduTab === 'dashboard' && (
              <div className="space-y-4 animate-fade-in text-xs">
                {enrollments.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2">
                    <span className="font-bold text-white block">دوراتك المسجلة:</span>
                    {enrollments.map((e) => (
                      <div key={e.id} className="p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-2">
                        <span className="text-white font-bold truncate">{e.courseTitle}</span>
                        <span className="font-mono text-slate-300 shrink-0">{e.date}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2">
                  <span className="font-bold text-white block">الدرجات:</span>
                  {SAMPLE_GRADES.map((g, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-2">
                      <span className="text-white truncate">{g.course}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{g.grade}</span>
                        <span className="text-slate-500">{g.status}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-2">
                  <span className="font-bold text-white block">سجل الحضور:</span>
                  {SAMPLE_ATTENDANCE.map((a, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-2">
                      <span className="font-mono text-slate-300">{a.date}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${a.status === 'حاضر' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'NVQ-HOTEL-09': {
        const hotelTab = ['home', 'rooms', 'booking', 'confirmation'].includes(activeTab) ? activeTab : 'home';
        const selectedRoom = SAMPLE_ROOMS.find(r => r.id === selectedRoomId) || SAMPLE_ROOMS[0];
        const nightsPreview = computeNights(checkInDate, checkOutDate);
        const latestBooking = hotelBookings[0];

        return (
          <div className="space-y-6 text-slate-100">
            {/* Navigation Bar */}
            <div className={`flex ${isMobileFrame ? 'flex-col items-start' : 'flex-col sm:flex-row items-start sm:items-center'} justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center text-white shrink-0 shadow-lg ring-1 ring-white/20`}>
                  <Hotel className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full sm:w-auto">
                {['home', 'rooms', 'booking', 'confirmation'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      hotelTab === tab ? `${themeStyle.primaryBg} text-white font-bold shadow-md` : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab === 'home' && 'الرئيسية'}
                    {tab === 'rooms' && 'الغرف والأجنحة'}
                    {tab === 'booking' && 'الحجز'}
                    {tab === 'confirmation' && 'تأكيد الحجز'}
                  </button>
                ))}
              </div>
            </div>

            {hotelTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-HOTEL-09'])}

            {hotelTab === 'rooms' && (
              <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
                {SAMPLE_ROOMS.map((room) => (
                  <div key={room.id} className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden hover:border-white/25 transition-all">
                    <div className={`h-24 bg-gradient-to-br ${room.imageBg} flex items-center justify-center`}>
                      <Hotel className="w-7 h-7 text-white/70" />
                    </div>
                    <div className="p-3.5 space-y-2">
                      <h4 className="text-sm font-bold text-white">{room.name}</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {room.amenities.map((a, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 text-slate-400 text-[10px]">{a}</span>
                        ))}
                      </div>
                      <p className="text-slate-400">يتسع لـ {room.capacity} ضيوف</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{room.pricePerNightIQD.toLocaleString()} د.ع / ليلة</span>
                        <button
                          onClick={() => { setSelectedRoomId(room.id); setActiveTab('booking'); cosmicAudio.playPing(); }}
                          className={`px-3 py-1.5 rounded-lg ${themeStyle.primaryBg} text-white font-bold cursor-pointer`}
                        >
                          احجز الآن
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hotelTab === 'booking' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${themeStyle.primaryText}`} />
                  <span>حجز: {selectedRoom.name}</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 font-bold">تاريخ الوصول:</label>
                    <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 font-bold">تاريخ المغادرة:</label>
                    <input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-bold">عدد الضيوف:</label>
                  <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg px-2 py-2 w-fit">
                    <button onClick={() => setGuestsCount(g => Math.max(1, g - 1))} className="text-white cursor-pointer"><Minus className="w-3.5 h-3.5" /></button>
                    <span className="font-mono font-bold text-white w-6 text-center">{guestsCount}</span>
                    <button onClick={() => setGuestsCount(g => Math.min(selectedRoom.capacity, g + 1))} className="text-white cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="font-bold text-white">الإجمالي ({nightsPreview} ليالٍ):</span>
                  <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{(nightsPreview * selectedRoom.pricePerNightIQD).toLocaleString()} د.ع</span>
                </div>

                <button
                  onClick={() => confirmHotelBooking(selectedRoom)}
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} text-white font-bold cursor-pointer flex items-center justify-center gap-2`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد الحجز</span>
                </button>
              </div>
            )}

            {hotelTab === 'confirmation' && (
              <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-center space-y-3 animate-fade-in text-xs">
                {latestBooking ? (
                  <>
                    <div className={`w-14 h-14 rounded-full ${themeStyle.badgeBg} flex items-center justify-center mx-auto`}>
                      <CheckCircle2 className={`w-6 h-6 ${themeStyle.primaryText}`} />
                    </div>
                    <h4 className="text-sm font-bold text-white">تم تأكيد حجزك بنجاح</h4>
                    <p className="text-slate-400 font-mono">رقم المرجع: {latestBooking.id}</p>
                    <div className="max-w-xs mx-auto p-4 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-start space-y-1.5">
                      <div className="flex justify-between"><span className="text-slate-400">الغرفة:</span><span className="text-white font-bold">{latestBooking.roomName}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">الوصول:</span><span className="text-white font-mono">{latestBooking.checkIn}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">المغادرة:</span><span className="text-white font-mono">{latestBooking.checkOut}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">عدد الليالي:</span><span className="text-white font-mono">{latestBooking.nights}</span></div>
                      <div className="flex justify-between pt-1.5 border-t border-slate-800"><span className="text-slate-400">الإجمالي:</span><span className={`font-bold ${themeStyle.primaryText}`}>{latestBooking.totalIQD.toLocaleString()} د.ع</span></div>
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500 py-6">لا يوجد حجز مؤكد بعد — أكمل خطوة الحجز أولاً.</p>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'NVQ-LOG-10': {
        const logisticsTab = ['home', 'tracking', 'calculator', 'fleet'].includes(activeTab) ? activeTab : 'home';

        return (
          <div className="space-y-6 text-slate-100">
            {/* Navigation Bar */}
            <div className={`flex ${isMobileFrame ? 'flex-col items-start' : 'flex-col sm:flex-row items-start sm:items-center'} justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center text-white shrink-0 shadow-lg ring-1 ring-white/20`}>
                  <Truck className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full sm:w-auto">
                {['home', 'tracking', 'calculator', 'fleet'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      logisticsTab === tab ? `${themeStyle.primaryBg} text-white font-bold shadow-md` : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab === 'home' && 'الرئيسية'}
                    {tab === 'tracking' && 'تتبع الشحنة'}
                    {tab === 'calculator' && 'حاسبة التكلفة'}
                    {tab === 'fleet' && 'الأسطول'}
                  </button>
                ))}
              </div>
            </div>

            {logisticsTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-LOG-10'])}

            {logisticsTab === 'tracking' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="مثال: CMX-77201"
                    className="flex-1 p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono"
                  />
                  <button onClick={trackShipment} className={`px-4 py-2.5 rounded-lg ${themeStyle.primaryBg} text-white font-bold cursor-pointer flex items-center gap-1.5 shrink-0`}>
                    <Package className="w-3.5 h-3.5" />
                    <span>تتبع</span>
                  </button>
                </div>

                {foundShipment && (
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white">{foundShipment.trackingNumber}</span>
                      <span className={`px-2.5 py-0.5 rounded-full ${themeStyle.badgeBg} text-[11px] font-bold`}>{foundShipment.status}</span>
                    </div>
                    {foundShipment.origin !== '—' && (
                      <p className="text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{foundShipment.origin} ← {foundShipment.destination}</span>
                      </p>
                    )}
                    <div className="space-y-2">
                      {foundShipment.stages.map((stage, idx) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          {stage.done ? (
                            <CheckCircle2 className={`w-4 h-4 ${themeStyle.primaryText} shrink-0`} />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                          )}
                          <span className={stage.done ? 'text-white font-bold' : 'text-slate-500'}>{stage.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {logisticsTab === 'calculator' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-bold">وزن الشحنة (كغم):</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={quoteWeight}
                    onChange={(e) => setQuoteWeight(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-400 font-bold">الوجهة:</label>
                  <div className="flex gap-2">
                    {(['local', 'regional', 'international'] as const).map((dest) => (
                      <button
                        key={dest}
                        onClick={() => setQuoteDestination(dest)}
                        className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                          quoteDestination === dest ? `${themeStyle.primaryBg} text-white` : 'bg-black/30 backdrop-blur-sm border border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {dest === 'local' && 'محلي'}
                        {dest === 'regional' && 'إقليمي'}
                        {dest === 'international' && 'دولي'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="font-bold text-white">السعر التقديري:</span>
                  <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{computeShippingQuote().toLocaleString()} د.ع</span>
                </div>
                <button
                  onClick={saveShippingQuote}
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} text-white font-bold cursor-pointer`}
                >
                  احصل على عرض السعر
                </button>
              </div>
            )}

            {logisticsTab === 'fleet' && (
              <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-3 animate-fade-in text-xs`}>
                {[
                  { value: '128', label: 'شحنات نشطة حالياً' },
                  { value: '34', label: 'مندوبين متاحين' },
                  { value: '97%', label: 'معدل التسليم في الوقت' },
                ].map((stat, idx) => (
                  <div key={idx} className="text-center p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
                    <div className={`text-xl font-extrabold font-mono ${themeStyle.primaryText}`}>{stat.value}</div>
                    <div className="text-slate-400 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'NVQ-FINTECH-06':
      default: {
        const fintechTab = ['home', 'wallet', 'cards', 'security'].includes(activeTab) ? activeTab : 'home';

        return (
          <div className="space-y-6 text-slate-100">
            {/* Navigation Bar */}
            <div className={`flex ${isMobileFrame ? 'flex-col items-start' : 'flex-col sm:flex-row items-start sm:items-center'} justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-11 h-11 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center text-white shrink-0 shadow-lg ring-1 ring-white/20`}>
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">Logo</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full sm:w-auto">
                {['home', 'wallet', 'cards', 'security'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      fintechTab === tab ? `${themeStyle.primaryBg} text-white font-bold shadow-md` : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab === 'home' && 'الرئيسية'}
                    {tab === 'wallet' && 'المحفظة'}
                    {tab === 'cards' && 'البطاقات'}
                    {tab === 'security' && 'الأمان'}
                  </button>
                ))}
              </div>
            </div>

            {fintechTab === 'home' && (
              <div className="space-y-4 sm:space-y-6 animate-fade-in">
                <div className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-r ${themeStyle.gradient} border ${themeStyle.primaryBorder} text-center space-y-3 sm:space-y-4`}>
                  <span className={`px-3 py-1 rounded-full ${themeStyle.badgeBg} text-xs font-semibold inline-block`}>
                    نظام مالي رقمي متكامل
                  </span>
                  <h3 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
                    إدارة أموالك بأمان، من أي مكان
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                    محفظة رقمية، تحويلات فورية، وبطاقات افتراضية — كل ذلك محمي بأعلى معايير التشفير والحماية الثنائية 2FA.
                  </p>
                  <div className={`pt-2 flex ${isMobileFrame ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
                    <button onClick={() => setActiveTab('wallet')} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} text-white text-xs font-bold cursor-pointer`}>
                      افتح المحفظة الرقمية
                    </button>
                    <button onClick={() => setActiveTab('security')} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer">
                      إعدادات الأمان
                    </button>
                  </div>
                </div>

                <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-2.5 text-center`}>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
                    <div className={`text-lg sm:text-xl font-bold ${themeStyle.primaryText} font-mono`}>+25,000</div>
                    <div className="text-[11px] text-slate-400">مستخدم نشط</div>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
                    <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">256-bit</div>
                    <div className="text-[11px] text-slate-400">تشفير مصرفي</div>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
                    <div className="text-lg sm:text-xl font-bold text-amber-400 font-mono">24/7</div>
                    <div className="text-[11px] text-slate-400">مراقبة أمنية</div>
                  </div>
                </div>
              </div>
            )}

            {fintechTab === 'wallet' && (
              <div className={`p-4 sm:p-6 rounded-2xl bg-gradient-to-r ${themeStyle.gradient} border ${themeStyle.primaryBorder} space-y-3 sm:space-y-4 animate-fade-in`}>
                <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-3 pt-1`}>
                  <div className="bg-slate-950/70 p-3.5 sm:p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">الرصيد الكلي المتوفر:</span>
                    <div className={`text-xl sm:text-2xl font-bold ${themeStyle.primaryText} font-mono`}>14,250,000 د.ع</div>
                    <span className="text-[10px] text-slate-400 font-mono">(~$9,820 USD)</span>
                  </div>
                  <div className="bg-slate-950/70 p-3.5 sm:p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                    <span className="text-xs text-slate-400 block">آخر عملية تحويل:</span>
                    <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
                      <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>تم استلام 500,000 د.ع</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">رمز المعاملة: #TX-984211</span>
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 space-y-2.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Send className={`w-4 h-4 ${themeStyle.primaryText} shrink-0`} />
                    <span>محاكاة تحويل مالي سريع</span>
                  </h4>
                  <div className={`flex ${isMobileFrame ? 'flex-col' : 'flex-col sm:flex-row'} gap-2`}>
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="المبلغ بالدينار"
                      className="flex-1 p-2.5 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 text-xs text-white font-mono"
                    />
                    <button
                      onClick={() => {
                        const amountStr = Number(transferAmount).toLocaleString();
                        setTransfersLog(prev => [
                          { id: `TX-${Math.floor(10000 + Math.random() * 90000)}`, amount: `${amountStr} د.ع`, date: new Date().toISOString().split('T')[0], recipient: 'تحويل سريع مباشر' },
                          ...prev
                        ]);
                        cosmicAudio.playPing();
                      }}
                      className={`w-full sm:w-auto px-4 py-2.5 ${themeStyle.primaryBg} text-white text-xs font-bold rounded-lg cursor-pointer shrink-0`}
                    >
                      تأكيد التحويل
                    </button>
                  </div>
                </div>

                {/* Transaction history log */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                  <span className="font-bold text-white block">سجل المعاملات السريعة:</span>
                  <div className="space-y-1.5">
                    {transfersLog.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-2 rounded bg-slate-900/90 text-[11px] border border-slate-800">
                        <div>
                          <span className="text-white font-bold block">{tx.recipient}</span>
                          <span className="text-slate-500 text-[10px] font-mono">{tx.id} • {tx.date}</span>
                        </div>
                        <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{tx.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {fintechTab === 'cards' && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className={`p-5 rounded-2xl bg-gradient-to-br ${themeStyle.gradient} border ${themeStyle.primaryBorder} space-y-6`}>
                  <div className="flex items-center justify-between">
                    <CreditCard className={`w-7 h-7 ${themeStyle.primaryText}`} />
                    <span className="text-white font-bold">Vortex Card</span>
                  </div>
                  <div className="font-mono text-white text-base sm:text-lg tracking-widest" dir="ltr">•••• •••• •••• 8421</div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>حامل البطاقة: أحمد العراقي</span>
                    <span className="font-mono" dir="ltr">08/29</span>
                  </div>
                </div>
                <button
                  onClick={() => alert('تم تقديم طلب إصدار بطاقة رقمية جديدة تجريبياً بنجاح!')}
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} text-white font-bold cursor-pointer`}
                >
                  طلب بطاقة رقمية جديدة
                </button>
              </div>
            )}

            {fintechTab === 'security' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center gap-2.5">
                    <Shield className={`w-4 h-4 ${themeStyle.primaryText}`} />
                    <span className="text-white font-bold">الحماية الثنائية (2FA)</span>
                  </div>
                  <button
                    onClick={() => { setTwoFactorEnabled(v => !v); cosmicAudio.playPing(); }}
                    className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${twoFactorEnabled ? themeStyle.primaryBg : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${twoFactorEnabled ? 'right-0.5' : 'right-5'}`} />
                  </button>
                </div>
                <div className="space-y-2">
                  {[
                    'تنبيهات فورية عند كل عملية دخول',
                    'تشفير كامل للبيانات أثناء النقل والتخزين',
                    'مراقبة أمنية استباقية على مدار الساعة',
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-zinc-100 flex flex-col w-full h-[100dvh] overflow-hidden animate-fade-in">
      
      {/* Floating Top Bar / Controls */}
      {!controlsHidden ? (
        <div className="py-2.5 px-3 sm:px-6 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onClose}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-300" />
              <span className="hidden sm:inline">العودة</span>
            </button>
            <div className="h-5 w-px bg-zinc-800 hidden sm:block shrink-0" />
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[130px] sm:max-w-xs">
                موقع حي: {template.title}
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono truncate hidden sm:block">https://live.novaq.space/{template.id}</p>
            </div>
          </div>

          {/* Center Color Picker & Viewport Switcher Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            
            {/* Color Theme Selector Dropdown / Bar */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-all"
                title="تخصيص ألوان القالب المباشرة"
              >
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline text-[11px]">ألوان القالب</span>
              </button>

              {showColorPicker && (
                <div className="absolute top-11 right-0 z-50 bg-slate-900 border border-slate-700 p-3 rounded-2xl shadow-2xl space-y-2 w-48 text-xs animate-fade-in">
                  <span className="font-bold text-white block text-[11px]">اختر ثيم الألوان المفضل:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button 
                      onClick={() => changeThemeColor('emerald')}
                      className={`p-1.5 rounded-lg text-right font-semibold text-[11px] flex items-center justify-between cursor-pointer ${themeColor === 'emerald' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500' : 'bg-slate-950 text-slate-400'}`}
                    >
                      <span>زمردي</span>
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                    </button>
                    <button 
                      onClick={() => changeThemeColor('purple')}
                      className={`p-1.5 rounded-lg text-right font-semibold text-[11px] flex items-center justify-between cursor-pointer ${themeColor === 'purple' ? 'bg-purple-900/60 text-purple-300 border border-purple-500' : 'bg-slate-950 text-slate-400'}`}
                    >
                      <span>بنفسجي</span>
                      <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                    </button>
                    <button 
                      onClick={() => changeThemeColor('cyan')}
                      className={`p-1.5 rounded-lg text-right font-semibold text-[11px] flex items-center justify-between cursor-pointer ${themeColor === 'cyan' ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-500' : 'bg-slate-950 text-slate-400'}`}
                    >
                      <span>سماوي</span>
                      <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block" />
                    </button>
                    <button 
                      onClick={() => changeThemeColor('amber')}
                      className={`p-1.5 rounded-lg text-right font-semibold text-[11px] flex items-center justify-between cursor-pointer ${themeColor === 'amber' ? 'bg-amber-900/60 text-amber-300 border border-amber-500' : 'bg-slate-950 text-slate-400'}`}
                    >
                      <span>ذهبي</span>
                      <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                    </button>
                    <button 
                      onClick={() => changeThemeColor('rose')}
                      className={`p-1.5 rounded-lg text-right font-semibold text-[11px] flex items-center justify-between cursor-pointer ${themeColor === 'rose' ? 'bg-rose-900/60 text-rose-300 border border-rose-500' : 'bg-slate-950 text-slate-400'}`}
                    >
                      <span>ياقوتي</span>
                      <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                    </button>
                    <button 
                      onClick={() => changeThemeColor('monochrome')}
                      className={`p-1.5 rounded-lg text-right font-semibold text-[11px] flex items-center justify-between cursor-pointer ${themeColor === 'monochrome' ? 'bg-zinc-800 text-white border border-white' : 'bg-slate-950 text-slate-400'}`}
                    >
                      <span>رمادي</span>
                      <span className="w-3 h-3 rounded-full bg-white inline-block" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Viewport switch controls */}
            <div className="flex items-center gap-0.5 bg-black p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                onClick={() => setDeviceView('full')}
                title="موقع مباشر"
                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${deviceView === 'full' ? 'bg-zinc-800 text-white font-bold border border-white glow-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden md:inline">مباشر</span>
              </button>
              <button
                onClick={() => setDeviceView('desktop')}
                title="شاشة كمبيوتر"
                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${deviceView === 'desktop' ? 'bg-zinc-800 text-white font-bold border border-white glow-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">كمبيوتر</span>
              </button>
              <button
                onClick={() => setDeviceView('tablet')}
                title="تابلت"
                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${deviceView === 'tablet' ? 'bg-zinc-800 text-white font-bold border border-white glow-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تابلت</span>
              </button>
              <button
                onClick={() => setDeviceView('mobile')}
                title="جوال"
                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${deviceView === 'mobile' ? 'bg-zinc-800 text-white font-bold border border-white glow-white' : 'text-zinc-400 hover:text-white'}`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">جوال</span>
              </button>
            </div>

            <button
              onClick={() => setControlsHidden(true)}
              title="إخفاء شريط التحكم لمعاينة شاشة كاملة"
              className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 text-xs flex items-center gap-1 cursor-pointer glow-white-hover"
            >
              <Eye className="w-4 h-4 text-zinc-300" />
            </button>

            <button
              onClick={onClose}
              title="إغلاق المعاينة"
              className="p-1.5 sm:p-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Floating mini badge when controls are hidden */
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-black/95 border border-zinc-700/80 p-2 rounded-2xl shadow-2xl">
          <button
            onClick={() => setControlsHidden(false)}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold cursor-pointer"
          >
            إظهار شريط التحكم
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold cursor-pointer"
          >
            العودة لـ NOVAIQ
          </button>
        </div>
      )}

      {/* Main Full-Screen Live Site Area */}
      <div className={`flex-1 overflow-y-auto w-full ${deviceView === 'full' ? 'bg-slate-950 p-2 sm:p-4' : 'bg-black p-2 sm:p-6'} flex flex-col items-center justify-start`}>
        
        {deviceView === 'full' ? (
          <div className="w-full min-h-full bg-slate-950 text-slate-100 p-3 sm:p-8 max-w-7xl mx-auto">
            {renderInteractivePageContent()}
          </div>
        ) : (
          /* Standalone Browser Viewport */
          <div
            className={`bg-zinc-950 border-2 border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 my-auto flex flex-col ${
              deviceView === 'desktop'
                ? 'w-full max-w-7xl h-[75vh]'
                : deviceView === 'tablet'
                ? 'w-full sm:w-[720px] max-w-full h-[70vh]'
                : 'w-full max-w-[375px] shrink-0 aspect-[9/19.5] max-h-[80vh]'
            }`}
          >
            {/* Simulated Browser Address Bar */}
            <div className="bg-zinc-900 px-3 py-2 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-mono gap-2 shrink-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="bg-black px-3 py-1 rounded-lg text-[10px] sm:text-[11px] text-zinc-200 border border-zinc-800 truncate flex-1 text-center dir-ltr font-mono">
                https://live.novaq.space/{template.id}
              </div>
              <div className="text-[10px] text-zinc-400 shrink-0 hidden sm:block">Baghdad, IQ</div>
            </div>

            {/* Render Standalone Interactive Page */}
            <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-950/40">
              {renderInteractivePageContent()}
            </div>
          </div>
        )}

      </div>

      {/* Floating Bottom Action Bar */}
      {!controlsHidden && (
        <div className="py-2.5 px-3 sm:px-6 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 z-20">
          <div className="text-center sm:text-right">
            <span className="text-[11px] text-zinc-400">التكلفة الأساسية للقالب: </span>
            <span className="text-sm sm:text-base font-bold text-white font-mono">
              {basePrice.toLocaleString()} د.ع
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold hover:bg-zinc-800 border border-zinc-800 cursor-pointer glow-white-hover text-center"
            >
              إغلاق
            </button>
            <button
              onClick={() => onSelectForContract(template, buildCustomizationSummary(), THEME_COLOR_HEX[themeColor])}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold white-btn-glow flex items-center justify-center gap-1.5 cursor-pointer border border-white"
            >
              <span>طلب واستخراج العقد</span>
              <ArrowLeft className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
