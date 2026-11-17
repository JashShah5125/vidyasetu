import api from './api';

export type AttendanceStatus = 0 | 1 | 2; // 0=absent, 1=present, 2=late

export interface GeoLocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface AttendanceCorrectionItem {
  id: number;
  lecture_id: number;
  student_id: number;
  student_name: string;
  student_code?: string;
  old_status: number | null;
  new_status: number;
  old_remarks?: string | null;
  new_remarks?: string | null;
  reason: string;
  corrected_by: number;
  corrected_by_name?: string;
  corrected_by_email?: string;
  created_at: string;
}

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
  attendance_locked_at?: string | null;
  geofence_status?: string | null;
  geofence_distance_meters?: number | null;
  branch_name?: string;
  geofence_enabled?: number | boolean;
  geofence_radius_meters?: number;
  student_checkin_open?: number | boolean;
  student_checkin_code?: string | null;
  student_checkin_opened_at?: string | null;
  marked_count?: number;
}

export interface StudentLectureItem {
  id: number;
  branch_id: number;
  batch_id: number;
  subject_id: number;
  subject_name: string;
  subject_code?: string;
  lecture_date: string;
  start_time: string;
  end_time: string;
  classroom_name?: string;
  room_number?: string;
  batch_name: string;
  teacher_name?: string;
  lecture_status: string;
  attendance_taken: number;
  attendance_locked_at?: string | null;
  student_checkin_open: number | boolean;
  student_checkin_opened_at?: string | null;
  branch_name?: string;
  geofence_enabled?: number | boolean;
  geofence_radius_meters?: number;
  attendance_status?: number | null;
  remarks?: string | null;
  student_checkin_at?: string | null;
  student_checkin_distance_meters?: number | null;
  student_checkin_geofence_status?: string | null;
  student_checkin_accuracy_meters?: number | null;
}

export interface AttendanceRosterRow {
  lecture_id: number;
  branch_id?: number;
  batch_id: number;
  subject_id: number;
  lecture_date: string;
  start_time: string;
  end_time: string;
  attendance_taken: number;
  attendance_submitted_at?: string;
  attendance_locked_at?: string | null;
  geofence_status?: string | null;
  geofence_distance_meters?: number | null;
  submitted_accuracy_meters?: number | null;
  branch_name?: string;
  geofence_enabled?: number | boolean;
  geofence_radius_meters?: number;
  student_checkin_open?: number | boolean;
  student_checkin_code?: string | null;
  student_checkin_opened_at?: string | null;
  enrollment_id: number;
  student_id: number;
  full_name: string;
  student_code: string;
  mobile?: string;
  record_id?: number;
  attendance_status?: number;
  remarks?: string;
  student_checkin_at?: string | null;
  student_checkin_distance_meters?: number | null;
  student_checkin_geofence_status?: string | null;
  student_checkin_accuracy_meters?: number | null;
}

export interface AttendanceRecord {
  student_id: number;
  status: 0 | 1 | 2;
  remarks?: string;
}

export interface AttendanceOptions {
  branches: Array<{
    id: number;
    name: string;
    code: string;
    latitude?: number | null;
    longitude?: number | null;
    geofence_radius_meters?: number;
    geofence_enabled?: number | boolean;
  }>;
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

export interface DailyStudentAttendanceRow {
  student_id: number;
  student_code?: string;
  status: 0 | 1 | 2; // 0=absent, 1=present, 2=late
  remarks?: string;
  attendance_date: string;
}

export interface DailyStudentAttendanceSaveRecord {
  student_id: number;
  status: 0 | 1 | 2;
  remarks?: string;
  batch_id?: number | null;
  branch_id?: number | null;
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

  async submitAttendance(lectureId: string | number, records?: AttendanceRecord[], location?: GeoLocationPayload | null): Promise<any> {
    const basePath = getAttendanceBasePath();
    const response = await api.post(`${basePath}/submit/${lectureId}`, { records, location: location || undefined });
    return response.data;
  },

  async correctAttendance(lectureId: string | number, records: AttendanceRecord[], reason: string): Promise<any> {
    const basePath = getAttendanceBasePath();
    const response = await api.post(`${basePath}/correct/${lectureId}`, { records, reason });
    return response.data;
  },

  async getCorrections(lectureId: string | number): Promise<AttendanceCorrectionItem[]> {
    const basePath = getAttendanceBasePath();
    const response = await api.get(`${basePath}/corrections/${lectureId}`);
    return response.data.data || [];
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

  async saveStaffAttendance(branchId: string | number, date: string, records: StaffAttendanceSaveRecord[], location?: GeoLocationPayload | null): Promise<any> {
    const basePath = getAttendanceBasePath();
    const payload: any = { date, records };
    if (basePath === '/admin/attendance' && branchId && branchId !== 'All') {
      payload.branchId = branchId;
    }
    if (location) {
      payload.location = location;
    }
    const response = await api.post(`${basePath}/staff/save`, payload);
    return response.data;
  },

  async saveStaffLectureAttendance(lectureId: string | number, present: boolean): Promise<any> {
    const basePath = getAttendanceBasePath();
    const response = await api.post(`${basePath}/staff/lecture/${lectureId}`, { present });
    return response.data;
  },

  async getDailyStudentAttendance(filters: { branchId?: string | number; batchId?: string | number; date: string }): Promise<DailyStudentAttendanceRow[]> {
    const basePath = getAttendanceBasePath();
    const params = new URLSearchParams({ date: filters.date });
    if (basePath === '/admin/attendance' && filters.branchId && filters.branchId !== 'All') {
      params.append('branchId', String(filters.branchId));
    }
    if (filters.batchId && filters.batchId !== 'All') {
      params.append('batchId', String(filters.batchId));
    }
    const response = await api.get(`${basePath}/daily-students?${params.toString()}`);
    return response.data.data || [];
  },

  async saveDailyStudentAttendance(payload: { branchId?: string | number; batchId?: string | number; date: string; records: DailyStudentAttendanceSaveRecord[]; location?: GeoLocationPayload | null }): Promise<any> {
    const basePath = getAttendanceBasePath();
    const body: any = {
      date: payload.date,
      records: payload.records
    };
    if (payload.branchId && payload.branchId !== 'All') {
      body.branchId = payload.branchId;
    }
    if (payload.batchId && payload.batchId !== 'All') {
      body.batchId = payload.batchId;
    }
    if (payload.location) {
      body.location = payload.location;
    }
    const response = await api.post(`${basePath}/daily-students`, body);
    return response.data;
  },

  async toggleStudentCheckin(lectureId: string | number, open: boolean): Promise<{
    lectureId: number;
    student_checkin_open: number;
    student_checkin_code: string | null;
    opened_at: string | null;
  }> {
    const basePath = getAttendanceBasePath();
    const response = await api.post(`${basePath}/checkin-session/${lectureId}`, { open });
    return response.data.data;
  },

  async getStudentLectures(date: string): Promise<{
    student: { id: number; full_name: string; student_code?: string };
    lectures: StudentLectureItem[];
  }> {
    const response = await api.get(`/student/attendance/lectures?date=${encodeURIComponent(date)}`);
    return response.data.data;
  },

  async studentCheckIn(
    lectureId: string | number,
    code: string,
    location: GeoLocationPayload | null
  ): Promise<any> {
    const response = await api.post(`/student/attendance/check-in/${lectureId}`, {
      code,
      location: location || undefined
    });
    return response.data;
  }
};
