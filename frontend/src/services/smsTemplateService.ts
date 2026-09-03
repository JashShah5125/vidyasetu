import api from './api';

export interface SmsTemplate {
  id: number;
  tenant_id: number;
  template_name: string;
  template_key: string;
  category: string;
  dlt_template_id: string;
  message_body: string;
  status: 'active' | 'inactive' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface SmsTemplateFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
}

export const smsTemplateService = {
  getTemplates: async (filters: SmsTemplateFilters = {}) => {
    const { data } = await api.get('/admin/sms-templates', { params: filters });
    return data;
  },

  getTemplateById: async (id: number) => {
    const { data } = await api.get(`/admin/sms-templates/${id}`);
    return data;
  },

  createTemplate: async (payload: Omit<SmsTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const { data } = await api.post('/admin/sms-templates', payload);
    return data;
  },

  updateTemplate: async (id: number, payload: Partial<SmsTemplate>) => {
    const { data } = await api.put(`/admin/sms-templates/${id}`, payload);
    return data;
  },

  deleteTemplate: async (id: number) => {
    const { data } = await api.delete(`/admin/sms-templates/${id}`);
    return data;
  }
};
