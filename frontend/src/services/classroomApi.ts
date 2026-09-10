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

export interface ClassroomFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  branch?: string;
  branchId?: string | number;
}

export interface CreateClassroomDto {
  name: string;
  roomNumber?: string;
  capacity: number;
  type?: ClassroomType;
  status?: ClassroomStatus;
  branchId?: string | number;
}

export interface UpdateClassroomDto {
  name?: string;
  roomNumber?: string;
  capacity?: number;
  type?: ClassroomType;
  status?: ClassroomStatus;
}

export const ROOM_TYPES: ClassroomType[] = ['Classroom', 'Lab', 'Seminar Hall', 'Computer Lab'];
export const STATUS_OPTIONS: ClassroomStatus[] = ['Active', 'Inactive', 'Under Maintenance'];

export const classroomApi = {
  // Branch-scoped listing
  listByBranch: async (branchId: string | number, params: ClassroomFilters = {}) => {
    const { data } = await api.get(`/v1/branches/${branchId}/classrooms`, { params });
    return data;
  },

  // General listing (auto-scoped on backend or filtered by branch)
  list: async (params: ClassroomFilters = {}) => {
    const branch = params.branchId || params.branch;
    if (branch && branch !== 'all' && branch !== 'All') {
      const { data } = await api.get(`/v1/branches/${branch}/classrooms`, { params });
      return data;
    }
    const { data } = await api.get('/admin/classrooms', { params });
    return data;
  },

  getById: async (branchId: string | number, id: string | number) => {
    const { data } = await api.get(`/v1/branches/${branchId}/classrooms/${id}`);
    return data;
  },

  create: async (branchId: string | number, payload: CreateClassroomDto) => {
    const { data } = await api.post(`/v1/branches/${branchId}/classrooms`, payload);
    return data;
  },

  update: async (branchId: string | number, id: string | number, payload: UpdateClassroomDto) => {
    const { data } = await api.patch(`/v1/branches/${branchId}/classrooms/${id}`, payload);
    return data;
  },

  updateStatus: async (branchId: string | number, id: string | number, status: ClassroomStatus) => {
    const { data } = await api.patch(`/v1/branches/${branchId}/classrooms/${id}/status`, { status });
    return data;
  },

  delete: async (branchId: string | number, id: string | number) => {
    const { data } = await api.delete(`/v1/branches/${branchId}/classrooms/${id}`);
    return data;
  }
};