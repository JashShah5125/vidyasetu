import api from './api';

export interface CourseApiProgramLevel {
  id?: string | number;
  name?: string;
  code?: string;
  duration?: string;
  is_active?: boolean;
}

export interface CourseApiProgram {
  id?: string | number;
  name?: string;
  code?: string;
  duration?: string;
  is_active?: boolean;
  levels?: CourseApiProgramLevel[];
}

export interface CourseCreatePayload {
  name: string;
  code: string;
  description?: string;
  is_active?: boolean;
  branches: Array<number | string>;
  programs?: CourseApiProgram[];
}

export const courseApi = {
  list: async (params: { page?: number; limit?: number; search?: string; branchId?: number; status?: string } = {}) => {
    const { data } = await api.get('/admin/courses', { params });
    return data;
  },
  getByCode: async (code: string) => {
    const { data } = await api.get(`/admin/courses/${code}`);
    return data;
  },
  create: async (payload: CourseCreatePayload) => {
    const { data } = await api.post('/admin/courses', payload);
    return data;
  },
  update: async (code: string, payload: Partial<CourseCreatePayload>) => {
    const { data } = await api.put(`/admin/courses/${code}`, payload);
    return data;
  },
  remove: async (code: string) => {
    const { data } = await api.delete(`/admin/courses/${code}`);
    return data;
  }
};
