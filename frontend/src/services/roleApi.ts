import api from './api';

export interface RoleItem {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_system?: boolean | number;
  is_active?: boolean | number;
}

export const roleApi = {
  list: async (params: { page?: number; limit?: number; search?: string; status?: string } = {}) => {
    const { data } = await api.get('/admin/roles', { params: { limit: 100, ...params } });
    if (data?.data?.roles) return data.data.roles;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  },
  getUserRoles: async () => {
    const { data } = await api.get('/admin/users/roles');
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  }
};
