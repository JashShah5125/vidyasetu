// ─────────────────────────────────────────────────────────────────────────────
// Institute Admin Dashboard — TypeScript Types
// Matches the GET /api/admin/dashboard/institute response shape exactly.
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardFiltersOption {
  id: number;
  name: string;
  code?: string;
}

export interface DashboardMeta {
  from: string;
  to: string;
  granularity: 'day' | 'week' | 'month';
  branchId: number | null;
  academicYearId: number | null;
  lastUpdated: string;
}

export interface DashboardProgramOption extends DashboardFiltersOption {
  course_id?: number;
}

export interface DashboardLevelOption extends DashboardFiltersOption {
  program_id?: number;
}

export interface DashboardBatchOption extends DashboardFiltersOption {
  level_id?: number;
  branch_id?: number;
  academic_year_id?: number;
}

export interface DashboardFilters {
  branches: DashboardFiltersOption[];
  academicYears: DashboardFiltersOption[];
  courses: DashboardFiltersOption[];
  programs?: DashboardProgramOption[];
  levels?: DashboardLevelOption[];
  batches?: DashboardBatchOption[];
}

export interface KpiValue {
  value: number;
}

export interface KpiActiveStudents extends KpiValue {}

export interface KpiActiveStaff extends KpiValue {
  teachingCount: number;
  nonTeachingCount: number;
}

export interface KpiAdmissions extends KpiValue {
  change: number;
  isMock: boolean;
}

export interface KpiFeeCollection extends KpiValue {
  change: number;
}

export interface KpiPendingFees extends KpiValue {
  dueCount: number;
}

export interface DashboardKpis {
  activeStudents: KpiActiveStudents;
  activeStaff: KpiActiveStaff;
  admissions: KpiAdmissions;
  feeCollection: KpiFeeCollection;
  pendingFees: KpiPendingFees;
}

export interface AttendanceDay {
  pct: number;
  present: number;
  absent: number;
  leave: number;
}

export interface AttendanceTrendPoint {
  label: string;
  pct: number;
}

export interface AttendanceData {
  today: AttendanceDay;
  trend: AttendanceTrendPoint[];
}

export interface AdmissionsTrendPoint {
  label: string;
  count: number;
  isMock?: boolean;
}

export interface StudentsByBranchItem {
  branchId: number;
  branchName: string;
  count: number;
}

export interface FeeCollectionTrendPoint {
  label: string;
  amount: number;
}

export interface FeeStatusItem {
  status: 'paid' | 'partial' | 'unpaid';
  label: string;
  count: number;
  amount: number;
}

export interface BranchPerformanceItem {
  branchId: number;
  branchName: string;
  students: number;
  admissions: number;
  attendancePct: number;
}

export interface BranchCollectionItem {
  branchId: number;
  branchName: string;
  amount: number;
}

export interface FinancialOverview {
  income: number;
  feeIncome: number;
  otherIncome: number;
  expenses: number;
  salaryExpenses: number;
  otherExpenses: number;
  net: number;
}

export interface ExpenseBreakdownItem {
  category: string;
  amount: number;
  pct: number;
  isMock?: boolean;
}

export interface AttentionRequired {
  feeDues: number;
  lowAttendance: number;
  attendancePending: number;
  resultsPending: number;
  openDoubts: number;
  teacherTasksPending: number;
}

export interface AcademicActivity {
  upcomingExams: number;
  pendingAssignments: number;
}

export interface UpcomingExamItem {
  id: number;
  title: string;
  subjectName: string;
  subjectCode: string;
  branchName: string;
  dueDate: string;
  maxMarks: number;
  status: 'Published' | 'Draft' | 'Closed' | string;
}

export interface DashboardData {
  meta: DashboardMeta;
  filters: DashboardFilters;
  kpis: DashboardKpis;
  studentAttendance: AttendanceData;
  staffAttendance: AttendanceData;
  admissionsTrend: AdmissionsTrendPoint[];
  studentsByBranch: StudentsByBranchItem[];
  feeCollectionTrend: FeeCollectionTrendPoint[];
  feeStatus: FeeStatusItem[];
  branchPerformance: BranchPerformanceItem[];
  branchCollection: BranchCollectionItem[];
  financialOverview: FinancialOverview;
  expenseBreakdown: ExpenseBreakdownItem[];
  attentionRequired: AttentionRequired;
  academicActivity: AcademicActivity;
  upcomingExams: UpcomingExamItem[];
}

export interface DashboardQueryParams {
  from?: string;
  to?: string;
  branchId?: string | number | null;
  academicYearId?: string | number | null;
  courseId?: string | number | null;
  programId?: string | number | null;
  levelId?: string | number | null;
  batchId?: string | number | null;
}
