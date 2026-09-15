import api from './api';

export interface HomeworkItem {
  id: string;
  branchId: string;
  branchName: string;
  academicYearId: string;
  academicYearName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  title: string;
  description: string;
  assignmentType: string;
  batchIds: number[];
  batchNames: string[];
  files: string[];
  dueDate: string;
  dueDateTime: string;
  maxMarks: number | null;
  status: 'Draft' | 'Published' | 'Closed';
  publishedAt: string | null;
  closedAt: string | null;
  submittedCount: number;
  totalCount: number;
  createdBy: string;
  updatedAt: string | null;
}

export interface HomeworkPayload {
  title: string;
  description?: string;
  branchId?: number;
  academicYearId: number;
  subjectId: number;
  assignmentType: string;
  batchIds: number[];
  dueDate: string;
  maxMarks?: number | null;
  existingFiles?: string[];
}

export interface ScopingOption {
  id: string;
  name: string;
  code?: string;
  academicYearId?: string | null;
}

export interface HomeworkScoping {
  scoped: boolean;
  branch?: ScopingOption;
  branches: ScopingOption[];
  batches: ScopingOption[];
  subjects: ScopingOption[];
  academicYears: ScopingOption[];
}

export interface EvaluationRosterStudent {
  studentId: string;
  studentName: string;
  studentCode: string;
  batchId: string;
  batchName: string;
  submissionId: string | null;
  submissionStatus: string | null;
  responseText: string;
  files: string[];
  marksObtained: number | null;
  feedback: string;
  submittedAt: string | null;
  gradedAt: string | null;
}

export interface EvaluationRosterResponse {
  homework: { id: string; status: string; maxMarks: number | null };
  students: EvaluationRosterStudent[];
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  responseText: string;
  files: string[];
  status: 'Submitted' | 'Graded';
  marksObtained: number | null;
  feedback: string;
  submittedAt: string | null;
  gradedAt: string | null;
}

const getBaseUrl = () => {
  try {
    const raw = localStorage.getItem('vs_current_user') || localStorage.getItem('user') || '{}';
    const user = JSON.parse(raw);
    const role = String(user.role || user.userType || user.user_type || '').toLowerCase().replace(/[\s-]+/g, '_');
    if (role === 'teacher' || role === 'faculty') {
      return '/teacher/homeworks';
    }
    if (role === 'branch_admin' || role === 'branch_manager') {
      return '/branch/homeworks';
    }
  } catch (e) {
    // fallback
  }
  return '/admin/homeworks';
};

const buildFormData = (payload: HomeworkPayload, files: File[]) => {
  const fd = new FormData();
  fd.append('title', payload.title);
  fd.append('description', payload.description || '');
  if (payload.branchId !== undefined && payload.branchId !== null) {
    fd.append('branchId', String(payload.branchId));
  }
  fd.append('academicYearId', String(payload.academicYearId));
  fd.append('subjectId', String(payload.subjectId));
  fd.append('assignmentType', payload.assignmentType);
  fd.append('batchIds', JSON.stringify(payload.batchIds));
  fd.append('dueDate', payload.dueDate);
  if (payload.maxMarks !== undefined && payload.maxMarks !== null) {
    fd.append('maxMarks', String(payload.maxMarks));
  }
  fd.append('existingFiles', JSON.stringify(payload.existingFiles || []));
  files.forEach(f => fd.append('files', f));
  return fd;
};

const handleErr = (err: any): never => {
  throw new Error(err?.response?.data?.message || err?.message || 'Request failed');
};

export const assignmentApi = {
  async getScoping(): Promise<HomeworkScoping> {
    try {
      const res = await api.get(`${getBaseUrl()}/scoping`);
      return res.data.data;
    } catch (err) {
      return handleErr(err);
    }
  },

  async getHomeworks(params: { status?: string; subject?: string; batch?: string; branch?: string; search?: string; assignmentType?: string } = {}): Promise<HomeworkItem[]> {
    try {
      const res = await api.get(getBaseUrl(), { params });
      return res.data.data;
    } catch (err) {
      return handleErr(err);
    }
  },

  async getHomework(id: string): Promise<HomeworkItem> {
    try {
      const res = await api.get(`${getBaseUrl()}/${id}`);
      return res.data.data;
    } catch (err) {
      return handleErr(err);
    }
  },

  async createHomework(payload: HomeworkPayload, files: File[] = []): Promise<{ id: string }> {
    try {
      const res = await api.post(getBaseUrl(), buildFormData(payload, files));
      return res.data.data;
    } catch (err) {
      return handleErr(err);
    }
  },

  async updateHomework(id: string, payload: HomeworkPayload, files: File[] = []): Promise<{ id: string }> {
    try {
      const res = await api.put(`${getBaseUrl()}/${id}`, buildFormData(payload, files));
      return res.data.data;
    } catch (err) {
      return handleErr(err);
    }
  },

  async deleteHomework(id: string): Promise<void> {
    try {
      await api.delete(`${getBaseUrl()}/${id}`);
    } catch (err) {
      return handleErr(err);
    }
  },

  async publishHomework(id: string): Promise<void> {
    try {
      await api.post(`${getBaseUrl()}/${id}/publish`);
    } catch (err) {
      return handleErr(err);
    }
  },

  async closeHomework(id: string): Promise<void> {
    try {
      await api.post(`${getBaseUrl()}/${id}/close`);
    } catch (err) {
      return handleErr(err);
    }
  },

  async getSubmissions(id: string): Promise<{ homework: { id: string; status: string }; submissions: HomeworkSubmission[] }> {
    try {
      const res = await api.get(`${getBaseUrl()}/${id}/submissions`);
      return res.data.data;
    } catch (err) {
      return handleErr(err);
    }
  },

  async getEvaluationRoster(id: string): Promise<EvaluationRosterResponse> {
    try {
      const res = await api.get(`${getBaseUrl()}/${id}/roster`);
      return res.data.data;
    } catch (err) {
      return handleErr(err);
    }
  },

  async gradeSubmission(id: string, submissionIdOrStudentId: string, payload: { marksObtained: number; feedback?: string; studentId?: string }): Promise<void> {
    try {
      await api.put(`${getBaseUrl()}/${id}/submissions/${submissionIdOrStudentId}/grade`, {
        marksObtained: payload.marksObtained,
        teacher_feedback: payload.feedback || '',
        studentId: payload.studentId
      });
    } catch (err) {
      return handleErr(err);
    }
  },

  async bulkGradeHomework(id: string, rows: any[]): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
    try {
      const res = await api.post(`${getBaseUrl()}/${id}/bulk-grade`, { rows });
      return res.data.data;
    } catch (err) {
      return handleErr(err);
    }
  }
};