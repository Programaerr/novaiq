import { Language } from '../lib/i18n';

/**
 * The clauses of a NOVAIQ development agreement, in the order they are numbered.
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
 * Deliberately covering both directions: the clauses that protect the client (ownership,
 * warranty, handover, confidentiality) and those that protect NOVAIQ (fixed scope, capped
 * revisions, client-caused delays, third-party costs, a liability ceiling) sit in the same
 * numbered list, because a contract that only defends one side is the one that gets argued
 * about later.
 *
 * `deliveryTimelineWeeks` is the only value that varies per contract; every other clause is
 * constant on purpose, so that two NOVAIQ contracts can never disagree about what was
 * promised.
 *
 * Plain strings rather than a structured type with ids and titles: both callers render them
 * verbatim as an ordered list and nothing else reads them, so structure would add indirection
 * without adding a capability.
 *
 * Not machine-translated. `translateText`/`useAutoTranslate` cover UI copy, where an
 * approximate rendering is fine; these are contractual obligations, where it is not — each
 * language is written out in full so neither version can be a guess at the other.
 */
export function contractTerms(language: Language, deliveryTimelineWeeks: number): string[] {
  return language === 'ar'
    ? [
        'نطاق العمل: يقتصر التنفيذ على القالب والمواصفات والإضافات المذكورة في البند (2) من هذه الوثيقة. أي طلب خارج هذا النطاق يُعد تغييراً في النطاق ويُسعَّر ويُوثَّق في ملحق مستقل موقَّع من الطرفين قبل تنفيذه.',
        'التعديلات والمراجعات: يشمل العقد جولتَي تعديل على التصميم والواجهات دون رسوم إضافية قبل الاعتماد النهائي. ما يزيد عن ذلك، أو أي تعديل يُطلب بعد الاعتماد، يُقدَّر ويُتفق على أجره مسبقاً.',
        `التسليم المرحلي: يُقسَّم التطوير إلى مراحل موزّعة على مدة ${deliveryTimelineWeeks} أسابيع تبدأ من تاريخ سداد الدفعة الأولى واستلام كامل مواد العميل، مع تقارير تقدّم دورية عند إنجاز كل مرحلة.`,
        'التزامات العميل: يلتزم العميل بتزويد الشركة بالمحتوى المطلوب (نصوص، صور، شعارات، بيانات، صلاحيات الوصول) وبإبداء موافقته على كل مرحلة خلال سبعة (7) أيام عمل من طلبها. ويُوقف احتساب مدة التنفيذ عن أي فترة تأخير ناشئة عن الطرف العميل دون أن يُعد ذلك إخلالاً من الشركة.',
        'الملكية الفكرية: تنتقل ملكية الكود المصدري الخاص بالمشروع وكامل حقوق استخدامه إلى الشركة العميلة فور سداد كامل قيمة العقد. ولا يشمل هذا الانتقال أدوات NOVAIQ ومكتباتها العامة وأطر العمل مفتوحة المصدر أو المرخَّصة من أطراف ثالثة، والتي تبقى خاضعة لتراخيصها الأصلية.',
        'التسليم النهائي: يشمل التسليم الكود المصدري ونسخة تشغيلية عاملة وبيانات الدخول الإدارية والتوثيق التشغيلي الأساسي، وذلك بعد سداد كامل قيمة العقد.',
        'ضمان الأخطاء البرمجية: تلتزم الشركة بمعالجة أي خلل برمجي يظهر ضمن نطاق العمل المتفق عليه مجاناً لمدة ثلاثين (30) يوماً من تاريخ التسليم النهائي. ولا يشمل الضمان الميزات الجديدة، ولا الأعطال الناتجة عن تعديل الكود من طرف آخر، أو عن خدمات استضافة أو أنظمة خارجة عن سيطرة الشركة.',
        'الدعم والصيانة: خدمات الدعم الفني والصيانة التشغيلية بعد انتهاء مدة الضمان غير مشمولة بقيمة هذا العقد، وتُنظَّم باتفاق مستقل بين الطرفين.',
        'السداد والتأخر: تُستحق الدفعات وفق الآلية المحددة في البند (3). ويحق للشركة تعليق العمل مؤقتاً إذا تأخر سداد أي دفعة مستحقة أكثر من أربعة عشر (14) يوماً، مع استئنافه فور السداد ودون أن يُعد التعليق إخلالاً بالعقد.',
        'تكاليف الأطراف الثالثة: رسوم الاستضافة واسم النطاق وشهادات الأمان وتراخيص الخدمات الخارجية وبوابات الدفع ورسوم متاجر التطبيقات غير مشمولة بقيمة العقد ما لم يُنص على خلاف ذلك صراحةً، وتكون على حساب العميل.',
        'السرية: يلتزم الطرفان بالحفاظ على سرية كل ما يطّلعان عليه من معلومات ووثائق وبيانات بحكم هذا العقد، وبعدم إفشائها لأي طرف ثالث دون موافقة كتابية، ويستمر هذا الالتزام سارياً بعد انتهاء العقد أو إنهائه.',
        'مسؤولية المحتوى: يقر العميل بأنه يملك أو مخوَّل قانوناً باستخدام كل ما يزوّد به الشركة من محتوى وعلامات تجارية وبيانات، ويتحمل وحده المسؤولية القانونية الناشئة عن أي مخالفة في ذلك.',
        'حق العرض: يحق لـ NOVAIQ عرض المشروع ضمن معرض أعمالها لأغراض التعريف بخدماتها، دون كشف أي بيانات سرية أو بيانات عملاء، ما لم يعترض العميل على ذلك كتابةً.',
        'حدود المسؤولية: لا تتجاوز مسؤولية الشركة التعاقدية في جميع الأحوال قيمة العقد المسدَّدة فعلياً، ولا تمتد إلى الأضرار غير المباشرة أو الأرباح الفائتة أو فقدان البيانات الناتج عن أسباب خارجة عن نطاق العمل المتفق عليه.',
        'القوة القاهرة: يُعلَّق التزام أي من الطرفين عند وقوع ظرف قاهر خارج عن إرادته يحول دون التنفيذ، على أن يُخطر الطرف الآخر خلال مدة معقولة، وتُمدَّد المدد التعاقدية بما يعادل فترة التعليق.',
        'الإنهاء: يجوز إنهاء هذا العقد باتفاق الطرفين كتابةً، أو من أي طرف عند إخلال جوهري لم يُعالَج خلال أربعة عشر (14) يوماً من الإخطار. وفي جميع حالات الإنهاء تُسدَّد قيمة ما أُنجز فعلياً حتى تاريخه، وتُسلَّم مخرجات المراحل المسدَّدة.',
        'القانون الحاكم وتسوية النزاعات: يخضع هذا العقد للقوانين النافذة في جمهورية العراق. ويسعى الطرفان لتسوية أي نزاع ودياً خلال ثلاثين (30) يوماً، وإلا فيكون الاختصاص للمحاكم المختصة في جمهورية العراق.',
        'طبيعة الوثيقة: هذه الوثيقة اتفاق خاص بين الطرفين المذكورين فيها وحدهما، تُوثّق ما اتفقا عليه ويُقرّان بمضمونها بتوقيعهما الإلكتروني. وهي ليست صادرة عن أي جهة حكومية ولا مصدَّقة أو موثَّقة من أي دائرة رسمية ولا يُقصد بها ذلك. وتمثل كامل ما اتفق عليه الطرفان، ولا يعتد بأي تفاهم سابق يخالفها إلا بملحق مكتوب موقَّع منهما.',
      ]
    : [
        'Scope of Work: Delivery is limited to the template, specifications and add-ons listed in Section (2) of this document. Any request beyond that scope constitutes a change of scope and must be priced and documented in a separate annex signed by both parties before it is carried out.',
        'Revisions: The contract includes two rounds of design and interface revisions at no additional charge prior to final approval. Anything beyond that, or any change requested after approval, is estimated and its fee agreed in advance.',
        `Milestone Delivery: Development is divided into phases across a ${deliveryTimelineWeeks}-week timeline beginning on the date the first payment is settled and all client materials are received, with progress reports at the completion of each phase.`,
        'Client Obligations: The client shall provide the required content (text, images, logos, data, access credentials) and give approval at each phase within seven (7) business days of request. The delivery timeline is suspended for any period of delay caused by the client, and such suspension is not a breach by the company.',
        "Intellectual Property: Ownership of the project's source code and full rights of use transfer to the client company upon complete payment of the contract value. This transfer excludes NOVAIQ's own tooling and general libraries, and open-source or third-party licensed frameworks, which remain subject to their original licences.",
        'Final Handover: Delivery comprises the source code, a working deployable build, administrative access credentials and essential operational documentation, provided after the full contract value has been settled.',
        "Defect Warranty: The company shall remedy, free of charge, any software defect arising within the agreed scope of work for thirty (30) days from the date of final delivery. The warranty does not cover new features, faults caused by code modified by another party, or failures of hosting services or systems outside the company's control.",
        'Support & Maintenance: Technical support and operational maintenance after the warranty period are not included in the value of this contract and are governed by a separate agreement between the parties.',
        'Payment & Late Settlement: Payments fall due per the structure set out in Section (3). The company may temporarily suspend work if any due payment is more than fourteen (14) days late, resuming immediately upon settlement; such suspension is not a breach of contract.',
        'Third-Party Costs: Hosting fees, domain names, security certificates, external service licences, payment gateways and app-store fees are not included in the contract value unless expressly stated otherwise, and are borne by the client.',
        'Confidentiality: Each party shall keep confidential all information, documents and data obtained by virtue of this contract and shall not disclose it to any third party without written consent. This obligation survives the expiry or termination of the contract.',
        'Content Responsibility: The client warrants that it owns, or is legally authorised to use, all content, trademarks and data it supplies to the company, and bears sole legal responsibility for any infringement arising from it.',
        'Portfolio Rights: NOVAIQ may present the project within its portfolio for the purpose of describing its services, without disclosing any confidential or customer data, unless the client objects in writing.',
        "Limitation of Liability: The company's contractual liability shall in no case exceed the contract value actually paid, and does not extend to indirect damages, lost profits, or data loss arising from causes outside the agreed scope of work.",
        "Force Majeure: Either party's obligations are suspended upon a force majeure event beyond its control that prevents performance, provided the other party is notified within a reasonable period; contractual periods are extended by the duration of the suspension.",
        'Termination: This contract may be terminated by written agreement of both parties, or by either party upon a material breach not remedied within fourteen (14) days of notice. In all cases of termination, the value of work actually completed to that date is payable, and the deliverables of paid phases are handed over.',
        'Governing Law & Disputes: This contract is governed by the laws in force in the Republic of Iraq. The parties shall seek to settle any dispute amicably within thirty (30) days, failing which jurisdiction lies with the competent courts of the Republic of Iraq.',
        'Nature of the Document: This is a private agreement between the two parties named in it and no one else. It records what they agreed and is acknowledged by their electronic signatures. It is not issued by any government body, nor certified or notarised by any official authority, and is not intended to be. It represents the entirety of what the parties agreed, and no prior understanding to the contrary shall be relied upon except by a written annex signed by both.',
      ];
}
