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
  ipAddress?: string;
}

export interface Course {
  name: string;
  code: string;
  fees?: number;
  duration: string;
  batches?: string;
  programs: string[];
  branches?: string[];
}

export interface Batch {
  name: string;
  course: string;
  program?: string;
  level?: string;
  academicYear?: string;
  timing: string;
  room: string;
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
  email?: string;
  phone?: string;
  operatingHours?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
  };
  programs?: string[];
  altEmails?: string[];
  defaultEmail?: string; // 'admin' | alt email string
}

export interface Staff {
  // Basic Info
  id?: string;
  employeeId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  name: string; // derived: firstName + lastName
  gender?: string;
  dob?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  aadhaar?: string;
  pan?: string;
  profilePhoto?: string;

  // Contact
  mobile: string;
  alternateMobile?: string;
  email: string;
  personalEmail?: string;
  currentAddress?: string;
  permanentAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;

  // Employment
  employeeType?: 'Teaching' | 'Non-Teaching';
  designation?: string;
  department?: string;
  joiningDate?: string;
  employmentType?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Visiting';
  reportingManager?: string;
  employmentStatus?: 'Active' | 'On Leave' | 'Resigned' | 'Terminated';
  experience?: string;
  qualification?: string;

  // Branch & Role
  branch: string; // primary branch (legacy compat)
  primaryBranch?: string;
  additionalBranches?: string[];
  roles?: string[]; // multi-role
  role: string; // primary role (legacy compat)
  workingDays?: string[];
  defaultShift?: string;

  // Teacher Info (conditional on 'Teacher' role)
  subjects?: string[];
  coursesAssigned?: string[];
  programsAssigned?: string[];
  academicLevels?: string[];
  preferredBatches?: string[];
  maxLecturesPerDay?: number;
  maxLecturesPerWeek?: number;
  preferredWorkingHours?: string;
  unavailableDays?: string[];
  preferredBreakTime?: string;
  teachingMode?: ('Online' | 'Offline' | 'Hybrid')[];
  biometricMandatory?: boolean;

  // Salary
  salaryType?: 'Monthly' | 'Hourly' | 'Contract';
  monthlySalary?: number;
  hourlyRate?: number;
  contractAmount?: number;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  pfNumber?: string;
  esicNumber?: string;
  professionalTax?: boolean;
  tdsApplicable?: boolean;

  // System Access
  createLogin?: boolean;
  username?: string;
  mobileLogin?: boolean;
  tempPassword?: string;
  permissionProfile?: string;
  forcePasswordReset?: boolean;
  mobileApp?: boolean;

  // Emergency
  emergencyContact?: string;
  emergencyRelationship?: string;
  emergencyMobile?: string;

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
  { name: 'JEE Prep Course', code: 'JEE-PREP', duration: '2 Years', programs: ['2 Year', '1 Year', 'Crash Course'], branches: ['Mumbai West', 'Pune Camp', 'Delhi South'] },
  { name: 'NEET Batch Premium', code: 'NEET-PREM', duration: '1 Year', programs: ['1 Year', 'Repeater'], branches: ['Mumbai West', 'Pune Camp'] },
  { name: 'Class 10 Foundation', code: 'FOUND-10', duration: '1 Year', programs: ['2 Year', '1 Year'], branches: ['Mumbai West', 'Delhi South'] },
  { name: '8th Standard', code: '8TH-STD', duration: '1 Year', programs: ['8th std ICSE', '8th std State Board', '8th std CBSE'], branches: ['Pune Camp'] }
];

export const INITIAL_BATCHES: Batch[] = [
  // JEE Prep Course (2 Year & 1 Year & Crash Course)
  { name: 'JEE-Morning-A1', course: 'JEE Prep Course', program: '2 Year', level: 'year1', academicYear: '2026-27', timing: '09:00 AM - 10:30 AM', room: 'Classroom 101' },
  { name: 'JEE-Morning-A2', course: 'JEE Prep Course', program: '2 Year', level: 'year1', academicYear: '2026-27', timing: '11:00 AM - 12:30 PM', room: 'Classroom 102' },
  { name: 'JEE-Evening-B1', course: 'JEE Prep Course', program: '2 Year', level: 'year2', academicYear: '2025-26', timing: '05:00 PM - 06:30 PM', room: 'Classroom 101' },
  { name: 'JEE-Weekend-Pro', course: 'JEE Prep Course', program: '1 Year', level: 'year1', academicYear: '2026-27', timing: '10:00 AM - 02:00 PM', room: 'Auditorium A' },
  { name: 'JEE-Crash-Dec', course: 'JEE Prep Course', program: 'Crash Course', level: 'year1', academicYear: '2025-26', timing: '03:00 PM - 06:00 PM', room: 'Hall 3' },

  // NEET Batch Premium (1 Year & Repeater)
  { name: 'NEET-Regular-M1', course: 'NEET Batch Premium', program: '1 Year', level: 'year1', academicYear: '2026-27', timing: '11:00 AM - 12:30 PM', room: 'Classroom 201' },
  { name: 'NEET-Regular-M2', course: 'NEET Batch Premium', program: '1 Year', level: 'year1', academicYear: '2027-28', timing: '01:00 PM - 02:30 PM', room: 'Classroom 202' },
  { name: 'NEET-Repeater-X', course: 'NEET Batch Premium', program: 'Repeater', level: 'year1', academicYear: '2026-27', timing: '08:00 AM - 12:00 PM', room: 'Auditorium B' },

  // Class 10 Foundation (2 Year & 1 Year)
  { name: 'F10-Morning-Alpha', course: 'Class 10 Foundation', program: '2 Year', level: 'year1', academicYear: '2026-27', timing: '07:30 AM - 09:00 AM', room: 'Lab 1' },
  { name: 'F10-Morning-Beta', course: 'Class 10 Foundation', program: '2 Year', level: 'year2', academicYear: '2025-26', timing: '07:30 AM - 09:00 AM', room: 'Lab 2' },
  { name: 'F10-Evening-Fast', course: 'Class 10 Foundation', program: '1 Year', level: 'year1', academicYear: '2026-27', timing: '06:00 PM - 07:30 PM', room: 'Classroom 105' },

  // 8th Standard
  { name: '8TH-ICSE-Alpha', course: '8th Standard', program: '8th std ICSE', level: 'class8', academicYear: '2026-27', timing: '04:00 PM - 05:30 PM', room: 'Classroom 301' },
  { name: '8TH-CBSE-Beta', course: '8th Standard', program: '8th std CBSE', level: 'class8', academicYear: '2026-27', timing: '04:00 PM - 05:30 PM', room: 'Classroom 302' },
  { name: '8TH-STATE-Gamma', course: '8th Standard', program: '8th std State Board', level: 'class8', academicYear: '2025-26', timing: '05:30 PM - 07:00 PM', room: 'Classroom 303' }
];

export const INITIAL_BRANCHES: Branch[] = [
  { 
    id: 'B-001', name: 'Mumbai West Branch', code: 'MUM-WEST', admin: 'Mrs. Seema Deshpande', adminEmail: 'seema@apexiit.com', adminMobile: '9876543210', capacity: 300, status: 'Active',
    address: '101, Western Heights, Andheri West, Mumbai, 400053', email: 'mumbaiwest@apexiit.com', phone: '022-26345566', operatingHours: '08:00 AM - 08:00 PM',
    programs: ['JEE', 'NEET', 'Foundation']
  },
  { 
    id: 'B-002', name: 'Pune Camp Branch', code: 'PUN-CAMP', admin: 'Mr. Ramesh Shinde', adminEmail: 'ramesh@apexiit.com', adminMobile: '9123456789', capacity: 150, status: 'Active',
    address: '45, MG Road, Camp, Pune, 411001', email: 'punecamp@apexiit.com', phone: '020-24445566', operatingHours: '09:00 AM - 06:00 PM',
    programs: ['Foundation']
  }
];

export const INITIAL_STAFF: Staff[] = [
  { id: 'EMP-001', employeeId: 'EMP-001', firstName: 'Priya', lastName: 'Sen', name: 'Priya Sen', email: 'priya.counsel@apexiit.com', mobile: '9876500001', role: 'Counsellor', roles: ['Counsellor'], branch: 'Mumbai West', primaryBranch: 'Mumbai West', designation: 'Senior Counsellor', department: 'Admissions', employeeType: 'Non-Teaching', employmentType: 'Full-Time', employmentStatus: 'Active', joiningDate: '2024-06-01', status: 'Active' },
  { id: 'EMP-002', employeeId: 'EMP-002', firstName: 'Arvind', lastName: 'Kelkar', name: 'Prof. Arvind Kelkar', email: 'arvind.chem@apexiit.com', mobile: '9876500002', role: 'Teacher', roles: ['Teacher', 'Academic Coordinator'], branch: 'Mumbai West', primaryBranch: 'Mumbai West', designation: 'Senior Physics Teacher', department: 'Academics', employeeType: 'Teaching', employmentType: 'Full-Time', employmentStatus: 'Active', joiningDate: '2023-04-15', subjects: ['Physics (Mechanics)', 'Physics (Electromagnetism)'], coursesAssigned: ['JEE Prep Course'], status: 'Active' },
  { id: 'EMP-003', employeeId: 'EMP-003', firstName: 'Nitin', lastName: 'Joshi', name: 'Nitin Joshi', email: 'nitin.bills@apexiit.com', mobile: '9876500003', role: 'Finance', roles: ['Finance'], branch: 'Mumbai West', primaryBranch: 'Mumbai West', designation: 'Accountant', department: 'Finance', employeeType: 'Non-Teaching', employmentType: 'Full-Time', employmentStatus: 'Active', joiningDate: '2024-01-10', status: 'Active' }
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
  { id: 'AL-901', timestamp: '2026-07-21 10:15:23', actor: 'SaaS Platform Owner', role: 'SaaS Super Admin', action: 'CREATE_TENANT', details: 'Created tenant: Apex IIT Academy (VS-001)', ipAddress: '192.168.1.45' },
  { id: 'AL-902', timestamp: '2026-07-21 11:30:12', actor: 'Dr. Ramesh Kumar', role: 'Institute Admin', action: 'UPDATE_FEES', details: 'Configured NEET Fee Plan structure', ipAddress: '192.168.1.88' }
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

export const INITIAL_SUBJECTS_MAP: Record<string, any[]> = {
  // 8th Standard (ICSE)
  '8TH-STD-8th std ICSE-class8': [
    { id: 's1', name: 'Mathematics', code: 'MAT-08-ICSE', type: 'Core', teacherIds: ['arvind.chem@apexiit.com'] },
    { id: 's2', name: 'Science', code: 'SCI-08-ICSE', type: 'Core' },
    { id: 's3', name: 'English Literature', code: 'ENG-08-ICSE', type: 'Core' },
    { id: 's4', name: 'Computer Applications', code: 'COMP-08', type: 'Elective' }
  ],
  // 8th Standard (CBSE)
  '8TH-STD-8th std CBSE-class8': [
    { id: 's5', name: 'Mathematics', code: 'MAT-08-CBSE', type: 'Core' },
    { id: 's6', name: 'Science', code: 'SCI-08-CBSE', type: 'Core' },
    { id: 's7', name: 'English', code: 'ENG-08-CBSE', type: 'Core' },
    { id: 's8', name: 'Social Science', code: 'SST-08-CBSE', type: 'Core' }
  ],
  // JEE Prep (2 Year - Year 1)
  'JEE-PREP-2 Year-year1': [
    { id: 'j1', name: 'Physics (Mechanics)', code: 'PHY-101', type: 'Core' },
    { id: 'j2', name: 'Chemistry (Physical)', code: 'CHE-101', type: 'Core' },
    { id: 'j3', name: 'Mathematics (Algebra)', code: 'MAT-101', type: 'Core' }
  ],
  // JEE Prep (2 Year - Year 2)
  'JEE-PREP-2 Year-year2': [
    { id: 'j4', name: 'Physics (Electromagnetism)', code: 'PHY-201', type: 'Core' },
    { id: 'j5', name: 'Chemistry (Organic)', code: 'CHE-201', type: 'Core' },
    { id: 'j6', name: 'Mathematics (Calculus)', code: 'MAT-201', type: 'Core' },
    { id: 'j7', name: 'Mock Test Series', code: 'MOCK-JEE', type: 'Elective' }
  ],
  // NEET (1 Year)
  'NEET-PREM-1 Year-year1': [
    { id: 'n1', name: 'Physics', code: 'PHY-NEET', type: 'Core' },
    { id: 'n2', name: 'Chemistry', code: 'CHE-NEET', type: 'Core' },
    { id: 'n3', name: 'Botany', code: 'BOT-NEET', type: 'Core' },
    { id: 'n4', name: 'Zoology', code: 'ZOO-NEET', type: 'Core' }
  ],
  // Foundation (2 Year - Year 1)
  'FOUND-10-2 Year-year1': [
    { id: 'f1', name: 'Advanced Math', code: 'MAT-F9', type: 'Core' },
    { id: 'f2', name: 'Science Foundations', code: 'SCI-F9', type: 'Core' },
    { id: 'f3', name: 'Mental Ability', code: 'MAT-NTSE', type: 'Core' }
  ]
};

export const INITIAL_BUNDLES_MAP: Record<string, any[]> = {
  '8TH-STD-8th std ICSE-class8': [
    { id: 'b1', name: 'Core Subjects Bundle', subjectIds: ['s1', 's2', 's3'] },
    { id: 'b2', name: 'Full Package (with IT)', subjectIds: ['s1', 's2', 's3', 's4'] }
  ],
  '8TH-STD-8th std CBSE-class8': [
    { id: 'b3', name: 'CBSE Standard Pack', subjectIds: ['s5', 's6', 's7', 's8'] }
  ],
  'JEE-PREP-2 Year-year1': [
    { id: 'b4', name: 'PCM Complete (11th)', subjectIds: ['j1', 'j2', 'j3'] }
  ],
  'JEE-PREP-2 Year-year2': [
    { id: 'b5', name: 'PCM Complete (12th)', subjectIds: ['j4', 'j5', 'j6'] },
    { id: 'b6', name: 'PCM + Mock Tests', subjectIds: ['j4', 'j5', 'j6', 'j7'] }
  ],
  'NEET-PREM-1 Year-year1': [
    { id: 'b7', name: 'PCB Foundation', subjectIds: ['n1', 'n2', 'n3', 'n4'] },
    { id: 'b8', name: 'Biology Only (Bot+Zoo)', subjectIds: ['n3', 'n4'] }
  ],
  'FOUND-10-2 Year-year1': [
    { id: 'b9', name: 'NTSE Prep Combo', subjectIds: ['f1', 'f2', 'f3'] }
  ]
};
