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
  parentMobile?: string;
  course: string;
  program?: string;
  level?: string;
  branch: string;
  preferredBranch?: string;
  source: string;
  counsellor: string;
  status: 'New Enquiry' | 'Contacted' | 'Follow-up' | 'Demo Scheduled' | 'Interested' | 'Not Interested';
  demoScheduledOn?: string;
  nextFollowUp: string;
  remarks: string;
  followups: { date: string; type: string; outcome: string; nextDate: string }[];
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

export interface Course {
  id?: string;
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
    course: 'JEE Prep Course',
    branch: 'Mumbai West',
    preferredBranch: 'Mumbai West',
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
    course: 'NEET Batch Premium',
    branch: 'Pune Camp',
    preferredBranch: 'Pune Camp',
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
    preferredBranch: 'Delhi South',
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

export const INITIAL_PARENTS: Parent[] = [
  { id: 'P-101', name: 'Mr. Deshmukh', mobile: '9877112200', relation: 'Father', childrenIds: ['S-201'] },
  { id: 'P-102', name: 'Mr. Mehta', mobile: '9877112201', relation: 'Father', childrenIds: ['S-202'] },
  { id: 'P-103', name: 'Mr. Sharma', mobile: '9877112202', relation: 'Father', childrenIds: ['S-203'] },
  { id: 'P-104', name: 'Mr. Patil', mobile: '9877112203', relation: 'Father', childrenIds: ['S-204'] },
  { id: 'P-105', name: 'Mr. Sen', mobile: '9877112204', relation: 'Father', childrenIds: ['S-205'] },
  { id: 'P-106', name: 'Mr. Roy', mobile: '9554321000', relation: 'Father', childrenIds: ['S-206'] },
  { id: 'P-107', name: 'Mr. Nair', mobile: '9554321001', relation: 'Father', childrenIds: ['S-207'] }
];

export const INITIAL_STUDENTS: Student[] = [
  { id: 'S-201', studentId: 'STU-MUM-2601', parentId: 'P-101', enrollmentIds: ['E-301'], name: 'Rohan Deshmukh', mobile: '9877112233', dob: '2010-05-14', gender: 'Male', address: { street: 'SV Road', city: 'Mumbai', state: 'MH', pincode: '400050' }, category: 'General', currentClass: 'Class 11', board: 'CBSE', targetExam: 'JEE', yearOfAttempt: '2028', status: 'Active Student', branch: 'Mumbai West' },
  { id: 'S-202', studentId: 'STU-MUM-2602', parentId: 'P-102', enrollmentIds: ['E-302'], name: 'Sameer Mehta', mobile: '9877112244', dob: '2010-08-22', gender: 'Male', address: { street: 'Linking Road', city: 'Mumbai', state: 'MH', pincode: '400052' }, category: 'General', currentClass: 'Class 11', board: 'ICSE', targetExam: 'JEE', yearOfAttempt: '2028', status: 'Active Student', branch: 'Mumbai West' },
  { id: 'S-203', studentId: 'STU-MUM-2603', parentId: 'P-103', enrollmentIds: ['E-303'], name: 'Aditya Sharma', mobile: '9877112255', dob: '2010-01-10', gender: 'Male', address: { street: 'Juhu Tara', city: 'Mumbai', state: 'MH', pincode: '400049' }, category: 'General', currentClass: 'Class 11', board: 'State Board', targetExam: 'JEE', yearOfAttempt: '2028', status: 'Active Student', branch: 'Mumbai West' },
  { id: 'S-204', studentId: 'STU-MUM-2604', parentId: 'P-104', enrollmentIds: ['E-304'], name: 'Sneha Patil', mobile: '9877112266', dob: '2009-11-05', gender: 'Female', address: { street: 'Andheri East', city: 'Mumbai', state: 'MH', pincode: '400069' }, category: 'OBC', currentClass: 'Class 12', board: 'CBSE', targetExam: 'JEE', yearOfAttempt: '2027', status: 'Active Student', branch: 'Mumbai West' },
  { id: 'S-205', studentId: 'STU-MUM-2605', parentId: 'P-105', enrollmentIds: ['E-305'], name: 'Kunal Sen', mobile: '9877112277', dob: '2009-12-12', gender: 'Male', address: { street: 'Bandra West', city: 'Mumbai', state: 'MH', pincode: '400050' }, category: 'General', currentClass: 'Class 12', board: 'CBSE', targetExam: 'JEE', yearOfAttempt: '2027', status: 'Active Student', branch: 'Mumbai West' },
  { id: 'S-206', studentId: 'STU-PUN-2602', parentId: 'P-106', enrollmentIds: ['E-306'], name: 'Ishita Roy', mobile: '9554321098', dob: '2010-04-18', gender: 'Female', address: { street: 'Koregaon Park', city: 'Pune', state: 'MH', pincode: '411001' }, category: 'General', currentClass: 'Class 11', board: 'CBSE', targetExam: 'NEET', yearOfAttempt: '2028', status: 'Verification Pending', branch: 'Pune Camp' },
  { id: 'S-207', studentId: 'STU-PUN-2603', parentId: 'P-107', enrollmentIds: ['E-307'], name: 'Priya Nair', mobile: '9554321099', dob: '2010-09-30', gender: 'Female', address: { street: 'Viman Nagar', city: 'Pune', state: 'MH', pincode: '411014' }, category: 'General', currentClass: 'Class 11', board: 'ICSE', targetExam: 'NEET', yearOfAttempt: '2028', status: 'Active Student', branch: 'Pune Camp' }
];

export const INITIAL_ENROLLMENTS: Enrollment[] = [
  { id: 'E-301', studentId: 'S-201', course: 'JEE Prep Course', program: '2 Year', level: 'Beginner', batchId: 'JEE-Morning-A1', status: 'Active' },
  { id: 'E-302', studentId: 'S-202', course: 'JEE Prep Course', program: '2 Year', level: 'Beginner', batchId: 'JEE-Morning-A1', status: 'Active' },
  { id: 'E-303', studentId: 'S-203', course: 'JEE Prep Course', program: '2 Year', level: 'Beginner', batchId: 'JEE-Morning-A1', status: 'Active' },
  { id: 'E-304', studentId: 'S-204', course: 'JEE Prep Course', program: '1 Year', level: 'Intermediate', batchId: 'JEE-Evening-B1', status: 'Active' },
  { id: 'E-305', studentId: 'S-205', course: 'JEE Prep Course', program: '1 Year', level: 'Intermediate', batchId: 'JEE-Evening-B1', status: 'Active' },
  { id: 'E-306', studentId: 'S-206', course: 'NEET Batch Premium', program: '2 Year', level: 'Beginner', batchId: 'NEET-Regular-M1', status: 'Active' },
  { id: 'E-307', studentId: 'S-207', course: 'NEET Batch Premium', program: '2 Year', level: 'Beginner', batchId: 'NEET-Regular-M1', status: 'Active' }
];

export const INITIAL_FEE_RECORDS: FeeRecord[] = [
  { id: 'F-401', enrollmentId: 'E-301', totalFee: 120000, discount: 0, netFee: 120000, downpayment: 40000, installments: 8, installmentAmount: 10000 },
  { id: 'F-402', enrollmentId: 'E-302', totalFee: 120000, discount: 0, netFee: 120000, downpayment: 30000, installments: 9, installmentAmount: 10000 },
  { id: 'F-403', enrollmentId: 'E-303', totalFee: 120000, discount: 0, netFee: 120000, downpayment: 60000, installments: 6, installmentAmount: 10000 },
  { id: 'F-404', enrollmentId: 'E-304', totalFee: 120000, discount: 0, netFee: 120000, downpayment: 120000, installments: 0, installmentAmount: 0 },
  { id: 'F-405', enrollmentId: 'E-305', totalFee: 120000, discount: 0, netFee: 120000, downpayment: 50000, installments: 7, installmentAmount: 10000 },
  { id: 'F-406', enrollmentId: 'E-306', totalFee: 150000, discount: 0, netFee: 150000, downpayment: 50000, installments: 10, installmentAmount: 10000 },
  { id: 'F-407', enrollmentId: 'E-307', totalFee: 150000, discount: 0, netFee: 150000, downpayment: 150000, installments: 0, installmentAmount: 0 }
];

export const INITIAL_DOCUMENTS: Document[] = [];

export const INITIAL_COURSES: Course[] = [
  { name: 'JEE Prep Course', code: 'JEE-PREP', duration: '2 Years', fees: 150000, programs: ['2 Year', '1 Year', 'Crash Course'], branches: ['Mumbai West', 'Pune Camp', 'Delhi South'] },
  { name: 'NEET Batch Premium', code: 'NEET-PREM', duration: '1 Year', fees: 120000, programs: ['1 Year', 'Repeater'], branches: ['Mumbai West', 'Pune Camp'] },
  { name: 'Class 10 Foundation', code: 'FOUND-10', duration: '1 Year', fees: 80000, programs: ['2 Year', '1 Year'], branches: ['Mumbai West', 'Delhi South'] },
  { name: '8th Standard', code: '8TH-STD', duration: '1 Year', fees: 60000, programs: ['8th std ICSE', '8th std State Board', '8th std CBSE'], branches: ['Pune Camp'] }
];

export const INITIAL_BATCHES: Batch[] = [
  // JEE Prep Course (2 Year & 1 Year & Crash Course)
  { name: 'JEE-Morning-A1', course: 'JEE Prep Course', program: '2 Year', level: 'year1', academicYear: '2026-27', timing: '09:00 AM - 10:30 AM', room: 'Classroom 101', branch: 'Mumbai West' },
  { name: 'JEE-Morning-A2', course: 'JEE Prep Course', program: '2 Year', level: 'year1', academicYear: '2026-27', timing: '11:00 AM - 12:30 PM', room: 'Classroom 102', branch: 'Mumbai West' },
  { name: 'JEE-Evening-B1', course: 'JEE Prep Course', program: '2 Year', level: 'year2', academicYear: '2025-26', timing: '05:00 PM - 06:30 PM', room: 'Classroom 101', branch: 'Mumbai West' },
  { name: 'JEE-Weekend-Pro', course: 'JEE Prep Course', program: '1 Year', level: 'year1', academicYear: '2026-27', timing: '10:00 AM - 02:00 PM', room: 'Auditorium A', branch: 'Pune Camp' },
  { name: 'JEE-Crash-Dec', course: 'JEE Prep Course', program: 'Crash Course', level: 'year1', academicYear: '2025-26', timing: '03:00 PM - 06:00 PM', room: 'Hall 3', branch: 'Delhi South' },

  // NEET Batch Premium (1 Year & Repeater)
  { name: 'NEET-Regular-M1', course: 'NEET Batch Premium', program: '1 Year', level: 'year1', academicYear: '2026-27', timing: '11:00 AM - 12:30 PM', room: 'Classroom 201', branch: 'Mumbai West' },
  { name: 'NEET-Regular-M2', course: 'NEET Batch Premium', program: '1 Year', level: 'year1', academicYear: '2027-28', timing: '01:00 PM - 02:30 PM', room: 'Classroom 202', branch: 'Pune Camp' },
  { name: 'NEET-Repeater-X', course: 'NEET Batch Premium', program: 'Repeater', level: 'year1', academicYear: '2026-27', timing: '08:00 AM - 12:00 PM', room: 'Auditorium B', branch: 'Mumbai West' },

  // Class 10 Foundation (2 Year & 1 Year)
  { name: 'F10-Morning-Alpha', course: 'Class 10 Foundation', program: '2 Year', level: 'year1', academicYear: '2026-27', timing: '07:30 AM - 09:00 AM', room: 'Lab 1', branch: 'Mumbai West' },
  { name: 'F10-Morning-Beta', course: 'Class 10 Foundation', program: '2 Year', level: 'year2', academicYear: '2025-26', timing: '07:30 AM - 09:00 AM', room: 'Lab 2', branch: 'Delhi South' },
  { name: 'F10-Evening-Fast', course: 'Class 10 Foundation', program: '1 Year', level: 'year1', academicYear: '2026-27', timing: '06:00 PM - 07:30 PM', room: 'Classroom 105', branch: 'Mumbai West' },

  // 8th Standard
  { name: '8TH-ICSE-Alpha', course: '8th Standard', program: '8th std ICSE', level: 'class8', academicYear: '2026-27', timing: '04:00 PM - 05:30 PM', room: 'Classroom 301', branch: 'Pune Camp' },
  { name: '8TH-CBSE-Beta', course: '8th Standard', program: '8th std CBSE', level: 'class8', academicYear: '2026-27', timing: '04:00 PM - 05:30 PM', room: 'Classroom 302', branch: 'Pune Camp' },
  { name: '8TH-STATE-Gamma', course: '8th Standard', program: '8th std State Board', level: 'class8', academicYear: '2025-26', timing: '05:30 PM - 07:00 PM', room: 'Classroom 303', branch: 'Pune Camp' }
];

export const INITIAL_BRANCHES: Branch[] = [
  { 
    id: 'B-001', name: 'Mumbai West', code: 'MUM-WEST', admin: 'Mrs. Seema Deshpande', adminEmail: 'seema@apexiit.com', adminMobile: '9876543210', capacity: 300, status: 'Active',
    address: '101, Western Heights, Andheri West, Mumbai, 400053', email: 'mumbaiwest@apexiit.com', phone: '022-26345566', operatingHours: '08:00 AM - 08:00 PM',
    programs: ['JEE', 'NEET', 'Foundation']
  },
  { 
    id: 'B-002', name: 'Pune Camp', code: 'PUN-CAMP', admin: 'Mr. Ramesh Shinde', adminEmail: 'ramesh@apexiit.com', adminMobile: '9123456789', capacity: 150, status: 'Active',
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
    id: 'D-101',
    studentId: 'STU-MUM-2601',
    studentName: 'Rohan Deshmukh',
    subject: 'Chemistry',
    batch: 'JEE-Morning-A1',
    status: 'In Progress',
    createdAt: '2026-08-11T09:00:00Z',
    updatedAt: '2026-08-11T09:15:00Z',
    messages: [
      { id: 'm1', sender: 'student', text: 'Professor, I had a doubt in organic chemistry mechanisms. Is electrophilic addition for alkenes always Markovnikov?', time: '09:00 AM' },
      { id: 'm2', sender: 'teacher', text: 'Usually yes, as it proceeds via the more stable carbocation intermediate. However, in the presence of peroxides (anti-Markovnikov HBr addition), it follows a free-radical path.', time: '09:15 AM' }
    ]
  },
  {
    id: 'D-102',
    studentId: 'STU-MUM-2603',
    studentName: 'Ananya Shah',
    subject: 'Physics',
    batch: 'JEE-Morning-A1',
    status: 'Reopened',
    createdAt: '2026-08-10T14:00:00Z',
    updatedAt: '2026-08-11T08:30:00Z',
    messages: [
      { id: 'm1', sender: 'student', text: 'How do we calculate the horizontal component of velocity when the projectile is launched from a height?', time: '02:00 PM (Yesterday)' },
      { id: 'm2', sender: 'teacher', text: 'The horizontal component remains constant as u*cos(theta), assuming no air resistance, regardless of initial height.', time: '04:00 PM (Yesterday)' },
      { id: 'm3', sender: 'student', text: 'But what if it is launched horizontally? Then theta is 0?', time: '08:30 AM' }
    ]
  },
  {
    id: 'D-103',
    studentId: 'STU-MUM-2605',
    studentName: 'Kunal Sen',
    subject: 'Mathematics',
    batch: 'JEE-Evening-B1',
    status: 'Resolved',
    createdAt: '2026-08-10T15:00:00Z',
    updatedAt: '2026-08-10T16:00:00Z',
    messages: [
      { id: 'm1', sender: 'student', text: 'I am not understanding how to apply LHopitals rule when the limit evaluates to infinity minus infinity.', time: '03:00 PM' },
      { id: 'm2', sender: 'teacher', text: 'You need to algebraically manipulate the expression into a fraction so it takes the form 0/0 or inf/inf first.', time: '03:30 PM' },
      { id: 'm3', sender: 'student', text: 'Got it! Thank you.', time: '04:00 PM' }
    ]
  },
  {
    id: 'D-104',
    studentId: 'STU-MUM-2602',
    studentName: 'Sameer Mehta',
    subject: 'Chemistry',
    batch: 'JEE-Morning-A1',
    status: 'Pending',
    createdAt: '2026-08-11T10:15:00Z',
    updatedAt: '2026-08-11T10:15:00Z',
    messages: [
      { id: 'm1', sender: 'student', text: 'Sir, could you explain the difference between Enantiomers and Diastereomers with a simple example?', time: '10:15 AM' }
    ]
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'N-1',
    title: 'Faculty Meeting — 5 PM',
    message: 'All faculty members are requested to attend the mandatory staff meeting at 5:00 PM in the Main Conference Room. We will be discussing the upcoming examination schedule and syllabus completion targets.',
    category: 'Administrative',
    sender: 'Institute Admin',
    senderRole: 'Admin',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    direction: 'Incoming',
    status: 'Unread',
    recipients: [{ type: 'Batch', id: 'all_teachers', name: 'All Faculty' }]
  },
  {
    id: 'N-2',
    title: 'Tomorrow\'s Timetable Updated',
    message: 'The Chemistry lecture scheduled for tomorrow has been moved from Room 101 to Room 204. Please adjust your plans accordingly.',
    category: 'Schedule',
    sender: 'Academic Coordinator',
    senderRole: 'Coordinator',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    direction: 'Incoming',
    status: 'Read',
    recipients: [{ type: 'Specific Student', id: 'Prof. Arvind Kelkar', name: 'Prof. Arvind Kelkar' }],
    attachments: ['revised_timetable.pdf']
  },
  {
    id: 'N-3',
    title: 'Holiday on 15 August',
    message: 'The institute will remain closed on 15 August in observance of Independence Day. Regular classes will resume from 16 August.',
    category: 'Announcement',
    sender: 'Branch Admin',
    senderRole: 'Admin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    direction: 'Incoming',
    status: 'Read',
    recipients: [{ type: 'Course', id: 'all', name: 'All Staff & Students' }]
  },
  {
    id: 'N-4',
    title: 'Chemistry Test Tomorrow',
    message: 'Tomorrow\'s Chemistry test will cover Chemical Bonding and Periodic Table. Please come prepared.',
    category: 'Examination',
    sender: 'Prof. Arvind Kelkar',
    senderRole: 'Teacher',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    direction: 'Outgoing',
    status: 'Read', // N/A for outgoing
    recipients: [{ type: 'Batch', id: 'JEE-Morning-A1', name: 'JEE-Morning-A1' }],
    recipientCount: 32
  },
  {
    id: 'N-5',
    title: 'Bring Practical Notebook',
    message: 'We will be conducting the Salt Analysis practical tomorrow. Bring your lab coats and practical notebooks.',
    category: 'Academic',
    sender: 'Prof. Arvind Kelkar',
    senderRole: 'Teacher',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    direction: 'Outgoing',
    status: 'Read',
    recipients: [
      { type: 'Batch', id: 'JEE-Morning-A1', name: 'JEE-Morning-A1' },
      { type: 'Batch', id: 'JEE-Evening-B1', name: 'JEE-Evening-B1' }
    ],
    recipientCount: 64
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'AL-901', timestamp: '2026-07-21 10:15:23', actor: 'SaaS Platform Owner', role: 'SaaS Super Admin', action: 'CREATE_TENANT', details: 'Created tenant: Apex IIT Academy (VS-001)', ipAddress: '192.168.1.45', institute: 'Vidya Setu Platform' },
  { id: 'AL-902', timestamp: '2026-07-21 11:30:12', actor: 'Dr. Ramesh Kumar', role: 'Institute Admin', action: 'UPDATE_FEES', details: 'Configured NEET Fee Plan structure', ipAddress: '192.168.1.88', institute: 'Apex IIT Academy' }
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
    { id: 's1', name: 'Mathematics', code: 'MAT-08-ICSE', type: 'Core', fee: 20000, teacherIds: ['arvind.chem@apexiit.com'] },
    { id: 's2', name: 'Science', code: 'SCI-08-ICSE', type: 'Core', fee: 20000 },
    { id: 's3', name: 'English Literature', code: 'ENG-08-ICSE', type: 'Core', fee: 15000 },
    { id: 's4', name: 'Computer Applications', code: 'COMP-08', type: 'Elective', fee: 10000 }
  ],
  // 8th Standard (CBSE)
  '8TH-STD-8th std CBSE-class8': [
    { id: 's5', name: 'Mathematics', code: 'MAT-08-CBSE', type: 'Core', fee: 18000 },
    { id: 's6', name: 'Science', code: 'SCI-08-CBSE', type: 'Core', fee: 18000 },
    { id: 's7', name: 'English', code: 'ENG-08-CBSE', type: 'Core', fee: 12000 },
    { id: 's8', name: 'Social Science', code: 'SST-08-CBSE', type: 'Core', fee: 12000 }
  ],
  // JEE Prep (2 Year - Year 1)
  'JEE-PREP-2 Year-year1': [
    { id: 'j1', name: 'Physics (Mechanics)', code: 'PHY-101', type: 'Core', fee: 40000 },
    { id: 'j2', name: 'Chemistry (Physical)', code: 'CHE-101', type: 'Core', fee: 40000 },
    { id: 'j3', name: 'Mathematics (Algebra)', code: 'MAT-101', type: 'Core', fee: 40000 }
  ],
  // JEE Prep (2 Year - Year 2)
  'JEE-PREP-2 Year-year2': [
    { id: 'j4', name: 'Physics (Electromagnetism)', code: 'PHY-201', type: 'Core', fee: 45000 },
    { id: 'j5', name: 'Chemistry (Organic)', code: 'CHE-201', type: 'Core', fee: 45000 },
    { id: 'j6', name: 'Mathematics (Calculus)', code: 'MAT-201', type: 'Core', fee: 45000 },
    { id: 'j7', name: 'Mock Test Series', code: 'MOCK-JEE', type: 'Elective', fee: 15000 }
  ],
  // NEET (1 Year)
  'NEET-PREM-1 Year-year1': [
    { id: 'n1', name: 'Physics', code: 'PHY-NEET', type: 'Core', fee: 35000 },
    { id: 'n2', name: 'Chemistry', code: 'CHE-NEET', type: 'Core', fee: 35000 },
    { id: 'n3', name: 'Botany', code: 'BOT-NEET', type: 'Core', fee: 25000 },
    { id: 'n4', name: 'Zoology', code: 'ZOO-NEET', type: 'Core', fee: 25000 }
  ],
  // Foundation (2 Year - Year 1)
  'FOUND-10-2 Year-year1': [
    { id: 'f1', name: 'Advanced Math', code: 'MAT-F9', type: 'Core', fee: 30000 },
    { id: 'f2', name: 'Science Foundations', code: 'SCI-F9', type: 'Core', fee: 30000 },
    { id: 'f3', name: 'Mental Ability', code: 'MAT-NTSE', type: 'Core', fee: 20000 }
  ]
};

export const INITIAL_BUNDLES_MAP: Record<string, any[]> = {
  '8TH-STD-8th std ICSE-class8': [
    { id: 'b1', name: 'Core Subjects Bundle', fee: 50000, subjectIds: ['s1', 's2', 's3'], downPayment: 10000, months: 10, installment: 4000 },
    { id: 'b2', name: 'Full Package (with IT)', fee: 55000, subjectIds: ['s1', 's2', 's3', 's4'], downPayment: 10000, months: 9, installment: 5000 }
  ],
  '8TH-STD-8th std CBSE-class8': [
    { id: 'b3', name: 'CBSE Standard Pack', fee: 55000, subjectIds: ['s5', 's6', 's7', 's8'], downPayment: 10000, months: 9, installment: 5000 }
  ],
  'JEE-PREP-2 Year-year1': [
    { id: 'b4', name: 'PCM Complete (11th)', fee: 110000, subjectIds: ['j1', 'j2', 'j3'], downPayment: 20000, months: 10, installment: 9000 },
    { id: 'b4-adv', name: 'PCM Advanced Pro (11th)', fee: 125000, subjectIds: ['j1', 'j2', 'j3', 'j7'], downPayment: 25000, months: 10, installment: 10000 }
  ],
  'JEE-PREP-2 Year-year2': [
    { id: 'b5', name: 'PCM Complete (12th)', fee: 125000, subjectIds: ['j4', 'j5', 'j6'], downPayment: 25000, months: 10, installment: 10000 },
    { id: 'b6', name: 'PCM + Mock Tests', fee: 135000, subjectIds: ['j4', 'j5', 'j6', 'j7'], downPayment: 25000, months: 11, installment: 10000 }
  ],
  'JEE-PREP-1 Year-year1': [
    { id: 'b10', name: 'PCM Crash Prep (12th)', fee: 110000, subjectIds: ['j4', 'j5', 'j6'], downPayment: 20000, months: 9, installment: 10000 }
  ],
  'NEET-PREM-1 Year-year1': [
    { id: 'b7', name: 'PCB Foundation', fee: 110000, subjectIds: ['n1', 'n2', 'n3', 'n4'], downPayment: 20000, months: 10, installment: 9000 },
    { id: 'b8', name: 'Biology Only (Bot+Zoo)', fee: 45000, subjectIds: ['n3', 'n4'], downPayment: 15000, months: 6, installment: 5000 },
    { id: 'b7-pro', name: 'PCB Ultimate (with Tests)', fee: 130000, subjectIds: ['n1', 'n2', 'n3', 'n4', 'j7'], downPayment: 30000, months: 10, installment: 10000 }
  ],
  'NEET-PREM-Repeater-year1': [
    { id: 'b11', name: 'NEET Repeater Batch', fee: 95000, subjectIds: ['n1', 'n2', 'n3', 'n4'], downPayment: 25000, months: 7, installment: 10000 }
  ],
  'FOUND-10-2 Year-year1': [
    { id: 'b9', name: 'NTSE Prep Combo', fee: 75000, subjectIds: ['f1', 'f2', 'f3'], downPayment: 15000, months: 10, installment: 6000 }
  ],
  'FOUND-10-1 Year-year1': [
    { id: 'b12', name: '10th Boards Express', fee: 45000, subjectIds: ['f1', 'f2'], downPayment: 10000, months: 7, installment: 5000 }
  ]
};

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

export const TEACHER_INITIAL_ASSIGNMENTS: AssignmentItem[] = [
  { id: 'A-101', title: 'Electrophilic Addition Quiz Problems', type: 'Homework', subject: 'Chemistry', batch: 'JEE-Morning-A1', assignedDate: '2026-08-10', dueDate: '2026-08-15', status: 'Published', attachmentName: 'addition_probs.pdf' },
  { id: 'A-102', title: 'Rotational Dynamics Exercise sheet', type: 'Worksheet', subject: 'Physics', batch: 'JEE-Evening-B1', assignedDate: '2026-08-11', dueDate: '2026-08-18', status: 'Published', attachmentName: 'dynamics_sheet.pdf' },
  { id: 'A-103', title: 'Calculus Integration Draft', type: 'Practice set', subject: 'Mathematics', batch: 'JEE-Morning-A1', assignedDate: '', dueDate: 'Not Set', status: 'Draft', description: 'Need to add more integration by parts questions.' },
  { id: 'A-104', title: 'Kinematics Revision', type: 'Revision work', subject: 'Physics', batch: 'JEE-Morning-A1', assignedDate: '2026-07-01', dueDate: '2026-07-10', status: 'Closed' }
];

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

export const INITIAL_EXAMS: ExamItem[] = [
  { id: 'EX-201', name: 'Periodic Chemistry Evaluation Test #3', type: 'Unit Test', subject: 'Chemistry', batch: 'JEE-Morning-A1', examDate: '2026-08-05', startTime: '10:00 AM', duration: '90 mins', totalMarks: 100, passingMarks: 40, average: '88.5%', status: 'Marks Published', studentMarks: { 'STU-MUM-2601': 85, 'STU-MUM-2602': 92, 'STU-MUM-2603': 35 } },
  { id: 'EX-202', name: 'Physics Mechanics Weekly Quiz #2', type: 'Weekly Test', subject: 'Physics', batch: 'JEE-Evening-B1', examDate: '2026-08-08', startTime: '04:00 PM', duration: '60 mins', totalMarks: 50, passingMarks: 20, average: '79.2%', status: 'Marks Published', studentMarks: { 'STU-MUM-2604': 38, 'STU-MUM-2605': 18 } },
  { id: 'EX-203', name: 'Mathematics Mock Test 1', type: 'Mock Test', subject: 'Mathematics', batch: 'JEE-Morning-A1', examDate: '2026-08-25', startTime: '09:00 AM', duration: '180 mins', totalMarks: 300, passingMarks: 100, average: '', status: 'Scheduled' },
  { id: 'EX-204', name: 'Draft: Organic Chem Review', type: 'Chapter Test', subject: 'Chemistry', batch: 'JEE-Morning-A1', examDate: 'Not Set', totalMarks: 50, passingMarks: 20, average: '', status: 'Draft' },
  { id: 'EX-205', name: 'Thermodynamics Assessment', type: 'Internal Assessment', subject: 'Physics', batch: 'JEE-Evening-B1', examDate: '2026-08-10', startTime: '05:00 PM', duration: '45 mins', totalMarks: 40, passingMarks: 15, average: '', status: 'Cancelled' }
];

export interface FeePlan {
  id: string;
  course: string;
  program: string;
  totalFees: number;
  downPayment: number;
  months: number;
  installment: number;
}

export const INITIAL_FEE_PLANS: FeePlan[] = [
  { id: 'FP-01', course: 'JEE Prep Course', program: '2 Year', totalFees: 200000, downPayment: 40000, months: 12, installment: 13333 },
  { id: 'FP-02', course: 'JEE Prep Course', program: '1 Year', totalFees: 120000, downPayment: 30000, months: 10, installment: 9000 },
  { id: 'FP-03', course: 'JEE Prep Course', program: 'Crash Course', totalFees: 40000, downPayment: 40000, months: 1, installment: 0 },
  { id: 'FP-04', course: 'NEET Batch Premium', program: '1 Year', totalFees: 150000, downPayment: 50000, months: 10, installment: 10000 },
  { id: 'FP-05', course: 'NEET Batch Premium', program: 'Repeater', totalFees: 100000, downPayment: 40000, months: 6, installment: 10000 },
  { id: 'FP-06', course: 'Class 10 Foundation', program: '2 Year', totalFees: 80000, downPayment: 20000, months: 10, installment: 6000 },
  { id: 'FP-07', course: 'Class 10 Foundation', program: '1 Year', totalFees: 45000, downPayment: 15000, months: 6, installment: 5000 },
  { id: 'FP-08', course: '8th Standard', program: '8th std ICSE', totalFees: 60000, downPayment: 10000, months: 10, installment: 5000 },
  { id: 'FP-09', course: '8th Standard', program: '8th std CBSE', totalFees: 55000, downPayment: 10000, months: 9, installment: 5000 },
  { id: 'FP-10', course: '8th Standard', program: '8th std State Board', totalFees: 40000, downPayment: 8000, months: 8, installment: 4000 },
];

import type { Lecture, Room } from '../features/scheduler/types/scheduler';

export const INITIAL_ROOMS: Room[] = [
  { id: 'R1', branchId: 'B1', name: 'Room 101', capacity: 40, type: 'CLASSROOM', isActive: true },
  { id: 'R2', branchId: 'B1', name: 'Room 102', capacity: 30, type: 'CLASSROOM', isActive: true },
  { id: 'R3', branchId: 'B1', name: 'Chem Lab', capacity: 20, type: 'LAB', isActive: true },
  { id: 'R4', branchId: 'B2', name: 'Room 201', capacity: 50, type: 'CLASSROOM', isActive: true }
];

export const INITIAL_LECTURES: Lecture[] = [
  // Monday
  { id: 'L1', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Mathematics', teacherId: 'R. Sharma', roomId: 'Room 201', date: '2026-08-10', startTime: '08:00', endTime: '08:45', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L2', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'English', teacherId: 'S. Verma', roomId: 'Room 202', date: '2026-08-10', startTime: '08:45', endTime: '09:30', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L3', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Physics', teacherId: 'A. Singh', roomId: 'Lab 1', date: '2026-08-10', startTime: '09:30', endTime: '10:15', lectureType: 'Lab', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L4', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Chemistry', teacherId: 'P. Mehta', roomId: 'Lab 2', date: '2026-08-10', startTime: '10:30', endTime: '11:15', lectureType: 'Lab', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L5', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'History', teacherId: 'V. Joshi', roomId: 'Room 203', date: '2026-08-10', startTime: '11:15', endTime: '12:00', lectureType: 'Activity', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L6', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Computer', teacherId: 'N. Gupta', roomId: 'Lab 3', date: '2026-08-10', startTime: '12:40', endTime: '13:25', lectureType: 'Lab', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L7', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Physical Ed.', teacherId: 'M. Khan', roomId: 'Ground', date: '2026-08-10', startTime: '13:25', endTime: '14:10', lectureType: 'Activity', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },

  // Tuesday
  { id: 'L8', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Science', teacherId: 'A. Singh', roomId: 'Room 204', date: '2026-08-11', startTime: '08:00', endTime: '08:45', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L9', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Hindi', teacherId: 'K. Gupta', roomId: 'Room 205', date: '2026-08-11', startTime: '08:45', endTime: '09:30', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L10', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Mathematics', teacherId: 'R. Sharma', roomId: 'Room 201', date: '2026-08-11', startTime: '09:30', endTime: '10:15', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L11', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'English', teacherId: 'S. Verma', roomId: 'Room 202', date: '2026-08-11', startTime: '10:30', endTime: '11:15', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L12', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Geography', teacherId: 'T. Das', roomId: 'Room 203', date: '2026-08-11', startTime: '11:15', endTime: '12:00', lectureType: 'Activity', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L13', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Art', teacherId: 'P. Rao', roomId: 'Room 106', date: '2026-08-11', startTime: '12:40', endTime: '13:25', lectureType: 'Activity', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },

  // Wednesday
  { id: 'L14', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Physics', teacherId: 'A. Singh', roomId: 'Lab 1', date: '2026-08-12', startTime: '08:00', endTime: '08:45', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L15', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Mathematics', teacherId: 'R. Sharma', roomId: 'Room 201', date: '2026-08-12', startTime: '08:45', endTime: '09:30', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L16', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Chemistry', teacherId: 'P. Mehta', roomId: 'Lab 2', date: '2026-08-12', startTime: '09:30', endTime: '10:15', lectureType: 'Lab', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L17', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'English', teacherId: 'S. Verma', roomId: 'Room 202', date: '2026-08-12', startTime: '10:30', endTime: '11:15', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L18', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Computer', teacherId: 'N. Gupta', roomId: 'Lab 3', date: '2026-08-12', startTime: '11:15', endTime: '12:00', lectureType: 'Lab', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L19', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Hindi', teacherId: 'K. Gupta', roomId: 'Room 205', date: '2026-08-12', startTime: '12:40', endTime: '13:25', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L20', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Music', teacherId: 'R. Iyer', roomId: 'Room 107', date: '2026-08-12', startTime: '13:25', endTime: '14:10', lectureType: 'Activity', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },

  // Thursday
  { id: 'L21', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Chemistry', teacherId: 'P. Mehta', roomId: 'Lab 2', date: '2026-08-13', startTime: '08:00', endTime: '08:45', lectureType: 'Lab', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L22', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'History', teacherId: 'V. Joshi', roomId: 'Room 203', date: '2026-08-13', startTime: '08:45', endTime: '09:30', lectureType: 'Activity', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L23', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Mathematics', teacherId: 'R. Sharma', roomId: 'Room 201', date: '2026-08-13', startTime: '09:30', endTime: '10:15', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L24', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Biology', teacherId: 'D. Patel', roomId: 'Lab 1', date: '2026-08-13', startTime: '10:30', endTime: '11:15', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '', isOverride: true },
  { id: 'L25', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Physical Ed.', teacherId: 'M. Khan', roomId: 'Ground', date: '2026-08-13', startTime: '11:15', endTime: '12:00', lectureType: 'Activity', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L26', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Science', teacherId: 'A. Singh', roomId: 'Room 204', date: '2026-08-13', startTime: '12:40', endTime: '13:25', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L27', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Value Ed.', teacherId: 'S. Nair', roomId: 'Room 105', date: '2026-08-13', startTime: '13:25', endTime: '14:10', lectureType: 'Activity', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },

  // Friday
  { id: 'L28', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'English', teacherId: 'S. Verma', roomId: 'Room 202', date: '2026-08-14', startTime: '08:00', endTime: '08:45', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L29', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Geography', teacherId: 'T. Das', roomId: 'Room 203', date: '2026-08-14', startTime: '08:45', endTime: '09:30', lectureType: 'Activity', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L30', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Computer', teacherId: 'N. Gupta', roomId: 'Lab 3', date: '2026-08-14', startTime: '09:30', endTime: '10:15', lectureType: 'Lab', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L31', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Mathematics', teacherId: 'R. Sharma', roomId: 'Room 201', date: '2026-08-14', startTime: '10:30', endTime: '11:15', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L32', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Hindi', teacherId: 'K. Gupta', roomId: 'Room 205', date: '2026-08-14', startTime: '11:15', endTime: '12:00', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L33', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Chemistry', teacherId: 'P. Mehta', roomId: 'Lab 2', date: '2026-08-14', startTime: '12:40', endTime: '13:25', lectureType: 'Lab', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },

  // Saturday
  { id: 'L34', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Physical Ed.', teacherId: 'M. Khan', roomId: 'Ground', date: '2026-08-15', startTime: '08:00', endTime: '08:45', lectureType: 'Activity', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L35', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Art', teacherId: 'P. Rao', roomId: 'Room 106', date: '2026-08-15', startTime: '08:45', endTime: '09:30', lectureType: 'Activity', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L36', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Music', teacherId: 'R. Iyer', roomId: 'Room 107', date: '2026-08-15', startTime: '09:30', endTime: '10:15', lectureType: 'Activity', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L37', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Value Ed.', teacherId: 'S. Nair', roomId: 'Room 105', date: '2026-08-15', startTime: '10:30', endTime: '11:15', lectureType: 'Activity', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L38', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'English', teacherId: 'S. Verma', roomId: 'Room 202', date: '2026-08-15', startTime: '11:15', endTime: '12:00', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' },
  { id: 'L39', branchId: 'B1', academicYearId: 'AY26', batchId: 'JEE-Morning-A1', subjectId: 'Hindi', teacherId: 'K. Gupta', roomId: 'Room 205', date: '2026-08-15', startTime: '12:40', endTime: '13:25', lectureType: 'Regular', publishStatus: 'PUBLISHED', status: 'SCHEDULED', createdAt: '', updatedAt: '' }
];


export interface ScheduleChange {
  id: string;
  type: 'ROOM_CHANGE' | 'RESCHEDULED' | 'CANCELLED';
  batchId: string;
  subject: string;
  previousValue: string;
  newValue?: string;
  dateTime: string;
  status: 'Upcoming' | 'Occurred';
}

export const INITIAL_SCHEDULE_CHANGES: ScheduleChange[] = [
  { id: 'SC1', type: 'ROOM_CHANGE', batchId: 'JEE-Morning-A1', subject: 'Chemistry (Physical)', previousValue: 'Room 101', newValue: 'Room 104', dateTime: new Date().toISOString().split('T')[0] + ' 09:00', status: 'Upcoming' },
  { id: 'SC2', type: 'RESCHEDULED', batchId: 'NEET-Regular-B1', subject: 'Chemistry (Organic)', previousValue: 'Today 11:00 AM', newValue: 'Tomorrow 10:00 AM', dateTime: new Date().toISOString().split('T')[0] + ' 11:00', status: 'Upcoming' },
];

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

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  { id: 'A1', title: 'Thermodynamics Problem Set 4', batchId: 'JEE-Morning-A1', subject: 'Chemistry (Physical)', dueDate: '2026-08-15', status: 'Published', submittedCount: 15, totalCount: 25 },
  { id: 'A2', title: 'Organic Nomenclature Worksheet', batchId: 'NEET-Regular-B1', subject: 'Chemistry (Organic)', dueDate: '2026-08-16', status: 'Published', submittedCount: 0, totalCount: 30 },
];

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

export const INITIAL_ATTENDANCE_HISTORY: AttendanceSubmission[] = [
  {
    id: 'ATT-1',
    lectureId: 'L-PAST-1',
    batchId: 'JEE-Morning-A1',
    subject: 'Chemistry (Physical)',
    date: pastDateStr,
    time: '09:00 - 10:30',
    totalStudents: 32,
    present: 28,
    late: 2,
    absent: 2,
    submittedAt: `${pastDateStr} 10:45 AM`,
    records: [
      { studentId: 'S1', status: 'Present' },
      { studentId: 'S2', status: 'Absent', remark: 'Medical' },
      { studentId: 'S3', status: 'Late', remark: 'Traffic' },
      { studentId: 'S4', status: 'Present' },
      { studentId: 'STU-MUM-2603', status: 'Present' },
      { studentId: 'STU-MUM-2601', status: 'Absent' },
    ]
  },
  {
    id: 'ATT-2',
    lectureId: 'L-PAST-2',
    batchId: 'NEET-Regular-B1',
    subject: 'Chemistry (Organic)',
    date: pastDateStr,
    time: '11:00 - 12:30',
    totalStudents: 28,
    present: 26,
    late: 0,
    absent: 2,
    submittedAt: `${pastDateStr} 12:40 PM`,
    records: [
      { studentId: 'S5', status: 'Present' },
      { studentId: 'S6', status: 'Absent' },
      { studentId: 'STU-MUM-2603', status: 'Present' },
    ]
  }
];

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
