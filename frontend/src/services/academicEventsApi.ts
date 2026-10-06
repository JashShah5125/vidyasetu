import api from './api';

export type AcademicEventType = 'EXAM' | 'HOLIDAY' | 'MEETING' | 'EVENT';

export interface AcademicEventItem {
  id: string;
  title: string;
  type: AcademicEventType;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  description: string;
  venue: string;
  branchId?: number | null;
  branchName?: string;
  academicYearId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAcademicEventPayload {
  title: string;
  type: AcademicEventType;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  venue?: string;
  branchId?: number | null;
  academicYearId?: number | null;
}

export interface AcademicEventFilters {
  branchId?: string | number;
  type?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const academicEventsApi = {
  async getEvents(filters: AcademicEventFilters = {}): Promise<AcademicEventItem[]> {
    const params = new URLSearchParams();
    if (filters.branchId && filters.branchId !== 'All' && filters.branchId !== 'all') {
      params.append('branchId', String(filters.branchId));
    }
    if (filters.type && filters.type !== 'All' && filters.type !== 'all') {
      params.append('type', filters.type);
    }
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);

    const res = await api.get(`/academic-events?${params.toString()}`);
    return res.data.data || [];
  },

  async getEventById(id: string | number): Promise<AcademicEventItem> {
    const res = await api.get(`/academic-events/${id}`);
    return res.data.data;
  },

  async createEvent(payload: CreateAcademicEventPayload): Promise<AcademicEventItem> {
    const res = await api.post('/academic-events', payload);
    return res.data.data;
  },

  async updateEvent(id: string | number, payload: Partial<CreateAcademicEventPayload>): Promise<AcademicEventItem> {
    const res = await api.put(`/academic-events/${id}`, payload);
    return res.data.data;
  },

  async deleteEvent(id: string | number): Promise<{ success: boolean; message?: string }> {
    const res = await api.delete(`/academic-events/${id}`);
    return res.data;
  }
};
