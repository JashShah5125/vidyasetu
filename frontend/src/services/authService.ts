import api from './api';

export const authService = {
  updateProfile: async (name: string, email: string) => {
    const { data } = await api.put('/auth/profile', { name, email });
    return data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
    return data;
  }
};
