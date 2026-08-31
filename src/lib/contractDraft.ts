const DRAFT_KEY = 'nuvaiq_contract_draft';

export interface ContractDraft {
  companyName: string;
  crNumber: string;
  repName: string;
  email: string;
  phone: string;
  city: string;
  customFeaturesText: string;
  primaryColor: string;
  themePreference: 'dark' | 'light' | 'both';
  languageSupport: 'ar' | 'en' | 'ar_en';
  isCustomProject: boolean;
  customProjectName: string;
}

// Everything the customer types into ContractBuilder is mirrored here so a page refresh,
// an accidental navigation away, or coming back later doesn't mean retyping the whole form
// from scratch. Cleared only once a contract is actually submitted (clearContractDraft).
export function loadContractDraft(): Partial<ContractDraft> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveContractDraft(draft: ContractDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage full or unavailable (private browsing) — draft just won't persist.
  }
}

export function clearContractDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
