import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  getDocs,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  deleteField,
  query,
  where
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ContractData } from '../types';

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

/** يُصدَّر ليستعمله من يحتاج خدمة Firebase أخرى من نفس التطبيق. */
export { app };

// Pass databaseId if provided in config
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth: Auth = getAuth(app);

/* مفاتيح النسخة المحلية. كانت مكتوبة حرفياً كـ'novaq_…' — بلا حرف الياء، بقية من الاسم
   القديم قبل NUVAIQ، ومخالفة لكل مفاتيح التطبيق الأخرى ('nuvaiq_…'). الاسم الجديد هو
   المستعمل، والقديم يُقرأ مرة واحدة عند أول تشغيل وتُنقل بياناته إليه (migrateLegacyKeys
   أدناه) حتى لا يفقد أحد عقوداً محفوظة على جهازه أثناء مزامنة فاشلة. */
const LOCAL_CONTRACTS_KEY = 'nuvaiq_contracts';

/** النسخة المحلّية من العقد، ومعها لحظة وصولها إلى الخادم إن وصلت. الحقل محلّي بحت ولا
 *  يُكتب في Firestore — انظر استعماله في saveContractToFirebase والاشتراكين أدناه. */
type LocalContract = ContractData & { syncedAt?: string };
const LOCAL_DELETED_KEY = 'nuvaiq_deleted_contracts';
const LOCAL_UPDATED_EVENT = 'nuvaiq_contracts_updated';

(function migrateLegacyKeys() {
  try {
    const pairs: [string, string][] = [
      ['novaq_contracts', LOCAL_CONTRACTS_KEY],
      ['novaq_deleted_contracts', LOCAL_DELETED_KEY],
    ];
    for (const [oldKey, newKey] of pairs) {
      const legacy = localStorage.getItem(oldKey);
      if (legacy !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, legacy);
      }
      if (legacy !== null) localStorage.removeItem(oldKey);
    }
  } catch {
    // تخزين غير متاح — لا شيء لتُرحّله، والتطبيق يعمل من Firestore على أي حال.
  }
})();

const CONTRACTS_COLLECTION = 'contracts';
/** التكلفة الداخلية لكل عقد، بعيداً عن مستند العقد الذي يقرؤه صاحبه — انظر firestore.rules. */
const CONTRACT_FINANCE_COLLECTION = 'contract_finance';
/** سجل التدقيق — سطر لكل تعديل إداري، غير قابل للتعديل ولا الحذف (انظر firestore.rules). */
const CONTRACT_AUDIT_COLLECTION = 'contract_audit';

// Helper to track deleted identifiers so Firestore snapshot listeners never resurrect deleted contracts
/**
 * يوفّق النسخ المحلّية مع لقطة الخادم.
 *
 * يعيد ما يستحق العرض من المحلّي فقط — أي ما لم يصل الخادم بعد — ويمسح من التخزين كل نسخة
 * سبق أن وصلته ثم غابت عن لقطته: غيابها بعد وصولها يعني حذفاً وقع هناك، وإعادة إظهارها هي
 * بالضبط ما كان يُبقي عقداً محذوفاً في حساب صاحبه إلى الأبد.
 */
function reconcileLocalWithCloud(cloudNumbers: Set<string>): ContractData[] {
  try {
    const local: LocalContract[] = JSON.parse(localStorage.getItem(LOCAL_CONTRACTS_KEY) || '[]');
    const keep: LocalContract[] = [];
    const pending: LocalContract[] = [];
    for (const item of local) {
      const num = (item.contractNumber || '').trim();
      if (cloudNumbers.has(num)) {
        keep.push(item); // موجود على الخادم: تبقى النسخة المحلّية كنسخة احتياطية بلا عرض مستقل.
      } else if (item.syncedAt) {
        // وصل الخادم ثم غاب عنه = حُذف هناك. لا يُحفظ ولا يُعرض.
      } else {
        keep.push(item);
        pending.push(item); // لم يصل بعد: يستحق الظهور حتى تنجح المزامنة.
      }
    }
    if (keep.length !== local.length) {
      localStorage.setItem(LOCAL_CONTRACTS_KEY, JSON.stringify(keep));
    }
    return pending;
  } catch {
    return [];
  }
}

function getDeletedIdentifiers(): Set<string> {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(LOCAL_DELETED_KEY) || '[]');
    return new Set(list.map(s => s.trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

function markAsDeleted(id?: string, contractNumber?: string) {
  try {
    const current = Array.from(getDeletedIdentifiers());
    if (id && id.trim()) current.push(id.trim());
    if (contractNumber && contractNumber.trim()) current.push(contractNumber.trim());
    localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Error saving deleted identifiers:', e);
  }
}

function unmarkDeleted(id?: string, contractNumber?: string) {
  try {
    const deleted = getDeletedIdentifiers();
    if (id) deleted.delete(id.trim());
    if (contractNumber) deleted.delete(contractNumber.trim());
    localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(Array.from(deleted)));
  } catch (e) {
    console.warn('Error unmarking deleted identifier:', e);
  }
}

// Save Contract to Firebase Firestore & Local Storage with deduplication
export async function saveContractToFirebase(contract: ContractData): Promise<string> {
  const contractNum = (contract.contractNumber || '').trim();
  unmarkDeleted(contract.id, contractNum);

  // 1. Instant local persistence guarantee
  try {
    const localContracts: ContractData[] = JSON.parse(localStorage.getItem(LOCAL_CONTRACTS_KEY) || '[]');
    const existingIndex = localContracts.findIndex((c) => (c.contractNumber || '').trim() === contractNum);
    if (existingIndex >= 0) {
      localContracts[existingIndex] = { ...localContracts[existingIndex], ...contract };
    } else {
      localContracts.unshift(contract);
    }
    localStorage.setItem(LOCAL_CONTRACTS_KEY, JSON.stringify(localContracts));
    window.dispatchEvent(new Event(LOCAL_UPDATED_EVENT));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }

  // 2. Cloud Firestore sync — contractNumber IS the document ID (instead of querying every
  // existing doc to decide addDoc-vs-updateDoc). That check-then-act pattern raced: two
  // near-simultaneous saves for the same contract (e.g. React StrictMode deliberately
  // double-invoking the auto-save effect in dev) could both run their "does this exist?"
  // query before either write landed, so both concluded "no" and both created a document —
  // the exact duplicate-contract bug this was rewritten to fix. Writing straight to a
  // deterministic doc ID makes the save idempotent no matter how many times it's called.
  try {
    const { id, ...cleanContract } = contract;
    const docId = contractNum || `LOCAL_${Date.now()}`;
    const docRef = doc(db, CONTRACTS_COLLECTION, docId);

    // Same undefined-stripping as updateContractFields, for the same reason: ContractData has
    // a dozen optional fields, and a single one of them present-but-undefined makes Firestore
    // reject the entire contract. `serverTimestamp()` is a sentinel object, not undefined, so
    // it survives this untouched.
    const docData = Object.fromEntries(
      Object.entries({
        ...cleanContract,
        createdAt: contract.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
      }).filter(([, value]) => value !== undefined)
    );

    await setDoc(docRef, docData, { merge: true });

    // Update local storage item with the Firestore ID
    try {
      const localContracts: ContractData[] = JSON.parse(localStorage.getItem(LOCAL_CONTRACTS_KEY) || '[]');
      const idx = localContracts.findIndex(c => (c.contractNumber || '').trim() === contractNum);
      if (idx >= 0) {
        localContracts[idx].id = docRef.id;
        /* علامة "هذه النسخة وصلت الخادم".
           بدونها لا تفرّق الواجهة بين عقد لم يصل السحابة بعد وعقد **حُذف منها** — وكلاهما
           "محلّي وغير موجود في اللقطة". وهذا هو سبب بقاء العقد ظاهراً عند العميل بعد حذفه:
           نسخته المحلّية كانت تُقرأ كعقد ينتظر المزامنة، فتُعاد إظهاره إلى الأبد. */
        (localContracts[idx] as LocalContract).syncedAt = new Date().toISOString();
        localStorage.setItem(LOCAL_CONTRACTS_KEY, JSON.stringify(localContracts));
      }
    } catch (err) {
      console.warn('Local storage id sync error:', err);
    }

    return docRef.id;
  } catch (error) {
    console.warn('Firestore sync operating in offline mode (local data preserved):', error);
    return contract.id || `LOCAL_${Date.now()}`;
  }
}

// Admin-only in practice: any caller can invoke this client-side, but it only ever runs
// from the admin dashboard, which is gated behind Firebase Auth login. Covers status
// changes and the post-negotiation edits (final agreed price, admin notes) in one call.
export async function updateContractFields(
  contract: Pick<ContractData, 'id' | 'contractNumber' | 'developmentStartedAt'>,
  fields: Partial<Pick<ContractData, 'status' | 'totalPriceIQD' | 'adminNotes' | 'companySignatureDataUrl' | 'companySignatureInk' | 'costIQD' | 'paymentStatus' | 'paidAmountIQD' | 'payments' | 'installmentsPlanned' | 'previewUrl' | 'deliveryTimelineWeeks' | 'deliveryTimelineText' | 'paymentPlan' | 'cancellationRequestedAt' | 'cancellationReason' | 'snapshotHash' | 'snapshotAt'>>
): Promise<void> {
  // Identified by contractNumber first, because that IS the document ID that
  // saveContractToFirebase writes to. `id` only equals it for contracts that came back from a
  // Firestore snapshot; one still waiting in localStorage (saved while offline, or when the
  // cloud sync failed) carries whatever id it had locally, or none at all — and this used to
  // be handed exactly that `id`, so admin edits to those contracts addressed a document that
  // does not exist.
  const docId = (contract.contractNumber || '').trim() || (contract.id || '').trim();
  if (!docId) {
    throw new Error('Cannot update a contract with neither a contract number nor an id');
  }

  const updatePayload: Partial<ContractData> = {
    ...fields,
    updatedAt: new Date().toISOString(),
  };
  // Records exactly when a contract was marked done, for both the admin and the client to see.
  if (fields.status === 'completed') {
    updatePayload.completedAt = new Date().toISOString();
  }

  // Countersigning IS the approval, so it moves the contract into development on its own.
  // Leaving those as two separate actions meant the admin could sign and then forget to change
  // the status, and the customer — who is watching the status, not our signature — would see a
  // contract still sitting at "submitted" days after we had started building it.
  //
  // Only when the status was not set in the same call: an explicit choice by the admin always
  // wins over this default, otherwise signing a contract that is being marked `completed` would
  // silently drag it backwards into `in_development`.
  if (fields.companySignatureDataUrl && !fields.status) {
    updatePayload.status = 'in_development';
  }

  // ساعة بدء التنفيذ — تُضبط مرة واحدة فقط، أول مرة يصل العقد إلى "قيد التنفيذ" (سواء
  // اختارها الأدمن صراحةً أو وصلها تلقائياً بالتوقيع أعلاه). هي نقطة الصفر التي تزحف منها
  // نسبة الإنجاز في حساب العميل (lib/contractProgress.ts)؛ إعادة ضبطها مع كل حفظ لاحق كانت
  // ستُرجِع النسبة إلى الوراء أمام العميل كلما عدّل الأدمن أي حقل آخر.
  if (updatePayload.status === 'in_development' && !contract.developmentStartedAt) {
    updatePayload.developmentStartedAt = new Date().toISOString();
  }

  // setDoc+merge rather than updateDoc: updateDoc requires the document to already exist and
  // rejects outright if it does not, which is the state every contract is in when its
  // original cloud save failed. That turned "the save didn't go through" into "this contract
  // can never be edited again". Merging writes the changed fields whether the document is
  // already there or is being created by this very call, and leaves every other field alone.
  // Firestore rejects `undefined` as a field value outright: one undefined key fails the whole
  // write with "Unsupported field value: undefined", taking every other edit in the same call
  // down with it — an admin changing the price, the status and the notes loses all three
  // because one unrelated optional field happened to be empty. Optional fields legitimately
  // arrive here unset, so they are dropped instead of sent; under merge:true an absent key
  // means "leave this as it is", which is exactly what "I didn't touch it" should mean.
  const cleanPayload = Object.fromEntries(
    Object.entries(updatePayload).filter(([, value]) => value !== undefined)
  );

  /* التكلفة لا تُكتب داخل مستند العقد.
     قاعدة العقود تسمح لصاحب العقد بقراءة مستنده، وقراءة Firestore كلٌّ لا يتجزأ — فحقل
     `costIQD` داخل العقد كان مقروءاً لكل عميل مهما أخفته الواجهة، أي أن كل زبون يعرف تكلفتنا
     وهامش ربحنا من مشروعه. تُكتب هنا في مجموعة أدمن-فقط، ويُمحى الحقل القديم من مستند العقد
     في نفس الحفظة (deleteField) فتُرحَّل العقود السابقة تلقائياً أول مرة تُعدَّل. */
  /* الحالة "قبل" تُقرأ من النسخة المحلية التي تحملها اللوحة أصلاً (نفس المصدر الذي يعرض
     الأرقام على الشاشة)، لا بقراءة إضافية من Firestore: قراءة ثانية لكل حفظة تكلفة بلا مقابل،
     والفارق الوحيد حالة نادرة يكون فيها زميل قد عدّل العقد في نفس اللحظة — وحتى عندها يبقى
     السطر صحيحاً في "إلى ماذا" وقد يخطئ في "من ماذا" فقط. */
  let previousState: ContractData | undefined;
  try {
    const local: ContractData[] = JSON.parse(localStorage.getItem(LOCAL_CONTRACTS_KEY) || '[]');
    previousState = local.find((c) => (c.contractNumber || '').trim() === docId);
  } catch {
    previousState = undefined;
  }

  const { costIQD, ...contractOnlyPayload } = cleanPayload as Record<string, unknown> & { costIQD?: number };

  if (costIQD !== undefined) {
    /* الكتابة الثانوية لا تُسقط الأساسية.
       كانت هذه الكتابة تسبق كتابة العقد وترمي عند فشلها، فيفشل حفظ العقد كله بسببها — وهو ما
       يحدث حرفياً قبل نشر القواعد الجديدة: مجموعة `contract_finance` بلا قاعدة منشورة تُرفض
       بالافتراض، فيظهر للأدمن "تعذر حفظ التعديلات" بينما السعر والتوقيع والحالة كلها سليمة ولا
       علاقة لها بالتكلفة. الآن: تُحاوَل، وإن فشلت تبقى التكلفة في مستند العقد كما كانت ويستمر
       الحفظ. */
    try {
      await setDoc(
        doc(db, CONTRACT_FINANCE_COLLECTION, docId),
        { costIQD, contractNumber: docId, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      contractOnlyPayload.costIQD = deleteField();
    } catch (error) {
      console.error('contract_finance write failed (contract still saved):', error);
      contractOnlyPayload.costIQD = costIQD;
    }
  }

  await setDoc(doc(db, CONTRACTS_COLLECTION, docId), contractOnlyPayload, { merge: true });

  // بعد نجاح الكتابة لا قبلها: سجل يقول "غُيّر السعر" عن تعديل فشل هو تزوير للسجل لا حماية له.
  await writeAuditEntry(previousState, { ...fields }, docId);

  // Keep the local cache in sync so the admin list doesn't flash back to the old value
  // before Firestore's onSnapshot round-trip completes. Matched on either identifier, for the
  // same reason the document is: the two are not always the same string.
  try {
    const localContracts: ContractData[] = JSON.parse(localStorage.getItem(LOCAL_CONTRACTS_KEY) || '[]');
    const idx = localContracts.findIndex(
      (c) =>
        (contract.id && c.id === contract.id) ||
        (contract.contractNumber && (c.contractNumber || '').trim() === contract.contractNumber.trim())
    );
    if (idx >= 0) {
      localContracts[idx] = { ...localContracts[idx], ...updatePayload };
      localStorage.setItem(LOCAL_CONTRACTS_KEY, JSON.stringify(localContracts));
      // Tells subscribeToContracts' local-update listener to re-read, so an edit made while
      // the cloud is unreachable still shows up in the list instead of appearing to do nothing.
      window.dispatchEvent(new Event(LOCAL_UPDATED_EVENT));
    }
  } catch {
    // non-critical
  }
}

// Fetch all Contracts from Firestore with local fallback & deletion filtering
export async function fetchContractsFromFirebase(): Promise<ContractData[]> {
  const deletedSet = getDeletedIdentifiers();
  const filterDeleted = (list: ContractData[]) => list.filter(c => {
    const cId = (c.id || '').trim();
    const cNum = (c.contractNumber || '').trim();
    return (!cId || !deletedSet.has(cId)) && (!cNum || !deletedSet.has(cNum));
  });

  const localContracts: ContractData[] = filterDeleted(JSON.parse(localStorage.getItem(LOCAL_CONTRACTS_KEY) || '[]'));
  try {
    const contractsRef = collection(db, CONTRACTS_COLLECTION);
    const querySnapshot = await getDocs(contractsRef);
    let contracts: ContractData[] = [];
    querySnapshot.forEach((docSnap) => {
      contracts.push({ ...docSnap.data(), id: docSnap.id } as ContractData);
    });
    
    contracts = filterDeleted(contracts);
    contracts.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    const cloudNumbers = new Set(contracts.map(c => (c.contractNumber || '').trim()));
    const pendingLocal = localContracts.filter(c => !cloudNumbers.has((c.contractNumber || '').trim()));
    
    return filterDeleted([...contracts, ...pendingLocal]);
  } catch (error) {
    console.warn('Firestore fetch notice (using local storage fallback):', error);
    return localContracts;
  }
}

// Real-time listener for Contracts with silent offline fallback
/**
 * تكاليف العقود، مفتاحها رقم العقد. للأدمن وحده (القاعدة ترفض غيره)، ويُدمج ناتجها في قائمة
 * العقود داخل لوحة التحكم فقط — فيبقى كل قارئ لاحق يقرأ `contract.costIQD` كما كان.
 */
/**
 * طلب العميل إلغاء عقده — إشعار لنا، لا إلغاء.
 *
 * لا يغيّر حالة العقد ولا يوقف شيئاً: يكتب ختماً زمنياً وسبباً اختيارياً فقط، ليظهر الطلب في
 * لوحة التحكم فنتحدث مع صاحبه. الإلغاء الفعلي (أو حلّ المشكلة وإبقاء العقد) قرار يُتخذ بعد
 * ذلك من اللوحة.
 *
 * قاعدة Firestore تسمح بهذه الكتابة وحدها من العميل، وتشترط ألا تكون هناك دفعة مستلَمة — فحتى
 * لو عُدِّلت الواجهة أو كُتب الطلب من الكونسول، الرفض يأتي من الخادم.
 */
/** الحقول التي يُسجَّل تغيّرها. الباقي (طوابع الوقت مثلاً) ضجيج يغرق السجل بلا فائدة. */
const AUDITED_FIELDS: (keyof ContractData)[] = [
  'status',
  'totalPriceIQD',
  'deliveryTimelineWeeks',
  'paymentPlan',
  'adminNotes',
  'previewUrl',
  'installmentsPlanned',
  'paidAmountIQD',
  'paymentStatus',
  'costIQD',
  'companySignatureDataUrl',
  'cancellationRequestedAt',
];

/** قيمة مختصرة صالحة للتخزين: التواقيع صور بحجم عشرات الكيلوبايتات، والسجل يحتاج أن يعرف
 *  "وُضع توقيع" لا أن يحتفظ بنسخة ثانية منه. */
function auditValue(field: keyof ContractData, value: unknown): unknown {
  if (value === undefined) return null;
  if (field === 'companySignatureDataUrl') return value ? 'signed' : 'cleared';
  if (typeof value === 'string' && value.length > 300) return `${value.slice(0, 300)}…`;
  return value as unknown;
}

/**
 * يكتب سطر تدقيق واحداً لكل حفظة إدارية غيّرت شيئاً فعلاً.
 *
 * لا يرمي أبداً: فشل الكتابة هنا يجب ألا يُسقط الحفظة نفسها — تعديل نجح وسجلٌّ لم يُكتب أهون
 * من تعديل رُفض لأن سجله فشل. الفشل يُسجَّل في الكونسول ليُرى.
 */
async function writeAuditEntry(
  before: ContractData | undefined,
  after: Partial<ContractData>,
  contractNumber: string
): Promise<void> {
  try {
    const email = (auth.currentUser?.email || '').trim().toLowerCase();
    if (!email) return;

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const field of AUDITED_FIELDS) {
      if (!(field in after)) continue;
      const nextValue = (after as unknown as Record<string, unknown>)[field];
      const prevValue = before ? (before as unknown as Record<string, unknown>)[field] : undefined;
      if (JSON.stringify(prevValue ?? null) === JSON.stringify(nextValue ?? null)) continue;
      changes[field] = { from: auditValue(field, prevValue), to: auditValue(field, nextValue) };
    }
    if (Object.keys(changes).length === 0) return;

    await setDoc(doc(collection(db, CONTRACT_AUDIT_COLLECTION)), {
      contractNumber,
      actorEmail: email,
      at: new Date().toISOString(),
      changes,
    });
  } catch (error) {
    console.error('audit log write failed:', error);
  }
}

/** أسطر التدقيق الخاصة بعقد واحد، الأحدث أولاً. للأدمن فقط. */
export async function fetchContractAudit(contractNumber: string) {
  const snap = await getDocs(
    query(collection(db, CONTRACT_AUDIT_COLLECTION), where('contractNumber', '==', contractNumber))
  );
  return snap.docs
    .map((d) => d.data() as { actorEmail: string; at: string; changes: Record<string, { from: unknown; to: unknown }> })
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

export async function requestContractCancellation(
  contract: Pick<ContractData, 'id' | 'contractNumber'>,
  reason: string
): Promise<void> {
  const docId = (contract.contractNumber || '').trim() || (contract.id || '').trim();
  if (!docId) throw new Error('Cannot request cancellation without a contract number');

  const payload: Record<string, unknown> = {
    cancellationRequestedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const trimmed = reason.trim();
  if (trimmed) payload.cancellationReason = trimmed.slice(0, 1900);

  // updateDoc لا setDoc: الطلب يقع على عقد قائم دائماً، والقاعدة تقارن الحقول المتغيّرة بالمستند
  // الموجود (diff) — وهي مقارنة لا معنى لها لو أنشأت هذه الدالة مستنداً جديداً.
  await updateDoc(doc(db, CONTRACTS_COLLECTION, docId), payload);

  try {
    const local: ContractData[] = JSON.parse(localStorage.getItem(LOCAL_CONTRACTS_KEY) || '[]');
    const idx = local.findIndex((c) => (c.contractNumber || '').trim() === docId);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...(payload as Partial<ContractData>) };
      localStorage.setItem(LOCAL_CONTRACTS_KEY, JSON.stringify(local));
      window.dispatchEvent(new Event(LOCAL_UPDATED_EVENT));
    }
  } catch {
    // النسخة المحلية مرآة لا مصدر — فشلها لا يبطل طلباً وصل إلى Firestore.
  }
}

export function subscribeToContractCosts(callback: (costs: Record<string, number>) => void) {
  try {
    return onSnapshot(
      collection(db, CONTRACT_FINANCE_COLLECTION),
      (snap) => {
        const costs: Record<string, number> = {};
        snap.forEach((d) => {
          const value = (d.data() as { costIQD?: number }).costIQD;
          if (typeof value === 'number') costs[d.id] = value;
        });
        callback(costs);
      },
      // غير أدمن = رفض متوقَّع لا عطل: لوحة العميل لا تستدعي هذه أصلاً، والرفض هنا يعني ببساطة
      // أن التكاليف لا تُعرض — لا أن الصفحة تتعطّل.
      (error) => console.error('contract costs subscription error:', error)
    );
  } catch (error) {
    console.error('contract costs subscription error:', error);
    return () => {};
  }
}

export function subscribeToContracts(callback: (contracts: ContractData[]) => void) {
  const getLocalData = (): ContractData[] => {
    try {
      const deletedSet = getDeletedIdentifiers();
      const list: ContractData[] = JSON.parse(localStorage.getItem(LOCAL_CONTRACTS_KEY) || '[]');
      return list.filter(c => {
        const cId = (c.id || '').trim();
        const cNum = (c.contractNumber || '').trim();
        return (!cId || !deletedSet.has(cId)) && (!cNum || !deletedSet.has(cNum));
      });
    } catch {
      return [];
    }
  };

  const notify = (contracts: ContractData[]) => {
    const deletedSet = getDeletedIdentifiers();
    const clean = contracts.filter(c => {
      const cId = (c.id || '').trim();
      const cNum = (c.contractNumber || '').trim();
      return (!cId || !deletedSet.has(cId)) && (!cNum || !deletedSet.has(cNum));
    });
    callback(clean);
  };

  // Event listener for local updates
  const handleLocalUpdate = () => {
    fetchContractsFromFirebase().then(notify).catch(() => notify(getLocalData()));
  };
  window.addEventListener(LOCAL_UPDATED_EVENT, handleLocalUpdate);

  try {
    const contractsRef = collection(db, CONTRACTS_COLLECTION);
    let unsubscribeSnapshot: (() => void) | null = null;
    
    unsubscribeSnapshot = onSnapshot(
      contractsRef, 
      (snapshot) => {
        try {
          const contracts: ContractData[] = [];
          snapshot.forEach((docSnap) => {
            contracts.push({ ...docSnap.data(), id: docSnap.id } as ContractData);
          });
          
          contracts.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });

          const cloudNumbers = new Set(contracts.map(c => (c.contractNumber || '').trim()));
          /* نفس التوفيق الذي يجري في اشتراك العميل: نسخة محلّية وصلت الخادم ثم غابت عنه
             محذوفة، لا "بانتظار المزامنة" — وإعادة إظهارها كانت تعيد عقوداً محذوفة. */
          const pendingLocal = reconcileLocalWithCloud(cloudNumbers);
          notify([...contracts, ...pendingLocal]);
        } catch {
          notify(getLocalData());
        }
      }, 
      (_err) => {
        console.warn('Firestore snapshot notice (falling back to local data):', _err?.message || 'Offline/Rate limit');
        notify(getLocalData());
      }
    );

    return () => {
      window.removeEventListener(LOCAL_UPDATED_EVENT, handleLocalUpdate);
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  } catch (_error) {
    notify(getLocalData());
    return () => {
      window.removeEventListener(LOCAL_UPDATED_EVENT, handleLocalUpdate);
    };
  }
}

// Real-time listener for a single customer's own contracts.
//
// This is a SEPARATE subscription from subscribeToContracts (which reads every contract) for a
// reason the admin and customer views share nothing on: the Firestore rules only let a customer
// read documents they own (`ownsContract()` — see firestore.rules), and a collection query with
// no filter is rejected by those rules even when the client would only ever display their own.
// A `where('uid', '==', uid)` query is exactly the shape the rules accept, so the customer sees
// real-time updates (status, NUVAIQ's signature, admin notes) the moment the admin saves them —
// the same live subscription the admin dashboard uses, scoped to their own documents.
export function subscribeToMyContracts(
  uid: string | undefined,
  email: string | undefined,
  callback: (contracts: ContractData[]) => void
) {
  const accountEmail = (email || '').trim().toLowerCase();

  const owns = (c: ContractData) => {
    if (uid && c.uid && c.uid === uid) return true;
    const cEmail = (c.email || c.clientEmail || '').trim().toLowerCase();
    return !!accountEmail && !!cEmail && cEmail === accountEmail;
  };

  const notify = (contracts: ContractData[]) => {
    const deletedSet = getDeletedIdentifiers();
    const clean = contracts.filter((c) => {
      const cId = (c.id || '').trim();
      const cNum = (c.contractNumber || '').trim();
      const notDeleted = (!cId || !deletedSet.has(cId)) && (!cNum || !deletedSet.has(cNum));
      return notDeleted && owns(c);
    });
    callback(clean);
  };

  try {
    const contractsRef = collection(db, CONTRACTS_COLLECTION);
    const q = uid ? query(contractsRef, where('uid', '==', uid)) : contractsRef;

    // Local storage carry-over: contracts saved while the cloud sync failed live here, and a
    // customer should still see the contract they just created even if it has not reached
    // Firestore yet. Merged under the snapshot, deduplicated by contractNumber.
    const getLocalData = (): ContractData[] => {
      try {
        const deletedSet = getDeletedIdentifiers();
        return (JSON.parse(localStorage.getItem(LOCAL_CONTRACTS_KEY) || '[]') as ContractData[]).filter((c) => {
          const cId = (c.id || '').trim();
          const cNum = (c.contractNumber || '').trim();
          return (!cId || !deletedSet.has(cId)) && (!cNum || !deletedSet.has(cNum));
        });
      } catch {
        return [];
      }
    };

    const handleLocalUpdate = () => {
      notify(getLocalData());
    };
    window.addEventListener(LOCAL_UPDATED_EVENT, handleLocalUpdate);

    const unsubscribeSnapshot = onSnapshot(
      q,
      (snapshot) => {
        const contracts: ContractData[] = [];
        snapshot.forEach((docSnap) => {
          contracts.push({ ...docSnap.data(), id: docSnap.id } as ContractData);
        });
        contracts.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
        const cloudNumbers = new Set(contracts.map((c) => (c.contractNumber || '').trim()));
        /* المحلّي لا يُعيد إحياء ما حُذف: `reconcileLocalWithCloud` تُعيد ما لم يصل الخادم
           بعد فقط، وتمسح من التخزين كل نسخة وصلته ثم غابت عنه. */
        notify([...contracts, ...reconcileLocalWithCloud(cloudNumbers)]);
      },
      (_err) => {
        console.warn('Customer contract snapshot notice (falling back to local data):', _err?.message || 'Offline/Rate limit');
        notify(getLocalData());
      }
    );

    return () => {
      window.removeEventListener(LOCAL_UPDATED_EVENT, handleLocalUpdate);
      unsubscribeSnapshot();
    };
  } catch (_error) {
    return () => undefined;
  }
}

/**
 * حذف العقد — من الخادم أوّلاً، ثم من هذا المتصفح.
 *
 * ## العطل الذي كان هنا
 *
 * كان الترتيب معكوساً: يُسجَّل المُعرِّف في سجلّ "المحذوفات" المحلّي، ثم يُمسح من التخزين
 * المحلّي، ثم — أخيراً — تُحاوَل الكتابة على Firestore داخل `try` لا يفعل عند الفشل سوى
 * `console.warn`، ومعه `deleteDoc(...).catch(() => {})` يبتلع الخطأ حرفياً.
 *
 * فإذا رفض الخادم الحذف (القواعد غير منشورة، أو `isAdmin()` تُقيَّم false لأي سبب) كانت
 * النتيجة أسوأ ما يمكن: **المستند باقٍ في Firestore، ومخفيّ عن الأدمن وحده.** لوحة التحكم
 * تُصفّي بسجلّ المحذوفات المحلّي فتُظهر الحذف ناجحاً، بينما العقد ما زال في حساب العميل —
 * وسجلّ المحذوفات يعيش في localStorage، أي في متصفّح الأدمن وحده ولا يصل إلى العميل أبداً.
 *
 * ## الترتيب الصحيح
 *
 * الخادم أوّلاً. إن فشل، يُرمى الخطأ ولا يُخفى شيء محلّياً — فيبقى العقد ظاهراً عندنا كما هو
 * ظاهر عنده، وتظهر رسالة الفشل. الإخفاء المحلّي لا يقع إلا بعد نجاح الحذف فعلاً، وحينها هو
 * مجرّد تسريع للواجهة قبل وصول لقطة Firestore التالية.
 */
export async function deleteContractFromFirebase(contractId?: string, contractNumber?: string): Promise<void> {
  const targetId = (contractId || '').trim();
  const targetNum = (contractNumber || '').trim();

  /* عقد لم يصل الخادم أصلاً (مُعرِّف محلّي وبلا رقم يطابقه هناك): لا شيء يُحذف بعيداً، والحذف
     المحلّي هو كلّ الحذف الممكن. */
  const localOnly = targetId.startsWith('LOCAL_') && !targetNum;

  if (!localOnly) {
    // الحذف بالمُعرِّف حين يوجد، وبمسح المجموعة بحثاً عن الرقم حين لا يوجد — عقد يُعرَف
    // برقمه وحده كان يُترك على الخادم بلا أي محاولة.
    const contractsRef = collection(db, CONTRACTS_COLLECTION);
    const snapshot = await getDocs(contractsRef);
    const targets: string[] = [];
    snapshot.forEach((docSnap) => {
      const docId = docSnap.id;
      const docNum = ((docSnap.data() as ContractData).contractNumber || '').trim();
      const matches =
        (targetId && (docId === targetId || docNum === targetId)) ||
        (targetNum && (docNum === targetNum || docId === targetNum));
      if (matches) targets.push(docId);
    });

    /* الرمي مقصود: لو ابتلعنا الخطأ هنا لعاد العطل نفسه — واجهة تقول "حُذف" وخادم لم يحذف.
       موضع الاستدعاء يعرض الفشل، والعقد يبقى ظاهراً للطرفين. */
    await Promise.all(targets.map((id) => deleteDoc(doc(db, CONTRACTS_COLLECTION, id))));

    /* تحقّق، لا ثقة.
       `deleteDoc` قد يعود دون أن يكون المستند قد اختفى فعلاً (كتابة محلّية غير مؤكَّدة، أو
       رفض يصل متأخراً). وإعلان نجاح لم يقع هو أصل هذا العطل كلّه: عقد يبقى عند صاحبه ونحن
       نظنّه محذوفاً. القراءة ثانيةً تحسم الأمر قبل أن نُخفيه محلّياً. */
    if (targets.length > 0) {
      const after = await getDocs(collection(db, CONTRACTS_COLLECTION));
      const survivors: string[] = [];
      after.forEach((docSnap) => {
        if (targets.includes(docSnap.id)) survivors.push(docSnap.id);
      });
      if (survivors.length > 0) {
        throw new Error(`Contract still present after delete: ${survivors.join(', ')}`);
      }
    }
  }

  // نجح الحذف على الخادم (أو لم يكن هناك ما يُحذف): الآن يُخفى محلّياً.
  markAsDeleted(targetId, targetNum);

  try {
    const localContracts: ContractData[] = JSON.parse(localStorage.getItem(LOCAL_CONTRACTS_KEY) || '[]');
    const filtered = localContracts.filter((c) => {
      const cId = (c.id || '').trim();
      const cNum = (c.contractNumber || '').trim();
      if (targetId && (cId === targetId || cNum === targetId)) return false;
      if (targetNum && (cNum === targetNum || cId === targetNum)) return false;
      return true;
    });
    localStorage.setItem(LOCAL_CONTRACTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('LocalStorage delete error:', e);
  }

  window.dispatchEvent(new Event(LOCAL_UPDATED_EVENT));
}

/**
 * العقود الحيّة على الخادم والمخفيّة في هذا المتصفح وحده.
 *
 * هذه هي حصيلة العطل أعلاه: كل عقد سُجِّل في سجلّ المحذوفات المحلّي بينما فشل حذفه فعلياً.
 * العميل ما زال يراه في حسابه، ونحن لا نراه إطلاقاً — فلا نعرف بوجوده لنحذفه من جديد.
 * تقرأ Firestore مباشرة بلا تصفية بالسجلّ، وتُعيد ما يطابقه.
 */
export async function fetchSuppressedContracts(): Promise<ContractData[]> {
  const deletedSet = getDeletedIdentifiers();
  if (deletedSet.size === 0) return [];
  const snapshot = await getDocs(collection(db, CONTRACTS_COLLECTION));
  const found: ContractData[] = [];
  snapshot.forEach((docSnap) => {
    const data = { ...(docSnap.data() as ContractData), id: docSnap.id };
    const cId = (data.id || '').trim();
    const cNum = (data.contractNumber || '').trim();
    if ((cId && deletedSet.has(cId)) || (cNum && deletedSet.has(cNum))) found.push(data);
  });
  return found;
}

/** يرفع الإخفاء المحلّي عن عقد، فيعود ظاهراً في لوحة التحكم كما هو ظاهر عند صاحبه. */
export function restoreSuppressedContract(contractId?: string, contractNumber?: string): void {
  unmarkDeleted(contractId, contractNumber);
  window.dispatchEvent(new Event(LOCAL_UPDATED_EVENT));
}


