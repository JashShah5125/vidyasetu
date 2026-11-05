import api from './api';

export interface StudentLedgerInvoice {
  id: number;
  tenant_id: number;
  branch_id: number;
  student_id: number;
  enrollment_id: number;
  fee_assignment_id: number;
  invoice_number: string;
  installment_number: number;
  description?: string;
  issue_date: string;
  due_date: string;
  payment_date?: string | null;
  amount: number;
  paid_amount: number;
  balance_due: number;
  outstanding: number;
  payment_mode?: string | null;
  transaction_reference?: string | null;
  remarks?: string | null;
  status: 'unpaid' | 'paid';
}

export interface StudentFeeAssignment {
  id: number;
  tenant_id: number;
  branch_id: number;
  student_id: number;
  enrollment_id: number;
  fee_source_type: string;
  fee_source_id?: number | null;
  gross_amount: number;
  total_concession: number;
  net_amount: number;
  down_payment: number;
  installment_count: number;
  installment_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentLedger {
  id: number;
  tenant_id: number;
  primary_branch_id: number;
  branch_name?: string;
  student_code: string;
  full_name: string;
  mobile?: string;
  email?: string;
  student_status?: string;
  enrollment_id?: number;
  academic_year_id?: number;
  academic_year_name?: string;
  batch_id?: number;
  batch_name?: string;
  feeAssignment: StudentFeeAssignment | null;
  invoices: StudentLedgerInvoice[];
  totalOutstanding: number;
  expected_due_till_date?: number;
  fees_overdue?: number;
}

export interface PaymentAllocation {
  id: number;
  invoice_number: string;
  installment_number: number;
  amount: number;
  paid_amount: number;
  balance_due: number;
  status: string;
}

export interface RecordPaymentPayload {
  student_id: number;
  enrollment_id?: number;
  branch_id?: number;
  amount: number;
  payment_mode: string;
  transaction_reference?: string;
  remarks?: string;
  installment_ids?: number[];
}

export interface RecordPaymentResult {
  receipt: {
    id: number;
    receipt_number: string;
    amount: number;
    receipt_date: string;
  };
  payment: {
    id: number;
    payment_mode: string;
    amount: number;
    reference_number?: string | null;
    status: string;
  };
  allocations: PaymentAllocation[];
  feeAssignment: {
    id: number;
    net_amount: number;
    paid_amount: number;
    balance_amount: number;
    status: string;
  };
  outstandingAfter: number;
}

export interface CreateInvoicePayload {
  student_id: number;
  amount: number;
  payment_mode: string;
  transaction_reference?: string;
  remarks?: string;
  description?: string;
  issue_date?: string;
  due_date?: string;
}

export interface CreatedInvoice {
  id: number;
  invoice_number: string;
  description: string;
  issue_date: string;
  due_date: string;
  payment_date: string;
  amount: number;
  paid_amount: number;
  balance_due: number;
  payment_mode: string;
  transaction_reference?: string | null;
  remarks?: string | null;
  status: string;
}

export interface CreateInvoiceResult {
  invoice: CreatedInvoice;
  feeAssignment: {
    id: number;
    net_amount: number;
    paid_amount: number;
    balance_amount: number;
    status: string;
  };
}

const isBranchUser = (): boolean => {
  try {
    const savedUser = localStorage.getItem('vs_current_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      const role = String(user.role || '').toLowerCase().replace(/_/g, '-');
      const userType = String(user.userType || '').toLowerCase();
      return role === 'branch-admin' || role === 'branch_admin' || role === 'finance' || userType === 'finance' || Boolean(user.branchId);
    }
  } catch {
    // fallback
  }
  return false;
};

export interface StudentFeeAssignmentDetails {
  id: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  branchId: number;
  branchName?: string;
  enrollmentId: number;
  feeSourceType: string;
  feeSourceId?: number | null;
  feeSourceName?: string;
  grossAmount: number;
  totalConcession: number;
  netAmount: number;
  downPayment: number;
  installmentCount: number;
  installmentAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
}

export interface UpdateFeeAssignmentPayload {
  grossAmount: number;
  totalConcession?: number;
  downPayment?: number;
  installmentCount?: number;
}

export const getStudentLedger = async (studentId: number): Promise<StudentLedger> => {
  const url = isBranchUser()
    ? `/branch/finance/students/${studentId}/ledger`
    : `/admin/payments/students/${studentId}/ledger`;
  const response = await api.get(url);
  return response.data.data;
};

export const getStudentFeeAssignment = async (studentId: number): Promise<StudentFeeAssignmentDetails> => {
  const url = isBranchUser()
    ? `/branch/fees/students/${studentId}/fee-assignment`
    : `/admin/payments/students/${studentId}/fee-assignment`;
  const response = await api.get(url);
  return response.data.data;
};

export const updateStudentFeeAssignment = async (studentId: number, payload: UpdateFeeAssignmentPayload): Promise<StudentFeeAssignmentDetails> => {
  const url = isBranchUser()
    ? `/branch/fees/students/${studentId}/fee-assignment`
    : `/admin/payments/students/${studentId}/fee-assignment`;
  const response = await api.put(url, payload);
  return response.data.data;
};

export const recordPayment = async (payload: RecordPaymentPayload): Promise<RecordPaymentResult> => {
  const response = await api.post('/admin/payments/collect', payload);
  return response.data.data;
};

export const collectBranchPayment = async (
  studentId: number,
  payload: {
    feeAssignmentId?: number;
    amount: number;
    paymentMode: string;
    transactionReference?: string;
    remarks?: string;
  }
) => {
  const response = await api.post(`/branch/finance/students/${studentId}/payments`, payload);
  return response.data.data;
};

export const createInvoice = async (payload: CreateInvoicePayload): Promise<CreateInvoiceResult> => {
  if (isBranchUser()) {
    const response = await api.post(`/branch/finance/students/${payload.student_id}/payments`, {
      amount: payload.amount,
      paymentMode: payload.payment_mode,
      transactionReference: payload.transaction_reference,
      remarks: payload.remarks || payload.description
    });
    return response.data.data;
  }
  const response = await api.post('/admin/payments/invoices', payload);
  return response.data.data;
};

export interface UpdateInvoicePayload {
  amount?: number;
  payment_mode?: string;
  paymentMode?: string;
  transaction_reference?: string;
  transactionReference?: string;
  description?: string;
  remarks?: string;
  issue_date?: string;
  issueDate?: string;
  due_date?: string;
  dueDate?: string;
  payment_date?: string;
  paymentDate?: string;
}

export const updateInvoice = async (invoiceId: number, payload: UpdateInvoicePayload) => {
  const url = isBranchUser()
    ? `/branch/finance/invoices/${invoiceId}`
    : `/admin/payments/invoices/${invoiceId}`;
  const response = await api.put(url, payload);
  return response.data.data;
};

export const deleteInvoice = async (invoiceId: number) => {
  const url = isBranchUser()
    ? `/branch/finance/invoices/${invoiceId}`
    : `/admin/payments/invoices/${invoiceId}`;
  const response = await api.delete(url);
  return response.data.data;
};

// ── Sprint 4: Automated Installment Schedule Builder ──

export interface GenerateInstallmentsPayload {
  schedule_type?: 'monthly' | 'termly' | 'custom';
  scheduleType?: 'monthly' | 'termly' | 'custom';
  installment_count: number;
  installmentCount?: number;
  first_due_date?: string;
  firstDueDate?: string;
  due_day?: number;
  dueDay?: number;
  down_payment?: number;
  downPayment?: number;
  send_reminder?: boolean;
  sendReminder?: boolean;
}

export interface GenerateInstallmentsResult {
  success: boolean;
  studentId: number;
  scheduleType: string;
  installmentCount: number;
  totalScheduled: number;
  invoices: StudentLedgerInvoice[];
  message: string;
}

export const generateInstallmentSchedule = async (
  studentId: number,
  payload: GenerateInstallmentsPayload
): Promise<GenerateInstallmentsResult> => {
  const response = await api.post(`/admin/payments/students/${studentId}/generate-installments`, payload);
  return response.data.data;
};

export interface SendReminderResult {
  success: boolean;
  invoiceId: number;
  invoiceNumber: string;
  studentName: string;
  mobile: string;
  email?: string;
  amountDue: number;
  dueDate: string;
  isOverdue: boolean;
  channel: string;
  dispatchedAt: string;
  message: string;
}

export const sendPaymentReminder = async (invoiceId: number): Promise<SendReminderResult> => {
  const response = await api.post(`/admin/payments/invoices/${invoiceId}/send-reminder`);
  return response.data.data;
};

// ── Sprint 4: Payment Reconciliation ──

export interface ReconciliationTransaction {
  id: number;
  tenant_id: number;
  receipt_id: number;
  payment_mode: string;
  amount: number;
  reference_number?: string | null;
  bank_reference?: string | null;
  bank_date?: string | null;
  reconciliation_status: 'unreconciled' | 'reconciled' | 'discrepancy';
  reconciled_at?: string | null;
  reconciled_by?: number | null;
  reconciliation_notes?: string | null;
  payment_date: string;
  created_at: string;
  receipt_number: string;
  receipt_date: string;
  branch_id?: number | null;
  branch_name?: string | null;
  student_id: number;
  student_name: string;
  student_code?: string | null;
  student_mobile?: string | null;
  batch_name?: string | null;
  reconciled_by_name?: string | null;
}

export interface ReconciliationSummary {
  totalCount: number;
  totalAmount: number;
  reconciledAmount: number;
  reconciledCount: number;
  unreconciledAmount: number;
  unreconciledCount: number;
  discrepancyAmount: number;
  discrepancyCount: number;
  reconciliationRate: number;
}

export interface ReconciliationResponse {
  summary: ReconciliationSummary;
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  transactions: ReconciliationTransaction[];
}

export interface GetReconciliationParams {
  branchId?: string | number;
  status?: string;
  paymentMode?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const getReconciliationTransactions = async (
  params?: GetReconciliationParams
): Promise<ReconciliationResponse> => {
  const response = await api.get('/admin/payments/reconciliation', { params });
  return response.data.data;
};

export interface UpdateReconciliationPayload {
  paymentIds: number[];
  payment_ids?: number[];
  status: 'reconciled' | 'unreconciled' | 'discrepancy';
  bankReference?: string;
  bank_reference?: string;
  bankDate?: string;
  bank_date?: string;
  reconciliationNotes?: string;
  reconciliation_notes?: string;
}

export const updateReconciliationStatus = async (
  payload: UpdateReconciliationPayload
): Promise<{ success: boolean; updatedCount: number; status: string; paymentIds: number[] }> => {
  const response = await api.post('/admin/payments/reconcile', payload);
  return response.data.data;
};