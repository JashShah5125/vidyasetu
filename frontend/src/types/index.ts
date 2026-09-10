export type Role = 'saas-admin' | 'inst-admin' | 'branch-admin' | 'counsellor' | 'teacher' | 'finance' | 'parent' | 'student';

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: Role;
  branch?: string;
  branchId?: string;
  branchCode?: string;
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
  
  // Legacy fields (for backward compatibility)
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
  name: string;
  duration?: string;
}

export interface Program {
  id: string;
  name: string;
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
  programs?: string[];
  programDetails?: Program[];
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
  admin: string;
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
  defaultEmail?: string;
}

export interface Staff {
  id?: string;
  employeeId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  name: string;
  gender?: string;
  dob?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  aadhaar?: string;
  pan?: string;
  profilePhoto?: string;

  mobile: string;
  alternateMobile?: string;
  email: string;
  personalEmail?: string;
  address?: string;
  currentAddress?: string;
  permanentAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;

  employeeType?: 'Teaching' | 'Non-Teaching';
  designation?: string;
  department?: string;
  joiningDate?: string;
  employmentType?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Visiting';
  reportingManager?: string;
  employmentStatus?: 'Active' | 'On Leave' | 'Resigned' | 'Terminated';
  experience?: string;
  qualification?: string;

  branch: string;
  primaryBranch?: string;
  additionalBranches?: string[];
  roles?: string[];
  role: string;
  workingDays?: string[];
  defaultShift?: string;

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

  createLogin?: boolean;
  username?: string;
  mobileLogin?: boolean;
  tempPassword?: string;
  permissionProfile?: string;
  forcePasswordReset?: boolean;
  mobileApp?: boolean;

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
  batch: string;
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
  direction: 'Incoming' | 'Outgoing';
  status: 'Unread' | 'Read';
  recipients?: NotificationRecipient[];
  attachmentName?: string;
}

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
  biometricDevices: boolean;
  zoom: boolean;
  googleMeet: boolean;
  googleCalendar: boolean;
  whatsappBusiness: boolean;
  apiAccess: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'Active' | 'Inactive';
  displayOrder: number;
  billingType: 'Monthly' | 'Quarterly' | 'Yearly' | 'Lifetime';
  price: number;
  currency: string;
  trialDays: number;
  setupFee: number;
  renewalPrice: number;
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
  maxApiCalls: number;
  features: FeatureAccess;
  support: SupportConfig;
  branding: BrandingConfig;
  integrations: IntegrationConfig;
  notes: string;
  visibleTo?: string[];
}

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
    maxApiCalls?: number;
  };
}

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

export interface FeePlan {
  id: string;
  course: string;
  program: string;
  totalFees: number;
  downPayment: number;
  months: number;
  installment: number;
}

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

// ─── Constants & Fallback Arrays ───────────────────────────────────────────
export const TEACHER_ASSIGNED_BATCHES: string[] = ['JEE-Morning-A1', 'NEET-Regular-B1', 'JEE-Evening-B1'];
export const INITIAL_EXAMS: ExamItem[] = [];
export const INITIAL_ASSIGNMENTS: Assignment[] = [];
export const TEACHER_INITIAL_ASSIGNMENTS: AssignmentItem[] = [];
export const INITIAL_COURSES: Course[] = [];
export const INITIAL_BATCHES: Batch[] = [];
export const INITIAL_BRANCHES: Branch[] = [];
export const INITIAL_STAFF: Staff[] = [];
export const INITIAL_DOUBTS: Doubt[] = [];
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
export const INITIAL_PLANS: SubscriptionPlan[] = [];
export const INITIAL_TENANT_SUBSCRIPTIONS: TenantSubscription[] = [];
export const INITIAL_SUBJECTS_MAP: Record<string, any[]> = {};
export const INITIAL_BUNDLES_MAP: Record<string, any[]> = {};
export const INITIAL_FEE_PLANS: FeePlan[] = [];
export const INITIAL_SCHEDULE_REQUESTS: ScheduleRequest[] = [];
export const INITIAL_SCHEDULE_CHANGES: ScheduleChange[] = [];
export const INITIAL_ATTENDANCE_HISTORY: AttendanceSubmission[] = [];
export const INITIAL_SUPPORT_TICKETS: SupportTicket[] = [];
export const EXAM_RESULTS: ExamResult[] = [];

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
    const today = new Date();
    const start = new Date(t.startDate);
    if (start > today) {
      return 'Pending';
    }
  }
  return t.status;
};

