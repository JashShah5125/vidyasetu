import api from './api';

export interface HomeworkSubmissionInfo {
  status: 'Submitted' | 'Graded';
  marksObtained: number | null;
  feedback: string;
  submittedAt: string | null;
  isLate: boolean;
}

export interface MyHomeworkItem {
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
  status: 'Published' | 'Closed';
  publishedAt: string | null;
  closedAt: string | null;
  mySubmission: HomeworkSubmissionInfo | null;
}

const handleErr = (err: any): never => {
  throw new Error(err?.response?.data?.message || err?.message || 'Request failed');
};

export const homeworkApi = {
  async getMyHomeworks(): Promise<MyHomeworkItem[]> {
    try {
      const res = await api.get('/student/homework');
      return res.data.data;
    } catch (err) {
      return handleErr(err);
    }
  },

  async getMyHomework(id: string): Promise<MyHomeworkItem> {
    try {
      const res = await api.get(`/student/homework/${id}`);
      return res.data.data;
    } catch (err) {
      return handleErr(err);
    }
  },

  async submitHomework(id: string, responseText: string, files: File[]): Promise<void> {
    try {
      const fd = new FormData();
      fd.append('responseText', responseText);
      fd.append('existingFiles', JSON.stringify([]));
      files.forEach(f => fd.append('files', f));
      await api.post(`/student/homework/${id}/submit`, fd);
    } catch (err) {
      return handleErr(err);
    }
  }
};