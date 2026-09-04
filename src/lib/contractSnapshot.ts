import type { ContractData } from '../types';
import { contractTerms } from '../data/contractTerms';

/**
 * لقطة العقد المعتمَد — تجميد مضمونه، لا صورته.
 *
 * ## المشكلة
 * الوثيقة تُرسم من الكود عند كل فتح: نصّ البنود يأتي من `data/contractTerms.ts` والأرقام من
 * المستند الحيّ. تعديل بند بعد سنة يغيّر ما يقرؤه عميل وقّع قبل ذلك التعديل — أي أن ما يُنزّله
 * لم يعد ما وقّع عليه.
 *
 * ## لماذا لقطة محتوى لا ملف PDF
 * حفظ PDF يتطلب Firebase Storage، وهو يتطلب خطة مدفوعة. والأهم أنه يحفظ **البكسل**، بينما ما
 * يُحتجّ به هو **المضمون**: الأرقام، ومواصفات العميل، ونصّ البنود، والتوقيعان. اللقطة تحفظ هذا
 * كله في مستند Firestore واحد بحجم عشرات الكيلوبايتات (والتوقيعان أصلاً محفوظان في العقد
 * نفسه)، ضمن الحصة المجانية، وبلا أي خدمة إضافية.
 *
 * ## ما يجعلها دليلاً
 *  · قاعدة Firestore تسمح بـ`create` فقط — لا تعديل ولا حذف، ولا للأدمن. لقطة قابلة للتعديل
 *    لا تثبت شيئاً.
 *  · تُحفظ معها بصمة SHA-256 لمحتواها، وتُخزَّن نسخة من البصمة في العقد نفسه. تطابق البصمتين
 *    يعني أن اللقطة هي هي؛ اختلافهما يكشف أي عبث دون الحاجة إلى مقارنة النصوص.
 */

export interface ContractSnapshot {
  contractNumber: string;
  /** ISO — لحظة الاعتماد التي جُمِّد عندها المضمون. */
  snapshotAt: string;
  /** بريد من اعتمد العقد. */
  approvedBy: string;
  /** نصّ البنود كما كان يوم الاعتماد، باللغتين — هذا هو جوهر اللقطة. */
  terms: { ar: string[]; en: string[] };
  /** القيم التعاقدية المجمَّدة. */
  values: {
    companyName: string;
    repName: string;
    email: string;
    phone: string;
    city: string;
    projectTitle: string;
    projectType?: 'website' | 'app';
    customFeaturesText: string;
    adminNotes: string;
    totalPriceIQD: number;
    deliveryTimelineWeeks: number;
    deliveryTimelineText: string;
    paymentPlan: ContractData['paymentPlan'];
    languageSupport: ContractData['languageSupport'];
    /** متى فُتحت البنود أمام العميل قبل توقيعه — جزء من كيفية التوقيع لا من محتواه، ولذلك
     *  يُجمَّد معه: هو ما يجيب لاحقاً على "هل عُرضت عليه؟". */
    termsViewedAt?: string;
    themePreference: ContractData['themePreference'];
    colors: string[];
    createdAt: string;
  };
  /** بصمة المحتوى أعلاه. */
  hash: string;
}

/** SHA-256 عبر Web Crypto — متاح في كل متصفح حديث بلا أي مكتبة. */
async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildSnapshotBody(contract: ContractData, approvedBy: string) {
  return {
    contractNumber: (contract.contractNumber || '').trim(),
    snapshotAt: new Date().toISOString(),
    approvedBy,
    terms: {
      ar: contractTerms('ar', contract.deliveryTimelineWeeks || 0),
      en: contractTerms('en', contract.deliveryTimelineWeeks || 0),
    },
    values: {
      companyName: contract.companyName || '',
      repName: contract.repName || '',
      email: contract.email || '',
      phone: contract.phone || '',
      city: contract.city || '',
      projectTitle: contract.templateTitle || '',
      ...(contract.projectType ? { projectType: contract.projectType } : {}),
      customFeaturesText: contract.customFeaturesText || '',
      adminNotes: contract.adminNotes || '',
      totalPriceIQD: contract.totalPriceIQD || 0,
      deliveryTimelineWeeks: contract.deliveryTimelineWeeks || 0,
      deliveryTimelineText: contract.deliveryTimelineText || '',
      paymentPlan: contract.paymentPlan,
      ...(contract.termsViewedAt ? { termsViewedAt: contract.termsViewedAt } : {}),
      languageSupport: contract.languageSupport,
      themePreference: contract.themePreference,
      colors: [contract.primaryColor, contract.secondColor, contract.thirdColor].filter(Boolean) as string[],
      createdAt: contract.createdAt || '',
    },
  };
}

/**
 * يكتب اللقطة ويعيد بصمتها. تُستدعى مرة واحدة لحظة الاعتماد.
 *
 * الكتابة `create` بحكم القاعدة، فمحاولة ثانية على نفس العقد تُرفض من الخادم — وهذا مقصود:
 * اللقطة الأولى هي الوثيقة، وأي "تحديث" لها يعني تغيير ما وقّع عليه الطرفان.
 */
export async function createContractSnapshot(contract: ContractData, approvedBy: string): Promise<string> {
  const body = buildSnapshotBody(contract, approvedBy);
  if (!body.contractNumber) throw new Error('Cannot snapshot a contract without a number');

  const hash = await sha256(JSON.stringify(body));
  const { supabase } = await import('./supabase');
  const { error } = await supabase.from('contract_snapshots').insert({
    contract_number: body.contractNumber,
    snapshot_at: body.snapshotAt,
    approved_by: body.approvedBy,
    terms: body.terms,
    values: body.values,
    hash,
  });
  if (error) throw error;
  return hash;
}

/** يقرأ اللقطة إن وُجدت. غيابها ليس خطأً: عقد قديم أو غير معتمَد بعد لا لقطة له. */
export async function fetchContractSnapshot(contractNumber: string): Promise<ContractSnapshot | null> {
  try {
    const { supabase } = await import('./supabase');
    const { data } = await supabase
      .from('contract_snapshots')
      .select('contract_number, snapshot_at, approved_by, terms, values, hash')
      .eq('contract_number', contractNumber.trim())
      .maybeSingle();
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      contractNumber: row.contract_number as string,
      snapshotAt: row.snapshot_at as string,
      approvedBy: row.approved_by as string,
      terms: row.terms as ContractSnapshot['terms'],
      values: row.values as ContractSnapshot['values'],
      hash: row.hash as string,
    };
  } catch (error) {
    console.error('Could not read the contract snapshot:', error);
    return null;
  }
}

/** يتحقق أن اللقطة لم تُمسّ: يعيد حساب البصمة من محتواها ويقارنها بالمخزَّنة. */
export async function verifySnapshot(snapshot: ContractSnapshot): Promise<boolean> {
  const { hash, ...body } = snapshot;
  return (await sha256(JSON.stringify(body))) === hash;
}
