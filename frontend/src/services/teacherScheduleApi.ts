import api from './api';

export interface TeacherScheduleLecture {
  id: number | string;
  startTime: string;
  endTime: string;
  type: 'LECTURE' | 'LAB' | 'BREAK' | 'SUBSTITUTION' | 'ACTIVITY';
  lectureType: string;
  activityType: string;
  slotLabel?: string;
  subject: {
    id: number;
    name: string;
    code?: string;
  };
  topic?: string;
  batch: {
    id: number;
    name: string;
    code?: string;
  };
  level: {
    id: number;
    name: string;
  };
  program?: {
    id: number;
    name: string;
  };
  course?: {
    id: number;
    name: string;
  };
  classroom: {
    id: number;
    name: string;
    roomNumber?: string;
  };
  branch: {
    id: number;
    name: string;
    code?: string;
  };
  status: string;
  attendance?: {
    required: boolean;
    taken: boolean;
    submittedAt?: string;
    lockedAt?: string;
  };
  lessonPlan?: {
    available: boolean;
    lessonPlanId?: number | null;
  };
  date?: string;
  day?: string;
  attendanceTaken?: boolean;
}

export interface TeacherScheduleTodayResponse {
  date: string;
  day: string;
  totalLectures: number;
  lectures: TeacherScheduleLecture[];
}

export interface TeacherScheduleWeekResponse {
  startDate: string;
  endDate: string;
  totalLectures: number;
  lectures: TeacherScheduleLecture[];
}

export interface TeacherScheduleOptions {
  branches: Array<{ id: number; name: string; code: string }>;
  academicYears: Array<{ id: number; name: string }>;
  courses: Array<{ id: number; name: string }>;
  programs: Array<{ id: number; course_id: number; name: string }>;
  levels: Array<{ id: number; program_id: number; name: string }>;
  batches: Array<{ id: number; branch_id: number; level_id: number; name: string; code?: string }>;
  subjects: Array<{ id: number; name: string; code: string }>;
  classrooms?: Array<{ id: number; branch_id: number; name: string; room_number?: string }>;
  teachers?: Array<{ id: number; name: string; email?: string }>;
}

export interface AcademicEvent {
  id: string;
  title: string;
  type: 'EXAM' | 'HOLIDAY' | 'MEETING' | 'EVENT';
  startDate: string;
  endDate: string;
  description: string;
  venue: string;
}

export interface ScheduleChangeItem {
  id: string;
  lectureId: number;
  type: string;
  batchId: number;
  batchName: string;
  subject: string;
  date: string;
  time: string;
  status: 'Approved' | 'Pending Approval' | 'Rejected';
  reason: string;
  updatedAt: string;
}

export const teacherScheduleApi = {
  async getOptions(): Promise<TeacherScheduleOptions> {
    const res = await api.get('/teacher/schedule/options');
    return res.data.data;
  },

  async getToday(date?: string, filters: { batchId?: string | number; branchId?: string | number } = {}): Promise<TeacherScheduleTodayResponse> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (filters.batchId && filters.batchId !== 'All') params.append('batchId', String(filters.batchId));
    if (filters.branchId && filters.branchId !== 'All') params.append('branchId', String(filters.branchId));

    const res = await api.get(`/teacher/schedule/today?${params.toString()}`);
    return res.data.data;
  },

  async getWeek(
    startDate?: string,
    endDate?: string,
    filters: { batchId?: string | number; branchId?: string | number; courseId?: string; levelId?: string } = {}
  ): Promise<TeacherScheduleWeekResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (filters.batchId && filters.batchId !== 'All') params.append('batchId', String(filters.batchId));
    if (filters.branchId && filters.branchId !== 'All') params.append('branchId', String(filters.branchId));
    if (filters.courseId && filters.courseId !== 'All') params.append('courseId', filters.courseId);
    if (filters.levelId && filters.levelId !== 'All') params.append('levelId', filters.levelId);

    const res = await api.get(`/teacher/schedule/week?${params.toString()}`);
    return res.data.data;
  },

  async getUpcoming(from?: string, days = 14): Promise<{ startDate: string; endDate: string; totalLectures: number; lectures: TeacherScheduleLecture[] }> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    params.append('days', String(days));

    const res = await api.get(`/teacher/schedule/upcoming?${params.toString()}`);
    return res.data.data;
  },

  async getAcademicEvents(branchId?: string | number): Promise<AcademicEvent[]> {
    const params = new URLSearchParams();
    if (branchId && branchId !== 'All') params.append('branchId', String(branchId));

    const res = await api.get(`/teacher/schedule/academic-events?${params.toString()}`);
    return res.data.data;
  },

  async getChanges(): Promise<ScheduleChangeItem[]> {
    const res = await api.get('/teacher/schedule/changes');
    return res.data.data;
  }
};
