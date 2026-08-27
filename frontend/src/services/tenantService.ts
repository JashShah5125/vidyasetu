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

  createTenant: async (tenantData: any, onUploadProgress?: (progressEvent: any) => void) => {
    const { data } = await api.post('/admin/tenants', tenantData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    });
    return data;
  },

  updateTenant: async (id: string, tenantData: any, onUploadProgress?: (progressEvent: any) => void) => {
    const { data } = await api.put(`/admin/tenants/${id}`, tenantData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    });
    return data;
  },

  updateTenantStatus: async (id: string, status: string) => {
    const { data } = await api.patch(`/admin/tenants/${id}/status`, { status });
    return data;
  }
};
