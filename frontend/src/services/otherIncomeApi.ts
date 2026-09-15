import api from './api';

export interface OtherIncomeRecord {
  id: number;
  tenant_id: number;
  branch_id: number;
  income_record_number: string;
  title: string;
  description?: string | null;
  amount: number;
  income_date: string;
  payment_mode: string;
  reference_number?: string | null;
  attachment_urls: string[];
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  branch_name?: string;
  creator_name?: string;
}

export interface OtherIncomeSummary {
  totalCount: number;
  totalAmount: number;
  todayAmount: number;
  thisMonthAmount: number;
}

export interface OtherIncomeResponse {
  records: OtherIncomeRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: OtherIncomeSummary;
}

export interface CreateOtherIncomePayload {
  branchId?: number | string;
  title: string;
  description?: string;
  amount: number;
  incomeDate: string;
  paymentMode?: string;
  referenceNumber?: string;
  attachmentUrls?: string[];
}

export interface UpdateOtherIncomePayload {
  branchId?: number | string;
  title?: string;
  description?: string;
  amount?: number;
  incomeDate?: string;
  paymentMode?: string;
  referenceNumber?: string;
  attachmentUrls?: string[];
}

export const otherIncomeApi = {
  getOtherIncomes: async (params: {
    branchId?: string | number;
    search?: string;
    startDate?: string;
    endDate?: string;
    paymentMode?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<OtherIncomeResponse> => {
    const res = await api.get('/branch/finance/other-income', { params });
    return res.data?.data || res.data;
  },

  getOtherIncomeById: async (id: number | string, branchId?: string | number): Promise<OtherIncomeRecord> => {
    const res = await api.get(`/branch/finance/other-income/${id}`, {
      params: branchId ? { branchId } : undefined
    });
    return res.data?.data || res.data;
  },

  createOtherIncome: async (payload: CreateOtherIncomePayload): Promise<OtherIncomeRecord> => {
    const res = await api.post('/branch/finance/other-income', payload);
    return res.data?.data || res.data;
  },

  updateOtherIncome: async (id: number | string, payload: UpdateOtherIncomePayload): Promise<OtherIncomeRecord> => {
    const res = await api.put(`/branch/finance/other-income/${id}`, payload);
    return res.data?.data || res.data;
  },

  deleteOtherIncome: async (id: number | string, branchId?: string | number): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/branch/finance/other-income/${id}`, {
      params: branchId ? { branchId } : undefined
    });
    return res.data;
  }
};
