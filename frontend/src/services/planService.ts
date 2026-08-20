import api from './api';
import {
  DEFAULT_FEATURES,
  DEFAULT_SUPPORT,
  DEFAULT_BRANDING,
  DEFAULT_INTEGRATIONS
} from '../types/saas';
import type { SubscriptionPlan } from '../types/saas';

const mapPlanToFrontend = (row: any): SubscriptionPlan => {
  return {
    id: row.id,
    name: row.name || 'Unnamed Plan',
    code: row.code || '',
    description: row.description || '',
    status: row.is_active ? 'Active' : 'Inactive',
    displayOrder: 0,
    billingType: 'Monthly',
    price: parseFloat(row.price_monthly) || 0,
    currency: 'INR',
    trialDays: parseInt(row.trial_period_days) || 0,
    setupFee: 0,
    renewalPrice: parseFloat(row.price_monthly) || 0,
    autoRenewal: true,
    maxInstances: 1,
    maxBranches: parseInt(row.max_branches) || 0,
    maxStaffUsers: parseInt(row.max_users) || 0,
    maxStudents: parseInt(row.max_students) || 0,
    maxParents: parseInt(row.max_students) * 2 || 0,
    maxTeachers: parseInt(row.max_users) || 0,
    maxStorage: row.max_storage_gb ? `${row.max_storage_gb}GB` : '5GB',
    maxFileSize: '100MB',
    maxSmsCredits: 0,
    maxWhatsappMsgs: 0,
    features: { ...DEFAULT_FEATURES },
    support: { ...DEFAULT_SUPPORT },
    branding: { ...DEFAULT_BRANDING },
    integrations: { ...DEFAULT_INTEGRATIONS },
    notes: '',
    visibleTo: []
  };
};

const mapPlanToBackend = (plan: any) => {
  return {
    name: plan.name,
    code: plan.code,
    description: plan.description,
    price_monthly: plan.price,
    price_annual: plan.price * 10,
    max_branches: plan.maxBranches,
    max_students: plan.maxStudents,
    max_users: plan.maxStaffUsers,
    max_storage_gb: parseInt(plan.maxStorage) || 5,
    trial_period_days: plan.trialDays
  };
};

export const planService = {
  getPlans: async () => {
    const { data } = await api.get('/admin/plans');
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
  }
};
