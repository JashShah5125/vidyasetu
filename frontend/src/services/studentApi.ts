import api from './api';

export interface StudentRosterItem {
  id: number;
  tenant_id: number;
  primary_branch_id: number;
  branch_name?: string;
  student_code: string;
  full_name: string;
  dob?: string;
  gender?: string;
  mobile?: string;
  email?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  category?: string;
  school_name?: string;
  current_class?: string;
  target_exam?: string;
  year_of_attempt?: string;
  blood_group?: string;
  profile_photo_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
  enrollment_id?: number;
  batch_id?: number;
  batch_name?: string;
  batch_code?: string;
  academic_year_id?: number;
  academic_year_name?: string;
  guardian_name?: string;
  guardian_mobile?: string;
  guardian_relation?: string;
  guardian_email?: string;
  total_fees_gross?: number;
  total_concession?: number;
  total_fees?: number;
  down_payment?: number;
  installment_count?: number;
  installment_amount?: number;
  fees_paid?: number;
  fees_outstanding?: number;
  fee_status?: string;
}

export interface FeeAssignment {
  id: number;
  gross_amount: number;
  total_concession?: number;
  discount_amount?: number;
  net_amount: number;
  down_payment?: number;
  downpayment_amount?: number;
  installment_count: number;
  installment_amount: number;
  paid_amount: number;
  balance_amount?: number;
  balance_due?: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | string;
  created_at: string;
}

export interface StudentInvoice {
  id: number;
  invoice_number: string;
  installment_number: number;
  issue_date: string;
  due_date: string;
  amount?: number;
  billed_amount?: number;
  paid_amount: number;
  balance_due: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | string;
  payment_date?: string;
  payment_mode?: string;
  transaction_reference?: string;
  transaction_ref?: string;
}

export interface StudentDetail extends StudentRosterItem {
  enrolled_date?: string;
  enrollment_status?: string;
  guardian_id?: number;
  guardian_occupation?: string;
  subjectBundle?: {
    id: number;
    name: string;
    description?: string;
    subject_ids?: number[];
  } | null;
  subject_selection_type?: 'bundle' | 'custom';
  bundle_id?: number | null;
  custom_subject_ids?: number[] | null;
  subjectsList?: Array<{
    id: number;
    name: string;
    code: string;
  }>;
  feeAssignment?: FeeAssignment | null;
  invoicesList?: StudentInvoice[];
}

export interface AcademicOptions {
  branches: Array<{ id: number; name: string }>;
  courses: Array<{ id: number; name: string }>;
  programs: Array<{ id: number; course_id: number; name: string; code?: string }>;
  levels: Array<{ id: number; course_id?: number; program_id?: number; name: string }>;
  batches: Array<{ id: number; branch_id: number; level_id: number; name: string; code: string }>;
  bundles: Array<{ id: number; branch_id: number; level_id: number; name: string; description: string; fee_amount?: number; subject_ids: number[] }>;
  subjects?: Array<{ id: number; name: string; code: string; type?: string }>;
  levelSubjects?: Array<{ level_id: number; course_id?: number; program_id?: number; id: number; name: string; code: string; type?: string; fee_amount?: number }>;
  academicYears: Array<{ id: number; name: string; status: string }>;
}

export interface CreateStudentPayload {
  primary_branch_id: number;
  full_name: string;
  mobile?: string;
  email?: string;
  dob?: string;
  gender?: string;
  blood_group?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  category?: string;
  school_name?: string;
  current_class?: string;
  target_exam?: string;
  year_of_attempt?: string;
  batch_id?: number;
  bundle_id?: number;
  subject_selection_type?: 'bundle' | 'custom';
  custom_subject_ids?: number[];
  academic_year_id?: number;
  guardian_name?: string;
  guardian_mobile?: string;
  guardian_relation?: string;
  guardian_email?: string;
  guardian_occupation?: string;
  gross_amount?: number | string;
  discount_amount?: number | string;
  downpayment_amount?: number | string;
  installment_count?: number | string;
  status?: string;
}

export const getStudents = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: string | number;
  batchId?: string | number;
  bundleId?: string | number;
  status?: string;
  feeStatus?: string;
}) => {
  const response = await api.get('/admin/students', { params });
  return response.data;
};

export const getStudentById = async (id: number) => {
  const response = await api.get(`/admin/students/${id}`);
  return response.data;
};

export const createStudent = async (payload: CreateStudentPayload) => {
  const response = await api.post('/admin/students', payload);
  return response.data;
};

export const updateStudent = async (id: number, payload: Partial<CreateStudentPayload>) => {
  const response = await api.put(`/admin/students/${id}`, payload);
  return response.data;
};

export const deleteStudent = async (id: number) => {
  const response = await api.delete(`/admin/students/${id}`);
  return response.data;
};

export const getAcademicOptions = async () => {
  const response = await api.get('/admin/students/options/academic');
  return response.data;
};
