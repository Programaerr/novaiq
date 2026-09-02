import type { ContractData } from '../types';

/**
 * أرشفة نسخة PDF مجمَّدة من العقد لحظة اعتماده.
 *
 * ## لماذا
 * الوثيقة اليوم تُرسَم من الكود عند كل فتح: تغيير في `ContractPrintDocument` أو في بنود العقد
 * بعد سنة يغيّر شكل — بل ومضمون — عقد وُقّع قبل ذلك التغيير. في وثيقة تعاقدية هذا ليس تفصيلاً
 * تجميلياً: النسخة التي وقّع عليها الطرفان يجب أن تبقى كما هي مهما تغيّر الموقع بعدها.
 *
 * لذلك تُلتقط نسخة PDF واحدة **لحظة اعتماد الأدمن** (التوقيع المضاد + السعر النهائي) وتُرفع إلى
 * Firebase Storage، ويُحفظ رابطها في العقد. بعدها يقرأ العميل تلك النسخة لا نسخة يعاد رسمها.
 *
 * ## لماذا لا يفشل الحفظ إن فشلت الأرشفة
 * التخزين خدمة منفصلة قد لا تكون مفعَّلة بعد على المشروع. اعتماد عقد يُرفض لأن رفع ملف فشل هو
 * ضرر أكبر من عقد معتمَد بلا نسخة مؤرشفة — فالأرشفة تُحاوَل، وتُبلَّغ عند الفشل، ولا تُسقط
 * الحفظة.
 */

/** المسار داخل التخزين. رقم العقد وحده يكفي: هو مُعرِّف فريد بالفعل ومُعرِّف مستنده أيضاً. */
function archivePath(contractNumber: string): string {
  return `contracts/${contractNumber}.pdf`;
}

export async function uploadContractPdf(pdf: Blob, contract: Pick<ContractData, 'contractNumber'>): Promise<string> {
  const number = (contract.contractNumber || '').trim();
  if (!number) throw new Error('Cannot archive a contract without a contract number');

  const [{ getStorage, ref, uploadBytes, getDownloadURL }, { app }] = await Promise.all([
    import('firebase/storage'),
    import('./firebase'),
  ]);

  const storage = getStorage(app);
  const fileRef = ref(storage, archivePath(number));
  await uploadBytes(fileRef, pdf, {
    contentType: 'application/pdf',
    // يُقرأ من الكونسول عند الحاجة لمعرفة أي عقد هذا الملف بلا فتحه.
    customMetadata: { contractNumber: number, archivedAt: new Date().toISOString() },
  });
  return getDownloadURL(fileRef);
}
