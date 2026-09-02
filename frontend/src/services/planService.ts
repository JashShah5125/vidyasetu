import api from './api';
import {
  DEFAULT_FEATURES,
  DEFAULT_SUPPORT,
  DEFAULT_BRANDING,
  DEFAULT_INTEGRATIONS
} from '../types/saas';
import type { SubscriptionPlan } from '../types/saas';

export const mapPlanToFrontend = (row: any): SubscriptionPlan => {
  return {
    id: String(row.id),
    name: row.name || 'Unnamed Plan',
    code: row.code || '',
    description: row.description || '',
    status: row.status || 'Active',
    displayOrder: parseInt(row.display_order) || 0,
    monthlyPrice: parseFloat(row.monthly_price) || 0,
    quarterlyPrice: parseFloat(row.quarterly_price) || 0,
    halfYearlyPrice: parseFloat(row.half_yearly_price) || 0,
    yearlyPrice: parseFloat(row.yearly_price) || 0,
    lifetimePrice: parseFloat(row.lifetime_price) || 0,
    currency: row.currency || 'INR',
    trialDays: parseInt(row.trial_days) || 0,
    setupFee: parseFloat(row.setup_fee) || 0,
    autoRenewal: row.auto_renewal === 1 || !!row.auto_renewal,
    maxBranches: parseInt(row.max_branches) || -1,
    maxStaffUsers: parseInt(row.max_staff_users) || -1,
    maxStudents: parseInt(row.max_students) || -1,
    maxParents: parseInt(row.max_parents) || -1,
    maxTeachers: parseInt(row.max_teachers) || -1,
    maxStorage: row.max_storage || '-1',
    maxFileSize: row.max_file_size || '-1',
    maxSmsCredits: parseInt(row.max_sms_credits) || -1,
    maxWhatsappMsgs: parseInt(row.max_whatsapp_msgs) || -1,
    features: {
      admissions: !!row.features?.admissions,
      studentManagement: !!row.features?.student_management,
      parentPortal: !!row.features?.parent_portal,
      teacherPortal: !!row.features?.teacher_portal,
      attendance: !!row.features?.attendance,
      timetable: !!row.features?.timetable,
      assignments: !!row.features?.assignments,
      exams: !!row.features?.exams,
      results: !!row.features?.results,
      doubts: !!row.features?.doubts,
      fees: !!row.features?.fees,
      payroll: !!row.features?.payroll,
      income: !!row.features?.income,
      expenses: !!row.features?.expenses,
      notifications: !!row.features?.notifications,
      sms: !!row.features?.sms,
      whatsapp: !!row.features?.whatsapp,
      email: !!row.features?.email,
      reports: !!row.features?.reports,
      auditLogs: !!row.features?.audit_logs,
      importExport: !!row.features?.import_export,
      apiAccess: !!row.features?.api_access
    },
    support: {
      emailSupport: !!row.support?.email_support,
      chatSupport: !!row.support?.chat_support,
      phoneSupport: !!row.support?.phone_support,
      dedicatedAccountManager: !!row.support?.dedicated_account_manager,
      onboardingAssistance: !!row.support?.onboarding_assistance
    },
    branding: {
      whiteLabel: !!row.branding?.white_label,
      customDomain: !!row.branding?.custom_domain,
      customLogo: !!row.branding?.custom_logo,
      customEmailTemplates: !!row.branding?.custom_email_templates
    },
    integrations: {
      razorpay: !!row.integrations?.razorpay,
      cashfree: !!row.integrations?.cashfree,
      whatsappBusiness: !!row.integrations?.whatsapp_business,
      zoom: !!row.integrations?.zoom,
      googleMeet: !!row.integrations?.google_meet,
      googleCalendar: !!row.integrations?.google_calendar,
      biometricDevices: !!row.integrations?.biometric_devices
    },
    notes: row.notes || '',
    visibleTo: row.visibleTo || []
  };
};

const mapPlanToBackend = (plan: any) => {
  return {
    name: plan.name,
    code: plan.code,
    description: plan.description,
    status: plan.status,
    display_order: parseInt(plan.displayOrder) || 0,
    notes: plan.notes,
    billing: {
      monthly_price: parseFloat(plan.monthlyPrice) || 0,
      quarterly_price: parseFloat(plan.quarterlyPrice) || 0,
      half_yearly_price: parseFloat(plan.halfYearlyPrice) || 0,
      yearly_price: parseFloat(plan.yearlyPrice) || 0,
      lifetime_price: parseFloat(plan.lifetimePrice) || 0,
      currency: plan.currency,
      trial_days: parseInt(plan.trialDays) || 0,
      setup_fee: parseFloat(plan.setupFee) || 0,
      auto_renewal: plan.autoRenewal ? 1 : 0
    },
    resource_limits: {
      max_branches: parseInt(plan.maxBranches) || -1,
      max_staff_users: parseInt(plan.maxStaffUsers) || -1,
      max_students: parseInt(plan.maxStudents) || -1,
      max_parents: parseInt(plan.maxParents) || -1,
      max_teachers: parseInt(plan.maxTeachers) || -1,
      max_storage: plan.maxStorage,
      max_file_size: plan.maxFileSize,
      max_sms_credits: parseInt(plan.maxSmsCredits) || -1,
      max_whatsapp_msgs: parseInt(plan.maxWhatsappMsgs) || -1
    },
    features: {
      admissions: plan.features?.admissions ? 1 : 0,
      student_management: plan.features?.studentManagement ? 1 : 0,
      parent_portal: plan.features?.parentPortal ? 1 : 0,
      teacher_portal: plan.features?.teacherPortal ? 1 : 0,
      attendance: plan.features?.attendance ? 1 : 0,
      timetable: plan.features?.timetable ? 1 : 0,
      assignments: plan.features?.assignments ? 1 : 0,
      exams: plan.features?.exams ? 1 : 0,
      results: plan.features?.results ? 1 : 0,
      doubts: plan.features?.doubts ? 1 : 0,
      fees: plan.features?.fees ? 1 : 0,
      payroll: plan.features?.payroll ? 1 : 0,
      income: plan.features?.income ? 1 : 0,
      expenses: plan.features?.expenses ? 1 : 0,
      notifications: plan.features?.notifications ? 1 : 0,
      sms: plan.features?.sms ? 1 : 0,
      whatsapp: plan.features?.whatsapp ? 1 : 0,
      email: plan.features?.email ? 1 : 0,
      reports: plan.features?.reports ? 1 : 0,
      audit_logs: plan.features?.auditLogs ? 1 : 0,
      import_export: plan.features?.importExport ? 1 : 0,
      api_access: plan.features?.apiAccess ? 1 : 0
    },
    support: {
      email_support: plan.support?.emailSupport ? 1 : 0,
      chat_support: plan.support?.chatSupport ? 1 : 0,
      phone_support: plan.support?.phoneSupport ? 1 : 0,
      dedicated_account_manager: plan.support?.dedicatedAccountManager ? 1 : 0,
      onboarding_assistance: plan.support?.onboardingAssistance ? 1 : 0
    },
    branding: {
      white_label: plan.branding?.whiteLabel ? 1 : 0,
      custom_domain: plan.branding?.customDomain ? 1 : 0,
      custom_logo: plan.branding?.customLogo ? 1 : 0,
      custom_email_templates: plan.branding?.customEmailTemplates ? 1 : 0
    },
    integrations: {
      razorpay: plan.integrations?.razorpay ? 1 : 0,
      cashfree: plan.integrations?.cashfree ? 1 : 0,
      whatsapp_business: plan.integrations?.whatsappBusiness ? 1 : 0,
      zoom: plan.integrations?.zoom ? 1 : 0,
      google_meet: plan.integrations?.googleMeet ? 1 : 0,
      google_calendar: plan.integrations?.googleCalendar ? 1 : 0,
      biometric_devices: plan.integrations?.biometricDevices ? 1 : 0
    }
  };
};

export const planService = {
  getPlans: async (statuses?: string[]) => {
    let url = '/admin/plans';
    if (statuses && statuses.length > 0) {
      url += `?status=${statuses.join(',')}`;
    }
    const { data } = await api.get(url);
    const plansArray = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    
    return { 
      status: 'success', 
      data: plansArray.map(mapPlanToFrontend) 
    };
  },

  getPlanById: async (id: string) => {
    const { data } = await api.get(`/admin/plans/${id}`);
    if (data && data.data) {
      data.data = mapPlanToFrontend(data.data);
    }
    return data;
  },

  createPlan: async (planData: any) => {
    const backendPayload = mapPlanToBackend(planData);
    const { data } = await api.post('/admin/plans', backendPayload);
    return data;
  },

  updatePlan: async (id: string, planData: any) => {
    const backendPayload = mapPlanToBackend(planData);
    const { data } = await api.put(`/admin/plans/${id}`, backendPayload);
    return data;
  },

  updatePlanStatus: async (id: string, status: number) => {
    const { data } = await api.patch(`/admin/plans/${id}/status`, { is_active: status });
    return data;
  },

  updatePlanVisibility: async (id: string, visibleTo: string[]) => {
    const { data } = await api.put(`/admin/plans/${id}/visibility`, { visibleTo });
    return data;
  },

  deletePlan: async (id: string) => {
    const { data } = await api.delete(`/admin/plans/${id}`);
    return data;
  }
};
