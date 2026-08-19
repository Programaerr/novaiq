import { Template } from '../types';

// ── The catalogue ──────────────────────────────────────────────────────────────────────────
//
// One template. It was eleven, each a different industry with its own demo, and the whole set
// was retired in favour of building a single product properly: an apartment-rental platform
// that ships as BOTH a website and a phone app, demonstrated as both.
//
// A catalogue of one is a deliberate position, not a placeholder. Eleven shallow demos ask the
// visitor to imagine what their version would look like; one that is complete — with the same
// bookings visible on the site and in the app, and the building itself explorable in 3D —
// shows them. The grid, the filters, the contract flow and the admin price overrides all still
// work exactly as they did; they simply have one row to work on.
export const templatesData: Template[] = [
  {
    id: 'NVQ-REAL-04',
    title: 'سَكَن — منصة تأجير الشقق (Sakan)',
    subtitle: 'موقع كامل + تطبيق جوال، بنفس الحجوزات ونفس الحساب',
    category: 'realestate',
    categoryLabel: 'تأجير شقق',
    description:
      'منصة تأجير شقق متكاملة: تصفّح الوحدات، استكشاف البناية بثلاثة أبعاد لاختيار الطابق، حجز فوري بالشهر أو باليوم، ومتابعة العقد والدفعات من الموقع أو من التطبيق.',
    longDescription:
      'سَكَن ليس قالب صفحة واحدة، بل منتج بواجهتين: موقع كامل للمتصفح وتطبيق جوال بنفس البيانات — الحجز الذي يبدأ من التطبيق يظهر فوراً في حساب الموقع والعكس. الميزة التي تميّزه: نموذج ثلاثي الأبعاد حقيقي للبناية، الزائر يدور حولها ويضغط على الطابق ليشوف وحداته الشاغرة قبل ما يفتح أي صورة. يشمل الفلترة حسب المنطقة والغرف والفرش والميزانية، حاسبة الإيجار مع التأمين والخدمات، تقويم الإتاحة، وحساب مستأجر فيه عقوده ودفعاته وطلبات الصيانة.',
    previewImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=60',
    // Unchanged from this template's previous, website-only scope. The app half is new and this
    // number does not reflect it yet — it is the owner's call to price, not ours to invent.
    basePriceIQD: 1600000,
    basePriceUSD: 1100,
    deliveryWeeks: 5,
    tags: ['تأجير شقق', 'موقع + تطبيق', 'بناية ثلاثية الأبعاد', 'حجز فوري'],
    techStack: ['React 19', 'React Native', 'Three.js / R3F', 'Tailwind CSS v4', 'Firebase', 'خرائط تفاعلية'],
    features: [
      'نموذج ثلاثي الأبعاد للبناية — اضغط الطابق لتشوف وحداته الشاغرة',
      'حجز بالشهر أو باليوم مع حساب التأمين وأجور الخدمات مباشرة',
      'فلترة حسب المنطقة، عدد الغرف، الفرش، والميزانية الشهرية',
      'تطبيق جوال بنفس الحساب والحجوزات — ما تتكرر البيانات',
      'حساب المستأجر: العقد، الدفعات، وطلبات الصيانة في مكان واحد',
      'لوحة مالك: إشغال الوحدات، الإيرادات الشهرية، والعقود المنتهية',
    ],
    mockScreens: [
      {
        title: 'الموقع — استكشاف البناية',
        description: 'البناية بثلاثة أبعاد على اليمين والوحدات الشاغرة تتفلتر مع الطابق المختار',
        colorGrad: 'from-emerald-900/60 to-slate-950',
        contentPreview: 'Sakan Residences — 12 floors, live availability',
      },
      {
        title: 'التطبيق — الحجز',
        description: 'اختيار المدة والتاريخ وتأكيد الحجز بثلاث ضغطات داخل التطبيق',
        colorGrad: 'from-teal-900/60 to-slate-950',
        contentPreview: 'Sakan App — book a unit in three taps',
      },
      {
        title: 'حساب المستأجر',
        description: 'العقد والدفعات وطلبات الصيانة، بنفس المحتوى على الموقع والتطبيق',
        colorGrad: 'from-slate-800/60 to-slate-950',
        contentPreview: 'One tenant account, two front doors',
      },
    ],
  },
];
