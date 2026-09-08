import api from './api';
import type { Lecture, DefaultTimetableSlot, Room } from '../features/scheduler/types/scheduler';

export interface TimetableOptions {
  branches: Array<{ id: number; name: string; code: string; status: string }>;
  academicYears: Array<{ id: number; name: string; start_date: string; end_date: string; status: string }>;
  courses: Array<{ id: number; name: string; code: string; is_active: number }>;
  programs: Array<{ id: number; course_id: number; name: string; code: string; is_active: number }>;
  levels: Array<{ id: number; program_id: number; name: string; code: string; is_active: number }>;
  batches: Array<{ id: number; branch_id: number; level_id: number; academic_year_id: number; name: string; code: string; start_time?: string; end_time?: string; classroom_id?: number }>;
  subjects: Array<{ id: number; name: string; code: string; type?: string; status: string }>;
  teachers: Array<{ id: number; name: string; full_name: string; email?: string; mobile?: string; primary_branch_id?: number; designation?: string; max_lectures_per_day?: number; max_lectures_per_week?: number }>;
  classrooms: Array<{ id: number; branch_id: number; name: string; room_number: string; capacity?: number; type?: string; status: string }>;
  teacherAllocations?: Array<{ id: number; branch_id: number; academic_year_id: number; batch_id: number; teacher_user_id: number }>;
  levelSubjects?: Array<{ id: number; level_id: number; subject_id: number }>;
  teacherSubjects?: Array<{ id: number; teacher_user_id: number; subject_id: number }>;
}

export interface ConflictResult {
  type: string;
  severity: 'warning' | 'danger';
  conflictingLectureId?: number | string;
  message: string;
}

export const timetableApi = {
  // 1. Get options / metadata for filters and dropdowns
  async getOptions(branchId?: string | number, academicYearId?: string | number): Promise<TimetableOptions> {
    const params = new URLSearchParams();
    if (branchId && branchId !== 'All') params.append('branchId', String(branchId));
    if (academicYearId && academicYearId !== 'All') params.append('academicYearId', String(academicYearId));
    
    const response = await api.get(`/admin/timetable/options?${params.toString()}`);
    return response.data.data;
  },

  // 2. Default Timetable (Template Management)
  async getDefaultTimetable(batchId: string | number): Promise<DefaultTimetableSlot[]> {
    const response = await api.get(`/admin/timetable/default/${batchId}`);
    const rows = response.data.data || [];
    
    const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return rows.map((r: any) => ({
      id: r.id,
      dayOfWeek: r.day_of_week,
      dayName: dayNames[r.day_of_week] || `Day ${r.day_of_week}`,
      startTime: r.start_time?.slice(0, 5) || '09:00',
      endTime: r.end_time?.slice(0, 5) || '10:30',
      subjectId: r.subject_id,
      subjectName: r.subject_name,
      subjectCode: r.subject_code,
      teacherId: r.teacher_user_id,
      teacherName: r.teacher_name,
      roomId: r.classroom_id,
      roomName: r.classroom_name,
      roomNumber: r.room_number,
      lectureType: r.lecture_type || 'Regular',
      activityType: r.activity_type || 'Lecture',
      slotLabel: r.slot_label
    }));
  },

  async saveDefaultTimetable(
    batchId: string | number, 
    slots: any[], 
    branchId?: string | number, 
    academicYearId?: string | number
  ): Promise<{ success: boolean; count: number }> {
    const response = await api.post(`/admin/timetable/default/${batchId}`, {
      slots,
      branchId,
      academicYearId
    });
    return response.data;
  },

  async cloneDefaultTimetable(sourceBatchId: string | number, targetBatchIds: (string | number)[]): Promise<any> {
    const response = await api.post('/admin/timetable/default/clone', {
      sourceBatchId,
      targetBatchIds
    });
    return response.data;
  },

  // 3. Weekly Calendar Schedules
  async getWeeklyLectures(filters: {
    batchId?: string | number;
    teacherId?: string | number;
    roomId?: string | number;
    branchId?: string | number;
    startDate?: string;
    endDate?: string;
  }): Promise<Lecture[]> {
    const params = new URLSearchParams();
    if (filters.batchId && filters.batchId !== 'All') params.append('batchId', String(filters.batchId));
    if (filters.teacherId && filters.teacherId !== 'All') params.append('teacherId', String(filters.teacherId));
    if (filters.roomId && filters.roomId !== 'All') params.append('roomId', String(filters.roomId));
    if (filters.branchId && filters.branchId !== 'All') params.append('branchId', String(filters.branchId));
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/admin/timetable/weekly?${params.toString()}`);
    const rows = response.data.data || [];

    return rows.map((r: any) => ({
      id: r.id,
      branchId: r.branch_id,
      academicYearId: r.academic_year_id,
      batchId: r.batch_id,
      batchName: r.batch_name,
      batchCode: r.batch_code,
      subjectId: r.subject_id,
      subjectName: r.subject_name,
      subjectCode: r.subject_code,
      teacherId: r.teacher_user_id,
      teacherName: r.teacher_name,
      roomId: r.classroom_id,
      roomName: r.classroom_name,
      roomNumber: r.room_number,
      date: r.lecture_date,
      startTime: r.start_time?.slice(0, 5) || '09:00',
      endTime: r.end_time?.slice(0, 5) || '10:30',
      lectureType: r.lecture_type || 'Regular',
      activityType: r.activity_type || 'Lecture',
      slotLabel: r.slot_label,
      topic: r.topic,
      publishStatus: 'PUBLISHED',
      status: (r.status || 'SCHEDULED').toUpperCase(),
      isDefault: r.is_default,
      isModifiedFromDefault: !!r.is_modified_from_default,
      cancellationReason: r.cancellation_reason,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async applyDefaultTimetable(options: {
    batchId: string | number;
    weekStartDate: string;
    overwriteExisting?: boolean;
    skipHolidays?: boolean;
  }): Promise<{ success: boolean; generatedCount: number }> {
    const response = await api.post('/admin/timetable/weekly/apply-default', options);
    return response.data.data;
  },

  async replicateWeek(options: {
    batchId: string | number;
    sourceWeekStart: string;
    targetWeekStart: string;
    overwriteExisting?: boolean;
  }): Promise<{ success: boolean; count: number }> {
    const response = await api.post('/admin/timetable/weekly/replicate', options);
    return response.data.data;
  },

  // 4. Validate Conflicts
  async validateConflicts(params: {
    lectureId?: string | number;
    branchId?: string | number;
    batchId?: string | number;
    teacherUserId?: string | number;
    classroomId?: string | number;
    lectureDate: string;
    startTime: string;
    endTime: string;
  }): Promise<ConflictResult[]> {
    const response = await api.post('/admin/timetable/validate-conflicts', params);
    return response.data.data || [];
  },

  // 5. Individual Lecture CRUD
  async createLecture(data: any): Promise<Lecture> {
    const response = await api.post('/admin/timetable/lectures', data);
    return response.data.data;
  },

  async updateLecture(id: string | number, data: any): Promise<Lecture> {
    const response = await api.put(`/admin/timetable/lectures/${id}`, data);
    return response.data.data;
  },

  async cancelLecture(id: string | number, reason?: string): Promise<any> {
    const response = await api.post(`/admin/timetable/lectures/${id}/cancel`, { reason });
    return response.data;
  },

  async deleteLecture(id: string | number): Promise<any> {
    const response = await api.delete(`/admin/timetable/lectures/${id}`);
    return response.data;
  }
};
