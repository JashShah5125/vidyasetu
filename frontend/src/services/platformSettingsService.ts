import api from './api';

export interface PlatformSetting {
  id: number;
  category: string;
  key_name: string;
  value: string;
  is_secret: number;
  created_at: string;
  updated_at: string;
}

export const platformSettingsService = {
  getSettings: async (params?: { page?: number; limit?: number; search?: string; category?: string; status?: string }) => {
    const { data } = await api.get('/admin/platform-settings', { params });
    return data;
  },

  getSettingById: async (id: number) => {
    const { data } = await api.get(`/admin/platform-settings/${id}`);
    return data;
  },

  createSetting: async (payload: { category?: string; key_name: string; value: string; is_secret?: number }) => {
    const { data } = await api.post('/admin/platform-settings', payload);
    return data;
  },

  updateSetting: async (id: number, payload: { key_name?: string; value?: string; is_secret?: number; category?: string }) => {
    const { data } = await api.put(`/admin/platform-settings/${id}`, payload);
    return data;
  },

  deleteSetting: async (id: number) => {
    const { data } = await api.delete(`/admin/platform-settings/${id}`);
    return data;
  }
};
