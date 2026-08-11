import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Template } from '../types';
import { Language } from '../lib/i18n';
import { Currency, formatPrice } from '../lib/currency';
import {
  X,
  CheckCircle2,
  ArrowLeft,
  Eye,
  ExternalLink,
  LogIn,
  User,
  Mail,
  Phone,
  Clock,
  Send,
  Palette,
  Calendar,
  Globe,
  MapPin,
} from 'lucide-react';
import { cosmicAudio } from '../lib/audio';

import type {
  AccountRecord,
  Appointment,
  CartItem,
  ClothingProduct,
  CompanyProfile,
  Course,
  Enrollment,
  FoodOrderItem,
  MenuItem,
  PhoneOrder,
  PhoneProduct,
  CarModel,
  SiteAccount,
  TestDriveBooking,
  ThemeColor,
  WatchOrder,
  WatchProduct,
} from '../data/sandboxDemoData';

import {
  COMPANY_PROFILES,
  PHONE_WARRANTY_IQD,
  SAMPLE_CARS,
  SAMPLE_PRODUCTS,
  SITE_IDENTITIES,
  SITE_NAV_ITEMS,
  STORE_NAV_ITEMS,
  THEME_COLOR_HEX,
  THEME_COLOR_LABEL_AR,
  WATCH_ENGRAVING_IQD,
  WATCH_ENGRAVING_MAX,
  WATCH_GIFT_WRAP_IQD,
} from '../data/sandboxDemoData';
import { ResponsivePreview, SiteMenuIcon, SiteTopBar, VIEWPORT_PRESETS } from './sandbox/SandboxChrome';
import { SiteAccountArea } from './sandbox/SiteAccountArea';
import type { ViewportChoice } from './sandbox/SandboxChrome';
import type { SandboxCtx } from './sandbox/context';
import { themeClassesFor } from './sandbox/context';
import { StoreDemo } from './sandbox/templates/StoreDemo';
import { CorporateDemo } from './sandbox/templates/CorporateDemo';
import { CarDealerDemo, monthlyInstalment } from './sandbox/templates/CarDealerDemo';
import { RealEstateDemo } from './sandbox/templates/RealEstateDemo';
import { HealthDemo } from './sandbox/templates/HealthDemo';
import { RestaurantDemo } from './sandbox/templates/RestaurantDemo';
import { EducationDemo } from './sandbox/templates/EducationDemo';
import { PhoneStoreDemo, storageLabel } from './sandbox/templates/PhoneStoreDemo';
import { WatchStoreDemo, engravingLabel } from './sandbox/templates/WatchStoreDemo';
import { FintechDemo } from './sandbox/templates/FintechDemo';

// Re-exported for callers that reach the palette through the sandbox (TemplateLivePage).
export type { ThemeColor };

interface TemplateInteractiveSandboxProps {
  template: Template;
  onClose: () => void;
  onSelectForContract: (template: Template, customNotes?: string, primaryColorHex?: string) => void;
  /**
   * Render only the template's own website — no NOVAIQ preview toolbar, device switcher or
   * price bar. This is the mode the device-frame iframes and the dedicated `?live=` tab use,
   * where the customer must be looking at a website and not at a preview tool.
   */
  chromeless?: boolean;
  /** Starting palette, so a frame opens on the colour the customer already picked outside it. */
  initialThemeColor?: ThemeColor;
  language?: Language;
  currency?: Currency;
}


export const TemplateInteractiveSandbox: React.FC<TemplateInteractiveSandboxProps> = ({
  template,
  onClose,
  onSelectForContract,
  chromeless = false,
  initialThemeColor,
  language = 'ar',
  currency = 'IQD',
}) => {
  // Declares "a template demo is on screen" for as long as this is mounted, which the cosmic
  // background reads to take itself out of the render tree entirely (see `html[data-demo]` in
  // index.css).
  //
  // A demo fills the viewport, so every layer of that background — two animating star fields,
  // the glow pair, the blurred photo — was being rendered underneath something completely
  // opaque. Not merely invisible: still animated, still composited, every frame, competing
  // with the very demo it was hidden behind. Set here rather than at either call site because
  // this component is what both of them mount: the standalone `?preview=` page and the modal
  // TemplateGrid opens, so declaring it once covers both and cannot fall out of step.
  useEffect(() => {
    document.documentElement.dataset.demo = 'true';
    return () => {
      delete document.documentElement.dataset.demo;
    };
  }, []);

  // The one place every price in this component should be formatted through — a language-
  // matched IQD label by default, converting to USD only if the customer explicitly chose it.
  const price = (amountIQD: number) => formatPrice(amountIQD, language, currency);
  // A handful of demo numbers (calculator ranges, subscription tiers, a mock wallet balance)
  // are pre-formatted flavor text rather than a real priced field, so they can't run through
  // price() for a true USD conversion — they still get the correct unit word per language.
  const CUR = language === 'ar' ? 'د.ع' : 'IQD';
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => {
    if (initialThemeColor) return initialThemeColor;
    try {
      return (localStorage.getItem('novaiq_sandbox_theme') as ThemeColor) || 'emerald';
    } catch {
      return 'emerald';
    }
  });
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const colorPickerRef = useRef<HTMLDivElement | null>(null);

  // Closes the color picker the moment the visitor's attention goes anywhere else — another
  // control, the demo content, another menu — rather than leaving it floating open until they
  // happen to hit the same toggle button again.
  useEffect(() => {
    if (!showColorPicker) return;
    const onPointerDown = (e: PointerEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showColorPicker]);

  const [viewport, setViewport] = useState<ViewportChoice>('full');

  // General Interactive States
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isSiteMenuOpen, setIsSiteMenuOpen] = useState<boolean>(false);

  // In-site account layer — every template gets a real sign-in page and a real account /
  // admin area, because that is what separates a landing-page mock-up from a website a
  // business could actually run on.
  const [authView, setAuthView] = useState<'site' | 'login' | 'account'>('site');
  const [account, setAccount] = useState<SiteAccount | null>(() => {
    try {
      const saved = localStorage.getItem('novaiq_sandbox_account');
      return saved ? (JSON.parse(saved) as SiteAccount) : null;
    } catch {
      return null;
    }
  });
  const [accountSection, setAccountSection] = useState<'overview' | 'records' | 'profile' | 'admin'>('overview');
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginPasswordVisible, setLoginPasswordVisible] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');

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
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [storeSort, setStoreSort] = useState<'default' | 'priceAsc' | 'priceDesc'>('default');
  const [isStoreSortOpen, setIsStoreSortOpen] = useState(false);
  const [storeSortMenuRect, setStoreSortMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const storeSortBtnRef = useRef<HTMLButtonElement>(null);
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

  // Car dealership demo state
  const [selectedCarId, setSelectedCarId] = useState<string>('car-1');
  const [downPaymentPct, setDownPaymentPct] = useState<number>(30);
  const [financeMonths, setFinanceMonths] = useState<number>(36);
  const [testDriveDate, setTestDriveDate] = useState<string>('2026-08-15');
  const [testDriveBookings, setTestDriveBookings] = useState<TestDriveBooking[]>(() => {
    try { return JSON.parse(localStorage.getItem('novaiq_sandbox_test_drives') || '[]'); } catch { return []; }
  });

  // Interactive demo states for other templates
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
  const [transfersLog, setTransfersLog] = useState<Array<{ id: string; amountIQD: number; date: string; recipient: string }>>(() => {
    try {
      const saved = localStorage.getItem('novaiq_sandbox_transfers');
      return saved ? JSON.parse(saved) : [
        { id: 'TX-98421', amountIQD: 500000, date: '2026-08-02', recipient: 'زين كاش - متجر بغداد' },
        { id: 'TX-98420', amountIQD: 150000, date: '2026-08-01', recipient: 'تحويل سريع - علي حسام' }
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

  // Mobile store demo state
  const [phoneOrders, setPhoneOrders] = useState<PhoneOrder[]>(() => {
    try { return JSON.parse(localStorage.getItem('novaiq_sandbox_phone_orders') || '[]'); } catch { return []; }
  });
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('phone-1');
  const [selectedStorageGb, setSelectedStorageGb] = useState<number>(256);
  const [selectedColor, setSelectedColor] = useState<string>('تيتانيوم طبيعي');
  const [phoneQuantity, setPhoneQuantity] = useState<number>(1);
  const [warranty, setWarranty] = useState<boolean>(false);

  // Watch store demo state
  const [watchOrders, setWatchOrders] = useState<WatchOrder[]>(() => {
    try { return JSON.parse(localStorage.getItem('novaiq_sandbox_watch_orders') || '[]'); } catch { return []; }
  });
  const [selectedWatchId, setSelectedWatchId] = useState<string>('watch-1');
  const [selectedStrapId, setSelectedStrapId] = useState<string>('leather-brown');
  const [engraving, setEngraving] = useState<string>('');
  const [giftWrap, setGiftWrap] = useState<boolean>(false);
  const [watchQuantity, setWatchQuantity] = useState<number>(1);

  // Persist per-template demo state locally so a returning customer's choices are remembered
  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_test_drives', JSON.stringify(testDriveBookings)); } catch { /* ignore */ }
  }, [testDriveBookings]);

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
    try { localStorage.setItem('novaiq_sandbox_phone_orders', JSON.stringify(phoneOrders)); } catch { /* ignore */ }
  }, [phoneOrders]);

  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_watch_orders', JSON.stringify(watchOrders)); } catch { /* ignore */ }
  }, [watchOrders]);

  // Persist Cart
  useEffect(() => {
    try {
      localStorage.setItem('novaiq_sandbox_cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    try { localStorage.setItem('novaiq_sandbox_account', account ? JSON.stringify(account) : ''); } catch { /* ignore */ }
  }, [account]);

  // A colour change outside a device frame is messaged into the frame instead of reloading
  // it, so the demo keeps its place — a filled cart, a half-finished booking — while the
  // palette swaps under it.
  useEffect(() => {
    if (!chromeless) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; color?: ThemeColor } | null;
      if (data?.type === 'novaiq:theme' && data.color) setThemeColor(data.color);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [chromeless]);

  // The device frames run the same site in an iframe on this origin, so both copies write to
  // the same localStorage. Re-reading on the `storage` event is what keeps them one site
  // rather than two: add something to the cart inside the phone frame, switch back to
  // "شاشتك", and it's still there. Returning `prev` on an identical payload matters — it
  // stops the two copies from bouncing writes back and forth forever.
  useEffect(() => {
    const syncFromStorage = <T,>(
      setter: React.Dispatch<React.SetStateAction<T>>,
      raw: string | null,
      fallback: T
    ) => {
      setter((prev) => {
        if (JSON.stringify(prev) === raw) return prev;
        try {
          return raw ? (JSON.parse(raw) as T) : fallback;
        } catch {
          return prev;
        }
      });
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith('novaiq_sandbox_')) return;
      switch (event.key) {
        case 'novaiq_sandbox_cart': syncFromStorage(setCart, event.newValue, [] as CartItem[]); break;
        case 'novaiq_sandbox_appointments': syncFromStorage(setAppointments, event.newValue, [] as Appointment[]); break;
        case 'novaiq_sandbox_food_order': syncFromStorage(setFoodOrder, event.newValue, [] as FoodOrderItem[]); break;
        case 'novaiq_sandbox_table_reservations': syncFromStorage(setTableReservations, event.newValue, [] as Array<{ id: string; guests: number; date: string; time: string }>); break;
        case 'novaiq_sandbox_enrollments': syncFromStorage(setEnrollments, event.newValue, [] as Enrollment[]); break;
        case 'novaiq_sandbox_phone_orders': syncFromStorage(setPhoneOrders, event.newValue, [] as PhoneOrder[]); break;
        case 'novaiq_sandbox_watch_orders': syncFromStorage(setWatchOrders, event.newValue, [] as WatchOrder[]); break;
        case 'novaiq_sandbox_property_visits': syncFromStorage(setPropertyVisits, event.newValue, [] as Array<{ id: string; propertyTitle: string; date: string; visitorName: string }>); break;
        case 'novaiq_sandbox_transfers': syncFromStorage(setTransfersLog, event.newValue, [] as Array<{ id: string; amountIQD: number; date: string; recipient: string }>); break;
        case 'novaiq_sandbox_test_drives': syncFromStorage(setTestDriveBookings, event.newValue, [] as TestDriveBooking[]); break;
        case 'novaiq_sandbox_account':
          setAccount((prev) => {
            const raw = event.newValue || '';
            if ((prev ? JSON.stringify(prev) : '') === raw) return prev;
            try {
              return raw ? (JSON.parse(raw) as SiteAccount) : null;
            } catch {
              return null;
            }
          });
          break;

        // Stored as bare strings rather than JSON, and each one feeds the customization
        // summary that travels into the contract — so they have to survive being changed
        // inside a device frame just like the list-shaped state above.
        case 'novaiq_sandbox_orgsize':
          if (event.newValue === 'medium' || event.newValue === 'large' || event.newValue === 'holding') setOrgSize(event.newValue);
          break;
        case 'novaiq_sandbox_property_filter':
          if (event.newValue) setSelectedPropertyFilter(event.newValue);
          break;

        default: break;
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
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
    } else if (template.id === 'NVQ-CARS-03') {
      const car = SAMPLE_CARS.find(c => c.id === selectedCarId) || SAMPLE_CARS[0];
      lines.push(`السيارة المختارة في حاسبة التقسيط: ${car.name} — دفعة أولى ${downPaymentPct}% على ${financeMonths} شهراً بقسط تقديري ${price(monthlyInstalment(car.priceIQD, downPaymentPct, financeMonths))}`);
      if (testDriveBookings.length > 0) {
        const b = testDriveBookings[0];
        lines.push(`قام العميل بتجربة حجز قيادة تجريبي: ${b.carName} بتاريخ ${b.date}`);
      }
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
    } else if (template.id === 'NVQ-PHONE-09' && phoneOrders.length > 0) {
      const last = phoneOrders[0];
      lines.push(`قام العميل بتجربة طلب هاتف: ${last.phoneName} — ${storageLabel(last.storageGb)} بلون ${last.color} (عدد ${last.quantity}${last.warranty ? '، مع كفالة سنة إضافية' : ''}) بتكلفة تقديرية ${price(last.totalIQD)}`);
    } else if (template.id === 'NVQ-WATCH-10' && watchOrders.length > 0) {
      const last = watchOrders[0];
      lines.push(`قام العميل بتجربة طلب ساعة: ${last.watchName} بسوار ${last.strap} (عدد ${last.quantity}، النقش: ${engravingLabel(last.engraving)}${last.giftWrap ? '، مع تغليف هدية' : ''}) بتكلفة تقديرية ${price(last.totalIQD)}`);
    }

    return lines.join('\n');
  };

  // Theme styling helpers
  const themeStyle = themeClassesFor(themeColor);

  // The site now always renders into a viewport that is genuinely its own — the customer's
  // real screen in "شاشتك", or the iframe's own 390/834/1280px viewport inside a device
  // frame — so `sm:`/`md:` media queries can finally be trusted. This tracks that same
  // width for the handful of layout decisions taken in JS rather than in CSS.
  const [isNarrowViewport, setIsNarrowViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    const handleResize = () => setIsNarrowViewport(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Escape closes the sections drawer — the one dismissal every visitor tries first.
  useEffect(() => {
    if (!isSiteMenuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSiteMenuOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSiteMenuOpen]);

  const gridCols = (mobileCols: string, wideCols: string) => isNarrowViewport ? mobileCols : `${mobileCols} ${wideCols}`;

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
        <div className={`pt-2 flex ${isNarrowViewport ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
          <button
            onClick={() => { setActiveTab(profile.primaryCta.tab); cosmicAudio.playPing(); }}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer`}
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
          <div className={`w-8 h-8 rounded-full ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} text-xs font-bold shrink-0`}>
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

  // Mobile store helpers. The warranty is priced per device, so it multiplies by quantity the
  // same way the handset does.
  const computePhoneTotal = (phone: PhoneProduct, storageGb: number, quantity: number, withWarranty: boolean) => {
    const tier = phone.storageTiers.find(t => t.gb === storageGb) || phone.storageTiers[0];
    const perUnit = tier.priceIQD + (withWarranty ? PHONE_WARRANTY_IQD : 0);
    return perUnit * quantity;
  };

  const confirmPhoneOrder = (phone: PhoneProduct) => {
    const tier = phone.storageTiers.find(t => t.gb === selectedStorageGb) || phone.storageTiers[0];
    const color = phone.colors.includes(selectedColor) ? selectedColor : phone.colors[0];
    setPhoneOrders(prev => [
      {
        id: `PLS-${Math.floor(10000 + Math.random() * 90000)}`,
        phoneName: phone.name,
        storageGb: tier.gb,
        color,
        quantity: phoneQuantity,
        warranty,
        totalIQD: computePhoneTotal(phone, tier.gb, phoneQuantity, warranty),
        date: new Date().toLocaleDateString('ar-IQ')
      },
      ...prev
    ]);
    cosmicAudio.playPing();
    setActiveTab('confirmation');
  };

  // Car dealership helper. The booking is what the shell reads for the account page, so it is
  // owned here rather than inside the demo.
  const bookTestDrive = (car: CarModel) => {
    setTestDriveBookings(prev => [
      {
        id: `TD-${Math.floor(1000 + Math.random() * 9000)}`,
        carName: car.name,
        date: testDriveDate,
        customerName,
        branch: 'بغداد - المنصور، شارع المعارض',
      },
      ...prev
    ]);
    cosmicAudio.playPing();
  };

  // Watch store helpers. The watch, its strap and the engraving are all priced per piece, so
  // they multiply by quantity; the gift box is one box for the order and does not.
  const computeWatchTotal = (watch: WatchProduct, strapId: string, quantity: number, engravingText: string, withGiftWrap: boolean) => {
    const strap = watch.straps.find(s => s.id === strapId) || watch.straps[0];
    const perUnit = watch.basePriceIQD + strap.extraIQD + (engravingText.trim() ? WATCH_ENGRAVING_IQD : 0);
    return perUnit * quantity + (withGiftWrap ? WATCH_GIFT_WRAP_IQD : 0);
  };

  const confirmWatchOrder = (watch: WatchProduct) => {
    const strap = watch.straps.find(s => s.id === selectedStrapId) || watch.straps[0];
    // Trimmed and re-clipped here rather than trusting the input's maxLength: the field can be
    // pasted into, and the caseback's limit is a physical one.
    const engravingText = engraving.trim().slice(0, WATCH_ENGRAVING_MAX);
    setWatchOrders(prev => [
      {
        id: `MRD-${Math.floor(10000 + Math.random() * 90000)}`,
        watchName: watch.name,
        strap: strap.label,
        engraving: engravingText,
        quantity: watchQuantity,
        giftWrap,
        totalIQD: computeWatchTotal(watch, strap.id, watchQuantity, engravingText, giftWrap),
        date: new Date().toLocaleDateString('ar-IQ')
      },
      ...prev
    ]);
    cosmicAudio.playPing();
    setActiveTab('confirmation');
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
      return (
        <StoreDemo
          ctx={ctx}
          addToCart={addToCart}
          cart={cart}
          customerCity={customerCity}
          customerName={customerName}
          customerPhone={customerPhone}
          handleCompleteOrder={handleCompleteOrder}
          isCartOpen={isCartOpen}
          isCheckoutOpen={isCheckoutOpen}
          isMobileSearchOpen={isMobileSearchOpen}
          isStoreSortOpen={isStoreSortOpen}
          modalColor={modalColor}
          modalQuantity={modalQuantity}
          modalSize={modalSize}
          orderConfirmedInvoice={orderConfirmedInvoice}
          paymentMethod={paymentMethod}
          renderSiteMenuButton={renderSiteMenuButton}
          selectedProductForModal={selectedProductForModal}
          setCustomerCity={setCustomerCity}
          setCustomerName={setCustomerName}
          setCustomerPhone={setCustomerPhone}
          setIsCartOpen={setIsCartOpen}
          setIsCheckoutOpen={setIsCheckoutOpen}
          setIsMobileSearchOpen={setIsMobileSearchOpen}
          setIsStoreSortOpen={setIsStoreSortOpen}
          setModalColor={setModalColor}
          setModalQuantity={setModalQuantity}
          setModalSize={setModalSize}
          setOrderConfirmedInvoice={setOrderConfirmedInvoice}
          setPaymentMethod={setPaymentMethod}
          setSelectedProductForModal={setSelectedProductForModal}
          setStoreSearch={setStoreSearch}
          setStoreSort={setStoreSort}
          setStoreSortMenuRect={setStoreSortMenuRect}
          storeCategory={storeCategory}
          storeSearch={storeSearch}
          storeSort={storeSort}
          storeSortBtnRef={storeSortBtnRef}
          storeSortMenuRect={storeSortMenuRect}
          totalCartCount={totalCartCount}
          totalCartIQD={totalCartIQD}
          updateCartQuantity={updateCartQuantity}
          viewport={viewport}
        />
      );
    }

    // Default or Corporate / SaaS / RealEstate / Health / Fintech template views
    switch (template.id) {
      case 'NVQ-CORP-01':
      case 'stella-corporate':
        return (
          <CorporateDemo
            ctx={ctx}
            corpDetail={corpDetail}
            orgSize={orgSize}
            setCorpDetail={setCorpDetail}
            setOrgSize={setOrgSize}
          />
        );

      case 'NVQ-CARS-03':
        return (
          <CarDealerDemo
            ctx={ctx}
            bookTestDrive={bookTestDrive}
            downPaymentPct={downPaymentPct}
            financeMonths={financeMonths}
            selectedCarId={selectedCarId}
            setDownPaymentPct={setDownPaymentPct}
            setFinanceMonths={setFinanceMonths}
            setSelectedCarId={setSelectedCarId}
            setTestDriveDate={setTestDriveDate}
            testDriveBookings={testDriveBookings}
            testDriveDate={testDriveDate}
          />
        );

      case 'NVQ-REAL-04':
      case 'pulsar-realestate':
        return (
          <RealEstateDemo
            ctx={ctx}
            bookingDate={bookingDate}
            propertyVisits={propertyVisits}
            selectedPropertyFilter={selectedPropertyFilter}
            selectedPropertyId={selectedPropertyId}
            setBookingDate={setBookingDate}
            setPropertyVisits={setPropertyVisits}
            setSelectedPropertyFilter={setSelectedPropertyFilter}
            setSelectedPropertyId={setSelectedPropertyId}
            setVisitorName={setVisitorName}
            visitorName={visitorName}
          />
        );

      case 'NVQ-HEALTH-05':
      case 'galaxy-health':
        return (
          <HealthDemo
            ctx={ctx}
            appointmentDate={appointmentDate}
            appointmentTime={appointmentTime}
            appointments={appointments}
            selectedDoctorId={selectedDoctorId}
            setAppointmentDate={setAppointmentDate}
            setAppointmentTime={setAppointmentTime}
            setAppointments={setAppointments}
            setSelectedDoctorId={setSelectedDoctorId}
          />
        );

      case 'NVQ-FOOD-07':
        return (
          <RestaurantDemo
            ctx={ctx}
            addFoodItem={addFoodItem}
            confirmTableReservation={confirmTableReservation}
            foodOrder={foodOrder}
            foodOrderTotalIQD={foodOrderTotalIQD}
            menuCategoryFilter={menuCategoryFilter}
            reservationDate={reservationDate}
            reservationGuests={reservationGuests}
            reservationTime={reservationTime}
            setMenuCategoryFilter={setMenuCategoryFilter}
            setReservationDate={setReservationDate}
            setReservationGuests={setReservationGuests}
            setReservationTime={setReservationTime}
            tableReservations={tableReservations}
            updateFoodItemQuantity={updateFoodItemQuantity}
          />
        );

      case 'NVQ-EDU-08':
        return (
          <EducationDemo
            ctx={ctx}
            confirmEnrollment={confirmEnrollment}
            courseCategoryFilter={courseCategoryFilter}
            enrollments={enrollments}
            selectedCourseId={selectedCourseId}
            setCourseCategoryFilter={setCourseCategoryFilter}
            setSelectedCourseId={setSelectedCourseId}
            setStudentNameInput={setStudentNameInput}
            studentNameInput={studentNameInput}
          />
        );

      case 'NVQ-PHONE-09':
        return (
          <PhoneStoreDemo
            ctx={ctx}
            computePhoneTotal={computePhoneTotal}
            confirmPhoneOrder={confirmPhoneOrder}
            phoneOrders={phoneOrders}
            phoneQuantity={phoneQuantity}
            selectedColor={selectedColor}
            selectedPhoneId={selectedPhoneId}
            selectedStorageGb={selectedStorageGb}
            setPhoneQuantity={setPhoneQuantity}
            setSelectedColor={setSelectedColor}
            setSelectedPhoneId={setSelectedPhoneId}
            setSelectedStorageGb={setSelectedStorageGb}
            setWarranty={setWarranty}
            warranty={warranty}
          />
        );

      case 'NVQ-WATCH-10':
        return (
          <WatchStoreDemo
            ctx={ctx}
            computeWatchTotal={computeWatchTotal}
            confirmWatchOrder={confirmWatchOrder}
            engraving={engraving}
            giftWrap={giftWrap}
            selectedStrapId={selectedStrapId}
            selectedWatchId={selectedWatchId}
            setEngraving={setEngraving}
            setGiftWrap={setGiftWrap}
            setSelectedStrapId={setSelectedStrapId}
            setSelectedWatchId={setSelectedWatchId}
            setWatchQuantity={setWatchQuantity}
            watchOrders={watchOrders}
            watchQuantity={watchQuantity}
          />
        );

      case 'NVQ-FINTECH-06':
      default:
        return (
          <FintechDemo
            ctx={ctx}
            setTransferAmount={setTransferAmount}
            setTransfersLog={setTransfersLog}
            setTwoFactorEnabled={setTwoFactorEnabled}
            transferAmount={transferAmount}
            transfersLog={transfersLog}
            twoFactorEnabled={twoFactorEnabled}
          />
        );
    }
  };

  // ---------------------------------------------------------------------------
  // Site chrome. Everything below is what every template shares as an actual
  // website rather than a landing page: a utility header with a working account
  // entry, a sign-in page, a customer + admin area built from the demo's own
  // data, and a footer. A client evaluating the design is looking for whether
  // their business could run on this — so the pages a business actually lives in
  // have to be there.
  // ---------------------------------------------------------------------------

  const siteIdentity = useMemo(() => {
    const profile = COMPANY_PROFILES[template.id];
    if (profile) return { name: profile.name, badge: profile.badge, contact: profile.contact };
    return (
      SITE_IDENTITIES[template.id] ?? {
        name: template.title,
        badge: template.categoryLabel,
        contact: {
          phone: '07700000000',
          email: 'info@novaiq.space',
          address: 'بغداد، العراق',
          hours: 'الأحد - الخميس، 9 صباحاً - 5 مساءً',
        },
      }
    );
  }, [template]);

  const recordsLabel = (() => {
    switch (template.id) {
      case 'NVQ-HEALTH-05': return 'مواعيدي';
      case 'NVQ-PHONE-09': return 'طلباتي';
      case 'NVQ-EDU-08': return 'دوراتي';
      case 'NVQ-WATCH-10': return 'طلباتي';
      case 'NVQ-FINTECH-06': return 'تحويلاتي';
      case 'NVQ-REAL-04': return 'معايناتي';
      case 'NVQ-CARS-03': return 'حجوزاتي';
      default: return 'طلباتي';
    }
  })();

  // What this template's visitors would actually be searching for. Naming the real thing
  // ("ابحث عن طبيب أو تخصص") rather than a generic "ابحث" is most of what makes each demo
  // read as its own business instead of one shell restyled ten times.
  const siteSearchPlaceholder = (() => {
    switch (template.id) {
      case 'NVQ-HEALTH-05': return 'ابحث عن طبيب أو تخصص';
      case 'NVQ-PHONE-09': return 'ابحث عن هاتف أو ماركة';
      case 'NVQ-EDU-08': return 'ابحث عن دورة أو مدرب';
      case 'NVQ-WATCH-10': return 'ابحث عن ساعة أو مقاس';
      case 'NVQ-FOOD-07': return 'ابحث في قائمة الطعام';
      case 'NVQ-REAL-04': return 'ابحث عن عقار أو منطقة';
      case 'NVQ-FINTECH-06': return 'ابحث عن عملية أو بطاقة';
      case 'NVQ-CARS-03': return 'ابحث عن سيارة أو موديل';
      case 'NVQ-CORP-01': return 'ابحث عن خدمة أو مشروع';
      default: return 'ابحث في الموقع';
    }
  })();

  // One box, one piece of state — each template reads it against its own list further down,
  // so a query typed in the clinic filters doctors while the same box in the hotel filters
  // rooms. The store keeps `storeSearch` since its filtering is bound up with sort/category.
  const [siteSearch, setSiteSearch] = useState('');

  // Typing then switching sections would otherwise leave a section filtered by a query the
  // visitor can no longer see the point of.
  useEffect(() => {
    setSiteSearch('');
  }, [activeTab]);

  const matchesSiteSearch = (...fields: Array<string | number | undefined | null>) => {
    const q = siteSearch.trim().toLowerCase();
    if (!q) return true;
    return fields.some((f) => String(f ?? '').toLowerCase().includes(q));
  };

  /** Shown in place of a list the visitor's query filtered down to nothing. */
  const renderNoSearchResults = (what: string) => (
    <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-center space-y-2">
      <p className="text-sm font-bold text-white">لا توجد نتائج مطابقة</p>
      <p className="text-[11px] text-slate-400">
        ما لقينا {what} يطابق «{siteSearch}». جرّب كلمة أخرى.
      </p>
      <button
        onClick={() => setSiteSearch('')}
        className="mt-1 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-bold text-white cursor-pointer transition-colors"
      >
        مسح البحث
      </button>
    </div>
  );

  // Built from the template's own live demo state, so whatever the visitor just did on the
  // site — filled a cart, booked a room, enrolled in a course — is what their account shows.
  const accountRecords: AccountRecord[] = (() => {
    if (template.id === 'NVQ-ECOM-02' || template.category === 'ecommerce') {
      return cart.map((item, i) => ({
        id: `ORD-${9400 + i}`,
        title: item.product.name,
        subtitle: `${item.selectedColor} · قياس ${item.selectedSize}`,
        meta: `الكمية: ${item.quantity}`,
        status: i === 0 ? 'قيد التجهيز' : 'بانتظار الشحن',
        amount: `${price((item.product.priceIQD * item.quantity))}`,
      }));
    }

    switch (template.id) {
      case 'NVQ-HEALTH-05':
        return appointments.map((a) => ({
          id: a.id, title: a.doctorName, subtitle: a.specialty,
          meta: `${a.date} — الساعة ${a.time}`, status: 'موعد مؤكد',
        }));

      case 'NVQ-FOOD-07':
        return [
          ...foodOrder.map((o, i) => ({
            id: `FO-${3100 + i}`, title: o.item.name, subtitle: 'طلب توصيل',
            meta: `الكمية: ${o.quantity}`, status: 'قيد التحضير في المطبخ',
            amount: `${price((o.item.priceIQD * o.quantity))}`,
          })),
          ...tableReservations.map((r) => ({
            id: r.id, title: `حجز طاولة لـ ${r.guests} أشخاص`, subtitle: 'حجز في الصالة',
            meta: `${r.date} — الساعة ${r.time}`, status: 'حجز مؤكد',
          })),
        ];

      case 'NVQ-EDU-08':
        return enrollments.map((e) => ({
          id: e.id, title: e.courseTitle, subtitle: `الطالب: ${e.studentName}`,
          meta: `تاريخ التسجيل: ${e.date}`, status: 'مسجّل ونشط',
        }));

      case 'NVQ-PHONE-09':
        return phoneOrders.map((o) => ({
          id: o.id, title: o.phoneName, subtitle: `${storageLabel(o.storageGb)} · ${o.color} · عدد ${o.quantity}`,
          meta: `تاريخ الطلب: ${o.date}`, status: o.warranty ? 'مؤكد — كفالة سنتان' : 'طلب مؤكد',
          amount: `${price(o.totalIQD)}`,
        }));

      case 'NVQ-WATCH-10':
        return watchOrders.map((o) => ({
          id: o.id, title: o.watchName, subtitle: `${o.strap} · ${engravingLabel(o.engraving)} · عدد ${o.quantity}`,
          meta: `تاريخ الطلب: ${o.date}`, status: o.giftWrap ? 'مؤكد — تغليف هدية' : 'طلب مؤكد',
          amount: `${price(o.totalIQD)}`,
        }));

      case 'NVQ-REAL-04':
        return propertyVisits.map((v) => ({
          id: v.id, title: v.propertyTitle, subtitle: `باسم: ${v.visitorName}`,
          meta: `موعد المعاينة: ${v.date}`, status: 'بانتظار تأكيد المكتب',
        }));

      case 'NVQ-FINTECH-06':
        return transfersLog.map((t) => ({
          id: t.id, title: t.recipient, subtitle: 'تحويل صادر',
          meta: t.date, status: 'تم التنفيذ', amount: price(t.amountIQD),
        }));

      case 'NVQ-CORP-01': {
        const sizeLabel = orgSize === 'medium' ? 'مؤسسة متوسطة' : orgSize === 'large' ? 'مؤسسة كبرى' : 'مجموعة قابضة';
        return [{
          id: 'REQ-4471', title: 'طلب عرض سعر للحلول المؤسسية', subtitle: sizeLabel,
          meta: 'قُدّم عبر حاسبة التكلفة', status: 'قيد المراجعة',
        }];
      }

      case 'NVQ-CARS-03':
        return testDriveBookings.map((b) => ({
          id: b.id, title: b.carName, subtitle: `الفرع: ${b.branch}`,
          meta: `موعد التجربة: ${b.date}`, status: 'بانتظار تأكيد المعرض',
        }));

      default:
        return [];
    }
  })();

  const handleSiteLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmail.trim().toLowerCase();
    if (!email.includes('@') || email.length < 6) {
      setLoginError('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }
    if (loginPassword.length < 4) {
      setLoginError('كلمة المرور يجب ألا تقل عن 4 أحرف.');
      return;
    }
    const role: SiteAccount['role'] = email.startsWith('admin') ? 'admin' : 'customer';
    setAccount({
      email,
      name: role === 'admin' ? 'مدير النظام' : email.split('@')[0] || 'زبون',
      role,
    });
    setAccountSection(role === 'admin' ? 'admin' : 'overview');
    setAuthView('account');
    setLoginError('');
    setLoginPassword('');
    cosmicAudio.playPing();
  };

  const handleSiteLogout = () => {
    setAccount(null);
    setAuthView('site');
    setActiveTab('home');
    cosmicAudio.playTick();
  };

  // The store browses by category, everything else by page — one menu, two sources of truth.
  const isStoreTemplate = template.id === 'NVQ-ECOM-02' || template.category === 'ecommerce';
  const siteNavItems = isStoreTemplate ? STORE_NAV_ITEMS : SITE_NAV_ITEMS[template.id] ?? [];
  const activeNavId = isStoreTemplate ? storeCategory : activeTab;

  const selectSiteNav = (id: string) => {
    if (isStoreTemplate) {
      setStoreCategory(id as 'all' | 'men' | 'women' | 'accessories');
    } else {
      setActiveTab(id);
    }
    setAuthView('site');
    setIsSiteMenuOpen(false);
    cosmicAudio.playTick();
  };

  const activeNavLabel = siteNavItems.find((item) => item.id === activeNavId)?.label ?? '';

  const renderSiteMenuButton = () => (
    <button
      onClick={() => { setIsSiteMenuOpen(true); cosmicAudio.playTick(); }}
      aria-label="فتح قائمة أقسام الموقع"
      aria-expanded={isSiteMenuOpen}
      className="site-menu-btn flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/25 text-white cursor-pointer transition-colors shrink-0 p-2.5 sm:px-3 sm:py-2"
    >
      <SiteMenuIcon />
      {/* Icon-only on mobile, same as the cart trigger — the full label crowded the
          centered logo next to it on narrow screens. */}
      <span className="hidden sm:inline text-[11px] font-bold whitespace-nowrap">
        {activeNavLabel || 'القائمة'}
      </span>
    </button>
  );

  /**
   * The store's cart sits in this slot; every other template gets the equivalent thing its own
   * business would put there — the clinic's appointments, the hotel's bookings — reusing
   * `recordsLabel` so the header and the account area can't drift apart into two names for the
   * same list.
   */
  const renderSiteRecordsButton = () => (
    <button
      onClick={() => {
        setAuthView(account ? 'account' : 'login');
        cosmicAudio.playTick();
      }}
      className={`relative px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/25 flex items-center gap-2.5 transition-all text-xs text-white font-extrabold cursor-pointer group shadow-lg ${isNarrowViewport ? '' : 'lg:px-3.5 lg:py-2'}`}
    >
      <User className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors shrink-0" />
      <span className={`hidden text-[11px] whitespace-nowrap ${isNarrowViewport ? '' : 'lg:inline'}`}>{recordsLabel}</span>
    </button>
  );

  /** One call per template so each header stays a single line at its own call site. */
  const renderSiteTopBar = (logoMark: React.ReactNode, logoName: string, logoNameLtr?: boolean) => (
    <SiteTopBar
      logoMark={logoMark}
      logoName={logoName}
      logoNameLtr={logoNameLtr}
      topLabel={template.title}
      logoMarkClass={`${themeStyle.primaryBg} ${themeStyle.onPrimary}`}
      searchValue={siteSearch}
      onSearchChange={setSiteSearch}
      searchPlaceholder={siteSearchPlaceholder}
      menuButton={renderSiteMenuButton()}
      actionSlot={renderSiteRecordsButton()}
      isNarrow={isNarrowViewport}
    />
  );

  // Everything the individual template demos (./sandbox/templates/*) share. Each demo used to
  // be a ~150-700 line branch inlined in this file's render switch, closing over whichever of
  // the ~60 state values it happened to need; passing this one object instead lets each demo
  // live in its own file that can be read and edited without opening this one.
  const ctx: SandboxCtx = {
    template,
    language,
    currency,
    CUR,
    price,
    themeStyle,
    gridCols,
    isNarrowViewport,
    activeTab,
    setActiveTab,
    account,
    renderCompanyHome,
    renderSiteTopBar,
    matchesSiteSearch,
    renderNoSearchResults,
  };

  const renderSiteDrawer = () => {
    if (!isSiteMenuOpen) return null;
    // Portaled to <body>: the scrollable preview pane above (renderLiveSite's ancestor) carries
    // backdrop-blur-sm, and any backdrop-filter/filter/transform on an ancestor makes it the
    // containing block for `fixed` descendants per the CSS spec — so without the portal, this
    // drawer's `fixed` was resolving against that scrolling pane's box instead of the real
    // viewport, and scrolled away with it instead of staying put like the site's own Navbar
    // drawer (which has no such ancestor). Same fix already used by the store demo's sort menu.
    return createPortal(
      <>
        <div
          onClick={() => setIsSiteMenuOpen(false)}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm animate-fade-in"
          aria-hidden="true"
        />
        <aside
          data-lenis-prevent
          className="site-drawer fixed inset-y-0 rtl:right-0 ltr:left-0 z-[61] w-72 max-w-[85vw] bg-slate-950 border-e border-white/10 shadow-2xl flex flex-col overflow-y-auto"
        >
          <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-9 h-9 rounded-xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} text-xs font-black shrink-0`}>
                {siteIdentity.name.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">{siteIdentity.name}</span>
                <span className="block text-[9px] text-slate-500 truncate">{siteIdentity.badge}</span>
              </span>
            </div>
            <button
              onClick={() => setIsSiteMenuOpen(false)}
              aria-label="إغلاق القائمة"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-3 space-y-1.5">
            <span className="block px-2 pb-1 text-[9px] font-bold text-slate-500 tracking-wider">أقسام الموقع</span>
            {siteNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => selectSiteNav(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  authView === 'site' && activeNavId === item.id
                    ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}`
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="truncate">{item.label}</span>
                {authView === 'site' && activeNavId === item.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
              </button>
            ))}
          </nav>

          <div className="p-3 mt-auto space-y-2 border-t border-white/10">
            <button
              onClick={() => {
                setAuthView(account ? 'account' : 'login');
                setIsSiteMenuOpen(false);
                cosmicAudio.playTick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                authView !== 'site'
                  ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}`
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {account ? <User className="w-3.5 h-3.5 shrink-0" /> : <LogIn className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{account ? `حسابي — ${account.name}` : 'تسجيل الدخول'}</span>
            </button>

            <ul className="space-y-1.5 px-1 pt-1 text-[10px] text-slate-500">
              <li className="flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0" /><span dir="ltr">{siteIdentity.contact.phone}</span></li>
              <li className="flex items-center gap-1.5"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{siteIdentity.contact.address}</span></li>
            </ul>
          </div>
        </aside>
      </>,
      document.body
    );
  };


  // The sign-in screen and the signed-in records area both live in ./sandbox/SiteAccountArea.
  const accountAreaProps = {
    account,
    accountRecords,
    accountSection,
    setAccountSection,
    setAuthView,
    handleSiteLogin,
    handleSiteLogout,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    loginPasswordVisible,
    setLoginPasswordVisible,
    loginError,
    setLoginError,
    recordsLabel,
    siteIdentity,
    themeStyle,
    gridCols,
    isNarrowViewport,
  };
  const renderLoginPage = () => <SiteAccountArea view="login" {...accountAreaProps} />;
  const renderAccountPage = () => <SiteAccountArea view="account" {...accountAreaProps} />;

  const renderSiteFooter = () => (
    <footer className="mt-6 pt-6 border-t border-white/10 space-y-5">
      <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-5`}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-lg ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} text-[11px] font-black`}>
              {siteIdentity.name.charAt(0)}
            </span>
            <span className="text-xs font-bold text-white">{siteIdentity.name}</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">{siteIdentity.badge}</p>
        </div>

        <div className="space-y-2">
          <h5 className="text-[11px] font-bold text-white">تواصل معنا</h5>
          <ul className="space-y-1.5 text-[10px] text-slate-400">
            <li className="flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0" /><span dir="ltr">{siteIdentity.contact.phone}</span></li>
            <li className="flex items-center gap-1.5"><Mail className="w-3 h-3 shrink-0" /><span dir="ltr" className="truncate">{siteIdentity.contact.email}</span></li>
            <li className="flex items-center gap-1.5"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{siteIdentity.contact.address}</span></li>
            <li className="flex items-center gap-1.5"><Clock className="w-3 h-3 shrink-0" /><span className="truncate">{siteIdentity.contact.hours}</span></li>
          </ul>
        </div>

        <div className="space-y-2">
          <h5 className="text-[11px] font-bold text-white">حسابك</h5>
          <ul className="space-y-1.5 text-[10px] text-slate-400">
            <li>
              <button
                onClick={() => setAuthView(account ? 'account' : 'login')}
                className="hover:text-white cursor-pointer transition-colors"
              >
                {account ? 'لوحة حسابي' : 'تسجيل الدخول'}
              </button>
            </li>
            <li><button onClick={() => setAuthView('site')} className="hover:text-white cursor-pointer transition-colors">الصفحة الرئيسية</button></li>
            <li><span className="hover:text-white cursor-pointer transition-colors">سياسة الخصوصية</span></li>
            <li><span className="hover:text-white cursor-pointer transition-colors">الشروط والأحكام</span></li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-white/5 text-[10px] text-slate-500">
        <span>© 2026 {siteIdentity.name} — جميع الحقوق محفوظة.</span>
        <span className="flex items-center gap-1.5">
          صُمّم وبُرمج بواسطة
          <span className="text-slate-300 font-black font-mono tracking-widest">NOVAIQ</span>
        </span>
      </div>
    </footer>
  );

  /** The template as a complete website: chrome, the page the visitor is on, and a footer.
   *  The drawer sits outside the spaced stack deliberately — as a child of it, opening the
   *  menu would add a `space-y` gap and nudge the whole page down. */
  const renderLiveSite = () => (
    <>
      {renderSiteDrawer()}
      <div className="space-y-4 sm:space-y-5">
        {authView === 'login'
          ? renderLoginPage()
          : authView === 'account'
          ? renderAccountPage()
          : renderInteractivePageContent()}
        {renderSiteFooter()}
      </div>
    </>
  );

  // A device frame runs this exact component inside an iframe on the same origin, and the
  // `?live=` tab loads it as a page of its own. In both cases none of the preview toolbar
  // belongs on screen — the customer is meant to be looking at a website.
  if (chromeless) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#05070c] text-slate-100">
        <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-10 py-3 sm:py-6 pb-16">
          {renderLiveSite()}
        </div>
      </div>
    );
  }

  const livePreviewSrc = `${window.location.pathname}?live=${encodeURIComponent(template.id)}&color=${themeColor}&name=${encodeURIComponent(template.title)}`;

  const openInNewTab = () => {
    // Deliberately no `noopener` here — same-origin, and the opened tab uses `window.opener`
    // to hand control back to (and close itself in favour of) this tab once the customer is
    // done previewing, instead of leaving two full copies of the app open at once.
    window.open(
      `${window.location.pathname}?live=${encodeURIComponent(template.id)}&color=${themeColor}&name=${encodeURIComponent(template.title)}`,
      '_blank'
    );
    cosmicAudio.playPing();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm text-zinc-100 flex flex-col w-full h-[100dvh] overflow-hidden animate-fade-in">

      {/* Preview toolbar */}
      <div className="py-2.5 px-3 sm:px-6 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0 z-30">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onClose}
            className="nq-btn nq-btn--solid p-2 sm:px-3 sm:py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0"
          >
            <span className="nq-btn-beam" aria-hidden="true" />
            <ArrowLeft className="w-4 h-4 ltr:rotate-180" />
            <span className="hidden sm:inline">العودة</span>
          </button>
        </div>

        {/* Center Color Picker & Viewport Switcher Controls */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Color Theme Selector Dropdown / Bar */}
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="nq-btn nq-btn--solid p-2 sm:px-3 sm:py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="تخصيص ألوان القالب المباشرة"
            >
              <span className="nq-btn-beam" aria-hidden="true" />
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px]">ألوان القالب</span>
            </button>

            {showColorPicker && (
              <div className="absolute top-11 right-0 z-50 bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl space-y-2 w-48 text-xs animate-fade-in">
                <span className="font-bold text-white block text-[11px]">اختر ثيم الألوان المفضل:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button 
                    onClick={() => changeThemeColor('emerald')}
                    className={`p-1.5 rounded-lg text-right font-semibold text-[11px] flex items-center justify-between cursor-pointer ${themeColor === 'emerald' ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500' : 'bg-black/30 backdrop-blur-sm text-slate-400'}`}
                  >
                    <span>زمردي</span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  </button>
                  <button 
                    onClick={() => changeThemeColor('purple')}
                    className={`p-1.5 rounded-lg text-right font-semibold text-[11px] flex items-center justify-between cursor-pointer ${themeColor === 'purple' ? 'bg-purple-900/60 text-purple-300 border border-purple-500' : 'bg-black/30 backdrop-blur-sm text-slate-400'}`}
                  >
                    <span>بنفسجي</span>
                    <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                  </button>
                  <button 
                    onClick={() => changeThemeColor('cyan')}
                    className={`p-1.5 rounded-lg text-right font-semibold text-[11px] flex items-center justify-between cursor-pointer ${themeColor === 'cyan' ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-500' : 'bg-black/30 backdrop-blur-sm text-slate-400'}`}
                  >
                    <span>سماوي</span>
                    <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block" />
                  </button>
                  <button 
                    onClick={() => changeThemeColor('amber')}
                    className={`p-1.5 rounded-lg text-right font-semibold text-[11px] flex items-center justify-between cursor-pointer ${themeColor === 'amber' ? 'bg-amber-900/60 text-amber-300 border border-amber-500' : 'bg-black/30 backdrop-blur-sm text-slate-400'}`}
                  >
                    <span>ذهبي</span>
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  </button>
                  <button 
                    onClick={() => changeThemeColor('rose')}
                    className={`p-1.5 rounded-lg text-right font-semibold text-[11px] flex items-center justify-between cursor-pointer ${themeColor === 'rose' ? 'bg-rose-900/60 text-rose-300 border border-rose-500' : 'bg-black/30 backdrop-blur-sm text-slate-400'}`}
                  >
                    <span>ياقوتي</span>
                    <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                  </button>
                  <button 
                    onClick={() => changeThemeColor('monochrome')}
                    className={`p-1.5 rounded-lg text-right font-semibold text-[11px] flex items-center justify-between cursor-pointer ${themeColor === 'monochrome' ? 'bg-zinc-800 text-white border border-white' : 'bg-black/30 backdrop-blur-sm text-slate-400'}`}
                  >
                    <span>رمادي</span>
                    <span className="w-3 h-3 rounded-full bg-white inline-block" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Viewport switcher. "شاشتك" is the visitor's own screen, rendered inline;
              the other three hand the site a real device viewport of its own. */}
          {/* Screen-width switcher. No device mock-ups — each choice simply lays the site out
              at that width so the customer can see how it reflows on their audience's screens. */}
          <div className={`ml-[5px] flex items-center gap-1 bg-black rounded-xl border border-zinc-800 ${isNarrowViewport ? 'p-0.5 text-[10px]' : 'p-1 text-xs'}`}>
            {([
              { key: 'full', label: 'شاشتك', title: 'العرض على شاشتك الحالية' },
              { key: 'desktop', label: 'كمبيوتر', title: 'عرض بعرض 1280 بكسل' },
              { key: 'tablet', label: 'تابلت', title: 'عرض بعرض 834 بكسل' },
              { key: 'mobile', label: 'جوال', title: 'عرض بعرض 390 بكسل' },
            ] as const).map(({ key, label, title }, idx) => (
              <React.Fragment key={key}>
                {idx > 0 && <span className="w-px h-4 bg-zinc-800 shrink-0" aria-hidden="true" />}
                <button
                  onClick={() => { setViewport(key); cosmicAudio.playTick(); }}
                  title={title}
                  className={`nq-btn rounded-lg cursor-pointer whitespace-nowrap ${isNarrowViewport ? 'px-1.5 py-1' : 'px-2.5 py-1 sm:py-1.5'} ${
                    viewport === key
                      ? 'nq-btn--solid font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="nq-btn-beam" aria-hidden="true" />
                  {label}
                </button>
              </React.Fragment>
            ))}
          </div>

          <button
            onClick={openInNewTab}
            title="فتح القالب في تبويب مستقل بأعلى جودة"
            className="nq-btn nq-btn--solid p-1.5 sm:px-3 sm:py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span className="nq-btn-beam" aria-hidden="true" />
            <Eye className="w-4 h-4" />
            <span className="hidden xl:inline">فتح كموقع مستقل</span>
            <ExternalLink className="w-3 h-3 hidden xl:inline" />
          </button>
        </div>
      </div>

      {/* The live site — inline at the visitor's own screen size, or pinned to a chosen width.
          Star layers sit on this outer, non-scrolling wrapper rather than inside the scrollable
          pane itself — as a descendant of an overflow-auto box they'd scroll away with the
          content instead of reading as a fixed backdrop the way CosmicBackground's do site-wide. */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        <div className="star-layer star-layer--far" />
        <div className="star-layer star-layer--near" />
        <div
          data-lenis-prevent
          className={`relative z-10 h-full w-full flex flex-col items-center justify-start p-2 sm:p-4 bg-black/30 backdrop-blur-sm ${
            viewport === 'full' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'
          }`}
        >
        {viewport === 'full' ? (
          <div className="w-full min-h-full bg-black/30 backdrop-blur-sm text-slate-100 p-3 sm:p-8 max-w-7xl mx-auto">
            {renderLiveSite()}
          </div>
        ) : (
          <ResponsivePreview
            width={VIEWPORT_PRESETS[viewport].width}
            src={livePreviewSrc}
            title={`معاينة حية: ${template.title}`}
            themeColor={themeColor}
          />
        )}
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="py-2.5 px-3 sm:px-6 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 z-20">
        <div className="text-center sm:text-right">
          <span className="text-[11px] text-zinc-400">التكلفة الأساسية للقالب: </span>
          <span className="text-sm sm:text-base font-bold text-white font-mono">
            {price(basePrice)}
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => onSelectForContract(template, buildCustomizationSummary(), THEME_COLOR_HEX[themeColor])}
            className="nq-btn nq-btn--solid flex-1 sm:flex-initial px-4 sm:px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="nq-btn-beam" aria-hidden="true" />
            <span>طلب واستخراج العقد</span>
            <ArrowLeft className="w-4 h-4 ltr:rotate-180" />
          </button>
        </div>
      </div>

    </div>
  );
};
