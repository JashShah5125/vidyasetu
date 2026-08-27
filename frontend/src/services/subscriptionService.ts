import api from './api';
import type { TenantSubscription } from '../types/saas';

const mapSubscriptionToFrontend = (row: any): TenantSubscription => {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name || 'Unknown Tenant',
    planId: row.plan_id,
    planName: row.plan_name || 'Unknown Plan',
    status: row.status 
      ? (row.status.charAt(0).toUpperCase() + row.status.slice(1)) as any
      : 'Active',
    billingCycle: row.billing_cycle 
      ? (row.billing_cycle.charAt(0).toUpperCase() + row.billing_cycle.slice(1)) as any 
      : 'Monthly',
    startDate: row.start_date ? row.start_date.substring(0, 10) : '2026-01-01',
    expiryDate: row.end_date ? row.end_date.substring(0, 10) : '2027-01-01',
    discount: row.subscription_discount ? parseFloat(row.subscription_discount) : 0,
    finalPrice: row.subscription_final_price !== null ? parseFloat(row.subscription_final_price) : 
      (row.billing_cycle === 'annual' ? parseFloat(row.price_annual) : parseFloat(row.price_monthly) || 0),
    tax: row.subscription_tax !== null ? parseFloat(row.subscription_tax) : 18,
    invoiceNumber: row.subscription_invoice_number || '',
    overrides: {
      maxBranches: row.override_max_branches,
      maxStaffUsers: row.override_max_staff_users,
      maxStudents: row.override_max_students,
      maxParents: row.override_max_parents,
      maxTeachers: row.override_max_teachers,
      maxStorage: row.override_max_storage,
      maxFileSize: row.override_max_file_size,
      maxSmsCredits: row.override_max_sms_credits,
      maxWhatsappMsgs: row.override_max_whatsapp_msgs
    }
  };
};

export const subscriptionService = {
  getSubscriptions: async (page = 1, limit = 50, search = '', status = 'All') => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (search) params.append('search', search);
    if (status && status !== 'All') params.append('status', status);

    const { data } = await api.get(`/admin/subscriptions?${params.toString()}`);
    if (data && data.data && Array.isArray(data.data.data)) {
      // Map the array of DB rows
      data.data.data = data.data.data.map(mapSubscriptionToFrontend);
    }
    return data;
  },

  changeSubscriptionPlan: async (id: string, planId: string) => {
    const { data } = await api.patch(`/admin/subscriptions/${id}/plan`, { planId });
    return data;
  },

  updateSubscription: async (id: string, payload: any) => {
    const { data } = await api.put(`/admin/subscriptions/${id}`, payload);
    return data;
  }
};
