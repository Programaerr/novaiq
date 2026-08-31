import { getConsentStatus, CONSENT_EVENT, type ConsentStatus } from './consent';

/**
 * Google Analytics 4 (gtag.js) — تتبّع الزيارات وخطوات الزائر داخل الموقع.
 *
 * ## لماذا ليست لصقة index.html المعتادة
 * القصاصة الجاهزة من Google تحمّل gtag فوراً مع أول بايت من الصفحة. هذا الموقع يعرض شريط
 * موافقة كوكيز (CookieConsent.tsx)، وسياسة الخصوصية المنشورة تقول بالحرف: "إذا رفضت، يتوقف
 * أي تسجيل فوراً ولا تُرسل أي بيانات استخدام". تحميل gtag قبل الاختيار يجعل تلك الجملة
 * كذباً منشوراً على الموقع — وهي بالضبط الصفحة التي يراجعها مدقّق Google الآن. لذلك:
 * السكربت لا يُحمَّل إطلاقاً حتى يضغط الزائر "موافقة"، ويُعطَّل فوراً إن غيّر رأيه لاحقاً.
 *
 * ## ماذا يُرسَل
 * مشاهدات الصفحات (يدوياً، لأن التطبيق صفحة واحدة و?page= لا تولّد تحميلاً جديداً يلتقطه
 * gtag تلقائياً) + أحداث الخطوات الفعلية: فتح معاينة، بدء عقد، كل خطوة داخل العقد، إرسال
 * عقد، تسجيل دخول، إرسال رسالة تواصل.
 *
 * ## ما لا يُرسَل أبداً
 * لا بريد، لا هاتف، لا اسم شركة، لا اسم شخص، لا محتوى عقد. أحداث بمعرّفات ومقادير فقط —
 * إرسال بيانات تعريف شخصية إلى GA مخالف لشروط Google نفسها، لا مجرد خيار تصميمي.
 */

const MEASUREMENT_ID = 'G-H8YZB6DK8Q';
/** المفتاح الذي يفهمه gtag نفسه كإيقاف كامل للإرسال لهذا المُعرِّف. */
const DISABLE_KEY = `ga-disable-${MEASUREMENT_ID}`;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: string]: unknown;
  }
}

let scriptRequested = false;
let enabled = false;
/** آخر صفحة زارها الزائر، محفوظة حتى وهو غير موافق — لتُرسَل لحظة موافقته لا قبلها. */
let lastPage = '';

function gtag(...args: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

function loadScript() {
  if (scriptRequested) return;
  scriptRequested = true;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(s);

  gtag('js', new Date());
  // send_page_view: false لأن التطبيق صفحة واحدة: gtag كان سيسجّل مشاهدة واحدة عند التحميل
  // فقط، ثم لا شيء مهما تنقّل الزائر بين الصفحات. المشاهدات تُرسَل يدوياً من trackPageView.
  gtag('config', MEASUREMENT_ID, { send_page_view: false });
}

function applyConsent(status: ConsentStatus | null) {
  if (status === 'accepted') {
    window[DISABLE_KEY] = false;
    enabled = true;
    loadScript();
    // مشاهدة الصفحة التي هو واقف عليها الآن: بدونها تضيع أول صفحة لكل زائر وافق، لأن
    // trackPageView السابقة حدثت قبل الموافقة ولم تُرسَل.
    if (lastPage) trackPageView(lastPage);
    return;
  }

  // رفض (أو تراجع بعد موافقة): إيقاف الإرسال فوراً. السكربت لا يمكن إلغاء تحميله بعد نزوله،
  // لكن هذا المفتاح يجعله يتجاهل كل نداء لاحق — وهو ما يعتمد عليه gtag رسمياً.
  enabled = false;
  window[DISABLE_KEY] = true;
}

/** يُستدعى مرة واحدة عند إقلاع التطبيق. */
export function initAnalytics(): () => void {
  applyConsent(getConsentStatus());

  const onConsentChange = (e: Event) => {
    const detail = (e as CustomEvent<ConsentStatus>).detail;
    applyConsent(detail ?? getConsentStatus());
  };

  window.addEventListener(CONSENT_EVENT, onConsentChange);
  return () => window.removeEventListener(CONSENT_EVENT, onConsentChange);
}

/**
 * مشاهدة صفحة. `page` هو مفتاح الصفحة الداخلي (home / templates / custom-request …) لا
 * الرابط، لأنه ما يفهمه صاحب الموقع في تقرير GA بدل قراءة ?page= في كل سطر.
 */
export function trackPageView(page: string) {
  lastPage = page;
  if (!enabled) return;
  gtag('event', 'page_view', {
    page_title: page,
    page_location: window.location.href,
    page_path: page === 'home' ? '/' : `/?page=${page}`,
  });
}

/** حدث واحد. تُمرَّر معه معرّفات/مقادير فقط — راجع تحذير البيانات الشخصية أعلى الملف. */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!enabled) return;
  gtag('event', name, params || {});
}
