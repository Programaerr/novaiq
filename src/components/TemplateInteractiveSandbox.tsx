import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Template } from '../types';
import { Language } from '../lib/i18n';
import { Currency, formatPrice } from '../lib/currency';
import { PriceInput } from './PriceInput';
import {
  X,
  Smartphone,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  ExternalLink,
  LogIn,
  LogOut,
  User,
  Users,
  LayoutDashboard,
  Receipt,
  Bell,
  KeyRound,
  Mail,
  ShieldCheck,
  Lock,
  Phone,
  Clock,
  TrendingUp,
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
  MapPin,
  Terminal,
  ChevronDown
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
  HotelBooking,
  HotelRoom,
  MenuItem,
  Shipment,
  ShippingQuote,
  SiteAccount,
  ThemeColor,
} from '../data/sandboxDemoData';
import {
  COMPANY_PROFILES,
  SAMPLE_ATTENDANCE,
  SAMPLE_COURSES,
  SAMPLE_DOCTORS,
  SAMPLE_GRADES,
  SAMPLE_LAB_RESULTS,
  SAMPLE_MENU_ITEMS,
  SAMPLE_PRODUCTS,
  SAMPLE_ROOMS,
  SAMPLE_SHIPMENTS,
  SITE_IDENTITIES,
  SITE_NAV_ITEMS,
  STORE_NAV_ITEMS,
  STORE_SORT_OPTIONS,
  THEME_COLOR_HEX,
  THEME_COLOR_LABEL_AR,
} from '../data/sandboxDemoData';
import { ResponsivePreview, SiteMenuIcon, SiteTopBar, VIEWPORT_PRESETS } from './sandbox/SandboxChrome';
import type { ViewportChoice } from './sandbox/SandboxChrome';

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
        case 'novaiq_sandbox_hotel_bookings': syncFromStorage(setHotelBookings, event.newValue, [] as HotelBooking[]); break;
        case 'novaiq_sandbox_shipping_quotes': syncFromStorage(setSavedQuotes, event.newValue, [] as ShippingQuote[]); break;
        case 'novaiq_sandbox_property_visits': syncFromStorage(setPropertyVisits, event.newValue, [] as Array<{ id: string; propertyTitle: string; date: string; visitorName: string }>); break;
        case 'novaiq_sandbox_transfers': syncFromStorage(setTransfersLog, event.newValue, [] as Array<{ id: string; amountIQD: number; date: string; recipient: string }>); break;
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
        case 'novaiq_sandbox_plan':
          if (event.newValue === 'monthly' || event.newValue === 'yearly') setSelectedPlan(event.newValue);
          break;
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
      lines.push(`قام العميل بتجربة حجز غرفة: ${last.roomName} من ${last.checkIn} إلى ${last.checkOut} (${last.nights} ليالٍ) بتكلفة تقديرية ${price(last.totalIQD)}`);
    } else if (template.id === 'NVQ-LOG-10') {
      if (foundShipment) lines.push(`قام العميل بتجربة تتبع شحنة تجريبية: ${foundShipment.trackingNumber} (${foundShipment.status})`);
      if (savedQuotes.length > 0) {
        const q = savedQuotes[0];
        lines.push(`قام العميل بحساب عرض سعر شحن تجريبي: وزن ${q.weight} كغم لوجهة ${q.destination} بتكلفة تقديرية ${price(q.priceIQD)}`);
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
          gradient: 'from-purple-950/80 via-slate-900 to-slate-950',
          onPrimary: 'text-white'
        };
      case 'cyan':
        return {
          primaryBg: 'bg-cyan-600 hover:bg-cyan-500',
          primaryText: 'text-cyan-400',
          primaryBorder: 'border-cyan-500/40',
          badgeBg: 'bg-cyan-500/20 text-cyan-300',
          gradient: 'from-cyan-950/80 via-slate-900 to-slate-950',
          onPrimary: 'text-white'
        };
      case 'amber':
        return {
          primaryBg: 'bg-amber-600 hover:bg-amber-500',
          primaryText: 'text-amber-400',
          primaryBorder: 'border-amber-500/40',
          badgeBg: 'bg-amber-500/20 text-amber-300',
          gradient: 'from-amber-950/80 via-slate-900 to-slate-950',
          onPrimary: 'text-white'
        };
      case 'rose':
        return {
          primaryBg: 'bg-rose-600 hover:bg-rose-500',
          primaryText: 'text-rose-400',
          primaryBorder: 'border-rose-500/40',
          badgeBg: 'bg-rose-500/20 text-rose-300',
          gradient: 'from-rose-950/80 via-slate-900 to-slate-950',
          onPrimary: 'text-white'
        };
      case 'monochrome':
        return {
          primaryBg: 'bg-white hover:bg-zinc-200 text-black',
          primaryText: 'text-zinc-100',
          primaryBorder: 'border-zinc-400/40',
          badgeBg: 'bg-zinc-800 text-zinc-200',
          gradient: 'from-zinc-900 via-slate-950 to-black',
          // The other themes are all mid-tone (-600) backgrounds that read fine with the
          // hardcoded text-white/icon color used everywhere primaryBg is applied; monochrome
          // is the one theme whose primaryBg is actually white, so that same white
          // text/icon goes invisible on it unless call sites swap in onPrimary instead.
          onPrimary: 'text-black'
        };
      case 'emerald':
      default:
        return {
          primaryBg: 'bg-emerald-600 hover:bg-emerald-500',
          primaryText: 'text-emerald-400',
          primaryBorder: 'border-emerald-500/40',
          badgeBg: 'bg-emerald-500/20 text-emerald-300',
          gradient: 'from-emerald-950/80 via-slate-900 to-slate-950',
          onPrimary: 'text-white'
        };
    }
  };

  const themeStyle = getThemeClasses();

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
          <div className="sticky top-1 sm:top-2 z-30 mb-6 bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/20 select-none rounded-2xl overflow-hidden">
            <div className={`relative flex items-center justify-between gap-2 p-3 px-3 ${isNarrowViewport ? '' : 'sm:gap-4 sm:p-4 sm:px-6'}`}>
              {/* Right cluster: sections menu, then search, right next to each other. */}
              <div className="flex items-center gap-2 shrink-0">
              {renderSiteMenuButton()}

              {/* Search — on mobile this is a compact icon trigger matching the
                  cart's own style, same as it used to be a full input squeezed next to the
                  centered logo. Tapping it expands an input that takes over the whole row
                  (the "وسط"/centered placement asked for) instead of trying to fit a usable
                  text field into a slice of a 390px row alongside everything else. Desktop
                  keeps the plain always-visible input, capped in width so it doesn't fight
                  the absolutely centered logo for space the way an unconstrained flex-1
                  would. */}
              {isNarrowViewport ? (
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(true)}
                  aria-label="بحث"
                  className="flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/25 text-slate-300 cursor-pointer transition-colors shrink-0 p-2.5"
                >
                  <Search className="w-4 h-4" />
                </button>
              ) : (
                <div className="relative w-36 lg:w-56 shrink-0">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={e => setStoreSearch(e.target.value)}
                    placeholder="ابحث عن الموديلات"
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-800 transition-all"
                  />
                </div>
              )}

              {isNarrowViewport && isMobileSearchOpen && (
                <div className="absolute inset-0 z-10 flex items-center gap-2 px-3 bg-zinc-950/95 backdrop-blur-sm rounded-2xl animate-fade-in">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                    <input
                      autoFocus
                      type="text"
                      value={storeSearch}
                      onChange={e => setStoreSearch(e.target.value)}
                      placeholder="ابحث عن الموديلات"
                      className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-800 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileSearchOpen(false)}
                    aria-label="إغلاق البحث"
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white cursor-pointer transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              </div>

              {/* Center: Logo & Name — absolutely centered on the row's own midpoint
                  instead of sitting between the two side elements in normal flex flow,
                  since those two are different widths and justify-between only splits
                  the leftover space evenly, not the row itself, which pushed the logo
                  visibly off-center toward whichever side was narrower. */}
              <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-2 min-w-0 ${isNarrowViewport ? '' : 'sm:gap-3'}`}>
                <span className={`font-extrabold text-xs text-white tracking-wide whitespace-nowrap ${isNarrowViewport ? '' : 'sm:text-base'}`}>Logo</span>
                <div className={`navbar-logo-mark relative w-8 h-8 rounded-xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} shrink-0 shadow-lg ring-1 ring-white/20 ${isNarrowViewport ? '' : 'sm:w-11 sm:h-11 sm:rounded-2xl'}`}>
                  <ShoppingBag className={`w-4 h-4 ${isNarrowViewport ? '' : 'sm:w-5 sm:h-5'}`} />
                </div>
              </div>

              {/* Left cluster: cart, then sorting controls. Both this whole row and the
                  sort trigger stay reachable the entire time the customer scrolls — the
                  sticky wrapper around this whole card already pins it to the top of the
                  viewport, so nothing extra is needed here to keep sort "stuck" through
                  scroll; it was only ever un-stuck while it lived in the second, non-sticky
                  row below. */}
              <div className="flex items-center gap-2 shrink-0">
              {/* Interactive Shopify Cart Trigger */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => {
                    setIsCartOpen(true);
                    cosmicAudio.playTick();
                  }}
                  className={`relative px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/25 flex items-center gap-3 transition-all text-xs text-white font-extrabold cursor-pointer group shadow-lg ${isNarrowViewport ? '' : 'lg:px-3.5 lg:py-2 lg:gap-2.5'}`}
                >
                  <div className="relative shrink-0">
                    <ShoppingCart className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 transition-colors" />
                    {totalCartCount > 0 && (
                      <span className="absolute -top-2.5 -left-2.5 bg-rose-500 text-white text-[9px] font-mono font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-900 animate-pulse">
                        {totalCartCount}
                      </span>
                    )}
                  </div>

                  {/* Full label + price only from lg: up — at tablet widths (~834px) this
                      whole header row (sort, cart, logo, search, menu) is tight enough that
                      the full "حقيبة التسوق" text was overlapping the centered logo; icon +
                      badge (+ price once there's an lg: screen's worth of room) reads fine
                      without it. */}
                  <span className={`hidden text-[11px] whitespace-nowrap ${isNarrowViewport ? '' : 'lg:inline'}`}>حقيبة التسوق</span>
                  {totalCartIQD > 0 && !isNarrowViewport && (
                    <>
                      <span className="w-px h-3.5 bg-white/15 shrink-0 lg:hidden" />
                      <span className="font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[9px] whitespace-nowrap lg:px-2 lg:text-[10px]">
                        {price(totalCartIQD)}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Sorting controls — a custom dropdown instead of a native <select>: the
                  browser draws a native <select>'s open popup itself (plain OS list, blue
                  highlight), which CSS can't reach at all, so it always looks out of place
                  next to the rest of the site's glass styling. */}
              <div className="relative flex items-center gap-2 shrink-0">
                <button
                  ref={storeSortBtnRef}
                  type="button"
                  onClick={() => {
                    if (!isStoreSortOpen && storeSortBtnRef.current) {
                      const r = storeSortBtnRef.current.getBoundingClientRect();
                      const menuWidth = Math.max(r.width, 200);
                      // Clamp within the viewport instead of always anchoring off the
                      // trigger's own right edge — the trigger is icon-only and sits near
                      // the left edge on mobile now, so a fixed-right popup wider than the
                      // trigger itself was rendering mostly off-screen to the left.
                      const left = Math.min(Math.max(r.left, 8), window.innerWidth - menuWidth - 8);
                      setStoreSortMenuRect({ top: r.bottom + 6, left, width: r.width });
                    }
                    setIsStoreSortOpen((v) => !v);
                  }}
                  aria-haspopup="listbox"
                  aria-expanded={isStoreSortOpen}
                  aria-label="ترتيب الموديلات"
                  className="flex items-center justify-between gap-2.5 bg-black/30 backdrop-blur-sm border border-white/10 hover:border-white/25 text-slate-300 rounded-xl cursor-pointer transition-colors font-bold p-2.5 sm:px-3 sm:py-2"
                >
                  <Sliders className="w-3.5 h-3.5 shrink-0 sm:hidden" />
                  <span className="hidden sm:inline text-[10px]">{STORE_SORT_OPTIONS.find((o) => o.value === storeSort)?.label}</span>
                  <ChevronDown className={`hidden sm:block w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isStoreSortOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Portaled to <body> — the sticky store navbar above uses overflow-hidden
                    to keep its own rounded corners clean, which would otherwise clip this
                    popup instead of just letting it float over the page. */}
                {isStoreSortOpen && storeSortMenuRect && createPortal(
                  <>
                    <div className="fixed inset-0 z-[70]" onClick={() => setIsStoreSortOpen(false)} />
                    <div
                      role="listbox"
                      style={{ top: storeSortMenuRect.top, left: storeSortMenuRect.left, width: Math.max(storeSortMenuRect.width, 200) }}
                      className="fixed z-[71] rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/40 overflow-hidden animate-fade-in"
                    >
                      {STORE_SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={storeSort === opt.value}
                          onClick={() => {
                            setStoreSort(opt.value);
                            setIsStoreSortOpen(false);
                            cosmicAudio.playTick();
                          }}
                          className={`w-full text-right px-3 py-2.5 text-[10px] font-bold transition-colors cursor-pointer ${
                            storeSort === opt.value
                              ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}`
                              : 'text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>,
                  document.body
                )}
              </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2 lg:grid-cols-3')} gap-6`}>
            {sortedProducts.map((prod, prodIndex) => (
              <div
                key={prod.id}
                style={{ animation: 'card-in 0.35s ease-out both', animationDelay: `${prodIndex * 0.05}s` }}
                className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/25 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Thumbnail / Image Mock — the wave SVG overlaps the image's own bottom
                      edge, so only the top corners are rounded here; the wave itself reads
                      as the card's real bottom edge instead of a straight rectangular cut. */}
                  <div className="h-48 rounded-t-xl bg-black/30 backdrop-blur-sm border border-white/10 relative overflow-hidden group-hover:scale-[1.01] transition-all duration-300">
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
                    <svg
                      className="product-card-wave absolute -bottom-px left-0 w-full h-9 pointer-events-none"
                      viewBox="0 0 500 60"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path d="M0,30 C125,60 375,0 500,30 L500,60 L0,60 Z" fill="#09090b" />
                    </svg>
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
                    <h4 className="text-sm font-bold text-white leading-snug">{prod.name}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{prod.description}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                  <div>
                    <div className={`text-base font-bold font-mono ${themeStyle.primaryText}`}>
                      {price(prod.priceIQD)}
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setSelectedProductForModal(prod);
                      setModalColor(prod.colors[0]);
                      setModalSize(prod.sizes[0]);
                      setModalQuantity(1);
                    }}
                    className={`px-3.5 py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all`}
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
            <div data-lenis-prevent className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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
                            {price(selectedProductForModal.priceIQD)}
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
                                    ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-white scale-[1.03] shadow-md shadow-black/40` 
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
                                    ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-white scale-[1.03] shadow-md shadow-black/40` 
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
                      <div className="space-y-2 pt-1 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <label className="block text-slate-400 font-bold text-[11px]">الكمية المطلوبة:</label>
                          <span className="text-[11px] text-slate-500 font-bold">الحد الأقصى للشراء 10 قطع</span>
                        </div>
                        <div className="flex items-center gap-3 bg-black/30 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/10 w-fit">
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
                    <div className={`pt-4 border-t border-white/10 flex ${isNarrowViewport ? 'flex-col items-stretch' : 'flex-col sm:flex-row items-stretch sm:items-center'} justify-between gap-4`}>
                      <div>
                        <span className="text-slate-400 block text-[10px]">إجمالي التكلفة المباشرة:</span>
                        <span className={`text-base font-bold font-mono ${themeStyle.primaryText}`}>
                          {price((selectedProductForModal.priceIQD * modalQuantity))}
                        </span>
                      </div>

                      <button
                        onClick={() => addToCart(selectedProductForModal, modalColor, modalSize, modalQuantity)}
                        className={`px-6 py-3 rounded-2xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg`}
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
                    <div data-lenis-prevent className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                      {cart.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <h4 className="font-bold text-white">{item.product.name}</h4>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>اللون: {item.selectedColor}</span>
                              <span>القياس: {item.selectedSize}</span>
                            </div>
                            <div className={`font-mono font-bold ${themeStyle.primaryText}`}>
                              {price((item.product.priceIQD * item.quantity))}
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
                        <span className="font-mono text-white">{price(totalCartIQD)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>أجور التوصيل المباشر:</span>
                        <span className="text-emerald-400 font-bold">مجاني (عرض خاص)</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                        <span>الإجمالي الكلي:</span>
                        <span className={`font-mono ${themeStyle.primaryText}`}>{price(totalCartIQD)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        setIsCheckoutOpen(true);
                      }}
                      className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer flex items-center justify-center gap-2 shadow-lg`}
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
                          paymentMethod === 'cod' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-white` : 'bg-black/30 backdrop-blur-sm text-slate-400 border-white/10'
                        }`}
                      >
                        الدفع عند الاستلام
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('zaincash')}
                        className={`p-2.5 rounded-lg border text-center font-semibold cursor-pointer transition-all ${
                          paymentMethod === 'zaincash' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-white` : 'bg-black/30 backdrop-blur-sm text-slate-400 border-white/10'
                        }`}
                      >
                        زين كاش
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('mastercard')}
                        className={`p-2.5 rounded-lg border text-center font-semibold cursor-pointer transition-all ${
                          paymentMethod === 'mastercard' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-white` : 'bg-black/30 backdrop-blur-sm text-slate-400 border-white/10'
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
                        {price(totalCartIQD)}
                      </span>
                    </div>

                    <button
                      onClick={handleCompleteOrder}
                      className={`px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer hover:scale-[1.02] transition-transform`}
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

                <div className="space-y-2.5 text-xs bg-black/30 backdrop-blur-sm p-4 rounded-xl border border-white/10">
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
                      {price(orderConfirmedInvoice.totalIQD)}
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

            {renderSiteTopBar(<Building2 className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

            {/* Dynamic Body */}
            {activeTab === 'home' && (
              <div className="space-y-4 sm:space-y-6 animate-fade-in">
                <div className={`relative overflow-hidden p-6 sm:p-8 rounded-2xl bg-gradient-to-r ${themeStyle.gradient} backdrop-blur-sm border ${themeStyle.primaryBorder} text-center space-y-3 sm:space-y-4`}>
                  <div className={`w-14 h-14 mx-auto rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} shadow-lg ring-1 ring-white/20`}>
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
                  <div className={`pt-2 flex ${isNarrowViewport ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
                    <button onClick={() => setActiveTab('calculator')} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer shadow-lg`}>
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
                      <div className={`w-10 h-10 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} flex items-center justify-center shrink-0 shadow-md`}>
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
                          orgSize === opt.id ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} border-white shadow-md` : 'border-white/10 bg-white/5 backdrop-blur-sm text-slate-400 hover:text-white hover:border-white/25'
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
                    {orgSize === 'medium' ? `3,625,000 - 6,960,000 ${CUR}` : orgSize === 'large' ? `6,960,000 - 13,050,000 ${CUR}` : `13,050,000 - 26,100,000 ${CUR}`}
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
                <button onClick={() => alert('تم تسجيل الاستفسار التجريبي بنجاح في النظام!')} className={`w-full py-2.5 ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold rounded-lg cursor-pointer shadow-lg`}>
                  إرسال الاستفسار المباشر
                </button>
              </div>
            )}

            {/* Service / Project detail modal — clicking any card opens its full details
                instead of the grid being a static, non-interactive display. */}
            {corpDetail && (
              <div data-lenis-prevent className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => setCorpDetail(null)}>
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
                        <div className={`w-12 h-12 rounded-2xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} flex items-center justify-center shadow-lg`}>
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
                          className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer shadow-lg mt-2`}
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
                            className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer shadow-lg mt-2`}
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
          <div className="relative space-y-5 text-slate-100">
            {/* Circuit-board grid backdrop — a completely different world from the soft
                cosmic glows everywhere else: sharp, technical, terminal-flavored. */}
            <div
              className="pointer-events-none absolute inset-0 -z-10 opacity-40 select-none"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(16,185,129,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.12) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }}
              aria-hidden="true"
            />

            {/* Same bar as every other demo, but keeping this one's terminal prompt as its
                wordmark — the shell aesthetic is this template's whole pitch. */}
            {renderSiteTopBar(<Terminal className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, '~/Logo', true)}

            {techTab === 'home' && (
              <div className="space-y-4 sm:space-y-5 animate-fade-in">
                {/* Fake terminal window — macOS-style traffic-light chrome, then the pitch
                    rendered as command output with a blinking cursor at the end */}
                <div className="rounded-lg bg-black/70 backdrop-blur-xl border border-emerald-500/20 overflow-hidden shadow-xl">
                  <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-emerald-500/10 bg-white/[0.02]">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                    <span className="text-[10px] text-slate-500 font-mono mr-auto" dir="ltr">nebula — zsh</span>
                  </div>
                  <div className="p-5 sm:p-8 space-y-3 sm:space-y-4 text-center font-mono" dir="ltr">
                    <span className={`px-3 py-1 rounded ${themeStyle.badgeBg} text-[11px] font-semibold inline-block`}>
                      $ nebula --status
                    </span>
                    <h3 className="text-lg sm:text-2xl font-bold text-white leading-tight">
                      ابنِ وأطلق منتجك السحابي بسرعة الضوء
                    </h3>
                    <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                      بنية تحتية سحابية جاهزة، توثيق API تفاعلي، ولوحة قيادة حية لمنتجك الرقمي — كل ما تحتاجه شركتك التقنية لتنطلق دون تعقيد.
                      <span className="text-emerald-400 animate-pulse">▊</span>
                    </p>
                    <div className={`pt-2 flex ${isNarrowViewport ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
                      <button onClick={() => setActiveTab('pricing')} className={`w-full sm:w-auto px-5 py-2.5 rounded ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer`}>
                        شاهد خطط الأسعار
                      </button>
                      <button onClick={() => setActiveTab('docs')} className="w-full sm:w-auto px-5 py-2.5 rounded bg-black/40 border border-emerald-500/20 text-emerald-400 text-xs font-bold cursor-pointer hover:border-emerald-500/40">
                        استكشف توثيق API
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-2.5 text-center font-mono`}>
                  <div className="p-3.5 sm:p-4 rounded-md bg-black/40 backdrop-blur-md border-r-2 border border-emerald-500/30">
                    <div className={`text-lg sm:text-xl font-bold ${themeStyle.primaryText}`}>99.98%</div>
                    <div className="text-[11px] text-slate-500">معدل التشغيل السنوي</div>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-md bg-black/40 backdrop-blur-md border-r-2 border border-emerald-500/30">
                    <div className="text-lg sm:text-xl font-bold text-emerald-400">+40</div>
                    <div className="text-[11px] text-slate-500">شركة تستخدم المنصة</div>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-md bg-black/40 backdrop-blur-md border-r-2 border border-emerald-500/30">
                    <div className="text-lg sm:text-xl font-bold text-amber-400">&lt; 50ms</div>
                    <div className="text-[11px] text-slate-500">زمن استجابة API</div>
                  </div>
                </div>
              </div>
            )}

            {techTab === 'features' && (
              <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-3.5 animate-fade-in text-xs`}>
                {[
                  { icon: Cpu, title: 'نشر فوري بنقرة واحدة', desc: 'حزم كودك ونشره على بنية سحابية موزعة عالمياً خلال ثوانٍ، دون إعدادات خوادم معقدة.', tag: 'deploy.sh' },
                  { icon: Globe, title: 'قابلية توسع تلقائية', desc: 'يزداد عدد الخوادم تلقائياً مع ازدياد الطلب على منتجك، ويقل عند انخفاضه لتوفير التكلفة.', tag: 'autoscale.yml' },
                  { icon: Shield, title: 'أمان وتشفير من الطبقة الأولى', desc: 'تشفير كامل للبيانات أثناء النقل والتخزين، مع مراقبة أمنية استباقية على مدار الساعة.', tag: 'security.conf' },
                  { icon: Sliders, title: 'مراقبة الأداء اللحظي', desc: 'لوحة قيادة حية لمراقبة زمن الاستجابة، الأخطاء، واستهلاك الموارد لحظة بلحظة.', tag: 'monitor.ts' },
                ].map((f, idx) => {
                  const FeatureIcon = f.icon;
                  return (
                    <div key={idx} className="rounded-md bg-black/40 backdrop-blur-md border border-emerald-500/20 hover:border-emerald-500/40 transition-colors overflow-hidden">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-emerald-500/10 bg-white/[0.02]">
                        <FeatureIcon className={`w-3.5 h-3.5 ${themeStyle.primaryText}`} />
                        <span className="text-[10px] text-slate-500 font-mono" dir="ltr">{f.tag}</span>
                      </div>
                      <div className="p-4 space-y-1.5">
                        <h4 className="text-sm font-bold text-white">{f.title}</h4>
                        <p className="text-slate-400 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {techTab === 'docs' && (
              <div className="rounded-lg bg-black/40 backdrop-blur-md border border-emerald-500/20 overflow-hidden animate-fade-in text-xs">
                <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-emerald-500/10 bg-white/[0.02]">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-bold text-white">توثيق واجهة برمجة التطبيقات (API Reference)</span>
                </div>
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="p-4 rounded-md bg-black/60 border border-emerald-500/10 font-mono text-[11px] text-emerald-300 overflow-x-auto" dir="ltr">
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
                      <div key={idx} className="flex items-center gap-3 p-2.5 rounded bg-black/60 border border-emerald-500/10">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold shrink-0 ${ep.method === 'GET' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{ep.method}</span>
                        <span className="font-mono text-slate-300 shrink-0" dir="ltr">{ep.path}</span>
                        <span className="text-slate-500 truncate">{ep.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {techTab === 'pricing' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-center font-mono">
                  <div className="inline-flex flex-wrap justify-center p-1 rounded-md bg-black/40 border border-emerald-500/20 text-xs">
                    <button
                      onClick={() => setSelectedPlan('monthly')}
                      className={`px-3 sm:px-4 py-1.5 rounded cursor-pointer ${selectedPlan === 'monthly' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold` : 'text-slate-400'}`}
                    >
                      اشتراك شهري
                    </button>
                    <button
                      onClick={() => setSelectedPlan('yearly')}
                      className={`px-3 sm:px-4 py-1.5 rounded cursor-pointer ${selectedPlan === 'yearly' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold` : 'text-slate-400'}`}
                    >
                      اشتراك سنوي (خصم 20%)
                    </button>
                  </div>
                </div>

                <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-3`}>
                  <div className="p-4 rounded-md bg-black/40 backdrop-blur-md border border-emerald-500/20 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 font-mono" dir="ltr">## basic_plan</h4>
                    <div className={`text-base sm:text-lg font-bold ${themeStyle.primaryText} font-mono`}>
                      {selectedPlan === 'monthly'
                        ? (language === 'ar' ? '250,000 د.ع / شهرياً' : '250,000 IQD / month')
                        : (language === 'ar' ? '2,400,000 د.ع / سنوياً' : '2,400,000 IQD / year')}
                    </div>
                    <ul className="text-[11px] text-slate-400 space-y-1 font-mono">
                      <li>✔ ربط حتى 5 مستخدمين</li>
                      <li>✔ دعم فني عبر البريد</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-md bg-black/40 backdrop-blur-md border border-emerald-500/40 space-y-2 relative">
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-500 text-[10px] text-black font-bold font-mono">
                      الأكثر طلباً
                    </span>
                    <h4 className="text-xs font-bold text-white font-mono" dir="ltr">## pro_plan</h4>
                    <div className={`text-base sm:text-lg font-bold ${themeStyle.primaryText} font-mono`}>
                      {selectedPlan === 'monthly'
                        ? (language === 'ar' ? '600,000 د.ع / شهرياً' : '600,000 IQD / month')
                        : (language === 'ar' ? '5,800,000 د.ع / سنوياً' : '5,800,000 IQD / year')}
                    </div>
                    <ul className="text-[11px] text-slate-300 space-y-1 font-mono">
                      <li>✔ مستخدمين غير محدودين</li>
                      <li>✔ ربط حقيقي مع API</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {techTab === 'dashboard' && (
              <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-3')} gap-3 animate-fade-in text-xs font-mono`}>
                {[
                  { value: '128,430', label: 'استدعاء API اليوم' },
                  { value: '12', label: 'تكاملات نشطة' },
                  { value: '99.98%', label: 'معدل التشغيل' },
                ].map((stat, idx) => (
                  <div key={idx} className="text-center p-4 rounded-md bg-black/40 backdrop-blur-md border border-emerald-500/20">
                    <div className={`text-xl font-extrabold ${themeStyle.primaryText}`}>{stat.value}</div>
                    <div className="text-slate-500 mt-1">{stat.label}</div>
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
            {renderSiteTopBar(<Building2 className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

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
                  <div className={`pt-2 flex ${isNarrowViewport ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
                    <button onClick={() => setActiveTab('properties')} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer`}>
                      تصفح العقارات المتاحة
                    </button>
                    <button onClick={() => setActiveTab('agents')} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-slate-300 text-xs font-bold cursor-pointer">
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
                      selectedPropertyFilter === 'all' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}` : 'bg-black/30 backdrop-blur-sm text-slate-400 hover:text-white border border-white/10'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setSelectedPropertyFilter('villas')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      selectedPropertyFilter === 'villas' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}` : 'bg-black/30 backdrop-blur-sm text-slate-400 hover:text-white border border-white/10'
                    }`}
                  >
                    فلل فاخرة
                  </button>
                  <button
                    onClick={() => setSelectedPropertyFilter('apartments')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      selectedPropertyFilter === 'apartments' ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}` : 'bg-black/30 backdrop-blur-sm text-slate-400 hover:text-white border border-white/10'
                    }`}
                  >
                    شقق ومكاتب
                  </button>
                </div>

                <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2 lg:grid-cols-3')} gap-5`}>
                  {filteredProperties.map(prop => (
                    <div key={prop.id} className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-3 flex flex-col justify-between hover:border-white/25 hover:shadow-lg transition-all">
                      <div className="space-y-2">
                        <div className="h-40 rounded-xl overflow-hidden relative border border-white/10 bg-black/30 backdrop-blur-sm">
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

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block font-semibold">القيمة التقديرية:</span>
                          <span className="text-sm font-bold text-amber-400 font-mono block">
                            {price(prop.priceIQD)}
                          </span>
                        </div>

                        <button
                          onClick={() => { setSelectedPropertyId(prop.id); setActiveTab('booking'); cosmicAudio.playPing(); }}
                          className={`px-3 py-2 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer text-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all`}
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
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد طلب المعاينة</span>
                </button>

                {propertyVisits.length > 0 && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
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
                    <div className={`w-12 h-12 rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} font-bold text-lg shrink-0`}>
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
        const searchedDoctors = SAMPLE_DOCTORS.filter((d) => matchesSiteSearch(d.name, d.specialty));

        return (
          <div className="space-y-6 text-slate-100">
            {renderSiteTopBar(<Stethoscope className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

            {healthTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-HEALTH-05'])}

            {healthTab === 'doctors' && searchedDoctors.length === 0 && renderNoSearchResults('أي طبيب')}

            {healthTab === 'doctors' && searchedDoctors.length > 0 && (
              <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
                {searchedDoctors.map((doc) => (
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
                      className={`px-3 py-2 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer shrink-0`}
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
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد الحجز</span>
                </button>

                {appointments.length > 0 && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
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
                  className={`px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer`}
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
        const filteredMenu = (menuCategoryFilter === 'all' ? SAMPLE_MENU_ITEMS : SAMPLE_MENU_ITEMS.filter(m => m.category === menuCategoryFilter))
          .filter(m => matchesSiteSearch(m.name, m.description));

        return (
          <div className="space-y-6 text-slate-100">
            {renderSiteTopBar(<ChefHat className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

            {foodTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-FOOD-07'])}

            {foodTab === 'menu' && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="flex flex-wrap gap-2">
                  {(['all', 'appetizers', 'mains', 'desserts', 'drinks'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setMenuCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        menuCategoryFilter === cat ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}` : 'bg-white/5 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white'
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

                {filteredMenu.length === 0 && renderNoSearchResults('أي طبق')}

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
                          <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{price(item.priceIQD)}</span>
                          <button
                            onClick={() => addFoodItem(item)}
                            className={`px-3 py-1.5 rounded-lg ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center gap-1`}
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
                          <span className="text-slate-500 font-mono">{price(o.item.priceIQD)}</span>
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
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="font-bold text-white">الإجمالي:</span>
                      <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{price(foodOrderTotalIQD)}</span>
                    </div>
                    <button
                      onClick={() => alert('تم تأكيد طلبك التجريبي بنجاح! سيتم تحضيره فور تفعيل موقعك الفعلي.')}
                      className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer`}
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
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد الحجز</span>
                </button>

                {tableReservations.length > 0 && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
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
        const filteredCourses = (courseCategoryFilter === 'all' ? SAMPLE_COURSES : SAMPLE_COURSES.filter(c => c.category === courseCategoryFilter))
          .filter(c => matchesSiteSearch(c.title, c.instructor, c.level));

        return (
          <div className="space-y-6 text-slate-100">
            {renderSiteTopBar(<GraduationCap className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

            {eduTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-EDU-08'])}

            {eduTab === 'courses' && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="flex flex-wrap gap-2">
                  {(['all', 'programming', 'languages', 'business', 'design'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCourseCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        courseCategoryFilter === cat ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}` : 'bg-white/5 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white'
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

                {filteredCourses.length === 0 && renderNoSearchResults('أي دورة')}

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
                          <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{price(course.priceIQD)}</span>
                          <button
                            onClick={() => { setSelectedCourseId(course.id); setActiveTab('enroll'); cosmicAudio.playPing(); }}
                            className={`px-3 py-1.5 rounded-lg ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer`}
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
                  <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{price(selectedCourse.priceIQD)}</span>
                </div>
                <button
                  onClick={() => confirmEnrollment(selectedCourse)}
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
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
        const searchedRooms = SAMPLE_ROOMS.filter((r) => matchesSiteSearch(r.name, ...r.amenities));

        return (
          <div className="space-y-6 text-slate-100">
            {renderSiteTopBar(<Hotel className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

            {hotelTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-HOTEL-09'])}

            {hotelTab === 'rooms' && searchedRooms.length === 0 && renderNoSearchResults('أي غرفة')}

            {hotelTab === 'rooms' && searchedRooms.length > 0 && (
              <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-4 animate-fade-in text-xs`}>
                {searchedRooms.map((room) => (
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
                        <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{price(room.pricePerNightIQD)} / ليلة</span>
                        <button
                          onClick={() => { setSelectedRoomId(room.id); setActiveTab('booking'); cosmicAudio.playPing(); }}
                          className={`px-3 py-1.5 rounded-lg ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer`}
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

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="font-bold text-white">الإجمالي ({nightsPreview} ليالٍ):</span>
                  <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{price((nightsPreview * selectedRoom.pricePerNightIQD))}</span>
                </div>

                <button
                  onClick={() => confirmHotelBooking(selectedRoom)}
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center justify-center gap-2`}
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
                      <div className="flex justify-between pt-1.5 border-t border-white/10"><span className="text-slate-400">الإجمالي:</span><span className={`font-bold ${themeStyle.primaryText}`}>{price(latestBooking.totalIQD)}</span></div>
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
            {renderSiteTopBar(<Truck className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

            {logisticsTab === 'home' && renderCompanyHome(COMPANY_PROFILES['NVQ-LOG-10'])}

            {logisticsTab === 'tracking' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-4 animate-fade-in text-xs">
                {/* Header search feeds this tab rather than filtering a grid — a shipment is
                    looked up, not browsed, so matches are offered as one-tap picks that fill
                    the tracking field below. */}
                {siteSearch.trim() && (
                  <div className="space-y-2">
                    {SAMPLE_SHIPMENTS.filter((s) => matchesSiteSearch(s.trackingNumber, s.origin, s.destination, s.status)).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setTrackingInput(s.trackingNumber);
                          setFoundShipment(s);
                          setSiteSearch('');
                          cosmicAudio.playTick();
                        }}
                        className="w-full text-right p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 transition-colors cursor-pointer flex items-center justify-between gap-3"
                      >
                        <span className="font-mono font-bold text-white">{s.trackingNumber}</span>
                        <span className="text-[11px] text-slate-400 truncate">{s.origin} ← {s.destination}</span>
                      </button>
                    ))}
                    {SAMPLE_SHIPMENTS.filter((s) => matchesSiteSearch(s.trackingNumber, s.origin, s.destination, s.status)).length === 0 &&
                      renderNoSearchResults('أي شحنة')}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="مثال: CMX-77201"
                    className="flex-1 p-2.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 text-white font-mono"
                  />
                  <button onClick={trackShipment} className={`px-4 py-2.5 rounded-lg ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer flex items-center gap-1.5 shrink-0`}>
                    <Package className="w-3.5 h-3.5" />
                    <span>تتبع</span>
                  </button>
                </div>

                {foundShipment && (
                  <div className="pt-3 border-t border-white/10 space-y-3">
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
                            <span className="w-4 h-4 rounded-full border border-white/10 shrink-0" />
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
                          quoteDestination === dest ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}` : 'bg-black/30 backdrop-blur-sm border border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {dest === 'local' && 'محلي'}
                        {dest === 'regional' && 'إقليمي'}
                        {dest === 'international' && 'دولي'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="font-bold text-white">السعر التقديري:</span>
                  <span className={`font-mono font-bold text-base ${themeStyle.primaryText}`}>{price(computeShippingQuote())}</span>
                </div>
                <button
                  onClick={saveShippingQuote}
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer`}
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
            {renderSiteTopBar(<Wallet className={isNarrowViewport ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />, 'Logo')}

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
                  <div className={`pt-2 flex ${isNarrowViewport ? 'flex-col' : 'flex-col sm:flex-row'} justify-center gap-2.5`}>
                    <button onClick={() => setActiveTab('wallet')} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer`}>
                      افتح المحفظة الرقمية
                    </button>
                    <button onClick={() => setActiveTab('security')} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-slate-300 text-xs font-bold cursor-pointer">
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
                  <div className="bg-black/30 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-white/10">
                    <span className="text-xs text-slate-400 block mb-1">الرصيد الكلي المتوفر:</span>
                    <div className={`text-xl sm:text-2xl font-bold ${themeStyle.primaryText} font-mono`}>{`14,250,000 ${CUR}`}</div>
                  </div>
                  <div className="bg-black/30 backdrop-blur-sm p-3.5 sm:p-4 rounded-xl border border-white/10 flex flex-col justify-between space-y-2">
                    <span className="text-xs text-slate-400 block">آخر عملية تحويل:</span>
                    <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
                      <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'ar' ? 'تم استلام 500,000 د.ع' : 'Received 500,000 IQD'}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">رمز المعاملة: #TX-984211</span>
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 space-y-2.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Send className={`w-4 h-4 ${themeStyle.primaryText} shrink-0`} />
                    <span>محاكاة تحويل مالي سريع</span>
                  </h4>
                  <div className={`flex ${isNarrowViewport ? 'flex-col' : 'flex-col sm:flex-row'} gap-2`}>
                    <PriceInput
                      value={transferAmount}
                      onChange={setTransferAmount}
                      placeholder="المبلغ بالدينار"
                      className="flex-1 p-2.5 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 text-xs text-white font-mono"
                    />
                    <button
                      onClick={() => {
                        setTransfersLog(prev => [
                          { id: `TX-${Math.floor(10000 + Math.random() * 90000)}`, amountIQD: Number(transferAmount) || 0, date: new Date().toISOString().split('T')[0], recipient: 'تحويل سريع مباشر' },
                          ...prev
                        ]);
                        cosmicAudio.playPing();
                      }}
                      className={`w-full sm:w-auto px-4 py-2.5 ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold rounded-lg cursor-pointer shrink-0`}
                    >
                      تأكيد التحويل
                    </button>
                  </div>
                </div>

                {/* Transaction history log */}
                <div className="p-3.5 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 space-y-2 text-xs">
                  <span className="font-bold text-white block">سجل المعاملات السريعة:</span>
                  <div className="space-y-1.5">
                    {transfersLog.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-2 rounded bg-white/5 backdrop-blur-md text-[11px] border border-white/10">
                        <div>
                          <span className="text-white font-bold block">{tx.recipient}</span>
                          <span className="text-slate-500 text-[10px] font-mono">{tx.id} • {tx.date}</span>
                        </div>
                        <span className={`font-mono font-bold ${themeStyle.primaryText}`}>{price(tx.amountIQD)}</span>
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
                  className={`w-full py-3 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} font-bold cursor-pointer`}
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

  const siteHost = siteIdentity.contact.email.split('@')[1] || 'novaiq.space';
  const previewAddress = `https://${siteHost}`;

  const recordsLabel = (() => {
    switch (template.id) {
      case 'NVQ-HEALTH-05': return 'مواعيدي';
      case 'NVQ-HOTEL-09': return 'حجوزاتي';
      case 'NVQ-EDU-08': return 'دوراتي';
      case 'NVQ-LOG-10': return 'شحناتي';
      case 'NVQ-FINTECH-06': return 'تحويلاتي';
      case 'NVQ-REAL-04': return 'معايناتي';
      case 'NVQ-TECH-03': return 'اشتراكي';
      default: return 'طلباتي';
    }
  })();

  // What this template's visitors would actually be searching for. Naming the real thing
  // ("ابحث عن طبيب أو تخصص") rather than a generic "ابحث" is most of what makes each demo
  // read as its own business instead of one shell restyled ten times.
  const siteSearchPlaceholder = (() => {
    switch (template.id) {
      case 'NVQ-HEALTH-05': return 'ابحث عن طبيب أو تخصص';
      case 'NVQ-HOTEL-09': return 'ابحث عن غرفة أو جناح';
      case 'NVQ-EDU-08': return 'ابحث عن دورة أو مدرب';
      case 'NVQ-LOG-10': return 'ابحث برقم الشحنة';
      case 'NVQ-FOOD-07': return 'ابحث في قائمة الطعام';
      case 'NVQ-REAL-04': return 'ابحث عن عقار أو منطقة';
      case 'NVQ-FINTECH-06': return 'ابحث عن عملية أو بطاقة';
      case 'NVQ-TECH-03': return 'ابحث في الوثائق والمزايا';
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

      case 'NVQ-HOTEL-09':
        return hotelBookings.map((b) => ({
          id: b.id, title: b.roomName, subtitle: `${b.guests} نزلاء · ${b.nights} ليالٍ`,
          meta: `${b.checkIn} ← ${b.checkOut}`, status: 'حجز مؤكد',
          amount: `${price(b.totalIQD)}`,
        }));

      case 'NVQ-LOG-10':
        return savedQuotes.map((q) => ({
          id: q.id, title: `عرض شحن ${q.weight} كغم`,
          subtitle: q.destination === 'local' ? 'داخل المحافظة' : q.destination === 'regional' ? 'بين المحافظات' : 'شحن دولي',
          meta: 'عرض سعر محفوظ', status: 'صالح لمدة 7 أيام',
          amount: `${price(q.priceIQD)}`,
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

      case 'NVQ-TECH-03':
        return [{
          id: 'SUB-2210',
          title: selectedPlan === 'monthly' ? 'الخطة الاحترافية — اشتراك شهري' : 'الخطة الاحترافية — اشتراك سنوي',
          subtitle: 'مساحة عمل الإنتاج',
          meta: selectedPlan === 'monthly' ? 'يتجدد تلقائياً كل 30 يوماً' : 'يتجدد سنوياً بخصم 20%',
          status: 'اشتراك نشط',
        }];

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
      logoMarkClass={`${themeStyle.primaryBg} ${themeStyle.onPrimary}`}
      searchValue={siteSearch}
      onSearchChange={setSiteSearch}
      searchPlaceholder={siteSearchPlaceholder}
      menuButton={renderSiteMenuButton()}
      actionSlot={renderSiteRecordsButton()}
      isNarrow={isNarrowViewport}
    />
  );

  const renderSiteDrawer = () => {
    if (!isSiteMenuOpen) return null;
    return (
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
      </>
    );
  };


  const renderLoginPage = () => (
    <div className="animate-fade-in flex items-center justify-center py-6 sm:py-12">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center space-y-2">
          <div className={`w-12 h-12 mx-auto rounded-2xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} shadow-lg`}>
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-extrabold text-white">تسجيل الدخول إلى حسابك</h3>
          <p className="text-[11px] text-slate-400">بوابة العملاء الخاصة بـ {siteIdentity.name}</p>
        </div>

        <form onSubmit={handleSiteLogin} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-xl">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-300">البريد الإلكتروني</span>
            <span className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-black/40 border border-slate-700 focus-within:border-slate-500 transition-colors">
              <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }}
                placeholder="you@example.com"
                dir="ltr"
                className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600 min-w-0"
              />
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-300">كلمة المرور</span>
            <span className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-black/40 border border-slate-700 focus-within:border-slate-500 transition-colors">
              <KeyRound className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type={loginPasswordVisible ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                placeholder="••••••••"
                dir="ltr"
                className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600 min-w-0"
              />
              <button
                type="button"
                onClick={() => setLoginPasswordVisible((v) => !v)}
                className="text-slate-500 hover:text-slate-300 cursor-pointer shrink-0"
                title={loginPasswordVisible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {loginPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </span>
          </label>

          {loginError && (
            <p className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-xl px-3 py-2">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            className={`w-full py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>دخول آمن</span>
          </button>

          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-3 h-3 accent-slate-400 cursor-pointer" />
              <span>تذكّرني على هذا الجهاز</span>
            </label>
            <span className="hover:text-slate-300 cursor-pointer">نسيت كلمة المرور؟</span>
          </div>
        </form>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
          <span className="block text-[10px] text-slate-400">حسابات تجريبية جاهزة — اضغط لتعبئتها فوراً:</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setLoginEmail('customer@demo.iq'); setLoginPassword('123456'); setLoginError(''); }}
              className="px-2.5 py-2 rounded-xl bg-black/40 border border-slate-700 hover:border-slate-500 text-[10px] font-bold text-slate-300 cursor-pointer transition-colors"
            >
              حساب زبون
            </button>
            <button
              onClick={() => { setLoginEmail('admin@demo.iq'); setLoginPassword('123456'); setLoginError(''); }}
              className="px-2.5 py-2 rounded-xl bg-black/40 border border-slate-700 hover:border-slate-500 text-[10px] font-bold text-slate-300 cursor-pointer transition-colors"
            >
              حساب إدارة
            </button>
          </div>
        </div>

        <button
          onClick={() => { setAuthView('site'); setLoginError(''); }}
          className="w-full text-[11px] text-slate-400 hover:text-white cursor-pointer transition-colors"
        >
          العودة إلى الموقع
        </button>
      </div>
    </div>
  );

  const renderRecordCard = (record: AccountRecord) => (
    <div key={record.id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="text-xs font-bold text-white truncate">{record.title}</div>
          <div className="text-[10px] text-slate-400 truncate">{record.subtitle}</div>
        </div>
        <span className={`px-2 py-0.5 rounded-full ${themeStyle.badgeBg} text-[9px] font-bold shrink-0 whitespace-nowrap`}>
          {record.status}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[10px]">
        <span className="text-slate-500 font-mono truncate" dir="ltr">{record.id}</span>
        <span className="text-slate-400 truncate">{record.meta}</span>
        {record.amount && <span className={`font-mono font-bold shrink-0 ${themeStyle.primaryText}`}>{record.amount}</span>}
      </div>
    </div>
  );

  const renderAccountPage = () => {
    if (!account) return renderLoginPage();

    const navItems: Array<{ key: typeof accountSection; label: string; Icon: typeof User }> = [
      { key: 'overview', label: 'نظرة عامة', Icon: LayoutDashboard },
      { key: 'records', label: recordsLabel, Icon: Receipt },
      { key: 'profile', label: 'الملف الشخصي', Icon: User },
      ...(account.role === 'admin'
        ? [{ key: 'admin' as const, label: 'لوحة الإدارة', Icon: ShieldCheck }]
        : []),
    ];

    return (
      <div className="animate-fade-in space-y-4">
        <div className={`flex ${isNarrowViewport ? 'flex-col' : 'flex-col lg:flex-row'} gap-4`}>
          {/* In-site account navigation */}
          <aside className={`shrink-0 ${isNarrowViewport ? '' : 'lg:w-56'} space-y-3`}>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className={`w-10 h-10 rounded-full ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} text-sm font-black shrink-0`}>
                  {account.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{account.name}</div>
                  <div className="text-[10px] text-slate-500 truncate" dir="ltr">{account.email}</div>
                </div>
              </div>
              <span className={`inline-block px-2 py-0.5 rounded-full ${themeStyle.badgeBg} text-[9px] font-bold`}>
                {account.role === 'admin' ? 'صلاحيات إدارية' : 'حساب زبون'}
              </span>
            </div>

            <nav className={`grid ${isNarrowViewport ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-1'} gap-1.5`}>
              {navItems.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => { setAccountSection(key); cosmicAudio.playTick(); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors ${
                    accountSection === key
                      ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}`
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
              <button
                onClick={handleSiteLogout}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold cursor-pointer bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">تسجيل الخروج</span>
              </button>
            </nav>
          </aside>

          <div className="flex-1 min-w-0 space-y-4">
            {accountSection === 'overview' && (
              <div className="space-y-4">
                <div className={`p-5 rounded-2xl bg-gradient-to-r ${themeStyle.gradient} border ${themeStyle.primaryBorder} space-y-1`}>
                  <h3 className="text-base sm:text-lg font-extrabold text-white">أهلاً بك من جديد، {account.name}</h3>
                  <p className="text-[11px] text-slate-300">هذه لوحتك الخاصة داخل موقع {siteIdentity.name}.</p>
                </div>

                <div className={`grid ${gridCols('grid-cols-2', 'sm:grid-cols-3')} gap-3`}>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <div className={`text-lg font-extrabold font-mono ${themeStyle.primaryText}`}>{accountRecords.length}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{recordsLabel}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <div className={`text-lg font-extrabold font-mono ${themeStyle.primaryText}`}>
                      {accountRecords.filter((r) => r.amount).length}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">عمليات بقيمة مالية</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <div className="text-lg font-extrabold font-mono text-emerald-400">نشط</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">حالة الحساب</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">آخر النشاطات</h4>
                    <button
                      onClick={() => setAccountSection('records')}
                      className={`text-[10px] font-bold cursor-pointer ${themeStyle.primaryText}`}
                    >
                      عرض الكل
                    </button>
                  </div>
                  {accountRecords.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 border-dashed text-center space-y-1.5">
                      <p className="text-xs text-slate-300 font-bold">لا يوجد نشاط بعد</p>
                      <p className="text-[10px] text-slate-500">تصفّح الموقع وجرّب الطلب أو الحجز، وستظهر العملية هنا مباشرة.</p>
                    </div>
                  ) : (
                    <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-2.5`}>
                      {accountRecords.slice(0, 4).map(renderRecordCard)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {accountSection === 'records' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white">{recordsLabel}</h4>
                {accountRecords.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 border-dashed text-center space-y-1.5">
                    <p className="text-xs text-slate-300 font-bold">القائمة فارغة حالياً</p>
                    <p className="text-[10px] text-slate-500">كل عملية تنفّذها داخل الموقع تُسجّل هنا تلقائياً.</p>
                  </div>
                ) : (
                  <div className={`grid ${gridCols('grid-cols-1', 'sm:grid-cols-2')} gap-2.5`}>
                    {accountRecords.map(renderRecordCard)}
                  </div>
                )}
              </div>
            )}

            {accountSection === 'profile' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white">الملف الشخصي</h4>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  {[
                    { label: 'الاسم الكامل', value: account.name },
                    { label: 'البريد الإلكتروني', value: account.email, ltr: true },
                    { label: 'رقم الهاتف', value: siteIdentity.contact.phone, ltr: true },
                    { label: 'نوع الحساب', value: account.role === 'admin' ? 'حساب إداري' : 'حساب زبون' },
                  ].map((field) => (
                    <div key={field.label} className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-300">{field.label}</span>
                      <div
                        dir={field.ltr ? 'ltr' : undefined}
                        className="px-3 py-2.5 rounded-xl bg-black/40 border border-slate-700 text-xs text-white truncate"
                      >
                        {field.value}
                      </div>
                    </div>
                  ))}
                  <button className={`w-full py-2.5 rounded-xl ${themeStyle.primaryBg} ${themeStyle.onPrimary} text-xs font-bold cursor-pointer`}>
                    حفظ التعديلات
                  </button>
                </div>
              </div>
            )}

            {accountSection === 'admin' && account.role === 'admin' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${themeStyle.primaryText}`} />
                  <h4 className="text-sm font-bold text-white">لوحة إدارة {siteIdentity.name}</h4>
                </div>

                <div className={`grid ${gridCols('grid-cols-2', 'sm:grid-cols-4')} gap-3`}>
                  {[
                    { Icon: Receipt, value: String(accountRecords.length), label: 'سجلات نشطة' },
                    { Icon: Users, value: '1,284', label: 'مستخدم مسجّل' },
                    { Icon: TrendingUp, value: '+18%', label: 'نمو هذا الشهر' },
                    { Icon: Bell, value: '7', label: 'إشعارات جديدة' },
                  ].map((tile) => (
                    <div key={tile.label} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                      <tile.Icon className={`w-4 h-4 ${themeStyle.primaryText}`} />
                      <div className="text-lg font-extrabold font-mono text-white">{tile.value}</div>
                      <div className="text-[10px] text-slate-400">{tile.label}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">السجلات الواردة</span>
                    <span className="text-[10px] text-slate-500">تُحدَّث لحظياً</span>
                  </div>
                  {accountRecords.length === 0 ? (
                    <p className="p-6 text-center text-[11px] text-slate-500">لا توجد سجلات واردة بعد.</p>
                  ) : (
                    <div className="divide-y divide-slate-800">
                      {accountRecords.map((record) => (
                        <div key={record.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors">
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-white truncate">{record.title}</div>
                            <div className="text-[10px] text-slate-500 truncate font-mono" dir="ltr">{record.id}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {record.amount && <span className="text-[10px] font-mono text-slate-300 hidden sm:inline">{record.amount}</span>}
                            <span className={`px-2 py-0.5 rounded-full ${themeStyle.badgeBg} text-[9px] font-bold whitespace-nowrap`}>
                              {record.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  لوحة الإدارة تُبنى بالكامل حسب نشاط شركتك: صلاحيات متعددة للموظفين، تقارير، وتحكم كامل بالمحتوى والأسعار.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-300 ltr:rotate-180" />
            <span className="hidden sm:inline">العودة</span>
          </button>
          <div className="h-5 w-px bg-zinc-800 hidden sm:block shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[130px] sm:max-w-xs">
              موقع حي: {template.title}
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono truncate hidden sm:block" dir="ltr">{previewAddress}</p>
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
          <div className={`flex items-center gap-0.5 bg-black rounded-xl border border-zinc-800 ${isNarrowViewport ? 'p-0.5 text-[10px]' : 'p-1 text-xs'}`}>
            {([
              { key: 'full', label: 'شاشتك', title: 'العرض على شاشتك الحالية' },
              { key: 'desktop', label: 'كمبيوتر', title: 'عرض بعرض 1280 بكسل' },
              { key: 'tablet', label: 'تابلت', title: 'عرض بعرض 834 بكسل' },
              { key: 'mobile', label: 'جوال', title: 'عرض بعرض 390 بكسل' },
            ] as const).map(({ key, label, title }) => (
              <button
                key={key}
                onClick={() => { setViewport(key); cosmicAudio.playTick(); }}
                title={title}
                className={`rounded-lg transition-all cursor-pointer whitespace-nowrap ${isNarrowViewport ? 'px-1.5 py-1' : 'px-2.5 py-1 sm:py-1.5'} ${
                  viewport === key
                    ? 'bg-zinc-800 text-white font-bold border border-white glow-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={openInNewTab}
            title="فتح القالب في تبويب مستقل بأعلى جودة"
            className="p-1.5 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer glow-white-hover transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden xl:inline">فتح كموقع مستقل</span>
            <ExternalLink className="w-3 h-3 hidden xl:inline" />
          </button>
        </div>
      </div>

      {/* The live site — inline at the visitor's own screen size, or pinned to a chosen width. */}
      <div
        data-lenis-prevent
        className={`flex-1 min-h-0 w-full flex flex-col items-center justify-start p-2 sm:p-4 bg-black/30 backdrop-blur-sm ${
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
            className="flex-1 sm:flex-initial px-4 sm:px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold white-btn-glow flex items-center justify-center gap-1.5 cursor-pointer border border-white"
          >
            <span>طلب واستخراج العقد</span>
            <ArrowLeft className="w-4 h-4 text-black ltr:rotate-180" />
          </button>
        </div>
      </div>

    </div>
  );
};
