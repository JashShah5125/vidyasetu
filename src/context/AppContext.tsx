import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Role,
  UserProfile,
  Tenant,
  Lead,
  Student,
  AuditLog,
  Course,
  Batch,
  Branch,
  Staff,
  Doubt,
  SubscriptionPlan,
  TenantSubscription,
  ExamItem
} from '../data/mockData';
import {
  INITIAL_TENANTS,
  INITIAL_LEADS,
  INITIAL_STUDENTS,
  INITIAL_COURSES,
  INITIAL_BATCHES,
  INITIAL_BRANCHES,
  INITIAL_STAFF,
  INITIAL_DOUBTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_PLANS,
  INITIAL_TENANT_SUBSCRIPTIONS,
  INITIAL_EXAMS
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
  courses: Course[];
  batches: Batch[];
  branches: Branch[];
  staff: Staff[];
  doubts: Doubt[];
  auditLogs: AuditLog[];
  plans: SubscriptionPlan[];
  tenantSubscriptions: TenantSubscription[];
  exams: ExamItem[];
  setExams: React.Dispatch<React.SetStateAction<ExamItem[]>>;
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
  addLead: (name: string, mobile: string, parentMobile: string, course: string, program: string, level: string, source: string, remarks: string, assignedBranch?: string, preferredBranch?: string, status?: string, followups?: any[], demoScheduledOn?: string) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addFollowup: (leadId: string, type: string, outcome: string, nextDate: string) => void;
  convertLeadToStudent: (leadId: string, course: string, batch: string, totalFee: number, discount: number, paidFee: number) => void;
  recordPayment: (studentId: string, amount: number, mode: string) => any;
  updateAttendance: (studentId: string, status: 'Present' | 'Absent' | 'Late') => void;
  updateExamMarks: (studentId: string, testScore: string) => void;
  approveStudentRegistration: (studentId: string) => void;
  addCourse: (course: Course) => void;
  addBatch: (batch: Batch) => void;
  addBranch: (branch: Branch) => void;
  addStaff: (staff: Staff) => void;
  sendDoubtReply: (doubtId: string, text: string) => void;
  logAction: (action: string, details: string) => void;
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  setBatches: React.Dispatch<React.SetStateAction<Batch[]>>;
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
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
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [batches, setBatches] = useState<Batch[]>(INITIAL_BATCHES);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [staff, setStaff] = useState<Staff[]>(INITIAL_STAFF);
  const [doubts, setDoubts] = useState<Doubt[]>(INITIAL_DOUBTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(INITIAL_PLANS);
  const [tenantSubscriptions, setTenantSubscriptions] = useState<TenantSubscription[]>(INITIAL_TENANT_SUBSCRIPTIONS);
  const [exams, setExams] = useState<ExamItem[]>(INITIAL_EXAMS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

  const addLead = (name: string, mobile: string, parentMobile: string, course: string, program: string, level: string, source: string, remarks: string, assignedBranch?: string, preferredBranch?: string, status?: string, followups?: any[], demoScheduledOn?: string) => {
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
      counsellor: currentUser?.name || 'Receptionist',
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

  const convertLeadToStudent = (leadId: string, course: string, batch: string, totalFee: number, discount: number, paidFee: number) => {
    const leadItem = leads.find(l => l.id === leadId);
    if (!leadItem) return;

    const newStudentId = `STU-${leadItem.branch.substring(0, 3).toUpperCase()}-${Math.floor(2600 + Math.random() * 99)}`;
    const finalFee = totalFee - discount;

    const newStudent: Student = {
      id: `S-${Math.floor(200 + Math.random() * 900)}`,
      studentId: newStudentId,
      name: leadItem.name,
      mobile: leadItem.mobile,
      parentMobile: leadItem.mobile,
      course,
      batch,
      branch: leadItem.branch,
      status: 'Registration Pending',
      admissionDate: new Date().toISOString().split('T')[0],
      feePlan: {
        total: finalFee,
        paid: paidFee,
        pending: finalFee - paidFee
      }
    };

    setStudents(prev => [...prev, newStudent]);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: 'Interested' } : l));
    logAction('CONVERT_LEAD', `Converted lead ${leadItem.name} to Student Profile ${newStudentId}`);
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

  const addCourse = (courseItem: Course) => {
    setCourses(prev => [...prev, courseItem]);
    logAction('ADD_COURSE', `Added Course Master: ${courseItem.name}`);
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

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const newPaid = s.feePlan.paid + Number(amount);
        return {
          ...s,
          feePlan: {
            ...s.feePlan,
            paid: newPaid,
            pending: Math.max(0, s.feePlan.total - newPaid)
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
      balance: Math.max(0, student.feePlan.total - (student.feePlan.paid + Number(amount)))
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

  const sendDoubtReply = (doubtId: string, text: string) => {
    const doubt = doubts.find(d => d.id === doubtId);
    if (!doubt) return;

    logAction('RESOLVE_DOUBT', `Answered student doubt question: "${doubt.messages[0]?.text}"`);

    setDoubts(prev => prev.map(d => {
      if (d.id === doubtId) {
        return {
          ...d,
          status: 'Resolved',
          messages: [
            ...d.messages,
            {
              sender: 'teacher',
              text,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]
        };
      }
      return d;
    }));
  };

  const addToast = (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      tenants,
      leads,
      students,
      courses,
      batches,
      branches,
      staff,
      doubts,
      auditLogs,
      plans,
      tenantSubscriptions,
      exams,
      setExams,
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
      addCourse,
      addBatch,
      addBranch,
      addStaff,
      sendDoubtReply,
      logAction,
      setCourses,
      setBatches,
      setBranches,
      setStaff,
      toasts,
      addToast
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
