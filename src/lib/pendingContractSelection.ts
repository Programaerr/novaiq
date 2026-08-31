// Hand-off channel between the standalone `?live=` tab (a separate document — see main.tsx,
// TemplateLivePage.tsx) and the main app: when a customer hits "order this template" while
// previewing in that tab, there is no React state in common with App.tsx to carry the
// selection through. Same-origin localStorage is what bridges the two documents, exactly
// like the language/currency preferences already do.
const KEY = 'nuvaiq_pending_contract_selection';

export interface PendingContractSelection {
  templateId: string;
  customNotes?: string;
  primaryColorHex?: string;
  projectType?: 'website' | 'app';
}

export function writePendingContractSelection(selection: PendingContractSelection): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(selection));
  } catch {
    // Storage unavailable — the hand-off just won't happen; worst case the customer lands
    // on an empty contract builder instead of a broken page.
  }
}

/** Reads and clears the pending selection in one step — consumed at most once, so a stale
 *  entry can never re-apply itself on some later, unrelated visit to the contract page. */
export function consumePendingContractSelection(): PendingContractSelection | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    return JSON.parse(raw) as PendingContractSelection;
  } catch {
    return null;
  }
}
