import api from './api';

export interface LectureRequest {
  id: number;
  tenant_id: number;
  branch_id: number;
  branch_name?: string;
  requester_id: number;
  requester_name?: string;
  requester_email?: string;
  lecture_id: number | null;
  batch_id: number;
  batch_name?: string;
  batch_code?: string;
  subject_id: number;
  subject_name?: string;
  subject_code?: string;
  request_type: 'RESCHEDULE' | 'ROOM_CHANGE' | 'TEACHER_CHANGE' | 'CANCEL' | 'NEW_LECTURE';
  current_date: string | null;
  current_start_time: string | null;
  current_end_time: string | null;
  current_classroom_id: number | null;
  current_classroom_name?: string;
  current_teacher_user_id: number | null;
  current_teacher_name?: string;
  requested_date: string | null;
  requested_start_time: string | null;
  requested_end_time: string | null;
  requested_classroom_id: number | null;
  requested_classroom_name?: string;
  requested_teacher_user_id: number | null;
  requested_teacher_name?: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'applied';
  decided_by: number | null;
  decided_by_name?: string;
  decision_note: string | null;
  decided_at: string | null;
  applied_by: number | null;
  applied_by_name?: string;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
  conflicts?: Array<{
    type: string;
    severity: 'warning' | 'danger';
    conflictingLectureId?: number;
    message: string;
  }>;
}

export interface RequestCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  applied: number;
}

export const lectureRequestApi = {

  async listRequests(filters?: {
    branchId?: string | number;
    status?: string;
    type?: string;
    requesterId?: string | number;
  }): Promise<LectureRequest[]> {
    const params = new URLSearchParams();
    if (filters?.branchId) params.append('branchId', String(filters.branchId));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.requesterId) params.append('requesterId', String(filters.requesterId));

    const response = await api.get(`/admin/lecture-requests?${params.toString()}`);
    return response.data.data;
  },

  async getStatusCounts(filters?: {
    branchId?: string | number;
    requesterId?: string | number;
  }): Promise<RequestCounts> {
    const params = new URLSearchParams();
    if (filters?.branchId) params.append('branchId', String(filters.branchId));
    if (filters?.requesterId) params.append('requesterId', String(filters.requesterId));

    const response = await api.get(`/admin/lecture-requests/counts?${params.toString()}`);
    return response.data.data;
  },

  async getRequestById(id: number): Promise<LectureRequest> {
    const response = await api.get(`/admin/lecture-requests/${id}`);
    return response.data.data;
  },

  async createRequest(data: {
    branch_id: number;
    batch_id: number;
    subject_id: number;
    request_type: string;
    lecture_id?: number;
    current_date?: string;
    current_start_time?: string;
    current_end_time?: string;
    current_classroom_id?: number;
    current_teacher_user_id?: number;
    requested_date?: string;
    requested_start_time?: string;
    requested_end_time?: string;
    requested_classroom_id?: number;
    requested_teacher_user_id?: number;
    reason?: string;
  }): Promise<{ id: number }> {
    const response = await api.post('/admin/lecture-requests', data);
    return response.data.data;
  },

  async approveRequest(id: number): Promise<{ id: number; status: string }> {
    const response = await api.put(`/admin/lecture-requests/${id}/approve`);
    return response.data.data;
  },

  async rejectRequest(id: number, decisionNote?: string): Promise<{ id: number; status: string }> {
    const response = await api.put(`/admin/lecture-requests/${id}/reject`, { decision_note: decisionNote });
    return response.data.data;
  },

  async applyRequest(id: number): Promise<{ id: number; status: string }> {
    const response = await api.post(`/admin/lecture-requests/${id}/apply`);
    return response.data.data;
  }
};
