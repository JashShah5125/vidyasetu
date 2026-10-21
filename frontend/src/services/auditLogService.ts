import api from './api';

export interface AuditLogItem {
  id: number;
  tenantId: number | null;
  tenantName: string | null;
  branchId: number | null;
  branchName: string | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  severity: 'info' | 'warning' | 'critical';
  endpoint: string | null;
  requestMethod: string | null;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogFilterParams {
  page?: number;
  limit?: number;
  tenantId?: string | number;
  branchId?: string | number;
  action?: string;
  entityType?: string;
  severity?: string;
  userId?: string | number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogMeta {
  actions: string[];
  entityTypes: string[];
  severities: string[];
  tenants: Array<{ id: number; name: string }>;
  branches: Array<{ id: number; name: string }>;
}

export const auditLogService = {
  getLogs: async (params: AuditLogFilterParams = {}) => {
    const cleanParams: Record<string, any> = {};
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'All') {
        cleanParams[key] = val;
      }
    });

    const res = await api.get('/admin/audit-logs', { params: cleanParams });
    return res.data?.data as {
      items: AuditLogItem[];
      pagination: AuditLogPagination;
    };
  },

  getMeta: async () => {
    const res = await api.get('/admin/audit-logs/meta');
    return res.data?.data as AuditLogMeta;
  }
};
