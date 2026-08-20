import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type {
  Role,
  UserProfile,
  Tenant,
  Lead,
  Student,
  Parent,
  Enrollment,
  FeeRecord,
  Document,
  AuditLog,
  Course,
  Batch,
  Branch,
  Staff,
  Doubt,
  SubscriptionPlan,
  TenantSubscription,
  ExamItem,
  AppNotification,
  AssignmentItem,
  SupportTicket
} from '../data/mockData';
import {
  INITIAL_TENANTS,
  INITIAL_LEADS,
  INITIAL_STUDENTS,
  INITIAL_PARENTS,
  INITIAL_ENROLLMENTS,
  INITIAL_FEE_RECORDS,
  INITIAL_DOCUMENTS,
  INITIAL_COURSES,
  INITIAL_BATCHES,
  INITIAL_BRANCHES,
  INITIAL_STAFF,
  INITIAL_DOUBTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_PLANS,
  INITIAL_TENANT_SUBSCRIPTIONS,
  INITIAL_EXAMS,
  INITIAL_NOTIFICATIONS,
  TEACHER_INITIAL_ASSIGNMENTS,
  INITIAL_SUPPORT_TICKETS
} from '../data/mockData';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error' | 'warning';
}

interface AppContextType {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  tenants: Tenant[];
  leads: Lead[];
  students: Student[];
  parents: Parent[];
  enrollments: Enrollment[];
  feeRecords: FeeRecord[];
  documents: Document[];
  courses: Course[];
  batches: Batch[];
  branches: Branch[];
  staff: Staff[];
  doubts: Doubt[];
  auditLogs: AuditLog[];
  plans: SubscriptionPlan[];
  tenantSubscriptions: TenantSubscription[];
  exams: ExamItem[];
  assignments: AssignmentItem[];
  setExams: React.Dispatch<React.SetStateAction<ExamItem[]>>;
  setAssignments: React.Dispatch<React.SetStateAction<AssignmentItem[]>>;
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  sendNotification: (notification: AppNotification) => void;
  login: (email: string) => boolean;
  logout: () => void;
  addTenant: (
    name: string, 
    ownerName: string, 
    email: string, 
    mobile: string, 
    plan: string,
    renewalDate: string,
    address?: string,
    gstNo?: string,
    maxBranches?: string,
    maxStudents?: string,
    maxStorage?: string,
    maxFileSize?: string,
    startDate?: string,
    altEmails?: string[],
    defaultEmail?: string
  ) => void;
  updateTenant: (id: string, updatedFields: Partial<Tenant>) => void;
  toggleTenantStatus: (id: string) => void;
  addPlan: (p: Omit<SubscriptionPlan, 'id'>) => void;
  updatePlan: (id: string, updatedFields: Partial<SubscriptionPlan>) => void;
  deletePlan: (id: string) => void;
  addTenantSubscription: (sub: Omit<TenantSubscription, 'id'>) => void;
  updateTenantSubscription: (id: string, fields: Partial<TenantSubscription>) => void;
  deleteTenantSubscription: (id: string) => void;
  addLead: (name: string, mobile: string, parentMobile: string, course: string, program: string, level: string, source: string, remarks: string, assignedBranch?: string, preferredBranch?: string, status?: string, followups?: any[], demoScheduledOn?: string, counsellor?: string) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addFollowup: (leadId: string, type: string, outcome: string, nextDate: string) => void;
  convertLeadToStudent: (leadId: string, fullFormData: any) => void;
  recordPayment: (studentId: string, amount: number, mode: string) => any;
  updateAttendance: (studentId: string, status: 'Present' | 'Absent' | 'Late') => void;
  updateExamMarks: (studentId: string, testScore: string) => void;
  approveStudentRegistration: (studentId: string) => void;
  allocateBatch: (studentId: string, batchName: string, courseName: string, programName: string, levelName: string) => void;
  addCourse: (course: Course) => void;
  updateCourse: (idOrCode: string, course: Partial<Course>) => void;
  addBatch: (batch: Batch) => void;
  addBranch: (branch: Branch) => void;
  addStaff: (staff: Staff) => void;
  addDoubtMessage: (doubtId: string, sender: 'student' | 'teacher', text: string, attachments?: string[]) => void;
  updateDoubtStatus: (doubtId: string, status: 'Pending' | 'In Progress' | 'Resolved' | 'Reopened') => void;
  sendDoubtReply: (doubtId: string, text: string) => void;
  logAction: (action: string, details: string) => void;
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  setBatches: React.Dispatch<React.SetStateAction<Batch[]>>;
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  tickets: SupportTicket[];
  addSupportTicket: (subject: string, description: string, priority: 'Low' | 'Medium' | 'High' | 'Critical', tenantName: string) => void;
  replyToSupportTicket: (ticketId: string, replyText: string, senderName: string) => void;
  resolveSupportTicket: (ticketId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('vs_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('vs_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('vs_current_user');
    }
  }, [currentUser]);

  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('vs_leads');
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('vs_students');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length < INITIAL_STUDENTS.length) {
        return INITIAL_STUDENTS;
      }
      return parsed;
    }
    return INITIAL_STUDENTS;
  });
  const [parents, setParents] = useState<Parent[]>(() => {
    const saved = localStorage.getItem('vs_parents');
    return saved ? JSON.parse(saved) : INITIAL_PARENTS;
  });
  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => {
    const saved = localStorage.getItem('vs_enrollments');
    return saved ? JSON.parse(saved) : INITIAL_ENROLLMENTS;
  });
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>(() => {
    const saved = localStorage.getItem('vs_fee_records');
    return saved ? JSON.parse(saved) : INITIAL_FEE_RECORDS;
  });
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);

  useEffect(() => {
    localStorage.setItem('vs_leads', JSON.stringify(leads));
    fetch('/api/save-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leads)
    }).catch(() => {});
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('vs_students', JSON.stringify(students));
    fetch('/api/save-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(students)
    }).catch(() => {});
  }, [students]);

  useEffect(() => {
    localStorage.setItem('vs_parents', JSON.stringify(parents));
  }, [parents]);

  useEffect(() => {
    localStorage.setItem('vs_enrollments', JSON.stringify(enrollments));
  }, [enrollments]);

  useEffect(() => {
    localStorage.setItem('vs_fee_records', JSON.stringify(feeRecords));
  }, [feeRecords]);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [batches, setBatches] = useState<Batch[]>(INITIAL_BATCHES);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [staff, setStaff] = useState<Staff[]>(INITIAL_STAFF);
  const [doubts, setDoubts] = useState<Doubt[]>(INITIAL_DOUBTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(INITIAL_PLANS);
  const [tenantSubscriptions, setTenantSubscriptions] = useState<TenantSubscription[]>(INITIAL_TENANT_SUBSCRIPTIONS);
  const [exams, setExams] = useState<ExamItem[]>(INITIAL_EXAMS);
  const [assignments, setAssignments] = useState<AssignmentItem[]>(TEACHER_INITIAL_ASSIGNMENTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_SUPPORT_TICKETS);

  const logAction = (action: string, details: string) => {
    const actorName = currentUser ? currentUser.name : 'System';
    const actorRole = currentUser ? currentUser.role : 'System';
    
    let ipAddress = '127.0.0.1';
    if (actorName === 'System') {
      ipAddress = '10.0.0.1';
    } else if (actorRole === 'saas-admin') {
      ipAddress = '192.168.1.100';
    } else {
      ipAddress = `192.168.1.${Math.floor(10 + Math.random() * 90)}`;
    }

    const newLog: AuditLog = {
      id: `AL-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: actorName,
      role: actorRole,
      action,
      details,
      ipAddress,
      institute: currentUser ? currentUser.tenantName : 'System'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const login = (emailInput: string) => {
    let name = '';
    let email = emailInput.trim().toLowerCase();
    let tenantName = 'Apex IIT Academy';
    let tenantId = 'VS-001';
    let role: Role = 'inst-admin';
    let branch = 'Mumbai West';

    const matchedTenant = tenants.find(t => {
      const defEmail = (t.defaultEmail || t.email || '').trim().toLowerCase();
      return defEmail === email;
    });

    if (email === 'owner@vidyasetu.com') {
      role = 'saas-admin';
      name = 'Alexander Vance';
      tenantName = 'Vidya Setu Platform';
      tenantId = 'SYSTEM';
      branch = '';
    } else if (matchedTenant) {
      role = 'inst-admin';
      name = matchedTenant.ownerName;
      tenantName = matchedTenant.name;
      tenantId = matchedTenant.id;
    } else if (email === 'mumbai@apexiit.com') {
      role = 'branch-admin';
      name = 'Mrs. Seema Deshpande';
    } else if (email === 'counsel@apexiit.com') {
      role = 'counsellor';
      name = 'Priya Sen';
    } else if (email === 'kelkar@apexiit.com') {
      role = 'teacher';
      name = 'Prof. Arvind Kelkar';
    } else if (email === 'finance@apexiit.com') {
      role = 'finance';
      name = 'Nitin Joshi';
    } else {
      return false;
    }

    const profile: UserProfile = {
      name,
      email,
      role,
      branch: role === 'saas-admin' ? undefined : branch,
      tenantId,
      tenantName
    };
    setCurrentUser(profile);
    logAction('USER_LOGIN', `Logged in as ${roleLabels[role]}`);
    return true;
  };

  const logout = () => {
    logAction('USER_LOGOUT', 'Logged out');
    setCurrentUser(null);
  };

  const addTenant = (
    name: string, 
    ownerName: string, 
    email: string, 
    mobile: string, 
    plan: string,
    renewalDate: string,
    address?: string,
    gstNo?: string,
    maxBranches?: string,
    maxStudents?: string,
    maxStorage?: string,
    maxFileSize?: string,
    startDate?: string,
    altEmails?: string[],
    defaultEmail?: string
  ) => {
    const newT: Tenant = {
      id: `VS-00${tenants.length + 1}`,
      name,
      ownerName,
      email,
      mobile: mobile || '9999999999',
      branchCount: 1,
      studentCount: 0,
      status: 'Active',
      plan,
      renewalDate,
      address,
      gstNo,
      maxBranches,
      maxStudents,
      maxStorage,
      maxFileSize,
      startDate,
      altEmails,
      defaultEmail: defaultEmail || email
    };
    setTenants(prev => [...prev, newT]);
    logAction('CREATE_TENANT', `Created new tenant: ${name} (${newT.id})`);
  };

  const updateTenant = (id: string, updatedFields: Partial<Tenant>) => {
    setTenants(prev => prev.map(t => {
      if (t.id === id) {
        logAction('UPDATE_TENANT', `Updated details for tenant ${id}`);
        return { ...t, ...updatedFields };
      }
      return t;
    }));
  };

  const toggleTenantStatus = (id: string) => {
    setTenants(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Active' ? 'Suspended' : 'Active';
        logAction('TOGGLE_TENANT_STATUS', `Changed status of tenant ${id} to ${nextStatus}`);
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const addPlan = (p: Omit<SubscriptionPlan, 'id'>) => {
    const newPlan: SubscriptionPlan = {
      id: `PLAN-00${plans.length + 1}`,
      ...p
    };
    setPlans(prev => [...prev, newPlan]);
    logAction('CREATE_PLAN', `Created subscription plan: ${p.name} (${newPlan.id})`);
  };

  const updatePlan = (id: string, updatedFields: Partial<SubscriptionPlan>) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
    logAction('UPDATE_PLAN', `Updated subscription plan: ${id}`);
  };

  const deletePlan = (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
    logAction('DELETE_PLAN', `Deleted subscription plan: ${id}`);
  };

  const addTenantSubscription = (sub: Omit<TenantSubscription, 'id'>) => {
    const newSub: TenantSubscription = {
      id: `SUB-${Math.floor(100 + Math.random() * 900)}`,
      ...sub
    };
    setTenantSubscriptions(prev => [newSub, ...prev]);
    logAction('CREATE_SUBSCRIPTION', `Assigned plan "${sub.planName}" to tenant "${sub.tenantName}"`);
  };

  const updateTenantSubscription = (id: string, fields: Partial<TenantSubscription>) => {
    setTenantSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...fields } : s));
    logAction('UPDATE_SUBSCRIPTION', `Updated subscription: ${id}`);
  };

  const deleteTenantSubscription = (id: string) => {
    setTenantSubscriptions(prev => prev.filter(s => s.id !== id));
    logAction('DELETE_SUBSCRIPTION', `Cancelled/deleted subscription: ${id}`);
  };

  const addLead = (name: string, mobile: string, parentMobile: string, course: string, program: string, level: string, source: string, remarks: string, assignedBranch?: string, preferredBranch?: string, status?: string, followups?: any[], demoScheduledOn?: string, counsellor?: string) => {
    const newL: Lead = {
      id: `L-${Math.floor(100 + Math.random() * 900)}`,
      name,
      mobile,
      parentMobile,
      course,
      program,
      level,
      branch: assignedBranch || currentUser?.branch || 'Mumbai West',
      preferredBranch,
      source,
      counsellor: counsellor || currentUser?.name || 'Receptionist',
      status: (status as Lead['status']) || 'New Enquiry',
      demoScheduledOn,
      nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      remarks,
      followups: followups || []
    };
    setLeads(prev => [newL, ...prev]);
    logAction('ADD_LEAD', `Logged new lead: ${newL.name} (${newL.id})`);
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    logAction('UPDATE_LEAD', `Updated lead details: ${id}`);
  };

  const addFollowup = (leadId: string, type: string, outcome: string, nextDate: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        logAction('LOG_FOLLOWUP', `Scheduled follow-up for lead: ${l.name}`);
        return {
          ...l,
          status: 'Follow-up',
          nextFollowUp: nextDate || new Date().toISOString().split('T')[0],
          followups: [
            ...l.followups,
            {
              date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
              type,
              outcome,
              nextDate
            }
          ]
        };
      }
      return l;
    }));
  };

  const createParent = (parentData: any) => {
    const newParent: Parent = {
      id: `P-${Math.floor(100 + Math.random() * 900)}`,
      name: parentData.name,
      mobile: parentData.mobile,
      email: parentData.email,
      relation: parentData.relation,
      occupation: parentData.occupation,
      childrenIds: []
    };
    setParents(prev => [...prev, newParent]);
    return newParent;
  };

  const createStudent = (studentData: any, parentId: string) => {
    const newStudentId = `STU-NEW-${Math.floor(2600 + Math.random() * 99)}`;
    const newStudent: Student = {
      id: `S-${Math.floor(200 + Math.random() * 900)}`,
      studentId: newStudentId,
      parentId,
      enrollmentIds: [],
      name: studentData.name,
      mobile: studentData.mobile,
      dob: studentData.dob,
      gender: studentData.gender,
      email: studentData.email,
      address: studentData.address,
      category: studentData.category,
      schoolName: studentData.schoolName,
      currentClass: studentData.currentClass,
      board: studentData.board,
      targetExam: studentData.targetExam,
      yearOfAttempt: studentData.yearOfAttempt,
      status: 'Registration Pending'
    };
    setStudents(prev => [...prev, newStudent]);
    return newStudent;
  };

  const createEnrollment = (courseData: any, studentId: string) => {
    const newEnrollment: Enrollment = {
      id: `E-${Math.floor(300 + Math.random() * 900)}`,
      studentId,
      course: courseData.course,
      program: courseData.program,
      level: courseData.level,
      batchId: courseData.batchId,
      status: 'Active'
    };
    setEnrollments(prev => [...prev, newEnrollment]);
    return newEnrollment;
  };

  const createFeeRecord = (feeData: any, enrollmentId: string) => {
    const newFeeRecord: FeeRecord = {
      id: `F-${Math.floor(400 + Math.random() * 900)}`,
      enrollmentId,
      totalFee: feeData.totalFee,
      discount: feeData.discount,
      netFee: feeData.netFee,
      downpayment: feeData.downpayment,
      installments: feeData.installments,
      installmentAmount: feeData.installmentAmount
    };
    setFeeRecords(prev => [...prev, newFeeRecord]);
    return newFeeRecord;
  };

  const saveDocuments = (docsData: any[], studentId: string) => {
    const newDocs = docsData.map((d, i) => ({
      id: `D-${Math.floor(500 + Math.random() * 900)}-${i}`,
      studentId,
      type: d.type,
      fileName: d.fileName,
      fileSize: d.fileSize,
      uploadedAt: new Date().toISOString(),
      status: 'Pending' as const
    }));
    setDocuments(prev => [...prev, ...newDocs]);
    return newDocs;
  };

  const convertLeadToStudent = (leadId: string, fullFormData: any) => {
    const leadItem = leads.find(l => l.id === leadId);
    if (!leadItem) return;

    // Orchestration
    const parent = createParent(fullFormData.parent);
    const student = createStudent(fullFormData.student, parent.id);
    const enrollment = createEnrollment(fullFormData.course, student.id);
    createFeeRecord(fullFormData.fee, enrollment.id);
    saveDocuments(fullFormData.documents, student.id);

    // Link Entities
    setParents(prev => prev.map(p => p.id === parent.id ? { ...p, childrenIds: [student.id] } : p));
    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, enrollmentIds: [enrollment.id], status: 'Verification Pending' } : s));

    // Update Lead Status
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: 'Converted' } : l));
    
    logAction('CONVERT_LEAD', `Converted lead ${leadItem.name} via Registration Stepper`);
  };

  const approveStudentRegistration = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    logAction('APPROVE_ADMISSION', `Approved and verified admission files for: ${student.name} (${student.studentId})`);
    addToast(`Successfully approved and verified admission for ${student.name}!`);

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, status: 'Active Student' };
      }
      return s;
    }));
  };

  const allocateBatch = (studentId: string, batchName: string, courseName: string, programName: string, levelName: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          batch: batchName,
          course: courseName,
          program: programName,
          level: levelName
        };
      }
      return s;
    }));

    const student = students.find(s => s.id === studentId);
    if (student && student.enrollmentIds && student.enrollmentIds.length > 0) {
      setEnrollments(prev => prev.map(e => {
        if (student.enrollmentIds.includes(e.id)) {
          return {
            ...e,
            batchId: batchName,
            course: courseName,
            program: programName,
            level: levelName
          };
        }
        return e;
      }));
    }

    logAction('ALLOCATE_BATCH', `Allocated batch ${batchName} to student ${student?.name || studentId}`);
  };

  const addCourse = (course: Course) => {
    const enriched = {
      ...course,
      id: course.id || `C-${Math.floor(100 + Math.random() * 900)}`,
      programs: course.programDetails?.map(p => p.name) || course.programs || []
    };
    setCourses(prev => [...prev, enriched]);
  };

  const updateCourse = (idOrCode: string, updates: Partial<Course>) => {
    setCourses(prev => prev.map(c => {
      if (c.id === idOrCode || c.code === idOrCode) {
        const merged = { ...c, ...updates };
        // Sync backward-compatible programs array
        if (updates.programDetails) {
          merged.programs = updates.programDetails.map(p => p.name);
        }
        return merged;
      }
      return c;
    }));
  };

  const addBatch = (batchItem: Batch) => {
    setBatches(prev => [...prev, batchItem]);
    logAction('ADD_BATCH', `Added Batch: ${batchItem.name}`);
  };

  const addBranch = (branchItem: Branch) => {
    setBranches(prev => [...prev, branchItem]);
    logAction('ADD_BRANCH', `Added Branch: ${branchItem.name}`);
  };

  const addStaff = (staffItem: Staff) => {
    setStaff(prev => [...prev, staffItem]);
    logAction('ADD_STAFF', `Added Staff Member: ${staffItem.name}`);
  };

  const recordPayment = (studentId: string, amount: number, mode: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return null;

    const studentEnrollments = enrollments.filter(e => student.enrollmentIds?.includes(e.id));
    const mainEnrollment = studentEnrollments.find(e => e.status === 'Active') || studentEnrollments[0];
    const feeRec = mainEnrollment ? feeRecords.find(f => f.enrollmentId === mainEnrollment.id) : null;
    const studentFeePlan = student.feePlan || (feeRec ? {
      total: feeRec.netFee,
      paid: feeRec.downpayment,
      pending: feeRec.netFee - feeRec.downpayment
    } : { total: 120000, paid: 0, pending: 120000 });

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const baseFeePlan = s.feePlan || studentFeePlan;
        const newPaid = baseFeePlan.paid + Number(amount);
        return {
          ...s,
          status: 'Active Student',
          feePlan: {
            ...baseFeePlan,
            paid: newPaid,
            pending: Math.max(0, baseFeePlan.total - newPaid)
          }
        };
      }
      return s;
    }));

    logAction('RECORD_PAYMENT', `Collected fee Rs. ${amount} via ${mode} from student ${student.name}`);

    return {
      receiptNo: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toLocaleDateString(),
      studentName: student.name,
      studentId: student.studentId,
      course: student.course,
      amount: Number(amount),
      mode,
      balance: Math.max(0, studentFeePlan.total - (studentFeePlan.paid + Number(amount)))
    };
  };

  const updateAttendance = (studentId: string, status: 'Present' | 'Absent' | 'Late') => {
    const student = students.find(s => s.id === studentId);
    logAction('MARK_ATTENDANCE', `Marked attendance of student ${student?.name || studentId} as ${status}`);
  };

  const updateExamMarks = (studentId: string, testScore: string) => {
    const student = students.find(s => s.id === studentId);
    logAction('RECORD_MARKS', `Recorded score of ${testScore}/100 for student ${student?.name || studentId}`);
  };

  const addDoubtMessage = (doubtId: string, sender: 'student' | 'teacher', text: string, attachments?: string[]) => {
    const doubt = doubts.find(d => d.id === doubtId);
    if (!doubt) return;

    if (sender === 'teacher') {
      logAction('ANSWER_DOUBT', `Replied to doubt: "${doubt.messages[0]?.text?.substring(0, 30)}..."`);
    }

    setDoubts(prev => prev.map(d => {
      if (d.id === doubtId) {
        const newStatus = (sender === 'teacher' && (d.status === 'Pending' || d.status === 'Reopened')) 
          ? 'In Progress' 
          : (sender === 'student' && d.status === 'Resolved') 
            ? 'Reopened' 
            : d.status;

        return {
          ...d,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          messages: [
            ...d.messages,
            {
              id: `M-${Math.floor(Math.random() * 10000)}`,
              sender,
              text,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              attachments
            }
          ]
        };
      }
      return d;
    }));
  };

  const updateDoubtStatus = (doubtId: string, status: 'Pending' | 'In Progress' | 'Resolved' | 'Reopened') => {
    const doubt = doubts.find(d => d.id === doubtId);
    if (!doubt) return;

    if (status === 'Resolved') {
      logAction('RESOLVE_DOUBT', `Resolved doubt for student: ${doubt.studentName}`);
    } else if (status === 'Reopened') {
      logAction('REOPEN_DOUBT', `Reopened doubt for student: ${doubt.studentName}`);
    }

    setDoubts(prev => prev.map(d => {
      if (d.id === doubtId) {
        return {
          ...d,
          status,
          updatedAt: new Date().toISOString()
        };
      }
      return d;
    }));
  };

  const sendDoubtReply = (doubtId: string, text: string) => {
    addDoubtMessage(doubtId, 'teacher', text);
    updateDoubtStatus(doubtId, 'Resolved');
  };

  const addToast = (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, status: 'Read' } : n
    ));
  };

  const sendNotification = (notification: AppNotification) => {
    setNotifications(prev => [notification, ...prev]);
    addToast('Notification sent successfully!');
  };

  const addSupportTicket = (subject: string, description: string, priority: 'Low' | 'Medium' | 'High' | 'Critical', tenantName: string) => {
    const newTicket: SupportTicket = {
      id: `TKT-${Math.floor(100 + Math.random() * 900)}`,
      tenantName,
      subject,
      priority,
      status: 'Open',
      created: new Date().toISOString().replace('T', ' ').substring(0, 19),
      replies: [
        {
          sender: currentUser?.name || 'Operator',
          text: description,
          time: new Date().toISOString().replace('T', ' ').substring(0, 19)
        }
      ],
      description
    };
    setTickets(prev => [newTicket, ...prev]);
    logAction('RAISE_TICKET', `Raised ticket regarding: ${subject}`);
    addToast('Support ticket raised successfully!', 'success');
  };

  const replyToSupportTicket = (ticketId: string, replyText: string, senderName: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const isStaff = currentUser?.role === 'saas-admin';
        return {
          ...t,
          status: isStaff ? 'In Progress' : t.status,
          replies: [
            ...t.replies,
            {
              sender: senderName,
              text: replyText,
              time: new Date().toISOString().replace('T', ' ').substring(0, 19)
            }
          ]
        };
      }
      return t;
    }));
    logAction('REPLY_TICKET', `Replied to ticket: ${ticketId}`);
    addToast('Response sent.');
  };

  const resolveSupportTicket = (ticketId: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        return { ...t, status: 'Resolved' };
      }
      return t;
    }));
    logAction('RESOLVE_TICKET', `Resolved ticket: ${ticketId}`);
    addToast(`Ticket resolved successfully!`, 'success');
  };

  const enrichedStudents = useMemo(() => {
    return students.map(s => {
      const baseFeePlan = s.feePlan || { total: 0, paid: 0, pending: 0 };
      if (!s.enrollmentIds || s.enrollmentIds.length === 0) {
        return {
          ...s,
          feePlan: baseFeePlan
        };
      }
      const studentEnrollments = enrollments.filter(e => s.enrollmentIds.includes(e.id));
      const mainEnrollment = studentEnrollments.find(e => e.status === 'Active') || studentEnrollments[0];
      if (!mainEnrollment) {
        return {
          ...s,
          feePlan: baseFeePlan
        };
      }
      
      const feeRec = feeRecords.find(f => f.enrollmentId === mainEnrollment.id);
      
      return {
        ...s,
        course: mainEnrollment.course || s.course,
        program: mainEnrollment.program,
        level: mainEnrollment.level,
        batch: mainEnrollment.batchId || s.batch,
        feePlan: feeRec ? {
          total: feeRec.netFee,
          paid: feeRec.downpayment,
          pending: feeRec.netFee - feeRec.downpayment
        } : baseFeePlan
      };
    });
  }, [students, enrollments, feeRecords]);

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      tenants,
      leads,
      students: enrichedStudents,
      parents,
      enrollments,
      feeRecords,
      documents,
      courses,
      batches,
      branches,
      staff,
      doubts,
      auditLogs,
      plans,
      tenantSubscriptions,
      exams,
      assignments,
      setExams,
      setAssignments,
      login,
      logout,
      addTenant,
      updateTenant,
      toggleTenantStatus,
      addPlan,
      updatePlan,
      deletePlan,
      addTenantSubscription,
      updateTenantSubscription,
      deleteTenantSubscription,
      addLead,
      updateLead,
      addFollowup,
      convertLeadToStudent,
      recordPayment,
      updateAttendance,
      updateExamMarks,
      approveStudentRegistration,
      allocateBatch,
      addCourse,
      updateCourse,
      addBatch,
      addBranch,
      addStaff,
      addDoubtMessage,
      updateDoubtStatus,
      sendDoubtReply,
      logAction,
      setCourses,
      setBatches,
      setBranches,
      setStaff,
      toasts,
      addToast,
      notifications,
      markNotificationRead,
      sendNotification,
      tickets,
      addSupportTicket,
      replyToSupportTicket,
      resolveSupportTicket
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

const roleLabels: Record<Role, string> = {
  'saas-admin': 'SaaS Super Admin',
  'inst-admin': 'Institute Admin',
  'branch-admin': 'Branch Admin',
  'counsellor': 'Counsellor / Admissions',
  'teacher': 'Teacher / Faculty',
  'finance': 'Finance Staff'
};
