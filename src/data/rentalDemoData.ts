// ── Sakan — the apartment-rental demo's data ───────────────────────────────────────────────
//
// One building, twelve floors, and the units inside it. The website and the phone app are two
// front doors onto THIS file — not two datasets that happen to look alike — which is the whole
// claim the demo is making: a booking made in the app is the same booking the website's account
// page lists, because there is only one of it.

export interface RentalUnit {
  id: string;
  /** What the building's own paperwork calls the unit — floor and number, the way a lease does. */
  code: string;
  title: string;
  /** 1–12. The 3D building reads availability per floor straight off this. */
  floor: number;
  district: string;
  rooms: number;
  baths: number;
  /** Square metres. */
  area: number;
  furnished: boolean;
  monthlyIQD: number;
  /** Short-stay rate. Kept as its own number rather than monthly/30 — a night is priced higher
   *  than a thirtieth of a month everywhere that rents by both, and pretending otherwise makes
   *  the daily option look like a rounding error. */
  dailyIQD: number;
  /** Refundable deposit, and the monthly service charge. Both are quoted before signing here
   *  rather than after, because they are the two numbers a tenant is most often surprised by. */
  depositIQD: number;
  serviceIQD: number;
  rating: number;
  reviews: number;
  available: boolean;
  view: string;
  images: string[];
  amenities: AmenityKey[];
}

export type AmenityKey =
  | 'wifi'
  | 'parking'
  | 'elevator'
  | 'generator'
  | 'ac'
  | 'security'
  | 'gym'
  | 'kitchen';

export const AMENITY_LABEL_AR: Record<AmenityKey, string> = {
  wifi: 'إنترنت فايبر',
  parking: 'موقف خاص',
  elevator: 'مصعد',
  generator: 'مولدة 24 ساعة',
  ac: 'تكييف مركزي',
  security: 'حماية وكاميرات',
  gym: 'نادي رياضي',
  kitchen: 'مطبخ مجهّز',
};

/** How many floors the building has. The 3D model, the floor picker and the unit codes all
 *  read this one number, so the model can never show a floor the catalogue doesn't have. */
export const TOWER_FLOORS = 12;

const IMG = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const RENTAL_UNITS: RentalUnit[] = [
  {
    id: 'u-1201', code: 'A-1201', title: 'بنتهاوس بإطلالة على دجلة',
    floor: 12, district: 'الكرادة', rooms: 4, baths: 3, area: 210, furnished: true,
    monthlyIQD: 2200000, dailyIQD: 145000, depositIQD: 2200000, serviceIQD: 180000,
    rating: 4.9, reviews: 41, available: true, view: 'إطلالة مفتوحة على النهر',
    images: [IMG('photo-1600585154340-be6161a56a0c'), IMG('photo-1600596542815-ffad4c1539a9'), IMG('photo-1600607687939-ce8a6c25118c')],
    amenities: ['wifi', 'parking', 'elevator', 'generator', 'ac', 'security', 'gym', 'kitchen'],
  },
  {
    id: 'u-1102', code: 'A-1102', title: 'شقة ثلاث غرف مفروشة',
    floor: 11, district: 'الكرادة', rooms: 3, baths: 2, area: 165, furnished: true,
    monthlyIQD: 1450000, dailyIQD: 95000, depositIQD: 1450000, serviceIQD: 140000,
    rating: 4.8, reviews: 63, available: true, view: 'إطلالة على المدينة',
    images: [IMG('photo-1545324418-cc1a3fa10c00'), IMG('photo-1502672260266-1c1ef2d93688'), IMG('photo-1493809842364-78817add7ffb')],
    amenities: ['wifi', 'parking', 'elevator', 'generator', 'ac', 'security', 'kitchen'],
  },
  {
    id: 'u-1003', code: 'A-1003', title: 'شقة عائلية واسعة',
    floor: 10, district: 'الكرادة', rooms: 3, baths: 2, area: 158, furnished: false,
    monthlyIQD: 1100000, dailyIQD: 78000, depositIQD: 1100000, serviceIQD: 130000,
    rating: 4.6, reviews: 28, available: true, view: 'إطلالة على الحديقة الداخلية',
    images: [IMG('photo-1600566753086-00f18fb6b3ea'), IMG('photo-1568605114967-8130f3a36994')],
    amenities: ['parking', 'elevator', 'generator', 'ac', 'security'],
  },
  {
    id: 'u-0904', code: 'A-0904', title: 'شقة غرفتين بتشطيب حديث',
    floor: 9, district: 'الكرادة', rooms: 2, baths: 2, area: 128, furnished: true,
    monthlyIQD: 950000, dailyIQD: 68000, depositIQD: 950000, serviceIQD: 120000,
    rating: 4.7, reviews: 52, available: true, view: 'إطلالة جانبية على النهر',
    images: [IMG('photo-1570129477492-45c003edd2be'), IMG('photo-1512917774080-9991f1c4c750')],
    amenities: ['wifi', 'elevator', 'generator', 'ac', 'security', 'kitchen'],
  },
  {
    id: 'u-0801', code: 'A-0801', title: 'شقة غرفتين — إيجار يومي',
    floor: 8, district: 'الكرادة', rooms: 2, baths: 1, area: 112, furnished: true,
    monthlyIQD: 880000, dailyIQD: 72000, depositIQD: 500000, serviceIQD: 110000,
    rating: 4.5, reviews: 96, available: true, view: 'إطلالة على الشارع الرئيسي',
    images: [IMG('photo-1583608205776-bfd35f0d9f83'), IMG('photo-1613490493576-7fde63acd811')],
    amenities: ['wifi', 'elevator', 'generator', 'ac', 'kitchen'],
  },
  {
    id: 'u-0702', code: 'A-0702', title: 'شقة ثلاث غرف — مؤجّرة',
    floor: 7, district: 'الكرادة', rooms: 3, baths: 2, area: 155, furnished: false,
    monthlyIQD: 1050000, dailyIQD: 75000, depositIQD: 1050000, serviceIQD: 130000,
    rating: 4.4, reviews: 19, available: false, view: 'إطلالة على المدينة',
    images: [IMG('photo-1493809842364-78817add7ffb')],
    amenities: ['parking', 'elevator', 'generator', 'ac'],
  },
  {
    id: 'u-0603', code: 'A-0603', title: 'استوديو مفروش بالكامل',
    floor: 6, district: 'الكرادة', rooms: 1, baths: 1, area: 74, furnished: true,
    monthlyIQD: 620000, dailyIQD: 52000, depositIQD: 400000, serviceIQD: 90000,
    rating: 4.6, reviews: 74, available: true, view: 'إطلالة على الحديقة الداخلية',
    images: [IMG('photo-1502672260266-1c1ef2d93688'), IMG('photo-1545324418-cc1a3fa10c00')],
    amenities: ['wifi', 'elevator', 'generator', 'ac', 'kitchen'],
  },
  {
    id: 'u-0504', code: 'A-0504', title: 'شقة غرفتين بشرفة واسعة',
    floor: 5, district: 'الكرادة', rooms: 2, baths: 2, area: 124, furnished: false,
    monthlyIQD: 820000, dailyIQD: 60000, depositIQD: 820000, serviceIQD: 110000,
    rating: 4.3, reviews: 31, available: true, view: 'شرفة مطلة على النهر',
    images: [IMG('photo-1600607687939-ce8a6c25118c'), IMG('photo-1600566753086-00f18fb6b3ea')],
    amenities: ['parking', 'elevator', 'generator', 'ac', 'security'],
  },
  {
    id: 'u-0401', code: 'A-0401', title: 'شقة عائلية — مؤجّرة',
    floor: 4, district: 'الكرادة', rooms: 3, baths: 2, area: 150, furnished: true,
    monthlyIQD: 1180000, dailyIQD: 82000, depositIQD: 1180000, serviceIQD: 130000,
    rating: 4.7, reviews: 44, available: false, view: 'إطلالة على المدينة',
    images: [IMG('photo-1568605114967-8130f3a36994')],
    amenities: ['wifi', 'parking', 'elevator', 'generator', 'ac', 'kitchen'],
  },
  {
    id: 'u-0302', code: 'A-0302', title: 'شقة غرفتين اقتصادية',
    floor: 3, district: 'الكرادة', rooms: 2, baths: 1, area: 105, furnished: false,
    monthlyIQD: 690000, dailyIQD: 55000, depositIQD: 690000, serviceIQD: 95000,
    rating: 4.2, reviews: 22, available: true, view: 'إطلالة على الحديقة الداخلية',
    images: [IMG('photo-1512917774080-9991f1c4c750'), IMG('photo-1583608205776-bfd35f0d9f83')],
    amenities: ['elevator', 'generator', 'ac'],
  },
  {
    id: 'u-0203', code: 'A-0203', title: 'استوديو قريب من المدخل',
    floor: 2, district: 'الكرادة', rooms: 1, baths: 1, area: 68, furnished: true,
    monthlyIQD: 540000, dailyIQD: 46000, depositIQD: 350000, serviceIQD: 85000,
    rating: 4.1, reviews: 37, available: true, view: 'إطلالة على المدخل الرئيسي',
    images: [IMG('photo-1613490493576-7fde63acd811')],
    amenities: ['wifi', 'elevator', 'generator', 'kitchen'],
  },
  {
    id: 'u-0104', code: 'A-0104', title: 'شقة أرضية بمدخل مستقل',
    floor: 1, district: 'الكرادة', rooms: 2, baths: 2, area: 132, furnished: false,
    monthlyIQD: 760000, dailyIQD: 58000, depositIQD: 760000, serviceIQD: 100000,
    rating: 4.4, reviews: 26, available: true, view: 'مدخل مستقل وحديقة صغيرة',
    images: [IMG('photo-1570129477492-45c003edd2be'), IMG('photo-1600585154340-be6161a56a0c')],
    amenities: ['parking', 'generator', 'ac', 'security'],
  },
];

/** Units on a floor, top floor first — the order the building itself is read in. */
export const unitsOnFloor = (floor: number) => RENTAL_UNITS.filter((u) => u.floor === floor);

/** Whether a floor has anything to rent. The 3D model lights its windows off this. */
export const floorHasVacancy = (floor: number) => unitsOnFloor(floor).some((u) => u.available);

export interface RentalBooking {
  id: string;
  unitId: string;
  unitTitle: string;
  unitCode: string;
  /** Monthly lease or a short stay — the two things this building actually rents. */
  term: 'monthly' | 'daily';
  /** Months, or nights. */
  duration: number;
  startDate: string;
  totalIQD: number;
  status: 'confirmed' | 'pending';
  /** Which front door it was made through, shown in the account so the demo's own point is
   *  visible: the same list, whichever half you booked from. */
  source: 'site' | 'app';
}

/** What a booking costs, all of it, before anyone signs anything.
 *
 *  Deposit is refundable and the service charge recurs, so they are returned separately rather
 *  than folded into one total — a single number here would be the exact thing the listing page
 *  is trying not to do to the tenant. */
export function quoteFor(unit: RentalUnit, term: 'monthly' | 'daily', duration: number) {
  const rate = term === 'monthly' ? unit.monthlyIQD : unit.dailyIQD;
  const rent = rate * duration;
  const service = term === 'monthly' ? unit.serviceIQD * duration : 0;
  const deposit = term === 'monthly' ? unit.depositIQD : Math.round(unit.depositIQD * 0.3);
  return { rate, rent, service, deposit, total: rent + service + deposit };
}

export const SAKAN_IDENTITY = {
  name: 'سَكَن',
  badge: 'تأجير شقق سكنية — بغداد',
  tagline: 'شقة جاهزة، عقد واضح، وحجز يخلص بثلاث ضغطات.',
  buildingName: 'مجمع سَكَن السكني — الكرادة',
  contact: {
    phone: '+964 780 000 0000',
    email: 'hello@sakan.example',
    address: 'بغداد — الكرادة، شارع النهر',
    hours: 'السبت — الخميس، 9 صباحاً — 8 مساءً',
  },
};

export const SAKAN_STATS = [
  { value: '12', label: 'طابق' },
  { value: '48', label: 'وحدة سكنية' },
  { value: '24/7', label: 'مولدة وحماية' },
  { value: '4.7', label: 'تقييم المستأجرين' },
];

export const DISTRICT_OPTIONS = ['الكل', 'الكرادة'];

export const ROOM_OPTIONS = [
  { value: 0, label: 'أي عدد' },
  { value: 1, label: 'غرفة' },
  { value: 2, label: 'غرفتين' },
  { value: 3, label: '3 غرف' },
  { value: 4, label: '4 غرف+' },
];

/* ─────────────────────────────────────────────────────────────────────────────────────────────
   The content that turns the demo from a listings grid into a site.

   A rental marketplace is bought on trust before it is bought on price: the visitor's real
   question is not "how much" but "is this real, and what happens if it goes wrong". Everything
   below answers that question — the guarantees, other tenants' words, and the objections written
   out plainly instead of left for a phone call.
   ───────────────────────────────────────────────────────────────────────────────────────────── */

/** Popular searches under the hero box. Reduces a blank field to one tap — the single biggest
 *  drop-off point on any search-led marketplace. */
export const POPULAR_SEARCHES = ['مفروشة', 'غرفتين', 'الطابق 8', 'إطلالة نهر', 'يومي'];

export interface TrustFact {
  key: string;
  title: string;
  body: string;
}

/** The Trust & Safety block. Each one is a commitment a tenant can hold us to, not a slogan. */
export const SAKAN_TRUST: TrustFact[] = [
  {
    key: 'verified',
    title: 'كل وحدة مُعاينة',
    body: 'الصور من الوحدة نفسها، مصوّرة بآخر 30 يوم. لا صور مجمّلة ولا وحدة تختلف عن اللي شفتها.',
  },
  {
    key: 'deposit',
    title: 'التأمين مسترجع',
    body: 'مبلغ التأمين يرجع كامل خلال 7 أيام من إخلاء الوحدة، ما لم يكن هناك ضرر موثّق بالصور.',
  },
  {
    key: 'contract',
    title: 'عقد واضح قبل الدفع',
    body: 'الإيجار والتأمين والخدمات تظهر بالكامل قبل التوقيع — ما في رسوم تطلع بعدين.',
  },
  {
    key: 'support',
    title: 'صيانة خلال 24 ساعة',
    body: 'طلب الصيانة من حسابك، وفريق المجمّع يستجيب خلال 24 ساعة للأعطال الأساسية.',
  },
];

export interface SakanReview {
  name: string;
  unit: string;
  stay: string;
  rating: number;
  body: string;
}

/** Tenant reviews. Deliberately specific — a named unit and a length of stay is what separates a
 *  review a visitor believes from one they scroll past. */
export const SAKAN_REVIEWS: SakanReview[] = [
  {
    name: 'مريم ع.',
    unit: 'شقة 802',
    stay: 'ساكنة من 8 أشهر',
    rating: 5,
    body: 'أكثر شي عجبني إن الحساب طلع مثل ما مكتوب بالضبط. وقّعت العقد يوم الخميس واستلمت المفتاح يوم السبت.',
  },
  {
    name: 'حسن م.',
    unit: 'شقة 405',
    stay: 'ساكن من سنة',
    rating: 5,
    body: 'المولدة ما انقطعت ولا مرة بالصيف. طلبت تصليح سخّان مرة وجوا بنفس اليوم.',
  },
  {
    name: 'زينب ك.',
    unit: 'شقة 1101',
    stay: 'إقامة يومية — 12 ليلة',
    rating: 4,
    body: 'حجزت باليوم لأني كنت بزيارة. الشقة نظيفة والإطلالة على النهر فعلاً مثل الصور.',
  },
];

export interface SakanFaq {
  q: string;
  a: string;
}

/** The objections, answered. Every one of these is a question that otherwise becomes a phone call
 *  — or a visitor who leaves without asking. */
export const SAKAN_FAQ: SakanFaq[] = [
  {
    q: 'شنو المطلوب مني حتى أوقّع العقد؟',
    a: 'هوية سارية ورقم هاتف فعّال، وأول دفعة حسب المدة اللي تختارها. التوقيع إلكتروني من حسابك، وما يحتاج تراجع المكتب.',
  },
  {
    q: 'أگدر أستأجر باليوم بدل الشهر؟',
    a: 'نعم. أغلب الوحدات متاحة يومياً وشهرياً، والسعر يختلف بين الاثنين — تشوف الحسبتين قبل ما تختار.',
  },
  {
    q: 'التأمين شكد، ومتى يرجع؟',
    a: 'التأمين مبيّن على كل وحدة قبل التوقيع، ويرجع كامل خلال 7 أيام من الإخلاء ما لم يكن هناك ضرر موثّق.',
  },
  {
    q: 'أگدر أمدّد العقد بعدين؟',
    a: 'نعم، من حسابك مباشرة قبل انتهاء المدة بـ 14 يوم، وبنفس السعر إذا الوحدة ما محجوزة بعدك.',
  },
  {
    q: 'هل الشقق مفروشة؟',
    a: 'قسم منها مفروش بالكامل وقسم فاضي. تگدر تفلتر على "مفروشة فقط" من صفحة الشقق المتاحة.',
  },
];

export interface OwnerBenefit {
  key: string;
  title: string;
  body: string;
}

/** The landlord-facing pitch. A rental marketplace has two customers, and a site that only speaks
 *  to tenants is missing the half that supplies the inventory. */
export const SAKAN_OWNER_BENEFITS: OwnerBenefit[] = [
  {
    key: 'reach',
    title: 'وحدتك تُعرض على مستأجرين جاهزين',
    body: 'الزائر يوصل لوحدتك من البناية ثلاثية الأبعاد ومن البحث — مو من إعلان يضيع بين مئة إعلان.',
  },
  {
    key: 'paperwork',
    title: 'العقد والتحصيل علينا',
    body: 'نحن نتولّى العقد الإلكتروني وتحصيل الإيجار والتأمين، وتوصلك دفعتك بموعد ثابت كل شهر.',
  },
  {
    key: 'screening',
    title: 'مستأجر مُتحقَّق منه',
    body: 'كل مستأجر يمرّ بتحقّق هوية قبل التوقيع، وتشوف بياناته قبل ما توافق.',
  },
  {
    key: 'control',
    title: 'السعر يبقى قرارك',
    body: 'أنت تحدد الإيجار ومدة العقد وشروط الإشغال. نحن ننفّذ، ما نسعّر عنك.',
  },
];

/** The three steps of listing, for the owner page. */
export const OWNER_STEPS = [
  { n: '01', t: 'أرسل بيانات الوحدة', d: 'الموقع، عدد الغرف، المساحة، والإيجار اللي تريده.' },
  { n: '02', t: 'نعاين ونصوّر', d: 'فريقنا يزور الوحدة خلال 3 أيام ويصوّرها على حسابنا.' },
  { n: '03', t: 'تنشر وتستلم', d: 'الوحدة تنزل على المنصة، وأول دفعة توصلك عند توقيع أول مستأجر.' },
];
