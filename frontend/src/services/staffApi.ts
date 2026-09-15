import api from './api';

export interface StaffFilters {
    page?: number;
    limit?: number;
    search?: string;
    branchId?: string;
    employeeType?: string;
    department?: string;
    role?: string;
    status?: string;
}

const getStaffBasePath = (): string => {
    try {
        const raw = localStorage.getItem('vs_current_user') || localStorage.getItem('user');
        if (raw) {
            const user = JSON.parse(raw);
            const role = String(user.role || '').toLowerCase().replace(/_/g, '-');
            if (role === 'branch-admin') {
                return '/branch/staff';
            }
        }
    } catch (e) {
        // Fallback to admin route
    }
    return '/admin/staff';
};

export const staffApi = {
    list: async (filters: StaffFilters = {}) => {
        const basePath = getStaffBasePath();
        const { data } = await api.get(basePath, { params: filters });
        return data;
    },
    getById: async (id: string) => {
        const basePath = getStaffBasePath();
        const { data } = await api.get(`${basePath}/${id}`);
        return data;
    },
    create: async (payload: any) => {
        const basePath = getStaffBasePath();
        const { data } = await api.post(basePath, payload);
        return data;
    },
    update: async (id: string, payload: any) => {
        const basePath = getStaffBasePath();
        const { data } = await api.put(`${basePath}/${id}`, payload);
        return data;
    },
    delete: async (id: string) => {
        const basePath = getStaffBasePath();
        const { data } = await api.delete(`${basePath}/${id}`);
        return data;
    }
};
