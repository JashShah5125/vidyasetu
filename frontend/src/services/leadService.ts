import api from './api';

export interface LeadListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  source?: string;
  plan?: string;
  assignedTo?: string;
}

export const leadService = {
  getLeads: async (params?: LeadListParams) => {
    const { data } = await api.get('/admin/leads', { params });
    return data;
  },

  getLead: async (id: string) => {
    const { data } = await api.get(`/admin/leads/${id}`);
    return data;
  },

  createLead: async (leadData: any) => {
    const { data } = await api.post('/admin/leads', leadData);
    return data;
  },

  updateLead: async (id: string, leadData: any) => {
    const { data } = await api.put(`/admin/leads/${id}`, leadData);
    return data;
  },

  updateLeadStatus: async (id: string, status: number) => {
    const { data } = await api.patch(`/admin/leads/${id}/status`, { status });
    return data;
  },

  deleteLead: async (id: string, lostReason?: string) => {
    const { data } = await api.delete(`/admin/leads/${id}`, {
      data: { lostReason: lostReason || null }
    });
    return data;
  },

  addFollowup: async (id: string, followupData: any) => {
    const { data } = await api.post(`/admin/leads/${id}/followups`, followupData);
    return data;
  }
};