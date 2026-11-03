import api from './api';

export type ExamType =
  | 'Daily Test'
  | 'Weekly Test'
  | 'Fortnightly Test'
  | 'Monthly Test'
  | 'Unit Test'
  | 'Chapter Test'
  | 'Mock Test'
  | 'Term Exam'
  | 'Final Exam'
  | 'Assignment'
  | 'Internal Assessment'
  | 'Other';

export type ExamStatus =
  | 'Draft'
  | 'Scheduled'
  | 'In Progress'
  | 'Completed'
  | 'Marks Pending'
  | 'Marks Published'
  | 'Cancelled';

export interface ExamRecord {
  id: string;
  rawId?: number;
  tenant_id?: number;
  branch_id?: number;
  branch?: string;
  branch_name?: string;
  course_id?: number;
  course?: string;
  course_name?: string;
  subject_id?: number;
  subject?: string;
  subject_name?: string;
  batch_id?: number;
  batch?: string;
  batch_name?: string;
  name: string;
  title?: string;
  type: ExamType | string;
  exam_type?: string;
  examDate: string;
  exam_date?: string;
  startTime?: string;
  start_time?: string;
  duration?: string;
  totalMarks: number;
  total_marks?: number;
  passingMarks: number;
  passing_marks?: number;
  average: string;
  class_average?: string;
  status: ExamStatus;
  marks_entered_count?: number;
  total_students_count?: number;
  studentMarks?: Record<string, number | null>;
}

export interface ExamRosterStudent {
  studentId: string;
  rawStudentId?: number;
  studentCode: string;
  name: string;
  mobile: string;
  parentMobile: string;
  admissionDate: string;
  branch: string;
  course: string;
  batch: string;
  marksObtained: number | null;
  isAbsent: boolean;
  isPassed: boolean | null;
  percentage: number | null;
  grade: string;
  status: 'Passed' | 'Failed' | 'Absent' | 'TBD';
  remarks?: string;
}

export interface ExamRosterResponse {
  exam: ExamRecord;
  roster: ExamRosterStudent[];
}

export interface CreateExamPayload {
  name?: string;
  title?: string;
  type?: string;
  examType?: string;
  branchId?: number | string;
  branchName?: string;
  branch?: string;
  courseId?: number | string;
  course?: string;
  subjectId?: number | string;
  subjectName?: string;
  subject?: string;
  batchId?: number | string;
  batchName?: string;
  batch?: string;
  academicYearId?: number;
  examDate?: string;
  startTime?: string;
  duration?: string;
  totalMarks: number;
  passingMarks: number;
  status?: ExamStatus;
  instructions?: string;
}

export interface ExamFilters {
  search?: string;
  branchId?: string | number;
  batchId?: string | number;
  courseId?: string | number;
  subjectId?: string | number;
  status?: string;
  examType?: string;
  page?: number;
  limit?: number;
}

export const examApi = {
  /**
   * Fetch list of examinations with filters
   */
  async getExams(filters: ExamFilters = {}): Promise<ExamRecord[]> {
    const res = await api.get('/admin/exams', { params: filters });
    return res.data?.data || [];
  },

  /**
   * Fetch single exam details
   */
  async getExamById(id: string | number): Promise<ExamRecord> {
    const res = await api.get(`/admin/exams/${id}`);
    return res.data?.data;
  },

  /**
   * Create and schedule a new examination
   */
  async createExam(payload: CreateExamPayload): Promise<ExamRecord> {
    const res = await api.post('/admin/exams', payload);
    return res.data?.data;
  },

  /**
   * Update examination details
   */
  async updateExam(id: string | number, payload: Partial<CreateExamPayload>): Promise<ExamRecord> {
    const res = await api.put(`/admin/exams/${id}`, payload);
    return res.data?.data;
  },

  /**
   * Soft delete examination
   */
  async deleteExam(id: string | number): Promise<void> {
    await api.delete(`/admin/exams/${id}`);
  },

  /**
   * Fetch student roster for an exam for grading
   */
  async getExamRoster(examId: string | number): Promise<ExamRosterResponse> {
    const res = await api.get(`/admin/exams/${examId}/roster`);
    return res.data?.data;
  },

  /**
   * Save student marks (draft or publish)
   */
  async saveMarks(
    examId: string | number,
    marks: Record<string, number | null> | Array<any>,
    publish = false,
    changeReason?: string
  ): Promise<any> {
    const res = await api.post(`/admin/exams/${examId}/marks`, {
      studentMarks: marks,
      publish,
      changeReason
    });
    return res.data;
  },

  /**
   * Publish results for an exam
   */
  async publishResults(examId: string | number): Promise<ExamRecord> {
    const res = await api.post(`/admin/exams/${examId}/publish`);
    return res.data?.data;
  },

  /**
   * Get comprehensive student report card
   */
  async getStudentReportCard(studentId: string | number): Promise<any> {
    const res = await api.get(`/admin/exams/student/${studentId}/report-card`);
    return res.data?.data;
  }
};

export default examApi;

