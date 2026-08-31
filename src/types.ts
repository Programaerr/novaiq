export interface TemplateFeature {
  name: string;
  included: boolean;
}

/** سعر ووصف طريقة تسليم واحدة لقالب — موقع إلكتروني أو تطبيق هاتف، كل واحد له رقمه
 *  ونصّه الخاص بدل سعر واحد مشترك للاثنين. انظر resolveVariant في lib/pricingOverrides.ts. */
export interface TemplateVariant {
  priceIQD: number;
  priceUSD: number;
  description: string;
}

export interface Template {
  id: string;
  title: string;
  subtitle: string;
  category: 'corporate' | 'ecommerce' | 'realestate' | 'healthcare' | 'fintech'
    | 'restaurant' | 'education' | 'mobile' | 'watches' | 'cars' | 'marketing';
  categoryLabel: string;
  description: string;
  longDescription: string;
  previewImage: string;
  demoUrl?: string;
  basePriceIQD: number;
  basePriceUSD: number;
  basePriceSAR?: number;
  deliveryWeeks: number;
  tags: string[];
  features: string[];
  techStack: string[];
  mockScreens: {
    title: string;
    description: string;
    colorGrad: string;
    contentPreview: string;
  }[];
  /** تسعير ووصف مستقلان لـ"موقع إلكتروني" و"تطبيق هاتف" — اختياري: قالب بدونه يستخدم
   *  basePriceIQD/USD والوصف العام الموحّد كافتراضي لكلا الخيارين. */
  variants?: {
    website: TemplateVariant;
    app: TemplateVariant;
  };
}

/** Sentinel `ContractData.templateId` for a fully custom (non-catalogue) project — the one
 *  place both the contract form and anything reading a finished contract need to agree on
 *  what "no ready-made template was picked" looks like. */
export const CUSTOM_PROJECT_TEMPLATE_ID = '__custom__';

/** One entry in a contract's payment ledger (see `ContractData.payments`) — logged, edited,
 *  or removed individually so a mistyped amount doesn't force overwriting a single running
 *  total and losing track of what was actually received and when. */
export interface PaymentRecord {
  id: string;
  amountIQD: number;
  /** ISO date (yyyy-mm-dd) the payment was received. */
  date: string;
  note?: string;
}

export interface ContractData {
  id?: string;
  // The creating account's Firebase Auth uid — the basis Firestore security rules use to
  // confirm a customer owns a contract (see firestore.rules). Optional because contracts
  // created before this field existed don't have it; those fall back to an email match.
  uid?: string;
  contractNumber: string;
  companyName: string;
  crNumber: string; // Commercial Register number
  repName: string; // Representative Name
  email: string;
  phone: string;
  city: string;
  
  // Aliases for legacy views
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  
  // Template selection
  templateId: string;
  templateTitle: string;
  
  // Customizations. The priced add-on checklist that used to sit here is gone: anything the
  // customer wants beyond the template itself is written in `customFeaturesText` and quoted by
  // us, rather than assembled from a menu of options they had no way to evaluate.
  customFeaturesText: string;
  primaryColor: string;
  themePreference: 'dark' | 'light' | 'both';
  languageSupport: 'ar' | 'en' | 'ar_en';
  
  // Terms & Financial
  basePriceIQD: number;
  totalPriceIQD: number;
  // Legacy compatibility fields
  basePriceSAR?: number;
  totalPriceSAR?: number;
  paymentPlan: '50_50' | '100_upfront' | '3_milestones';
  deliveryTimelineWeeks: number;
  
  // Legal & Digital Signature
  signatureDataUrl: string;
  agreedToTerms: boolean;
  // Set only by the admin dashboard — NOVAIQ's own sign-off, shown on the printed contract
  // next to the client's signature so the client can see the work was actually approved.
  companySignatureDataUrl?: string;
  
  // Status
  status: 'draft' | 'submitted' | 'under_review' | 'in_development' | 'completed';
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;

  // Set only by the admin dashboard, after negotiating with the client — appears on the
  // final printed contract as agreed terms, distinct from the client's own original request.
  adminNotes?: string;

  // Internal financial tracking — admin-only (Firestore rules gate all `update`s to admins),
  // never shown on the client's own printed contract. Deliberately separate from `status`
  // (which tracks project progress): a contract can be `completed` and still `unpaid`, or
  // `submitted` and already `paid` in full up front.
  /** What NOVAIQ actually spent to deliver this contract (freelancers, hosting, etc.), entered
   *  manually since there's no other cost-tracking system in the app to derive it from. */
  costIQD?: number;
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  /** Cash actually collected so far. Always recomputed as the sum of `payments` on save
   *  (kept as a plain field, not derived on read, so stats/list views can total it up
   *  without re-summing every contract's ledger) — never edited directly. Kept distinct
   *  from `totalPriceIQD` (the agreed price) so a `partial` contract's real collected
   *  amount is known, not just guessed at — profit is computed as collected minus cost,
   *  not agreed-price minus cost, so money that hasn't actually landed yet is never
   *  counted as realized profit. */
  paidAmountIQD?: number;
  /** The individual payments making up `paidAmountIQD` — lets the admin log, correct, or
   *  remove a single entry (e.g. a mistyped amount) instead of only ever overwriting one
   *  lump sum. `paymentStatus`/`paidAmountIQD` are always derived from this list on save. */
  payments?: PaymentRecord[];
  /** How many installments the client agreed to pay in, if the payment is split (e.g. 3) —
   *  purely informational, to show progress like "2 of 3 paid" in both dashboards. */
  installmentsPlanned?: number;
}
