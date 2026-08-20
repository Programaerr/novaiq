import React from 'react';
import { ShieldCheck, Cookie, FileText, Scale, Mail, Database } from 'lucide-react';
import { Language } from '../lib/i18n';

interface PolicyPageProps {
  type: 'privacy' | 'terms';
  language: Language;
}

interface Section {
  icon: React.ComponentType<{ className?: string }>;
  title: { ar: string; en: string };
  body: { ar: string; en: string };
}

const PRIVACY_SECTIONS: Section[] = [
  {
    icon: Database,
    title: { ar: 'البيانات التي نجمعها', en: 'Data We Collect' },
    body: {
      ar: 'عند تعبئة طلب مشروع أو عقد إلكتروني، نجمع فقط ما تدخله بنفسك: اسم الشركة، رقم السجل التجاري، اسم الممثل المخول، البريد الإلكتروني، رقم الهاتف، الدولة والمدينة، القالب والمواصفات المختارة، وصورة توقيعك الرقمي. لا نجمع أي بيانات مالية أو بيانات دفع مباشرة عبر المنصة.',
      en: "When you submit a project request or digital contract, we only collect what you enter yourself: company name, commercial register number, authorized representative name, email, phone, country/city, selected template and specifications, and your digital signature image. We do not collect payment card data directly through the platform.",
    },
  },
  {
    icon: ShieldCheck,
    title: { ar: 'كيف نستخدم بياناتك', en: 'How We Use Your Data' },
    body: {
      ar: 'تُستخدم بياناتك حصرياً لتحضير مواصفات مشروعك، توليد وثيقة العقد، التواصل معك بخصوص التطوير والتسليم، وحفظ سجل طلباتك لتتمكن من مراجعتها لاحقاً من صفحة "طلباتي المحفوظة". لا نبيع أو نؤجر بياناتك لأي طرف ثالث.',
      en: 'Your data is used exclusively to prepare your project specification, generate the contract document, communicate with you about development and delivery, and keep a record of your requests so you can review them later from the "Saved Requests" page. We never sell or rent your data to third parties.',
    },
  },
  {
    icon: Database,
    title: { ar: 'أين تُحفظ بياناتك', en: 'Where Your Data Is Stored' },
    body: {
      ar: 'تُحفظ طلبات العقود على خوادم Firebase (منصة Google السحابية) بالإضافة إلى نسخة احتياطية محلية في متصفحك (localStorage) لضمان عدم فقدان عملك أثناء التعبئة. يمكنك حذف أي طلب نهائياً في أي وقت من صفحة "طلباتي المحفوظة".',
      en: 'Contract requests are stored on Firebase (Google Cloud) servers, plus a local backup in your browser (localStorage) so your work isn\'t lost while filling the form. You can permanently delete any request at any time from the "Saved Requests" page.',
    },
  },
  {
    icon: Cookie,
    title: { ar: 'الكوكيز والتخزين المحلي', en: 'Cookies & Local Storage' },
    body: {
      ar: 'نستخدم التخزين المحلي في متصفحك لحفظ تفضيلاتك (اللغة، ألوان معاينة القوالب) وقرارك بشأن الموافقة على التتبع. بعض معاينات القوالب التفاعلية (مثل نموذج متجر إلكتروني تجريبي) تحفظ تفاعلك التجريبي محلياً في متصفحك فقط لغرض التوضيح — لا تتم أي عملية شراء أو دفع حقيقية عبر هذه المعاينات، ولا تُرسل هذه البيانات التجريبية إلى خوادمنا. إذا وافقت على التتبع، نسجل زيارات مجهولة الهوية للصفحات لفهم استخدام المنصة وتحسينها فقط؛ وإذا رفضت، يتوقف أي تسجيل فوراً ولا يتم إرسال أي بيانات استخدام.',
      en: "We use browser local storage to remember your preferences (language, template preview colors) and your tracking consent choice. Some interactive template previews (such as a demo online store) save your trial interactions locally in your browser purely for demonstration purposes — no real purchase or payment ever occurs through these previews, and this demo data is never sent to our servers. If you accept tracking, we log anonymous page visits solely to understand and improve platform usage; if you reject it, logging stops immediately and no usage data is sent.",
    },
  },
  {
    icon: Mail,
    title: { ar: 'حقوقك والتواصل معنا', en: 'Your Rights & Contact' },
    body: {
      // No email address here until one genuinely exists. A privacy policy that names an inbox
      // nobody reads is worse than one that points at the channels we actually answer on.
      ar: 'يحق لك الاطلاع على بياناتك المحفوظة أو طلب حذفها بالكامل في أي وقت. لأي استفسار يخص خصوصيتك، تواصل معنا عبر قنوات التواصل الموضّحة في أسفل الموقع.',
      en: 'You have the right to review your saved data or request its complete deletion at any time. For any privacy inquiry, reach us through the contact channels listed in the site footer.',
    },
  },
];

const TERMS_SECTIONS: Section[] = [
  {
    icon: FileText,
    title: { ar: 'طبيعة الخدمة', en: 'Nature of the Service' },
    body: {
      ar: 'توفر NOVAIQ قوالب برمجية جاهزة قابلة للتخصيص، بالإضافة إلى خدمات تطوير مخصص للمواقع والتطبيقات. تُعتبر الأسعار المعروضة تقديرية حتى يتم تأكيد المواصفات النهائية وتوقيع العقد الإلكتروني.',
      en: 'NOVAIQ provides customizable ready-made software templates as well as custom web and application development services. Displayed prices are estimates until final specifications are confirmed and the digital contract is signed.',
    },
  },
  {
    icon: Scale,
    title: { ar: 'الدفع ومدة التسليم', en: 'Payment & Delivery Timeline' },
    body: {
      ar: 'تُحدَّد خطة الدفع (50% مقدماً و50% عند التسليم، أو دفعة كاملة مع خصم خاص، أو 3 دفعات على مراحل موثقة) عند إنشاء العقد. تختلف مدة التسليم التقديرية باختلاف القالب أو نطاق المشروع المخصص، وتُذكر بوضوح في وثيقة العقد قبل توقيعه.',
      en: 'The payment plan (50% upfront and 50% on delivery, full upfront payment with a special discount, or 3 documented milestone payments) is set when the contract is created. The estimated delivery timeline varies by template or custom project scope, and is clearly stated in the contract document before signing.',
    },
  },
  {
    icon: ShieldCheck,
    title: { ar: 'ملكية الكود المصدري', en: 'Source Code Ownership' },
    body: {
      ar: 'عند اكتمال السداد الكامل المتفق عليه، يُنقل الكود المصدري الكامل وحقوق الملكية إلى الشركة العميلة. لا نحتفظ بأي حقوق استخدام على المنتج النهائي المسلَّم.',
      en: 'Upon completion of the agreed full payment, complete source code and ownership rights are transferred to the client company. We retain no usage rights over the final delivered product.',
    },
  },
  {
    icon: FileText,
    title: { ar: 'الإلغاء والتعديلات', en: 'Cancellation & Changes' },
    body: {
      ar: 'يمكن طلب تعديل المواصفات قبل بدء مرحلة التطوير الفعلية دون رسوم إضافية. أي تعديلات جوهرية بعد البدء بالتنفيذ تُقيَّم وتُتفق عليها بشكل منفصل. الدفعات المقدمة غير قابلة للاسترداد بعد بدء العمل الفعلي على المشروع.',
      en: 'Specification changes may be requested before actual development begins at no extra charge. Substantial changes after work has started are assessed and agreed upon separately. Upfront payments are non-refundable once actual work on the project has begun.',
    },
  },
  {
    icon: Scale,
    title: { ar: 'القانون الحاكم', en: 'Governing Law' },
    body: {
      ar: 'تخضع هذه الشروط وتُفسَّر وفقاً للقوانين المعمول بها في جمهورية العراق.',
      en: 'These terms are governed by and construed in accordance with the applicable laws of the Republic of Iraq.',
    },
  },
];

export const PolicyPage: React.FC<PolicyPageProps> = ({ type, language }) => {
  const isAr = language === 'ar';
  const sections = type === 'privacy' ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <section className="py-4 sm:py-6 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            {type === 'privacy'
              ? (isAr ? 'سياسة الخصوصية' : 'Privacy Policy')
              : (isAr ? 'شروط الخدمة' : 'Terms of Service')}
          </h2>
          <p className="text-white/90 text-xs sm:text-sm">
            {isAr
              ? 'آخر تحديث: أغسطس 2026 — منصة NOVAIQ البرمجية'
              : 'Last updated: August 2026 — NOVAIQ Software Platform'}
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div key={idx} className="p-5 sm:p-6 rounded-3xl bg-zinc-950 border border-zinc-800 flex items-start gap-4 shadow-xl">
                <div className="w-10 h-10 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center text-white shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {isAr ? section.title.ar : section.title.en}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                    {isAr ? section.body.ar : section.body.en}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
