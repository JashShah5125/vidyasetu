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

const isBranchAdmin = (): boolean => {
  try {
    const savedUser = localStorage.getItem('vs_current_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      const role = String(user.role || '').toLowerCase().replace(/_/g, '-');
      return role === 'branch-admin';
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
  const url = isBranchAdmin()
    ? `/branch/fees/students/${studentId}/ledger`
    : `/admin/payments/students/${studentId}/ledger`;
  const response = await api.get(url);
  return response.data.data;
};

export const getStudentFeeAssignment = async (studentId: number): Promise<StudentFeeAssignmentDetails> => {
  const url = isBranchAdmin()
    ? `/branch/fees/students/${studentId}/fee-assignment`
    : `/admin/payments/students/${studentId}/fee-assignment`;
  const response = await api.get(url);
  return response.data.data;
};

export const updateStudentFeeAssignment = async (studentId: number, payload: UpdateFeeAssignmentPayload): Promise<StudentFeeAssignmentDetails> => {
  const url = isBranchAdmin()
    ? `/branch/fees/students/${studentId}/fee-assignment`
    : `/admin/payments/students/${studentId}/fee-assignment`;
  const response = await api.put(url, payload);
  return response.data.data;
};

export const recordPayment = async (payload: RecordPaymentPayload): Promise<RecordPaymentResult> => {
  const response = await api.post('/admin/payments/collect', payload);
  return response.data.data;
};

export const createInvoice = async (payload: CreateInvoicePayload): Promise<CreateInvoiceResult> => {
  const url = isBranchAdmin() ? '/branch/fees/invoices' : '/admin/payments/invoices';
  const response = await api.post(url, payload);
  return response.data.data;
};