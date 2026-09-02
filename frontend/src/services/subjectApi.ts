import api from './api';

export interface Subject {
  id: string;
  name: string;
  code: string;
  type: string;
  description?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface SubjectCreatePayload {
  name: string;
  code: string;
  type?: string;
  description?: string;
  status?: string;
}

export const subjectApi = {
  list: async (params: { page?: number; limit?: number; search?: string; status?: string; courseId?: string; programId?: string; levelId?: string } = {}) => {
    const { data } = await api.get('/admin/subjects', { params });
    return data;
  },
  
  getByCode: async (code: string) => {
    const { data } = await api.get(`/admin/subjects/${code}`);
    return data;
  },
  
  create: async (payload: SubjectCreatePayload) => {
    const { data } = await api.post('/admin/subjects', payload);
    return data;
  },
  
  update: async (code: string, payload: Partial<SubjectCreatePayload>) => {
    const { data } = await api.put(`/admin/subjects/${code}`, payload);
    return data;
  },
  
  delete: async (code: string) => {
    const { data } = await api.delete(`/admin/subjects/${code}`);
    return data;
  }
};
