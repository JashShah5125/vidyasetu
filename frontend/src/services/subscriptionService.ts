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
    discount: 0,
    finalPrice: row.billing_cycle === 'annual' ? parseFloat(row.price_annual) : parseFloat(row.price_monthly) || 0,
    tax: 0,
    invoiceNumber: '',
    overrides: {}
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
  }
};
