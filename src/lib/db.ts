import { supabase } from './supabase';
import { ContractData, PaymentRecord } from '../types';

/**
 * طبقة البيانات — كل قراءة وكتابة في الموقع تمرّ من هنا.
 *
 * ## الترجمة في مكان واحد
 * التطبيق يعرف `camelCase` (ContractData في types.ts)، وPostgres يعرف `snake_case`. الترجمة
 * محصورة في `toRow`/`fromRow` أدناه، ولهذا لم يتغيّر حرف في المكوّنات العشرين التي تقرأ العقد:
 * لو تسرّبت أسماء الأعمدة إلى الواجهة لصار كل تعديل في المخطّط تعديلاً في عشرين ملفاً.
 *
 * ## ما لم يعد موجوداً هنا
 * `payments` و`costIQD` لم يعودا حقلين داخل العقد بل جدولين مستقلّين — الأول ليجعل `SUM()`
 * تعمل على الخادم بدل جمعها في المتصفح، والثاني لأن تكلفتنا لا يجوز أن يقرأها صاحب العقد
 * (وهو كان يقدر: القراءة في Firestore كانت كلاً لا يتجزأ).
 */

const CONTRACT_COLUMNS = [
  'contract_number', 'user_id', 'email', 'company_name', 'cr_number', 'rep_name', 'phone', 'city',
  'template_id', 'template_title', 'project_type', 'custom_features_text',
  'primary_color', 'second_color', 'third_color', 'theme_preference', 'language_support',
  'client_logo_data_url', 'base_price_iqd', 'total_price_iqd', 'payment_plan',
  'delivery_timeline_text', 'delivery_timeline_weeks',
  'signature_data_url', 'signature_ink', 'agreed_to_terms', 'terms_viewed_at',
  'company_signature_data_url', 'company_signature_ink',
  'status', 'created_at', 'updated_at', 'completed_at', 'development_started_at', 'preview_url',
  'snapshot_hash', 'snapshot_at', 'cancellation_requested_at', 'cancellation_reason', 'admin_notes',
  'paid_amount_iqd', 'payment_status', 'installments_planned',
].join(', ');

type Row = Record<string, unknown>;

/** صفّ من القاعدة → الشكل الذي يعرفه التطبيق. */
function fromRow(row: Row, payments?: PaymentRecord[]): ContractData {
  const s = (k: string) => (row[k] as string) ?? undefined;
  const n = (k: string) => Number(row[k] ?? 0);
  return {
    // `id` كان مُعرِّف المستند في Firestore وهو رقم العقد نفسه — والعلاقة نفسها هنا، فلا
    // يتغيّر أي كود يستعمل `contract.id`.
    id: row.contract_number as string,
    contractNumber: row.contract_number as string,
    uid: s('user_id'),
    email: (row.email as string) || '',
    companyName: (row.company_name as string) || '',
    crNumber: (row.cr_number as string) || '',
    repName: (row.rep_name as string) || '',
    phone: (row.phone as string) || '',
    city: (row.city as string) || '',
    templateId: (row.template_id as string) || '',
    templateTitle: (row.template_title as string) || '',
    projectType: s('project_type') as ContractData['projectType'],
    customFeaturesText: (row.custom_features_text as string) || '',
    primaryColor: (row.primary_color as string) || '',
    secondColor: s('second_color'),
    thirdColor: s('third_color'),
    themePreference: (row.theme_preference as ContractData['themePreference']) || 'dark',
    languageSupport: (row.language_support as ContractData['languageSupport']) || 'ar',
    clientLogoDataUrl: s('client_logo_data_url'),
    basePriceIQD: n('base_price_iqd'),
    totalPriceIQD: n('total_price_iqd'),
    paymentPlan: (row.payment_plan as ContractData['paymentPlan']) || '50_50',
    deliveryTimelineText: s('delivery_timeline_text'),
    deliveryTimelineWeeks: n('delivery_timeline_weeks'),
    signatureDataUrl: (row.signature_data_url as string) || '',
    signatureInk: s('signature_ink') as ContractData['signatureInk'],
    agreedToTerms: Boolean(row.agreed_to_terms),
    termsViewedAt: s('terms_viewed_at'),
    companySignatureDataUrl: s('company_signature_data_url'),
    companySignatureInk: s('company_signature_ink') as ContractData['companySignatureInk'],
    status: (row.status as ContractData['status']) || 'draft',
    createdAt: (row.created_at as string) || '',
    updatedAt: s('updated_at'),
    completedAt: s('completed_at'),
    developmentStartedAt: s('development_started_at'),
    previewUrl: s('preview_url'),
    snapshotHash: s('snapshot_hash'),
    snapshotAt: s('snapshot_at'),
    cancellationRequestedAt: s('cancellation_requested_at'),
    cancellationReason: s('cancellation_reason'),
    adminNotes: s('admin_notes'),
    paidAmountIQD: n('paid_amount_iqd'),
    paymentStatus: (row.payment_status as ContractData['paymentStatus']) || 'unpaid',
    installmentsPlanned: n('installments_planned'),
    ...(payments ? { payments } : {}),
  };
}

/** الشكل الذي يعرفه التطبيق → صفّ للقاعدة. الحقول غير الموجودة تُحذف لا تُرسل فارغة. */
function toRow(c: Partial<ContractData>): Row {
  const row: Row = {};
  const put = (col: string, value: unknown) => {
    if (value !== undefined) row[col] = value;
  };

  put('contract_number', c.contractNumber?.trim());
  put('user_id', c.uid);
  // البريد يُطبَّع هنا لا في المكوّنات: القاعدة ترفض غير المطبَّع (قيد في الجدول)، وهو ما
  // يربط العقد بصاحبه قبل أن يفتح حساباً.
  put('email', c.email ? c.email.trim().toLowerCase() : undefined);
  put('company_name', c.companyName);
  put('cr_number', c.crNumber);
  put('rep_name', c.repName);
  put('phone', c.phone);
  put('city', c.city);
  put('template_id', c.templateId);
  put('template_title', c.templateTitle);
  put('project_type', c.projectType);
  put('custom_features_text', c.customFeaturesText);
  put('primary_color', c.primaryColor);
  put('second_color', c.secondColor);
  put('third_color', c.thirdColor);
  put('theme_preference', c.themePreference);
  put('language_support', c.languageSupport);
  put('client_logo_data_url', c.clientLogoDataUrl);
  put('base_price_iqd', c.basePriceIQD);
  put('total_price_iqd', c.totalPriceIQD);
  put('payment_plan', c.paymentPlan);
  put('delivery_timeline_text', c.deliveryTimelineText);
  put('delivery_timeline_weeks', c.deliveryTimelineWeeks);
  put('signature_data_url', c.signatureDataUrl);
  put('signature_ink', c.signatureInk);
  put('agreed_to_terms', c.agreedToTerms);
  put('terms_viewed_at', c.termsViewedAt);
  put('company_signature_data_url', c.companySignatureDataUrl);
  put('company_signature_ink', c.companySignatureInk);
  put('status', c.status);
  put('created_at', c.createdAt);
  put('completed_at', c.completedAt);
  put('development_started_at', c.developmentStartedAt);
  put('preview_url', c.previewUrl);
  put('snapshot_hash', c.snapshotHash);
  put('snapshot_at', c.snapshotAt);
  put('cancellation_requested_at', c.cancellationRequestedAt);
  put('cancellation_reason', c.cancellationReason);
  put('admin_notes', c.adminNotes);
  put('installments_planned', c.installmentsPlanned);
  /* `paid_amount_iqd` و`payment_status` غير موجودين هنا عمداً: يشتقّهما مشغّل في القاعدة من
     جدول الدفعات، فكتابتهما يدوياً تعني رقمين قد يتناقضان مع الدفتر الذي بُنيا منه. */
  return row;
}

// ═══ تصنيف أخطاء الكتابة ═══════════════════════════════════════════════════════════════

export type WriteFailure = 'denied' | 'offline' | 'unknown';

/**
 * لماذا فشلت كتابة: رفضٌ من الخادم، أم تعذُّر وصول إليه.
 *
 * وُجدت لأن رسالة موحّدة تقول "تحقّق من الإنترنت" تكذب في أكثر الحالات شيوعاً — والإنتاج
 * يحذف `console.*` من الحزمة، فالرسالة هي كل ما يملكه المستخدم.
 *
 * `42501` رفض صلاحيات (RLS)، و`23514` مخالفة قيد — وهو ما تُصدره مشغّلات الحراسة عندنا
 * (guard_contract_update): كلاهما "الخادم رفض"، لا "الشبكة".
 */
export function classifyWriteFailure(error: unknown): WriteFailure {
  const e = error as { code?: string; message?: string } | null;
  const code = e?.code || '';
  const message = (e?.message || '').toLowerCase();
  if (code === '42501' || code === '23514' || code === 'PGRST301' || message.includes('row-level security')) {
    return 'denied';
  }
  if (message.includes('failed to fetch') || message.includes('network')) return 'offline';
  return 'unknown';
}

// ═══ الدفعات ═══════════════════════════════════════════════════════════════════════════

async function fetchPayments(contractNumbers: string[]): Promise<Map<string, PaymentRecord[]>> {
  const byContract = new Map<string, PaymentRecord[]>();
  if (contractNumbers.length === 0) return byContract;

  const { data, error } = await supabase
    .from('contract_payments')
    .select('id, contract_number, amount_iqd, paid_on, note')
    .in('contract_number', contractNumbers)
    .order('paid_on', { ascending: true });

  if (error || !data) return byContract;
  for (const p of data as Row[]) {
    const key = p.contract_number as string;
    const list = byContract.get(key) || [];
    list.push({
      id: p.id as string,
      amountIQD: Number(p.amount_iqd ?? 0),
      date: (p.paid_on as string) || '',
      note: (p.note as string) || undefined,
    });
    byContract.set(key, list);
  }
  return byContract;
}

/** يستبدل دفتر الدفعات كاملاً بما أرسلته اللوحة — نفس معنى الكتابة القديمة للمصفوفة. */
async function replacePayments(contractNumber: string, payments: PaymentRecord[]): Promise<void> {
  const { error: delError } = await supabase
    .from('contract_payments')
    .delete()
    .eq('contract_number', contractNumber);
  if (delError) throw delError;

  if (payments.length === 0) return;
  const { error } = await supabase.from('contract_payments').insert(
    payments.map((p) => ({
      contract_number: contractNumber,
      amount_iqd: p.amountIQD,
      paid_on: p.date,
      note: p.note || null,
    }))
  );
  if (error) throw error;
}

// ═══ العقود ════════════════════════════════════════════════════════════════════════════

/**
 * حفظ عقد جديد.
 *
 * `upsert` على `contract_number` لا `insert`: رقم العقد مُعرِّف حتمي، فحفظتان متقاربتان لنفس
 * العقد (StrictMode مثلاً) تبقيان فكرة واحدة بدل صفّين.
 */
export async function saveContract(contract: ContractData): Promise<string> {
  const row = toRow(contract);
  if (!row.contract_number) throw new Error('Cannot save a contract without a contract number');

  const { error } = await supabase.from('contracts').upsert(row, { onConflict: 'contract_number' });
  if (error) throw error;
  return row.contract_number as string;
}

export async function fetchContracts(): Promise<ContractData[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select(CONTRACT_COLUMNS)
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  const rows = data as unknown as Row[];
  const payments = await fetchPayments(rows.map((r) => r.contract_number as string));
  return rows.map((r) => fromRow(r, payments.get(r.contract_number as string) || []));
}

/**
 * كل العقود، لحظياً — للوحة التحكّم.
 *
 * Supabase يرسل **أحداث تغيير** لا لقطة كاملة كما كان Firestore. وبدل بناء القائمة من الفروق
 * (وهو منطق يُخطئ بصمت عند أول حدث ضائع أو مكرَّر)، أي حدث يعيد الجلب. القوائم هنا بعشرات
 * الصفوف لا آلافها، والثمن رحلة واحدة مقابل قائمة لا يمكن أن تنحرف عن الخادم.
 */
export function subscribeToContracts(callback: (contracts: ContractData[]) => void) {
  let cancelled = false;
  const load = () => {
    fetchContracts()
      .then((list) => !cancelled && callback(list))
      .catch(() => !cancelled && callback([]));
  };
  load();

  const channel = supabase
    .channel('contracts-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, load)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contract_payments' }, load)
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

/**
 * عقود صاحب الحساب وحده، لحظياً.
 *
 * استعلام واحد بـ`or` — وهذا أحد أسباب الانتقال أصلاً: Firestore لا يعرف `OR` بين حقلين،
 * فكان هذا مستمعَين منفصلين يُدمجان يدوياً. والشرطان هما نفسهما شرطا `owns_contract()` في
 * القاعدة، فما ترفضه السياسة لا تعرضه الواجهة.
 */
export function subscribeToMyContracts(
  uid: string | undefined,
  email: string | undefined,
  callback: (contracts: ContractData[]) => void
) {
  const accountEmail = (email || '').trim().toLowerCase();
  let cancelled = false;

  const load = async () => {
    const filters: string[] = [];
    if (uid) filters.push(`user_id.eq.${uid}`);
    if (accountEmail) filters.push(`email.eq.${accountEmail}`);
    if (filters.length === 0) {
      if (!cancelled) callback([]);
      return;
    }

    const { data, error } = await supabase
      .from('contracts')
      .select(CONTRACT_COLUMNS)
      .or(filters.join(','))
      .order('created_at', { ascending: false });

    if (cancelled) return;
    if (error || !data) {
      callback([]);
      return;
    }
    const rows = data as unknown as Row[];
    const payments = await fetchPayments(rows.map((r) => r.contract_number as string));
    if (!cancelled) callback(rows.map((r) => fromRow(r, payments.get(r.contract_number as string) || [])));
  };

  load();

  const channel = supabase
    .channel('contracts-mine')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => void load())
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

/** تكلفتنا الداخلية لكل عقد — جدول أدمن فقط، لا يقرؤه صاحب العقد. */
export function subscribeToContractCosts(callback: (costs: Record<string, number>) => void) {
  let cancelled = false;
  const load = async () => {
    const { data, error } = await supabase.from('contract_finance').select('contract_number, cost_iqd');
    if (cancelled) return;
    if (error || !data) {
      callback({});
      return;
    }
    const costs: Record<string, number> = {};
    for (const r of data as Row[]) costs[r.contract_number as string] = Number(r.cost_iqd ?? 0);
    callback(costs);
  };
  load();

  const channel = supabase
    .channel('contract-finance')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contract_finance' }, () => void load())
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

/**
 * تعديل إداري على عقد. `costIQD` و`payments` يذهبان إلى جدوليهما لا إلى صفّ العقد.
 *
 * التكلفة تُكتب أوّلاً وتُحاوَل وحدها: فشلها لا يُسقط حفظ السعر والحالة والتوقيع معه — وهو ما
 * كان يحدث حرفياً حين كانت الكتابتان مربوطتين.
 */
export async function updateContractFields(
  contract: Pick<ContractData, 'id' | 'contractNumber' | 'developmentStartedAt'>,
  fields: Partial<Pick<ContractData,
    'status' | 'totalPriceIQD' | 'adminNotes' | 'companySignatureDataUrl' | 'companySignatureInk'
    | 'costIQD' | 'payments' | 'installmentsPlanned' | 'previewUrl' | 'deliveryTimelineWeeks'
    | 'deliveryTimelineText' | 'paymentPlan' | 'cancellationRequestedAt' | 'cancellationReason'
    | 'snapshotHash' | 'snapshotAt'>>
): Promise<void> {
  const docId = (contract.contractNumber || '').trim() || (contract.id || '').trim();
  if (!docId) throw new Error('Cannot update a contract with neither a contract number nor an id');

  const { costIQD, payments, ...contractFields } = fields;

  if (costIQD !== undefined) {
    const { error } = await supabase
      .from('contract_finance')
      .upsert({ contract_number: docId, cost_iqd: costIQD, updated_at: new Date().toISOString() },
              { onConflict: 'contract_number' });
    if (error) console.error('contract_finance write failed (contract still saved):', error);
  }

  /* اعتماد NUVAIQ هو الموافقة نفسها، فينقل العقد إلى التنفيذ وحده — إلا إن اختار الأدمن حالة
     صراحةً في نفس الحفظة، فاختياره يسبق. بدون هذا كان يوقّع ثم ينسى تغيير الحالة، والعميل
     يتابع الحالة لا توقيعنا. */
  const patch = toRow(contractFields as Partial<ContractData>);
  if (contractFields.companySignatureDataUrl && !contractFields.status) {
    patch.status = 'in_development';
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from('contracts').update(patch).eq('contract_number', docId);
    if (error) throw error;
  }

  if (payments !== undefined) await replacePayments(docId, payments);

  await writeAuditEntry(docId, fields);
}

/**
 * الزبون يوقّع عقداً أنشأه الأدمن نيابةً عنه.
 *
 * حصراً هذه الحقول — وهي بالضبط ما يسمح به مشغّل الحراسة في القاعدة، فرفضٌ هنا يعني خللاً في
 * هذا الكود لا في السياسة.
 */
export async function signPendingContract(
  contract: Pick<ContractData, 'id' | 'contractNumber' | 'uid'>,
  signatureDataUrl: string,
  currentUid: string
): Promise<void> {
  const docId = (contract.contractNumber || '').trim() || (contract.id || '').trim();
  if (!docId) throw new Error('Cannot sign a contract with neither a contract number nor an id');
  if (!signatureDataUrl) throw new Error('Cannot sign a contract without a signature');

  const patch: Row = {
    signature_data_url: signatureDataUrl,
    signature_ink: 'dark',
    agreed_to_terms: true,
    terms_viewed_at: new Date().toISOString(),
    status: 'submitted',
  };
  // يربط العقد بحسابه أوّل مرّة فقط — والقاعدة ترفض تغييره بعد ذلك.
  if (!contract.uid) patch.user_id = currentUid;

  const { error } = await supabase.from('contracts').update(patch).eq('contract_number', docId);
  if (error) throw error;
}

/** طلب العميل إلغاء عقده — إشعار لنا لا إلغاء. */
export async function requestContractCancellation(
  contract: Pick<ContractData, 'id' | 'contractNumber'>,
  reason: string
): Promise<void> {
  const docId = (contract.contractNumber || '').trim() || (contract.id || '').trim();
  if (!docId) throw new Error('Cannot request cancellation without a contract number');

  const { error } = await supabase
    .from('contracts')
    .update({
      cancellation_requested_at: new Date().toISOString(),
      cancellation_reason: reason.trim() || null,
    })
    .eq('contract_number', docId);
  if (error) throw error;
}

export async function deleteContract(contractId?: string, contractNumber?: string): Promise<void> {
  const docId = (contractNumber || '').trim() || (contractId || '').trim();
  if (!docId) throw new Error('Cannot delete a contract without an identifier');

  const { error } = await supabase.from('contracts').delete().eq('contract_number', docId);
  if (error) throw error;

  /* تحقّق بعد الحذف لا ثقة به: الحذف الذي "نجح" ثم بقي الصفّ موجوداً كان أسوأ عطل في النسخة
     السابقة — يختفي العقد من شاشة الأدمن ويبقى عند صاحبه. */
  const { data } = await supabase.from('contracts').select('contract_number').eq('contract_number', docId);
  if (data && data.length > 0) throw new Error(`Contract still present after delete: ${docId}`);
}

// ═══ سجلّ التدقيق ══════════════════════════════════════════════════════════════════════

const AUDITED_FIELDS: (keyof ContractData)[] = [
  'status', 'totalPriceIQD', 'adminNotes', 'previewUrl', 'paymentPlan',
  'deliveryTimelineText', 'deliveryTimelineWeeks', 'installmentsPlanned', 'companySignatureDataUrl',
];

/** سطر لكل تعديل إداري. يبتلع أخطاءه: سجلّ فاشل لا يُسقط حفظاً نجح. */
async function writeAuditEntry(contractNumber: string, fields: Partial<ContractData>): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getSession();
    const actorEmail = (userData.session?.user?.email || '').trim().toLowerCase();
    if (!actorEmail) return;

    const changes: Record<string, unknown> = {};
    for (const field of AUDITED_FIELDS) {
      if (!(field in fields)) continue;
      const value = (fields as Record<string, unknown>)[field];
      // التوقيع صورة كاملة — يُسجَّل وقوعه لا محتواه.
      changes[field] = field === 'companySignatureDataUrl' ? (value ? 'signed' : 'cleared') : value;
    }
    if (Object.keys(changes).length === 0) return;

    await supabase.from('contract_audit').insert({
      contract_number: contractNumber,
      actor_email: actorEmail,
      changes,
    });
  } catch (error) {
    console.error('audit log write failed:', error);
  }
}

export async function fetchContractAudit(contractNumber: string) {
  const { data, error } = await supabase
    .from('contract_audit')
    .select('actor_email, at, changes')
    .eq('contract_number', contractNumber)
    .order('at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return (data as Row[]).map((r) => ({
    actorEmail: r.actor_email as string,
    at: r.at as string,
    changes: r.changes as Record<string, { from: unknown; to: unknown }>,
  }));
}

// ═══ رسائل نموذج التواصل ═══════════════════════════════════════════════════════════════

export async function sendContactMessage(msg: {
  name: string;
  phone: string;
  message: string;
  language: string;
}): Promise<void> {
  const { error } = await supabase.from('contact_messages').insert(msg);
  if (error) throw error;
}
