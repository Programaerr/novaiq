import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Template } from '../types';
import { Language } from '../lib/i18n';
import { Currency, formatPrice } from '../lib/currency';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Globe,
  LogIn,
  Mail,
  MapPin,
  Palette,
  Phone,
  Smartphone,
  User,
  X,
} from 'lucide-react';
import { cosmicAudio } from '../lib/audio';
import { useDocumentFlag } from '../lib/useDocumentFlag';

import type { AccountRecord, SiteAccount, ThemeColor } from '../data/sandboxDemoData';
import { THEME_COLOR_HEX, THEME_COLOR_LABEL_AR } from '../data/sandboxDemoData';
import { SAKAN_IDENTITY, type RentalBooking } from '../data/rentalDemoData';
import { ResponsivePreview, SiteMenuIcon, SiteTopBar, VIEWPORT_PRESETS } from './sandbox/SandboxChrome';
import { SiteAccountArea } from './sandbox/SiteAccountArea';
import type { ViewportChoice } from './sandbox/SandboxChrome';
import { themeClassesFor } from './sandbox/context';
import { RentalSiteDemo, SITE_TABS } from './sandbox/rental/RentalSiteDemo';
import { RentalApp } from './sandbox/rental/RentalApp';
import { PhoneFrame } from './sandbox/rental/PhoneFrame';
import type { RentalCtx } from './sandbox/rental/rentalContext';
import { RENTAL_UNITS } from '../data/rentalDemoData';

// Re-exported for callers that reach the palette through the sandbox (TemplateLivePage).
export type { ThemeColor };

/**
 * The preview shell around the Sakan demo.
 *
 * It used to be a 1,700-line switch that could render any of eleven templates; the catalogue is
 * one template now, and the shell shrank to what one product actually needs. What it gained
 * instead is the thing this template is *for*: a **الموقع / التطبيق** switch. Both halves are
 * live and both are handed the same `bookings` array, so booking a unit in the app and then
 * switching to the website's account page shows the same booking — because there is only one.
 *
 * The device-width switcher stays, but only under الموقع. Under التطبيق it would be nonsense:
 * an app does not have a tablet layout, it has a phone, and the phone is drawn.
 */

interface TemplateInteractiveSandboxProps {
  template: Template;
  onClose: () => void;
  onSelectForContract: (template: Template, customNotes?: string, primaryColorHex?: string) => void;
  /**
   * Render only the demo itself — no NOVAIQ preview toolbar, device switcher or price bar. This
   * is the mode the device-frame iframe and the dedicated `?live=` tab use, where the customer
   * must be looking at a product and not at a preview tool.
   */
  chromeless?: boolean;
  /** Starting palette, so a frame opens on the colour the customer already picked outside it. */
  initialThemeColor?: ThemeColor;
  language?: Language;
  currency?: Currency;
}

type DemoMode = 'site' | 'app';

const BOOKINGS_KEY = 'novaiq_sandbox_rental_bookings';

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
  // index.css). A demo fills the viewport, so every layer of that background was being animated
  // and composited underneath something completely opaque.
  useDocumentFlag('demo');

  const price = (amountIQD: number) => formatPrice(amountIQD, language, currency);

  /* ── palette ──────────────────────────────────────────────────────────────────────────── */

  const [themeColor, setThemeColor] = useState<ThemeColor>(() => {
    if (initialThemeColor) return initialThemeColor;
    try {
      return (localStorage.getItem('novaiq_sandbox_theme') as ThemeColor) || 'emerald';
    } catch {
      return 'emerald';
    }
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement | null>(null);

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

  const changeThemeColor = (color: ThemeColor) => {
    setThemeColor(color);
    try {
      localStorage.setItem('novaiq_sandbox_theme', color);
    } catch {
      /* ignore */
    }
    cosmicAudio.playPing();
  };

  const themeStyle = themeClassesFor(themeColor);
  const accentHex = THEME_COLOR_HEX[themeColor];

  /* ── what is being previewed, and at what width ───────────────────────────────────────── */

  const [viewport, setViewport] = useState<ViewportChoice>('full');
  const [mode, setMode] = useState<DemoMode>(() => {
    try {
      return new URLSearchParams(window.location.search).get('mode') === 'app' ? 'app' : 'site';
    } catch {
      return 'site';
    }
  });

  const [activeTab, setActiveTab] = useState('home');
  const [siteSearch, setSiteSearch] = useState('');
  const [isSiteMenuOpen, setIsSiteMenuOpen] = useState(false);

  useEffect(() => {
    if (!isSiteMenuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSiteMenuOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSiteMenuOpen]);

  const [isNarrowViewport, setIsNarrowViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    const handleResize = () => setIsNarrowViewport(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ── the in-site account, and the one list of bookings both halves write to ───────────── */

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
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [bookings, setBookings] = useState<RentalBooking[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]') as RentalBooking[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    } catch {
      /* ignore */
    }
  }, [bookings]);

  useEffect(() => {
    try {
      localStorage.setItem('novaiq_sandbox_account', account ? JSON.stringify(account) : '');
    } catch {
      /* ignore */
    }
  }, [account]);

  // The device frame runs this same component in an iframe on this origin, so both copies write
  // to the same localStorage. Re-reading on `storage` is what keeps them ONE product rather than
  // two: book inside the phone frame, switch back to "شاشتك", and the booking is there.
  // Returning `prev` on an identical payload stops the two copies bouncing writes forever.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === BOOKINGS_KEY) {
        setBookings((prev) => {
          if (JSON.stringify(prev) === event.newValue) return prev;
          try {
            return event.newValue ? (JSON.parse(event.newValue) as RentalBooking[]) : [];
          } catch {
            return prev;
          }
        });
      } else if (event.key === 'novaiq_sandbox_account') {
        setAccount((prev) => {
          const raw = event.newValue || '';
          if ((prev ? JSON.stringify(prev) : '') === raw) return prev;
          try {
            return raw ? (JSON.parse(raw) as SiteAccount) : null;
          } catch {
            return null;
          }
        });
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // A colour change made outside a device frame is messaged into the frame rather than
  // reloading it, so the demo keeps its place — a half-finished booking survives the swap.
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

  const addBooking = (booking: Omit<RentalBooking, 'id'>) => {
    setBookings((prev) => [
      { ...booking, id: `SKN-${Math.floor(10000 + Math.random() * 90000)}` },
      ...prev,
    ]);
  };

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
      name: role === 'admin' ? 'مدير المجمع' : email.split('@')[0] || 'مستأجر',
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

  const openAccount = () => {
    setAuthView(account ? 'account' : 'login');
    setIsSiteMenuOpen(false);
    cosmicAudio.playTick();
  };

  const accountRecords: AccountRecord[] = bookings.map((b) => ({
    id: b.id,
    title: b.unitTitle,
    subtitle: `${b.unitCode} · ${b.duration} ${b.term === 'monthly' ? 'شهر' : 'ليلة'}`,
    meta: `يبدأ ${b.startDate} · من ${b.source === 'app' ? 'التطبيق' : 'الموقع'}`,
    status: b.status === 'confirmed' ? 'مؤكد' : 'قيد المراجعة',
    amount: price(b.totalIQD),
  }));

  /* ── what travels into the contract ───────────────────────────────────────────────────── */

  const buildCustomizationSummary = (): string => {
    const lines: string[] = [
      `لون الهوية البصرية المفضل من المعاينة الحية: ${THEME_COLOR_LABEL_AR[themeColor]}`,
      `الواجهة التي جرّبها العميل أخيراً: ${mode === 'app' ? 'التطبيق' : 'الموقع'}`,
    ];
    if (bookings.length > 0) {
      lines.push('حجوزات تجريبية نفّذها العميل داخل المعاينة:');
      bookings.slice(0, 4).forEach((b) => {
        lines.push(
          `- ${b.unitTitle} (${b.unitCode}) — ${b.duration} ${
            b.term === 'monthly' ? 'شهر' : 'ليلة'
          } من ${b.startDate}، بإجمالي ${price(b.totalIQD)} — من ${
            b.source === 'app' ? 'التطبيق' : 'الموقع'
          }`
        );
      });
    }
    return lines.join('\n');
  };

  /* ── what both halves are handed ──────────────────────────────────────────────────────── */

  const ctx: RentalCtx = useMemo(
    () => ({
      price,
      theme: themeStyle,
      accentHex,
      isNarrow: isNarrowViewport,
      account,
      bookings,
      book: addBooking,
      openAccount,
      units: RENTAL_UNITS,
    }),
    // `price` and the two callbacks close over state that is already listed; rebuilding the
    // object when any of these change is exactly what should happen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [themeStyle, accentHex, isNarrowViewport, account, bookings, language, currency]
  );

  /* ── site chrome ──────────────────────────────────────────────────────────────────────── */

  const renderSiteMenuButton = () => (
    <button
      onClick={() => {
        setIsSiteMenuOpen(true);
        cosmicAudio.playTick();
      }}
      aria-label="فتح قائمة أقسام الموقع"
      aria-expanded={isSiteMenuOpen}
      className="site-menu-btn flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/25 text-white cursor-pointer transition-colors shrink-0 p-2.5 sm:px-3 sm:py-2"
    >
      <SiteMenuIcon />
      <span className="hidden sm:inline text-[11px] font-bold whitespace-nowrap">
        {SITE_TABS.find((t) => t.id === activeTab)?.label ?? 'القائمة'}
      </span>
    </button>
  );

  const renderSiteRecordsButton = () => (
    <button
      onClick={openAccount}
      className={`relative px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/25 flex items-center gap-2.5 transition-all text-xs text-white font-extrabold cursor-pointer group shadow-lg ${
        isNarrowViewport ? '' : 'lg:px-3.5 lg:py-2'
      }`}
    >
      <User className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors shrink-0" />
      <span className={`hidden text-[11px] whitespace-nowrap ${isNarrowViewport ? '' : 'lg:inline'}`}>
        حجوزاتي
      </span>
      {bookings.length > 0 && (
        <span
          className="absolute -top-1.5 -left-1.5 min-w-5 h-5 px-1 grid place-items-center rounded-full text-[10px] font-black"
          style={{ background: accentHex, color: '#0b0f17' }}
        >
          {bookings.length}
        </span>
      )}
    </button>
  );

  const renderTopBar = () => (
    <SiteTopBar
      logoMark={<span className="text-sm font-black">س</span>}
      logoName={SAKAN_IDENTITY.name}
      topLabel={template.title}
      logoMarkClass={`${themeStyle.primaryBg} ${themeStyle.onPrimary}`}
      searchValue={siteSearch}
      onSearchChange={setSiteSearch}
      searchPlaceholder="ابحث عن شقة أو طابق"
      menuButton={renderSiteMenuButton()}
      actionSlot={renderSiteRecordsButton()}
      isNarrow={isNarrowViewport}
    />
  );

  const renderSiteDrawer = () => {
    if (!isSiteMenuOpen) return null;
    // Portaled to <body>: the scrollable preview pane above carries backdrop-blur, and any
    // backdrop-filter on an ancestor makes it the containing block for `fixed` descendants per
    // the CSS spec — without the portal this drawer resolves against that scrolling pane and
    // scrolls away with the content instead of staying put.
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
              <span
                className={`w-9 h-9 rounded-xl ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} text-xs font-black shrink-0`}
              >
                س
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">{SAKAN_IDENTITY.name}</span>
                <span className="block text-[9px] text-slate-500 truncate">{SAKAN_IDENTITY.badge}</span>
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
            {SITE_TABS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setAuthView('site');
                  setIsSiteMenuOpen(false);
                  cosmicAudio.playTick();
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  authView === 'site' && activeTab === item.id
                    ? `${themeStyle.primaryBg} ${themeStyle.onPrimary}`
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="truncate">{item.label}</span>
                {authView === 'site' && activeTab === item.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
              </button>
            ))}
          </nav>

          <div className="p-3 mt-auto space-y-2 border-t border-white/10">
            <button
              onClick={openAccount}
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
              <li className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 shrink-0" />
                <span dir="ltr">{SAKAN_IDENTITY.contact.phone}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{SAKAN_IDENTITY.contact.address}</span>
              </li>
            </ul>
          </div>
        </aside>
      </>,
      document.body
    );
  };

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
    recordsLabel: 'حجوزاتي',
    siteIdentity: SAKAN_IDENTITY,
    themeStyle,
    gridCols: (mobileCols: string, wideCols: string) =>
      isNarrowViewport ? mobileCols : `${mobileCols} ${wideCols}`,
    isNarrowViewport,
  };

  const renderSiteFooter = () => (
    <footer className="mt-6 pt-6 border-t border-white/10 space-y-5">
      <div className={`grid gap-5 ${isNarrowViewport ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-lg ${themeStyle.primaryBg} flex items-center justify-center ${themeStyle.onPrimary} text-[11px] font-black`}
            >
              س
            </span>
            <span className="text-xs font-bold text-white">{SAKAN_IDENTITY.name}</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">{SAKAN_IDENTITY.badge}</p>
        </div>

        <div className="space-y-2">
          <h5 className="text-[11px] font-bold text-white">تواصل معنا</h5>
          <ul className="space-y-1.5 text-[10px] text-slate-400">
            <li className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 shrink-0" />
              <span dir="ltr">{SAKAN_IDENTITY.contact.phone}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 shrink-0" />
              <span dir="ltr" className="truncate">{SAKAN_IDENTITY.contact.email}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{SAKAN_IDENTITY.contact.address}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 shrink-0" />
              <span className="truncate">{SAKAN_IDENTITY.contact.hours}</span>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h5 className="text-[11px] font-bold text-white">حسابك</h5>
          <ul className="space-y-1.5 text-[10px] text-slate-400">
            <li>
              <button onClick={openAccount} className="hover:text-white cursor-pointer transition-colors">
                {account ? 'لوحة حسابي' : 'تسجيل الدخول'}
              </button>
            </li>
            <li>
              <button
                onClick={() => setAuthView('site')}
                className="hover:text-white cursor-pointer transition-colors"
              >
                الصفحة الرئيسية
              </button>
            </li>
            <li><span className="hover:text-white cursor-pointer transition-colors">سياسة الخصوصية</span></li>
            <li><span className="hover:text-white cursor-pointer transition-colors">الشروط والأحكام</span></li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-white/5 text-[10px] text-slate-500">
        <span>© 2026 {SAKAN_IDENTITY.name} — جميع الحقوق محفوظة.</span>
        <span className="flex items-center gap-1.5">
          صُمّم وبُرمج بواسطة
          <span className="text-slate-300 font-black font-mono tracking-widest">NOVAIQ</span>
        </span>
      </div>
    </footer>
  );

  /** The template as a complete website. The drawer sits outside the spaced stack deliberately —
   *  as a child of it, opening the menu would add a `space-y` gap and nudge the page down. */
  const renderLiveSite = () => (
    <>
      {renderSiteDrawer()}
      <div className="space-y-4 sm:space-y-5">
        {authView === 'login' ? (
          <SiteAccountArea view="login" {...accountAreaProps} />
        ) : authView === 'account' ? (
          <SiteAccountArea view="account" {...accountAreaProps} />
        ) : (
          <RentalSiteDemo
            ctx={ctx}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            renderTopBar={renderTopBar}
            search={siteSearch}
          />
        )}
        {renderSiteFooter()}
      </div>
    </>
  );

  /* ── chromeless: the `?live=` tab and the device iframe ───────────────────────────────── */

  if (chromeless) {
    if (mode === 'app') {
      // The app on its own URL fills the screen rather than sitting in a drawn phone — on a real
      // phone the device frame would be a picture of a phone inside a phone.
      return (
        <div className="min-h-[100dvh] w-full bg-[#0b0f17] text-slate-100">
          <div className="relative mx-auto w-full max-w-[430px] min-h-[100dvh]">
            <RentalApp ctx={ctx} />
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-[100dvh] w-full bg-[#05070c] text-slate-100">
        <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-10 py-3 sm:py-6 pb-16">
          {renderLiveSite()}
        </div>
      </div>
    );
  }

  const liveHref = (forMode: DemoMode) =>
    `${window.location.pathname}?live=${encodeURIComponent(template.id)}&color=${themeColor}&mode=${forMode}&name=${encodeURIComponent(template.title)}`;

  const openInNewTab = () => {
    // Deliberately no `noopener` — same origin, and the opened tab uses `window.opener` to hand
    // control back to (and close itself in favour of) this tab once the customer is done.
    window.open(liveHref(mode), '_blank');
    cosmicAudio.playPing();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm text-zinc-100 flex flex-col w-full h-[100dvh] overflow-hidden animate-fade-in">
      {/* Preview toolbar */}
      <div className="py-2.5 px-3 sm:px-6 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0 z-30">
        <button
          onClick={onClose}
          className="nq-btn nq-btn--solid p-2 sm:px-3 sm:py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0"
        >
          <span className="nq-btn-beam" aria-hidden="true" />
          <ArrowLeft className="w-4 h-4 ltr:rotate-180" />
          <span className="hidden sm:inline">العودة</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* The switch this template exists for. It comes before the palette and the widths
              because it is not a view setting — it picks which of the two delivered products
              you are looking at. */}
          <div
            className={`flex items-center gap-1 bg-black rounded-xl border border-zinc-800 ${
              isNarrowViewport ? 'p-0.5 text-[10px]' : 'p-1 text-xs'
            }`}
          >
            {(
              [
                { key: 'site', label: 'الموقع', icon: Globe },
                { key: 'app', label: 'التطبيق', icon: Smartphone },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => {
                  setMode(key);
                  cosmicAudio.playTick();
                }}
                className={`nq-btn rounded-lg cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isNarrowViewport ? 'px-2 py-1' : 'px-3 py-1 sm:py-1.5'
                } ${mode === key ? 'nq-btn--solid font-bold' : 'text-zinc-400 hover:text-white'}`}
              >
                <span className="nq-btn-beam" aria-hidden="true" />
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

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
                  {(Object.keys(THEME_COLOR_LABEL_AR) as ThemeColor[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => changeThemeColor(key)}
                      className={`p-1.5 rounded-lg text-right font-semibold text-[11px] flex items-center justify-between cursor-pointer ${
                        themeColor === key
                          ? 'bg-white/10 text-white border border-white/40'
                          : 'bg-black/30 backdrop-blur-sm text-slate-400'
                      }`}
                    >
                      <span>{THEME_COLOR_LABEL_AR[key]}</span>
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ background: THEME_COLOR_HEX[key] }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Width switcher — website only. An app does not have a tablet layout; it has a
              phone, and the phone is drawn around it. */}
          {mode === 'site' && (
            <div
              className={`flex items-center gap-1 bg-black rounded-xl border border-zinc-800 ${
                isNarrowViewport ? 'p-0.5 text-[10px]' : 'p-1 text-xs'
              }`}
            >
              {(
                [
                  { key: 'full', label: 'شاشتك', title: 'العرض على شاشتك الحالية' },
                  { key: 'desktop', label: 'كمبيوتر', title: 'عرض بعرض 1280 بكسل' },
                  { key: 'tablet', label: 'تابلت', title: 'عرض بعرض 834 بكسل' },
                  { key: 'mobile', label: 'جوال', title: 'عرض بعرض 390 بكسل' },
                ] as const
              ).map(({ key, label, title }, idx) => (
                <React.Fragment key={key}>
                  {idx > 0 && <span className="w-px h-4 bg-zinc-800 shrink-0" aria-hidden="true" />}
                  <button
                    onClick={() => {
                      setViewport(key);
                      cosmicAudio.playTick();
                    }}
                    title={title}
                    className={`nq-btn rounded-lg cursor-pointer whitespace-nowrap ${
                      isNarrowViewport ? 'px-1.5 py-1' : 'px-2.5 py-1 sm:py-1.5'
                    } ${viewport === key ? 'nq-btn--solid font-bold' : 'text-zinc-400 hover:text-white'}`}
                  >
                    <span className="nq-btn-beam" aria-hidden="true" />
                    {label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}

          <button
            onClick={openInNewTab}
            title={mode === 'app' ? 'فتح التطبيق في تبويب مستقل' : 'فتح الموقع في تبويب مستقل'}
            className="nq-btn nq-btn--solid p-1.5 sm:px-3 sm:py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span className="nq-btn-beam" aria-hidden="true" />
            <Eye className="w-4 h-4" />
            <span className="hidden xl:inline">{mode === 'app' ? 'فتح كتطبيق مستقل' : 'فتح كموقع مستقل'}</span>
            <ExternalLink className="w-3 h-3 hidden xl:inline" />
          </button>
        </div>
      </div>

      {/* The stage. Flat black deliberately: a customer deciding whether they like a product
          should see it on a neutral ground, not floating over a drifting starfield that is
          competing for their eye and tinting their impression of the design. */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-black">
        <div
          data-lenis-prevent
          className={`relative z-10 h-full w-full flex flex-col items-center justify-start p-2 sm:p-4 ${
            mode === 'site' && viewport === 'full' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'
          }`}
        >
          {mode === 'app' ? (
            <PhoneFrame className="flex-1 min-h-0 w-full py-2">
              <RentalApp ctx={ctx} />
            </PhoneFrame>
          ) : viewport === 'full' ? (
            <div className="w-full min-h-full bg-black/30 backdrop-blur-sm text-slate-100 p-3 sm:p-8 max-w-7xl mx-auto">
              {renderLiveSite()}
            </div>
          ) : (
            <ResponsivePreview
              width={VIEWPORT_PRESETS[viewport].width}
              maxHeight={VIEWPORT_PRESETS[viewport].maxHeight}
              src={liveHref('site')}
              title={`معاينة حية: ${template.title}`}
              themeColor={themeColor}
            />
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="py-2.5 px-3 sm:px-6 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 z-20">
        <div className="text-center sm:text-right">
          <span className="text-[11px] text-zinc-400">التكلفة الأساسية للقالب: </span>
          <span className="text-sm sm:text-base font-bold text-white font-mono">
            {price(template.basePriceIQD || 0)}
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
