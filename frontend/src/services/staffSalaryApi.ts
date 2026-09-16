import api from './api';

export interface StaffSalaryMasterItem {
  id: number;
  tenant_id: number;
  user_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  employee_type: string;
  designation: string;
  department: string;
  contact_number: string;
  email: string;
  joining_date: string;
  salary_type: string;
  salary_amount: number;
  salary_effective_from: string | null;
  primary_branch_name: string;
  primary_branch_id: number;
}

export interface StaffSalaryStatusItem {
  staff_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  employee_type: string;
  designation: string;
  department: string;
  contact_number: string;
  email: string;
  salary_amount: number;
  salary_effective_from: string | null;
  branch_name: string;
  branch_id: number;
  payment_id: number | null;
  paid_amount: number | null;
  paid_date: string | null;
  payment_mode: string | null;
  reference: string | null;
  remarks: string | null;
  payment_recorded_at: string | null;
  payment_status: 'PAID' | 'PENDING';
}

export interface SalaryStatusSummary {
  totalSalary: number;
  paidAmount: number;
  pendingAmount: number;
  totalStaff: number;
  paidCount: number;
  pendingCount: number;
}

export interface SalaryPaymentRecord {
  id: number;
  salary_month: number;
  salary_year: number;
  amount: number;
  paid_date: string;
  payment_mode: string;
  reference: string | null;
  remarks: string | null;
  created_at: string;
  status: string;
}

export interface StaffSalaryHistoryResponse {
  staff: {
    id: number;
    employeeId: string;
    name: string;
    firstName: string;
    lastName: string;
    employeeType: string;
    designation: string;
    department: string;
    email: string;
    contactNumber: string;
    joiningDate: string;
    salaryType: string;
    currentSalary: number;
    salaryEffectiveFrom: string | null;
    branchName: string;
    branchId: number;
  };
  summary: {
    totalPaid: number;
    monthsPaid: number;
    lastPaymentDate: string | null;
  };
  history: SalaryPaymentRecord[];
}

export interface PaySalaryPayload {
  salaryMonth: number;
  salaryYear: number;
  amount: number;
  paidDate: string;
  paymentMode: string;
  reference?: string;
  remarks?: string;
  branchId?: number;
}

export const staffSalaryApi = {
  // Page 1: Get master staff salary structure
  getStaffSalariesMaster: async (params?: {
    search?: string;
    employeeType?: string;
    branchId?: string | number;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get('/branch/finance/staff-salaries', { params });
    return res.data;
  },

  // Page 1: Update basic monthly salary & effective from date
  updateStaffSalary: async (
    staffId: number | string,
    payload: {
      salaryAmount: number;
      salaryType?: string;
      salaryEffectiveFrom?: string | null;
    }
  ) => {
    const res = await api.put(`/branch/finance/staff-salaries/${staffId}`, payload);
    return res.data;
  },

  // Page 2: Get monthly salary status (PAID / PENDING) and summary totals
  getSalaryStatus: async (params: {
    month: number;
    year: number;
    status?: string;
    employeeType?: string;
    search?: string;
    branchId?: string | number;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get('/branch/finance/staff-salaries/status', { params });
    return res.data;
  },

  // Action: Pay staff salary for a month
  paySalary: async (staffId: number | string, payload: PaySalaryPayload) => {
    const res = await api.post(`/branch/finance/staff-salaries/${staffId}/pay`, payload);
    return res.data;
  },

  // Page 3: Get staff salary detail & payment history
  getStaffSalaryHistory: async (staffId: number | string) => {
    const res = await api.get(`/branch/finance/staff-salaries/${staffId}/history`);
    return res.data;
  }
};
