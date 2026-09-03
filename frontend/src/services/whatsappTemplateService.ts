import api from './api';

export interface WhatsAppButton {
  type: 'URL' | 'PHONE' | 'QUICK_REPLY';
  text: string;
  url?: string;
  phone?: string;
}

export interface WhatsAppTemplate {
  id: number;
  tenant_id: number;
  template_name: string;
  template_key: string;
  category: string;
  dlt_template_id: string;
  header_type: 'none' | 'text' | 'image' | 'video' | 'document';
  header_content: string | null;
  message_body: string;
  footer_text: string | null;
  buttons: WhatsAppButton[] | null;
  status: 'active' | 'inactive' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplateFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
}

export const whatsappTemplateService = {
  getTemplates: async (filters: WhatsAppTemplateFilters = {}) => {
    const { data } = await api.get('/admin/whatsapp-templates', { params: filters });
    return data;
  },

  getTemplateById: async (id: number) => {
    const { data } = await api.get(`/admin/whatsapp-templates/${id}`);
    return data;
  },

  createTemplate: async (payload: Omit<WhatsAppTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const { data } = await api.post('/admin/whatsapp-templates', payload);
    return data;
  },

  updateTemplate: async (id: number, payload: Partial<WhatsAppTemplate>) => {
    const { data } = await api.put(`/admin/whatsapp-templates/${id}`, payload);
    return data;
  },

  deleteTemplate: async (id: number) => {
    const { data } = await api.delete(`/admin/whatsapp-templates/${id}`);
    return data;
  }
};
