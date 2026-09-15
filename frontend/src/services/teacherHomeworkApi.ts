import api from './api';
import type {
  HomeworkItem,
  HomeworkPayload,
  HomeworkScoping,
  EvaluationRosterResponse,
  HomeworkSubmission
} from './assignmentApi';

export const teacherHomeworkApi = {
  async getScoping(): Promise<HomeworkScoping> {
    const res = await api.get('/teacher/homeworks/scoping');
    return res.data.data;
  },

  async getHomeworks(params: Record<string, any> = {}): Promise<{ data: HomeworkItem[]; pagination: any }> {
    const res = await api.get('/teacher/homeworks', { params });
    return res.data;
  },

  async getHomeworkById(id: string): Promise<HomeworkItem> {
    const res = await api.get(`/teacher/homeworks/${id}`);
    return res.data.data;
  },

  async createHomework(payload: HomeworkPayload, files: File[] = []): Promise<HomeworkItem> {
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

    const res = await api.post('/teacher/homeworks', fd);
    return res.data.data;
  },

  async updateHomework(id: string, payload: HomeworkPayload, files: File[] = []): Promise<HomeworkItem> {
    const fd = new FormData();
    fd.append('title', payload.title);
    fd.append('description', payload.description || '');
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

    const res = await api.put(`/teacher/homeworks/${id}`, fd);
    return res.data.data;
  },

  async deleteHomework(id: string): Promise<void> {
    await api.delete(`/teacher/homeworks/${id}`);
  },

  async publishHomework(id: string): Promise<HomeworkItem> {
    const res = await api.post(`/teacher/homeworks/${id}/publish`);
    return res.data.data;
  },

  async closeHomework(id: string): Promise<HomeworkItem> {
    const res = await api.post(`/teacher/homeworks/${id}/close`);
    return res.data.data;
  },

  async getEvaluationRoster(id: string): Promise<EvaluationRosterResponse> {
    const res = await api.get(`/teacher/homeworks/${id}/roster`);
    return res.data.data;
  },

  async getSubmissions(id: string): Promise<{ homework: any; submissions: HomeworkSubmission[] }> {
    const res = await api.get(`/teacher/homeworks/${id}/submissions`);
    return res.data.data;
  },

  async bulkGrade(id: string, grades: Array<{ studentId: number | string; marksObtained: number | null; teacherFeedback?: string }>): Promise<EvaluationRosterResponse> {
    const res = await api.post(`/teacher/homeworks/${id}/bulk-grade`, { grades });
    return res.data.data;
  },

  async gradeSubmission(id: string, submissionId: string, data: { marksObtained: number | null; teacherFeedback?: string }): Promise<any> {
    const res = await api.put(`/teacher/homeworks/${id}/submissions/${submissionId}/grade`, data);
    return res.data.data;
  }
};
