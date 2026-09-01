import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  getDocs,
  onSnapshot,
  doc,
  setDoc,
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

// Pass databaseId if provided in config
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth: Auth = getAuth(app);

/* مفاتيح النسخة المحلية. كانت مكتوبة حرفياً كـ'novaq_…' — بلا حرف الياء، بقية من الاسم
   القديم قبل NUVAIQ، ومخالفة لكل مفاتيح التطبيق الأخرى ('nuvaiq_…'). الاسم الجديد هو
   المستعمل، والقديم يُقرأ مرة واحدة عند أول تشغيل وتُنقل بياناته إليه (migrateLegacyKeys
   أدناه) حتى لا يفقد أحد عقوداً محفوظة على جهازه أثناء مزامنة فاشلة. */
const LOCAL_CONTRACTS_KEY = 'nuvaiq_contracts';
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

// Helper to track deleted identifiers so Firestore snapshot listeners never resurrect deleted contracts
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
  fields: Partial<Pick<ContractData, 'status' | 'totalPriceIQD' | 'adminNotes' | 'companySignatureDataUrl' | 'companySignatureInk' | 'costIQD' | 'paymentStatus' | 'paidAmountIQD' | 'payments' | 'installmentsPlanned' | 'previewUrl' | 'deliveryTimelineWeeks' | 'paymentPlan'>>
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
  const { costIQD, ...contractOnlyPayload } = cleanPayload as Record<string, unknown> & { costIQD?: number };

  if (costIQD !== undefined) {
    await setDoc(
      doc(db, CONTRACT_FINANCE_COLLECTION, docId),
      { costIQD, contractNumber: docId, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    contractOnlyPayload.costIQD = deleteField();
  }

  await setDoc(doc(db, CONTRACTS_COLLECTION, docId), contractOnlyPayload, { merge: true });

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

          const localContracts = getLocalData();
          const cloudNumbers = new Set(contracts.map(c => (c.contractNumber || '').trim()));
          const pendingLocal = localContracts.filter(c => !cloudNumbers.has((c.contractNumber || '').trim()));
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
        const pendingLocal = getLocalData().filter((c) => !cloudNumbers.has((c.contractNumber || '').trim()));
        notify([...contracts, ...pendingLocal]);
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

// Delete Contract from Local Storage and Firestore completely
export async function deleteContractFromFirebase(contractId?: string, contractNumber?: string): Promise<void> {
  const targetId = (contractId || '').trim();
  const targetNum = (contractNumber || '').trim();

  // 1. Instantly record in deleted identifiers registry
  markAsDeleted(targetId, targetNum);

  // 2. Instantly purge from LocalStorage
  try {
    const localContracts: ContractData[] = JSON.parse(localStorage.getItem(LOCAL_CONTRACTS_KEY) || '[]');
    const filtered = localContracts.filter(c => {
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

  // 3. Dispatch local update event immediately
  window.dispatchEvent(new Event(LOCAL_UPDATED_EVENT));

  // 4. Delete from Firestore asynchronously
  try {
    if (targetId && !targetId.startsWith('LOCAL_')) {
      await deleteDoc(doc(db, CONTRACTS_COLLECTION, targetId)).catch(() => {});
    }

    const contractsRef = collection(db, CONTRACTS_COLLECTION);
    const querySnapshot = await getDocs(contractsRef);
    const deletePromises: Promise<void>[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const docNum = (data.contractNumber || '').trim();

      if (
        (targetId && (docId === targetId || docNum === targetId)) ||
        (targetNum && (docNum === targetNum || docId === targetNum))
      ) {
        deletePromises.push(deleteDoc(doc(db, CONTRACTS_COLLECTION, docId)));
      }
    });
    await Promise.all(deletePromises);
  } catch (error) {
    console.warn('Firestore delete warning:', error);
  }
}

