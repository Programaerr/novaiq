export interface TemplateFeature {
  name: string;
  included: boolean;
}

export interface Template {
  id: string;
  title: string;
  subtitle: string;
  category: 'corporate' | 'ecommerce' | 'realestate' | 'tech' | 'healthcare' | 'fintech'
    | 'restaurant' | 'education' | 'hospitality' | 'logistics';
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
  specificationsOptions: {
    id: string;
    label: string;
    priceIQD: number;
    priceSAR?: number;
    recommended?: boolean;
  }[];
  mockScreens: {
    title: string;
    description: string;
    colorGrad: string;
    contentPreview: string;
  }[];
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
  country: string;
  city: string;
  
  // Aliases for legacy views
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  
  // Template selection
  templateId: string;
  templateTitle: string;
  
  // Customizations
  selectedSpecs: string[];
  customFeaturesText: string;
  primaryColor: string;
  themePreference: 'dark' | 'light' | 'cosmic';
  languageSupport: 'ar' | 'en' | 'ar_en';
  
  // Terms & Financial
  basePriceIQD: number;
  selectedSpecsPriceIQD: number;
  totalPriceIQD: number;
  // Legacy compatibility fields
  basePriceSAR?: number;
  selectedSpecsPriceSAR?: number;
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
  /** Cash actually collected so far. Kept distinct from `totalPriceIQD` (the agreed price) so
   *  a `partial` contract's real collected amount is known, not just guessed at — profit is
   *  computed as collected minus cost, not agreed-price minus cost, so money that hasn't
   *  actually landed yet is never counted as realized profit. */
  paidAmountIQD?: number;
}

export interface AIConsultationState {
  prompt: string;
  response: string;
  isLoading: boolean;
}
