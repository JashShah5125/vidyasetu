import api from './api';

export interface StaffFilters {
    page?: number;
    limit?: number;
    search?: string;
    branchId?: string;
    employeeType?: string;
    department?: string;
}

export const staffApi = {
    list: async (filters: StaffFilters = {}) => {
        const { data } = await api.get('/admin/staff', { params: filters });
        return data;
    },
    create: async (payload: any) => {
        const { data } = await api.post('/admin/staff', payload);
        return data;
    },
    update: async (id: string, payload: any) => {
        const { data } = await api.put(`/admin/staff/${id}`, payload);
        return data;
    }
};
