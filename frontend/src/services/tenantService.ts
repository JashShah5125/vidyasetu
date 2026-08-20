import api from './api';

export interface TenantListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  plan?: string;
}

export const tenantService = {
  getTenants: async (params?: TenantListParams) => {
    const { data } = await api.get('/admin/tenants', { params });
    return data;
  },

  getTenantById: async (id: string) => {
    const { data } = await api.get(`/admin/tenants/${id}`);
    return data;
  },

  createTenant: async (tenantData: any) => {
    const { data } = await api.post('/admin/tenants', tenantData);
    return data;
  },

  updateTenantStatus: async (id: string, status: string) => {
    const { data } = await api.patch(`/admin/tenants/${id}/status`, { status });
    return data;
  }
};
