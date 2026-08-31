import { Language } from '../lib/i18n';

/**
 * The clauses of the NUVAIQ software design & development services agreement, in the order
 * they are numbered.
 *
 * ## Why these live in one shared module
 *
 * They are read in two places that must never be able to disagree: the builder shows them to
 * the customer immediately above the pad they sign on (ContractBuilder, step 4), and the
 * printed document prints them as section 4 of the PDF that customer receives
 * (ContractPrintDocument). If those two ever drifted apart — a clause edited in one file and
 * not the other — the client would have signed terms that are not the terms in their own
 * contract. That is not a display bug, it is an unenforceable agreement, so the text has
 * exactly one home and both callers read it from here.
 *
 * ## What is in them
 *
 * Deliberately covering both directions: the clauses that protect the client (delivery,
 * revisions, IP handover, warranty, confidentiality) and those that protect NUVAIQ (fixed
 * scope, implied approval, capped liability, late payment, cancellation) sit in the same
 * numbered list, because a contract that only defends one side is the one that gets argued
 * about later.
 *
 * `deliveryTimelineWeeks` is kept for call-site compatibility (the per-contract duration is
 * collected in Section One of the agreement and rendered there, not inside a clause), so the
 * signature stays stable even though the clauses no longer interpolate it.
 *
 * Plain strings rather than a structured type with ids and titles: both callers render them
 * verbatim as an ordered list and nothing else reads them, so structure would add indirection
 * without adding a capability.
 *
 * Not machine-translated. `translateText`/`useAutoTranslate` cover UI copy, where an
 * approximate rendering is fine; these are contractual obligations, where it is not — each
 * language is written out in full so neither version can be a guess at the other.
 */
export function contractTerms(language: Language, _deliveryTimelineWeeks: number): string[] {
  return language === 'ar'
    ? [
        'نطاق العمل والتسليم: يشمل التنفيذ التقني المحددة والمتفق عليها مسبقاً في القسم الأول فقط. يُسلم المشروع على مراحل، ولا يُسلم الكود التشغيلي النهائي أو صلاحيات الإدارة إلا بعد سداد كامل قيمة العقد.',
        'المراجعات والاعتماد: يحق للعميل جولتا تعديل مجانيتين قبل الاعتماد النهائي (على ألا تشمل تغييراً جذرياً في المفهوم الأساسي أو إضافة ميزات جديدة). أي متطلبات خارج النطاق تُسعّر كملحق منفصل.',
        'التزامات العميل والموافقة الضمنية: يلتزم العميل بتوفير المحتوى خلال 7 أيام عمل. عند تسليم أي مرحلة للعميل، وفي حال عدم إبدائه أي ملاحظات خلال 7 أيام، تُعتبر المرحلة معتمدة تلقائياً وتُستحق الدفعة الخاصة بها.',
        'الدفع والتأخير: تُدفع المستحقات على مراحل. يحق للشركة تعليق العمل إذا تأخر السداد 14 يوماً. وفي حال تجاوز تأخير العميل (سواء في الدفع أو توفير المحتوى) مدة 30 يوماً متواصلة، يحق للشركة إنهاء العقد أو إعادة جدولة المشروع بتسعيرة جديدة.',
        'الملكية الفكرية: يتحمل العميل المسؤولية القانونية الكاملة عن المحتوى الذي يزودنا به. تنتقل ملكية الكود للعميل بعد السداد النهائي، مع احتفاظ الشركة بحق عرض المشروع في معرض أعمالها دون كشف بياناته السرية.',
        'الضمان والصيانة: تلتزم الشركة بإصلاح الأخطاء البرمجية (التي تخالف المتطلبات المتفق عليها فقط) مجاناً لمدة 30 يوماً من التسليم. طلبات إضافة ميزات أو الصيانة اللاحقة تتطلب عقداً مستقلاً.',
        'المسؤولية والسرية: يلتزم الطرفان بالسرية التامة. ولا تتجاوز مسؤولية الشركة التعاقدية أو التعويضية عن أي أضرار (مباشرة أو غير مباشرة) قيمة العقد المدفوعة فعلياً بأي حال من الأحوال.',
        'الإلغاء والقانون الحاكم: يخضع العقد لقوانين جمهورية العراق. عند الإلغاء لأي سبب أو لظرف قاهر، يلتزم العميل بتسديد قيمة ما أُنجز فعلياً من العمل حتى تاريخ الإلغاء.',
      ]
    : [
        'Scope of Work & Delivery: Technical delivery covers only the specific, pre-agreed requirements set out in Section One. The project is delivered in phases, and the final working code and administrative access are handed over only after the contract value is fully settled.',
        'Revisions & Approval: The client is entitled to two free revision rounds before final approval, provided they do not involve a fundamental change of concept or the addition of new features. Any out-of-scope requirements are priced as a separate annex.',
        'Client Obligations & Implied Approval: The client must provide the required content within 7 business days. Once any phase is delivered to the client, if no comments are raised within 7 days, that phase is deemed automatically approved and its payment becomes due.',
        'Payment & Delay: Payments fall due in stages. The company may suspend work if settlement is delayed by 14 days. If the client’s delay (whether in payment or in providing content) exceeds 30 consecutive days, the company may terminate the contract or reschedule the project at a new rate.',
        'Intellectual Property: The client bears full legal responsibility for the content they provide us. Code ownership transfers to the client after final settlement, with the company retaining the right to showcase the project in its portfolio without disclosing its confidential data.',
        'Warranty & Maintenance: The company commits to fixing software defects (those that violate the agreed requirements only) free of charge for 30 days from delivery. Requests to add features or for subsequent maintenance require a separate contract.',
        'Liability & Confidentiality: Both parties are bound by strict confidentiality. The company’s contractual or compensatory liability for any damages (direct or indirect) shall in no case exceed the contract value actually paid.',
        'Cancellation & Governing Law: The contract is governed by the laws of the Republic of Iraq. Upon cancellation for any reason or due to force majeure, the client is obliged to settle the value of the work actually completed up to the cancellation date.',
      ];
}
