import api from './api';

export interface DoubtReply {
  id: number;
  doubtId?: number;
  senderUserId: number;
  senderName: string;
  senderRole: 'student' | 'teacher';
  message: string;
  attachments: string[];
  isRead: boolean;
  createdAt: string;
}

export interface DoubtItem {
  id: number;
  topic: string;
  status: number;
  statusCode: number;
  statusLabel: string;
  batch: {
    id: number;
    name: string;
    code?: string;
  };
  subject: {
    id: number;
    name: string;
    code?: string;
  };
  student: {
    id: number;
    name: string;
    code?: string;
  };
  teacher: {
    id: number;
    name: string;
  };
  replyCount?: number;
  unreadCount?: number;
  lastMessage?: string;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
  replies?: DoubtReply[];
}

export interface TeacherAssignment {
  batchId: number;
  batchName: string;
  subjectId: number;
  subjectName: string;
  subjectCode?: string;
}

export interface EligibleTeacher {
  teacherId: number;
  teacherName: string;
  assignments: TeacherAssignment[];
}

export interface DoubtFilterParams {
  status?: string | number;
  batchId?: string | number;
  subjectId?: string | number;
  search?: string;
  unread?: boolean | string;
}

export const doubtApi = {
  // ==================== Student Endpoints ====================
  async getEligibleTeachers(): Promise<EligibleTeacher[]> {
    const res = await api.get('/student/doubts/teachers');
    return res.data?.data?.teachers || [];
  },

  async getStudentDoubts(params?: DoubtFilterParams): Promise<DoubtItem[]> {
    const res = await api.get('/student/doubts', { params });
    return res.data?.data || [];
  },

  async createStudentDoubt(formData: FormData): Promise<DoubtItem> {
    const res = await api.post('/student/doubts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data?.data;
  },

  async getStudentDoubt(id: number): Promise<DoubtItem> {
    const res = await api.get(`/student/doubts/${id}`);
    return res.data?.data;
  },

  async addStudentReply(id: number, formData: FormData): Promise<DoubtItem> {
    const res = await api.post(`/student/doubts/${id}/replies`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data?.data;
  },

  async updateStudentDoubtStatus(id: number, status: number): Promise<DoubtItem> {
    const res = await api.patch(`/student/doubts/${id}/status`, { status });
    return res.data?.data;
  },

  // ==================== Teacher Endpoints ====================
  async getTeacherDoubts(params?: DoubtFilterParams): Promise<DoubtItem[]> {
    const res = await api.get('/teacher/doubts', { params });
    return res.data?.data || [];
  },

  async getTeacherDoubt(id: number): Promise<DoubtItem> {
    const res = await api.get(`/teacher/doubts/${id}`);
    return res.data?.data;
  },

  async addTeacherReply(id: number, formData: FormData): Promise<DoubtItem> {
    const res = await api.post(`/teacher/doubts/${id}/replies`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data?.data;
  },

  async updateTeacherDoubtStatus(id: number, status: number): Promise<DoubtItem> {
    const res = await api.patch(`/teacher/doubts/${id}/status`, { status });
    return res.data?.data;
  }
};
