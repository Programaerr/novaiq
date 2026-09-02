/**
 * قراءة ملف شعار من جهاز المستخدم وإعادته data URL مصغَّراً ومضغوطاً.
 *
 * شعار يُرفع من هاتف قد يكون 4 ميغابايت و4000 بكسل عرضاً، بينما يُعرَض بارتفاع عشرات البكسلات.
 * رفعه كما هو يفجّر سقف مستند Firestore (ميغابايت واحد للمستند كله) ويجبر كل من يفتح الصفحة على
 * تنزيل ميغابايتات لصورة بحجم إبهام.
 *
 * WebP أولاً مع PNG احتياطاً: WebP أصغر بكثير عند نفس الجودة، و`toDataURL` يعيد PNG صامتاً لو لم
 * يكن النوع المطلوب مدعوماً — فيُفحَص الناتج بدل افتراض نجاحه.
 *
 * كانت هذه الدالة تعيش داخل ClientsStripCard وحده. خرجت إلى هنا حين احتاجها العقد أيضاً: نسخة
 * ثانية منها كانت ستعني سقفَي حجم مختلفين ومنطقَي ضغط يفترقان عند أول تعديل.
 */

/** شريط "أعمالنا": يُعرَض بارتفاع 44 بكسل، فـ360 عرضاً تكفي لأعلى كثافة شاشة. */
export const STRIP_LOGO_MAX_WIDTH = 360;

/** شعار العميل داخل العقد: يُطبع في وثيقة A4 عرضها 794 بكسل، وتُرسم بمضاعف 2 عند توليد الـPDF
 *  (انظر pdfGenerator) — فـ480 عرضاً تغطي أكبر قياس يظهر به فعلياً بلا هدر. */
export const CONTRACT_LOGO_MAX_WIDTH = 480;

/** سقف طول الـdata URL المقبول. المستند كله محدود بميغابايت، والعقد يحمل معه توقيعين وبنوداً
 *  ونصوص العميل — فما يُترك للشعار جزء منه لا كله. */
export const LOGO_MAX_DATA_URL = 400000;

export function compressLogoFile(file: File, maxWidth: number = STRIP_LOGO_MAX_WIDTH): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no canvas'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const webp = canvas.toDataURL('image/webp', 0.85);
        resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
