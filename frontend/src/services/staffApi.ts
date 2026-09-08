import api from './api';

export interface StaffFilters {
    page?: number;
    limit?: number;
    search?: string;
    branchId?: string;
    employeeType?: string;
    department?: string;
    role?: string;
}

export const staffApi = {
    list: async (filters: StaffFilters = {}) => {
        const { data } = await api.get('/admin/staff', { params: filters });
        return data;
    },
    getById: async (id: string) => {
        const { data } = await api.get(`/admin/staff/${id}`);
        return data;
    },
    create: async (payload: any) => {
        const { data } = await api.post('/admin/staff', payload);
        return data;
    },
    update: async (id: string, payload: any) => {
        const { data } = await api.put(`/admin/staff/${id}`, payload);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/admin/staff/${id}`);
        return data;
    }
};
