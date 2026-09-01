import { getConsentStatus, CONSENT_EVENT, type ConsentStatus } from './consent';

/**
 * Google Analytics 4 — الطبقة التي تجعل التتبّع يعني شيئاً في تطبيق صفحة واحدة.
 *
 * السكربت نفسه يُحمَّل من index.html + public/gtag-init.js بالطريقة الرسمية المعتادة، فيبدأ
 * التسجيل من أول بايت ولا يعتمد على أي كود React. هذا الملف يضيف فوقه ثلاثة أشياء لا يقدر
 * gtag وحده على أيٍّ منها:
 *
 *  1. مشاهدات الصفحات الداخلية. التنقّل هنا يغيّر `?page=` فقط بلا تحميل مستند جديد، وgtag
 *     يسجّل مشاهدة واحدة عند التحميل الأول لا غير — فبدون trackPageView كان كل زائر يظهر
 *     في التقرير وكأنه فتح صفحة واحدة ثم غادر مهما تصفّح.
 *  2. أحداث خطوات الزائر (فتح معاينة، بدء عقد، كل خطوة، توقيع، دخول، رسالة تواصل).
 *  3. تنفيذ "رفض" في شريط الكوكيز فوراً وبشكل دائم على ذلك الجهاز.
 *
 * ## ما لا يُرسَل أبداً
 * لا بريد، لا هاتف، لا اسم شركة أو شخص، لا محتوى عقد. معرّفات ومقادير فقط — إرسال بيانات
 * تعريف شخصية إلى GA مخالف لشروط Google نفسها، لا مجرد خيار تصميمي.
 */

const MEASUREMENT_ID = 'G-H8YZB6DK8Q';
/** المفتاح الذي يفهمه gtag.js نفسه كإيقاف كامل للإرسال لهذا المُعرِّف. */
const DISABLE_KEY = `ga-disable-${MEASUREMENT_ID}`;

declare global {
  interface Window {
    dataLayer?: unknown[];
    /** تُعرَّف في public/gtag-init.js، ويصل إليها هذا الملف بدل إعادة بنائها. */
    gtag?: (...args: unknown[]) => void;
    [key: string]: unknown;
  }
}

/** رفض صريح من الزائر. الافتراضي false: التتبّع شغّال ما لم يرفض، كما في أي موقع عادي. */
let optedOut = false;
/**
 * أول مشاهدة صفحة أرسلها gtag تلقائياً عند التحميل. إرسال واحدة أخرى من React لنفس الصفحة
 * كان سيضاعف عدد مشاهدات صفحة الهبوط لكل زائر — فأول نداء يُتجاهَل عمداً.
 */
let firstPageViewSkipped = false;

/* تُستدعى دالة gtag العالمية التي عرّفها public/gtag-init.js، لا نسخة ثانية منها: تلك تدفع
   كائن `arguments` إلى dataLayer وهو الشكل الذي يتوقّعه gtag.js بالضبط. بناء نسخة محلية
   تدفع مصفوفة عادية هو بالضبط النوع من الفروق الصامتة التي تجعل الأحداث "تُرسَل" ولا تظهر
   أبداً في التقارير. الاحتياط أدناه لحالة واحدة: مانع إعلانات حجب الملف، فلا شيء يعمل أصلاً. */
function gtag(...args: unknown[]) {
  if (typeof window.gtag === 'function') {
    window.gtag(...args);
    return;
  }
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

function applyConsent(status: ConsentStatus | null) {
  optedOut = status === 'rejected';
  // السكربت محمَّل مسبقاً ولا يمكن سحبه، لكن هذا المفتاح يجعله يتجاهل كل نداء لاحق — وهو
  // الآلية الرسمية التي توثّقها Google لإلغاء الاشتراك.
  window[DISABLE_KEY] = optedOut;
}

/** يُستدعى مرة واحدة عند إقلاع كل نقطة دخول (App.tsx و TemplateLivePage.tsx). */
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
  if (!firstPageViewSkipped) {
    firstPageViewSkipped = true;
    return;
  }
  if (optedOut) return;
  gtag('event', 'page_view', {
    page_title: page,
    page_location: window.location.href,
    page_path: page === 'home' ? '/' : `/?page=${page}`,
  });
}

/** حدث واحد. تُمرَّر معه معرّفات/مقادير فقط — راجع تحذير البيانات الشخصية أعلى الملف. */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (optedOut) return;
  gtag('event', name, params || {});
}
