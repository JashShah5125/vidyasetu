import api from './api';

export interface ProgramFeePlan {
  id: string;
  course_id: string;
  course_name: string;
  course_code: string;
  name: string;
  code?: string;
  duration?: string;
  totalFees: number;
  downPayment: number;
  months: number;
  installment: number;
  is_active: boolean;
}

export interface ProgramFeeListResponse {
  status: string;
  data: ProgramFeePlan[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LevelSubjectFee {
  id: string;
  name: string;
  code: string;
  type: string;
  fee: number;
}

export interface FeeUpsertPayload {
  totalFee?: number;
  downPayment?: number;
  months?: number;
}

export interface SubjectFeeUpsertPayload {
  levelId: string | number;
  subjectId: string | number;
  feeAmount: number;
}

export const feeApi = {
  listFeePlans: async (params: {
    page?: number;
    limit?: number;
    courseId?: string | number;
    programId?: string | number;
    search?: string;
  } = {}): Promise<ProgramFeeListResponse> => {
    const { data } = await api.get('/admin/fee-plans', { params });
    return data;
  },

  upsertProgramFeePlan: async (programId: string | number, payload: FeeUpsertPayload) => {
    const { data } = await api.put(`/admin/fee-plans/${programId}`, payload);
    return data;
  },

  deleteProgramFeePlan: async (programId: string | number) => {
    const { data } = await api.delete(`/admin/fee-plans/${programId}`);
    return data;
  },

  listLevelSubjectFees: async (levelId: string | number) => {
    const { data } = await api.get(`/admin/fee-plans/levels/${levelId}/subjects`);
    return data;
  },

  upsertSubjectFee: async (payload: SubjectFeeUpsertPayload) => {
    const { data } = await api.put('/admin/fee-plans/subject-fees', payload);
    return data;
  }
};