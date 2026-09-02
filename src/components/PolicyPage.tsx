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
      ar: 'عند تعبئة طلب مشروع أو عقد إلكتروني، نجمع فقط ما تدخله بنفسك: اسم الشركة، رقم السجل التجاري، اسم الممثل المخول، البريد الإلكتروني، رقم الهاتف، المدينة، نوع المشروع والمواصفات التي تكتبها بنفسك، وصورة توقيعك الرقمي. وإذا راسلتنا عبر نموذج التواصل، نحفظ ما كتبته فيه: اسمك، رقم هاتفك، ونص رسالتك، ويفتح الزرّ محادثة واتساب برسالتك جاهزة لترسلها بنفسك — وما يجري داخل واتساب بعدها يخضع لسياسة خصوصية واتساب لا لسياستنا. لا نجمع أي بيانات بطاقة أو دفع إطلاقاً — لا توجد بوابة دفع في هذا الموقع، وكل تحويل مالي يتم خارجه بالاتفاق المباشر بين الطرفين.',
      en: "When you submit a project request or digital contract, we only collect what you enter yourself: company name, commercial register number, authorized representative name, email, phone, city, the project type and the specifications you write yourself, and your digital signature image. If you write to us through the contact form, we keep what you entered there: your name, your phone number and your message, and the button opens a WhatsApp chat with your message ready for you to send yourself — what happens inside WhatsApp after that is governed by WhatsApp's privacy policy, not ours. We never collect card or payment data — there is no payment gateway on this site, and every transfer happens outside it by direct agreement between the parties.",
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
    /* قسم مستقل لبيانات حساب Google تحديداً، وليس مذاباً في "البيانات التي نجمعها" أعلاه:
       تحقّق Google من شاشة الموافقة (OAuth branding verification) يبحث صراحةً عن إفصاح عن
       بيانات مستخدم Google — ماذا يُقرأ منها، لأي غرض، أين يُحفظ، مع من يُشارَك، وكيف تُحذف —
       وعن التزام Limited Use. غياب هذا القسم وحده سبب شائع لتأخير الموافقة أو رفضها. */
    icon: ShieldCheck,
    title: { ar: 'تسجيل الدخول عبر حساب Google', en: 'Signing In With Your Google Account' },
    body: {
      ar: 'عند اختيارك تسجيل الدخول بحساب Google، نستلم من Google ثلاثة عناصر فقط: اسمك المعروض، بريدك الإلكتروني، وصورة حسابك. تُستخدم حصراً لإنشاء حسابك على المنصة، وربط عقودك وطلباتك به، وعرض اسمك وصورتك داخل حسابك — لا أكثر. لا نطلب أي صلاحية أخرى على حساب Google: لا بريدك، ولا ملفاتك، ولا جهات اتصالك. لا نشارك هذه البيانات مع أي طرف ثالث، ولا نستخدمها في أي إعلانات، ولا نبيعها. تُحفظ في Firebase Authentication وFirestore (خدمات Google السحابية)، ويمكنك طلب حذف حسابك وكل بياناته نهائياً في أي وقت عبر قنوات التواصل أسفل الموقع. يلتزم استخدامنا لبيانات Google بسياسة Google API Services User Data Policy، بما فيها متطلبات الاستخدام المحدود (Limited Use).',
      en: 'When you choose to sign in with Google, we receive only three items from Google: your display name, your email address, and your profile picture. They are used solely to create your account on the platform, tie your contracts and requests to it, and show your name and picture inside your own account — nothing more. We request no other access to your Google account: not your mail, not your files, not your contacts. We do not share this data with any third party, do not use it for any advertising, and never sell it. It is stored in Firebase Authentication and Firestore (Google Cloud services), and you may request permanent deletion of your account and all its data at any time through the contact channels in the site footer. Our use of Google user data complies with the Google API Services User Data Policy, including the Limited Use requirements.',
    },
  },
  {
    icon: Database,
    title: { ar: 'أين تُحفظ بياناتك', en: 'Where Your Data Is Stored' },
    body: {
      ar: 'تُحفظ طلبات العقود على خوادم Firebase (منصة Google السحابية) بالإضافة إلى نسخة احتياطية محلية في متصفحك (localStorage) لضمان عدم فقدان عملك أثناء التعبئة. ولأن العقد وثيقة بين طرفين، لا يُحذف من طرف واحد: يمكنك طلب حذف أي عقد أو حسابك بالكامل عبر قنوات التواصل أسفل الموقع، ويُنفَّذ الطلب ما لم يمنعه التزام تعاقدي قائم بين الطرفين.',
      en: 'Contract requests are stored on Firebase (Google Cloud) servers, plus a local backup in your browser (localStorage) so your work isn\'t lost while filling the form. Because a contract is a document between two parties, it is not deleted unilaterally: you may request deletion of any contract, or of your whole account, through the contact channels in the site footer, and the request is carried out unless an existing contractual obligation prevents it.',
    },
  },
  {
    icon: Cookie,
    title: { ar: 'الكوكيز والتخزين المحلي', en: 'Cookies & Local Storage' },
    body: {
      ar: 'نستخدم التخزين المحلي في متصفحك لحفظ تفضيلاتك (اللغة، ألوان معاينة القوالب) وقرارك بشأن التتبع. بعض معاينات القوالب التفاعلية (مثل نموذج متجر إلكتروني تجريبي) تحفظ تفاعلك التجريبي محلياً في متصفحك فقط لغرض التوضيح — لا تتم أي عملية شراء أو دفع حقيقية عبر هذه المعاينات، ولا تُرسل هذه البيانات التجريبية إلى خوادمنا. نستخدم كذلك Google Analytics لقياس زيارات الصفحات وخطوات التصفح داخل الموقع بشكل مجهول الهوية — بلا اسمك أو بريدك أو رقم هاتفك أو أي محتوى تكتبه في العقد — وذلك لفهم استخدام المنصة وتحسينها فقط. القياس يبدأ مع فتح الموقع، وإذا ضغطت "رفض" في شريط الكوكيز يتوقف الإرسال فوراً ونهائياً على هذا المتصفح.',
      en: 'We use browser local storage to remember your preferences (language, template preview colors) and your tracking choice. Some interactive template previews (such as a demo online store) save your trial interactions locally in your browser purely for demonstration purposes — no real purchase or payment ever occurs through these previews, and this demo data is never sent to our servers. We also use Google Analytics to measure page visits and navigation steps anonymously — without your name, email, phone, or anything you type into a contract — solely to understand and improve platform usage. Measurement starts when the site opens, and if you press "Reject" in the cookie bar it stops immediately and permanently in that browser.',
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
      ar: 'تبني NUVAIQ مواقع إلكترونية وتطبيقات هاتف مخصّصة لكل عميل حسب ما يطلبه هو. وما يُعرض على الموقع من نماذج حيّة هو أمثلة على ما ننفّذه، لا منتجات تُباع كما هي. ولا تُعرض أسعار على الموقع: تُحدَّد قيمة كل مشروع ومدته وآلية سداده بالاتفاق بعد مراجعة الطلب، وتُثبَّت في وثيقة العقد.',
      en: 'NUVAIQ builds websites and mobile apps custom-made for each client, to what that client asks for. The live demos shown on the site are examples of what we build, not products sold as they are. No prices are displayed on the site: each project value, timeline and payment terms are set by agreement after the request is reviewed, and recorded in the contract document.',
    },
  },
  {
    icon: Scale,
    title: { ar: 'الدفع ومدة التسليم', en: 'Payment & Delivery Timeline' },
    body: {
      ar: 'تُعتمد آلية السداد ومدة التنفيذ مع قيمة المشروع بعد مراجعة الطلب، وتُثبَّت في وثيقة العقد فتظهر لك في حسابك. الخيارات المتاحة عادةً: 50% عند التعاقد و50% عند التسليم، أو دفعة كاملة مقدَّماً، أو دفعات على مراحل موثّقة — ويُتفق على الأنسب لكل مشروع على حدة.',
      en: 'Payment terms and the delivery timeline are approved together with the project value after the request is reviewed, recorded in the contract document, and shown to you in your account. The options normally available are: 50% on signing and 50% on delivery, full payment upfront, or documented milestone payments — the right one is agreed per project.',
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-obsidian tracking-tight mb-2">
            {type === 'privacy'
              ? (isAr ? 'سياسة الخصوصية' : 'Privacy Policy')
              : (isAr ? 'شروط الخدمة' : 'Terms of Service')}
          </h2>
          <p className="text-steel-light text-xs sm:text-sm">
            {isAr
              ? 'آخر تحديث: سبتمبر 2026 — منصة NUVAIQ البرمجية'
              : 'Last updated: September 2026 — NUVAIQ Software Platform'}
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
