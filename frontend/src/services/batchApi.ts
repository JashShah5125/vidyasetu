import api from './api';

export type BatchStatus = 'Active' | 'Inactive' | 'Deleted';

export interface Batch {
  id: string;
  branchId: string;
  branchName: string;
  academicYearId: string;
  academicYearName: string;
  courseId: string;
  courseName: string;
  programId: string;
  programName: string;
  levelId: string;
  levelName: string;
  name: string;
  code: string;
  capacity: number | null;
  currentStrength: number;
  startTime: string;
  endTime: string;
  classroomId: string;
  classroomName: string;
  status: BatchStatus;
}

export interface BatchCreatePayload {
  name: string;
  code?: string;
  branchId: string;
  academicYearId: string;
  levelId: string;
  capacity?: number;
  startTime?: string;
  endTime?: string;
  classroomId?: string;
  status?: BatchStatus;
}

export interface AcademicYear {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

export const BATCH_STATUS_OPTIONS: BatchStatus[] = ['Active', 'Inactive'];

export const batchApi = {
  list: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    branch?: string;
    course?: string;
    program?: string;
    level?: string;
    academicYear?: string;
  } = {}) => {
    const { data } = await api.get('/admin/batches', { params });
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/admin/batches/${id}`);
    return data;
  },

  create: async (payload: BatchCreatePayload) => {
    const { data } = await api.post('/admin/batches', payload);
    return data;
  },

  update: async (id: string, payload: Partial<BatchCreatePayload>) => {
    const { data } = await api.put(`/admin/batches/${id}`, payload);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/admin/batches/${id}`);
    return data;
  },

  academicYears: async (params: { branch?: string } = {}) => {
    const { data } = await api.get('/admin/batches/academic-years', { params });
    return data;
  }
};

const format12h = (time24: string) => {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  let hours = parseInt(h, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
};

export const formatBatchTiming = (batch: Pick<Batch, 'startTime' | 'endTime'>) => {
  if (!batch.startTime || !batch.endTime) return '';
  return `${format12h(batch.startTime)} - ${format12h(batch.endTime)}`;
};