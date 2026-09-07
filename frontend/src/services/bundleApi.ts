import api from './api';

export interface BundleSubject {
  id: string;
  name: string;
  code: string;
}

export interface SubjectBundle {
  id: string;
  branch_id: string;
  level_id: string;
  name: string;
  description?: string;
  fee_amount?: number | null;
  fee_plan_id?: string | null;
  is_active: boolean;
  subject_count?: number;
  level_name?: string | null;
  program_id?: string | null;
  program_name?: string | null;
  course_id?: string | null;
  course_name?: string | null;
  branch_name?: string | null;
  subjects?: BundleSubject[];
  created_at?: string;
  updated_at?: string;
}

export interface BundleListResponse {
  status: string;
  data: SubjectBundle[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BundleCreatePayload {
  levelId: string | number;
  branchId: string | number;
  name: string;
  description?: string;
  is_active?: boolean;
  subjectIds: Array<string | number>;
  feeAmount?: number | null;
}

export const bundleApi = {
  list: async (params: { page?: number; limit?: number; search?: string; levelId?: string | number; branchId?: string | number; status?: string } = {}): Promise<BundleListResponse> => {
    const { data } = await api.get('/admin/bundles', { params });
    return data;
  },

  getById: async (id: string | number) => {
    const { data } = await api.get(`/admin/bundles/${id}`);
    return data;
  },

  create: async (payload: BundleCreatePayload) => {
    const { data } = await api.post('/admin/bundles', payload);
    return data;
  },

  update: async (id: string | number, payload: Partial<BundleCreatePayload>) => {
    const { data } = await api.put(`/admin/bundles/${id}`, payload);
    return data;
  },

  delete: async (id: string | number) => {
    const { data } = await api.delete(`/admin/bundles/${id}`);
    return data;
  }
};