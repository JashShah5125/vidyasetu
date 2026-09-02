export type Role = 'saas-admin' | 'inst-admin' | 'branch-admin' | 'counsellor' | 'teacher' | 'finance';

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: Role;
  branch?: string;
  tenantId?: string;
  tenantName?: string;
  mustChangePassword?: boolean;
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
  parentMobile?: string;
  course: string;
  program?: string;
  level?: string;
  branch: string;
  preferredBranch?: string;
  source: string;
  counsellor: string;
  status: 'New Enquiry' | 'Contacted' | 'Follow-up' | 'Demo Scheduled' | 'Fee Discussion' | 'Interested' | 'Not Interested' | 'Converted';
  demoScheduledOn?: string;
  nextFollowUp: string;
  remarks: string;
  followups: { date: string; type: string; outcome: string; nextDate: string }[];
  feeConfig?: any;
}

export interface Parent {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  relation: string;
  occupation?: string;
  childrenIds: string[];
}

export interface Student {
  id: string;
  studentId: string;
  parentId: string;
  enrollmentIds: string[];
  name: string;
  mobile: string;
  dob: string;
  gender: string;
  email?: string;
  address: { street: string; city: string; state: string; pincode: string };
  category: string;
  schoolName?: string;
  currentClass: string;
  board: string;
  targetExam: string;
  yearOfAttempt: string;
  status: 'Draft' | 'Registration Pending' | 'Documents Submitted' | 'Verification Pending' | 'Active Student';
  
  // Legacy fields (for backward compatibility with unmigrated pages)
  course?: string;
  program?: string;
  level?: string;
  batch?: string;
  branch?: string;
  admissionDate?: string;
  parentMobile?: string;
  feePlan?: any;
}

export interface Enrollment {
  id: string;
  studentId: string;
  course: string;
  program: string;
  level: string;
  batchId?: string;
  status: 'Active' | 'Completed' | 'Dropped';
}

export interface FeeRecord {
  id: string;
  enrollmentId: string;
  totalFee: number;
  discount: number;
  netFee: number;
  downpayment: number;
  installments: number;
  installmentAmount: number;
}

export interface Document {
  id: string;
  studentId: string;
  type: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: 'Pending' | 'Verified' | 'Rejected';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  details: string;
  ipAddress?: string;
  institute?: string;
}

export interface AcademicLevel {
  id: string;
  name: string; // e.g. "Class XI", "Year 1"
  duration?: string;
}

export interface Program {
  id: string;
  name: string; // e.g. "2 Year", "1 Year Crash Course"
  code: string;
  enabled: boolean;
  levels: AcademicLevel[];
}

export interface Course {
  id?: string;
  name: string;
  code: string;
  fees?: number;
  description?: string;
  duration?: string;
  branches?: string[];
  programs?: string[]; // Legacy array of strings for backward compatibility
  programDetails?: Program[]; // New relational structure
  batches?: string | string[];
  status?: 'Active' | 'Inactive';
}

export interface Batch {
  name: string;
  course: string;
  program?: string;
  level?: string;
  academicYear?: string;
  timing: string;
  room: string;
  branch?: string;
  teacher?: string;
}

export interface Branch {
  id?: string;
  name: string;
  code: string;
  admin: string; // ID or Name of branch admin
  adminEmail?: string;
  adminMobile?: string;
  capacity: number;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Deleted';
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
  courses?: string[];
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

export interface DoubtMessage {
  id: string;
  sender: 'student' | 'teacher';
  text: string;
  time: string;
  attachments?: string[];
}

export interface Doubt {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  batch: string; // the batch ID context
  messages: DoubtMessage[];
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Reopened';
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecipient {
  type: 'Batch' | 'Level' | 'Program' | 'Course' | 'Specific Student';
  id: string;
  name: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: 'Academic' | 'Administrative' | 'Announcement' | 'Schedule' | 'Examination' | 'General';
  sender: string;
  senderRole: string;
  createdAt: string;
  direction: 'Incoming' | 'Outgoing'; // relative to the teacher viewing it
  status: 'Read' | 'Unread'; 
  recipients: NotificationRecipient[];
  recipientCount?: number;
  attachments?: string[];
}

export const INITIAL_TENANTS: Tenant[]  = [];


import leadsJson from './leads.json';
import studentsJson from './students.json';

export const INITIAL_LEADS: Lead[]  = [];

export const INITIAL_PARENTS: Parent[]  = [];

export const INITIAL_STUDENTS: Student[]  = [];

export const INITIAL_ENROLLMENTS: Enrollment[]  = [];

export const INITIAL_FEE_RECORDS: FeeRecord[]  = [];

export const INITIAL_DOCUMENTS: Document[]  = [];

export const INITIAL_COURSES: Course[]  = [];

export const INITIAL_BATCHES: Batch[]  = [];

export const INITIAL_BRANCHES: Branch[]  = [];

export const INITIAL_STAFF: Staff[]  = [];

export const INITIAL_DOUBTS: Doubt[]  = [];

export const INITIAL_NOTIFICATIONS: AppNotification[]  = [];

export const INITIAL_AUDIT_LOGS: AuditLog[]  = [];

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

export const getTenantStatus = (t: { status: string; startDate?: string }): string => {
  if (t.startDate) {
    const today = new Date('2026-08-13');
    const start = new Date(t.startDate);
    if (start > today) {
      return 'Pending';
    }
  }
  return t.status;
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
export const INITIAL_PLANS: SubscriptionPlan[]  = [];

// ─── Initial Tenant Subscriptions ──────────────────────────────────────────
export const INITIAL_TENANT_SUBSCRIPTIONS: TenantSubscription[]  = [];

export const INITIAL_SUBJECTS_MAP: Record<string, any[]>  = {};

export const INITIAL_BUNDLES_MAP: Record<string, any[]>  = {};

export interface AssignmentItem {
  id: string;
  title: string;
  type: string;
  subject: string;
  batch: string;
  assignedDate: string;
  dueDate: string;
  status: 'Draft' | 'Published' | 'Closed';
  description?: string;
  attachmentName?: string;
}

export const TEACHER_INITIAL_ASSIGNMENTS: AssignmentItem[]  = [];

export interface ExamItem {
  id: string;
  name: string;
  type: string;
  subject: string;
  batch: string;
  examDate: string;
  startTime?: string;
  duration?: string;
  totalMarks: number;
  passingMarks: number;
  average: string;
  status: 'Draft' | 'Scheduled' | 'In Progress' | 'Completed' | 'Marks Pending' | 'Marks Published' | 'Cancelled';
  studentMarks?: { [studentId: string]: number };
}

export const INITIAL_EXAMS: ExamItem[]  = [];

export interface FeePlan {
  id: string;
  course: string;
  program: string;
  totalFees: number;
  downPayment: number;
  months: number;
  installment: number;
}

export const INITIAL_FEE_PLANS: FeePlan[]  = [];

import type { Lecture, Room } from '../features/scheduler/types/scheduler';

export const INITIAL_ROOMS: Room[]  = [];

export const INITIAL_LECTURES: Lecture[]  = [];


import scheduleRequestsJson from './scheduleRequests.json';

export interface ScheduleChange {
  id: string;
  type: 'ROOM_CHANGE' | 'RESCHEDULED' | 'CANCELLED' | 'SUBSTITUTE' | 'OTHER';
  batchId: string;
  subject: string;
  branchId?: string;
  branchName?: string;
  lectureId?: string;
  teacherId?: string;
  teacherName?: string;
  date?: string;
  time?: string;
  previousValue: string;
  newValue?: string;
  dateTime: string;
  status: 'Upcoming' | 'Occurred' | 'Pending Approval' | 'Approved' | 'Rejected';
  requestedBy?: string;
  message?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ScheduleRequest = ScheduleChange;
export const INITIAL_SCHEDULE_REQUESTS: ScheduleRequest[]  = [];
export const INITIAL_SCHEDULE_CHANGES: ScheduleChange[]  = [];

export interface Assignment {
  id: string;
  title: string;
  batchId: string;
  subject: string;
  dueDate: string;
  status: 'Published' | 'Draft' | 'Closed';
  submittedCount: number;
  totalCount: number;
}

export const INITIAL_ASSIGNMENTS: Assignment[]  = [];

export const TEACHER_ASSIGNED_BATCHES = ['JEE-Morning-A1', 'NEET-Regular-B1', 'JEE-Evening-B1'];

export interface StudentAttendanceRecord {
  studentId: string;
  status: 'Present' | 'Absent' | 'Late';
  remark?: string;
}

export interface AttendanceSubmission {
  id: string;
  lectureId: string;
  batchId: string;
  subject: string;
  date: string;
  time: string;
  totalStudents: number;
  present: number;
  late: number;
  absent: number;
  submittedAt: string;
  records: StudentAttendanceRecord[];
}

const pastDateStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

export const INITIAL_ATTENDANCE_HISTORY: AttendanceSubmission[]  = [];

export interface ExamResult {
  id: string;
  studentId: string;
  examName: string;
  subject: string;
  date: string;
  marks: number;
  maxMarks: number;
  grade: string;
  status: 'Published' | 'Under Review';
}

export const EXAM_RESULTS: ExamResult[] = [
  { id: 'E1', studentId: 'STU-MUM-2603', examName: 'Periodic Test #3', subject: 'Chemistry', date: '2026-08-08', marks: 85, maxMarks: 100, grade: 'A', status: 'Published' },
  { id: 'E2', studentId: 'STU-MUM-2603', examName: 'Unit Test #2', subject: 'Mathematics', date: '2026-08-01', marks: 78, maxMarks: 100, grade: 'B+', status: 'Published' },
  { id: 'E3', studentId: 'STU-MUM-2603', examName: 'Weekly Quiz #5', subject: 'Physics', date: '2026-07-28', marks: 92, maxMarks: 100, grade: 'A+', status: 'Published' },
  { id: 'E4', studentId: 'STU-MUM-2601', examName: 'Periodic Test #3', subject: 'Chemistry', date: '2026-08-08', marks: 76, maxMarks: 100, grade: 'B+', status: 'Published' },
];

export interface SupportTicket {
  id: string;
  tenantName: string;
  subject: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  description: string;
  created: string;
  replies: { sender: string; text: string; time: string }[];
}

export const INITIAL_SUPPORT_TICKETS: SupportTicket[]  = [];
