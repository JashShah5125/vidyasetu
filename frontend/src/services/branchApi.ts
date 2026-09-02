import api from './api';
import type { Branch } from '../data/mockData';

export interface BranchApiProgramMapping {
  courseId?: number | string;
  courseCode?: string;
  programIds?: Array<number | string>;
  programCodes?: string[];
}

export interface BranchApiPayload {
  name: string;
  code: string;
  status?: 'Active' | 'Inactive' | 'Suspended' | 'Deleted';
  capacity?: number;
  address?: string;
  email?: string;
  phone?: string;
  operatingHours?: string;
  bankDetails?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    ifsc?: string;
  };
  admin?: string;
  adminEmail?: string;
  adminMobile?: string;
  altEmails?: string[];
  defaultEmail?: string;
  courseIds?: Array<number | string>;
  programMappings?: BranchApiProgramMapping[];
  replaceMappings?: boolean;
}

export const branchApi = {
  list: async (params: { page?: number; limit?: number; search?: string; status?: string } = {}) => {
    const { data } = await api.get('/admin/branches', { params });
    return data;
  },
  getByCode: async (code: string) => {
    const { data } = await api.get(`/admin/branches/${code}`);
    return data;
  },
  create: async (payload: BranchApiPayload) => {
    const { data } = await api.post('/admin/branches', payload);
    return data;
  },
  update: async (code: string, payload: Partial<BranchApiPayload>) => {
    const { data } = await api.put(`/admin/branches/${code}`, payload);
    return data;
  },
  remove: async (code: string) => {
    const { data } = await api.delete(`/admin/branches/${code}`);
    return data;
  }
};

// Convert a backend branch row into the frontend Branch shape used by the
// branch pages (mock-data contract).
export const toBranch = (row: Record<string, any>): Branch => {
  const settings = {
    altEmails: Array.isArray(row.altEmails) ? row.altEmails : [],
    defaultEmail: row.defaultEmail || '',
  };
  const coursesPrograms = (row.programMappings || []).map((m: any) => m.programName);
  const coursesOffered = [...new Set((row.programMappings || []).map((m: any) => m.courseName).filter(Boolean))] as string[];

  return {
    id: String(row.id),
    name: row.name,
    code: row.code,
    admin: row.admin || '',
    adminEmail: row.adminEmail || '',
    adminMobile: row.adminMobile || '',
    capacity: row.capacity ?? 0,
    status: (row.status || 'Active') as 'Active' | 'Inactive' | 'Suspended' | 'Deleted',
    address: row.address_line1 || row.address || '',
    email: row.email || '',
    phone: row.phone || '',
    operatingHours: row.operating_hours || row.operatingHours || '',
    bankDetails: {
      accountName: row.bank_account_name || '',
      accountNumber: row.bank_account_number || '',
      ifsc: row.bank_ifsc || '',
      bankName: row.bank_name || '',
    },
    programs: coursesPrograms,
    courses: coursesOffered,
    altEmails: settings.altEmails,
    defaultEmail: settings.defaultEmail,
  };
};