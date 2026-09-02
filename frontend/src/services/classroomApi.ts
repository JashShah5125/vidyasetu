import api from './api';

export type ClassroomType = 'Classroom' | 'Lab' | 'Seminar Hall' | 'Computer Lab';
export type ClassroomStatus = 'Active' | 'Inactive' | 'Under Maintenance' | 'Deleted';

export interface Classroom {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  roomNumber: string;
  capacity: number;
  type: ClassroomType;
  status: ClassroomStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassroomCreatePayload {
  branchId: string;
  name: string;
  roomNumber?: string;
  capacity?: number;
  type?: ClassroomType;
  status?: ClassroomStatus;
}

export const ROOM_TYPES: ClassroomType[] = ['Classroom', 'Lab', 'Seminar Hall', 'Computer Lab'];
export const STATUS_OPTIONS: ClassroomStatus[] = ['Active', 'Inactive', 'Under Maintenance', 'Deleted'];

export const classroomApi = {
  list: async (params: { page?: number; limit?: number; search?: string; type?: string; status?: string; branch?: string } = {}) => {
    const { data } = await api.get('/admin/classrooms', { params });
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/admin/classrooms/${id}`);
    return data;
  },

  create: async (payload: ClassroomCreatePayload) => {
    const { data } = await api.post('/admin/classrooms', payload);
    return data;
  },

  update: async (id: string, payload: Partial<ClassroomCreatePayload>) => {
    const { data } = await api.put(`/admin/classrooms/${id}`, payload);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/admin/classrooms/${id}`);
    return data;
  }
};