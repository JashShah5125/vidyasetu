import api from './api';

export type AttendanceStatus = 0 | 1 | 2; // 0=absent, 1=present, 2=late

export interface AttendanceLecture {
  id: number;
  tenant_id: number;
  branch_id: number;
  academic_year_id: number;
  batch_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  teacher_user_id: number;
  teacher_name: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  classroom_id?: number;
  classroom_name?: string;
  room_number?: string;
  batch_name: string;
  batch_code: string;
  lecture_type?: string;
  activity_type?: string;
  slot_label?: string;
  status: string;
  attendance_taken: number;
  attendance_submitted_at?: string;
  marked_count?: number;
}

export interface AttendanceRosterRow {
  lecture_id: number;
  batch_id: number;
  subject_id: number;
  lecture_date: string;
  start_time: string;
  end_time: string;
  attendance_taken: number;
  attendance_submitted_at?: string;
  enrollment_id: number;
  student_id: number;
  full_name: string;
  student_code: string;
  mobile?: string;
  record_id?: number;
  attendance_status?: number;
  remarks?: string;
}

export interface AttendanceRecord {
  student_id: number;
  status: 0 | 1 | 2;
  remarks?: string;
}

export interface AttendanceOptions {
  branches: Array<{ id: number; name: string; code: string }>;
  batches: Array<{ id: number; branch_id: number; level_id: number; academic_year_id: number; name: string; code: string }>;
  academicYears: Array<{ id: number; name: string }>;
  courses: Array<{ id: number; name: string; code: string }>;
  programs: Array<{ id: number; course_id: number; name: string; code: string }>;
  levels: Array<{ id: number; course_id: number; program_id: number; name: string; code: string }>;
}

export interface BatchReportRow {
  enrollment_id: number;
  student_id: number;
  full_name: string;
  student_code: string;
  total_lectures: number;
  attended_lectures: number;
  present_lectures: number;
  late_lectures: number;
  absent_lectures: number;
  attendance_percentage: number;
}

export interface StudentReportRow {
  lecture_id: number;
  lecture_date: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code: string;
  batch_name: string;
  batch_code: string;
  attendance_status: number;
  remarks?: string;
  teacher_name: string;
}

export interface StaffAttendanceRow {
  staff_id: number;
  user_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  mobile?: string;
  employee_type: string;
  designation: string;
  department?: string;
  primary_branch_name?: string;
  role_name: string;
  attendance_status: 0 | 1 | 2 | null;
  lecture_ids: number[];
  attendance_remarks?: string | null;
}

export interface StaffAttendanceSaveRecord {
  staff_id: number;
  status: 0 | 1 | 2;
  remarks?: string;
  lecture_ids?: number[];
  branch_id?: number;
}

const getAttendanceBasePath = (): string => {
  try {
    const raw = localStorage.getItem('vs_current_user') || localStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw);
      const role = String(user?.role || user?.userType || '').toLowerCase().replace(/[\s-]+/g, '_');
      if (role === 'branch_admin' || role === 'branch_manager') {
        return '/branch/attendance';
      }
    }
  } catch {
    // fallback
  }
  return '/admin/attendance';
};

export const attendanceApi = {
  async getOptions(): Promise<AttendanceOptions> {
    const basePath = getAttendanceBasePath();
    const response = await api.get(`${basePath}/options`);
    return response.data.data;
  },

  async getTodayLectures(date: string, teacherId?: string | number): Promise<AttendanceLecture[]> {
    const basePath = getAttendanceBasePath();
    const params = new URLSearchParams({ date });
    if (teacherId) params.append('teacherId', String(teacherId));
    const response = await api.get(`${basePath}/lectures/today?${params.toString()}`);
    return response.data.data || [];
  },

  async getDailyLectures(filters: { branchId?: string | number; batchId?: string | number; date?: string }): Promise<AttendanceLecture[]> {
    const basePath = getAttendanceBasePath();
    const params = new URLSearchParams();
    if (basePath === '/admin/attendance' && filters.branchId && filters.branchId !== 'All') {
      params.append('branchId', String(filters.branchId));
    }
    if (filters.batchId && filters.batchId !== 'All') params.append('batchId', String(filters.batchId));
    if (filters.date) params.append('date', filters.date);
    const response = await api.get(`${basePath}/lectures/daily?${params.toString()}`);
    return response.data.data || [];
  },

  async getRoster(lectureId: string | number): Promise<AttendanceRosterRow[]> {
    const basePath = getAttendanceBasePath();
    const response = await api.get(`${basePath}/roster/${lectureId}`);
    return response.data.data || [];
  },

  async saveAttendance(lectureId: string | number, records: AttendanceRecord[]): Promise<any> {
    const basePath = getAttendanceBasePath();
    const response = await api.post(`${basePath}/save/${lectureId}`, { records });
    return response.data;
  },

  async submitAttendance(lectureId: string | number, records?: AttendanceRecord[]): Promise<any> {
    const basePath = getAttendanceBasePath();
    const response = await api.post(`${basePath}/submit/${lectureId}`, { records });
    return response.data;
  },

  async downloadTemplate(lectureId: string | number): Promise<Blob> {
    const basePath = getAttendanceBasePath();
    const response = await api.get(`${basePath}/template/${lectureId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  async bulkUploadAttendance(lectureId: string | number, fileOrContent: File | string | AttendanceRecord[], dryRun = false): Promise<any> {
    const basePath = getAttendanceBasePath();
    const qs = dryRun ? '?dryRun=true' : '';

    if (fileOrContent instanceof File) {
      const formData = new FormData();
      formData.append('file', fileOrContent);
      const response = await api.post(`${basePath}/bulk-upload/${lectureId}${qs}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } else if (typeof fileOrContent === 'string') {
      const response = await api.post(`${basePath}/bulk-upload/${lectureId}${qs}`, { csv: fileOrContent });
      return response.data;
    } else {
      const response = await api.post(`${basePath}/bulk-upload/${lectureId}${qs}`, { records: fileOrContent });
      return response.data;
    }
  },

  async getBatchReport(batchId: string | number, startDate: string, endDate: string, academicYearId?: string | number): Promise<BatchReportRow[]> {
    const basePath = getAttendanceBasePath();
    const params = new URLSearchParams({ startDate, endDate });
    if (academicYearId && academicYearId !== 'All') params.append('academicYearId', String(academicYearId));
    const response = await api.get(`${basePath}/report/batch/${batchId}?${params.toString()}`);
    return response.data.data || [];
  },

  async getStudentReport(studentId: string | number, startDate?: string, endDate?: string): Promise<StudentReportRow[]> {
    const basePath = getAttendanceBasePath();
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(`${basePath}/report/student/${studentId}${qs}`);
    return response.data.data || [];
  },

  async getStaffAttendance(filters: { branchId?: string | number; date: string; employeeType?: string; role?: string; search?: string }): Promise<StaffAttendanceRow[]> {
    const basePath = getAttendanceBasePath();
    const params = new URLSearchParams({ date: filters.date });
    if (basePath === '/admin/attendance' && filters.branchId && filters.branchId !== 'All') {
      params.append('branchId', String(filters.branchId));
    }
    if (filters.employeeType && filters.employeeType !== 'All') params.append('employeeType', filters.employeeType);
    if (filters.role && filters.role !== 'All') params.append('role', filters.role);
    if (filters.search) params.append('search', filters.search);
    const response = await api.get(`${basePath}/staff?${params.toString()}`);
    return response.data.data || [];
  },

  async saveStaffAttendance(branchId: string | number, date: string, records: StaffAttendanceSaveRecord[]): Promise<any> {
    const basePath = getAttendanceBasePath();
    const payload: any = { date, records };
    if (basePath === '/admin/attendance' && branchId && branchId !== 'All') {
      payload.branchId = branchId;
    }
    const response = await api.post(`${basePath}/staff/save`, payload);
    return response.data;
  },

  async saveStaffLectureAttendance(lectureId: string | number, present: boolean): Promise<any> {
    const basePath = getAttendanceBasePath();
    const response = await api.post(`${basePath}/staff/lecture/${lectureId}`, { present });
    return response.data;
  }
};
