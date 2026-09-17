import api from './api';

export interface OtherExpenseRecord {
  id: number;
  tenant_id: number;
  branch_id: number;
  expense_record_number: string;
  title: string;
  category: string;
  description?: string | null;
  amount: number;
  expense_date: string;
  status: number;
  payment_mode: string;
  reference_number?: string | null;
  payee?: string | null;
  attachment_urls: string[];
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  branch_name?: string;
  creator_name?: string;
}

export interface OtherExpenseSummary {
  totalCount: number;
  totalAmount: number;
  todayAmount: number;
  thisMonthAmount: number;
  pendingAmount: number;
  paidAmount: number;
}

export interface OtherExpenseResponse {
  records: OtherExpenseRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: OtherExpenseSummary;
}

export interface CreateOtherExpensePayload {
  branchId?: number | string;
  title: string;
  description?: string;
  category?: string;
  amount: number;
  expenseDate: string;
  status?: number;
  paymentMode?: string;
  referenceNumber?: string;
  payee?: string;
  attachmentUrls?: string[];
}

export interface UpdateOtherExpensePayload {
  branchId?: number | string;
  title?: string;
  description?: string;
  category?: string;
  amount?: number;
  expenseDate?: string;
  status?: number;
  paymentMode?: string;
  referenceNumber?: string;
  payee?: string;
  attachmentUrls?: string[];
}

export const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Pending', color: 'amber' },
  1: { label: 'Approved', color: 'blue' },
  2: { label: 'Paid', color: 'emerald' },
  3: { label: 'Rejected', color: 'rose' },
  4: { label: 'Deleted', color: 'slate' }
};

export const EXPENSE_CATEGORIES = [
  'Other Expenses',
  'Petty Cash',
  'Emergency',
  'Maintenance',
  'Miscellaneous',
  'Office Supplies',
  'Travel',
  'Communication',
  'Events'
];

export const otherExpenseApi = {
  getOtherExpenses: async (params: {
    branchId?: string | number;
    search?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
    status?: number | string;
    paymentMode?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<OtherExpenseResponse> => {
    const res = await api.get('/branch/finance/other-expenses', { params });
    return res.data?.data || res.data;
  },

  getOtherExpenseById: async (id: number | string, branchId?: string | number): Promise<OtherExpenseRecord> => {
    const res = await api.get(`/branch/finance/other-expenses/${id}`, {
      params: branchId ? { branchId } : undefined
    });
    return res.data?.data || res.data;
  },

  createOtherExpense: async (payload: CreateOtherExpensePayload): Promise<OtherExpenseRecord> => {
    const res = await api.post('/branch/finance/other-expenses', payload);
    return res.data?.data || res.data;
  },

  updateOtherExpense: async (id: number | string, payload: UpdateOtherExpensePayload): Promise<OtherExpenseRecord> => {
    const res = await api.put(`/branch/finance/other-expenses/${id}`, payload);
    return res.data?.data || res.data;
  },

  deleteOtherExpense: async (id: number | string, branchId?: string | number): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/branch/finance/other-expenses/${id}`, {
      params: branchId ? { branchId } : undefined
    });
    return res.data;
  }
};
