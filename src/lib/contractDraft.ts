const DRAFT_KEY = 'nuvaiq_contract_draft';

/**
 * Bumped when a stored draft has to be read differently from how it was written.
 *
 * 2 — the three brand colours became optional. Before this, they started on defaults and the
 *     builder saved its state on mount, so a draft could carry three colours nobody had chosen.
 */
const DRAFT_VERSION = 2;

/**
 * What each colour slot started on before it could be empty. Frozen on purpose: these are a
 * historical fact about drafts already sitting in people's browsers, not today's defaults, and
 * they must not follow if the colour dialogs are ever opened at different values.
 */
const RETIRED_DEFAULTS = ['#8b5cf6', '#10b981', '#f59e0b'];

export interface ContractDraft {
  /** Absent on anything written before DRAFT_VERSION existed. Set by saveContractDraft. */
  v?: number;
  companyName: string;
  crNumber: string;
  repName: string;
  email: string;
  phone: string;
  city: string;
  customFeaturesText: string;
  primaryColor: string;
  secondColor?: string;
  thirdColor?: string;
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
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<ContractDraft>;
    if ((draft.v ?? 1) >= 2) return draft;

    /* A draft from before colours were optional. Any slot still holding exactly the value that
       slot used to start on was filled in by the page rather than by the customer, so it is
       cleared and the tile opens empty the way an untouched tile should.

       Per slot, not all-or-nothing: someone who picked colour 1 and left 2 and 3 alone had two
       colours put in their contract that they never chose, and that is the thing being fixed.
       The cost is the other direction — a customer who deliberately picked the exact value
       their slot already held loses it and picks again. Nothing distinguishes the two cases in
       what was stored, and of the two mistakes, printing an unchosen colour onto a signed
       contract is the one that matters.

       This runs once. The builder saves on mount, so the very next write stamps v2 and no later
       load looks at these values again. */
    const keep = (hex: string | undefined, slot: number) =>
      hex && hex.toLowerCase() !== RETIRED_DEFAULTS[slot] ? hex : '';
    return {
      ...draft,
      primaryColor: keep(draft.primaryColor, 0),
      secondColor: keep(draft.secondColor, 1),
      thirdColor: keep(draft.thirdColor, 2),
    };
  } catch {
    return null;
  }
}

export function saveContractDraft(draft: ContractDraft): void {
  try {
    /* Stamped here rather than by the caller: the version describes the shape this module
       writes, and nothing outside it should have to know or remember to set it. */
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, v: DRAFT_VERSION }));
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
