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
  
  // Status
  status: 'draft' | 'submitted' | 'under_review' | 'in_development' | 'completed';
  createdAt: string;
  updatedAt?: string;
}

export interface AIConsultationState {
  prompt: string;
  response: string;
  isLoading: boolean;
}
