export interface FeatureAccess {
  admissions: boolean;
  studentManagement: boolean;
  parentPortal: boolean;
  teacherPortal: boolean;
  attendance: boolean;
  timetable: boolean;
  assignments: boolean;
  exams: boolean;
  results: boolean;
  doubts: boolean;
  fees: boolean;
  payroll: boolean;
  income: boolean;
  expenses: boolean;
  notifications: boolean;
  sms: boolean;
  whatsapp: boolean;
  email: boolean;
  reports: boolean;
  auditLogs: boolean;
  importExport: boolean;
  apiAccess: boolean;
}

export interface SupportConfig {
  emailSupport: boolean;
  chatSupport: boolean;
  phoneSupport: boolean;
  dedicatedAccountManager: boolean;
  onboardingAssistance: boolean;
}

export interface BrandingConfig {
  whiteLabel: boolean;
  customDomain: boolean;
  customLogo: boolean;
  customEmailTemplates: boolean;
}

export interface IntegrationConfig {
  razorpay: boolean;
  cashfree: boolean;
  whatsappBusiness: boolean;
  zoom: boolean;
  googleMeet: boolean;
  googleCalendar: boolean;
  biometricDevices: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'Active' | 'Inactive';
  displayOrder: number;
  monthlyPrice: number;
  quarterlyPrice: number;
  halfYearlyPrice: number;
  yearlyPrice: number;
  lifetimePrice: number;
  currency: string;
  trialDays: number;
  setupFee: number;
  autoRenewal: boolean;
  maxBranches: number;
  maxStaffUsers: number;
  maxStudents: number;
  maxParents: number;
  maxTeachers: number;
  maxStorage: string;
  maxFileSize: string;
  maxSmsCredits: number;
  maxWhatsappMsgs: number;
  features: FeatureAccess;
  support: SupportConfig;
  branding: BrandingConfig;
  integrations: IntegrationConfig;
  notes: string;
  visibleTo?: string[];
}

export type BillingCycle = 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly' | 'Lifetime';

export const getPrimaryPlanPrice = (plan: SubscriptionPlan): { billingCycle: BillingCycle; price: number; currency: string } => {
  const prices: { billingCycle: BillingCycle; price: number; currency: string }[] = [
    { billingCycle: 'Monthly', price: plan.monthlyPrice, currency: plan.currency },
    { billingCycle: 'Quarterly', price: plan.quarterlyPrice, currency: plan.currency },
    { billingCycle: 'Half-Yearly', price: plan.halfYearlyPrice, currency: plan.currency },
    { billingCycle: 'Yearly', price: plan.yearlyPrice, currency: plan.currency },
    { billingCycle: 'Lifetime', price: plan.lifetimePrice, currency: plan.currency }
  ];

  return prices.find(option => option.price > 0) || prices[0];
};

export interface TenantSubscription {
  id: string;
  tenantId: string;
  tenantName: string;
  planId: string;
  planName: string;
  startDate: string;
  expiryDate: string;
  billingCycle: 'Monthly' | 'Quarterly' | 'Yearly' | 'Lifetime';
  status: 'Active' | 'Expired' | 'Cancelled' | 'Trial' | 'Pending';
  discount: number;
  finalPrice: number;
  tax: number;
  invoiceNumber: string;
  overrides: {
    maxBranches?: number;
    maxStaffUsers?: number;
    maxStudents?: number;
    maxParents?: number;
    maxTeachers?: number;
    maxStorage?: string;
    maxFileSize?: string;
    maxSmsCredits?: number;
    maxWhatsappMsgs?: number;
  };
}

export interface Invoice {
  id: string;
  tenantName: string;
  amount: number;
  tax: number;
  date: string;
  dueDate: string;
  status: 'Paid' | 'Unpaid' | 'Overdue' | 'Refunded';
}

export const DEFAULT_FEATURES: FeatureAccess = {
  admissions: false, studentManagement: false, parentPortal: false,
  teacherPortal: false, attendance: false, timetable: false,
  assignments: false, exams: false, results: false, doubts: false,
  fees: false, payroll: false, income: false, expenses: false,
  notifications: false, sms: false, whatsapp: false, email: false,
  reports: false, auditLogs: false, importExport: false, apiAccess: false
};

export const DEFAULT_SUPPORT: SupportConfig = {
  emailSupport: false, chatSupport: false, phoneSupport: false,
  dedicatedAccountManager: false, onboardingAssistance: false
};

export const DEFAULT_BRANDING: BrandingConfig = {
  whiteLabel: false, customDomain: false, customLogo: false, customEmailTemplates: false
};

export const DEFAULT_INTEGRATIONS: IntegrationConfig = {
  razorpay: false, cashfree: false, whatsappBusiness: false,
  zoom: false, googleMeet: false, googleCalendar: false,
  biometricDevices: false
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
