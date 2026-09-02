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
  where,
  getDoc,
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
/* ── لا عقد يُخزَّن في المتصفح ───────────────────────────────────────────────────────────
   كان لكل عقد نسخة في localStorage: تُكتب عند الإنشاء، وتُدمج مع لقطة Firestore عند العرض،
   ومعها سجلّ "محذوفات" ثانٍ يخفي ما حُذف. الفكرة كانت شبكة أمان لحفظة فاشلة، والثمن أكبر
   منها بكثير:

   · العقد يبقى على الجهاز بعد حذفه من الخادم — بيانات عميل حقيقية في متصفّح قد يشاركه غيره،
     وبلا أي أثر في قاعدة البيانات يقول إنها هناك.
   · وسجلّ المحذوفات محلّي أيضاً، فحذفٌ يقع في متصفّح الأدمن لا يصل إلى العميل أبداً.
   · وكل شاشة صارت تدمج مصدرين قد يتناقضان، والتوفيق بينهما منطق إضافي يُخطئ.

   المصدر الآن واحد: Firestore. الحذف يقع هناك وينتشر لحظياً عبر `onSnapshot` إلى كل جهاز
   مفتوح، بلا نسخة ثانية تقاومه.

   وما يبقى محلّياً هو **مسودّة النموذج** وحدها (lib/contractDraft.ts): نصّ لم يُوقَّع بعد،
   يخصّ كاتبه، ويُمسح لحظة نجاح الحفظ. */

/* تنظيف لمرّة واحدة على كل جهاز.
   إزالة الكتابة لا تمسح ما كُتب من قبل: العقود المخزَّنة سابقاً تبقى في متصفّح كل من زار
   الموقع حتى تُمسح صراحةً. هذه تمسحها عند أوّل تحميل بعد هذا التحديث. */
(function purgeStoredContracts() {
  try {
    for (const key of ['nuvaiq_contracts', 'nuvaiq_deleted_contracts', 'novaq_contracts', 'novaq_deleted_contracts']) {
      localStorage.removeItem(key);
    }
  } catch {
    // تخزين غير متاح — لا شيء يُمسح، والتطبيق يعمل من Firestore على أي حال.
  }
})();

const CONTRACTS_COLLECTION = 'contracts';
/** التكلفة الداخلية لكل عقد، بعيداً عن مستند العقد الذي يقرؤه صاحبه — انظر firestore.rules. */
const CONTRACT_FINANCE_COLLECTION = 'contract_finance';
/** سجل التدقيق — سطر لكل تعديل إداري، غير قابل للتعديل ولا الحذف (انظر firestore.rules). */
const CONTRACT_AUDIT_COLLECTION = 'contract_audit';

// Helper to track deleted identifiers so Firestore snapshot listeners never resurrect deleted contracts
/**
 * حفظ العقد في Firestore.
 *
 * `contractNumber` هو مُعرِّف المستند — لا `addDoc` ولا فحص "هل هو موجود؟" قبل الكتابة. ذلك
 * الفحص كان يتسابق مع نفسه: حفظتان متقاربتان لنفس العقد تسألان كلتاهما قبل أن تصل أي كتابة،
 * فتستنتجان "غير موجود" وتُنشئان مستندين. الكتابة على مُعرِّف حتمي تجعل الحفظ فكرة واحدة مهما
 * تكرّر النداء.
 *
 * ولا نسخة محلّية: الفشل يُرمى ويُقال للمستخدم (App.handleContractGenerated)، وما كتبه محفوظ
 * في المسودّة حتى ينجح الحفظ فعلاً.
 */
export async function saveContractToFirebase(contract: ContractData): Promise<string> {
  const contractNum = (contract.contractNumber || '').trim();
  const { id: _dropped, ...cleanContract } = contract;
  const docRef = doc(db, CONTRACTS_COLLECTION, contractNum || `NVQ-${Date.now()}`);

  /* تنظيف `undefined`: حقل واحد present-but-undefined يجعل Firestore يرفض المستند كلّه.
     و`serverTimestamp()` كائن إشارة لا `undefined`، فينجو من المرشّح. */
  const docData = Object.fromEntries(
    Object.entries({
      ...cleanContract,
      createdAt: contract.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
    }).filter(([, value]) => value !== undefined)
  );

  await setDoc(docRef, docData, { merge: true });
  return docRef.id;
}

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
  /* الحالة "قبل" تُقرأ من الخادم.
     كانت تُقرأ من النسخة المحلّية توفيراً لقراءة، ومع زوال التخزين المحلّي لم يعد ذلك ممكناً —
     وهو الأصحّ على أي حال: نسخة محلّية قد تكون قديمة، وسجلّ حركات يقول "من ماذا" خطأً هو سجلّ
     لا يُوثق به. قراءة واحدة عند كل حفظة أدمن ثمن مقبول لسطر صحيح. */
  let previousState: ContractData | undefined;
  try {
    const before = await getDoc(doc(db, CONTRACTS_COLLECTION, docId));
    previousState = before.exists() ? ({ ...(before.data() as ContractData), id: before.id }) : undefined;
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

  /* لا مرآة محلّية تُحدَّث بعد الكتابة.
     كانت موجودة لتفادي "وميض" يعود فيه الرقم القديم قبل وصول لقطة Firestore. اللقطة تصل في
     أجزاء من الثانية، وثمن ذلك الوميض المحتمل أرخص بكثير من نسخة ثانية للعقد تعيش على القرص
     وتناقض الخادم عند أول حذف. */
}

// Fetch all Contracts from Firestore with local fallback & deletion filtering
/** كل العقود، من Firestore وحده. لا مصدر ثانٍ يُدمج معه ولا سجلّ محذوفات يُصفّى به. */
export async function fetchContractsFromFirebase(): Promise<ContractData[]> {
  const snapshot = await getDocs(collection(db, CONTRACTS_COLLECTION));
  const contracts: ContractData[] = [];
  snapshot.forEach((docSnap) => {
    contracts.push({ ...(docSnap.data() as ContractData), id: docSnap.id });
  });
  contracts.sort(
    (a, b) =>
      (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0)
  );
  return contracts;
}

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

  /* الطلب وصل إلى Firestore، واللقطة تنشره إلى شاشة العميل وشاشتنا معاً. لا نسخة محلّية
     تُحدَّث بعده — وجودها كان يعني عقداً على القرص يقول شيئاً والخادم يقول غيره. */
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

/**
 * كل العقود، لحظياً. للوحة التحكّم.
 *
 * مصدر واحد: لقطة Firestore. لا دمج مع تخزين محلّي ولا تصفية بسجلّ محذوفات — وهو ما يجعل
 * الحذف ينتشر فوراً إلى كل جهاز مفتوح بدل أن تقاومه نسخة على القرص.
 */
export function subscribeToContracts(callback: (contracts: ContractData[]) => void) {
  try {
    return onSnapshot(
      collection(db, CONTRACTS_COLLECTION),
      (snapshot) => {
        const contracts: ContractData[] = [];
        snapshot.forEach((docSnap) => {
          contracts.push({ ...(docSnap.data() as ContractData), id: docSnap.id });
        });
        contracts.sort(
          (x, y) =>
            (y.createdAt ? new Date(y.createdAt).getTime() : 0) -
            (x.createdAt ? new Date(x.createdAt).getTime() : 0)
        );
        callback(contracts);
      },
      (error) => {
        /* لا قائمة بديلة عند الفشل: قائمة قديمة معروضة كأنها حيّة أسوأ من قائمة فارغة —
           الأدمن يتّخذ قرارات على ما يراه. */
        console.error('Contracts snapshot failed:', error);
        callback([]);
      }
    );
  } catch {
    return () => undefined;
  }
}

/**
 * عقود صاحب الحساب وحده، لحظياً.
 *
 * الاستعلام بـ`uid` حين يوجد؛ والبريد احتياط لعقد أقدم من وجود ذلك الحقل — نفس منطق الملكية
 * في firestore.rules، فما ترفضه القاعدة لا تعرضه الواجهة.
 *
 * ولا نسخة محلّية تُدمج: كانت تُعيد إظهار عقد حُذف من الخادم إلى الأبد، لأن "محلّي وغير موجود
 * في اللقطة" كان يُقرأ كـ"لم يصل السحابة بعد" لا كـ"حُذف".
 */
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

  try {
    const contractsRef = collection(db, CONTRACTS_COLLECTION);
    const q = uid ? query(contractsRef, where('uid', '==', uid)) : contractsRef;

    return onSnapshot(
      q,
      (snapshot) => {
        const contracts: ContractData[] = [];
        snapshot.forEach((docSnap) => {
          contracts.push({ ...(docSnap.data() as ContractData), id: docSnap.id });
        });
        contracts.sort(
          (x, y) =>
            (y.createdAt ? new Date(y.createdAt).getTime() : 0) -
            (x.createdAt ? new Date(x.createdAt).getTime() : 0)
        );
        callback(contracts.filter(owns));
      },
      (error) => {
        console.error('Customer contracts snapshot failed:', error);
        callback([]);
      }
    );
  } catch {
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

  /* لا شيء يُفعَل محلّياً بعد النجاح: لا نسخة تُمسح ولا مُعرِّف يُسجَّل في سجلّ محذوفات.
     لقطة Firestore تُسقط العقد من كل جهاز مفتوح خلال أجزاء من الثانية، وهي المصدر الوحيد —
     ولهذا صار الحذف نهائياً فعلاً بدل أن يبقى محلّياً عند صاحبه. */
}

/* دالّتا `fetchSuppressedContracts` و`restoreSuppressedContract` حُذفتا مع سجلّ المحذوفات.
   وُجدتا لعلاج أثره: عقود أُخفيت محلّياً ولم تُحذف من الخادم. ومع زوال السجلّ لا يمكن أن
   تنشأ تلك الحالة أصلاً — ودالّة تُصلح عطلاً مستحيلاً هي كود ميت يُقرأ كميزة. */
