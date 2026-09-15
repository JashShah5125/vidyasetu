import api from './api';
import type { TeacherScheduleOptions } from './teacherScheduleApi';

export interface StudentAttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  pct: number | null;
}

export interface TeacherStudentRosterItem {
  id: number;
  studentCode: string;
  fullName: string;
  mobile?: string;
  email?: string;
  gender?: string;
  dob?: string;
  status: 'active' | 'inactive';
  enrollmentId?: number;
  batch?: {
    id: number;
    name: string;
    code?: string;
  };
  course?: {
    id: number | null;
    name: string;
    code?: string;
  };
  program?: {
    id: number | null;
    name: string;
    code?: string;
  };
  level?: {
    id: number | null;
    name: string;
    code?: string;
  };
  academicYear?: {
    id: number | null;
    name: string;
  };
  guardian?: {
    name: string | null;
    mobile: string | null;
    relation: string | null;
  };
  attendance: StudentAttendanceSummary;
  // Legacy / fallback fields
  student_code?: string;
  full_name?: string;
  batch_id?: number;
  batch_name?: string;
  course_name?: string;
  program_name?: string;
  level_name?: string;
  academic_year_name?: string;
  guardian_name?: string;
  guardian_mobile?: string;
  attendance_total?: number;
  attendance_present?: number;
  attendance_late?: number;
  attendance_pct?: number | null;
}

export interface TeacherStudentDetail {
  id: number;
  studentCode: string;
  personal: {
    fullName: string;
    dob?: string;
    gender?: string;
    mobile?: string;
    email?: string;
    bloodGroup?: string;
    category?: string;
    schoolName?: string;
    currentClass?: string;
    targetExam?: string;
    city?: string;
    state?: string;
    pincode?: string;
    street?: string;
    profilePhotoUrl?: string;
  };
  academic: {
    academicYear?: string;
    course?: string;
    program?: string;
    level?: string;
    batch?: string;
    batchId?: number;
    enrollmentId?: number;
  };
  guardian: {
    name?: string;
    relation?: string;
    mobile?: string;
    email?: string;
  };
  attendance: StudentAttendanceSummary;
  attendanceHistory?: Array<{
    lectureId: number;
    lectureDate: string;
    startTime: string;
    endTime: string;
    subjectName: string;
    subjectCode?: string;
    batchName: string;
    status: number;
    remarks?: string;
    teacherName?: string;
  }>;
  status: 'active' | 'inactive';
  // Legacy / fallback fields
  full_name?: string;
  student_code?: string;
  mobile?: string;
  email?: string;
  batch_name?: string;
  branch_name?: string;
  academic_year_name?: string;
  guardian_name?: string;
  guardian_mobile?: string;
  guardian_relation?: string;
  guardian_email?: string;
  dob?: string;
  gender?: string;
}

export interface TeacherStudentPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TeacherStudentListResponse {
  status: string;
  data: TeacherStudentRosterItem[];
  pagination: TeacherStudentPagination;
}

export interface TeacherStudentListParams {
  page?: number;
  limit?: number;
  search?: string;
  batchId?: string | number;
  courseId?: string | number;
  programId?: string | number;
  levelId?: string | number;
  academicYearId?: string | number;
  status?: string | number;
}

export interface StudentAssignmentSubmission {
  submissionId: string;
  status: 'Submitted' | 'Graded';
  responseText: string;
  files: string[];
  marksObtained: number | null;
  teacherFeedback: string;
  submittedAt: string | null;
  gradedAt: string | null;
  isLate: boolean;
}

export interface StudentAssignmentItem {
  id: string;
  title: string;
  description: string;
  assignmentType: 'assignment' | 'homework' | 'exam' | string;
  subjectName: string;
  subjectCode: string;
  batchName: string;
  dueDate: string;
  dueDateTime: string;
  maxMarks: number | null;
  status: 'Draft' | 'Published' | 'Closed' | number | string;
  files: string[];
  isOverdue: boolean;
  submission: StudentAssignmentSubmission | null;
}

export const teacherStudentApi = {
  async getOptions(): Promise<TeacherScheduleOptions> {
    const res = await api.get('/teacher/students/options');
    return res.data.data;
  },

  async getStudents(params: TeacherStudentListParams = {}): Promise<TeacherStudentListResponse> {
    const clean: Record<string, string | number> = {};
    if (params.page !== undefined) clean.page = params.page;
    if (params.limit !== undefined) clean.limit = params.limit;
    if (params.search && params.search.trim() !== '') clean.search = params.search.trim();
    if (params.batchId !== undefined && params.batchId !== 'All' && params.batchId !== '') clean.batchId = params.batchId;
    if (params.courseId !== undefined && params.courseId !== 'All' && params.courseId !== '') clean.courseId = params.courseId;
    if (params.programId !== undefined && params.programId !== 'All' && params.programId !== '') clean.programId = params.programId;
    if (params.levelId !== undefined && params.levelId !== 'All' && params.levelId !== '') clean.levelId = params.levelId;
    if (params.academicYearId !== undefined && params.academicYearId !== 'All' && params.academicYearId !== '') clean.academicYearId = params.academicYearId;
    if (params.status !== undefined && params.status !== 'All' && params.status !== '') clean.status = params.status;

    const res = await api.get('/teacher/students', { params: clean });
    return res.data;
  },

  async getStudentById(studentId: number | string): Promise<TeacherStudentDetail> {
    const res = await api.get(`/teacher/students/${studentId}`);
    return res.data.data;
  },

  async getStudentAssignments(studentId: number | string): Promise<StudentAssignmentItem[]> {
    const res = await api.get(`/teacher/students/${studentId}/assignments`);
    return res.data.data;
  }
};