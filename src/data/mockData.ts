export type Role = 'saas-admin' | 'inst-admin' | 'branch-admin' | 'counsellor' | 'teacher' | 'finance';

export interface UserProfile {
  name: string;
  email: string;
  role: Role;
  branch?: string;
  tenantId?: string;
  tenantName?: string;
}

export interface Tenant {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  mobile: string;
  branchCount: number;
  studentCount: number;
  status: 'Active' | 'Suspended' | 'Draft';
  plan: string;
  renewalDate: string;
  address?: string;
  gstNo?: string;
  maxBranches?: string;
  maxStudents?: string;
  maxStorage?: string;
  maxFileSize?: string;
  startDate?: string;
  altEmails?: string[];
  defaultEmail?: string;
}

export interface Lead {
  id: string;
  name: string;
  mobile: string;
  course: string;
  branch: string;
  source: string;
  counsellor: string;
  status: 'New Enquiry' | 'Contacted' | 'Follow-up' | 'Demo Scheduled' | 'Interested' | 'Not Interested';
  nextFollowUp: string;
  remarks: string;
  followups: { date: string; type: string; outcome: string; nextDate: string }[];
}

export interface Student {
  id: string;
  studentId: string;
  name: string;
  mobile: string;
  parentMobile: string;
  course: string;
  batch: string;
  branch: string;
  status: 'Registration Pending' | 'Documents Submitted' | 'Verification Pending' | 'Active Student';
  admissionDate: string;
  feePlan: { total: number; paid: number; pending: number };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  details: string;
}

export interface Course {
  name: string;
  code: string;
  fees: number;
  duration: string;
  batches: string;
}

export interface Batch {
  name: string;
  course: string;
  timing: string;
  room: string;
  teacher: string;
}

export interface Branch {
  id?: string;
  name: string;
  code: string;
  admin: string; // ID or Name of branch admin
  adminEmail?: string;
  adminMobile?: string;
  capacity: number;
  status: 'Active' | 'Inactive' | 'Suspended';
  address?: string;
  geolocation?: string; // Lat,Long or map link
  email?: string;
  phone?: string;
  operatingHours?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
  };
  programs?: string[]; // E.g., ['JEE', 'NEET', 'Foundation']
}

export interface Staff {
  name: string;
  email: string;
  role: string;
  branch: string;
  status: 'Active' | 'Inactive';
}

export interface Doubt {
  id: string;
  studentName: string;
  subject: string;
  status: 'Pending' | 'Resolved';
  messages: { sender: 'student' | 'teacher'; text: string; time: string }[];
}

export const INITIAL_TENANTS: Tenant[] = [
  { id: 'VS-001', name: 'Apex IIT Academy', ownerName: 'Dr. Ramesh Kumar', email: 'admin@apexiit.com', defaultEmail: 'admin@apexiit.com', mobile: '9876543210', branchCount: 3, studentCount: 450, status: 'Active', plan: 'Enterprise Pro', startDate: '2026-04-15', renewalDate: '2027-04-15' },
  { id: 'VS-002', name: 'Vanguard Classes', ownerName: 'Sanjay Mishra', email: 'sanjay@vanguard.edu', mobile: '9123456789', branchCount: 1, studentCount: 120, status: 'Active', plan: 'Growth Plan', startDate: '2026-10-20', renewalDate: '2026-11-20' },
  { id: 'VS-003', name: 'Bright Future Tuition', ownerName: 'Anjali Sharma', email: 'anjali@brightfuture.com', mobile: '9988776655', branchCount: 2, studentCount: 80, status: 'Suspended', plan: 'Starter', startDate: '2026-05-18', renewalDate: '2026-06-01' }
];


export const INITIAL_LEADS: Lead[] = [
  {
    id: 'L-101',
    name: 'Aarav Mehta',
    mobile: '9898012345',
    course: 'JEE Prep',
    branch: 'Mumbai West',
    source: 'Google Ads',
    counsellor: 'Priya Sen',
    status: 'New Enquiry',
    nextFollowUp: '2026-07-22',
    remarks: 'Interested in demo lecture.',
    followups: []
  },
  {
    id: 'L-102',
    name: 'Sneha Patil',
    mobile: '9767112233',
    course: 'NEET Batch',
    branch: 'Pune Camp',
    source: 'Referral',
    counsellor: 'Priya Sen',
    status: 'Follow-up',
    nextFollowUp: '2026-07-23',
    remarks: 'Discussing fees with parents.',
    followups: [
      { date: '17 Jul', type: 'Call #1', outcome: 'Asked for brochure & structure', nextDate: '19 Jul' },
      { date: '19 Jul', type: 'Call #2', outcome: 'Interested in demo class', nextDate: '21 Jul' }
    ]
  },
  {
    id: 'L-103',
    name: 'Kabir Malhotra',
    mobile: '9922001144',
    course: 'Class 10 Foundation',
    branch: 'Mumbai West',
    source: 'Flyer Campaign',
    counsellor: 'Amit Verma',
    status: 'Interested',
    nextFollowUp: '2026-07-21',
    remarks: 'Ready to join. Awaiting fee confirmation.',
    followups: [
      { date: '15 Jul', type: 'Walk-in', outcome: 'Counselled regarding modules and structure', nextDate: '18 Jul' },
      { date: '18 Jul', type: 'Call #1', outcome: 'Parent agreed to proceed. Requested discount.', nextDate: '21 Jul' }
    ]
  }
];

export const INITIAL_STUDENTS: Student[] = [
  { id: 'S-201', studentId: 'STU-MUM-2601', name: 'Rohan Deshmukh', mobile: '9877112233', parentMobile: '9877112200', course: 'JEE Prep', batch: 'JEE-Morning-A', branch: 'Mumbai West', status: 'Active Student', admissionDate: '2026-06-15', feePlan: { total: 120000, paid: 80000, pending: 40000 } },
  { id: 'S-202', studentId: 'STU-PUN-2602', name: 'Ishita Roy', mobile: '9554321098', parentMobile: '9554321000', course: 'NEET Batch', batch: 'NEET-Regular-B', branch: 'Pune Camp', status: 'Verification Pending', admissionDate: '2026-07-02', feePlan: { total: 150000, paid: 50000, pending: 100000 } }
];

export const INITIAL_COURSES: Course[] = [
  { name: 'JEE Prep Course', code: 'JEE-PREP', fees: 120000, duration: '2 Years', batches: 'JEE-Morning-A, JEE-Evening-B' },
  { name: 'NEET Batch Premium', code: 'NEET-PREM', fees: 150000, duration: '1 Year', batches: 'NEET-Regular-B' },
  { name: 'Class 10 Foundation', code: 'FOUND-10', fees: 60000, duration: '1 Year', batches: 'FOUND-Class-A' }
];

export const INITIAL_BATCHES: Batch[] = [
  { name: 'JEE-Morning-A', course: 'JEE Prep Course', timing: '09:00 AM - 10:30 AM', room: 'Classroom 101', teacher: 'Prof. Arvind Kelkar' },
  { name: 'JEE-Evening-B', course: 'JEE Prep Course', timing: '05:00 PM - 06:30 PM', room: 'Classroom 101', teacher: 'Prof. Arvind Kelkar' },
  { name: 'NEET-Regular-B', course: 'NEET Batch Premium', timing: '11:00 AM - 12:30 PM', room: 'Classroom 102', teacher: 'Prof. Arvind Kelkar' }
];

export const INITIAL_BRANCHES: Branch[] = [
  { 
    id: 'B-001', name: 'Mumbai West Branch', code: 'MUM-WEST', admin: 'Mrs. Seema Deshpande', adminEmail: 'seema@apexiit.com', adminMobile: '9876543210', capacity: 300, status: 'Active',
    address: '101, Western Heights, Andheri West, Mumbai, 400053', geolocation: '19.1136,72.8697', email: 'mumbaiwest@apexiit.com', phone: '022-26345566', operatingHours: '08:00 AM - 08:00 PM',
    programs: ['JEE', 'NEET', 'Foundation']
  },
  { 
    id: 'B-002', name: 'Pune Camp Branch', code: 'PUN-CAMP', admin: 'Mr. Ramesh Shinde', adminEmail: 'ramesh@apexiit.com', adminMobile: '9123456789', capacity: 150, status: 'Active',
    address: '45, MG Road, Camp, Pune, 411001', geolocation: '18.5158,73.8804', email: 'punecamp@apexiit.com', phone: '020-24445566', operatingHours: '09:00 AM - 06:00 PM',
    programs: ['Foundation']
  }
];

export const INITIAL_STAFF: Staff[] = [
  { name: 'Priya Sen', email: 'priya.counsel@apexiit.com', role: 'Counsellor', branch: 'Mumbai West', status: 'Active' },
  { name: 'Prof. Arvind Kelkar', email: 'arvind.chem@apexiit.com', role: 'Teacher', branch: 'Mumbai West', status: 'Active' },
  { name: 'Nitin Joshi', email: 'nitin.bills@apexiit.com', role: 'Finance', branch: 'Mumbai West', status: 'Active' }
];

export const INITIAL_DOUBTS: Doubt[] = [
  {
    id: 'D-301',
    studentName: 'Rohan Deshmukh',
    subject: 'Chemistry',
    status: 'Pending',
    messages: [
      { sender: 'student', text: 'Professor, I had a doubt in organic chemistry mechanisms. Is electrophilic addition for alkenes always Markovnikov?', time: '11:00 AM' },
      { sender: 'teacher', text: 'Usually yes, as it proceeds via the more stable carbocation intermediate. However, in the presence of peroxides (anti-Markovnikov HBr addition), it follows a free-radical path.', time: '11:15 AM' }
    ]
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'AL-901', timestamp: '2026-07-21 10:15:23', actor: 'SaaS Platform Owner', role: 'SaaS Super Admin', action: 'CREATE_TENANT', details: 'Created tenant: Apex IIT Academy (VS-001)' },
  { id: 'AL-902', timestamp: '2026-07-21 11:30:12', actor: 'Dr. Ramesh Kumar', role: 'Institute Admin', action: 'UPDATE_FEES', details: 'Configured NEET Fee Plan structure' }
];

export const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return cleanStr;
  }
  return dateStr;
};

// ─── Feature Access Flags ─────────────────────────────────────────────────
export interface FeatureAccess {
  // Core ERP
  admissions: boolean;
  studentManagement: boolean;
  parentPortal: boolean;
  teacherPortal: boolean;
  attendance: boolean;
  timetable: boolean;
  // Academic
  assignments: boolean;
  exams: boolean;
  results: boolean;
  doubts: boolean;
  // Finance
  fees: boolean;
  payroll: boolean;
  income: boolean;
  expenses: boolean;
  // Communication
  notifications: boolean;
  sms: boolean;
  whatsapp: boolean;
  email: boolean;
  // Administration
  reports: boolean;
  auditLogs: boolean;
  importExport: boolean;
  apiAccess: boolean;
}

// ─── Support Configuration ─────────────────────────────────────────────────
export interface SupportConfig {
  emailSupport: boolean;
  chatSupport: boolean;
  phoneSupport: boolean;
  dedicatedAccountManager: boolean;
  onboardingAssistance: boolean;
}

// ─── Branding Configuration ────────────────────────────────────────────────
export interface BrandingConfig {
  whiteLabel: boolean;
  customDomain: boolean;
  customLogo: boolean;
  customEmailTemplates: boolean;
}

// ─── Integrations ──────────────────────────────────────────────────────────
export interface IntegrationConfig {
  razorpay: boolean;
  cashfree: boolean;
  biometricDevices: boolean;
  zoom: boolean;
  googleMeet: boolean;
  googleCalendar: boolean;
  whatsappBusiness: boolean;
  apiAccess: boolean;
}

// ─── Plan Master ───────────────────────────────────────────────────────────
export interface SubscriptionPlan {
  id: string;
  // Section 1 – Basic Info
  name: string;
  code: string;
  description: string;
  status: 'Active' | 'Inactive';
  displayOrder: number;
  // Section 2 – Billing
  billingType: 'Monthly' | 'Quarterly' | 'Yearly' | 'Lifetime';
  price: number;
  currency: string;
  trialDays: number;
  setupFee: number;
  renewalPrice: number;
  autoRenewal: boolean;
  // Section 3 – Resource Limits (use -1 for Unlimited)
  maxInstances: number;
  maxBranches: number;
  maxStaffUsers: number;
  maxStudents: number;
  maxParents: number;
  maxTeachers: number;
  maxStorage: string;
  maxFileSize: string;
  maxSmsCredits: number;
  maxWhatsappMsgs: number;
  maxApiCalls: number;
  // Section 4 – Feature Access
  features: FeatureAccess;
  // Section 5 – Support
  support: SupportConfig;
  // Section 6 – Branding
  branding: BrandingConfig;
  // Section 7 – Integrations
  integrations: IntegrationConfig;
  // Section 8 – Notes
  notes: string;
  visibleTo?: string[];
}

// ─── Tenant Subscription (Plan assignment to a Tenant) ─────────────────────
export interface TenantSubscription {
  id: string;
  tenantId: string;
  tenantName: string;
  planId: string;
  planName: string;
  // Subscription period
  startDate: string;
  expiryDate: string;
  billingCycle: 'Monthly' | 'Quarterly' | 'Yearly' | 'Lifetime';
  status: 'Active' | 'Expired' | 'Cancelled' | 'Trial' | 'Pending';
  // Commercial
  discount: number;
  finalPrice: number;
  tax: number;
  invoiceNumber: string;
  // Override limits (null = use plan default, -1 = Unlimited)
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
    maxApiCalls?: number;
  };
}

// ─── Defaults helpers ──────────────────────────────────────────────────────
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
  razorpay: false, cashfree: false, biometricDevices: false,
  zoom: false, googleMeet: false, googleCalendar: false,
  whatsappBusiness: false, apiAccess: false
};

// ─── Initial Plans ──────────────────────────────────────────────────────────
export const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'PLAN-001',
    name: 'Starter Trial',
    code: 'TRIAL-FREE',
    description: 'Ideal for small centers starting their digital journey. Free trial with core ERP features.',
    status: 'Active',
    displayOrder: 1,
    billingType: 'Monthly',
    price: 0,
    currency: 'INR',
    trialDays: 14,
    setupFee: 0,
    renewalPrice: 0,
    autoRenewal: false,
    maxInstances: 1,
    maxBranches: 1,
    maxStaffUsers: 5,
    maxStudents: 50,
    maxParents: 100,
    maxTeachers: 5,
    maxStorage: '5 GB',
    maxFileSize: '5 MB',
    maxSmsCredits: 100,
    maxWhatsappMsgs: 50,
    maxApiCalls: 1000,
    features: {
      admissions: true, studentManagement: true, parentPortal: false,
      teacherPortal: true, attendance: true, timetable: false,
      assignments: true, exams: false, results: false, doubts: false,
      fees: true, payroll: false, income: false, expenses: false,
      notifications: true, sms: false, whatsapp: false, email: true,
      reports: false, auditLogs: false, importExport: false, apiAccess: false
    },
    support: { emailSupport: true, chatSupport: false, phoneSupport: false, dedicatedAccountManager: false, onboardingAssistance: false },
    branding: { whiteLabel: false, customDomain: false, customLogo: false, customEmailTemplates: false },
    integrations: { razorpay: false, cashfree: false, biometricDevices: false, zoom: false, googleMeet: false, googleCalendar: false, whatsappBusiness: false, apiAccess: false },
    notes: '',
    visibleTo: ['All']
  },
  {
    id: 'PLAN-002',
    name: 'Growth Plan',
    code: 'GROWTH-MID',
    description: 'Best suited for expanding coaching institutes with multiple branches and staff.',
    status: 'Active',
    displayOrder: 2,
    billingType: 'Monthly',
    price: 15000,
    currency: 'INR',
    trialDays: 0,
    setupFee: 4999,
    renewalPrice: 15000,
    autoRenewal: true,
    maxInstances: 1,
    maxBranches: 5,
    maxStaffUsers: 25,
    maxStudents: 1000,
    maxParents: 2000,
    maxTeachers: 20,
    maxStorage: '20 GB',
    maxFileSize: '20 MB',
    maxSmsCredits: 5000,
    maxWhatsappMsgs: 2500,
    maxApiCalls: 50000,
    features: {
      admissions: true, studentManagement: true, parentPortal: true,
      teacherPortal: true, attendance: true, timetable: true,
      assignments: true, exams: true, results: true, doubts: true,
      fees: true, payroll: false, income: true, expenses: true,
      notifications: true, sms: true, whatsapp: true, email: true,
      reports: true, auditLogs: true, importExport: false, apiAccess: false
    },
    support: { emailSupport: true, chatSupport: true, phoneSupport: false, dedicatedAccountManager: false, onboardingAssistance: true },
    branding: { whiteLabel: false, customDomain: false, customLogo: true, customEmailTemplates: false },
    integrations: { razorpay: true, cashfree: false, biometricDevices: false, zoom: true, googleMeet: true, googleCalendar: true, whatsappBusiness: true, apiAccess: false },
    notes: 'Best-seller plan for mid-size coaching centres.',
    visibleTo: ['All']
  },
  {
    id: 'PLAN-003',
    name: 'Pro Enterprise',
    code: 'ENTERPRISE-MAX',
    description: 'Complete suite with high scalability, full white-label, and enterprise SLAs.',
    status: 'Active',
    displayOrder: 3,
    billingType: 'Yearly',
    price: 300000,
    currency: 'INR',
    trialDays: 30,
    setupFee: 15000,
    renewalPrice: 280000,
    autoRenewal: true,
    maxInstances: 1,
    maxBranches: -1,
    maxStaffUsers: -1,
    maxStudents: -1,
    maxParents: -1,
    maxTeachers: -1,
    maxStorage: '100 GB',
    maxFileSize: '50 MB',
    maxSmsCredits: -1,
    maxWhatsappMsgs: -1,
    maxApiCalls: -1,
    features: {
      admissions: true, studentManagement: true, parentPortal: true,
      teacherPortal: true, attendance: true, timetable: true,
      assignments: true, exams: true, results: true, doubts: true,
      fees: true, payroll: true, income: true, expenses: true,
      notifications: true, sms: true, whatsapp: true, email: true,
      reports: true, auditLogs: true, importExport: true, apiAccess: true
    },
    support: { emailSupport: true, chatSupport: true, phoneSupport: true, dedicatedAccountManager: true, onboardingAssistance: true },
    branding: { whiteLabel: true, customDomain: true, customLogo: true, customEmailTemplates: true },
    integrations: { razorpay: true, cashfree: true, biometricDevices: true, zoom: true, googleMeet: true, googleCalendar: true, whatsappBusiness: true, apiAccess: true },
    notes: 'Enterprise tier with dedicated SLA and account manager.',
    visibleTo: ['All']
  }
];

// ─── Initial Tenant Subscriptions ──────────────────────────────────────────
export const INITIAL_TENANT_SUBSCRIPTIONS: TenantSubscription[] = [
  {
    id: 'SUB-001',
    tenantId: 'VS-001',
    tenantName: 'Apex IIT Academy',
    planId: 'PLAN-002',
    planName: 'Growth Plan',
    startDate: '2026-01-15',
    expiryDate: '2027-01-14',
    billingCycle: 'Yearly',
    status: 'Active',
    discount: 10,
    finalPrice: 162000,
    tax: 18,
    invoiceNumber: 'INV-2026-001',
    overrides: { maxBranches: 8 }
  },
  {
    id: 'SUB-002',
    tenantId: 'VS-002',
    tenantName: 'Bright Future Coaching',
    planId: 'PLAN-001',
    planName: 'Starter Trial',
    startDate: '2026-03-01',
    expiryDate: '2026-04-01',
    billingCycle: 'Monthly',
    status: 'Trial',
    discount: 0,
    finalPrice: 0,
    tax: 0,
    invoiceNumber: '',
    overrides: {}
  }
];

