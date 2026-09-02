import api from './api';
import type { SubscriptionPlan, TenantSubscription } from '../types/saas';
import { mapPlanToFrontend } from './planService';

export interface InstituteTenant {
  id: string;
  name: string;
  status: string;
  gstNo?: string;
  ownerName: string;
  email: string;
  mobile: string;
  address?: string;
  altEmails?: string[];
}

export interface InstituteProfile {
  tenant: InstituteTenant;
  subscription: TenantSubscription | null;
  plan: SubscriptionPlan | null;
}

const titleCase = (value?: string | null) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

const safeJsonArray = (value: any): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const mapTenant = (row: any): InstituteTenant => ({
  id: String(row.id),
  name: row.name || '',
  status: titleCase(row.status) || 'Active',
  gstNo: row.gst_number || undefined,
  ownerName: row.owner_name || row.ownerName || '—',
  email: row.primary_email || row.contact_email || '',
  mobile: row.owner_mobile || row.contact_phone || '',
  address: row.address_line1 || undefined,
  altEmails: safeJsonArray(row.alternate_emails)
});

const CYCLE_MAP: Record<string, any> = {
  annual: 'Yearly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half Yearly',
  lifetime: 'Lifetime'
};

const mapSubscription = (row: any, plan?: any): TenantSubscription | null => {
  if (!row) return null;

  const cycle = row.billing_cycle || 'annual';
  const basePrice =
    cycle === 'annual' ? parseFloat(plan?.yearlyPrice) : parseFloat(plan?.monthlyPrice);

  return {
    id: String(row.id),
    tenantId: String(row.id),
    tenantName: row.name || 'Unknown Tenant',
    planId: row.plan_id !== null && row.plan_id !== undefined ? String(row.plan_id) : '',
    planName: plan?.name || 'Unknown Plan',
    status: (titleCase(row.subscription_status) || 'Active') as any,
    billingCycle: (CYCLE_MAP[cycle] || 'Yearly') as any,
    startDate: row.start_date ? String(row.start_date).substring(0, 10) : '—',
    expiryDate: (row.end_date || row.renewal_date)
      ? String(row.end_date || row.renewal_date).substring(0, 10)
      : '—',
    discount: row.subscription_discount != null ? parseFloat(row.subscription_discount) : 0,
    finalPrice:
      row.subscription_final_price != null
        ? parseFloat(row.subscription_final_price)
        : !isNaN(basePrice)
          ? basePrice
          : 0,
    tax: row.subscription_tax != null ? parseFloat(row.subscription_tax) : 0,
    invoiceNumber: row.subscription_invoice_number || '',
    overrides: {
      maxBranches: row.override_max_branches ?? undefined,
      maxStaffUsers: row.override_max_staff_users ?? undefined,
      maxStudents: row.override_max_students ?? undefined,
      maxParents: row.override_max_parents ?? undefined,
      maxTeachers: row.override_max_teachers ?? undefined,
      maxStorage: row.override_max_storage ?? undefined,
      maxFileSize: row.override_max_file_size ?? undefined,
      maxSmsCredits: row.override_max_sms_credits ?? undefined,
      maxWhatsappMsgs: row.override_max_whatsapp_msgs ?? undefined
    }
  };
};

export const getInstituteProfile = async (): Promise<InstituteProfile> => {
  const { data } = await api.get('/institute/profile');
  const payload = data?.data || {};
  const plan = payload?.plan ? mapPlanToFrontend(payload.plan) : null;

  return {
    tenant: mapTenant(payload?.tenant),
    subscription: mapSubscription(payload?.tenant, payload?.plan),
    plan
  };
};

export interface UpdateInstituteProfilePayload {
  adminEmail?: string;
  alternateEmails?: string[];
  mobile?: string;
  address?: string;
}

export const updateInstituteProfile = async (payload: UpdateInstituteProfilePayload) => {
  const { data } = await api.put('/institute/profile', payload);
  return data;
};