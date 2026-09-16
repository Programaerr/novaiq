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
        /* ست بنود لا تسعة — دُمجت بلا حذف مادّة: القيمة والاعتماد داخل النطاق (١)، والصيانة
           والسرية والملكية في بند واحد (٥)، وسقف المسؤولية عاد إلى بند الإلغاء (٦) الذي كان
           منه أصلاً. كل رقم وكل حق ظل كما هو — تغيّر مكانه في القائمة لا نصّه. */
        'نطاق المشروع والتسليم والاعتماد: يوقّع العميل على وصف مشروعه ومواصفاته الواردة في القسم الثاني، وتُحدَّد القيمة والمدة وآلية السداد بالاتفاق بعد مراجعة الطلب، وتصبح مُلزِمة عند إثباتها في هذه الوثيقة واعتمادها من NUVAIQ وظهورها في حساب العميل؛ ولا يُلزَم أي طرف بقيمة قبل ذلك. يشمل التنفيذ هذه المواصفات فقط، ويجوز تسليم المشروع على مراحل. وأي ميزة أو تعديل جوهري خارجها يُعد طلباً إضافياً يُسعَّر بعد موافقة العميل، ولا يُحسب تلقائياً ضمن القيمة أو المدة المتفق عليهما. ولا يُسلَّم الكود التشغيلي النهائي أو صلاحيات الإدارة إلا بعد سداد كامل القيمة.',
        'الدفع والملكية: تُسدَّد المستحقات وفق آلية السداد المتفق عليها. وإذا تأخر العميل عن دفعة مستحقة أكثر من 14 يوماً بعد إشعاره، يجوز لـNUVAIQ تعليق العمل لحين السداد، ولا تُحسب فترة التعليق ضمن مدة التنفيذ. وإذا تجاوز تأخر العميل — بالدفع أو بتوفير المحتوى — 30 يوماً متواصلاً، يجوز لـNUVAIQ إنهاء العقد أو إعادة جدولة المشروع بتسعيرة جديدة. ولا تنتقل ملكية النسخة النهائية والملفات المصدرية للعميل إلا بعد تسديد كامل القيمة.',
        'مدة التنفيذ والتأخير: تبدأ مدة التنفيذ من تاريخ استلام الدفعة الأولى وجميع المواد والمعلومات الأساسية من العميل، وتلتزم العميل بتوفير المحتوى المطلوب خلال 7 أيام عمل من طلبه. وأي تأخير من العميل في المحتوى أو الردود أو الموافقات يمدّد موعد التسليم بمقدار فترة التأخير نفسها. وإذا تأخرت NUVAIQ تأخراً جوهرياً لا يعود سببه إلى العميل أو إلى ظرف خارج عن إرادتها، يحق للعميل إنهاء الجزء غير المنجز من المشروع واسترداد ما دفعه مقابله.',
        'التعديلات والاعتماد: يشمل السعر جولتين من التعديلات ضمن النطاق الأساسي للمشروع، ما لم يُتفق كتابياً على غير ذلك. وجولة التعديل هي مجموعة الملاحظات التي يرسلها العميل دفعة واحدة بعد مراجعته للمرحلة المسلَّمة؛ أما الطلبات التي تغيّر النطاق الأساسي فلا تُحسب من هذه الجولات. وأمام العميل 7 أيام عمل من تاريخ تسليم كل مرحلة لإرسال ملاحظاته؛ وإن لم يردّ خلالها، ترسل له NUVAIQ تذكيراً، وإذا انقضت 7 أيام عمل أخرى دون رد، تُعتبر المرحلة معتمدة وتُستحق دفعتها، وينتقل العمل إلى ما بعدها.',
        /* 15 يوماً، لا 30 — يطابق ما تَعِد به صفحة مراحل العمل (MilestoneTimeline.tsx). */
        'الملكية والسرية والضمان: يلتزم الطرفان بالحفاظ على سرية أي بيانات أو معلومات يطّلعان عليها بسبب هذا المشروع، ويتحمّل العميل المسؤولية القانونية الكاملة عن المحتوى الذي يزوّد به NUVAIQ. وبعد السداد الكامل، تنتقل للعميل حقوق استخدام المنتج النهائي المتفق عليه، مع بقاء الأدوات والمكوّنات والأكواد العامة التي تملكها NUVAIQ مسبقاً أو تستخدمها في مشاريع أخرى خارج هذه الملكية، ما لم يُتفق كتابياً على خلاف ذلك، وتحتفظ NUVAIQ بحق عرض المشروع كنموذج من أعمالها دون كشف بيانات العميل الخاصة. وتضمن NUVAIQ إصلاح الأخطاء البرمجية الناتجة عن تنفيذها الأصلي للمشروع مجاناً لمدة 15 يوماً من التسليم النهائي، ولا يشمل هذا الضمان إضافة وظائف جديدة، أو تغيير التصميم المعتمد، أو تعديلات ينفذها العميل أو طرف ثالث، أو أعطال خدمات أو منصات خارجية لا تتحكم بها NUVAIQ.',
        'الإلغاء والمسؤولية والقانون الحاكم: إذا ألغى العميل المشروع بعد بدء التنفيذ، يُستحق عليه فقط ما يقابل الأعمال المنفَّذة فعلياً حتى تاريخ الإلغاء، وتُخصم منه أي مبالغ سبق دفعها، وتُردّ الزيادة إن وُجدت. وإذا تعذّر على NUVAIQ إكمال المشروع لسبب لا يعود إلى العميل، تُردّ له قيمة الجزء غير المنجز. ولا تتجاوز مسؤولية NUVAIQ التعاقدية أو التعويضية عن أي أضرار (مباشرة أو غير مباشرة) قيمة العقد المدفوعة فعلياً بأي حال من الأحوال، ولا تتحمل NUVAIQ أضراراً تنشأ عن خدمات أو جهات خارجية أو عن استخدام المشروع خارج الغرض المتفق عليه. ويخضع هذا العقد لقوانين جمهورية العراق؛ وعند وجود خلاف، تتم محاولة حله وديّاً أولاً، وعند تعذّر ذلك يُحال إلى الجهات القضائية المختصة في العراق.',
      ]
    : [
        'Scope, Delivery & Approval: The client signs off on the description and specifications of their project as set out in Section Two. The value, timeline and payment terms are set by agreement after the request is reviewed, and become binding once recorded in this document, approved by NUVAIQ and visible in the client account; neither party is bound to any figure before that. Delivery covers only these specifications, and the project may be delivered in phases. Any feature or material change beyond them is an additional request priced after the client’s approval, and is not automatically counted toward the value or timeline above. The final working code and administrative access are handed over only after the contract value is fully settled.',
        'Payment & Ownership: Payments fall due per the agreed payment structure. If the client is more than 14 days late on a due payment after notice, NUVAIQ may suspend work until settlement, and the suspension period does not count toward the delivery timeline. If the client’s delay — in payment or in providing content — exceeds 30 consecutive days, NUVAIQ may terminate the contract or reschedule the project at a new rate. Ownership of the final build and source files transfers to the client only after the value is fully settled.',
        'Delivery Timeline & Delay: The delivery timeline starts once the first payment and all essential materials and information are received from the client, who must provide requested content within 7 business days of being asked. Any client-caused delay in content, responses or approvals extends the delivery date by the length of that delay. If NUVAIQ causes a material delay not attributable to the client or to circumstances beyond its control, the client may end the unfinished part of the project and recover what was paid for it.',
        'Revisions & Approval: The price includes two revision rounds within the project’s core scope, unless otherwise agreed in writing. A revision round is the set of comments the client sends in one batch after reviewing a delivered phase; requests that change the core scope are not counted against these rounds. The client has 7 business days from delivery of each phase to send comments; if none arrive, NUVAIQ sends a reminder, and if a further 7 business days pass with no response, the phase is deemed approved, its payment becomes due, and work proceeds to what follows it.',
        'Ownership, Confidentiality & Warranty: Both parties must keep confidential any data or information they access because of this project, and the client bears full legal responsibility for the content they provide NUVAIQ. After full settlement, usage rights to the agreed final product transfer to the client, while general tools, components and code NUVAIQ already owned or uses across other projects remain outside that transfer unless agreed otherwise in writing; NUVAIQ retains the right to showcase the project as a portfolio sample without disclosing the client’s own data. NUVAIQ warrants free fixes for software defects arising from its own original implementation for 15 days from final delivery; this warranty excludes new features, changes to the approved design, changes made by the client or a third party, and failures of external services or platforms outside NUVAIQ’s control.',
        'Cancellation, Liability & Governing Law: If the client cancels after work has started, only the value of work actually completed up to that date is due, net of any amount already paid, with any excess refunded. If NUVAIQ is unable to complete the project for a reason not attributable to the client, the value of the unfinished part is refunded. NUVAIQ’s contractual or compensatory liability for any damages (direct or indirect) shall in no case exceed the contract value actually paid, and NUVAIQ bears no liability for damage arising from external services or third parties, or from use of the project outside its agreed purpose. This contract is governed by the laws of the Republic of Iraq; any dispute is first addressed amicably, and failing that, referred to the competent courts in Iraq.',
      ];
}
